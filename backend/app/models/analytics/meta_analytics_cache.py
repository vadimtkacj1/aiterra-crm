from datetime import date, datetime

from sqlalchemy import Date, DateTime, String, Text, UniqueConstraint, func
from sqlalchemy.orm import Mapped, mapped_column

from app.db.session import Base


class MetaAnalyticsDailyCache(Base):
    """
    One row per UTC calendar day per Meta ad account: pre-fetched insights for preset analytics.

    Populated by cron (and optionally on-demand admin refresh). UI reads this instead of
    hitting Graph on every /meta/snapshot request (custom date ranges still use live API).
    """

    __tablename__ = "meta_analytics_daily_cache"
    __table_args__ = (UniqueConstraint("ad_account_id", "cache_date", name="uq_meta_analytics_day_ad"),)

    id: Mapped[int] = mapped_column(primary_key=True, autoincrement=True)
    ad_account_id: Mapped[str] = mapped_column(String(64), nullable=False, index=True)
    cache_date: Mapped[date] = mapped_column(Date, nullable=False, index=True)
    payload_json: Mapped[str] = mapped_column(Text, nullable=False)
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        server_default=func.now(),
        onupdate=func.now(),
        nullable=False,
    )
