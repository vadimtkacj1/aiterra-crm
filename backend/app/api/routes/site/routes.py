from __future__ import annotations

import uuid
from typing import List

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.api.deps import get_current_user, require_account_member
from app.db.session import get_db
from app.models.core import User
from app.models.site import AccountSiteConfig, SiteLead
from app.schemas.site import SiteConfigOut, SiteConfigUpdate, SiteLeadCreate, SiteLeadOut, SiteLeadAdminOut

router = APIRouter()


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
        source=body.source,
    )
    db.add(lead)
    db.commit()
    db.refresh(lead)
    return SiteLeadOut(
        id=lead.id,
        name=lead.name,
        phone=lead.phone,
        email=lead.email,
        message=lead.message,
        source=lead.source,
        createdAt=lead.created_at,
    )
