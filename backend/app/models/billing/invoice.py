from __future__ import annotations

from datetime import datetime

from sqlalchemy import DateTime, Float, ForeignKey, Integer, String, Text, func
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.session import Base


class Invoice(Base):
    """
    One issued demand for payment — the single registry every payment source writes to.

    Contract stages, billing instructions and public purchases all point *here*; the
    reverse (an entity holding its own payment_doc_id) is kept only for backward
    compatibility. The webhook resolves a callback with one lookup on provider_doc_id.
    """

    __tablename__ = "invoices"

    id: Mapped[int] = mapped_column(primary_key=True, autoincrement=True)

    # NULL for public purchases made before an account exists. ON DELETE SET NULL:
    # a financial record must survive the deletion of the account it belonged to.
    account_id: Mapped[int | None] = mapped_column(
        ForeignKey("accounts.id", ondelete="SET NULL"), nullable=True, index=True
    )

    # "contract" | "billing_instruction" | "meta_topup" | "landing" | "manual"
    source_type: Mapped[str] = mapped_column(String(32), nullable=False, index=True)
    source_id: Mapped[int | None] = mapped_column(Integer, nullable=True, index=True)

    amount: Mapped[float] = mapped_column(Float, nullable=False)
    currency: Mapped[str] = mapped_column(String(8), nullable=False, default="ILS")
    description: Mapped[str | None] = mapped_column(Text, nullable=True)

    # "open" | "paid" | "superseded" | "canceled"
    status: Mapped[str] = mapped_column(String(20), nullable=False, default="open", index=True)

    provider: Mapped[str] = mapped_column(String(20), nullable=False, default="zcredit")
    provider_doc_id: Mapped[str | None] = mapped_column(String(255), nullable=True, index=True)
    provider_url: Mapped[str | None] = mapped_column(String(2048), nullable=True)

    # Set when a renew issues a replacement. The superseded row keeps its own
    # provider_doc_id, so a payment on the old link still resolves.
    superseded_by_id: Mapped[int | None] = mapped_column(
        ForeignKey("invoices.id", ondelete="SET NULL"), nullable=True
    )

    # Buyer details for sources that have no account (public landing purchase)
    customer_name: Mapped[str | None] = mapped_column(String(200), nullable=True)
    customer_email: Mapped[str | None] = mapped_column(String(255), nullable=True)

    paid_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    reference_number: Mapped[str | None] = mapped_column(String(255), nullable=True)
    approval_number: Mapped[str | None] = mapped_column(String(255), nullable=True)

    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), nullable=False
    )
    created_by_admin_id: Mapped[int | None] = mapped_column(
        ForeignKey("users.id", ondelete="SET NULL"), nullable=True
    )

    lines: Mapped[list[InvoiceLine]] = relationship(
        "InvoiceLine",
        back_populates="invoice",
        cascade="all, delete-orphan",
        order_by="InvoiceLine.sort_order",
    )


class InvoiceLine(Base):
    """One billed item. A combined contract payment is one invoice with several lines."""

    __tablename__ = "invoice_lines"

    id: Mapped[int] = mapped_column(primary_key=True, autoincrement=True)
    invoice_id: Mapped[int] = mapped_column(
        ForeignKey("invoices.id", ondelete="CASCADE"), nullable=False, index=True
    )

    sort_order: Mapped[int] = mapped_column(Integer, nullable=False, default=0)
    description: Mapped[str | None] = mapped_column(Text, nullable=True)
    amount: Mapped[float] = mapped_column(Float, nullable=False)

    # Which contract payment stage this line bills (NULL for non-contract sources)
    stage_id: Mapped[int | None] = mapped_column(
        ForeignKey("contract_payment_stages.id", ondelete="SET NULL"), nullable=True, index=True
    )

    invoice: Mapped[Invoice] = relationship("Invoice", back_populates="lines")
