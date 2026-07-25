"""The payment port and its Z-Credit adapter, plus the decoupling guarantee."""

from __future__ import annotations

from pathlib import Path
from types import SimpleNamespace

import pytest

from app.domain.payments.gateway import (
    CheckoutSession,
    GatewayDoc,
    PaymentGateway,
)
from app.infra.payments.factory import DEFAULT_PROVIDER, get_payment_gateway
from app.infra.payments.zcredit_gateway import ZCreditGateway


def test_factory_returns_the_port_type():
    gw = get_payment_gateway()
    assert isinstance(gw, PaymentGateway)
    assert isinstance(gw, ZCreditGateway)


def test_factory_rejects_unknown_provider(monkeypatch):
    from app.core.settings import settings
    from app.infra.payments import factory

    factory._build.cache_clear()
    monkeypatch.setattr(settings, "payment_provider", "stripe")
    with pytest.raises(ValueError):
        get_payment_gateway()
    factory._build.cache_clear()


def test_checkout_session_unpacks_like_the_legacy_tuple():
    # Callers still do `session_id, url = gateway.create_invoice(...)`.
    s = CheckoutSession("sid", "https://pay")
    session_id, url = s
    assert (session_id, url) == ("sid", "https://pay")
    assert (s.session_id, s.payment_url) == ("sid", "https://pay")


def test_adapter_maps_provider_doc_to_neutral_value_object(monkeypatch):
    from app.services.payments.zcredit import service as zc

    monkeypatch.setattr(
        zc, "try_retrieve_invoice",
        lambda doc_id: SimpleNamespace(id=doc_id, status="paid", amount_paid=1234,
                                       currency="ILS", payment_url=None),
    )
    doc = ZCreditGateway().retrieve_invoice("sess_1")
    assert isinstance(doc, GatewayDoc)
    assert doc.status == "paid" and doc.amount_paid == 1234 and doc.id == "sess_1"


def test_adapter_maps_none_to_none(monkeypatch):
    from app.services.payments.zcredit import service as zc

    monkeypatch.setattr(zc, "try_retrieve_invoice", lambda doc_id: None)
    assert ZCreditGateway().retrieve_invoice("x") is None


def test_create_invoice_returns_a_checkout_session(monkeypatch):
    from app.services.payments.zcredit import service as zc

    monkeypatch.setattr(zc, "create_invoice", lambda *a, **k: ("sid", "https://u"))
    result = ZCreditGateway().create_invoice(
        account=SimpleNamespace(id=1, zcredit_token_id=None), amount_minor=1000,
        currency="ILS", description="x",
    )
    assert isinstance(result, CheckoutSession)
    assert result == ("sid", "https://u")


def test_only_the_adapter_touches_the_concrete_provider():
    """The whole app must depend on the port; only the adapter names zcredit service."""
    app_dir = Path(__file__).resolve().parents[2] / "app"
    offenders: list[str] = []
    allowed = {
        Path("infra") / "payments" / "zcredit_gateway.py",  # the adapter
        Path("services") / "__init__.py",                    # legacy re-export shim
    }
    for path in app_dir.rglob("*.py"):
        rel = path.relative_to(app_dir)
        # the provider package itself is allowed to reference itself
        if rel.parts[:3] == ("services", "payments", "zcredit"):
            continue
        if rel in allowed:
            continue
        text = path.read_text(encoding="utf-8")
        if "zcredit_service" in text or "zcredit.service import" in text:
            offenders.append(str(rel))
    assert not offenders, f"these still call the concrete provider instead of the port: {offenders}"
