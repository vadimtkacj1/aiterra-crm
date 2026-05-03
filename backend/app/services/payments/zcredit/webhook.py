"""
Z-Credit webhook payload parsing and side effects (DB updates).

Schema is provisional until Z-Credit publishes final callback fields.
"""

from __future__ import annotations

import json
import logging
from typing import Any

from fastapi import HTTPException
from sqlalchemy.orm import Session

from app.models.billing import AccountBillingInstruction

logger = logging.getLogger(__name__)


def parse_webhook_json_body(raw: bytes) -> dict[str, Any]:
    """Parse JSON object from raw body; raise HTTP 400 on invalid UTF-8 or non-object JSON."""
    try:
        text = raw.decode("utf-8")
    except UnicodeDecodeError as exc:
        raise HTTPException(status_code=400, detail="invalid_payload") from exc
    try:
        data = json.loads(text)
    except json.JSONDecodeError as exc:
        raise HTTPException(status_code=400, detail="invalid_payload") from exc
    if not isinstance(data, dict):
        raise HTTPException(status_code=400, detail="invalid_payload")
    return data


def resolve_event_type(data: dict[str, Any]) -> str:
    explicit = str(data.get("event") or data.get("type") or "").strip()
    if explicit:
        return explicit
    rc = data.get("ReturnCode")
    if rc not in (None, 0, "0"):
        return "payment.failed"
    if data.get("ReferenceNumber") or data.get("ApprovalNumber"):
        return "payment.success"
    return ""


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


def _find_instruction_for_callback(db: Session, data: dict[str, Any]) -> AccountBillingInstruction | None:
    sid = str(data.get("SessionId") or "").strip()
    uid = str(data.get("UniqueID") or data.get("UniqueId") or "").strip()
    legacy_doc = str(data.get("docId") or data.get("doc_id") or "").strip()
    if sid:
        ins = _find_instruction_by_doc_id(db, sid)
        if ins:
            return ins
    if uid:
        ins = _find_instruction_by_recurring_id(db, uid)
        if ins:
            return ins
    if legacy_doc:
        return _find_instruction_by_doc_id(db, legacy_doc)
    return None


def apply_zcredit_webhook_event(db: Session, event_type: str, data: dict[str, Any]) -> None:
    """
    Apply a single webhook event to billing instructions. Commits per successful branch.

    Raises only on unexpected programmer errors; DB errors are logged and swallowed
    so the HTTP handler can still acknowledge receipt (matches prior broad try/except).
    """
    try:
        if event_type in ("payment.success", "J4"):
            ins = _find_instruction_for_callback(db, data)
            if ins:
                ins.payment_url = None
                ins.subscription_status = "active" if ins.charge_type == "monthly" else None
                db.add(ins)
                db.commit()
                logger.info(
                    "zcredit_webhook: marked paid session=%s unique=%s",
                    data.get("SessionId"),
                    data.get("UniqueID"),
                )

        elif event_type in ("payment.failed",):
            recurring_id = str(data.get("recurringId") or data.get("recurring_id") or "").strip()
            sid = str(data.get("SessionId") or "").strip()
            ins = None
            if recurring_id:
                ins = _find_instruction_by_recurring_id(db, recurring_id)
            if ins is None and sid:
                ins = _find_instruction_by_doc_id(db, sid)
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
