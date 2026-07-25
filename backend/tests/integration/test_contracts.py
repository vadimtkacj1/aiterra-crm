"""
Integration tests: full contracts lifecycle.

Covers: admin CRUD, public sign flow, contract checkout, member list.
"""

from __future__ import annotations

from types import SimpleNamespace

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


def _stub_invoices(monkeypatch) -> list[str]:
    """Patch create_invoice to hand out a fresh session per call; returns the call log."""
    from app.services import zcredit_service
    from app.core.settings import settings

    monkeypatch.setattr(settings, "zcredit_api_key", "test_key")
    calls: list[str] = []

    def _create(*args, **kwargs):
        sid = f"session_{len(calls) + 1}"
        calls.append(sid)
        return sid, f"https://pay.example.com/{sid}"

    monkeypatch.setattr(zcredit_service, "create_invoice", _create)

    def _confirm(doc_id):
        return SimpleNamespace(status="paid", amount_paid=0, currency="ILS", payment_url=None)

    monkeypatch.setattr(zcredit_service, "try_retrieve_invoice", _confirm)
    return calls


def _create_two_stage_contract(engine, account_id: int) -> Contract:
    with Session(bind=engine) as s:
        c = Contract(
            account_id=account_id,
            title="Two Stage Agreement",
            body="Terms.",
            total_amount=1000.0,
            currency="ILS",
            status="draft",
            created_by_admin_id=1,
        )
        s.add(c)
        s.flush()
        s.add(ContractPaymentStage(contract_id=c.id, sort_order=0, description="Upfront", amount=500.0))
        s.add(ContractPaymentStage(contract_id=c.id, sort_order=1, description="On delivery", amount=500.0))
        s.commit()
        s.refresh(c)
        return c


def test_contract_checkout_repeat_reuses_open_invoice(client, test_ids, engine, monkeypatch):
    """Z-Credit cannot void invoices — a second click must not open a second payable link."""
    calls = _stub_invoices(monkeypatch)

    c = _create_contract(engine, admin_id=1, account_id=test_ids["account_id"])
    _sign_contract(engine, c.id)

    first = client.post(f"/api/contracts/{c.sign_token}/checkout").json()
    second = client.post(f"/api/contracts/{c.sign_token}/checkout").json()

    assert len(calls) == 1
    assert second["sessionId"] == first["sessionId"]
    assert second["paymentUrl"] == first["paymentUrl"]
    assert second["reused"] is True
    assert first["reused"] is False


def test_contract_checkout_single_reuses_open_combined_invoice(client, test_ids, engine, monkeypatch):
    """Member page asks for one stage, sign page for all — the open invoice still wins."""
    calls = _stub_invoices(monkeypatch)

    c = _create_two_stage_contract(engine, test_ids["account_id"])
    _sign_contract(engine, c.id)

    combined = client.post(f"/api/contracts/{c.sign_token}/checkout?combined=true").json()
    assert combined["amount"] == 1000.0
    assert len(combined["coveredStageIds"]) == 2

    single = client.post(f"/api/contracts/{c.sign_token}/checkout").json()
    assert len(calls) == 1
    assert single["sessionId"] == combined["sessionId"]
    assert single["reused"] is True
    assert single["amount"] == 1000.0


def test_contract_checkout_renew_issues_new_invoice_and_keeps_old_doc(
    client, test_ids, engine, monkeypatch
):
    calls = _stub_invoices(monkeypatch)

    c = _create_contract(engine, admin_id=1, account_id=test_ids["account_id"])
    _sign_contract(engine, c.id)

    first = client.post(f"/api/contracts/{c.sign_token}/checkout").json()
    renewed = client.post(f"/api/contracts/{c.sign_token}/checkout?renew=true").json()

    assert len(calls) == 2
    assert renewed["sessionId"] != first["sessionId"]
    assert renewed["reused"] is False

    with Session(bind=engine) as s:
        stage = s.query(ContractPaymentStage).filter_by(contract_id=c.id).one()
        assert stage.payment_doc_id == renewed["sessionId"]
        # Old link stays payable at Z-Credit — keep it matchable by the webhook
        assert first["sessionId"] in (stage.superseded_doc_ids or "").split(",")


def test_contract_checkout_pre_url_invoice_requires_renew(client, test_ids, engine, monkeypatch):
    """A stage invoiced before the payment_url column can't be reused — blocks until renew."""
    calls = _stub_invoices(monkeypatch)

    c = _create_contract(engine, admin_id=1, account_id=test_ids["account_id"])
    _sign_contract(engine, c.id)
    # Simulate a legacy invoice: doc ID recorded, but no stored payment_url.
    with Session(bind=engine) as s:
        stage = s.query(ContractPaymentStage).filter_by(contract_id=c.id).one()
        stage.status = "invoiced"
        stage.payment_doc_id = "legacy_doc"
        stage.payment_url = None
        s.commit()

    blocked = client.post(f"/api/contracts/{c.sign_token}/checkout")
    assert blocked.status_code == 409
    assert blocked.json()["detail"] == "open_invoice_needs_renew"
    assert calls == []  # no second payable link opened

    renewed = client.post(f"/api/contracts/{c.sign_token}/checkout?renew=true").json()
    assert len(calls) == 1
    assert renewed["reused"] is False

    with Session(bind=engine) as s:
        stage = s.query(ContractPaymentStage).filter_by(contract_id=c.id).one()
        assert stage.payment_doc_id == renewed["sessionId"]
        assert "legacy_doc" in (stage.superseded_doc_ids or "").split(",")


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


# ─── Subscription stage classification & billing activation ───────────────────


def test_subscription_contract_marks_only_the_subscription_stage(client, h_admin, test_ids, engine):
    """The recurring stage is labelled explicitly, not inferred from its position."""
    r = client.post(
        "/api/admin/contracts",
        headers=h_admin,
        json={
            "accountId": test_ids["account_id"],
            "title": "Plan with setup fee",
            "currency": "ILS",
            "isSubscription": True,
            "monthlyAmount": 299.0,
            "subscriptionMonths": 12,
            "stages": [{"description": "Setup fee", "amount": 500.0}],
        },
    )
    assert r.status_code == 200
    contract_id = r.json()["id"]

    with Session(bind=engine) as s:
        stages = (
            s.query(ContractPaymentStage)
            .filter_by(contract_id=contract_id)
            .order_by(ContractPaymentStage.sort_order)
            .all()
        )
        assert [stage.kind for stage in stages] == ["subscription", "one_time"]


def test_one_time_contract_stages_are_not_subscriptions(client, h_admin, test_ids, engine):
    r = client.post(
        "/api/admin/contracts",
        headers=h_admin,
        json={
            "accountId": test_ids["account_id"],
            "title": "Two instalments",
            "currency": "ILS",
            "stages": [
                {"description": "First", "amount": 500.0},
                {"description": "Second", "amount": 500.0},
            ],
        },
    )
    assert r.status_code == 200
    with Session(bind=engine) as s:
        stages = s.query(ContractPaymentStage).filter_by(contract_id=r.json()["id"]).all()
        assert {stage.kind for stage in stages} == {"one_time"}


def test_sign_activates_billing_even_when_creating_admin_was_deleted(
    client, h_admin, test_ids, engine
):
    """A deleted author used to silently skip activation — client signed, never billed."""
    r = client.post(
        "/api/admin/contracts",
        headers=h_admin,
        json={
            "accountId": test_ids["account_id"],
            "title": "Orphaned author plan",
            "currency": "ILS",
            "isSubscription": True,
            "monthlyAmount": 150.0,
            "subscriptionMonths": 6,
            "stages": [],
        },
    )
    assert r.status_code == 200
    contract = r.json()

    # Drop the author, keeping another admin in place
    with Session(bind=engine) as s:
        second_admin = User(
            email="admin2@test.local",
            display_name="Second Admin",
            role="admin",
            password_hash="x",
        )
        s.add(second_admin)
        author = s.query(Contract).filter_by(id=contract["id"]).one().created_by_admin_id
        s.query(User).filter_by(id=author).delete()
        s.commit()

    r2 = client.post(
        f"/api/contracts/{contract['signToken']}/sign",
        json={"signerName": "Jane Doe", "signaturePngBase64": FAKE_SIG},
    )
    assert r2.status_code == 200

    with Session(bind=engine) as s:
        signed = s.query(Contract).filter_by(id=contract["id"]).one()
        assert signed.status == "signed"
        assert signed.billing_instruction_id is not None


# ─── Derived payment status & contract value ──────────────────────────────────


def test_contract_payment_status_tracks_the_stages(client, h_admin, test_ids, engine):
    r = client.post(
        "/api/admin/contracts",
        headers=h_admin,
        json={
            "accountId": test_ids["account_id"],
            "title": "Two instalments",
            "currency": "ILS",
            "stages": [
                {"description": "First", "amount": 500.0},
                {"description": "Second", "amount": 500.0},
            ],
        },
    )
    contract_id = r.json()["id"]
    assert r.json()["paymentStatus"] == "unpaid"

    def _status() -> str:
        return client.get(f"/api/admin/contracts/{contract_id}", headers=h_admin).json()["paymentStatus"]

    with Session(bind=engine) as s:
        stages = (
            s.query(ContractPaymentStage)
            .filter_by(contract_id=contract_id)
            .order_by(ContractPaymentStage.sort_order)
            .all()
        )
        stages[0].status = "invoiced"
        s.commit()
    assert _status() == "invoiced"

    with Session(bind=engine) as s:
        first = s.query(ContractPaymentStage).filter_by(contract_id=contract_id, sort_order=0).one()
        first.status = "paid"
        s.commit()
    assert _status() == "partial"

    with Session(bind=engine) as s:
        for stage in s.query(ContractPaymentStage).filter_by(contract_id=contract_id).all():
            stage.status = "paid"
        s.commit()
    assert _status() == "paid"


def test_subscription_contract_value_is_monthly_times_months_plus_fees(client, h_admin, test_ids):
    r = client.post(
        "/api/admin/contracts",
        headers=h_admin,
        json={
            "accountId": test_ids["account_id"],
            "title": "Yearly plan with setup",
            "currency": "ILS",
            "isSubscription": True,
            "monthlyAmount": 300.0,
            "subscriptionMonths": 12,
            "stages": [{"description": "Setup", "amount": 500.0}],
        },
    )
    data = r.json()
    # totalAmount stays one month + fees (unchanged legacy meaning)
    assert data["totalAmount"] == 800.0
    # the contract is really worth 12 x 300 + 500
    assert data["contractValue"] == 4100.0


def test_open_ended_subscription_has_no_finite_value(client, h_admin, test_ids):
    r = client.post(
        "/api/admin/contracts",
        headers=h_admin,
        json={
            "accountId": test_ids["account_id"],
            "title": "Rolling plan",
            "currency": "ILS",
            "isSubscription": True,
            "monthlyAmount": 300.0,
            "stages": [],
        },
    )
    assert r.json()["contractValue"] is None


def test_one_time_contract_value_equals_total(client, h_admin, test_ids):
    r = client.post(
        "/api/admin/contracts",
        headers=h_admin,
        json={
            "accountId": test_ids["account_id"],
            "title": "Flat job",
            "currency": "ILS",
            "stages": [{"description": "All of it", "amount": 900.0}],
        },
    )
    assert r.json()["contractValue"] == 900.0
    assert r.json()["totalAmount"] == 900.0


def test_voiding_a_subscription_contract_stops_the_billing(client, h_admin, test_ids, engine):
    """A voided agreement must not keep charging the client's card every month."""
    from app.models.billing import AccountBillingInstruction

    r = client.post(
        "/api/admin/contracts",
        headers=h_admin,
        json={
            "accountId": test_ids["account_id"],
            "title": "Monthly plan",
            "currency": "ILS",
            "isSubscription": True,
            "monthlyAmount": 200.0,
            "subscriptionMonths": 12,
            "billingDay": 10,
            "stages": [],
        },
    )
    contract = r.json()
    signed = client.post(
        f"/api/contracts/{contract['signToken']}/sign",
        json={"signerName": "Jane Doe", "signaturePngBase64": FAKE_SIG},
    )
    assert signed.status_code == 200

    with Session(bind=engine) as s:
        instruction_id = s.query(Contract).filter_by(id=contract["id"]).one().billing_instruction_id
        assert instruction_id is not None
        ins = s.query(AccountBillingInstruction).filter_by(id=instruction_id).one()
        ins.subscription_status = "active"
        s.commit()

    voided = client.post(f"/api/admin/contracts/{contract['id']}/void", headers=h_admin)
    assert voided.status_code == 200

    with Session(bind=engine) as s:
        ins = s.query(AccountBillingInstruction).filter_by(id=instruction_id).one()
        assert ins.subscription_status == "canceled"


def test_signing_a_second_contract_keeps_the_locked_billing_day(client, h_admin, test_ids, engine):
    """Re-syncing without a billing day used to blank it, and the charge never fired again."""
    from app.models.billing import AccountBillingInstruction

    first = client.post(
        "/api/admin/contracts",
        headers=h_admin,
        json={
            "accountId": test_ids["account_id"], "title": "Plan A", "currency": "ILS",
            "isSubscription": True, "monthlyAmount": 200.0, "billingDay": 7, "stages": [],
        },
    ).json()
    client.post(
        f"/api/contracts/{first['signToken']}/sign",
        json={"signerName": "Jane Doe", "signaturePngBase64": FAKE_SIG},
    )

    second = client.post(
        "/api/admin/contracts",
        headers=h_admin,
        json={
            "accountId": test_ids["account_id"], "title": "Plan B", "currency": "ILS",
            "isSubscription": True, "monthlyAmount": 300.0, "stages": [],
        },
    ).json()
    client.post(
        f"/api/contracts/{second['signToken']}/sign",
        json={"signerName": "Jane Doe", "signaturePngBase64": FAKE_SIG},
    )

    with Session(bind=engine) as s:
        ins = s.query(AccountBillingInstruction).filter_by(
            account_id=test_ids["account_id"]
        ).one()
        assert ins.billing_day == 7
