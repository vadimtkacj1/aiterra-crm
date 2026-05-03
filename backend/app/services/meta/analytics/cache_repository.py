"""Persistence for daily Meta analytics bundles (one row per ad account per UTC day)."""

from __future__ import annotations

import logging
from datetime import date, datetime, timezone

from sqlalchemy import select
from sqlalchemy.orm import Session

from app.models.analytics import MetaAnalyticsDailyCache
from app.schemas.meta_snapshot_bundle import MetaSnapshotBundle

logger = logging.getLogger(__name__)


def utc_calendar_today() -> date:
    return datetime.now(timezone.utc).date()


def load_bundle_for_day(db: Session, ad_account_id: str, day: date) -> MetaSnapshotBundle | None:
    row = db.scalar(
        select(MetaAnalyticsDailyCache).where(
            MetaAnalyticsDailyCache.ad_account_id == ad_account_id,
            MetaAnalyticsDailyCache.cache_date == day,
        )
    )
    if row is None:
        return None
    try:
        return MetaSnapshotBundle.model_validate_json(row.payload_json)
    except Exception:
        logger.warning("Meta analytics cache row invalid JSON for ad_account=%s day=%s", ad_account_id, day)
        return None


def upsert_bundle_for_day(db: Session, ad_account_id: str, day: date, bundle: MetaSnapshotBundle) -> None:
    row = db.scalar(
        select(MetaAnalyticsDailyCache).where(
            MetaAnalyticsDailyCache.ad_account_id == ad_account_id,
            MetaAnalyticsDailyCache.cache_date == day,
        )
    )
    payload = bundle.model_dump_json()
    if row is not None:
        row.payload_json = payload
    else:
        db.add(
            MetaAnalyticsDailyCache(
                ad_account_id=ad_account_id,
                cache_date=day,
                payload_json=payload,
            )
        )
    db.commit()
