import json
from typing import Literal

from pydantic import AliasChoices, BaseModel, ConfigDict, Field, model_validator


def monthly_amount_for_installment_plan(total: float, months: int) -> float:
    """Equal recurring charge per month in major currency units (two decimals)."""
    if months < 2:
        raise ValueError("installment_months_invalid")
    return round(float(total) / float(months), 2)


class PaymentRecord(BaseModel):
    id: str
    date: str
    amount: float
    currency: str
    description: str
    status: str


class SubscriptionRecord(BaseModel):
    id: str
    planName: str
    status: str
    renewsAt: str
    amount: float
    currency: str
    """When set, `amount` is the monthly installment and this is the full contract total."""
    installmentTotalAmount: float | None = None
    installmentMonths: int | None = None


class BillingLineItemOut(BaseModel):
    """Single priced line on an admin-defined charge (shown to the customer)."""

    code: str = ""
    label: str
    amount: float


def parse_stored_line_items(raw: str | None) -> list[BillingLineItemOut] | None:
    """Decode DB JSON for account_billing_instructions.line_items_json."""
    if not raw or not str(raw).strip():
        return None
    try:
        data = json.loads(raw)
        if not isinstance(data, list):
            return None
        out: list[BillingLineItemOut] = []
        for item in data:
            if not isinstance(item, dict):
                continue
            try:
                amt = float(item.get("amount", 0) or 0)
            except (TypeError, ValueError):
                amt = 0.0
            out.append(
                BillingLineItemOut(
                    code=str(item.get("code", "") or ""),
                    label=str(item.get("label", "") or "—"),
                    amount=amt,
                )
            )
        return out or None
    except (json.JSONDecodeError, TypeError, ValueError):
        return None


class PendingPaymentAction(BaseModel):
    id: str
    flow: str  # "one_time" | "monthly"
    amount: float
    currency: str
    summary: str
    payUrl: str | None = None
    lineItems: list[BillingLineItemOut] | None = None
    installmentTotalAmount: float | None = None
    installmentMonths: int | None = None
    """True when payment doc is open and the account has a saved Z-Credit token — user can pay in-app."""
    payWithSavedCardAvailable: bool = False


class PayInvoiceResponse(BaseModel):
    status: str
    hostedInvoiceUrl: str | None = None


class BillingOverview(BaseModel):
    payments: list[PaymentRecord]
    subscriptions: list[SubscriptionRecord]
    offers: list[dict] = []
    pendingPayments: list[PendingPaymentAction] | None = None
    billingPortalAvailable: bool = False  # always False — Z-Credit has no customer portal


# ── Admin: billing instruction ────────────────────────────────────────────────

class BillingLineItemIn(BaseModel):
    code: str = Field(default="", max_length=64)
    label: str = Field(..., min_length=1, max_length=200)
    amount: float = Field(..., gt=0)


class BillingInstructionOut(BaseModel):
    chargeType: str  # "none" | "one_time" | "monthly"
    amount: float | None
    currency: str
    description: str | None
    lineItems: list[BillingLineItemOut] | None = None
    paymentUrl: str | None = None
    installmentMonths: int | None = None
    installmentTotalAmount: float | None = None
    billingDay: int | None = None
    billingWeekDay: int | None = None
    testIntervalMinutes: int | None = None


class BillingInstructionIn(BaseModel):
    chargeType: str = Field(..., pattern="^(none|one_time|monthly)$")
    amount: float | None = None
    currency: str = Field(default="ILS", max_length=8)
    description: str | None = Field(default=None, max_length=500)
    lineItems: list[BillingLineItemIn] | None = None
    """Split a total contract across N equal monthly charges (monthly only; no line items)."""
    splitAcrossMonths: int | None = Field(default=None, ge=2, le=60)
    """Day of month (1–28) on which to charge. Monthly only."""
    billingDay: int | None = Field(default=None, ge=1, le=28)
    """Day of week (0=Mon … 6=Sun) for weekly billing. Monthly charge_type only."""
    billingWeekDay: int | None = Field(default=None, ge=0, le=6)
    """Charge every N minutes (test mode). Monthly charge_type only."""
    testIntervalMinutes: int | None = Field(default=None, ge=1, le=1440)

    @model_validator(mode="after")
    def line_items_sum_matches_amount(self) -> "BillingInstructionIn":
        if self.chargeType == "none":
            return self
        if self.amount is None or self.amount <= 0:
            raise ValueError("amount required when charge type is not none")
        if self.billingDay is not None and self.chargeType != "monthly":
            raise ValueError("billing_day_only_for_monthly")
        if self.billingWeekDay is not None and self.chargeType != "monthly":
            raise ValueError("billing_week_day_only_for_monthly")
        if self.testIntervalMinutes is not None and self.chargeType != "monthly":
            raise ValueError("test_interval_only_for_monthly")
        if self.splitAcrossMonths is not None:
            if self.chargeType != "monthly":
                raise ValueError("split_across_months_only_for_monthly")
            if self.lineItems:
                raise ValueError("split_installments_no_line_items")
            return self
        if self.lineItems:
            total = round(sum(li.amount for li in self.lineItems), 2)
            target = round(float(self.amount), 2)
            if abs(total - target) > 0.02:
                raise ValueError("line_items_sum_must_equal_amount")
        return self


class InvoiceTemplateCreate(BaseModel):
    """Reusable invoice (no Z-Credit call until applied to an account)."""

    title: str | None = Field(default=None, max_length=200)
    chargeType: str = Field(..., pattern="^(one_time|monthly)$")
    amount: float = Field(..., gt=0)
    currency: str = Field(default="ILS", max_length=8)
    description: str | None = Field(default=None, max_length=500)
    lineItems: list[BillingLineItemIn] | None = None
    splitAcrossMonths: int | None = Field(default=None, ge=2, le=60)
    billingDay: int | None = Field(default=None, ge=1, le=28)

    @model_validator(mode="after")
    def line_items_sum_matches_amount(self) -> "InvoiceTemplateCreate":
        if self.billingDay is not None and self.chargeType != "monthly":
            raise ValueError("billing_day_only_for_monthly")
        if self.splitAcrossMonths is not None:
            if self.chargeType != "monthly":
                raise ValueError("split_across_months_only_for_monthly")
            if self.lineItems:
                raise ValueError("split_installments_no_line_items")
            return self
        if self.lineItems:
            total = round(sum(li.amount for li in self.lineItems), 2)
            target = round(float(self.amount), 2)
            if abs(total - target) > 0.02:
                raise ValueError("line_items_sum_must_equal_amount")
        return self


class InvoiceTemplateOut(BaseModel):
    id: int
    title: str | None
    chargeType: str
    amount: float
    currency: str
    description: str | None
    lineItems: list[BillingLineItemOut] | None = None
    createdAt: str
    installmentMonths: int | None = None
    billingDay: int | None = None


class BillingHistoryOut(BaseModel):
    """Admin-visible log row for client invoices / subscriptions."""

    id: int
    chargeType: str
    amount: float | None
    currency: str
    description: str | None
    lineItems: list[BillingLineItemOut] | None = None
    installmentMonths: int | None = None
    installmentTotalAmount: float | None = None
    paymentDocId: str | None = None
    paymentUrl: str | None = None
    paymentRecurringId: str | None = None
    recordStatus: str
    paymentDocStatus: str | None = None
    paymentRecurringStatus: str | None = None
    """paid | unpaid | voided | cancelled | superseded | ongoing | unknown — derived for admin UI."""
    paymentStatus: str
    createdAt: str
    closedAt: str | None = None
    isCurrent: bool = False
    billingDay: int | None = None
    billingWeekDay: int | None = None


class BillingHistoryWithAccountOut(BillingHistoryOut):
    """Same as BillingHistoryOut plus business context for the global admin list."""

    accountId: int
    accountName: str = ""
    ownerEmail: str | None = None


# ── Checkout contract signature ───────────────────────────────────────────────


class ContractAcceptanceRequest(BaseModel):
    paymentActionId: str = Field(..., min_length=1, max_length=255)
    signaturePngBase64: str = Field(
        ...,
        min_length=32,
        description="PNG image as data URL or raw base64",
    )


class ContractAcceptanceResponse(BaseModel):
    id: int
    createdAt: str


# ── Saved card / Z-Credit token ───────────────────────────────────────────────

class SaveCardRequest(BaseModel):
    """Save a Z-Credit token as the account's default payment method."""
    model_config = ConfigDict(populate_by_name=True)

    zcreditToken: str = Field(
        ...,
        min_length=1,
        max_length=200,
        description="Z-Credit token received after a successful payment or card registration",
    )
    holderName: str | None = Field(default=None, max_length=200)


class CardInfo(BaseModel):
    holderName: str
    last4: str
    brand: str
    expMonth: int
    expYear: int


# ── Admin: Meta top-up ───────────────────────────────────────────────────────

class MetaTopupRequest(BaseModel):
    accountId: int
    amount: float = Field(..., gt=0)
    currency: str = Field(default="USD", max_length=8)


class MetaTopupRecord(BaseModel):
    id: int
    accountId: int
    amount: float
    currency: str
    status: str
    metaError: str | None
    createdAt: str
