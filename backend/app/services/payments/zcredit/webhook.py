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
    rc = data.get("ReturnCode")
    if rc not in (None, 0, "0"):
        return "payment.failed"
    if (
        data.get("TransactionSuccess") is True
        or data.get("ReferenceNumber")
        or data.get("ApprovalNumber")
    ):
        return "payment.success"
    return ""


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


def _mark_contract_stage_paid(db: Session, session_id: str) -> tuple[bool, int | None]:
    """Mark the contract payment stage with the given session ID as paid. Returns (found, account_id)."""
    from app.models.contracts import Contract
    stage = (
        db.query(ContractPaymentStage)
        .filter(ContractPaymentStage.payment_doc_id == session_id)
        .first()
    )
    if stage:
        stage.status = "paid"
        stage.paid_at = datetime.now(timezone.utc)
        db.add(stage)
        db.commit()
        logger.info("zcredit_webhook: marked contract stage paid stage_id=%s session=%s", stage.id, session_id)
        contract = db.query(Contract).filter(Contract.id == stage.contract_id).first()
        return True, (contract.account_id if contract else None)
    return False, None


def apply_zcredit_webhook_event(db: Session, event_type: str, data: dict[str, Any]) -> None:
    """
    Apply a single webhook event to billing instructions. Commits per successful branch.

    Raises only on unexpected programmer errors; DB errors are logged and swallowed
    so the HTTP handler can still acknowledge receipt (matches prior broad try/except).
    """
    try:
        if event_type in ("payment.success", "J4"):
            sid = _get_field(data, "SessionId")
            if sid:
                found, account_id = _mark_contract_stage_paid(db, sid)
                if found:
                    if account_id:
                        try:
                            _save_card_from_webhook(db, account_id, data)
                            db.commit()
                        except Exception:
                            logger.warning(
                                "zcredit_webhook: card save failed for contract stage account_id=%s",
                                account_id,
                                exc_info=True,
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
                        ins.billing_day = date.today().day

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
        logger.exception("zcredit_webhook handler failed event=%s", event_type)
