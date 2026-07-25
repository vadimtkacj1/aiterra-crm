"""Concrete invoice service — orchestration over the repository.

Holds the business flow (issue + optional supersede, idempotent mark-paid, list/get)
and deals only in domain entities. No SQLAlchemy and no commits here — transaction
ownership stays with the caller (the ``*_safe`` shim wrappers or a read request).
"""

from __future__ import annotations

import logging
from datetime import datetime

from app.domain.billing.invoice.entity import InvoiceEntity, InvoiceIssueInput
from app.domain.billing.invoice.exceptions import InvoiceNotFoundError
from app.domain.billing.invoice.repository import IInvoiceRepository
from app.domain.billing.invoice.service import IInvoiceService

logger = logging.getLogger(__name__)


class InvoiceService(IInvoiceService):
    def __init__(self, repository: IInvoiceRepository):
        self._repo = repository

    def issue_invoice(self, data: InvoiceIssueInput) -> InvoiceEntity:
        invoice = self._repo.upsert_by_doc_id(data)
        if data.supersedes_doc_id and invoice.id is not None:
            self._repo.supersede(data.supersedes_doc_id, invoice.id)
        return invoice

    def mark_invoice_paid(
        self,
        provider_doc_id: str,
        *,
        reference_number: str | None = None,
        approval_number: str | None = None,
        paid_at: datetime | None = None,
    ) -> InvoiceEntity | None:
        invoice = self._repo.mark_paid(
            provider_doc_id,
            reference_number=reference_number,
            approval_number=approval_number,
            paid_at=paid_at,
        )
        if invoice is None:
            logger.info("invoices: no registry row for doc_id=%s", provider_doc_id)
            return None
        logger.info(
            "invoices: marked paid id=%s source=%s/%s amount=%.2f %s",
            invoice.id, invoice.source_type, invoice.source_id, invoice.amount, invoice.currency,
        )
        return invoice

    def cancel_open_invoices(self, source_type: str, source_id: int) -> list[InvoiceEntity]:
        closed = self._repo.cancel_open_for_source(source_type, source_id)
        for invoice in closed:
            # Z-Credit cannot revoke a hosted link: it stays payable after this.
            logger.warning(
                "invoices: canceled id=%s source=%s/%s amount=%.2f %s — gateway link %s "
                "remains payable and must be handled at the provider",
                invoice.id, invoice.source_type, invoice.source_id, invoice.amount,
                invoice.currency, invoice.provider_doc_id,
            )
        return closed

    def find_by_doc_id(self, provider_doc_id: str) -> InvoiceEntity | None:
        return self._repo.get_by_doc_id(provider_doc_id)

    def open_invoice_for_source(self, source_type: str, source_id: int) -> InvoiceEntity | None:
        return self._repo.find_open_for_source(source_type, source_id)

    def list_invoices(
        self,
        *,
        account_id: int | None = None,
        status: str | None = None,
        source_type: str | None = None,
        limit: int = 50,
        offset: int = 0,
    ) -> tuple[list[InvoiceEntity], int]:
        items = self._repo.list(
            account_id=account_id,
            status=status,
            source_type=source_type,
            limit=limit,
            offset=offset,
        )
        total = self._repo.count(account_id=account_id, status=status, source_type=source_type)
        return items, total

    def get_invoice(self, invoice_id: int) -> InvoiceEntity:
        invoice = self._repo.get(invoice_id)
        if invoice is None:
            raise InvoiceNotFoundError(f"invoice {invoice_id} not found")
        return invoice
