"""Turn a cached or freshly fetched Meta bundle into CampaignSnapshot for one CRM account."""

from __future__ import annotations

from app.schemas.analytics import CampaignSnapshot, DailyMetric
from app.schemas.meta_snapshot_bundle import MetaSnapshotBundle
from ..marketing import as_float, as_int, scalar_str, sum_conversions_from_actions

from .datetime_util import utc_now_iso
from .insight_rows import (
    aggregate_totals,
    campaign_insight_to_row,
    empty_campaign_row,
    normalize_campaign_id,
)


def assemble_campaign_snapshot_from_bundle(
    bundle: MetaSnapshotBundle,
    tracked_ids: set[str],
) -> CampaignSnapshot:
    all_meta_campaigns = bundle.all_meta_campaigns
    campaign_meta: dict[str, dict[str, str]] = {
        normalize_campaign_id(c["id"]): c for c in all_meta_campaigns if c.get("id")
    }

    rows_out = []
    for r in bundle.raw_rows:
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

    daily: list[DailyMetric] = []
    for d in bundle.daily_rows:
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
        currency=bundle.currency,
        periodLabel=bundle.period_label,
        periodI18nKey=bundle.period_i18n,
        updatedAt=bundle.fetched_at_iso or utc_now_iso(),
        totals=totals,
        rows=merged,
        dailyBreakdown=daily,
    )
