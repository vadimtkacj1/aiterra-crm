from sqlalchemy import DateTime, Float, ForeignKey, Integer, String, Text, UniqueConstraint, func
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

    # When set with charge_type "monthly": contract paid in N equal monthly parts (amount = per month).
    installment_months: Mapped[int | None] = mapped_column(Integer, nullable=True)
    installment_total_amount: Mapped[float | None] = mapped_column(Float, nullable=True)

    # Z-Credit payment objects
    payment_doc_id: Mapped[str | None] = mapped_column(String(255), nullable=True)
    payment_url: Mapped[str | None] = mapped_column(String(2048), nullable=True)
    payment_recurring_id: Mapped[str | None] = mapped_column(String(255), nullable=True)
    payment_plan_id: Mapped[str | None] = mapped_column(String(255), nullable=True)

    # Day of month (1–28) on which the daily billing job charges this subscription.
    # NULL means the job never matches this row — the account is never auto-charged.
    billing_day: Mapped[int | None] = mapped_column(Integer, nullable=True)

    # Day of week (0=Mon … 6=Sun) for weekly billing schedule. When set, billing_day is ignored.
    billing_week_day: Mapped[int | None] = mapped_column(Integer, nullable=True)

    # TEST MODE: when set, a separate minute-interval job charges every N minutes instead of monthly.
    # Only active when SUBSCRIPTION_BILLING_TEST_ENABLED=true in env.
    test_interval_minutes: Mapped[int | None] = mapped_column(Integer, nullable=True)

    # Synced from Z-Credit webhooks
    subscription_status: Mapped[str | None] = mapped_column(String(32), nullable=True)

    created_at: Mapped[str] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), nullable=False
    )
    created_by_admin_id: Mapped[int | None] = mapped_column(
        ForeignKey("users.id", ondelete="SET NULL"), nullable=True
    )
