from __future__ import annotations

from datetime import datetime

from pydantic import AliasChoices, BaseModel, EmailStr, Field, field_validator, model_validator


class ContractStageIn(BaseModel):
    description: str
    amount: float

    @field_validator("amount")
    @classmethod
    def positive(cls, v: float) -> float:
        if v <= 0:
            raise ValueError("amount must be positive")
        return v


class ContractCreate(BaseModel):
    accountId: int = Field(validation_alias=AliasChoices("accountId", "account_id"))
    title: str
    body: str = ""
    currency: str = "ILS"
    pdfBase64: str | None = Field(
        default=None, validation_alias=AliasChoices("pdfBase64", "pdf_base64")
    )
    stages: list[ContractStageIn] = []
    # Monthly subscription fields
    isSubscription: bool = Field(default=False, validation_alias=AliasChoices("isSubscription", "is_subscription"))
    monthlyAmount: float | None = Field(default=None, validation_alias=AliasChoices("monthlyAmount", "monthly_amount"))
    subscriptionMonths: int | None = Field(default=None, validation_alias=AliasChoices("subscriptionMonths", "subscription_months"))

    @model_validator(mode='after')
    def validate_stages_or_subscription(self):
        # For subscriptions, stages can be empty (backend will generate them)
        if not self.isSubscription and not self.stages:
            raise ValueError("at least one stage required for non-subscription contracts")
        if self.isSubscription and not self.monthlyAmount:
            raise ValueError("monthlyAmount required for subscription contracts")
        return self

    @field_validator("title")
    @classmethod
    def not_empty(cls, v: str) -> str:
        if not v.strip():
            raise ValueError("title must not be empty")
        return v

    @field_validator("monthlyAmount")
    @classmethod
    def monthly_positive(cls, v: float | None) -> float | None:
        if v is not None and v <= 0:
            raise ValueError("monthlyAmount must be positive")
        return v

    @field_validator("subscriptionMonths")
    @classmethod
    def months_valid(cls, v: int | None) -> int | None:
        if v is not None and (v < 1 or v > 60):
            raise ValueError("subscriptionMonths must be between 1 and 60")
        return v


class ContractStageOut(BaseModel):
    id: int
    sortOrder: int
    description: str
    amount: float
    status: str


class ContractOut(BaseModel):
    id: int
    accountId: int
    title: str
    body: str
    totalAmount: float
    currency: str
    status: str
    signToken: str
    signedAt: datetime | None
    signerName: str | None
    signerPosition: str | None = None
    signedCopyEmail: str | None = None
    signaturePngBase64: str | None
    pdfBase64: str | None
    createdAt: datetime
    stages: list[ContractStageOut]
    # Subscription fields
    billingInstructionId: int | None = None
    monthlyAmount: float | None = None
    subscriptionMonths: int | None = None


class ContractPublicOut(BaseModel):
    """Public view — no signToken exposed."""
    id: int
    title: str
    body: str
    totalAmount: float
    currency: str
    status: str
    signedAt: datetime | None
    signerName: str | None
    pdfBase64: str | None
    stages: list[ContractStageOut]


class ContractMemberOut(BaseModel):
    """Account member list view — no body/pdf/signature payloads."""

    id: int
    title: str
    totalAmount: float
    currency: str
    status: str
    signToken: str
    signedAt: datetime | None
    signerName: str | None
    createdAt: datetime
    stages: list[ContractStageOut]
    monthlyAmount: float | None = None
    subscriptionMonths: int | None = None


class ContractSignRequest(BaseModel):
    signerName: str
    signerPosition: str = Field(
        default="", validation_alias=AliasChoices("signerPosition", "signer_position")
    )
    recipientEmail: EmailStr | None = Field(
        default=None, validation_alias=AliasChoices("recipientEmail", "recipient_email")
    )
    signaturePngBase64: str
    locale: str | None = Field(default=None)

    @field_validator("signerName")
    @classmethod
    def name_not_empty(cls, v: str) -> str:
        if not v.strip():
            raise ValueError("signerName must not be empty")
        return v

    @field_validator("signerPosition", mode="before")
    @classmethod
    def position_str(cls, v: object) -> str:
        if v is None:
            return ""
        return str(v).strip()

    @field_validator("signaturePngBase64")
    @classmethod
    def strip_data_url(cls, v: str) -> str:
        if v.startswith("data:"):
            _, _, data = v.partition(",")
            return data
        return v
