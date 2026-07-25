from __future__ import annotations

from datetime import datetime

from sqlalchemy import DateTime, Float, ForeignKey, Integer, String, Text
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.session import Base


class ContractPaymentStage(Base):
    """One payment stage within a contract (e.g. 50% upfront, 50% on delivery)."""

    __tablename__ = "contract_payment_stages"

    id: Mapped[int] = mapped_column(primary_key=True, autoincrement=True)
    contract_id: Mapped[int] = mapped_column(
        ForeignKey("contracts.id", ondelete="CASCADE"), nullable=False, index=True
    )

    sort_order: Mapped[int] = mapped_column(Integer, nullable=False, default=0)
    description: Mapped[str] = mapped_column(Text, nullable=False)
    amount: Mapped[float] = mapped_column(Float, nullable=False)

    # "subscription" — paying this stage activates recurring billing;
    # "one_time" — a plain instalment or fee. Explicit because the payment side used to
    # infer it from sort_order == 0, which silently broke if stages were reordered.
    kind: Mapped[str] = mapped_column(String(20), nullable=False, default="one_time")

    # "pending" | "invoiced" | "paid"
    status: Mapped[str] = mapped_column(String(32), nullable=False, default="pending")

    # Z-Credit session ID set when checkout is created; used to match webhook callback
    payment_doc_id: Mapped[str | None] = mapped_column(String(255), nullable=True, index=True)

    # Hosted payment page for payment_doc_id — kept so a repeated checkout call reuses
    # the open invoice instead of opening a second one for the same stage.
    payment_url: Mapped[str | None] = mapped_column(String(2048), nullable=True)

    # Comma-separated doc IDs replaced by an explicit renew. Z-Credit has no void API,
    # so old links stay payable; the webhook matches these too and the payment is not lost.
    superseded_doc_ids: Mapped[str | None] = mapped_column(Text, nullable=True)

    # Timestamp when Z-Credit confirmed payment
    paid_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)

    contract: Mapped[Contract] = relationship("Contract", back_populates="stages")


from .contract import Contract  # noqa: E402
