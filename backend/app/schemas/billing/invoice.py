"""Response DTOs for the invoice registry read API.

Map domain entities (``InvoiceEntity``) to the camelCase shape the frontend consumes,
via ``from_entity`` classmethods — the API layer never serialises ORM models directly.
"""

from __future__ import annotations

from datetime import datetime

from pydantic import BaseModel

from app.domain.billing.invoice.entity import InvoiceEntity, InvoiceLineEntity


class InvoiceLineResponse(BaseModel):
    id: int | None = None
    sortOrder: int
    description: str | None = None
    amount: float
    stageId: int | None = None

    @classmethod
    def from_entity(cls, line: InvoiceLineEntity) -> "InvoiceLineResponse":
        return cls(
            id=line.id,
            sortOrder=line.sort_order,
            description=line.description,
            amount=line.amount,
            stageId=line.stage_id,
        )


class InvoiceResponse(BaseModel):
    id: int | None
    accountId: int | None
    sourceType: str
    sourceId: int | None
    amount: float
    currency: str
    description: str | None
    status: str
    provider: str
    providerDocId: str | None
    providerUrl: str | None
    supersededById: int | None
    customerName: str | None
    customerEmail: str | None
    paidAt: datetime | None
    referenceNumber: str | None
    approvalNumber: str | None
    createdAt: datetime | None
    createdByAdminId: int | None
    lines: list[InvoiceLineResponse]

    @classmethod
    def from_entity(cls, invoice: InvoiceEntity) -> "InvoiceResponse":
        # A hosted link cannot be revoked at the gateway, so a superseded, canceled or
        # already-paid invoice must not hand its link back out: paying it would take
        # money for something that is settled or replaced.
        payable_url = invoice.provider_url if invoice.status == "open" else None
        return cls(
            id=invoice.id,
            accountId=invoice.account_id,
            sourceType=invoice.source_type,
            sourceId=invoice.source_id,
            amount=invoice.amount,
            currency=invoice.currency,
            description=invoice.description,
            status=invoice.status,
            provider=invoice.provider,
            providerDocId=invoice.provider_doc_id,
            providerUrl=payable_url,
            supersededById=invoice.superseded_by_id,
            customerName=invoice.customer_name,
            customerEmail=invoice.customer_email,
            paidAt=invoice.paid_at,
            referenceNumber=invoice.reference_number,
            approvalNumber=invoice.approval_number,
            createdAt=invoice.created_at,
            createdByAdminId=invoice.created_by_admin_id,
            lines=[InvoiceLineResponse.from_entity(line) for line in invoice.lines],
        )


class InvoiceListResponse(BaseModel):
    items: list[InvoiceResponse]
    total: int
