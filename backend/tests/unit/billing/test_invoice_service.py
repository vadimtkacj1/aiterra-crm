"""Service unit tests — orchestration verified against a mocked repository."""

from __future__ import annotations

from unittest.mock import MagicMock

import pytest

from app.domain.billing.invoice.entity import InvoiceEntity, InvoiceIssueInput
from app.domain.billing.invoice.exceptions import InvoiceNotFoundError
from app.infra.billing.invoice.service import InvoiceService


def _entity(**overrides) -> InvoiceEntity:
    base = dict(
        id=1,
        account_id=1,
        source_type="manual",
        source_id=None,
        amount=10.0,
        currency="ILS",
        description=None,
        status="open",
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
        lines=(),
    )
    base.update(overrides)
    return InvoiceEntity(**base)


def test_issue_invoice_delegates_upsert_and_supersedes():
    repo = MagicMock()
    repo.upsert_by_doc_id.return_value = _entity(id=5)
    data = InvoiceIssueInput(
        source_type="manual", source_id=None, amount=10.0, currency="ILS",
        provider_doc_id="new", supersedes_doc_id="old",
    )

    out = InvoiceService(repo).issue_invoice(data)

    assert out.id == 5
    repo.upsert_by_doc_id.assert_called_once_with(data)
    repo.supersede.assert_called_once_with("old", 5)


def test_issue_invoice_without_supersede_does_not_supersede():
    repo = MagicMock()
    repo.upsert_by_doc_id.return_value = _entity(id=5)
    data = InvoiceIssueInput(
        source_type="manual", source_id=None, amount=10.0, currency="ILS", provider_doc_id="new",
    )

    InvoiceService(repo).issue_invoice(data)

    repo.supersede.assert_not_called()


def test_mark_invoice_paid_delegates():
    repo = MagicMock()
    repo.mark_paid.return_value = _entity(status="paid")

    out = InvoiceService(repo).mark_invoice_paid("doc", reference_number="REF")

    assert out is not None and out.is_paid
    repo.mark_paid.assert_called_once()


def test_mark_invoice_paid_returns_none_when_no_row():
    repo = MagicMock()
    repo.mark_paid.return_value = None

    assert InvoiceService(repo).mark_invoice_paid("missing") is None


def test_list_invoices_returns_items_and_total():
    repo = MagicMock()
    repo.list.return_value = [_entity()]
    repo.count.return_value = 1

    items, total = InvoiceService(repo).list_invoices(account_id=1)

    assert total == 1
    assert len(items) == 1


def test_get_invoice_raises_when_missing():
    repo = MagicMock()
    repo.get.return_value = None

    with pytest.raises(InvoiceNotFoundError):
        InvoiceService(repo).get_invoice(99)
