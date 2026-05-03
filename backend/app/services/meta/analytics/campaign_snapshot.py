"""Build Meta campaign analytics snapshot (Graph + tracked campaigns, with optional daily cache)."""

from __future__ import annotations

import logging

from fastapi import HTTPException
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.core.settings import settings
from app.models.campaign import TrackedCampaign
from app.schemas.analytics import CampaignRow, CampaignSnapshot, DailyMetric
from ..graph import normalize_meta_ad_account_id
from ..integration import get_global_meta_integration
from ..marketing import (
    as_float,
    as_int,
    fetch_ad_account_campaigns,
    fetch_ad_account_currency,
    fetch_campaign_level_insights,
    fetch_daily_account_insights,
    scalar_str,
    sum_conversions_from_actions,
)

from .cache_repository import load_bundle_for_day, upsert_bundle_for_day, utc_calendar_today
from .datetime_util import utc_now_iso
from .insight_rows import (
    aggregate_totals,
    campaign_insight_to_row,
    empty_campaign_row,
    normalize_campaign_id,
)
from .live_bundle_fetch import fetch_live_meta_snapshot_bundle
from .snapshot_from_bundle import assemble_campaign_snapshot_from_bundle
from .snapshot_mock import empty_meta_campaign_snapshot, meta_campaign_snapshot_mock

logger = logging.getLogger(__name__)


def _build_snapshot_custom_date_range(
    tracked_ids: set[str],
    aid: str,
    token: str,
    since: str,
    until: str,
    all_meta_campaigns: list[dict],
    currency: str,
) -> CampaignSnapshot:
    """Custom since/until — always live Graph calls (not cached)."""
    campaign_meta: dict[str, dict[str, str]] = {
        normalize_campaign_id(c["id"]): c for c in all_meta_campaigns if c.get("id")
    }

    raw_rows, ierr = fetch_campaign_level_insights(aid, token, since=since, until=until)
    if ierr:
        raise HTTPException(status_code=502, detail=ierr)
    period_label = f"{since} – {until}"

    rows_out: list[CampaignRow] = []
    for r in raw_rows:
        if not isinstance(r, dict):
            continue
        cid = normalize_campaign_id(scalar_str(r.get("campaign_id")))
        if not cid or cid not in tracked_ids:
            continue
        meta = campaign_meta.get(cid, {})
        row = campaign_insight_to_row(
            r,
            objective=meta.get("objective", ""),
            status=meta.get("status", "ACTIVE"),
        )
        rows_out.append(row.model_copy(update={"campaignId": cid}))

    by_id = {r.campaignId: r for r in rows_out}
    for tid in tracked_ids:
        if tid not in by_id:
            meta = campaign_meta.get(tid, {})
            name = meta.get("name") or next(
                (c["name"] for c in all_meta_campaigns if normalize_campaign_id(c["id"]) == tid),
                tid,
            )
            row = empty_campaign_row(tid, name)
            by_id[tid] = row.model_copy(
                update={
                    "objective": meta.get("objective", ""),
                    "status": meta.get("status", "ACTIVE"),
                }
            )

    merged = sorted(by_id.values(), key=lambda r: (-r.spend, r.campaignName.lower()))
    totals = aggregate_totals(merged)

    daily_rows, _ = fetch_daily_account_insights(aid, token, since=since, until=until)
    daily: list[DailyMetric] = []
    for d in daily_rows:
        if not isinstance(d, dict):
            continue
        date_val = scalar_str(d.get("date_start"))
        if not date_val:
            continue
        dactions = d.get("actions")
        daily.append(
            DailyMetric(
                date=date_val,
                impressions=as_int(d.get("impressions")),
                clicks=as_int(d.get("clicks")),
                spend=round(as_float(d.get("spend")), 2),
                conversions=sum_conversions_from_actions(dactions),
                reach=as_int(d.get("reach")),
                ctr=round(as_float(d.get("ctr")), 2),
                cpc=round(as_float(d.get("cpc")), 4),
                cpm=round(as_float(d.get("cpm")), 4),
            )
        )
    daily.sort(key=lambda x: x.date)

    return CampaignSnapshot(
        currency=currency,
        periodLabel=period_label,
        periodI18nKey=None,
        updatedAt=utc_now_iso(),
        totals=totals,
        rows=merged,
        dailyBreakdown=daily,
    )


def build_meta_campaign_snapshot(
    db: Session,
    account_id: int,
    *,
    since: str | None = None,
    until: str | None = None,
) -> CampaignSnapshot:
    if settings.meta_snapshot_mock:
        logger.info("Meta snapshot: mock data (META_SNAPSHOT_MOCK enabled, no Graph API)")
        return meta_campaign_snapshot_mock(db, account_id)

    tracked_raw = db.scalars(
        select(TrackedCampaign.meta_campaign_id).where(
            TrackedCampaign.account_id == account_id,
            TrackedCampaign.platform == "meta",
        )
    ).all()
    tracked_ids = {normalize_campaign_id(x) for x in tracked_raw if x}
    if not tracked_ids:
        return empty_meta_campaign_snapshot()

    integration = get_global_meta_integration(db)
    if not integration:
        raise HTTPException(status_code=400, detail="meta_not_connected")

    aid = normalize_meta_ad_account_id(integration.ad_account_id)
    token = integration.access_token

    if since and until:
        currency, cerr = fetch_ad_account_currency(aid, token)
        if cerr:
            logger.warning(
                "Meta snapshot: currency fetch failed account_id=%s ad_account=%s: %s",
                account_id,
                aid,
                cerr,
            )
            raise HTTPException(status_code=502, detail=cerr)

        all_meta_campaigns, cerr_c = fetch_ad_account_campaigns(aid, token)
        if cerr_c:
            all_meta_campaigns = []

        return _build_snapshot_custom_date_range(
            tracked_ids,
            aid,
            token,
            since,
            until,
            all_meta_campaigns,
            currency,
        )

    # Preset-based dashboard: daily UTC cache per Meta ad account (one Graph bundle per day).
    bundle = None
    if settings.meta_analytics_cache_enabled:
        bundle = load_bundle_for_day(db, aid, utc_calendar_today())

    if bundle is None:
        try:
            bundle = fetch_live_meta_snapshot_bundle(db)
        except HTTPException:
            raise
        if settings.meta_analytics_cache_enabled:
            try:
                upsert_bundle_for_day(db, aid, utc_calendar_today(), bundle)
            except Exception:
                logger.exception("Meta snapshot: failed to persist daily cache ad_account=%s", aid)

    return assemble_campaign_snapshot_from_bundle(bundle, tracked_ids)
