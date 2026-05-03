"""Unit tests: billing JSON helpers (no DB, no HTTP)."""

import json

import pytest

from app.schemas.billing import monthly_amount_for_installment_plan, parse_stored_line_items


def test_parse_stored_line_items_none_and_empty():
    assert parse_stored_line_items(None) is None
    assert parse_stored_line_items("") is None
    assert parse_stored_line_items("   ") is None


def test_parse_stored_line_items_valid():
    raw = json.dumps(
        [
            {"code": "a", "label": "Line A", "amount": 10.5},
            {"label": "Line B", "amount": "20"},
        ]
    )
    out = parse_stored_line_items(raw)
    assert out is not None
    assert len(out) == 2
    assert out[0].code == "a"
    assert out[0].label == "Line A"
    assert out[0].amount == 10.5
    assert out[1].amount == 20.0


def test_parse_stored_line_items_skips_non_dict_and_invalid_amount():
    raw = json.dumps([{"label": "ok", "amount": 1}, "skip", {"label": "bad", "amount": "x"}])
    out = parse_stored_line_items(raw)
    assert out is not None
    assert len(out) == 2
    assert out[0].label == "ok"
    assert out[1].amount == 0.0


def test_parse_stored_line_items_not_list_returns_none():
    assert parse_stored_line_items(json.dumps({"a": 1})) is None


def test_parse_stored_line_items_invalid_json_returns_none():
    assert parse_stored_line_items("{not json") is None


def test_parse_stored_line_items_empty_list_returns_none():
    assert parse_stored_line_items("[]") is None


def test_monthly_amount_installment_invalid_months():
    with pytest.raises(ValueError, match="installment_months_invalid"):
        monthly_amount_for_installment_plan(100.0, 1)
