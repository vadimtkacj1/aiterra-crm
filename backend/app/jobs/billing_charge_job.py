"""Billing jobs — daily subscription charges + test-interval charges."""

from __future__ import annotations

import logging
import uuid
from datetime import date, datetime, timedelta

from sqlalchemy.orm import Session

from app.db.session import SessionLocal
from app.models.billing import AccountBillingInstruction, SavedCard, SubscriptionPayment
from app.models.contracts import Contract
from app.models.core import User
from app.services.email.smtp_mail import send_past_due_alert
from app.services.payments.zcredit.service import pay_open_invoice

logger = logging.getLogger(__name__)


def _admin_emails(db: Session) -> list[str]:
    return [u.email for u in db.query(User).filter(User.role == "admin").all() if u.email]


def run_subscription_billing_sync() -> None:
    today = date.today()
    with SessionLocal() as db:
        try:
            due = (
                db.query(AccountBillingInstruction)
                .filter(
                    AccountBillingInstruction.charge_type == "monthly",
                    AccountBillingInstruction.subscription_status == "active",
                    AccountBillingInstruction.billing_day == today.day,
                )
                .all()
            )
        except Exception:
            logger.exception("subscription_billing: failed to query due subscriptions — aborting")
            return

        logger.info("subscription_billing: %d subscription(s) due on day=%d", len(due), today.day)
        for ins in due:
            try:
                _charge_one(db, ins, today)
            except Exception:
                logger.exception("subscription_billing: unexpected error for ins_id=%s — skipping", ins.id)


def _charge_one(db: Session, ins: AccountBillingInstruction, today: date) -> None:
    # Skip if already successfully charged this calendar month
    last_ok = (
        db.query(SubscriptionPayment)
        .filter(
            SubscriptionPayment.billing_instruction_id == ins.id,
            SubscriptionPayment.status == "success",
        )
        .order_by(SubscriptionPayment.paid_at.desc())
        .first()
    )
    if last_ok:
        paid = last_ok.paid_at
        paid_date = paid.date() if hasattr(paid, "date") else paid
        if paid_date.year == today.year and paid_date.month == today.month:
            logger.info("subscription_billing: already charged this month ins_id=%s", ins.id)
            return

    card = db.query(SavedCard).filter(SavedCard.account_id == ins.account_id).first()
    if not card or not card.zcredit_token:
        logger.warning("subscription_billing: no saved card account_id=%s — marking past_due", ins.account_id)
        ins.subscription_status = "past_due"
        db.add(ins)
        db.commit()
        contract = db.query(Contract).filter(Contract.billing_instruction_id == ins.id).first()
        payment_count = db.query(SubscriptionPayment).filter(SubscriptionPayment.billing_instruction_id == ins.id).count()
        send_past_due_alert(
            _admin_emails(db),
            account_id=ins.account_id,
            amount=ins.amount or 0,
            currency=ins.currency or "ILS",
            contract_title=contract.title if contract else None,
            payment_number=payment_count + 1,
            reason="No saved card on file",
        )
        return

    amount = ins.amount or 0
    if amount <= 0:
        logger.warning("subscription_billing: zero amount ins_id=%s — skipping", ins.id)
        return

    doc_id = f"sub_{ins.id}_{today.isoformat()}_{uuid.uuid4().hex[:8]}"
    try:
        pay_open_invoice(doc_id, card.zcredit_token, amount_major=amount, currency=ins.currency or "ILS")
    except Exception:
        logger.exception("subscription_billing: charge failed ins_id=%s — marking past_due", ins.id)
        ins.subscription_status = "past_due"
        db.add(ins)
        db.commit()
        contract = db.query(Contract).filter(Contract.billing_instruction_id == ins.id).first()
        payment_count = db.query(SubscriptionPayment).filter(SubscriptionPayment.billing_instruction_id == ins.id).count()
        send_past_due_alert(
            _admin_emails(db),
            account_id=ins.account_id,
            amount=amount,
            currency=ins.currency or "ILS",
            contract_title=contract.title if contract else None,
            payment_number=payment_count + 1,
            reason="Z-Credit charge rejected",
        )
        return

    payment_count = db.query(SubscriptionPayment).filter(
        SubscriptionPayment.billing_instruction_id == ins.id
    ).count()

    contract = db.query(Contract).filter(Contract.billing_instruction_id == ins.id).first()

    db.add(SubscriptionPayment(
        billing_instruction_id=ins.id,
        contract_id=contract.id if contract else None,
        amount=amount,
        currency=ins.currency or "ILS",
        payment_number=payment_count + 1,
        status="success",
        zcredit_transaction_id=doc_id,
        zcredit_approval_number="",
    ))
    db.commit()
    logger.info(
        "subscription_billing: charged payment #%d amount=%.2f account_id=%s ins_id=%s",
        payment_count + 1,
        amount,
        ins.account_id,
        ins.id,
    )


# ── Test-interval billing (every N minutes) ──────────────────────────────────


def run_test_billing_sync() -> None:
    """Charge subscriptions that have test_interval_minutes set.

    Runs every minute when SUBSCRIPTION_BILLING_TEST_ENABLED=true.
    Replaces the monthly calendar check with a simple time-since-last-charge check.
    """
    now = datetime.utcnow()
    with SessionLocal() as db:
        try:
            due = (
                db.query(AccountBillingInstruction)
                .filter(
                    AccountBillingInstruction.charge_type == "monthly",
                    AccountBillingInstruction.subscription_status == "active",
                    AccountBillingInstruction.test_interval_minutes.isnot(None),
                )
                .all()
            )
        except Exception:
            logger.exception("test_billing: failed to query — aborting")
            return

        logger.debug("test_billing: %d subscription(s) with test_interval set", len(due))
        for ins in due:
            try:
                _charge_one_test(db, ins, now)
            except Exception:
                logger.exception("test_billing: unexpected error for ins_id=%s — skipping", ins.id)


def _charge_one_test(db: Session, ins: AccountBillingInstruction, now: datetime) -> None:
    interval = ins.test_interval_minutes or 10
    cutoff = now - timedelta(minutes=interval)

    last_ok = (
        db.query(SubscriptionPayment)
        .filter(
            SubscriptionPayment.billing_instruction_id == ins.id,
            SubscriptionPayment.status == "success",
        )
        .order_by(SubscriptionPayment.paid_at.desc())
        .first()
    )
    if last_ok:
        paid_at = last_ok.paid_at
        # Normalize timezone-aware timestamps to naive UTC for comparison
        if hasattr(paid_at, "tzinfo") and paid_at.tzinfo is not None:
            paid_at = paid_at.replace(tzinfo=None)
        if paid_at > cutoff:
            logger.debug(
                "test_billing: last charge was %.1f min ago (interval=%d) — skipping ins_id=%s",
                (now - paid_at).total_seconds() / 60,
                interval,
                ins.id,
            )
            return

    card = db.query(SavedCard).filter(SavedCard.account_id == ins.account_id).first()
    if not card or not card.zcredit_token:
        logger.warning("test_billing: no saved card account_id=%s — marking past_due", ins.account_id)
        ins.subscription_status = "past_due"
        db.add(ins)
        db.commit()
        contract = db.query(Contract).filter(Contract.billing_instruction_id == ins.id).first()
        payment_count = db.query(SubscriptionPayment).filter(SubscriptionPayment.billing_instruction_id == ins.id).count()
        send_past_due_alert(
            _admin_emails(db),
            account_id=ins.account_id,
            amount=ins.amount or 0,
            currency=ins.currency or "ILS",
            contract_title=contract.title if contract else None,
            payment_number=payment_count + 1,
            reason="No saved card on file (test mode)",
        )
        return

    amount = ins.amount or 0
    if amount <= 0:
        logger.warning("test_billing: zero amount ins_id=%s — skipping", ins.id)
        return

    doc_id = f"test_{ins.id}_{now.strftime('%Y%m%dT%H%M%S')}_{uuid.uuid4().hex[:8]}"
    try:
        pay_open_invoice(doc_id, card.zcredit_token, amount_major=amount, currency=ins.currency or "ILS")
    except Exception:
        logger.exception("test_billing: charge failed ins_id=%s — marking past_due", ins.id)
        ins.subscription_status = "past_due"
        db.add(ins)
        db.commit()
        contract = db.query(Contract).filter(Contract.billing_instruction_id == ins.id).first()
        payment_count = db.query(SubscriptionPayment).filter(SubscriptionPayment.billing_instruction_id == ins.id).count()
        send_past_due_alert(
            _admin_emails(db),
            account_id=ins.account_id,
            amount=amount,
            currency=ins.currency or "ILS",
            contract_title=contract.title if contract else None,
            payment_number=payment_count + 1,
            reason="Z-Credit charge rejected (test mode)",
        )
        return

    payment_count = db.query(SubscriptionPayment).filter(
        SubscriptionPayment.billing_instruction_id == ins.id
    ).count()

    contract = db.query(Contract).filter(Contract.billing_instruction_id == ins.id).first()

    db.add(SubscriptionPayment(
        billing_instruction_id=ins.id,
        contract_id=contract.id if contract else None,
        amount=amount,
        currency=ins.currency or "ILS",
        payment_number=payment_count + 1,
        status="success",
        zcredit_transaction_id=doc_id,
        zcredit_approval_number="",
    ))
    db.commit()
    logger.info(
        "test_billing: charged payment #%d amount=%.2f account_id=%s ins_id=%s (interval=%dmin)",
        payment_count + 1,
        amount,
        ins.account_id,
        ins.id,
        interval,
    )
