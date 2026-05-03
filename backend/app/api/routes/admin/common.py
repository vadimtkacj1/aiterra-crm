"""Shared helpers for admin HTTP handlers (dates, billing history projection, memberships)."""

from __future__ import annotations

from datetime import datetime, timedelta, timezone

from sqlalchemy.orm import Session

from app.models.billing import AccountBillingInstruction, BillingInstructionHistory
from app.models.core import AccountMembership, User
from app.schemas.billing import BillingHistoryOut, parse_stored_line_items
from app.services import zcredit_service


def first_account_id_for_user(db: Session, user_id: int) -> int | None:
    m = (
        db.query(AccountMembership)
        .filter(AccountMembership.user_id == user_id)
        .order_by(AccountMembership.id.asc())
        .first()
    )
    return m.account_id if m else None


def parse_date_start(value: str | None) -> datetime | None:
    if not value:
        return None
    try:
        dt = datetime.fromisoformat(value)
    except ValueError:
        dt = datetime.fromisoformat(f"{value}T00:00:00")
    if dt.tzinfo is None:
        dt = dt.replace(tzinfo=timezone.utc)
    return dt.astimezone(timezone.utc)


def parse_date_end(value: str | None) -> datetime | None:
    start = parse_date_start(value)
    if not start:
        return None
    return start + timedelta(days=1)


def as_utc(dt: datetime) -> datetime:
    """DB drivers may return naive datetimes; stats filters use UTC-aware bounds."""
    if dt.tzinfo is None:
        return dt.replace(tzinfo=timezone.utc)
    return dt.astimezone(timezone.utc)


def owner_membership(db: Session, user_id: int) -> AccountMembership | None:
    return (
        db.query(AccountMembership)
        .filter(AccountMembership.user_id == user_id, AccountMembership.role_in_account == "owner")
        .order_by(AccountMembership.id.asc())
        .first()
    )


def account_owner_contact(db: Session, account_id: int) -> tuple[str | None, str | None]:
    owner = (
        db.query(User)
        .join(AccountMembership, AccountMembership.user_id == User.id)
        .filter(
            AccountMembership.account_id == account_id,
            AccountMembership.role_in_account == "owner",
        )
        .order_by(AccountMembership.id.asc())
        .first()
    )
    if not owner:
        return None, None
    return owner.email, owner.display_name


def iso_dt(value: object | None) -> str | None:
    if value is None:
        return None
    if hasattr(value, "isoformat"):
        return str(value.isoformat())  # type: ignore[union-attr]
    return str(value)


def mark_active_history_superseded(db: Session, account_id: int) -> None:
    now = datetime.now(timezone.utc)
    active_rows = (
        db.query(BillingInstructionHistory)
        .filter(
            BillingInstructionHistory.account_id == account_id,
            BillingInstructionHistory.record_status == "active",
        )
        .all()
    )
    for row in active_rows:
        row.record_status = "superseded"
        row.closed_at = now
        db.add(row)


def payment_status_for_history(
    row: BillingInstructionHistory,
    inv_st: str | None,
    sub_st: str | None,
) -> str:
    """Human-oriented payment state for admin list (paid / unpaid / …)."""
    if row.record_status == "revoked":
        return "cancelled"
    inv = (inv_st or "").lower()
    if inv == "paid":
        return "paid"
    if inv in ("open", "draft", "pending"):
        return "unpaid"
    if inv in ("void", "uncollectible", "failed"):
        return "voided"
    sub = (sub_st or "").lower()
    if sub in ("past_due", "unpaid", "incomplete"):
        return "unpaid"
    if sub in ("canceled", "cancelled", "incomplete_expired"):
        return "cancelled"
    if row.charge_type == "monthly" and sub in ("active", "trialing"):
        return "ongoing"
    if row.record_status == "superseded":
        return "superseded"
    return "unknown"


def history_to_out(
    row: BillingInstructionHistory,
    live: AccountBillingInstruction | None,
) -> BillingHistoryOut:
    inv_st: str | None = None
    sub_st: str | None = None
    if row.payment_doc_id:
        inv = zcredit_service.try_retrieve_invoice(row.payment_doc_id)
        if inv:
            inv_st = str(getattr(inv, "status", "") or "") or None
    if row.payment_recurring_id:
        sub = zcredit_service.try_retrieve_subscription(row.payment_recurring_id)
        if sub:
            sub_st = str(getattr(sub, "status", "") or "") or None
    is_current = False
    if live and live.charge_type != "none":
        if row.payment_doc_id and row.payment_doc_id == live.payment_doc_id:
            is_current = True
        if row.payment_recurring_id and row.payment_recurring_id == live.payment_recurring_id:
            is_current = True
    pay_status = payment_status_for_history(row, inv_st, sub_st)
    return BillingHistoryOut(
        id=row.id,
        chargeType=row.charge_type,
        amount=row.amount,
        currency=row.currency,
        description=row.description,
        lineItems=parse_stored_line_items(row.line_items_json),
        installmentMonths=row.installment_months,
        installmentTotalAmount=row.installment_total_amount,
        paymentDocId=row.payment_doc_id,
        paymentUrl=row.payment_url,
        paymentRecurringId=row.payment_recurring_id,
        recordStatus=row.record_status,
        paymentDocStatus=inv_st,
        paymentRecurringStatus=sub_st,
        paymentStatus=pay_status,
        createdAt=iso_dt(row.created_at) or "",
        closedAt=iso_dt(row.closed_at),
        isCurrent=is_current,
    )
