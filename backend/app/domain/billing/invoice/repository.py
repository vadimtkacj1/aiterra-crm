"""Repository contract for the invoice registry.

Declares *what* persistence operations exist, typed entirely in domain entities. The
concrete SQLAlchemy implementation lives in ``app/infra/billing/invoice/repository.py``.
Implementations flush but never commit — the caller owns the transaction.
"""

from __future__ import annotations

from abc import ABC, abstractmethod
from datetime import datetime

from app.domain.billing.invoice.entity import InvoiceEntity, InvoiceIssueInput


class IInvoiceRepository(ABC):
    """Abstract persistence contract for invoices."""

    @abstractmethod
    def get(self, invoice_id: int) -> InvoiceEntity | None:
        """Return the invoice with this id, or None."""

    @abstractmethod
    def get_by_doc_id(self, provider_doc_id: str) -> InvoiceEntity | None:
        """Return the newest invoice carrying this gateway document id, or None."""

    @abstractmethod
    def find_open_for_source(self, source_type: str, source_id: int) -> InvoiceEntity | None:
        """Return the still-open invoice for a source, if any (the idempotency guard)."""

    @abstractmethod
    def list(
        self,
        *,
        account_id: int | None = None,
        status: str | None = None,
        source_type: str | None = None,
        limit: int = 50,
        offset: int = 0,
    ) -> list[InvoiceEntity]:
        """Return invoices matching the given filters, newest first."""

    @abstractmethod
    def count(
        self,
        *,
        account_id: int | None = None,
        status: str | None = None,
        source_type: str | None = None,
    ) -> int:
        """Return how many invoices match the given filters."""

    @abstractmethod
    def upsert_by_doc_id(self, data: InvoiceIssueInput) -> InvoiceEntity:
        """Create or refresh the invoice for ``data.provider_doc_id``. Idempotent."""

    @abstractmethod
    def supersede(self, old_doc_id: str, new_invoice_id: int) -> None:
        """Mark the still-open invoice behind ``old_doc_id`` as superseded by another."""

    @abstractmethod
    def cancel_open_for_source(self, source_type: str, source_id: int) -> list[InvoiceEntity]:
        """Close every still-open invoice for a source. Returns the rows it closed."""

    @abstractmethod
    def mark_paid(
        self,
        provider_doc_id: str,
        *,
        reference_number: str | None = None,
        approval_number: str | None = None,
        paid_at: datetime | None = None,
    ) -> InvoiceEntity | None:
        """Mark the invoice behind a gateway callback as paid. None if no row matches."""
