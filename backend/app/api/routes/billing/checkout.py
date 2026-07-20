from __future__ import annotations

import logging
import re
import uuid

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel, Field, field_validator
from sqlalchemy.orm import Session

from app.api.deps import get_current_user, require_account_member
from app.core.settings import settings
from app.db.session import get_db
from app.models.core import Account, User
from app.services import zcredit_service

logger = logging.getLogger(__name__)

router = APIRouter()

# Public "buy a landing page" product — 12 months for ₪2,400.
LANDING_PRICE_MINOR = 240_000  # 2,400.00 ILS in minor units
LANDING_DESCRIPTION = "Landing page 12 months"
_EMAIL_RE = re.compile(r"^[^@\s]+@[^@\s]+\.[^@\s]+$")


class CheckoutRequest(BaseModel):
    accountId: int = Field(..., gt=0)
    amount: float = Field(..., gt=0)
    currency: str = Field(default="ILS", min_length=3, max_length=8)
    description: str = Field(default="Platform charge", min_length=1, max_length=255)


class CheckoutResponse(BaseModel):
    status: str
    message: str
    gateway: str
    callbackUrl: str
    sessionId: str | None = None
    paymentUrl: str | None = None


@router.post("/checkout", response_model=CheckoutResponse)
def create_checkout(
    payload: CheckoutRequest,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
) -> CheckoutResponse:
    """
    Secure checkout stub.

    This endpoint is server-only and must be called by authenticated clients.
    It validates access, reads Z-Credit credentials from environment variables,
    and is the future integration point for calling Z-Credit WebAPI.
    """
    require_account_member(payload.accountId, db, user)

    if not (settings.zcredit_api_key or "").strip():
        raise HTTPException(status_code=503, detail="zcredit_not_configured")

    account = db.query(Account).filter(Account.id == payload.accountId).first()
    if not account:
        raise HTTPException(status_code=404, detail="account_not_found")

    callback_url = f"{settings.app_base_url.rstrip('/')}/api/webhooks/zcredit"
    amount_minor = int(round(float(payload.amount) * 100))
    session_id, pay_url = zcredit_service.create_invoice(
        account,
        amount_minor,
        payload.currency,
        payload.description,
    )

    return CheckoutResponse(
        status="ok",
        message="Open paymentUrl in the browser to complete payment.",
        gateway="zcredit",
        callbackUrl=callback_url,
        sessionId=session_id,
        paymentUrl=pay_url,
    )


class LandingCheckoutRequest(BaseModel):
    name: str = Field(..., min_length=2, max_length=120)
    email: str = Field(..., min_length=5, max_length=200)

    @field_validator("name")
    @classmethod
    def _clean_name(cls, v: str) -> str:
        v = " ".join((v or "").split())
        if len(v) < 2:
            raise ValueError("name_too_short")
        return v

    @field_validator("email")
    @classmethod
    def _valid_email(cls, v: str) -> str:
        v = (v or "").strip()
        if not _EMAIL_RE.match(v):
            raise ValueError("invalid_email")
        return v


class LandingCheckoutResponse(BaseModel):
    paymentUrl: str


@router.post("/public/landing-checkout", response_model=LandingCheckoutResponse)
def public_landing_checkout(payload: LandingCheckoutRequest) -> LandingCheckoutResponse:
    """PUBLIC (no auth): create a Z-Credit hosted-checkout session to buy a
    12-month landing page for ₪2,400.

    The buyer supplies name + email; Z-Credit's hosted page collects the card
    details. Returns the payment URL to redirect the browser to. Accessible
    without signing in.
    """
    base = (settings.zcredit_customer_app_url or settings.app_base_url or "https://aiterra.agency").strip().rstrip("/")
    if base and not base.startswith(("http://", "https://")):
        base = f"https://{base}"

    ref = f"landing_{uuid.uuid4().hex[:16]}"
    logger.info(
        "Public landing-page order: name=%r email=%r amount_minor=%d ref=%s",
        payload.name, payload.email, LANDING_PRICE_MINOR, ref,
    )

    session_id, pay_url = zcredit_service.create_public_checkout(
        amount_minor=LANDING_PRICE_MINOR,
        currency="ILS",
        description=LANDING_DESCRIPTION,
        unique_ref=ref,
        success_url=f"{base}/buy/success",
        cancel_url=f"{base}/buy",
    )
    logger.info("Public landing-page order ref=%s → session=%s", ref, session_id)
    return LandingCheckoutResponse(paymentUrl=pay_url)
