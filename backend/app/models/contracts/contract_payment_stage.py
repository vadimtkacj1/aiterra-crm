from __future__ import annotations

from sqlalchemy import Float, ForeignKey, Integer, String, Text
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

    # "pending" | "invoiced" | "paid"
    status: Mapped[str] = mapped_column(String(32), nullable=False, default="pending")

    contract: Mapped[Contract] = relationship("Contract", back_populates="stages")


from .contract import Contract  # noqa: E402
