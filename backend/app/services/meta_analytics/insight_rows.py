"""Map Meta Graph campaign / daily insight dicts into API row models."""

from __future__ import annotations

import logging

from app.schemas.analytics import ActionMetric, CampaignRow, CampaignTotals
from app.services.meta_marketing import (
    as_float,
    as_int,
    scalar_str,
    sum_conversions_from_actions,
    sum_nested_metric_list,
)

from .action_types import (
    LANDING_ACTIONS,
    LEAD_ACTION_TYPES,
    LINK_CLICK_ACTIONS,
    POST_ENGAGEMENT_ACTIONS,
    PURCHASE_ACTION_TYPES,
    VIDEO_VIEW_ACTIONS,
)


logger = logging.getLogger(__name__)


def normalize_campaign_id(raw: str) -> str:
    return str(raw).strip()


def _sum_action_values(action_values: object, types: frozenset[str]) -> float:
    """Sum purchase_value / action_values for specific action types."""
    if not isinstance(action_values, list):
        return 0.0
    total = 0.0
    for a in action_values:
        if not isinstance(a, dict):
            continue
        at = str(a.get("action_type") or "")
        if at in types:
            total += as_float(a.get("value"))
    return total


def _sum_action_types(actions: object, types: frozenset[str]) -> int:
    if not isinstance(actions, list):
        return 0
    total = 0
    for a in actions:
        if not isinstance(a, dict):
            continue
        at = str(a.get("action_type") or "")
        if at in types:
            total += as_int(a.get("value"))
    return total


def _parse_action_breakdown(actions: object, *, limit: int = 50) -> list[ActionMetric]:
    if not isinstance(actions, list):
        return []
    items: list[ActionMetric] = []
    for a in actions:
        if not isinstance(a, dict):
            continue
        at = str(a.get("action_type") or "").strip()
        if not at:
            continue
        v = as_int(a.get("value"))
        if v > 0:
            items.append(ActionMetric(actionType=at, value=v))
    items.sort(key=lambda x: x.value, reverse=True)
    return items[:limit]


def campaign_insight_to_row(row: dict, *, objective: str = "", status: str = "ACTIVE") -> CampaignRow:
    imp = as_int(row.get("impressions"))
    clk = as_int(row.get("clicks"))
    spend = round(as_float(row.get("spend")), 2)
    ctr = round(as_float(row.get("ctr")), 2)
    actions = row.get("actions")
    action_values = row.get("action_values")
    conv = sum_conversions_from_actions(actions)
    reach = as_int(row.get("reach"))
    frequency = round(as_float(row.get("frequency")), 2)
    cpc = round(as_float(row.get("cpc")), 4)
    cpm = round(as_float(row.get("cpm")), 4)
    cid = scalar_str(row.get("campaign_id"))
    cname = scalar_str(row.get("campaign_name")) or cid

    ilc = as_int(row.get("inline_link_clicks"))
    ilc_ctr = round(as_float(row.get("inline_link_click_ctr")), 2)
    cpilc = round(as_float(row.get("cost_per_inline_link_click")), 4)
    uq = as_int(row.get("unique_clicks"))
    uq_ctr = round(as_float(row.get("unique_ctr")), 2)
    cpuq = round(as_float(row.get("cost_per_unique_click")), 4)
    obc = sum_nested_metric_list(row.get("outbound_clicks"))

    link_clicks = _sum_action_types(actions, LINK_CLICK_ACTIONS)
    landing_pv = _sum_action_types(actions, LANDING_ACTIONS)
    post_eng = _sum_action_types(actions, POST_ENGAGEMENT_ACTIONS)
    vid_views = _sum_action_types(actions, VIDEO_VIEW_ACTIONS)

    leads = _sum_action_types(actions, LEAD_ACTION_TYPES)
    if isinstance(actions, list):
        action_types_present = [str(a.get("action_type")) for a in actions if isinstance(a, dict)]
        logger.info("META actions campaign=%s types=%s leads=%d", cid, action_types_present, leads)
    purchases = _sum_action_types(actions, PURCHASE_ACTION_TYPES)
    purchase_value = round(_sum_action_values(action_values, PURCHASE_ACTION_TYPES), 2)
    roas = round(purchase_value / spend, 2) if spend > 0 and purchase_value > 0 else 0.0

    return CampaignRow(
        campaignId=cid,
        campaignName=cname,
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
        reach=reach,
        frequency=frequency,
        cpc=cpc,
        cpm=cpm,
        inlineLinkClicks=ilc,
        inlineLinkClickCtr=ilc_ctr,
        costPerInlineLinkClick=cpilc,
        uniqueClicks=uq,
        uniqueCtr=uq_ctr,
        costPerUniqueClick=cpuq,
        outboundClicks=obc,
        linkClicks=link_clicks,
        landingPageViews=landing_pv,
        postEngagement=post_eng,
        videoViews=vid_views,
        actionBreakdown=_parse_action_breakdown(actions),
    )


def empty_campaign_row(cid: str, name: str) -> CampaignRow:
    return CampaignRow(
        campaignId=cid,
        campaignName=name or cid,
        impressions=0,
        clicks=0,
        spend=0.0,
        conversions=0,
        ctr=0.0,
    )


def aggregate_totals(rows: list[CampaignRow]) -> CampaignTotals:
    imp_t = sum(r.impressions for r in rows)
    clk_t = sum(r.clicks for r in rows)
    spend_t = round(sum(r.spend for r in rows), 2)
    reach_t = sum(r.reach for r in rows)
    freq_t = round(sum(r.frequency * r.impressions for r in rows) / imp_t, 2) if imp_t else 0.0
    cpc_t = round(spend_t / clk_t, 4) if clk_t else 0.0
    cpm_t = round(spend_t / imp_t * 1000, 4) if imp_t else 0.0
    ilk_t = sum(r.inlineLinkClicks for r in rows)
    uq_t = sum(r.uniqueClicks for r in rows)
    ob_t = sum(r.outboundClicks for r in rows)
    lk_t = sum(r.linkClicks for r in rows)
    lp_t = sum(r.landingPageViews for r in rows)
    pe_t = sum(r.postEngagement for r in rows)
    vv_t = sum(r.videoViews for r in rows)
    cpilc_t = round(spend_t / ilk_t, 4) if ilk_t else 0.0
    cpuq_t = round(spend_t / uq_t, 4) if uq_t else 0.0
    leads_t = sum(r.leads for r in rows)
    purchases_t = sum(r.purchases for r in rows)
    purchase_value_t = round(sum(r.purchaseValue for r in rows), 2)
    roas_t = round(purchase_value_t / spend_t, 2) if spend_t > 0 and purchase_value_t > 0 else 0.0
    return CampaignTotals(
        impressions=imp_t,
        clicks=clk_t,
        spend=spend_t,
        conversions=sum(r.conversions for r in rows),
        leads=leads_t,
        purchases=purchases_t,
        purchaseValue=purchase_value_t,
        roas=roas_t,
        reach=reach_t,
        frequency=freq_t,
        cpc=cpc_t,
        cpm=cpm_t,
        inlineLinkClicks=ilk_t,
        uniqueClicks=uq_t,
        outboundClicks=ob_t,
        linkClicks=lk_t,
        landingPageViews=lp_t,
        postEngagement=pe_t,
        videoViews=vv_t,
        costPerInlineLinkClick=cpilc_t,
        costPerUniqueClick=cpuq_t,
    )
