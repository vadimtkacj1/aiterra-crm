"""Unit tests: small helpers on accounts routes module."""

from app.api.routes.accounts.routes import _strip_data_url_base64


def test_strip_data_url_base64_raw():
    assert _strip_data_url_base64("  YWJjZGVm  ") == "YWJjZGVm"


def test_strip_data_url_base64_png_prefix():
    raw = "data:image/png;base64,QUJDREVGR0g="
    assert _strip_data_url_base64(raw) == "QUJDREVGR0g="
