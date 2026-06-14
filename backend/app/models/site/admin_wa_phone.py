from datetime import datetime, timezone

from sqlalchemy import Column, Integer, String, DateTime
from app.db.session import Base


class AdminWhatsAppPhone(Base):
    """Global admin phone numbers — receive lead notifications from ALL accounts."""
    __tablename__ = "admin_whatsapp_phones"

    id = Column(Integer, primary_key=True, index=True)
    phone = Column(String(30), nullable=False)
    label = Column(String(50), nullable=True)
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))
