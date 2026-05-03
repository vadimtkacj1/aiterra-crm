"""Unit tests: Z-Credit mock mode and HTTP integration paths."""

from unittest.mock import patch

import pytest
from fastapi import HTTPException

from app.models.core import Account
from app.services import zcredit_service as zc


def test_create_invoice_returns_mock_when_not_configured():
    with patch.object(zc, "_is_webcheckout_configured", return_value=False):
        doc_id, pay_url = zc.create_invoice(Account(id=3), 12_345, "ILS", "Test invoice")
    assert pay_url.startswith("/api/mock-payment/")
    assert doc_id.startswith("mock_inv_3_")


def test_create_invoice_parses_session_from_http():
    fake_resp = {
        "HasError": False,
        "Data": {
            "HasError": False,
            "ReturnCode": 0,
            "SessionId": "sess_abc",
            "SessionUrl": "https://pci.zcredit.co.il/pay/test",
        },
    }
    with (
        patch.object(zc, "_is_webcheckout_configured", return_value=True),
        patch.object(zc, "_post_json", return_value=fake_resp),
    ):
        doc_id, pay_url = zc.create_invoice(Account(id=1), 100, "ILS", "x")
    assert doc_id == "sess_abc"
    assert pay_url.startswith("https://")


def test_pay_open_invoice_requires_gateway_configuration():
    with pytest.raises(HTTPException) as exc:
        zc.pay_open_invoice("doc", "tok", amount_major=10.0)
    assert exc.value.status_code == 503
    assert exc.value.detail == "zcredit_gateway_not_configured"
