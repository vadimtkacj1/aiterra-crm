from __future__ import annotations

from collections import defaultdict
from datetime import datetime, timezone

from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.api.deps import require_admin
from app.api.routes.admin import common
from app.db.session import get_db
from app.jobs.meta_analytics_cache_job import run_meta_analytics_cache_refresh_sync
from app.models.billing import BillingInstructionHistory
from app.models.campaign import TrackedCampaign
from app.models.core import Account, User
from app.schemas.admin import (
    AdminPaymentCurrencySummary,
    AdminPaymentStatsBucket,
    AdminPaymentStatsOut,
    AdminStats,
)
from app.services import zcredit_service
from app.services.meta.integration import get_global_meta_integration

router = APIRouter()


@router.post("/meta/analytics-cache/refresh", summary="Warm Meta analytics daily cache (global ad account)")
def refresh_meta_analytics_cache(_: User = Depends(require_admin)) -> dict[str, bool]:
    """Runs the same job as the UTC cron: one Graph bundle → DB for today's date."""
    run_meta_analytics_cache_refresh_sync()
    return {"ok": True}


@router.get("/stats", response_model=AdminStats)
def get_admin_stats(db: Session = Depends(get_db), _: User = Depends(require_admin)) -> AdminStats:
    users_total = db.query(User).count()
    admins_total = db.query(User).filter(User.role == "admin").count()
    accounts_total = db.query(Account).count()
    campaigns_total = db.query(TrackedCampaign).count()
    integration = get_global_meta_integration(db)
    return AdminStats(
        usersTotal=users_total,
        adminsTotal=admins_total,
        regularUsersTotal=users_total - admins_total,
        accountsTotal=accounts_total,
        trackedCampaignsTotal=campaigns_total,
        metaConnected=integration is not None,
    )


@router.get("/stats/payments", response_model=AdminPaymentStatsOut)
def get_admin_payment_stats(
    startDate: str | None = None,
    endDate: str | None = None,
    year: int | None = None,
    groupBy: str = "month",
    db: Session = Depends(get_db),
    _: User = Depends(require_admin),
) -> AdminPaymentStatsOut:
    rows = db.query(BillingInstructionHistory).order_by(BillingInstructionHistory.created_at.asc()).all()

    available_years = sorted(
        {
            r.created_at.year
            for r in rows
            if getattr(r, "created_at", None) is not None and hasattr(r.created_at, "year")
        }
    )

    start_dt = common.parse_date_start(startDate)
    end_dt = common.parse_date_end(endDate)
    if year and not start_dt and not end_dt:
        start_dt = datetime(year, 1, 1, tzinfo=timezone.utc)
        end_dt = datetime(year + 1, 1, 1, tzinfo=timezone.utc)

    paid_count = 0
    unpaid_count = 0
    bucket_map: dict[str, dict[str, int]] = defaultdict(lambda: {"paid": 0, "unpaid": 0})
    currency_map: dict[str, dict[str, float]] = defaultdict(lambda: {"paid": 0.0, "unpaid": 0.0})

    for row in rows:
        created_at = getattr(row, "created_at", None)
        if not created_at:
            continue
        created_at = common.as_utc(created_at)
        if start_dt and created_at < start_dt:
            continue
        if end_dt and created_at >= end_dt:
            continue

        inv_st: str | None = None
        sub_st: str | None = None
        if row.payment_doc_id:
            inv = zcredit_service.try_retrieve_invoice(row.payment_doc_id)
            if inv:
                inv_st = str(getattr(inv, "status", "") or "") or None
        if row.payment_recurring_id:
            sub = zcredit_service.try_retrieve_subscription(row.payment_recurring_id)
            if sub:
                sub_st = str(getattr(sub, "status", "") or "") or None

        payment_status = common.payment_status_for_history(row, inv_st, sub_st)
        normalized: str | None = None
        if payment_status == "paid":
            normalized = "paid"
            paid_count += 1
        elif payment_status in ("unpaid", "ongoing", "unknown"):
            normalized = "unpaid"
            unpaid_count += 1
        else:
            continue

        if groupBy == "year":
            label = created_at.strftime("%Y")
        elif groupBy == "day":
            label = created_at.strftime("%Y-%m-%d")
        else:
            label = created_at.strftime("%Y-%m")

        bucket_map[label][normalized] += 1

        cur = (row.currency or "ILS").upper()
        amt = float(row.amount or 0.0)
        currency_map[cur][normalized] += amt

    buckets = [
        AdminPaymentStatsBucket(label=label, paidCount=data["paid"], unpaidCount=data["unpaid"])
        for label, data in sorted(bucket_map.items(), key=lambda x: x[0])
    ]
    currencies = [
        AdminPaymentCurrencySummary(currency=cur, paidAmount=vals["paid"], unpaidAmount=vals["unpaid"])
        for cur, vals in sorted(currency_map.items(), key=lambda x: x[0])
    ]

    return AdminPaymentStatsOut(
        paidCount=paid_count,
        unpaidCount=unpaid_count,
        availableYears=available_years,
        currencies=currencies,
        buckets=buckets,
    )
