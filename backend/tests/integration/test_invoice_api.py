"""API integration tests — the read surface, exercising the full DI stack + auth."""

from __future__ import annotations

from sqlalchemy.orm import Session

from app.models.billing import Invoice
from app.models.core import Account


def _add_invoice(engine, *, account_id: int | None, doc: str, status: str = "open", amount: float = 100.0) -> int:
    with Session(bind=engine) as s:
        inv = Invoice(
            source_type="manual",
            source_id=None,
            amount=amount,
            currency="ILS",
            status=status,
            provider="zcredit",
            provider_doc_id=doc,
            account_id=account_id,
        )
        s.add(inv)
        s.commit()
        s.refresh(inv)
        return inv.id


def _new_account(engine, name: str) -> int:
    with Session(bind=engine) as s:
        acct = Account(name=name)
        s.add(acct)
        s.commit()
        s.refresh(acct)
        return acct.id


def test_member_lists_own_account_invoices(client, test_ids, engine, h_member):
    _add_invoice(engine, account_id=test_ids["account_id"], doc="d1")

    r = client.get(f"/api/billing/invoices?account_id={test_ids['account_id']}", headers=h_member)

    assert r.status_code == 200
    body = r.json()
    assert body["total"] == 1
    assert body["items"][0]["providerDocId"] == "d1"


def test_member_must_scope_to_an_account(client, test_ids, h_member):
    r = client.get("/api/billing/invoices", headers=h_member)
    assert r.status_code == 400


def test_member_cannot_list_another_account(client, test_ids, engine, h_member):
    other = _new_account(engine, "Other Biz")
    r = client.get(f"/api/billing/invoices?account_id={other}", headers=h_member)
    assert r.status_code == 403


def test_admin_lists_across_accounts(client, test_ids, engine, h_admin):
    _add_invoice(engine, account_id=test_ids["account_id"], doc="d2")
    _add_invoice(engine, account_id=None, doc="d3-landing")

    r = client.get("/api/billing/invoices", headers=h_admin)

    assert r.status_code == 200
    assert r.json()["total"] >= 2


def test_status_filter_is_applied(client, test_ids, engine, h_admin):
    _add_invoice(engine, account_id=test_ids["account_id"], doc="open-1", status="open")
    _add_invoice(engine, account_id=test_ids["account_id"], doc="paid-1", status="paid")

    r = client.get("/api/billing/invoices?status=paid", headers=h_admin)

    assert r.status_code == 200
    docs = {item["providerDocId"] for item in r.json()["items"]}
    assert "paid-1" in docs
    assert "open-1" not in docs


def test_member_gets_own_invoice_by_id(client, test_ids, engine, h_member):
    invoice_id = _add_invoice(engine, account_id=test_ids["account_id"], doc="byid")

    r = client.get(f"/api/billing/invoices/{invoice_id}", headers=h_member)

    assert r.status_code == 200
    assert r.json()["id"] == invoice_id


def test_missing_invoice_returns_404(client, test_ids, h_admin):
    r = client.get("/api/billing/invoices/999999", headers=h_admin)
    assert r.status_code == 404


def test_member_cannot_read_another_accounts_invoice(client, test_ids, engine, h_member):
    other = _new_account(engine, "Other Biz 2")
    invoice_id = _add_invoice(engine, account_id=other, doc="secret")

    r = client.get(f"/api/billing/invoices/{invoice_id}", headers=h_member)

    assert r.status_code == 403


def test_member_cannot_read_accountless_invoice(client, test_ids, engine, h_member):
    invoice_id = _add_invoice(engine, account_id=None, doc="landing-secret")

    r = client.get(f"/api/billing/invoices/{invoice_id}", headers=h_member)

    assert r.status_code == 403
