"""The payment callback is public and unsigned — these cover what stops abuse of it."""

from __future__ import annotations

from types import SimpleNamespace

from sqlalchemy.orm import Session

from app.core.settings import settings
from app.models.billing import AccountBillingInstruction, SavedCard
from app.models.contracts import Contract, ContractPaymentStage


def _live_gateway(monkeypatch, *, confirms: bool):
    """Pretend Z-Credit is configured; control what it answers about a session."""
    from app.services.payments.zcredit import service as zcredit_service

    monkeypatch.setattr(settings, "zcredit_api_key", "live_key")
    monkeypatch.setattr(
        zcredit_service,
        "try_retrieve_invoice",
        lambda doc_id: (
            SimpleNamespace(status="paid", amount_paid=0, currency="ILS", payment_url=None)
            if confirms
            else SimpleNamespace(status="open", amount_paid=0, currency="ILS", payment_url=None)
        ),
    )


def _contract_with_stage(engine, account_id: int, **stage_kwargs) -> int:
    with Session(bind=engine) as s:
        c = Contract(
            account_id=account_id,
            title="Signed work",
            total_amount=500.0,
            currency="ILS",
            status="signed",
            created_by_admin_id=1,
        )
        s.add(c)
        s.flush()
        fields = dict(
            contract_id=c.id, sort_order=0, description="Upfront", amount=500.0,
            kind="one_time", status="invoiced", payment_doc_id="sess_x",
        )
        fields.update(stage_kwargs)
        stage = ContractPaymentStage(**fields)
        s.add(stage)
        s.commit()
        return stage.id


def test_forged_callback_cannot_mark_a_contract_paid(client, test_ids, engine, monkeypatch):
    """Anyone can read a SessionId from the pay page; the gateway is the only authority."""
    _live_gateway(monkeypatch, confirms=False)
    stage_id = _contract_with_stage(engine, test_ids["account_id"])

    r = client.post(
        "/api/webhooks/zcredit",
        json={"SessionId": "sess_x", "ReferenceNumber": "1", "ApprovalNumber": "1"},
    )
    assert r.status_code == 200  # acknowledged, but not applied

    with Session(bind=engine) as s:
        assert s.query(ContractPaymentStage).filter_by(id=stage_id).one().status == "invoiced"


def test_confirmed_callback_is_applied(client, test_ids, engine, monkeypatch):
    _live_gateway(monkeypatch, confirms=True)
    stage_id = _contract_with_stage(engine, test_ids["account_id"])

    r = client.post("/api/webhooks/zcredit", json={"SessionId": "sess_x", "ReferenceNumber": "1"})
    assert r.status_code == 200

    with Session(bind=engine) as s:
        assert s.query(ContractPaymentStage).filter_by(id=stage_id).one().status == "paid"


def test_declined_payment_is_not_treated_as_success(client, test_ids, engine, monkeypatch):
    """A declined card still carries a ReferenceNumber."""
    from app.services.payments.zcredit.webhook import resolve_event_type

    assert resolve_event_type({"TransactionSuccess": False, "ReferenceNumber": "123"}) == "payment.failed"
    assert resolve_event_type({"HasError": True, "ReferenceNumber": "123"}) == "payment.failed"
    assert resolve_event_type({"Data": {"ReturnCode": 7}, "ReferenceNumber": "1"}) == "payment.failed"
    assert resolve_event_type({"TransactionSuccess": True, "ReferenceNumber": "1"}) == "payment.success"

    stage_id = _contract_with_stage(engine, test_ids["account_id"])
    r = client.post(
        "/api/webhooks/zcredit",
        json={"SessionId": "sess_x", "TransactionSuccess": False, "ReferenceNumber": "123"},
    )
    assert r.status_code == 200

    with Session(bind=engine) as s:
        assert s.query(ContractPaymentStage).filter_by(id=stage_id).one().status == "invoiced"


def test_paying_a_one_time_stage_does_not_replace_the_account_card(
    client, test_ids, engine, monkeypatch
):
    """Whoever settles a fee must not redirect every future recurring charge to their card."""
    _live_gateway(monkeypatch, confirms=True)
    with Session(bind=engine) as s:
        s.add(SavedCard(
            account_id=test_ids["account_id"], holder_name="Owner", last4="1111",
            exp_month=12, exp_year=2030, zcredit_token="owner_token",
        ))
        s.commit()
    _contract_with_stage(engine, test_ids["account_id"], kind="one_time")

    client.post(
        "/api/webhooks/zcredit",
        json={"SessionId": "sess_x", "ReferenceNumber": "1", "Token": "stranger_token",
              "CardNumber": "4242424242424242", "CardName": "Office Manager"},
    )

    with Session(bind=engine) as s:
        card = s.query(SavedCard).filter_by(account_id=test_ids["account_id"]).one()
        assert card.zcredit_token == "owner_token"


def test_paying_the_subscription_stage_does_save_the_card(client, test_ids, engine, monkeypatch):
    _live_gateway(monkeypatch, confirms=True)
    _contract_with_stage(engine, test_ids["account_id"], kind="subscription")

    client.post(
        "/api/webhooks/zcredit",
        json={"SessionId": "sess_x", "ReferenceNumber": "1", "Token": "payer_token",
              "CardNumber": "4242424242424242", "CardName": "Owner"},
    )

    with Session(bind=engine) as s:
        card = s.query(SavedCard).filter_by(account_id=test_ids["account_id"]).one_or_none()
        assert card is not None and card.zcredit_token == "payer_token"


def test_unverifiable_payment_answers_5xx_so_the_gateway_retries(client, test_ids, engine, monkeypatch):
    """A verification that cannot run must retry, never silently drop a real payment."""
    from app.services.payments.zcredit import service as zcredit_service

    monkeypatch.setattr(settings, "zcredit_api_key", "live_key")
    monkeypatch.setattr(zcredit_service, "try_retrieve_invoice", lambda doc_id: None)

    stage_id = _contract_with_stage(engine, test_ids["account_id"])
    r = client.post("/api/webhooks/zcredit", json={"SessionId": "sess_x", "ReferenceNumber": "1"})
    assert r.status_code == 500

    with Session(bind=engine) as s:
        assert s.query(ContractPaymentStage).filter_by(id=stage_id).one().status == "invoiced"


def test_internal_failure_answers_5xx_so_the_gateway_retries(client, engine, monkeypatch):
    """Acknowledging a callback we failed to apply loses the payment for good."""
    from app.services.payments.zcredit import webhook as webhook_module

    def _boom(*_a, **_k):
        raise RuntimeError("database down")

    monkeypatch.setattr(webhook_module, "_record_registry_payment", _boom)

    r = client.post("/api/webhooks/zcredit", json={"SessionId": "sess_y", "ReferenceNumber": "1"})
    assert r.status_code == 500
    assert r.json()["detail"] == "webhook_processing_failed"


def test_callback_body_is_not_logged(client, engine, monkeypatch, caplog):
    """The body carries the card token that authorises future charges."""
    import logging

    caplog.set_level(logging.INFO)
    client.post(
        "/api/webhooks/zcredit",
        json={"SessionId": "sess_z", "ReferenceNumber": "9", "Token": "SECRET_CARD_TOKEN"},
    )
    assert "SECRET_CARD_TOKEN" not in caplog.text


def test_saved_card_payment_closes_the_demand(client, h_member, test_ids, engine, monkeypatch):
    """Charging the saved card left the demand open — a second click charged again."""
    from app.models.billing import SubscriptionPayment
    # The gateway adapter delegates to this service module — patch it there and every
    # caller (route, adapter, port) sees the stub.
    from app.services.payments.zcredit import service as zc

    monkeypatch.setattr(settings, "zcredit_api_key", "live_key")
    monkeypatch.setattr(
        zc, "try_retrieve_invoice",
        lambda doc_id: SimpleNamespace(id=doc_id, status="open", amount_paid=0, currency="ILS", payment_url=None),
    )
    monkeypatch.setattr(
        zc, "pay_open_invoice",
        lambda *a, **k: SimpleNamespace(id="ref_1", status="paid", amount_paid=100000,
                                        currency="ILS", payment_url=None),
    )

    with Session(bind=engine) as s:
        s.add(AccountBillingInstruction(
            account_id=test_ids["account_id"], charge_type="one_time", amount=1000.0,
            currency="ILS", description="Website", payment_doc_id="doc_open",
            payment_url="https://pay.example/doc_open",
        ))
        s.add(SavedCard(
            account_id=test_ids["account_id"], holder_name="Owner", last4="1111",
            exp_month=12, exp_year=2030, zcredit_token="tok",
        ))
        s.commit()

    r = client.post(f"/api/accounts/{test_ids['account_id']}/billing/pay-invoice", headers=h_member)
    assert r.status_code == 200

    with Session(bind=engine) as s:
        instruction = s.query(AccountBillingInstruction).filter_by(
            account_id=test_ids["account_id"]
        ).one()
        assert instruction.payment_url is None
        assert s.query(SubscriptionPayment).filter_by(
            billing_instruction_id=instruction.id
        ).count() == 1
