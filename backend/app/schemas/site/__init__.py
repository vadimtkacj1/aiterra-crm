from datetime import datetime
from typing import Optional

from pydantic import BaseModel


class SiteConfigOut(BaseModel):
    siteUrl: Optional[str] = None
    gmbUrl: Optional[str] = None
    popupText: Optional[str] = None
    popupImageBase64: Optional[str] = None

    class Config:
        from_attributes = True


class SiteConfigUpdate(BaseModel):
    siteUrl: Optional[str] = None
    gmbUrl: Optional[str] = None
    popupText: Optional[str] = None
    popupImageBase64: Optional[str] = None


class SiteLeadCreate(BaseModel):
    accountId: int
    name: str
    phone: Optional[str] = None
    email: Optional[str] = None
    message: Optional[str] = None


class SiteLeadOut(BaseModel):
    id: int
    name: str
    phone: Optional[str] = None
    email: Optional[str] = None
    message: Optional[str] = None
    createdAt: datetime

    class Config:
        from_attributes = True
