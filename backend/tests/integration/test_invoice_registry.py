"""Invoice registry: every payment demand is mirrored into `invoices`.

The registry is written alongside the legacy payment_doc_id columns (dual-write) and
is not read from yet, so these tests assert the mirror is complete and correct without
touching existing behaviour.
"""

from __future__ import annotations

from types import SimpleNamespace

from datetime import datetime, timezone

from sqlalchemy.orm import Session

from app.models.billing import Invoice
from app.models.contracts import Contract, ContractPaymentStage


def _stub_invoices(monkeypatch) -> list[str]:
    from app.core.settings import settings
    from app.services.payments.zcredit import service as zcredit_service

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


def _signed_contract(engine, account_id: int, *, stages: list[tuple[str, float]]) -> Contract:
    with Session(bind=engine) as s:
        c = Contract(
            account_id=account_id,
            title="Registry Agreement",
            body="Terms.",
            total_amount=sum(a for _, a in stages),
            currency="ILS",
            status="signed",
            signer_name="Jane Doe",
            signed_at=datetime.now(timezone.utc),
            created_by_admin_id=1,
        )
        s.add(c)
        s.flush()
        for i, (desc, amount) in enumerate(stages):
            s.add(ContractPaymentStage(contract_id=c.id, sort_order=i, description=desc, amount=amount))
        s.commit()
        s.refresh(c)
        return c


def test_contract_checkout_is_mirrored_into_registry(client, test_ids, engine, monkeypatch):
    _stub_invoices(monkeypatch)
    c = _signed_contract(engine, test_ids["account_id"], stages=[("Upfront", 400.0)])

    data = client.post(f"/api/contracts/{c.sign_token}/checkout").json()

    with Session(bind=engine) as s:
        invoice = s.query(Invoice).filter_by(provider_doc_id=data["sessionId"]).one()
        assert invoice.source_type == "contract"
        assert invoice.source_id == c.id
        assert invoice.account_id == test_ids["account_id"]
        assert invoice.amount == 400.0
        assert invoice.status == "open"
        assert invoice.provider_url == data["paymentUrl"]
        assert [(line.amount, line.description) for line in invoice.lines] == [(400.0, "Upfront")]


def test_combined_checkout_creates_one_invoice_with_a_line_per_stage(
    client, test_ids, engine, monkeypatch
):
    _stub_invoices(monkeypatch)
    c = _signed_contract(engine, test_ids["account_id"], stages=[("Upfront", 300.0), ("On delivery", 200.0)])

    data = client.post(f"/api/contracts/{c.sign_token}/checkout?combined=true").json()

    with Session(bind=engine) as s:
        invoice = s.query(Invoice).filter_by(provider_doc_id=data["sessionId"]).one()
        assert invoice.amount == 500.0
        assert sorted(line.amount for line in invoice.lines) == [200.0, 300.0]
        assert all(line.stage_id is not None for line in invoice.lines)
        assert s.query(Invoice).count() == 1


def test_renew_supersedes_the_previous_invoice(client, test_ids, engine, monkeypatch):
    _stub_invoices(monkeypatch)
    c = _signed_contract(engine, test_ids["account_id"], stages=[("Upfront", 400.0)])

    first = client.post(f"/api/contracts/{c.sign_token}/checkout").json()
    second = client.post(f"/api/contracts/{c.sign_token}/checkout?renew=true").json()

    with Session(bind=engine) as s:
        old = s.query(Invoice).filter_by(provider_doc_id=first["sessionId"]).one()
        new = s.query(Invoice).filter_by(provider_doc_id=second["sessionId"]).one()
        # The old Z-Credit link stays payable, so its row stays resolvable
        assert old.status == "superseded"
        assert old.superseded_by_id == new.id
        assert new.status == "open"


def test_webhook_marks_the_registry_invoice_paid(client, test_ids, engine, monkeypatch):
    _stub_invoices(monkeypatch)
    c = _signed_contract(engine, test_ids["account_id"], stages=[("Upfront", 400.0)])
    data = client.post(f"/api/contracts/{c.sign_token}/checkout").json()

    r = client.post(
        "/api/webhooks/zcredit",
        json={
            "SessionId": data["sessionId"],
            "ReferenceNumber": "REF-9",
            "ApprovalNumber": "APP-9",
        },
    )
    assert r.status_code == 200

    with Session(bind=engine) as s:
        invoice = s.query(Invoice).filter_by(provider_doc_id=data["sessionId"]).one()
        assert invoice.status == "paid"
        assert invoice.paid_at is not None
        assert invoice.reference_number == "REF-9"
        assert invoice.approval_number == "APP-9"


def test_public_landing_purchase_is_recorded(client, engine, monkeypatch):
    """A public buyer has no account — without the registry the order left no trace."""
    from app.services.payments.zcredit import service as zcredit_service

    monkeypatch.setattr(
        zcredit_service,
        "create_public_checkout",
        lambda **kwargs: ("session_landing_1", "https://pay.example.com/landing"),
    )

    r = client.post(
        "/api/public/landing-checkout",
        json={"name": "Dana Levi", "email": "dana@example.com"},
    )
    assert r.status_code == 200

    with Session(bind=engine) as s:
        invoice = s.query(Invoice).filter_by(provider_doc_id="session_landing_1").one()
        assert invoice.source_type == "landing"
        assert invoice.account_id is None
        assert invoice.customer_email == "dana@example.com"
        assert invoice.amount == 2400.0
        assert invoice.status == "open"


def test_issue_invoice_is_idempotent_on_doc_id(client, engine):
    from app.services.billing import issue_invoice

    with Session(bind=engine) as s:
        for _ in range(2):
            issue_invoice(
                s,
                source_type="manual",
                source_id=None,
                amount=120.0,
                currency="ils",
                provider_doc_id="doc_same",
            )
        s.commit()
        rows = s.query(Invoice).filter_by(provider_doc_id="doc_same").all()
        assert len(rows) == 1
        assert rows[0].currency == "ILS"


def test_voiding_a_contract_closes_its_open_invoices(client, h_admin, test_ids, engine, monkeypatch):
    """The Z-Credit link survives a void — the registry must at least stop calling it open."""
    _stub_invoices(monkeypatch)
    c = _signed_contract(engine, test_ids["account_id"], stages=[("Upfront", 400.0)])
    data = client.post(f"/api/contracts/{c.sign_token}/checkout").json()

    r = client.post(f"/api/admin/contracts/{c.id}/void", headers=h_admin)
    assert r.status_code == 200

    with Session(bind=engine) as s:
        invoice = s.query(Invoice).filter_by(provider_doc_id=data["sessionId"]).one()
        assert invoice.status == "canceled"


def test_deleting_a_contract_keeps_the_invoice_but_closes_it(
    client, h_admin, test_ids, engine, monkeypatch
):
    """Invoice rows outlive the contract on purpose: they record money that was demanded."""
    _stub_invoices(monkeypatch)
    c = _signed_contract(engine, test_ids["account_id"], stages=[("Upfront", 400.0)])
    data = client.post(f"/api/contracts/{c.sign_token}/checkout").json()

    r = client.delete(f"/api/admin/contracts/{c.id}", headers=h_admin)
    assert r.status_code == 204

    with Session(bind=engine) as s:
        invoice = s.query(Invoice).filter_by(provider_doc_id=data["sessionId"]).one()
        assert invoice.status == "canceled"
        assert invoice.amount == 400.0
        # the stage is gone with the contract, so the line no longer points at one
        assert [line.stage_id for line in invoice.lines] == [None]


def test_paid_invoice_is_not_canceled_by_a_later_void(
    client, h_admin, test_ids, engine, monkeypatch
):
    _stub_invoices(monkeypatch)
    c = _signed_contract(engine, test_ids["account_id"], stages=[("Upfront", 400.0)])
    data = client.post(f"/api/contracts/{c.sign_token}/checkout").json()
    client.post("/api/webhooks/zcredit", json={"SessionId": data["sessionId"], "ReferenceNumber": "R"})

    client.post(f"/api/admin/contracts/{c.id}/void", headers=h_admin)

    with Session(bind=engine) as s:
        assert s.query(Invoice).filter_by(provider_doc_id=data["sessionId"]).one().status == "paid"
