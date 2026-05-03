from sqlalchemy import ForeignKey, String, UniqueConstraint
from sqlalchemy.orm import Mapped, mapped_column

from app.db.session import Base


class GoogleAdsIntegration(Base):
    __tablename__ = "integrations_google_ads"
    __table_args__ = (UniqueConstraint("account_id", name="uq_google_ads_account"),)

    id: Mapped[int] = mapped_column(primary_key=True, autoincrement=True)
    account_id: Mapped[int] = mapped_column(ForeignKey("accounts.id", ondelete="CASCADE"), nullable=False, index=True)

    customer_id: Mapped[str] = mapped_column(String(32), nullable=False)  # 10 digits
    developer_token: Mapped[str] = mapped_column(String(256), nullable=False)
    refresh_token: Mapped[str] = mapped_column(String(2048), nullable=False)
    login_customer_id: Mapped[str | None] = mapped_column(String(32), nullable=True)

