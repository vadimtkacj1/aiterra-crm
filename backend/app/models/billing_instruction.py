from sqlalchemy import DateTime, Float, ForeignKey, String, Text, UniqueConstraint, func
from sqlalchemy.orm import Mapped, mapped_column

from app.db.session import Base


class AccountBillingInstruction(Base):
    """
    Admin-defined billing instruction for an account.
    Exactly one row per account (upserted).

    charge_type:
      - "none"     → no active charge
      - "one_time" → a Z-Credit payment page is created; user pays via hosted link
      - "monthly"  → a Z-Credit recurring billing is created; recurring monthly charge
    """

    __tablename__ = "account_billing_instructions"
    __table_args__ = (UniqueConstraint("account_id", name="uq_billing_instruction_account"),)

    id: Mapped[int] = mapped_column(primary_key=True, autoincrement=True)
    account_id: Mapped[int] = mapped_column(
        ForeignKey("accounts.id", ondelete="CASCADE"), nullable=False, index=True
    )

    # "none" | "one_time" | "monthly"
    charge_type: Mapped[str] = mapped_column(String(20), nullable=False, default="none")

    amount: Mapped[float | None] = mapped_column(Float, nullable=True)
    currency: Mapped[str] = mapped_column(String(8), nullable=False, default="ILS")
    description: Mapped[str | None] = mapped_column(Text, nullable=True)

    # JSON array: [{"code":"server","label":"Server","amount":99.0}, ...]
    line_items_json: Mapped[str | None] = mapped_column(Text, nullable=True)

    # Z-Credit payment objects
    payment_doc_id: Mapped[str | None] = mapped_column(String(255), nullable=True)
    payment_url: Mapped[str | None] = mapped_column(String(2048), nullable=True)
    payment_recurring_id: Mapped[str | None] = mapped_column(String(255), nullable=True)
    payment_plan_id: Mapped[str | None] = mapped_column(String(255), nullable=True)

    # Synced from Z-Credit webhooks
    subscription_status: Mapped[str | None] = mapped_column(String(32), nullable=True)

    created_at: Mapped[str] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), nullable=False
    )
    created_by_admin_id: Mapped[int | None] = mapped_column(
        ForeignKey("users.id", ondelete="SET NULL"), nullable=True
    )
