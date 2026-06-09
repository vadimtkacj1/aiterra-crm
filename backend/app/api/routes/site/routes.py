from __future__ import annotations

import logging
import threading
import uuid
from typing import List

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.api.deps import get_current_user, require_account_member
from app.core.settings import settings
from app.db.session import get_db
from app.models.core import User, AccountMembership
from app.models.site import AccountSiteConfig, SiteLead
from app.schemas.site import SiteConfigOut, SiteConfigUpdate, SiteLeadCreate, SiteLeadOut, SiteLeadAdminOut, TestNotificationIn, TestWhatsAppIn
from app.services.whatsapp.sender import send_whatsapp_message
from app.services.email.smtp_mail import send_simple_email

logger = logging.getLogger(__name__)
router = APIRouter()

DEFAULT_EMAIL_SUBJECT = "New lead: {name}"
DEFAULT_EMAIL_BODY = "You have a new lead from your landing page.\n\nName: {name}"


def _render(template: str, **fields: str) -> str:
    """Replace {name}, {phone}, {email}, {message}, {treatment} in a notification template.
    Falls back to plain string replace so malformed braces never raise."""
    try:
        return template.format(**fields)
    except (KeyError, ValueError, IndexError):
        result = template
        for k, v in fields.items():
            result = result.replace(f"{{{k}}}", v)
        return result


def _get_or_create_config(db: Session, account_id: int) -> AccountSiteConfig:
    config = db.query(AccountSiteConfig).filter_by(account_id=account_id).first()
    if not config:
        config = AccountSiteConfig(account_id=account_id)
        db.add(config)
        db.commit()
        db.refresh(config)
    # Ensure existing configs always have a public_token
    if not config.public_token:
        config.public_token = str(uuid.uuid4())
        db.commit()
        db.refresh(config)
    return config


def _config_to_out(config: AccountSiteConfig) -> SiteConfigOut:
    return SiteConfigOut(
        publicToken=config.public_token,
        siteUrl=config.site_url,
        gmbUrl=config.gmb_url,
        popupText=config.popup_text,
        popupImageBase64=config.popup_image_base64,
        notifyChannel=config.notify_channel or "whatsapp",
        waOwnerPhone=config.wa_owner_phone,
        waNotifyMessage=config.wa_notify_message,
        emailNotifySubject=config.email_notify_subject,
        emailNotifyMessage=config.email_notify_message,
    )


@router.get("/accounts/{account_id}/site-config", response_model=SiteConfigOut)
def get_site_config(
    account_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    require_account_member(account_id, db, current_user)
    config = _get_or_create_config(db, account_id)
    return _config_to_out(config)


@router.put("/accounts/{account_id}/site-config", response_model=SiteConfigOut)
def update_site_config(
    account_id: int,
    body: SiteConfigUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    require_account_member(account_id, db, current_user)
    config = _get_or_create_config(db, account_id)

    if body.siteUrl is not None:
        config.site_url = body.siteUrl or None
    if body.gmbUrl is not None:
        config.gmb_url = body.gmbUrl or None
    if body.popupText is not None:
        config.popup_text = body.popupText or None
    if body.popupImageBase64 is not None:
        config.popup_image_base64 = body.popupImageBase64 or None
    if body.notifyChannel is not None:
        config.notify_channel = body.notifyChannel or "whatsapp"
    if body.waOwnerPhone is not None:
        config.wa_owner_phone = body.waOwnerPhone or None
    if body.waNotifyMessage is not None:
        config.wa_notify_message = body.waNotifyMessage or None
    if body.emailNotifySubject is not None:
        config.email_notify_subject = body.emailNotifySubject or None
    if body.emailNotifyMessage is not None:
        config.email_notify_message = body.emailNotifyMessage or None

    db.commit()
    db.refresh(config)
    return _config_to_out(config)


@router.post("/accounts/{account_id}/site-config/regenerate-token", response_model=SiteConfigOut)
def regenerate_public_token(
    account_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Generate a new public_token — invalidates the old embed form immediately."""
    require_account_member(account_id, db, current_user)
    config = _get_or_create_config(db, account_id)
    config.public_token = str(uuid.uuid4())
    db.commit()
    db.refresh(config)
    return _config_to_out(config)


@router.get("/accounts/{account_id}/site-leads", response_model=List[SiteLeadOut])
def list_leads(
    account_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    require_account_member(account_id, db, current_user)
    leads = (
        db.query(SiteLead)
        .filter_by(account_id=account_id)
        .order_by(SiteLead.created_at.desc())
        .all()
    )
    return [
        SiteLeadOut(
            id=l.id,
            name=l.name,
            phone=l.phone,
            email=l.email,
            message=l.message,
            treatment=l.treatment,
            source=l.source,
            createdAt=l.created_at,
        )
        for l in leads
    ]


@router.post("/site-leads/submit", response_model=SiteLeadOut, status_code=201)
def submit_lead(body: SiteLeadCreate, db: Session = Depends(get_db)):
    """Public endpoint — landing pages embed this to submit contact forms.

    Identifies the account via publicToken (UUID), never exposes internal account IDs.
    """
    config = db.query(AccountSiteConfig).filter_by(public_token=body.publicToken).first()
    if not config:
        raise HTTPException(status_code=404, detail="invalid_token")

    lead = SiteLead(
        account_id=config.account_id,
        name=body.name,
        phone=body.phone,
        email=body.email,
        message=body.message,
        treatment=body.treatment,
        source=body.source,
    )
    db.add(lead)
    db.commit()
    db.refresh(lead)

    # Fire notifications based on configured channel
    channel = (config.notify_channel or "whatsapp").lower()

    send_wa = channel in ("whatsapp", "both")
    send_email = channel in ("email", "both")

    if (
        send_wa
        and config.wa_owner_phone
        and settings.greenapi_url
        and settings.greenapi_id_instance
        and settings.greenapi_token
        and config.wa_notify_message
    ):
        wa_message = _render(
            config.wa_notify_message,
            name=body.name or "",
            phone=body.phone or "—",
            email=body.email or "—",
            message=body.message or "—",
            treatment=body.treatment or "—",
        )
        threading.Thread(
            target=send_whatsapp_message,
            args=(settings.greenapi_url, settings.greenapi_id_instance, settings.greenapi_token, config.wa_owner_phone, wa_message),
            daemon=True,
        ).start()

    if send_email:
        # Notify account owner(s), not the lead
        owner_emails = (
            db.query(User.email)
            .join(AccountMembership, AccountMembership.user_id == User.id)
            .filter(AccountMembership.account_id == config.account_id)
            .all()
        )
        lead_fields = dict(
            name=body.name or "",
            phone=body.phone or "—",
            email=body.email or "—",
            message=body.message or "—",
            treatment=body.treatment or "—",
        )
        subject = _render(config.email_notify_subject or DEFAULT_EMAIL_SUBJECT, **lead_fields)
        email_body = _render(config.email_notify_message or DEFAULT_EMAIL_BODY, **lead_fields)
        for (owner_email,) in owner_emails:
            threading.Thread(
                target=send_simple_email,
                args=(owner_email, subject, email_body),
                daemon=True,
            ).start()

    return SiteLeadOut(
        id=lead.id,
        name=lead.name,
        phone=lead.phone,
        email=lead.email,
        message=lead.message,
        treatment=lead.treatment,
        source=lead.source,
        createdAt=lead.created_at,
    )


@router.post("/accounts/{account_id}/site-config/test-notification")
def test_notification(
    account_id: int,
    body: TestNotificationIn,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    require_account_member(account_id, db, current_user)
    config = _get_or_create_config(db, account_id)

    subject = config.email_notify_subject or DEFAULT_EMAIL_SUBJECT
    email_body = config.email_notify_message or DEFAULT_EMAIL_BODY
    email_body = email_body.replace("{name}", "Test User")
    subject = subject.replace("{name}", "Test User")

    sent = send_simple_email(body.email, f"[TEST] {subject}", email_body)
    if not sent:
        raise HTTPException(status_code=503, detail="smtp_not_configured")


@router.post("/accounts/{account_id}/site-config/test-whatsapp")
def test_whatsapp(
    account_id: int,
    body: TestWhatsAppIn,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Send a test WhatsApp message using the account's configured template."""
    require_account_member(account_id, db, current_user)
    config = _get_or_create_config(db, account_id)

    if not (settings.greenapi_url and settings.greenapi_id_instance and settings.greenapi_token):
        raise HTTPException(status_code=503, detail="whatsapp_not_configured")

    template = config.wa_notify_message or "ליד חדש: {name} השאיר פרטים באתר.\nטלפון: {phone}"
    message = _render(
        template,
        name="ישראל ישראלי",
        phone="+972501234567",
        email="test@example.com",
        message="בדיקת הודעה",
        treatment="—",
    )
    sent = send_whatsapp_message(
        settings.greenapi_url,
        settings.greenapi_id_instance,
        settings.greenapi_token,
        body.phone,
        f"[TEST]\n{message}",
    )
    if not sent:
        raise HTTPException(status_code=503, detail="whatsapp_send_failed")
