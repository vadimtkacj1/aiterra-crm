from sqlalchemy import ForeignKey, String, UniqueConstraint
from sqlalchemy.orm import Mapped, mapped_column

from app.db.session import Base


class MetaIntegration(Base):
    __tablename__ = "integrations_meta"
    __table_args__ = (UniqueConstraint("account_id", name="uq_meta_account"),)

    id: Mapped[int] = mapped_column(primary_key=True, autoincrement=True)
    account_id: Mapped[int] = mapped_column(ForeignKey("accounts.id", ondelete="CASCADE"), nullable=False, index=True)

    ad_account_id: Mapped[str] = mapped_column(String(64), nullable=False)  # e.g. "1234567890"
    access_token: Mapped[str] = mapped_column(String(2048), nullable=False)

