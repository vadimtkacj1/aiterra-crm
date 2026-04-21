"""Build Meta campaign analytics snapshot (Graph + tracked campaigns)."""

from __future__ import annotations

import logging

from fastapi import HTTPException
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.core.settings import settings
from app.models.campaign import TrackedCampaign
from app.schemas.analytics import CampaignRow, CampaignSnapshot, DailyMetric
from app.services.meta_graph import normalize_meta_ad_account_id
from app.services.meta_integration import get_global_meta_integration
from app.services.meta_marketing import (
    as_float,
    as_int,
    fetch_ad_account_campaigns,
    fetch_ad_account_currency,
    fetch_campaign_level_insights,
    fetch_daily_account_insights,
    scalar_str,
    sum_conversions_from_actions,
)

from .datetime_util import utc_now_iso
from .insight_rows import (
    aggregate_totals,
    campaign_insight_to_row,
    empty_campaign_row,
    normalize_campaign_id,
)
from .snapshot_mock import empty_meta_campaign_snapshot, meta_campaign_snapshot_mock

logger = logging.getLogger(__name__)


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

    currency, cerr = fetch_ad_account_currency(aid, token)
    if cerr:
        logger.warning("Meta snapshot: currency fetch failed account_id=%s ad_account=%s: %s", account_id, aid, cerr)
        raise HTTPException(status_code=502, detail=cerr)

    # Fetch campaign metadata (objective + status) for all campaigns in the ad account
    all_meta_campaigns, cerr_c = fetch_ad_account_campaigns(aid, token)
    if cerr_c:
        all_meta_campaigns = []
    campaign_meta: dict[str, dict[str, str]] = {
        normalize_campaign_id(c["id"]): c for c in all_meta_campaigns if c.get("id")
    }

    raw_rows: list[dict] = []
    ierr: str | None = None
    period_label = "Last 30 days"
    period_i18n: str | None = "analytics.period.last30Days"
    preset = "last_30d"

    if since and until:
        # Custom date range — single fetch, no preset fallback
        raw_rows, ierr = fetch_campaign_level_insights(aid, token, since=since, until=until)
        if ierr:
            raise HTTPException(status_code=502, detail=ierr)
        period_label = f"{since} – {until}"
        period_i18n = None
    else:
        for preset, label, i18n in (  # type: ignore[assignment]
            ("last_30d", "Last 30 days", "analytics.period.last30Days"),
            ("last_90d", "Last 90 days", "analytics.period.last90Days"),
            ("maximum", "Full period (Meta)", None),
        ):
            raw_rows, ierr = fetch_campaign_level_insights(aid, token, date_preset=preset)
            if ierr:
                logger.warning(
                    "Meta snapshot: insights failed account_id=%s ad_account=%s preset=%s: %s",
                    account_id,
                    aid,
                    preset,
                    ierr,
                )
                raise HTTPException(status_code=502, detail=ierr)
            if raw_rows:
                period_label = label
                period_i18n = i18n
                break

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

    # Daily breakdown
    if since and until:
        daily_rows, _ = fetch_daily_account_insights(aid, token, since=since, until=until)
    else:
        daily_preset = "last_30d" if preset == "maximum" else preset
        daily_rows, _ = fetch_daily_account_insights(aid, token, date_preset=daily_preset)

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
        periodI18nKey=period_i18n,
        updatedAt=utc_now_iso(),
        totals=totals,
        rows=merged,
        dailyBreakdown=daily,
    )
