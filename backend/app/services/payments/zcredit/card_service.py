"""Shared SavedCard upsert used by both the webhook path and the account save-card route."""

from __future__ import annotations

from sqlalchemy.orm import Session

from app.models.billing import SavedCard


def upsert_saved_card(
    db: Session,
    *,
    account_id: int,
    token: str,
    token_id: str | None = None,
    holder_name: str | None = None,
    last4: str | None = None,
    brand: str | None = None,
    exp_month: int | None = None,
    exp_year: int | None = None,
) -> SavedCard:
    """Insert or update the single SavedCard row for an account.

    Args:
        db: Active SQLAlchemy session.
        account_id: Account whose card is being saved.
        token: Z-Credit card token (required).
        token_id: Z-Credit token ID (optional; only overwrites if not None).
        holder_name: Card holder name (optional).
        last4: Last 4 digits of the card number (optional).
        brand: Card brand e.g. "visa" (optional).
        exp_month: Expiry month 1–12 (optional).
        exp_year: Expiry year (optional).

    Returns:
        The inserted or updated SavedCard instance (not yet committed).

    Note:
        Only non-None kwargs overwrite existing fields, so callers can pass
        only the data they have without clobbering fields set by another path.
        exp_month=1 / exp_year=2099 are sentinel inserts when expiry is
        unknown (the column is NOT NULL in the DB).
    """
    existing = db.query(SavedCard).filter(SavedCard.account_id == account_id).first()
    if existing:
        existing.zcredit_token = token
        if token_id is not None:
            existing.zcredit_token_id = token_id
        if holder_name is not None:
            existing.holder_name = holder_name
        if last4 is not None:
            existing.last4 = last4
        if brand is not None:
            existing.brand = brand
        if exp_month is not None:
            existing.exp_month = exp_month
        if exp_year is not None:
            existing.exp_year = exp_year
        db.add(existing)
        return existing

    card = SavedCard(
        account_id=account_id,
        zcredit_token=token,
        zcredit_token_id=token_id,
        holder_name=holder_name or "Unknown",
        last4=last4 or "0000",
        brand=brand or "unknown",
        exp_month=exp_month or 1,    # sentinel: expiry unknown
        exp_year=exp_year or 2099,   # sentinel: expiry unknown
    )
    db.add(card)
    return card
