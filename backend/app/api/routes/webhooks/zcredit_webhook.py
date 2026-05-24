"""
Z-Credit webhook / callback handler.

Z-Credit POSTs payment notifications to this endpoint after:
  - Successful payment
  - Failed payment
  - Recurring billing activation / cancellation

TODO: Implement signature verification using ZCREDIT_WEBHOOK_SECRET
      and parse the actual Z-Credit callback payload format.
      (Format details are provided by Z-Credit upon merchant approval.)

Register this URL in the Z-Credit merchant dashboard as your callback URL:
  https://<your-domain>/api/webhooks/zcredit
"""

from __future__ import annotations

import logging

from fastapi import APIRouter, Depends, Request
from sqlalchemy.orm import Session

from app.db.session import get_db
from app.services.payments.zcredit.webhook import (
    apply_zcredit_webhook_event,
    parse_webhook_json_body,
    resolve_event_type,
)

logger = logging.getLogger(__name__)

router = APIRouter()


@router.post("/zcredit")
async def zcredit_webhook(request: Request, db: Session = Depends(get_db)) -> dict[str, bool]:
    """
    Z-Credit payment callback.

    TODO: Implement once Z-Credit provides webhook documentation.
          Expected events:
            - payment.success   → mark invoice as paid, clear payment_url
            - payment.failed    → update subscription_status to "past_due"
            - recurring.active  → set subscription_status = "active"
            - recurring.cancelled → set subscription_status = "canceled"
    """
    payload = await request.body()

    # TODO: Verify Z-Credit signature
    # sig_header = request.headers.get("x-zcredit-signature")
    # if not sig_header or not _verify_signature(payload, sig_header, settings.zcredit_webhook_secret):
    #     raise HTTPException(status_code=400, detail="invalid_signature")

    data = parse_webhook_json_body(payload)
    event_type = resolve_event_type(data)
    logger.info("zcredit_webhook received event=%s", event_type)

    apply_zcredit_webhook_event(db, event_type, data)

    return {"received": True}
