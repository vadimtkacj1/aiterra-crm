"""Mock Meta campaign snapshot when META_SNAPSHOT_MOCK is enabled."""

from __future__ import annotations

from datetime import date, timedelta

from sqlalchemy import select
from sqlalchemy.orm import Session

from app.models.campaign import TrackedCampaign
from app.schemas.analytics import ActionMetric, CampaignRow, CampaignSnapshot, CampaignTotals, DailyMetric

from .action_types import MOCK_OBJECTIVES, MOCK_STATUSES
from .datetime_util import utc_now_iso
from .insight_rows import aggregate_totals, normalize_campaign_id


def mock_campaign_row(i: int, campaign_id: str, name: str) -> CampaignRow:
    imp = 12000 + i * 3200
    clk = 400 + i * 90
    spend = round(155.8 + i * 42.15, 2)
    conv = 15 + i * 4
    ctr = round(clk / imp * 100, 2) if imp else 0.0
    cpc = round(spend / clk, 4) if clk else 0.0
    cpm = round(spend / imp * 1000, 4) if imp else 0.0
    ilk = max(0, clk - 25)
    uq = max(0, clk - 10)
    objective = MOCK_OBJECTIVES[i % len(MOCK_OBJECTIVES)]
    status = MOCK_STATUSES[i % len(MOCK_STATUSES)]
    leads = (20 + i * 5) if objective == "LEAD_GENERATION" else 0
    purchases = (8 + i * 2) if objective == "CONVERSIONS" else 0
    purchase_value = round(purchases * 45.5, 2)
    roas = round(purchase_value / spend, 2) if spend > 0 and purchase_value > 0 else 0.0
    return CampaignRow(
        campaignId=normalize_campaign_id(campaign_id),
        campaignName=name,
        impressions=imp,
        clicks=clk,
        spend=spend,
        conversions=conv,
        ctr=ctr,
        objective=objective,
        status=status,
        leads=leads,
        purchases=purchases,
        purchaseValue=purchase_value,
        roas=roas,
        reach=int(imp * 0.88),
        frequency=1.15,
        cpc=cpc,
        cpm=cpm,
        inlineLinkClicks=ilk,
        inlineLinkClickCtr=round(ilk / imp * 100, 2) if imp else 0.0,
        costPerInlineLinkClick=round(spend / max(1, ilk), 4),
        uniqueClicks=uq,
        uniqueCtr=1.8,
        costPerUniqueClick=round(spend / max(1, uq), 4),
        outboundClicks=clk // 2,
        linkClicks=max(0, clk - 30),
        landingPageViews=180 + i * 40,
        postEngagement=90 + i * 20,
        videoViews=1200 + i * 200,
        actionBreakdown=[
            ActionMetric(actionType="link_click", value=max(0, clk - 30)),
            ActionMetric(actionType="landing_page_view", value=180 + i * 40),
        ],
    )


def meta_campaign_snapshot_mock(db: Session, account_id: int) -> CampaignSnapshot:
    tracked = db.scalars(
        select(TrackedCampaign).where(
            TrackedCampaign.account_id == account_id,
            TrackedCampaign.platform == "meta",
        )
    ).all()
    rows: list[CampaignRow] = []
    for i, t in enumerate(tracked):
        rows.append(mock_campaign_row(i, t.meta_campaign_id, t.name))
    if not rows:
        rows = [
            mock_campaign_row(0, "mock_1", "Mock — Awareness"),
            mock_campaign_row(1, "mock_2", "Mock — Conversions"),
        ]
    merged = sorted(rows, key=lambda r: (-r.spend, r.campaignName.lower()))
    totals = aggregate_totals(merged)

    daily: list[DailyMetric] = []
    today = date.today()
    for i in range(29, -1, -1):
        d = today - timedelta(days=i)
        imp_d = 400 + (i % 7) * 50
        clk_d = 18 + (i % 5) * 3
        spend_d = round(5.2 + (i % 4) * 0.8, 2)
        daily.append(
            DailyMetric(
                date=d.isoformat(),
                impressions=imp_d,
                clicks=clk_d,
                spend=spend_d,
                conversions=2 + (i % 3),
                reach=int(imp_d * 0.9),
                ctr=round(clk_d / imp_d * 100, 2) if imp_d else 0.0,
                cpc=round(spend_d / clk_d, 4) if clk_d else 0.0,
                cpm=round(spend_d / imp_d * 1000, 4) if imp_d else 0.0,
            )
        )

    return CampaignSnapshot(
        currency="USD",
        periodLabel="Last 30 days (mock)",
        periodI18nKey="analytics.period.last30Days",
        updatedAt=utc_now_iso(),
        totals=totals,
        rows=merged,
        dailyBreakdown=daily,
    )


def empty_meta_campaign_snapshot() -> CampaignSnapshot:
    """No Meta campaigns linked to this business — do not call Graph API."""
    return CampaignSnapshot(
        currency="USD",
        periodLabel="Last 30 days",
        periodI18nKey="analytics.period.last30Days",
        updatedAt=utc_now_iso(),
        totals=CampaignTotals(
            impressions=0,
            clicks=0,
            spend=0.0,
            conversions=0,
        ),
        rows=[],
        dailyBreakdown=[],
    )
