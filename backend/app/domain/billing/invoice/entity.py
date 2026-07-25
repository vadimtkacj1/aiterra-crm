"""Invoice domain entities and inputs.

Pure dataclasses mirroring the persisted shape of an invoice, with a little behaviour
(``is_open`` / ``is_payable`` …). No SQLAlchemy or FastAPI here — the repository maps
these to/from the ORM ``Invoice``/``InvoiceLine`` models.
"""

from __future__ import annotations

from dataclasses import dataclass, field
from datetime import datetime

from app.domain.billing.invoice.constants import (
    STATUS_OPEN,
    STATUS_PAID,
    STATUS_SUPERSEDED,
)


@dataclass(frozen=True, slots=True)
class InvoiceLineIn:
    """One billed line supplied when issuing an invoice.

    Fields are positional (``description, amount, stage_id``) — callers construct it as
    ``InvoiceLineIn(desc, amount, stage_id)``, so the order must not change.
    """

    description: str | None
    amount: float
    stage_id: int | None = None


@dataclass(frozen=True, slots=True)
class InvoiceIssueInput:
    """Everything needed to issue (or re-issue) an invoice.

    ``lines is None`` means "leave existing lines untouched"; an empty tuple means
    "replace with no lines" — the same distinction the legacy service relied on.
    """

    source_type: str
    source_id: int | None
    amount: float
    currency: str
    description: str | None = None
    provider: str = "zcredit"
    provider_doc_id: str | None = None
    provider_url: str | None = None
    account_id: int | None = None
    customer_name: str | None = None
    customer_email: str | None = None
    created_by_admin_id: int | None = None
    lines: tuple[InvoiceLineIn, ...] | None = None
    supersedes_doc_id: str | None = None


@dataclass(frozen=True, slots=True)
class InvoiceLineEntity:
    """A persisted invoice line."""

    id: int | None
    sort_order: int
    description: str | None
    amount: float
    stage_id: int | None = None


@dataclass(frozen=True, slots=True)
class InvoiceEntity:
    """A persisted invoice — one issued demand for payment."""

    id: int | None
    account_id: int | None
    source_type: str
    source_id: int | None
    amount: float
    currency: str
    description: str | None
    status: str
    provider: str
    provider_doc_id: str | None
    provider_url: str | None
    superseded_by_id: int | None
    customer_name: str | None
    customer_email: str | None
    paid_at: datetime | None
    reference_number: str | None
    approval_number: str | None
    created_at: datetime | None
    created_by_admin_id: int | None
    lines: tuple[InvoiceLineEntity, ...] = field(default_factory=tuple)

    # ── Business rules (framework-agnostic) ──────────────────────────────────
    @property
    def is_open(self) -> bool:
        return self.status == STATUS_OPEN

    @property
    def is_paid(self) -> bool:
        return self.status == STATUS_PAID

    @property
    def is_superseded(self) -> bool:
        return self.status == STATUS_SUPERSEDED

    @property
    def is_payable(self) -> bool:
        """A demand still awaiting money — the only state a new payment should target."""
        return self.status == STATUS_OPEN
