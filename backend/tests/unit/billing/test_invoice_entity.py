"""Domain unit tests — pure entity behaviour, no DB or framework."""

from __future__ import annotations

import dataclasses

import pytest

from app.domain.billing.invoice.entity import InvoiceEntity


def _invoice(status: str = "open") -> InvoiceEntity:
    return InvoiceEntity(
        id=1,
        account_id=1,
        source_type="manual",
        source_id=None,
        amount=10.0,
        currency="ILS",
        description=None,
        status=status,
        provider="zcredit",
        provider_doc_id="doc",
        provider_url=None,
        superseded_by_id=None,
        customer_name=None,
        customer_email=None,
        paid_at=None,
        reference_number=None,
        approval_number=None,
        created_at=None,
        created_by_admin_id=None,
    )


def test_open_invoice_flags():
    inv = _invoice("open")
    assert inv.is_open
    assert inv.is_payable
    assert not inv.is_paid
    assert not inv.is_superseded


def test_paid_invoice_flags():
    inv = _invoice("paid")
    assert inv.is_paid
    assert not inv.is_open
    assert not inv.is_payable


def test_superseded_invoice_is_not_payable():
    inv = _invoice("superseded")
    assert inv.is_superseded
    assert not inv.is_payable


def test_entity_is_immutable():
    inv = _invoice("open")
    with pytest.raises(dataclasses.FrozenInstanceError):
        inv.status = "paid"  # type: ignore[misc]
