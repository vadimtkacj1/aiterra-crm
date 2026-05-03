from __future__ import annotations

from datetime import datetime

from pydantic import AliasChoices, BaseModel, Field, field_validator


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
    stages: list[ContractStageIn]

    @field_validator("stages")
    @classmethod
    def at_least_one(cls, v: list[ContractStageIn]) -> list[ContractStageIn]:
        if not v:
            raise ValueError("at least one stage required")
        return v

    @field_validator("title")
    @classmethod
    def not_empty(cls, v: str) -> str:
        if not v.strip():
            raise ValueError("title must not be empty")
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
    signaturePngBase64: str | None
    pdfBase64: str | None
    createdAt: datetime
    stages: list[ContractStageOut]


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


class ContractSignRequest(BaseModel):
    signerName: str
    signaturePngBase64: str

    @field_validator("signerName")
    @classmethod
    def name_not_empty(cls, v: str) -> str:
        if not v.strip():
            raise ValueError("signerName must not be empty")
        return v

    @field_validator("signaturePngBase64")
    @classmethod
    def strip_data_url(cls, v: str) -> str:
        if v.startswith("data:"):
            _, _, data = v.partition(",")
            return data
        return v
