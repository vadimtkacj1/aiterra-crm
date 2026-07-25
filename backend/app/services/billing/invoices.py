"""
Invoice registry — the one place a payment demand is recorded.

This module is now a thin back-compat facade over the Clean Architecture invoice slice
(``app/domain/billing/invoice`` + ``app/infra/billing/invoice``). Existing payment flows
import these functions unchanged; each builds an ``InvoiceService`` on the caller's
Session and delegates.

Every Z-Credit session created anywhere in the app should be mirrored here via
``issue_invoice``. Callers keep writing their own legacy payment_doc_id columns for now
(dual-write); nothing reads exclusively from this table yet, so a failure to record must
never break a payment flow — hence the ``*_safe`` wrappers used at the call sites.

Functions flush but do not commit: the caller owns the transaction. The ``*_safe``
wrappers are the exception — they own an isolated commit/rollback so registry bookkeeping
cannot break a payment flow.
"""

from __future__ import annotations

import logging
from datetime import datetime

from sqlalchemy.orm import Session

# Re-exported so callers keep importing sources/inputs from app.services.billing.
from app.domain.billing.invoice.constants import (  # noqa: F401
    SOURCE_BILLING_INSTRUCTION,
    SOURCE_CONTRACT,
    SOURCE_LANDING,
    SOURCE_MANUAL,
    SOURCE_META_TOPUP,
)
from app.domain.billing.invoice.entity import (
    InvoiceEntity,
    InvoiceIssueInput,
    InvoiceLineIn,  # noqa: F401 — re-exported for callers
)
from app.infra.billing.invoice.repository import InvoiceRepository
from app.infra.billing.invoice.service import InvoiceService

logger = logging.getLogger(__name__)


def _service(db: Session) -> InvoiceService:
    return InvoiceService(InvoiceRepository(db))


def find_by_doc_id(db: Session, provider_doc_id: str) -> InvoiceEntity | None:
    """Find an invoice by its gateway document/session ID, superseded ones included."""
    return _service(db).find_by_doc_id(provider_doc_id)


def open_invoice_for_source(db: Session, source_type: str, source_id: int) -> InvoiceEntity | None:
    """The still-payable invoice for a source, if any — the idempotency guard."""
    return _service(db).open_invoice_for_source(source_type, source_id)


def issue_invoice(
    db: Session,
    *,
    source_type: str,
    source_id: int | None,
    amount: float,
    currency: str,
    description: str | None = None,
    provider_doc_id: str | None = None,
    provider_url: str | None = None,
    account_id: int | None = None,
    lines: list[InvoiceLineIn] | None = None,
    supersedes_doc_id: str | None = None,
    created_by_admin_id: int | None = None,
    customer_name: str | None = None,
    customer_email: str | None = None,
    provider: str = "zcredit",
) -> InvoiceEntity:
    """Record an issued invoice. Idempotent on provider_doc_id.

    Re-issuing with a doc ID that is already registered refreshes that row instead of
    creating a second one, so a retried call cannot duplicate the registry.
    """
    data = InvoiceIssueInput(
        source_type=source_type,
        source_id=source_id,
        amount=amount,
        currency=currency,
        description=description,
        provider=provider,
        provider_doc_id=provider_doc_id,
        provider_url=provider_url,
        account_id=account_id,
        customer_name=customer_name,
        customer_email=customer_email,
        created_by_admin_id=created_by_admin_id,
        lines=tuple(lines) if lines is not None else None,
        supersedes_doc_id=supersedes_doc_id,
    )
    return _service(db).issue_invoice(data)


def record_invoice_safe(db: Session, **kwargs) -> InvoiceEntity | None:
    """``issue_invoice`` + commit, fully isolated.

    Call this *after* the caller has committed its own work: registry bookkeeping is
    additive and must never break a payment flow, so a failure here rolls back only
    the registry write and is logged.
    """
    try:
        invoice = issue_invoice(db, **kwargs)
        db.commit()
        return invoice
    except Exception:
        db.rollback()
        logger.exception(
            "invoices: failed to record source=%s/%s doc=%s — payment flow unaffected",
            kwargs.get("source_type"), kwargs.get("source_id"), kwargs.get("provider_doc_id"),
        )
        return None


def mark_invoice_paid(
    db: Session,
    provider_doc_id: str,
    *,
    reference_number: str | None = None,
    approval_number: str | None = None,
    paid_at: datetime | None = None,
) -> InvoiceEntity | None:
    """Mark the invoice behind a gateway callback as paid. Idempotent on retries."""
    return _service(db).mark_invoice_paid(
        provider_doc_id,
        reference_number=reference_number,
        approval_number=approval_number,
        paid_at=paid_at,
    )


def cancel_open_invoices(db: Session, source_type: str, source_id: int) -> list[InvoiceEntity]:
    """Close every open invoice of a source. Flushes; the caller commits."""
    return _service(db).cancel_open_invoices(source_type, source_id)


def cancel_open_invoices_safe(db: Session, source_type: str, source_id: int) -> list[InvoiceEntity]:
    """``cancel_open_invoices`` + commit, isolated like the other ``*_safe`` wrappers."""
    try:
        closed = cancel_open_invoices(db, source_type, source_id)
        db.commit()
        return closed
    except Exception:
        db.rollback()
        logger.exception("invoices: failed to cancel open invoices for %s/%s", source_type, source_id)
        return []


def mark_paid_safe(db: Session, provider_doc_id: str, **kwargs) -> InvoiceEntity | None:
    """``mark_invoice_paid`` + commit, isolated the same way."""
    try:
        invoice = mark_invoice_paid(db, provider_doc_id, **kwargs)
        db.commit()
        return invoice
    except Exception:
        db.rollback()
        logger.exception("invoices: failed to mark paid doc=%s", provider_doc_id)
        return None
