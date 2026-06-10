from datetime import datetime, timezone

from sqlalchemy import Column, Integer, String, DateTime, ForeignKey
from sqlalchemy.orm import relationship

from app.db.session import Base


class AccountWhatsAppPhone(Base):
    __tablename__ = "account_whatsapp_phones"

    id = Column(Integer, primary_key=True, index=True)
    account_id = Column(Integer, ForeignKey("accounts.id"), nullable=False, index=True)
    connect_code = Column(String(20), unique=True, nullable=False, index=True)
    verified_phone = Column(String(30), nullable=True)
    label = Column(String(50), nullable=True)
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))

    account = relationship("Account", backref="whatsapp_phones")
