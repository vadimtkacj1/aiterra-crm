"""Z-Credit webhook, mock payment pages, and static policy HTML routes."""

from __future__ import annotations

from sqlalchemy.orm import Session

from app.core.settings import settings
from app.models.billing import AccountBillingInstruction


def test_zcredit_webhook_503_without_secret(client, monkeypatch):
    monkeypatch.setattr(settings, "zcredit_webhook_secret", None)
    r = client.post("/api/webhooks/zcredit", content=b"{}", headers={"Content-Type": "application/json"})
    assert r.status_code == 503
    assert r.json()["detail"] == "zcredit_webhook_not_configured"


def test_zcredit_webhook_400_invalid_json(client, monkeypatch):
    monkeypatch.setattr(settings, "zcredit_webhook_secret", "test_whsec")
    r = client.post(
        "/api/webhooks/zcredit",
        content=b"not-json",
        headers={"Content-Type": "application/json"},
    )
    assert r.status_code == 400
    assert r.json()["detail"] == "invalid_payload"


def test_zcredit_webhook_payment_success_clears_url(client, engine, monkeypatch):
    monkeypatch.setattr(settings, "zcredit_webhook_secret", "test_whsec")

    with Session(bind=engine) as s:
        ins = AccountBillingInstruction(
            account_id=1,
            charge_type="one_time",
            amount=50.0,
            currency="ILS",
            description="Test",
            payment_doc_id="doc_webhook_1",
            payment_url="http://pay.example/mock",
        )
        s.add(ins)
        s.commit()
        doc_id = ins.payment_doc_id

    r = client.post(
        "/api/webhooks/zcredit",
        json={"event": "payment.success", "docId": doc_id},
    )
    assert r.status_code == 200
    assert r.json() == {"received": True}

    with Session(bind=engine) as s:
        row = s.query(AccountBillingInstruction).filter_by(payment_doc_id=doc_id).one()
        assert row.payment_url is None


def test_zcredit_webhook_native_success_payload(client, engine, monkeypatch):
    """Z-Credit CallBackUrl posts ReferenceNumber + SessionId (no synthetic event field)."""
    monkeypatch.setattr(settings, "zcredit_webhook_secret", "test_whsec")

    with Session(bind=engine) as s:
        ins = AccountBillingInstruction(
            account_id=1,
            charge_type="one_time",
            amount=50.0,
            currency="ILS",
            description="Test",
            payment_doc_id="session_native_1",
            payment_url="http://pay.example/zc",
        )
        s.add(ins)
        s.commit()
        sid = ins.payment_doc_id

    r = client.post(
        "/api/webhooks/zcredit",
        json={
            "SessionId": sid,
            "UniqueID": "inv_1_x",
            "ReferenceNumber": "999",
            "ApprovalNumber": "111",
            "Total": 50,
            "Currency": "ILS",
        },
    )
    assert r.status_code == 200

    with Session(bind=engine) as s:
        row = s.query(AccountBillingInstruction).filter_by(payment_doc_id=sid).one()
        assert row.payment_url is None


def test_mock_payment_not_available_when_zcredit_configured(client, monkeypatch):
    monkeypatch.setattr(settings, "zcredit_api_key", "K1")
    r = client.get("/api/mock-payment/any-doc")
    assert r.status_code == 404


def test_mock_payment_page_404_unknown_doc(client, monkeypatch):
    monkeypatch.setattr(settings, "zcredit_terminal_number", None)
    monkeypatch.setattr(settings, "zcredit_api_key", None)
    r = client.get("/api/mock-payment/nonexistent-doc-id")
    assert r.status_code == 404


def test_mock_payment_page_ok_and_confirm(client, engine, monkeypatch):
    monkeypatch.setattr(settings, "zcredit_terminal_number", None)
    monkeypatch.setattr(settings, "zcredit_api_key", None)

    with Session(bind=engine) as s:
        ins = AccountBillingInstruction(
            account_id=1,
            charge_type="one_time",
            amount=120.0,
            currency="ILS",
            description="Mock flow",
            payment_doc_id="doc_mock_flow",
            payment_url="http://localhost/mock",
        )
        s.add(ins)
        s.commit()
        doc = ins.payment_doc_id

    page = client.get(f"/api/mock-payment/{doc}")
    assert page.status_code == 200
    assert "text/html" in page.headers.get("content-type", "")
    assert doc.encode() in page.content or b"doc_mock_flow" in page.content

    conf = client.post(f"/api/mock-payment/{doc}/confirm", json={"success": True})
    assert conf.status_code == 200
    assert conf.json() == {"ok": True, "success": True}

    with Session(bind=engine) as s:
        row = s.query(AccountBillingInstruction).filter_by(payment_doc_id=doc).one()
        assert row.payment_url is None


def test_cancel_policy_html(client):
    r = client.get("/api/cancel-policy")
    assert r.status_code == 200
    assert "text/html" in r.headers.get("content-type", "")
    assert "מדיניות ביטולים".encode("utf-8") in r.content
    assert "חזרה".encode("utf-8") in r.content


def test_cancel_policy_embed_omits_back_link(client):
    r = client.get("/api/cancel-policy?embed=1")
    assert r.status_code == 200
    assert b'class="back"' not in r.content


def test_privacy_policy_html(client):
    r = client.get("/api/privacy-policy")
    assert r.status_code == 200
    assert "text/html" in r.headers.get("content-type", "")
    assert "פרטיות".encode("utf-8") in r.content
