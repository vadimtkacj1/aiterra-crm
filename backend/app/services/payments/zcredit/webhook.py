"""
Z-Credit webhook payload parsing and side effects (DB updates).

Schema is provisional until Z-Credit publishes final callback fields.
"""

from __future__ import annotations

import json
import logging
from datetime import date, datetime, timezone
from typing import Any

from fastapi import HTTPException
from sqlalchemy.orm import Session

from app.models.billing import AccountBillingInstruction, SubscriptionPayment
from app.models.contracts import ContractPaymentStage
from app.models.core import User
from app.services.billing import mark_paid_safe
from app.services.email.smtp_mail import send_past_due_alert
from app.services.payments.zcredit.card_service import upsert_saved_card

logger = logging.getLogger(__name__)


def _get_field(data: dict[str, Any], *keys: str) -> str:
    """Return the first non-empty string value from *keys* in *data*, stripped."""
    for key in keys:
        val = data.get(key)
        if val:
            return str(val).strip()
    return ""


def parse_webhook_json_body(raw: bytes) -> dict[str, Any]:
    """Parse JSON object from raw body; raise HTTP 400 on invalid UTF-8 or non-object JSON."""
    try:
        text = raw.decode("utf-8")
    except UnicodeDecodeError as exc:
        raise HTTPException(status_code=400, detail="invalid_payload") from exc
    try:
        data = json.loads(text)
    except json.JSONDecodeError as exc:
        raise HTTPException(status_code=400, detail="invalid_payload") from exc
    if not isinstance(data, dict):
        raise HTTPException(status_code=400, detail="invalid_payload")
    return data


def resolve_event_type(data: dict[str, Any]) -> str:
    explicit = _get_field(data, "event", "type")
    if explicit:
        return explicit

    # Negative signals win. A declined card still carries a ReferenceNumber, so treating
    # any reference as success marked rejected payments as paid.
    if data.get("TransactionSuccess") is False or data.get("HasError") is True:
        return "payment.failed"
    rc = data.get("ReturnCode")
    if rc not in (None, 0, "0"):
        return "payment.failed"
    inner = data.get("Data")
    if isinstance(inner, dict):
        if inner.get("HasError") is True:
            return "payment.failed"
        inner_rc = inner.get("ReturnCode")
        if inner_rc not in (None, 0, "0"):
            return "payment.failed"

    if (
        data.get("TransactionSuccess") is True
        or data.get("ReferenceNumber")
        or data.get("ApprovalNumber")
    ):
        return "payment.success"
    return ""


class _GatewayUnavailable(Exception):
    """Verification could not be completed — as opposed to a definitive 'not paid'."""


def _gateway_confirms_payment(data: dict[str, Any]) -> bool:
    """Ask Z-Credit whether the session was really paid.

    The callback endpoint is public and unsigned, so the body alone proves nothing —
    anyone who sees a SessionId could otherwise mark a contract paid. When the gateway
    is not configured (mock/dev), there is nothing to ask and the body is trusted.

    Three outcomes, kept distinct on purpose:
      - gateway confirms paid            → True  (apply)
      - gateway reachable, says NOT paid → False (ignore, ack 200 — a forgery or a real
                                                  failure that will not become paid)
      - verification could not run       → raise (the caller answers 5xx so Z-Credit
                                                  retries; never silently drop a payment)
    """
    if not _gateway_is_live():
        return True

    session_id = _get_field(data, "SessionId") or _get_field(data, "docId", "doc_id")
    if not session_id:
        # Recurring-billing callbacks carry no session; they are matched by UniqueID and
        # cannot be confirmed this way. Left to the legacy path rather than dropped.
        return True

    from app.services.payments.zcredit.service import try_retrieve_invoice

    try:
        doc = try_retrieve_invoice(session_id)
    except Exception as exc:
        logger.exception("zcredit_webhook: verification call failed session=%s", session_id)
        raise _GatewayUnavailable(session_id) from exc

    if doc is None:
        # Ambiguous: unknown session (likely forged) or a transient gateway error, and the
        # body claimed success. Retry rather than acknowledge — a genuine payment must not
        # be lost, and a forged one is merely ignored again on redelivery (idempotent).
        logger.warning(
            "zcredit_webhook: could not confirm session=%s — asking gateway to retry", session_id
        )
        raise _GatewayUnavailable(session_id)

    if getattr(doc, "status", None) != "paid":
        logger.warning(
            "zcredit_webhook: gateway reports session=%s as %s — callback ignored",
            session_id, getattr(doc, "status", None),
        )
        return False
    return True


def _gateway_is_live() -> bool:
    from app.core.settings import settings

    return bool((settings.zcredit_api_key or "").strip())


def _find_instruction_by_doc_id(db: Session, doc_id: str) -> AccountBillingInstruction | None:
    return (
        db.query(AccountBillingInstruction)
        .filter(AccountBillingInstruction.payment_doc_id == doc_id)
        .first()
    )


def _find_instruction_by_recurring_id(db: Session, recurring_id: str) -> AccountBillingInstruction | None:
    return (
        db.query(AccountBillingInstruction)
        .filter(AccountBillingInstruction.payment_recurring_id == recurring_id)
        .first()
    )


def _find_instruction_for_callback(db: Session, data: dict[str, Any]) -> AccountBillingInstruction | None:
    sid = _get_field(data, "SessionId")
    uid = _get_field(data, "UniqueID", "UniqueId")
    legacy_doc = _get_field(data, "docId", "doc_id")
    if sid:
        ins = _find_instruction_by_doc_id(db, sid)
        if ins:
            return ins
    if uid:
        ins = _find_instruction_by_recurring_id(db, uid)
        if ins:
            return ins
    if legacy_doc:
        return _find_instruction_by_doc_id(db, legacy_doc)
    return None


def _save_card_from_webhook(db: Session, account_id: int, data: dict[str, Any]) -> None:
    """Extract card token from Z-Credit webhook payload and upsert into SavedCard."""
    token = _get_field(data, "Token", "token")
    if not token:
        logger.warning(
            "zcredit_webhook: no Token in payload for account_id=%s — card not saved. "
            "Payload keys: %s",
            account_id,
            list(data.keys()),
        )
        return

    token_id = _get_field(data, "TokenId", "tokenId") or None

    card_raw = _get_field(data, "CardNumber", "Last4Digits", "Card4Digits")
    digits = "".join(c for c in card_raw if c.isdigit())
    last4 = digits[-4:] if len(digits) >= 4 else None

    raw_holder = _get_field(data, "CardName", "HolderName")
    holder = raw_holder[:200] or None

    exp_raw = _get_field(data, "ExpDate", "ExpDate_MMYY")
    exp_month, exp_year = None, None
    if "/" in exp_raw:
        parts = exp_raw.split("/", 1)
        try:
            exp_month = int(parts[0])
            yy = int(parts[1])
            exp_year = 2000 + yy if yy < 100 else yy  # MM/YY → 4-digit; MM/YYYY passes through
            # Reject clearly invalid years (past or placeholder like 00)
            if exp_year < date.today().year - 1:
                exp_month = None
                exp_year = None
        except ValueError:
            pass

    upsert_saved_card(
        db,
        account_id=account_id,
        token=token,
        token_id=token_id,
        holder_name=holder,
        last4=last4,
        exp_month=exp_month,
        exp_year=exp_year,
    )
    logger.info("zcredit_webhook: saved card token for account_id=%s", account_id)


def _stages_for_session(db: Session, session_id: str) -> list[ContractPaymentStage]:
    """Stages billed by *session_id* — current invoice first, superseded links as fallback.

    A combined payment puts one session ID on several stages, so this can return more
    than one. The fallback catches a client paying an old link after ?renew=true issued
    a fresh invoice (Z-Credit cannot void the old one).
    """
    direct = (
        db.query(ContractPaymentStage)
        .filter(ContractPaymentStage.payment_doc_id == session_id)
        .all()
    )

    candidates = (
        db.query(ContractPaymentStage)
        .filter(ContractPaymentStage.superseded_doc_ids.like(f"%{session_id}%"))
        .all()
    )
    # LIKE can over-match; confirm the ID is a whole entry in the comma-separated list
    superseded = [s for s in candidates if session_id in (s.superseded_doc_ids or "").split(",")]

    # Union, not fallback: after a partial renew the same session can be the current doc
    # of some stages and a replaced one for others. Short-circuiting on the direct hit
    # left the rest of a combined payment unpaid.
    by_id = {s.id: s for s in direct}
    for stage in superseded:
        by_id.setdefault(stage.id, stage)
    return list(by_id.values())


def _default_billing_day(today: date | None = None) -> int:
    """Billing day to lock in on the first payment.

    Capped at 28 so a subscription started on the 29th-31st still has a day that exists
    in every month — otherwise the scheduler would skip most months.
    """
    return min((today or date.today()).day, 28)


def _is_subscription_stage(stage: ContractPaymentStage) -> bool:
    """Whether paying this stage should activate recurring billing.

    Reads the explicit ``kind``; rows written before that column existed fall back to the
    old rule (the subscription was always created as the first stage).
    """
    kind = (getattr(stage, "kind", None) or "").strip()
    if kind:
        return kind == "subscription"
    return stage.sort_order == 0


def _mark_contract_stage_paid(
    db: Session, session_id: str
) -> tuple[bool, int | None, "Contract | None", "ContractPaymentStage | None"]:
    """Mark every contract payment stage billed by the given session ID as paid.
    Returns (found, account_id, contract, earliest stage).
    """
    from app.models.contracts import Contract
    stages = _stages_for_session(db, session_id)
    if not stages:
        return False, None, None, None

    stages.sort(key=lambda s: s.sort_order)
    now = datetime.now(timezone.utc)
    newly_paid = 0
    for s in stages:
        if s.status == "paid":
            continue  # webhook retry — keep the original paid_at
        s.status = "paid"
        s.paid_at = now
        db.add(s)
        newly_paid += 1
    db.commit()
    logger.info(
        "zcredit_webhook: session=%s covers %d stage(s), %d newly marked paid (stage_ids=%s)",
        session_id, len(stages), newly_paid, [s.id for s in stages],
    )

    stage = stages[0]
    contract = db.query(Contract).filter(Contract.id == stage.contract_id).first()
    return True, (contract.account_id if contract else None), contract, stage


def _record_registry_payment(db: Session, data: dict[str, Any]) -> None:
    """Mark the matching invoice registry row paid.

    Bookkeeping only — runs before the legacy per-entity handling and commits on its
    own, so it can neither block nor alter the existing flow. Tries every ID Z-Credit
    may send, since older invoices were keyed by different fields.
    """
    candidates = [
        _get_field(data, "SessionId"),
        _get_field(data, "UniqueID", "UniqueId"),
        _get_field(data, "docId", "doc_id"),
    ]
    for doc_id in candidates:
        if not doc_id:
            continue
        if mark_paid_safe(
            db,
            doc_id,
            reference_number=_get_field(data, "ReferenceNumber") or None,
            approval_number=_get_field(data, "ApprovalNumber") or None,
        ):
            return


def apply_zcredit_webhook_event(db: Session, event_type: str, data: dict[str, Any]) -> None:
    """
    Apply a single webhook event to billing instructions. Commits per successful branch.

    Raises only on unexpected programmer errors; DB errors are logged and swallowed
    so the HTTP handler can still acknowledge receipt (matches prior broad try/except).
    """
    try:
        if event_type in ("payment.success", "J4"):
            if not _gateway_confirms_payment(data):
                return
            _record_registry_payment(db, data)
            sid = _get_field(data, "SessionId")
            if sid:
                found, account_id, contract, stage = _mark_contract_stage_paid(db, sid)
                if found:
                    # Only the subscription stage may replace the account's card on file.
                    # Anyone can open a contract's public pay link, so saving the card of
                    # whoever settled a one-off fee would silently redirect every future
                    # recurring charge to that person's card.
                    if account_id and stage is not None and _is_subscription_stage(stage):
                        try:
                            _save_card_from_webhook(db, account_id, data)
                            db.commit()
                        except Exception:
                            logger.warning(
                                "zcredit_webhook: card save failed for contract stage account_id=%s",
                                account_id,
                                exc_info=True,
                            )
                    # Activate billing and record a SubscriptionPayment ONLY for the stage that
                    # actually sells the subscription. One-time fee stages must not trigger
                    # billing activation or create false SubscriptionPayment records.
                    is_subscription_stage = stage is not None and _is_subscription_stage(stage)
                    if (
                        is_subscription_stage
                        and contract
                        and contract.monthly_amount
                        and contract.monthly_amount > 0
                        and contract.billing_instruction_id
                    ):
                        ins = db.query(AccountBillingInstruction).filter(
                            AccountBillingInstruction.id == contract.billing_instruction_id
                        ).first()
                        if ins:
                            existing = db.query(SubscriptionPayment).filter(
                                SubscriptionPayment.billing_instruction_id == ins.id,
                                SubscriptionPayment.zcredit_transaction_id == sid,
                            ).first()
                            if not existing:
                                payment_count = db.query(SubscriptionPayment).filter(
                                    SubscriptionPayment.billing_instruction_id == ins.id
                                ).count()
                                payment = SubscriptionPayment(
                                    billing_instruction_id=ins.id,
                                    contract_id=contract.id,
                                    amount=contract.monthly_amount,
                                    currency=contract.currency,
                                    payment_number=payment_count + 1,
                                    status="success",
                                    zcredit_transaction_id=sid,
                                    zcredit_approval_number=_get_field(data, "ApprovalNumber"),
                                )
                                db.add(payment)
                                ins.subscription_status = "active"
                                # Without a billing day the scheduler's `billing_day ==
                                # today.day` filter never matches and the subscription is
                                # active but never charged again. Lock it in on the first
                                # payment, exactly as the billing-instruction path does.
                                if ins.billing_day is None:
                                    ins.billing_day = _default_billing_day()
                                    logger.info(
                                        "zcredit_webhook: locked billing_day=%s for instruction %s",
                                        ins.billing_day, ins.id,
                                    )
                                db.add(ins)
                                db.commit()
                                logger.info(
                                    "zcredit_webhook: subscription activated, payment #%d for contract_id=%s",
                                    payment.payment_number,
                                    contract.id,
                                )
                    return

            ins = _find_instruction_for_callback(db, data)
            if ins:
                ins.payment_url = None
                ins.subscription_status = "active" if ins.charge_type == "monthly" else None

                if ins.charge_type == "monthly":
                    # On first payment: save card token and lock in billing day.
                    # Card-save is isolated so a failure there never rolls back subscription activation.
                    try:
                        _save_card_from_webhook(db, ins.account_id, data)
                    except Exception:
                        logger.warning(
                            "zcredit_webhook: card save failed account_id=%s — subscription still activated",
                            ins.account_id,
                            exc_info=True,
                        )
                    if ins.billing_day is None:
                        ins.billing_day = _default_billing_day()

                db.add(ins)

                # If this is a monthly subscription payment, record it
                if ins.charge_type == "monthly":
                    transaction_id = _get_field(data, "SessionId")

                    # Check if this payment was already recorded (prevent duplicates from webhook retries)
                    existing_payment = db.query(SubscriptionPayment).filter(
                        SubscriptionPayment.billing_instruction_id == ins.id,
                        SubscriptionPayment.zcredit_transaction_id == transaction_id
                    ).first()

                    if not existing_payment:
                        # Count existing payments to determine payment number
                        payment_count = db.query(SubscriptionPayment).filter(
                            SubscriptionPayment.billing_instruction_id == ins.id
                        ).count()

                        # Find associated contract
                        from app.models.contracts import Contract
                        contract = db.query(Contract).filter(
                            Contract.billing_instruction_id == ins.id
                        ).first()

                        # Create payment record
                        payment = SubscriptionPayment(
                            billing_instruction_id=ins.id,
                            contract_id=contract.id if contract else None,
                            amount=ins.amount or 0,
                            currency=ins.currency,
                            payment_number=payment_count + 1,
                            status="success",
                            zcredit_transaction_id=transaction_id,
                            zcredit_approval_number=_get_field(data, "ApprovalNumber"),
                        )
                        db.add(payment)
                        logger.info(
                            "zcredit_webhook: recorded subscription payment #%d for billing_instruction_id=%s",
                            payment.payment_number,
                            ins.id,
                        )
                    else:
                        logger.info(
                            "zcredit_webhook: skipped duplicate payment transaction_id=%s billing_instruction_id=%s",
                            transaction_id,
                            ins.id,
                        )

                db.commit()
                logger.info(
                    "zcredit_webhook: marked paid session=%s unique=%s",
                    data.get("SessionId"),
                    data.get("UniqueID"),
                )

        elif event_type in ("payment.failed",):
            recurring_id = _get_field(data, "recurringId", "recurring_id")
            sid = _get_field(data, "SessionId")
            ins = None
            if recurring_id:
                ins = _find_instruction_by_recurring_id(db, recurring_id)
            if ins is None and sid:
                ins = _find_instruction_by_doc_id(db, sid)
            if ins:
                ins.subscription_status = "past_due"
                db.add(ins)
                db.commit()
                from app.models.contracts import Contract
                contract = db.query(Contract).filter(Contract.billing_instruction_id == ins.id).first()
                payment_count = db.query(SubscriptionPayment).filter(SubscriptionPayment.billing_instruction_id == ins.id).count()
                admin_emails = [u.email for u in db.query(User).filter(User.role == "admin").all() if u.email]
                reason = str(data.get("ReturnMessage") or "Payment rejected by bank")
                send_past_due_alert(
                    admin_emails,
                    account_id=ins.account_id,
                    amount=ins.amount or 0,
                    currency=ins.currency or "ILS",
                    contract_title=contract.title if contract else None,
                    payment_number=payment_count + 1,
                    reason=reason,
                )

        elif event_type in ("recurring.active",):
            recurring_id = _get_field(data, "recurringId", "recurring_id")
            if recurring_id:
                ins = _find_instruction_by_recurring_id(db, recurring_id)
                if ins:
                    ins.subscription_status = "active"
                    ins.payment_url = None
                    db.add(ins)
                    db.commit()

        elif event_type in ("recurring.cancelled", "recurring.canceled"):
            recurring_id = _get_field(data, "recurringId", "recurring_id")
            if recurring_id:
                ins = _find_instruction_by_recurring_id(db, recurring_id)
                if ins:
                    ins.subscription_status = "canceled"
                    db.add(ins)
                    db.commit()
    except Exception:
        # Re-raised so the HTTP layer answers 5xx and the gateway redelivers. Swallowing
        # it here acknowledged callbacks that were never applied, and the money with them.
        logger.exception("zcredit_webhook handler failed event=%s", event_type)
        raise
