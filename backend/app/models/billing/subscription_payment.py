from datetime import datetime

from sqlalchemy import DateTime, Float, ForeignKey, Integer, String, func
from sqlalchemy.orm import Mapped, mapped_column

from app.db.session import Base


class SubscriptionPayment(Base):
    """
    Tracks individual monthly payments for subscription contracts.
    Created automatically when Z-Credit webhook confirms a recurring payment.
    """

    __tablename__ = "subscription_payments"

    id: Mapped[int] = mapped_column(primary_key=True, autoincrement=True)

    # Link to the billing instruction (recurring subscription)
    billing_instruction_id: Mapped[int] = mapped_column(
        ForeignKey("account_billing_instructions.id", ondelete="CASCADE"), nullable=False, index=True
    )

    # Link to the contract (if this subscription is from a contract)
    contract_id: Mapped[int | None] = mapped_column(
        ForeignKey("contracts.id", ondelete="SET NULL"), nullable=True, index=True
    )

    # Payment details
    amount: Mapped[float] = mapped_column(Float, nullable=False)
    currency: Mapped[str] = mapped_column(String(8), nullable=False, default="ILS")

    # Payment number in the subscription sequence (1, 2, 3, ...)
    payment_number: Mapped[int] = mapped_column(Integer, nullable=False)

    # Status: "success" | "failed" | "pending"
    status: Mapped[str] = mapped_column(String(20), nullable=False, default="success")

    # Z-Credit transaction details
    zcredit_transaction_id: Mapped[str | None] = mapped_column(String(255), nullable=True)
    zcredit_approval_number: Mapped[str | None] = mapped_column(String(255), nullable=True)

    # When the payment was processed
    paid_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), nullable=False
    )

    # Expected payment date (for tracking if payment is late)
    expected_date: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
