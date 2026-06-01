"""
Integration tests: full contracts lifecycle.

Covers: admin CRUD, public sign flow, contract checkout, member list.
"""

from __future__ import annotations

import pytest
from sqlalchemy.orm import Session

from app.models.contracts import Contract, ContractPaymentStage
from app.models.core import User


# ─── helpers ─────────────────────────────────────────────────────────────────

FAKE_SIG = "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg=="


def _create_contract(engine, admin_id: int, account_id: int, *, status: str = "draft") -> Contract:
    with Session(bind=engine) as s:
        c = Contract(
            account_id=account_id,
            title="Test Agreement",
            body="These are the terms.",
            total_amount=1000.0,
            currency="ILS",
            status=status,
            created_by_admin_id=admin_id,
        )
        s.add(c)
        s.flush()
        s.add(
            ContractPaymentStage(
                contract_id=c.id,
                sort_order=0,
                description="First payment",
                amount=1000.0,
            )
        )
        s.commit()
        s.refresh(c)
        return c


def _sign_contract(engine, contract_id: int) -> None:
    from datetime import datetime, timezone

    with Session(bind=engine) as s:
        c = s.query(Contract).filter_by(id=contract_id).one()
        c.status = "signed"
        c.signer_name = "Jane Doe"
        c.signed_at = datetime.now(timezone.utc)
        s.commit()


# ─── Admin: contract CRUD ─────────────────────────────────────────────────────


def test_admin_create_contract_one_time(client, h_admin, test_ids):
    r = client.post(
        "/api/admin/contracts",
        headers=h_admin,
        json={
            "accountId": test_ids["account_id"],
            "title": "Service Agreement",
            "body": "Full terms here.",
            "currency": "ILS",
            "stages": [
                {"description": "First payment", "amount": 500.0},
                {"description": "Final payment", "amount": 500.0},
            ],
        },
    )
    assert r.status_code == 200
    data = r.json()
    assert data["title"] == "Service Agreement"
    assert data["status"] == "draft"
    assert data["totalAmount"] == 1000.0
    assert len(data["stages"]) == 2
    assert "signToken" in data


def test_admin_create_subscription_contract(client, h_admin, test_ids):
    r = client.post(
        "/api/admin/contracts",
        headers=h_admin,
        json={
            "accountId": test_ids["account_id"],
            "title": "Monthly Plan",
            "currency": "ILS",
            "isSubscription": True,
            "monthlyAmount": 299.0,
            "subscriptionMonths": 12,
            "billingDay": 1,
            "stages": [],
        },
    )
    assert r.status_code == 200
    data = r.json()
    assert data["monthlyAmount"] == 299.0
    assert data["subscriptionMonths"] == 12
    assert len(data["stages"]) == 1


def test_admin_create_contract_missing_stages_returns_422(client, h_admin, test_ids):
    r = client.post(
        "/api/admin/contracts",
        headers=h_admin,
        json={
            "accountId": test_ids["account_id"],
            "title": "Bad Contract",
            "stages": [],
        },
    )
    assert r.status_code == 422


def test_admin_create_contract_requires_admin(client, h_member, test_ids):
    r = client.post(
        "/api/admin/contracts",
        headers=h_member,
        json={
            "accountId": test_ids["account_id"],
            "title": "x",
            "stages": [{"description": "p", "amount": 100.0}],
        },
    )
    assert r.status_code == 403


def test_admin_list_contracts(client, h_admin, test_ids, engine):
    _create_contract(engine, admin_id=1, account_id=test_ids["account_id"])
    r = client.get("/api/admin/contracts", headers=h_admin)
    assert r.status_code == 200
    rows = r.json()
    assert isinstance(rows, list)
    assert len(rows) >= 1
    titles = [c["title"] for c in rows]
    assert "Test Agreement" in titles


def test_admin_list_contracts_filter_by_account(client, h_admin, test_ids, engine):
    _create_contract(engine, admin_id=1, account_id=test_ids["account_id"])
    r = client.get(
        f"/api/admin/contracts?account_id={test_ids['account_id']}",
        headers=h_admin,
    )
    assert r.status_code == 200
    assert all(c["accountId"] == test_ids["account_id"] for c in r.json())


def test_admin_get_contract(client, h_admin, test_ids, engine):
    c = _create_contract(engine, admin_id=1, account_id=test_ids["account_id"])
    r = client.get(f"/api/admin/contracts/{c.id}", headers=h_admin)
    assert r.status_code == 200
    assert r.json()["id"] == c.id
    assert r.json()["title"] == "Test Agreement"


def test_admin_get_contract_not_found(client, h_admin):
    r = client.get("/api/admin/contracts/99999", headers=h_admin)
    assert r.status_code == 404
    assert r.json()["detail"] == "contract_not_found"


def test_admin_send_contract(client, h_admin, test_ids, engine):
    c = _create_contract(engine, admin_id=1, account_id=test_ids["account_id"])
    r = client.post(f"/api/admin/contracts/{c.id}/send", headers=h_admin)
    assert r.status_code == 200
    assert r.json()["status"] == "pending_signature"


def test_admin_send_already_sent_returns_400(client, h_admin, test_ids, engine):
    c = _create_contract(engine, admin_id=1, account_id=test_ids["account_id"], status="signed")
    r = client.post(f"/api/admin/contracts/{c.id}/send", headers=h_admin)
    assert r.status_code == 400
    assert r.json()["detail"] == "can_only_send_draft"


def test_admin_void_contract(client, h_admin, test_ids, engine):
    c = _create_contract(engine, admin_id=1, account_id=test_ids["account_id"])
    r = client.post(f"/api/admin/contracts/{c.id}/void", headers=h_admin)
    assert r.status_code == 200
    assert r.json()["status"] == "voided"


def test_admin_void_already_voided_returns_400(client, h_admin, test_ids, engine):
    c = _create_contract(engine, admin_id=1, account_id=test_ids["account_id"], status="voided")
    r = client.post(f"/api/admin/contracts/{c.id}/void", headers=h_admin)
    assert r.status_code == 400
    assert r.json()["detail"] == "already_voided"


def test_admin_delete_contract(client, h_admin, test_ids, engine):
    c = _create_contract(engine, admin_id=1, account_id=test_ids["account_id"])
    r = client.delete(f"/api/admin/contracts/{c.id}", headers=h_admin)
    assert r.status_code == 204

    r2 = client.get(f"/api/admin/contracts/{c.id}", headers=h_admin)
    assert r2.status_code == 404


# ─── Public: sign flow ────────────────────────────────────────────────────────


def test_public_get_contract_by_token(client, test_ids, engine):
    c = _create_contract(engine, admin_id=1, account_id=test_ids["account_id"])
    r = client.get(f"/api/contracts/{c.sign_token}")
    assert r.status_code == 200
    data = r.json()
    assert data["title"] == "Test Agreement"
    assert data["status"] in ("draft", "pending_signature")
    assert "signToken" not in data  # public view hides the token


def test_public_get_voided_contract_returns_410(client, test_ids, engine):
    c = _create_contract(engine, admin_id=1, account_id=test_ids["account_id"], status="voided")
    r = client.get(f"/api/contracts/{c.sign_token}")
    assert r.status_code == 410
    assert r.json()["detail"] == "contract_voided"


def test_public_get_contract_not_found_returns_404(client):
    r = client.get("/api/contracts/nonexistent-token-xyz")
    assert r.status_code == 404
    assert r.json()["detail"] == "contract_not_found"


def test_public_sign_contract(client, test_ids, engine):
    c = _create_contract(engine, admin_id=1, account_id=test_ids["account_id"])
    r = client.post(
        f"/api/contracts/{c.sign_token}/sign",
        json={
            "signerName": "Alice Smith",
            "signerPosition": "CEO",
            "recipientEmail": "alice@example.com",
            "signaturePngBase64": FAKE_SIG,
        },
    )
    assert r.status_code == 200
    data = r.json()
    assert data["status"] == "signed"
    assert data["signerName"] == "Alice Smith"
    assert data["signedAt"] is not None


def test_public_sign_contract_empty_name_returns_422(client, test_ids, engine):
    c = _create_contract(engine, admin_id=1, account_id=test_ids["account_id"])
    r = client.post(
        f"/api/contracts/{c.sign_token}/sign",
        json={
            "signerName": "   ",
            "signaturePngBase64": FAKE_SIG,
        },
    )
    assert r.status_code == 422


def test_public_sign_already_signed_returns_409(client, test_ids, engine):
    c = _create_contract(engine, admin_id=1, account_id=test_ids["account_id"])
    _sign_contract(engine, c.id)

    r = client.post(
        f"/api/contracts/{c.sign_token}/sign",
        json={
            "signerName": "Bob",
            "signaturePngBase64": FAKE_SIG,
        },
    )
    assert r.status_code == 409
    assert r.json()["detail"] == "already_signed"


def test_public_sign_voided_contract_returns_410(client, test_ids, engine):
    c = _create_contract(engine, admin_id=1, account_id=test_ids["account_id"], status="voided")
    r = client.post(
        f"/api/contracts/{c.sign_token}/sign",
        json={"signerName": "X", "signaturePngBase64": FAKE_SIG},
    )
    assert r.status_code == 410
    assert r.json()["detail"] == "contract_voided"


# ─── Public: contract checkout ───────────────────────────────────────────────


def test_contract_checkout_requires_signed_first(client, test_ids, engine, monkeypatch):
    from app.core.settings import settings
    monkeypatch.setattr(settings, "zcredit_api_key", "test_key")

    c = _create_contract(engine, admin_id=1, account_id=test_ids["account_id"])
    r = client.post(f"/api/contracts/{c.sign_token}/checkout")
    assert r.status_code == 409
    assert r.json()["detail"] == "contract_must_be_signed_first"


def test_contract_checkout_voided_returns_410(client, test_ids, engine):
    c = _create_contract(engine, admin_id=1, account_id=test_ids["account_id"], status="voided")
    r = client.post(f"/api/contracts/{c.sign_token}/checkout")
    assert r.status_code == 410
    assert r.json()["detail"] == "contract_voided"


def test_contract_checkout_all_stages_paid_returns_409(client, test_ids, engine):
    c = _create_contract(engine, admin_id=1, account_id=test_ids["account_id"])
    _sign_contract(engine, c.id)

    with Session(bind=engine) as s:
        stage = s.query(ContractPaymentStage).filter_by(contract_id=c.id).first()
        assert stage is not None
        stage.status = "paid"
        s.commit()

    r = client.post(f"/api/contracts/{c.sign_token}/checkout")
    assert r.status_code == 409
    assert r.json()["detail"] == "contract_already_paid"


def test_contract_checkout_success(client, test_ids, engine, monkeypatch):
    from app.services import zcredit_service
    from app.core.settings import settings

    monkeypatch.setattr(settings, "zcredit_api_key", "test_key")
    monkeypatch.setattr(
        zcredit_service,
        "create_invoice",
        lambda *args, **kwargs: ("session_test_123", "https://pay.example.com/session_test_123"),
    )

    c = _create_contract(engine, admin_id=1, account_id=test_ids["account_id"])
    _sign_contract(engine, c.id)

    r = client.post(f"/api/contracts/{c.sign_token}/checkout")
    assert r.status_code == 200
    data = r.json()
    assert data["status"] == "ok"
    assert data["gateway"] == "zcredit"
    assert data["sessionId"] == "session_test_123"
    assert data["paymentUrl"] == "https://pay.example.com/session_test_123"
    assert data["stage"]["status"] == "invoiced"


# ─── Member: list contracts ───────────────────────────────────────────────────


def test_member_list_contracts(client, h_member, test_ids, engine):
    _create_contract(engine, admin_id=1, account_id=test_ids["account_id"])
    r = client.get(
        f"/api/accounts/{test_ids['account_id']}/contracts",
        headers=h_member,
    )
    assert r.status_code == 200
    rows = r.json()
    assert isinstance(rows, list)
    assert len(rows) >= 1
    assert rows[0]["title"] == "Test Agreement"


def test_member_list_contracts_excludes_voided(client, h_member, test_ids, engine):
    _create_contract(engine, admin_id=1, account_id=test_ids["account_id"], status="voided")
    r = client.get(
        f"/api/accounts/{test_ids['account_id']}/contracts",
        headers=h_member,
    )
    assert r.status_code == 200
    statuses = [c["status"] for c in r.json()]
    assert "voided" not in statuses


def test_member_list_contracts_requires_auth(client, test_ids):
    r = client.get(f"/api/accounts/{test_ids['account_id']}/contracts")
    assert r.status_code == 401


def test_member_list_contracts_wrong_account_returns_403(client, h_member):
    r = client.get("/api/accounts/99999/contracts", headers=h_member)
    assert r.status_code == 403
