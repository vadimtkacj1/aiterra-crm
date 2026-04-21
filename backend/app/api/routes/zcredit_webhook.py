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

from fastapi import APIRouter, Depends, HTTPException, Request
from sqlalchemy.orm import Session

from app.core.settings import settings
from app.db.session import get_db
from app.models.account import Account
from app.models.billing_instruction import AccountBillingInstruction

logger = logging.getLogger(__name__)

router = APIRouter()


def _find_instruction_by_doc_id(db: Session, doc_id: str) -> AccountBillingInstruction | None:
    return (
        db.query(AccountBillingInstruction)
        .filter(AccountBillingInstruction.payment_doc_id == doc_id)
        .first()
    )


def _find_instruction_by_recurring_id(db: Session, recurring_id: str) -> AccountBillingInstruction | None:
    return (
        db.query(AccountBillingInstruction)
        .filter(AccountBillingInstruction.payment_recurring_id == recurring_id)
        .first()
    )


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
    if not settings.zcredit_webhook_secret:
        raise HTTPException(status_code=503, detail="zcredit_webhook_not_configured")

    payload = await request.body()

    # TODO: Verify Z-Credit signature
    # sig_header = request.headers.get("x-zcredit-signature")
    # if not sig_header or not _verify_signature(payload, sig_header, settings.zcredit_webhook_secret):
    #     raise HTTPException(status_code=400, detail="invalid_signature")

    try:
        import json
        data = json.loads(payload)
    except Exception:
        raise HTTPException(status_code=400, detail="invalid_payload")

    event_type = str(data.get("event") or data.get("type") or "")
    logger.info("zcredit_webhook received event=%s", event_type)

    try:
        # TODO: handle real Z-Credit event payload structure
        # Below is a placeholder structure — update field names to match Z-Credit docs.

        if event_type in ("payment.success", "J4"):
            doc_id = str(data.get("docId") or data.get("doc_id") or "")
            if doc_id:
                ins = _find_instruction_by_doc_id(db, doc_id)
                if ins:
                    ins.payment_url = None          # clear pay link once paid
                    ins.subscription_status = "active" if ins.charge_type == "monthly" else None
                    db.add(ins)
                    db.commit()
                    logger.info("zcredit_webhook: marked doc %s as paid", doc_id)

        elif event_type in ("payment.failed",):
            recurring_id = str(data.get("recurringId") or data.get("recurring_id") or "")
            if recurring_id:
                ins = _find_instruction_by_recurring_id(db, recurring_id)
                if ins:
                    ins.subscription_status = "past_due"
                    db.add(ins)
                    db.commit()

        elif event_type in ("recurring.active",):
            recurring_id = str(data.get("recurringId") or data.get("recurring_id") or "")
            if recurring_id:
                ins = _find_instruction_by_recurring_id(db, recurring_id)
                if ins:
                    ins.subscription_status = "active"
                    ins.payment_url = None
                    db.add(ins)
                    db.commit()

        elif event_type in ("recurring.cancelled", "recurring.canceled"):
            recurring_id = str(data.get("recurringId") or data.get("recurring_id") or "")
            if recurring_id:
                ins = _find_instruction_by_recurring_id(db, recurring_id)
                if ins:
                    ins.subscription_status = "canceled"
                    db.add(ins)
                    db.commit()

    except Exception:
        logger.exception("zcredit_webhook handler failed event=%s", event_type)

    return {"received": True}
