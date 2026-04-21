from __future__ import annotations

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel, Field
from sqlalchemy.orm import Session

from app.api.deps import get_current_user, require_account_member
from app.core.settings import settings
from app.db.session import get_db
from app.models.user import User

router = APIRouter()


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

    if not settings.zcredit_terminal_number or not settings.zcredit_api_key:
        raise HTTPException(status_code=503, detail="zcredit_not_configured")

    callback_url = f"{settings.app_base_url.rstrip('/')}/api/webhooks/zcredit"

    # TODO: Replace this stub with a real POST to Z-Credit using:
    # settings.zcredit_terminal_number, settings.zcredit_api_key, settings.zcredit_api_url
    # Do not expose credentials to the client.
    return CheckoutResponse(
        status="stub",
        message="Checkout request validated. Ready for Z-Credit API call implementation.",
        gateway="zcredit",
        callbackUrl=callback_url,
    )
