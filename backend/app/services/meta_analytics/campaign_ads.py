"""Ad-creative-level insights for a single Meta campaign."""

from __future__ import annotations

from fastapi import HTTPException
from sqlalchemy.orm import Session

from app.core.settings import settings
from app.schemas.analytics import AdCreative, CampaignAds
from app.services.meta_graph import normalize_meta_ad_account_id
from app.services.meta_integration import get_global_meta_integration
from app.services.meta_marketing import (
    as_float,
    as_int,
    fetch_ad_account_campaigns,
    fetch_ad_account_currency,
    fetch_campaign_ads,
    sum_conversions_from_actions,
)

from .insight_rows import normalize_campaign_id


def build_campaign_ads(
    db: Session,
    account_id: int,
    campaign_id: str,
    *,
    since: str | None = None,
    until: str | None = None,
) -> CampaignAds:
    """Build ad-creative-level data for a single campaign."""
    integration = get_global_meta_integration(db)
    if not integration:
        raise HTTPException(status_code=400, detail="meta_not_connected")

    aid = normalize_meta_ad_account_id(integration.ad_account_id)
    token = integration.access_token

    currency, cerr = fetch_ad_account_currency(aid, token)
    if cerr:
        currency = "USD"

    # Fetch campaign name + objective
    all_campaigns, _ = fetch_ad_account_campaigns(aid, token)
    cid_norm = normalize_campaign_id(campaign_id)
    camp_meta = next(
        (c for c in all_campaigns if normalize_campaign_id(c.get("id", "")) == cid_norm),
        {},
    )
    camp_name = camp_meta.get("name", campaign_id)
    objective = camp_meta.get("objective", "")

    if settings.meta_snapshot_mock:
        # Return mock creative data
        ads: list[AdCreative] = []
        for i in range(4):
            spend = round(40.0 + i * 15.5, 2)
            imp = 3000 + i * 800
            clk = 120 + i * 30
            ctr = round(clk / imp * 100, 2) if imp else 0.0
            results = 5 + i * 2
            ads.append(
                AdCreative(
                    adId=f"mock_ad_{i}",
                    adName=f"Ad variant {chr(65 + i)} — {str(camp_name)[:20]}",
                    thumbnailUrl="",
                    previewUrl="",
                    spend=spend,
                    results=results,
                    ctr=ctr,
                    impressions=imp,
                    clicks=clk,
                )
            )
        return CampaignAds(
            campaignId=cid_norm,
            campaignName=str(camp_name),
            objective=str(objective),
            currency=currency,
            ads=ads,
        )

    raw_ads, err = fetch_campaign_ads(campaign_id, token, since=since, until=until)
    if err:
        raise HTTPException(status_code=502, detail=err)

    ads_out: list[AdCreative] = []
    for a in raw_ads:
        if not isinstance(a, dict):
            continue
        actions = a.get("actions")
        results = sum_conversions_from_actions(actions)
        ads_out.append(
            AdCreative(
                adId=a.get("adId", ""),
                adName=a.get("adName", ""),
                thumbnailUrl=a.get("thumbnailUrl", ""),
                previewUrl="",
                videoUrl=a.get("videoUrl", ""),
                permalinkUrl=a.get("permalinkUrl", ""),
                spend=as_float(a.get("spend")),
                results=results,
                ctr=as_float(a.get("ctr")),
                impressions=as_int(a.get("impressions")),
                clicks=as_int(a.get("clicks")),
            )
        )

    return CampaignAds(
        campaignId=cid_norm,
        campaignName=str(camp_name),
        objective=str(objective),
        currency=currency,
        ads=ads_out,
    )
