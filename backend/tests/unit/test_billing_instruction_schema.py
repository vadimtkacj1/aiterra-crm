"""Unit tests: Pydantic billing instruction / template schemas."""

import pytest
from pydantic import ValidationError

from app.schemas.billing import (
    BillingInstructionIn,
    InvoiceTemplateCreate,
    monthly_amount_for_installment_plan,
)


def test_monthly_installment_plan_math():
    assert monthly_amount_for_installment_plan(2000.0, 4) == 500.0
    assert monthly_amount_for_installment_plan(100.0, 3) == pytest.approx(33.33, rel=1e-3)


def test_split_monthly_requires_monthly_charge():
    with pytest.raises(ValidationError) as exc:
        BillingInstructionIn(
            chargeType="one_time",
            amount=100.0,
            splitAcrossMonths=4,
        )
    assert "split_across_months_only_for_monthly" in str(exc.value)


def test_split_installments_disallows_lines():
    with pytest.raises(ValidationError) as exc:
        BillingInstructionIn(
            chargeType="monthly",
            amount=2000.0,
            splitAcrossMonths=4,
            lineItems=[
                {"code": "", "label": "A", "amount": 1000.0},
                {"code": "", "label": "B", "amount": 1000.0},
            ],
        )
    assert "split_installments_no_line_items" in str(exc.value)


def test_normal_monthly_with_lines_sum():
    m = BillingInstructionIn(
        chargeType="monthly",
        amount=150.0,
        lineItems=[
            {"code": "", "label": "A", "amount": 50.0},
            {"code": "", "label": "B", "amount": 100.0},
        ],
    )
    assert m.amount == 150.0


def test_billing_instruction_none_allows_null_amount():
    m = BillingInstructionIn(chargeType="none", amount=None)
    assert m.chargeType == "none"
    assert m.amount is None


def test_billing_instruction_line_sum_mismatch():
    with pytest.raises(ValidationError) as exc:
        BillingInstructionIn(
            chargeType="one_time",
            amount=100.0,
            lineItems=[{"code": "", "label": "A", "amount": 40.0}],
        )
    assert "line_items_sum_must_equal_amount" in str(exc.value)


def test_invoice_template_split_rejects_one_time():
    with pytest.raises(ValidationError) as exc:
        InvoiceTemplateCreate(
            chargeType="one_time",
            amount=100.0,
            splitAcrossMonths=3,
        )
    assert "split_across_months_only_for_monthly" in str(exc.value)


def test_invoice_template_monthly_split_ok():
    t = InvoiceTemplateCreate(chargeType="monthly", amount=900.0, splitAcrossMonths=3)
    assert t.splitAcrossMonths == 3
    assert t.amount == 900.0
