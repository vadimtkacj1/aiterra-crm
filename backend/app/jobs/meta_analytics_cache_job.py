"""Scheduled refresh of Meta Marketing API daily analytics cache (global ad account)."""

from __future__ import annotations

import logging

from app.core.settings import settings
from app.db.session import SessionLocal
from app.services.meta.analytics.cache_repository import upsert_bundle_for_day, utc_calendar_today
from app.services.meta.analytics.live_bundle_fetch import fetch_live_meta_snapshot_bundle
from app.services.meta.graph import normalize_meta_ad_account_id
from app.services.meta.integration import get_global_meta_integration

logger = logging.getLogger(__name__)


def run_meta_analytics_cache_refresh_sync() -> None:
    """
    Fetch preset Meta insights once and store under today's UTC date for the connected ad account.
    Intended for cron + manual admin trigger.
    """
    if settings.meta_snapshot_mock:
        logger.info("Meta analytics cache refresh skipped (META_SNAPSHOT_MOCK)")
        return
    if not settings.meta_analytics_cache_enabled:
        return

    db = SessionLocal()
    try:
        integration = get_global_meta_integration(db)
        if not integration:
            logger.warning("Meta analytics cache refresh skipped: no Meta integration")
            return
        bundle = fetch_live_meta_snapshot_bundle(db)
        aid = normalize_meta_ad_account_id(integration.ad_account_id)
        upsert_bundle_for_day(db, aid, utc_calendar_today(), bundle)
        logger.info(
            "Meta analytics cache refreshed ad_account=%s utc_date=%s",
            aid,
            utc_calendar_today(),
        )
    except Exception:
        logger.exception("Meta analytics cache refresh failed")
    finally:
        db.close()
