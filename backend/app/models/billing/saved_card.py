from sqlalchemy import ForeignKey, Integer, String, UniqueConstraint
from sqlalchemy.orm import Mapped, mapped_column

from app.db.session import Base


class SavedCard(Base):
    """One saved payment card per account (last-4 + metadata only — never raw PAN)."""

    __tablename__ = "saved_cards"
    __table_args__ = (UniqueConstraint("account_id", name="uq_saved_card_account"),)

    id: Mapped[int] = mapped_column(primary_key=True, autoincrement=True)
    account_id: Mapped[int] = mapped_column(
        ForeignKey("accounts.id", ondelete="CASCADE"), nullable=False, index=True
    )

    holder_name: Mapped[str] = mapped_column(String(200), nullable=False)
    last4: Mapped[str] = mapped_column(String(4), nullable=False)
    brand: Mapped[str] = mapped_column(String(32), nullable=False, default="unknown")
    exp_month: Mapped[int] = mapped_column(Integer, nullable=False)
    exp_year: Mapped[int] = mapped_column(Integer, nullable=False)

    # Z-Credit identifiers (card tokenization)
    zcredit_token_id: Mapped[str | None] = mapped_column(String(255), nullable=True)
    zcredit_token: Mapped[str | None] = mapped_column(String(255), nullable=True)
