from datetime import datetime, timezone

from sqlalchemy import Column, Integer, String, Text, ForeignKey, DateTime
from sqlalchemy.orm import relationship

from app.db.session import Base


class AccountSiteConfig(Base):
    __tablename__ = "account_site_configs"

    id = Column(Integer, primary_key=True, index=True)
    account_id = Column(Integer, ForeignKey("accounts.id"), unique=True, nullable=False, index=True)
    site_url = Column(String(2048), nullable=True)
    gmb_url = Column(String(2048), nullable=True)
    popup_text = Column(Text, nullable=True)
    popup_image_base64 = Column(Text, nullable=True)
    updated_at = Column(DateTime, default=lambda: datetime.now(timezone.utc), onupdate=lambda: datetime.now(timezone.utc))

    account = relationship("Account", backref="site_config")
