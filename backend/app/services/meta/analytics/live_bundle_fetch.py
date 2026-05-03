"""Fetch a full Meta snapshot bundle from Graph (preset path only — no custom date range)."""

from __future__ import annotations

import logging

from fastapi import HTTPException
from sqlalchemy.orm import Session

from app.schemas.meta_snapshot_bundle import MetaSnapshotBundle
from ..graph import normalize_meta_ad_account_id
from ..integration import get_global_meta_integration
from ..marketing import (
    fetch_ad_account_campaigns,
    fetch_ad_account_currency,
    fetch_campaign_level_insights,
    fetch_daily_account_insights,
)

from .datetime_util import utc_now_iso

logger = logging.getLogger(__name__)


def fetch_live_meta_snapshot_bundle(db: Session) -> MetaSnapshotBundle:
    """
    Pull currency, campaign list, winning preset insights, and matching daily breakdown for the
    global Meta integration (single ad account). Used by cron and cache miss refresh.
    """
    integration = get_global_meta_integration(db)
    if not integration:
        raise HTTPException(status_code=400, detail="meta_not_connected")

    aid = normalize_meta_ad_account_id(integration.ad_account_id)
    token = integration.access_token

    currency, cerr = fetch_ad_account_currency(aid, token)
    if cerr:
        logger.warning("Meta bundle fetch: currency failed ad_account=%s: %s", aid, cerr)
        raise HTTPException(status_code=502, detail=cerr)

    all_meta_campaigns, cerr_c = fetch_ad_account_campaigns(aid, token)
    if cerr_c:
        all_meta_campaigns = []

    raw_rows: list[dict] = []
    ierr: str | None = None
    period_label = "Last 30 days"
    period_i18n: str | None = "analytics.period.last30Days"
    preset = "last_30d"

    for preset, label, i18n in (
        ("last_30d", "Last 30 days", "analytics.period.last30Days"),
        ("last_90d", "Last 90 days", "analytics.period.last90Days"),
        ("maximum", "Full period (Meta)", None),
    ):
        raw_rows, ierr = fetch_campaign_level_insights(aid, token, date_preset=preset)
        if ierr:
            logger.warning("Meta bundle fetch: insights failed ad_account=%s preset=%s: %s", aid, preset, ierr)
            raise HTTPException(status_code=502, detail=ierr)
        if raw_rows:
            period_label = label
            period_i18n = i18n
            break

    daily_preset = "last_30d" if preset == "maximum" else preset
    daily_rows, _ = fetch_daily_account_insights(aid, token, date_preset=daily_preset)

    daily_dicts = [d for d in daily_rows if isinstance(d, dict)]

    return MetaSnapshotBundle(
        currency=currency,
        all_meta_campaigns=all_meta_campaigns,
        raw_rows=raw_rows,
        period_label=period_label,
        period_i18n=period_i18n,
        preset_used=preset,
        daily_rows=daily_dicts,
        fetched_at_iso=utc_now_iso(),
    )
