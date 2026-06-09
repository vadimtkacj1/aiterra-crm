from datetime import datetime
from typing import Optional

from pydantic import BaseModel


class SiteConfigOut(BaseModel):
    publicToken: Optional[str] = None
    siteUrl: Optional[str] = None
    gmbUrl: Optional[str] = None
    popupText: Optional[str] = None
    popupImageBase64: Optional[str] = None
    notifyChannel: Optional[str] = "whatsapp"
    waOwnerPhone: Optional[str] = None
    waNotifyMessage: Optional[str] = None
    emailNotifySubject: Optional[str] = None
    emailNotifyMessage: Optional[str] = None

    class Config:
        from_attributes = True


class SiteConfigUpdate(BaseModel):
    siteUrl: Optional[str] = None
    gmbUrl: Optional[str] = None
    popupText: Optional[str] = None
    popupImageBase64: Optional[str] = None
    notifyChannel: Optional[str] = None
    waOwnerPhone: Optional[str] = None
    waNotifyMessage: Optional[str] = None
    emailNotifySubject: Optional[str] = None
    emailNotifyMessage: Optional[str] = None


class SiteLeadCreate(BaseModel):
    publicToken: str
    name: str
    phone: Optional[str] = None
    email: Optional[str] = None
    message: Optional[str] = None
    treatment: Optional[str] = None
    source: Optional[str] = None


class SiteLeadOut(BaseModel):
    id: int
    name: str
    phone: Optional[str] = None
    email: Optional[str] = None
    message: Optional[str] = None
    treatment: Optional[str] = None
    source: Optional[str] = None
    createdAt: datetime

    class Config:
        from_attributes = True


class SiteLeadAdminOut(SiteLeadOut):
    accountId: int
    accountName: str


class TestNotificationIn(BaseModel):
    email: str


class TestWhatsAppIn(BaseModel):
    phone: str  # destination phone to send the test message to
