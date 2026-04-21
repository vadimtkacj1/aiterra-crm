from sqlalchemy import DateTime, Float, ForeignKey, String, Text, func
from sqlalchemy.orm import Mapped, mapped_column

from app.db.session import Base


class BillingInstructionHistory(Base):
    """
    Append-only log of admin-created Z-Credit payments / recurring billings per account.
    `record_status`: active → still the intended charge; superseded → replaced by a newer rule; revoked → voided/cancelled by admin.
    """

    __tablename__ = "billing_instruction_history"

    id: Mapped[int] = mapped_column(primary_key=True, autoincrement=True)
    account_id: Mapped[int] = mapped_column(
        ForeignKey("accounts.id", ondelete="CASCADE"), nullable=False, index=True
    )
    charge_type: Mapped[str] = mapped_column(String(20), nullable=False)
    amount: Mapped[float | None] = mapped_column(Float, nullable=True)
    currency: Mapped[str] = mapped_column(String(8), nullable=False, default="ILS")
    description: Mapped[str | None] = mapped_column(Text, nullable=True)
    line_items_json: Mapped[str | None] = mapped_column(Text, nullable=True)

    # Z-Credit payment identifiers
    payment_doc_id: Mapped[str | None] = mapped_column(String(255), nullable=True)
    payment_url: Mapped[str | None] = mapped_column(String(2048), nullable=True)
    payment_recurring_id: Mapped[str | None] = mapped_column(String(255), nullable=True)

    record_status: Mapped[str] = mapped_column(String(20), nullable=False, default="active")

    created_at: Mapped[str] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), nullable=False
    )
    closed_at: Mapped[str | None] = mapped_column(DateTime(timezone=True), nullable=True)
    created_by_admin_id: Mapped[int | None] = mapped_column(
        ForeignKey("users.id", ondelete="SET NULL"), nullable=True
    )
