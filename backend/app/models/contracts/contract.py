from __future__ import annotations

import uuid
from datetime import datetime

from sqlalchemy import DateTime, Float, ForeignKey, Integer, String, Text, func
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.session import Base


class Contract(Base):
    """Admin-created contract for an account with payment stages and signature."""

    __tablename__ = "contracts"

    id: Mapped[int] = mapped_column(primary_key=True, autoincrement=True)
    account_id: Mapped[int] = mapped_column(
        ForeignKey("accounts.id", ondelete="CASCADE"), nullable=False, index=True
    )

    title: Mapped[str] = mapped_column(String(500), nullable=False)
    body: Mapped[str] = mapped_column(Text, nullable=False, default="")

    total_amount: Mapped[float] = mapped_column(Float, nullable=False)
    currency: Mapped[str] = mapped_column(String(8), nullable=False, default="ILS")

    # "draft" | "pending_signature" | "signed" | "voided"
    status: Mapped[str] = mapped_column(String(32), nullable=False, default="draft")

    # Link to billing instruction for monthly subscriptions
    billing_instruction_id: Mapped[int | None] = mapped_column(
        ForeignKey("account_billing_instructions.id", ondelete="SET NULL"), nullable=True
    )
    # Monthly subscription amount (if this is a subscription contract)
    monthly_amount: Mapped[float | None] = mapped_column(Float, nullable=True)
    subscription_months: Mapped[int | None] = mapped_column(Integer, nullable=True)

    # Token used in the public signing URL — never changes once created
    sign_token: Mapped[str] = mapped_column(
        String(64), nullable=False, unique=True, default=lambda: uuid.uuid4().hex
    )

    # Optional PDF attachment shown to the client during signing
    pdf_base64: Mapped[str | None] = mapped_column(Text, nullable=True)

    # Populated when client signs
    signature_png_base64: Mapped[str | None] = mapped_column(Text, nullable=True)
    signed_at: Mapped[datetime | None] = mapped_column(
        DateTime(timezone=True), nullable=True
    )
    signer_name: Mapped[str | None] = mapped_column(String(255), nullable=True)
    signer_position: Mapped[str | None] = mapped_column(String(255), nullable=True)
    signed_copy_email: Mapped[str | None] = mapped_column(String(255), nullable=True)

    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), nullable=False
    )
    created_by_admin_id: Mapped[int | None] = mapped_column(
        ForeignKey("users.id", ondelete="SET NULL"), nullable=True
    )

    stages: Mapped[list[ContractPaymentStage]] = relationship(
        "ContractPaymentStage",
        back_populates="contract",
        order_by="ContractPaymentStage.sort_order",
        cascade="all, delete-orphan",
    )


from .contract_payment_stage import ContractPaymentStage  # noqa: E402
