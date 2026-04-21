from typing import List, Optional

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from sqlalchemy import select

from app.core.settings import settings
from app.db.session import get_db
from app.api.deps import get_current_user, require_admin, require_account_member
from app.models.user import User
from app.models.account import Account
from app.models.integration_meta import MetaIntegration
from app.models.campaign import TrackedCampaign
from app.schemas.analytics import CampaignAds, CampaignSnapshot, MetaAccountBilling
from app.services.meta_analytics import build_campaign_ads, build_meta_billing, build_meta_campaign_snapshot
from app.services.meta_graph import fetch_meta_ad_accounts, normalize_meta_ad_account_id
from app.services.meta_integration import get_global_meta_integration
from app.services.meta_marketing import fetch_ad_account_campaigns
from pydantic import BaseModel

router = APIRouter()

class MetaConnectRequest(BaseModel):
    account_id: int
    access_token: str
    ad_account_id: str


class MetaAdminConnectRequest(BaseModel):
    access_token: str
    ad_account_id: str


class MetaAccessTokenBody(BaseModel):
    access_token: str


class TrackCampaignRequest(BaseModel):
    account_id: int
    meta_campaign_id: str
    name: str

class CampaignInsight(BaseModel):
    date: str
    impressions: int
    clicks: int
    spend: float
    cpc: float
    cpm: float
    ctr: float
    leads: int

class TrackedCampaignResponse(BaseModel):
    id: int
    meta_campaign_id: str
    name: str
    platform: str

@router.get("/app-config", summary="Public Meta app id for this deployment (no secrets)")
def meta_app_config(_: User = Depends(get_current_user)):
    return {"appId": settings.meta_app_id}


@router.post("/ad-accounts/list", summary="List Meta ad accounts (admin, Graph API)")
def list_meta_ad_accounts(
    body: MetaAccessTokenBody,
    _: User = Depends(require_admin),
):
    accounts, err = fetch_meta_ad_accounts(body.access_token)
    if err:
        code = 502 if err.startswith("meta_graph_unreachable") else 400
        raise HTTPException(status_code=code, detail=err)
    return {"accounts": accounts}


@router.post("/connect", summary="Connect global Meta Ads Account")
def connect_meta(
    req: MetaConnectRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    require_account_member(req.account_id, db, current_user)
    ad_account_id = normalize_meta_ad_account_id(req.ad_account_id)
    integration = get_global_meta_integration(db)
    if integration:
        integration.access_token = req.access_token
        integration.ad_account_id = ad_account_id
    else:
        integration = MetaIntegration(
            account_id=req.account_id,
            access_token=req.access_token,
            ad_account_id=ad_account_id,
        )
        db.add(integration)
    db.commit()
    return {"status": "success", "message": "Meta account connected"}


@router.post("/admin-connect", summary="Admin: set global Meta Ads integration (no account_id required)")
def admin_connect_meta(
    req: MetaAdminConnectRequest,
    db: Session = Depends(get_db),
    _: User = Depends(require_admin),
):
    ad_account_id = normalize_meta_ad_account_id(req.ad_account_id)
    integration = get_global_meta_integration(db)
    if integration:
        integration.access_token = req.access_token
        integration.ad_account_id = ad_account_id
    else:
        first_account = db.scalar(select(Account).order_by(Account.id.asc()))
        if not first_account:
            raise HTTPException(status_code=400, detail="no_accounts_yet")
        integration = MetaIntegration(
            account_id=first_account.id,
            access_token=req.access_token,
            ad_account_id=ad_account_id,
        )
        db.add(integration)
    db.commit()
    return {"status": "success"}


@router.get("/campaigns/available", summary="List campaigns from global Meta ad account")
def get_available_campaigns(
    db: Session = Depends(get_db),
    _: User = Depends(require_admin),
):
    integration = get_global_meta_integration(db)
    if not integration:
        raise HTTPException(status_code=400, detail="Meta account not connected")

    campaigns, err = fetch_ad_account_campaigns(integration.ad_account_id, integration.access_token)
    if err:
        code = 502 if err.startswith("meta_graph_unreachable") else 400
        raise HTTPException(status_code=code, detail=err)
    return campaigns


@router.post("/campaigns/track", summary="Track a Campaign")
def track_campaign(
    req: TrackCampaignRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    require_account_member(req.account_id, db, current_user)
    existing_other = db.scalar(
        select(TrackedCampaign).where(
            TrackedCampaign.meta_campaign_id == req.meta_campaign_id,
            TrackedCampaign.account_id != req.account_id,
        )
    )
    if existing_other:
        raise HTTPException(status_code=409, detail="meta_campaign_already_assigned")

    campaign = db.scalar(
        select(TrackedCampaign).where(
            TrackedCampaign.account_id == req.account_id,
            TrackedCampaign.meta_campaign_id == req.meta_campaign_id
        )
    )
    if not campaign:
        campaign = TrackedCampaign(
            account_id=req.account_id,
            meta_campaign_id=req.meta_campaign_id,
            name=req.name,
            platform="meta"
        )
        db.add(campaign)
        db.commit()
        db.refresh(campaign)
    return campaign


@router.get("/campaigns/tracked", response_model=List[TrackedCampaignResponse])
def get_tracked_campaigns(
    account_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    require_account_member(account_id, db, current_user)
    campaigns = db.scalars(
        select(TrackedCampaign).where(TrackedCampaign.account_id == account_id)
    ).all()
    return campaigns


@router.get("/snapshot/{account_id}", response_model=CampaignSnapshot)
def get_meta_snapshot(
    account_id: int,
    since: Optional[str] = Query(default=None, description="Start date YYYY-MM-DD for custom range"),
    until: Optional[str] = Query(default=None, description="End date YYYY-MM-DD for custom range"),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    require_account_member(account_id, db, current_user)
    return build_meta_campaign_snapshot(db, account_id, since=since, until=until)


@router.get("/campaigns/{campaign_id}/ads", response_model=CampaignAds)
def get_campaign_ads(
    campaign_id: str,
    account_id: int = Query(..., description="CRM account ID for auth check"),
    since: Optional[str] = Query(default=None),
    until: Optional[str] = Query(default=None),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    require_account_member(account_id, db, current_user)
    return build_campaign_ads(db, account_id, campaign_id, since=since, until=until)


@router.get("/billing/{account_id}", response_model=MetaAccountBilling)
def get_meta_billing(
    account_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    require_account_member(account_id, db, current_user)
    return build_meta_billing(db)
