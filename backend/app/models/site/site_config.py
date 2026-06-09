import uuid
from datetime import datetime, timezone

from sqlalchemy import Column, Integer, String, Text, ForeignKey, DateTime
from sqlalchemy.orm import relationship

from app.db.session import Base


class AccountSiteConfig(Base):
    __tablename__ = "account_site_configs"

    id = Column(Integer, primary_key=True, index=True)
    account_id = Column(Integer, ForeignKey("accounts.id"), unique=True, nullable=False, index=True)
    public_token = Column(String(36), unique=True, nullable=True, index=True, default=lambda: str(uuid.uuid4()))
    site_url = Column(String(2048), nullable=True)
    gmb_url = Column(String(2048), nullable=True)
    popup_text = Column(Text, nullable=True)
    popup_image_base64 = Column(Text, nullable=True)
    updated_at = Column(DateTime, default=lambda: datetime.now(timezone.utc), onupdate=lambda: datetime.now(timezone.utc))

    # Notification channel: "whatsapp" | "email" | "both" | "none"
    notify_channel = Column(String(20), nullable=True, default="whatsapp")

    # Owner's WhatsApp phone number to receive lead notifications (e.g. +972501234567)
    wa_owner_phone = Column(String(30), nullable=True)
    wa_owner_phone_verified = Column(String(30), nullable=True)  # stores the verified phone
    # Permanent connect code — owner sends this to the bot once to link their WhatsApp
    wa_connect_code = Column(String(20), nullable=True, unique=True, index=True)

    # Per-account WhatsApp message template (credentials are global in settings)
    wa_notify_message = Column(Text, nullable=True)

    # Email notification config
    email_notify_subject = Column(Text, nullable=True)
    email_notify_message = Column(Text, nullable=True)

    account = relationship("Account", backref="site_config")
