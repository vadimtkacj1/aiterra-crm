import asyncio
import logging
from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.api.router import api_router
from app.core.settings import settings
from app.db.session import init_db

logger = logging.getLogger(__name__)


def _log_smtp_env() -> None:
    """Helps debug 'works locally, fails in Docker': container often has a different/missing env_file."""
    if settings.smtp_host:
        logger.info(
            "SMTP configured in this process: host=%s port=%s user=%s password_set=%s tls=%s ssl=%s ehlo=%s",
            settings.smtp_host,
            settings.smtp_port,
            settings.smtp_user,
            bool(settings.smtp_password),
            settings.smtp_use_tls,
            settings.smtp_use_ssl,
            settings.smtp_local_hostname,
        )
    else:
        logger.warning(
            "SMTP disabled: EMAIL_HOST empty. Docker: check env_file in docker-compose (e.g. backend/.env), "
            "then `docker compose up -d --force-recreate backend` — `restart` alone may not reload env."
        )


@asynccontextmanager
async def lifespan(app: FastAPI):
    await asyncio.to_thread(init_db)
    _log_smtp_env()

    from app.services.whatsapp.queue import wa_queue
    wa_queue.start()

    scheduler = None
    try:
        from apscheduler.schedulers.background import BackgroundScheduler
    except ImportError:
        logger.warning(
            "APScheduler not installed — background jobs disabled. "
            'Install: pip install "APScheduler>=3.10,<4" (see requirements.txt)'
        )
    else:
        scheduler = BackgroundScheduler(timezone="UTC")

        if settings.subscription_billing_cron_enabled:
            from app.jobs.billing_charge_job import run_subscription_billing_sync

            # Daily subscription billing — runs at 06:00 UTC every day
            scheduler.add_job(
                run_subscription_billing_sync,
                "cron",
                hour=6,
                minute=0,
                id="subscription_daily_billing",
                replace_existing=True,
            )
            logger.info("subscription billing job scheduled (06:00 UTC daily)")
        else:
            logger.info("subscription billing job disabled (SUBSCRIPTION_BILLING_CRON_ENABLED=false)")

        # Test billing — always scheduled; only fires for subscriptions with test_interval_minutes set.
        # Safe in production: if no subscription has test_interval_minutes, the job does nothing.
        from app.jobs.billing_charge_job import run_test_billing_sync

        scheduler.add_job(
            run_test_billing_sync,
            "interval",
            minutes=1,
            id="subscription_test_billing",
            replace_existing=True,
        )
        logger.info("test billing job scheduled (every 1 minute, fires only when test_interval_minutes is set)")

        if (
            settings.meta_analytics_cache_cron_enabled
            and settings.meta_analytics_cache_enabled
            and not settings.meta_snapshot_mock
        ):
            from app.jobs.meta_analytics_cache_job import run_meta_analytics_cache_refresh_sync

            scheduler.add_job(
                run_meta_analytics_cache_refresh_sync,
                "cron",
                hour=settings.meta_analytics_cache_cron_hour_utc,
                minute=settings.meta_analytics_cache_cron_minute_utc,
                id="meta_analytics_daily_cache",
                replace_existing=True,
            )

        scheduler.start()

    yield

    if scheduler is not None:
        scheduler.shutdown(wait=False)


app = FastAPI(title="CRM API", version="0.1.0", lifespan=lifespan)

app.add_middleware(
    CORSMiddleware,
    # "*" lets any website submit the public lead-capture form.
    # JWT auth uses Authorization: Bearer header (not cookies) so credentials=False is correct.
    allow_origins=["*"],
    allow_credentials=False,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(api_router, prefix="/api")


@app.get("/api/health", tags=["health"])
def health() -> dict:
    return {"status": "ok"}

