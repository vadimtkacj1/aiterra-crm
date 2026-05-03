from sqlalchemy import ForeignKey, String, UniqueConstraint
from sqlalchemy.orm import Mapped, mapped_column

from app.db.session import Base


class AccountMembership(Base):
    __tablename__ = "account_memberships"
    __table_args__ = (UniqueConstraint("user_id", "account_id", name="uq_membership_user_account"),)

    id: Mapped[int] = mapped_column(primary_key=True, autoincrement=True)
    user_id: Mapped[int] = mapped_column(ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True)
    account_id: Mapped[int] = mapped_column(ForeignKey("accounts.id", ondelete="CASCADE"), nullable=False, index=True)
    role_in_account: Mapped[str] = mapped_column(String(20), nullable=False, default="member")  # owner | member

