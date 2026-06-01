"""
Contract checkout / invoice payment flow (mock Z-Credit — no API key).

Covers: billing overview pending row → contract-acceptance audit → mock hosted confirm → pending clears.
"""

from __future__ import annotations

import base64

import pytest
from sqlalchemy.orm import Session

from app.core.settings import settings
from app.models.billing import AccountBillingInstruction


MIN_VALID_B64 = base64.b64encode(b"x" * 32).decode("ascii")


def _seed_open_one_time_invoice(engine, account_id: int, *, amount: float = 199.0) -> AccountBillingInstruction:
    with Session(bind=engine) as s:
        ins = AccountBillingInstruction(
            account_id=account_id,
            charge_type="one_time",
            amount=amount,
            currency="ILS",
            description="Contract — first installment",
            line_items_json='[{"code":"srv","label":"Server (1)","amount":100.0}]',
            payment_doc_id=f"doc_contract_{account_id}_test",
            payment_url="https://pci.zcredit.co.il/pay/doc_contract_%s_test" % account_id,
        )
        s.add(ins)
        s.commit()
        s.refresh(ins)
        return ins


def test_billing_overview_shows_pending_one_time_invoice(client, h_member, test_ids, engine):
    ins = _seed_open_one_time_invoice(engine, test_ids["account_id"])

    r = client.get(
        f"/api/accounts/{test_ids['account_id']}/billing/overview",
        headers=h_member,
    )
    assert r.status_code == 200
    data = r.json()
    pending = data.get("pendingPayments") or []
    assert len(pending) == 1
    assert pending[0]["id"] == f"bi_{ins.id}"
    assert pending[0]["flow"] == "one_time"
    assert pending[0]["amount"] == 199.0
    assert pending[0]["payUrl"] is not None
    assert ins.payment_doc_id in (pending[0]["payUrl"] or "")


def test_contract_acceptance_matches_pending_payment_id(client, h_member, test_ids, engine):
    ins = _seed_open_one_time_invoice(engine, test_ids["account_id"])
    payment_action_id = f"bi_{ins.id}"

    r = client.post(
        f"/api/accounts/{test_ids['account_id']}/billing/contract-acceptance",
        headers=h_member,
        json={"paymentActionId": payment_action_id, "signaturePngBase64": MIN_VALID_B64},
    )
    assert r.status_code == 200


def test_mock_confirm_clears_pending_one_time_invoice(client, h_member, test_ids, engine, monkeypatch):
    monkeypatch.setattr(settings, "zcredit_api_key", None)
    ins = _seed_open_one_time_invoice(engine, test_ids["account_id"])
    doc_id = ins.payment_doc_id
    assert doc_id

    r0 = client.get(
        f"/api/accounts/{test_ids['account_id']}/billing/overview",
        headers=h_member,
    )
    assert r0.status_code == 200
    assert len(r0.json().get("pendingPayments") or []) == 1

    conf = client.post(f"/api/mock-payment/{doc_id}/confirm", json={"success": True})
    assert conf.status_code == 200
    assert conf.json().get("ok") is True

    r1 = client.get(
        f"/api/accounts/{test_ids['account_id']}/billing/overview",
        headers=h_member,
    )
    assert r1.status_code == 200
    assert not r1.json().get("pendingPayments")


def test_full_checkout_audit_then_pay_flow(client, h_member, test_ids, engine, monkeypatch):
    """Simulates: sign contract (audit row) then complete hosted mock payment — pending disappears."""
    monkeypatch.setattr(settings, "zcredit_api_key", None)
    ins = _seed_open_one_time_invoice(engine, test_ids["account_id"])
    doc_id = ins.payment_doc_id
    pid = f"bi_{ins.id}"

    ca = client.post(
        f"/api/accounts/{test_ids['account_id']}/billing/contract-acceptance",
        headers=h_member,
        json={"paymentActionId": pid, "signaturePngBase64": MIN_VALID_B64},
    )
    assert ca.status_code == 200

    pay = client.post(f"/api/mock-payment/{doc_id}/confirm", json={"success": True})
    assert pay.status_code == 200

    ov = client.get(
        f"/api/accounts/{test_ids['account_id']}/billing/overview",
        headers=h_member,
    )
    assert ov.status_code == 200
    assert not ov.json().get("pendingPayments")

    with Session(bind=engine) as s:
        from app.models.billing import BillingContractAcceptance

        rows = s.query(BillingContractAcceptance).filter(BillingContractAcceptance.account_id == test_ids["account_id"]).all()
        assert any(r.payment_action_id == pid for r in rows)


def test_pay_open_invoice_requires_gateway_and_open_session(client, h_member, test_ids, engine, monkeypatch):
    """Saved-card charge: needs Gateway config + GetSessionStatus 'open'; covered as 400/503 in mock DB."""
    monkeypatch.setattr(settings, "zcredit_api_key", None)
    monkeypatch.setattr(settings, "zcredit_terminal_number", None)
    ins = _seed_open_one_time_invoice(engine, test_ids["account_id"])

    with Session(bind=engine) as s:
        from app.models.billing import SavedCard

        s.add(
            SavedCard(
                account_id=test_ids["account_id"],
                zcredit_token="tok_test_12345678",
                holder_name="T",
                last4="4242",
                brand="visa",
                exp_month=12,
                exp_year=2030,
            )
        )
        s.commit()

    r = client.post(
        f"/api/accounts/{test_ids['account_id']}/billing/pay-invoice",
        headers=h_member,
    )
    assert r.status_code == 400
    assert r.json()["detail"] == "invoice_not_open"


@pytest.mark.parametrize(
    "zc_key,terminal",
    [
        ("K1", "T1"),
    ],
)
def test_pay_open_invoice_success_when_invoice_open_mocked(
    client, h_member, test_ids, engine, monkeypatch, zc_key, terminal
):
    monkeypatch.setattr(settings, "zcredit_api_key", zc_key)
    monkeypatch.setattr(settings, "zcredit_terminal_number", terminal)
    monkeypatch.setattr(settings, "zcredit_gateway_password", "pw")

    ins = _seed_open_one_time_invoice(engine, test_ids["account_id"])

    with Session(bind=engine) as s:
        from app.models.billing import SavedCard

        s.add(
            SavedCard(
                account_id=test_ids["account_id"],
                zcredit_token="tok_test_12345678",
                holder_name="T",
                last4="4242",
                brand="visa",
                exp_month=12,
                exp_year=2030,
            )
        )
        s.commit()

    from app.services import zcredit_service

    monkeypatch.setattr(
        zcredit_service,
        "try_retrieve_invoice",
        lambda _doc_id: zcredit_service.ZCreditDoc(
            id=ins.payment_doc_id,
            status="open",
            amount_paid=0,
            currency="ILS",
        ),
    )
    monkeypatch.setattr(
        zcredit_service,
        "pay_open_invoice",
        lambda *args, **kwargs: zcredit_service.ZCreditDoc(
            id="paid_ref",
            status="paid",
            amount_paid=int(ins.amount * 100) if ins.amount else 0,
            currency="ILS",
        ),
    )

    r = client.post(
        f"/api/accounts/{test_ids['account_id']}/billing/pay-invoice",
        headers=h_member,
    )
    assert r.status_code == 200
    body = r.json()
    assert body["status"] == "paid"
