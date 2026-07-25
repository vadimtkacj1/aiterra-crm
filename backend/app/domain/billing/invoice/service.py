"""Service contract for the invoice registry — the business operations callers use."""

from __future__ import annotations

from abc import ABC, abstractmethod
from datetime import datetime

from app.domain.billing.invoice.entity import InvoiceEntity, InvoiceIssueInput


class IInvoiceService(ABC):
    """Abstract business operations over the invoice registry."""

    @abstractmethod
    def issue_invoice(self, data: InvoiceIssueInput) -> InvoiceEntity:
        """Record an issued invoice, superseding a prior one when requested. Idempotent
        on ``data.provider_doc_id``. Flushes but does not commit."""

    @abstractmethod
    def mark_invoice_paid(
        self,
        provider_doc_id: str,
        *,
        reference_number: str | None = None,
        approval_number: str | None = None,
        paid_at: datetime | None = None,
    ) -> InvoiceEntity | None:
        """Mark the invoice behind a gateway callback as paid. Idempotent on retries."""

    @abstractmethod
    def cancel_open_invoices(self, source_type: str, source_id: int) -> list[InvoiceEntity]:
        """Close every open invoice of a source (its contract was voided or deleted).

        The gateway link itself cannot be revoked, so the closed rows are what tells an
        operator which links are still payable."""

    @abstractmethod
    def find_by_doc_id(self, provider_doc_id: str) -> InvoiceEntity | None:
        """Find an invoice by its gateway document id, superseded ones included."""

    @abstractmethod
    def open_invoice_for_source(self, source_type: str, source_id: int) -> InvoiceEntity | None:
        """The still-open invoice for a source, if any."""

    @abstractmethod
    def list_invoices(
        self,
        *,
        account_id: int | None = None,
        status: str | None = None,
        source_type: str | None = None,
        limit: int = 50,
        offset: int = 0,
    ) -> tuple[list[InvoiceEntity], int]:
        """Return a page of invoices and the total count matching the filters."""

    @abstractmethod
    def get_invoice(self, invoice_id: int) -> InvoiceEntity:
        """Return one invoice. Raises ``InvoiceNotFoundError`` if it does not exist."""
