"""SQLAlchemy implementation of the invoice repository.

Owns every query and the ORM<->entity mapping. Flushes but never commits — the caller
owns the transaction. The write logic (idempotent upsert on ``provider_doc_id``, line
replacement, supersede, mark-paid) is ported verbatim from the previous
``app/services/billing/invoices.py`` so behaviour is unchanged.
"""

from __future__ import annotations

from datetime import datetime, timezone

from sqlalchemy.orm import Session

from app.domain.billing.invoice.constants import (
    STATUS_CANCELED,
    STATUS_OPEN,
    STATUS_PAID,
    STATUS_SUPERSEDED,
)
from app.domain.billing.invoice.entity import (
    InvoiceEntity,
    InvoiceIssueInput,
    InvoiceLineEntity,
)
from app.domain.billing.invoice.repository import IInvoiceRepository
from app.models.billing import Invoice, InvoiceLine


class InvoiceRepository(IInvoiceRepository):
    """Sync SQLAlchemy invoice repository."""

    def __init__(self, session: Session):
        self._session = session

    # ── ORM -> entity mapping ────────────────────────────────────────────────
    @staticmethod
    def _line_to_entity(model: InvoiceLine) -> InvoiceLineEntity:
        return InvoiceLineEntity(
            id=model.id,
            sort_order=model.sort_order,
            description=model.description,
            amount=model.amount,
            stage_id=model.stage_id,
        )

    @classmethod
    def _to_entity(cls, model: Invoice) -> InvoiceEntity:
        return InvoiceEntity(
            id=model.id,
            account_id=model.account_id,
            source_type=model.source_type,
            source_id=model.source_id,
            amount=model.amount,
            currency=model.currency,
            description=model.description,
            status=model.status,
            provider=model.provider,
            provider_doc_id=model.provider_doc_id,
            provider_url=model.provider_url,
            superseded_by_id=model.superseded_by_id,
            customer_name=model.customer_name,
            customer_email=model.customer_email,
            paid_at=model.paid_at,
            reference_number=model.reference_number,
            approval_number=model.approval_number,
            created_at=model.created_at,
            created_by_admin_id=model.created_by_admin_id,
            lines=tuple(cls._line_to_entity(line) for line in model.lines),
        )

    # ── internal ORM lookups ─────────────────────────────────────────────────
    def _model_by_doc_id(self, provider_doc_id: str | None) -> Invoice | None:
        doc_id = (provider_doc_id or "").strip()
        if not doc_id:
            return None
        return (
            self._session.query(Invoice)
            .filter(Invoice.provider_doc_id == doc_id)
            .order_by(Invoice.id.desc())
            .first()
        )

    def _filtered_query(self, *, account_id, status, source_type):
        query = self._session.query(Invoice)
        if account_id is not None:
            query = query.filter(Invoice.account_id == account_id)
        if status is not None:
            query = query.filter(Invoice.status == status)
        if source_type is not None:
            query = query.filter(Invoice.source_type == source_type)
        return query

    # ── reads ────────────────────────────────────────────────────────────────
    def get(self, invoice_id: int) -> InvoiceEntity | None:
        model = self._session.query(Invoice).filter(Invoice.id == invoice_id).first()
        return self._to_entity(model) if model else None

    def get_by_doc_id(self, provider_doc_id: str) -> InvoiceEntity | None:
        model = self._model_by_doc_id(provider_doc_id)
        return self._to_entity(model) if model else None

    def find_open_for_source(self, source_type: str, source_id: int) -> InvoiceEntity | None:
        model = (
            self._session.query(Invoice)
            .filter(
                Invoice.source_type == source_type,
                Invoice.source_id == source_id,
                Invoice.status == STATUS_OPEN,
            )
            .order_by(Invoice.id.desc())
            .first()
        )
        return self._to_entity(model) if model else None

    def list(
        self,
        *,
        account_id: int | None = None,
        status: str | None = None,
        source_type: str | None = None,
        limit: int = 50,
        offset: int = 0,
    ) -> list[InvoiceEntity]:
        rows = (
            self._filtered_query(account_id=account_id, status=status, source_type=source_type)
            .order_by(Invoice.id.desc())
            .limit(limit)
            .offset(offset)
            .all()
        )
        return [self._to_entity(model) for model in rows]

    def count(
        self,
        *,
        account_id: int | None = None,
        status: str | None = None,
        source_type: str | None = None,
    ) -> int:
        return self._filtered_query(
            account_id=account_id, status=status, source_type=source_type
        ).count()

    # ── writes (flush only, never commit) ────────────────────────────────────
    def upsert_by_doc_id(self, data: InvoiceIssueInput) -> InvoiceEntity:
        doc_id = (data.provider_doc_id or "").strip() or None

        existing = self._model_by_doc_id(doc_id) if doc_id else None
        invoice = existing or Invoice()

        invoice.account_id = data.account_id
        invoice.source_type = data.source_type
        invoice.source_id = data.source_id
        invoice.amount = float(data.amount)
        invoice.currency = (data.currency or "ILS").upper()
        invoice.description = data.description
        invoice.provider = data.provider
        invoice.provider_doc_id = doc_id
        invoice.provider_url = data.provider_url or None
        invoice.customer_name = data.customer_name
        invoice.customer_email = data.customer_email
        if invoice.created_by_admin_id is None:
            invoice.created_by_admin_id = data.created_by_admin_id
        if not existing:
            invoice.status = STATUS_OPEN
            self._session.add(invoice)

        self._session.flush()

        # ``lines is None`` -> leave untouched; a (possibly empty) tuple -> replace.
        if data.lines is not None:
            invoice.lines.clear()
            for i, line in enumerate(data.lines):
                invoice.lines.append(
                    InvoiceLine(
                        sort_order=i,
                        description=line.description,
                        amount=float(line.amount),
                        stage_id=line.stage_id,
                    )
                )
            self._session.flush()

        return self._to_entity(invoice)

    def supersede(self, old_doc_id: str, new_invoice_id: int) -> None:
        old = self._model_by_doc_id(old_doc_id)
        if old and old.id != new_invoice_id and old.status == STATUS_OPEN:
            # The old link stays payable at the gateway (Z-Credit has no void API),
            # so the row is kept resolvable rather than deleted.
            old.status = STATUS_SUPERSEDED
            old.superseded_by_id = new_invoice_id
            self._session.add(old)
            self._session.flush()

    def cancel_open_for_source(self, source_type: str, source_id: int) -> list[InvoiceEntity]:
        rows = (
            self._session.query(Invoice)
            .filter(
                Invoice.source_type == source_type,
                Invoice.source_id == source_id,
                Invoice.status == STATUS_OPEN,
            )
            .all()
        )
        for invoice in rows:
            invoice.status = STATUS_CANCELED
            self._session.add(invoice)
        if rows:
            self._session.flush()
        return [self._to_entity(model) for model in rows]

    def mark_paid(
        self,
        provider_doc_id: str,
        *,
        reference_number: str | None = None,
        approval_number: str | None = None,
        paid_at: datetime | None = None,
    ) -> InvoiceEntity | None:
        invoice = self._model_by_doc_id(provider_doc_id)
        if not invoice:
            return None
        if invoice.status == STATUS_PAID:
            return self._to_entity(invoice)

        invoice.status = STATUS_PAID
        invoice.paid_at = paid_at or datetime.now(timezone.utc)
        invoice.reference_number = reference_number or invoice.reference_number
        invoice.approval_number = approval_number or invoice.approval_number
        self._session.add(invoice)
        self._session.flush()
        return self._to_entity(invoice)
