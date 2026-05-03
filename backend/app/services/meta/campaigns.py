"""Campaign and ad-level Meta API fetchers."""

from __future__ import annotations

from typing import Any

import httpx

from .graph import GRAPH_ROOT, normalize_meta_ad_account_id
from .http import paged_get
from .utils import as_float, as_int, scalar_str

_CAMPAIGN_INSIGHT_FIELDS = (
    "campaign_id,campaign_name,impressions,clicks,spend,ctr,cpc,cpm,reach,frequency,actions,"
    "action_values,inline_link_clicks,inline_link_click_ctr,cost_per_inline_link_click,"
    "unique_clicks,cost_per_unique_click,unique_ctr,outbound_clicks"
)

_AD_INSIGHT_FIELDS = "ad_id,ad_name,impressions,clicks,spend,ctr,actions"


def _date_params(
    since: str | None,
    until: str | None,
    date_preset: str,
) -> dict[str, Any]:
    if since and until:
        return {"time_range": f'{{"since":"{since}","until":"{until}"}}'}
    return {"date_preset": date_preset}


def fetch_campaign_level_insights(
    ad_account_id: str,
    access_token: str,
    *,
    date_preset: str = "last_30d",
    since: str | None = None,
    until: str | None = None,
) -> tuple[list[dict[str, Any]], str | None]:
    """Campaign-level insights. Uses custom date range when provided, else date_preset."""
    aid = normalize_meta_ad_account_id(ad_account_id)
    params: dict[str, Any] = {
        "level": "campaign",
        "fields": _CAMPAIGN_INSIGHT_FIELDS,
        "limit": 500,
        **_date_params(since, until, date_preset),
    }
    return paged_get(f"{GRAPH_ROOT}/{aid}/insights", params, access_token)


def fetch_daily_account_insights(
    ad_account_id: str,
    access_token: str,
    *,
    date_preset: str = "last_30d",
    since: str | None = None,
    until: str | None = None,
) -> tuple[list[dict[str, Any]], str | None]:
    """Daily (time_increment=1) account-level insights for trend charts."""
    aid = normalize_meta_ad_account_id(ad_account_id)
    params: dict[str, Any] = {
        "level": "account",
        "time_increment": "1",
        "fields": "date_start,impressions,clicks,spend,ctr,cpc,cpm,reach,actions",
        "limit": 500,
        **_date_params(since, until, date_preset),
    }
    return paged_get(f"{GRAPH_ROOT}/{aid}/insights", params, access_token)


def fetch_ad_account_campaigns(
    ad_account_id: str,
    access_token: str,
) -> tuple[list[dict[str, str]], str | None]:
    """Campaigns in the ad account (id, name, status, objective)."""
    aid = normalize_meta_ad_account_id(ad_account_id)
    raw, err = paged_get(
        f"{GRAPH_ROOT}/{aid}/campaigns",
        {"fields": "id,name,status,effective_status,objective", "limit": 500},
        access_token,
    )
    if err:
        return [], err

    out: list[dict[str, str]] = []
    for row in raw:
        cid = scalar_str(row.get("id"))
        if not cid:
            continue
        out.append({
            "id": cid,
            "name": scalar_str(row.get("name")) or cid,
            "status": scalar_str(row.get("effective_status") or row.get("status")) or "ACTIVE",
            "objective": scalar_str(row.get("objective") or ""),
        })
    return out, None


def _fetch_creative_media(
    creative_id: str,
    access_token: str,
) -> tuple[str, str, str]:
    """Return (image_url, video_url, permalink_url) for a creative id."""
    try:
        r = httpx.get(
            f"{GRAPH_ROOT}/{creative_id}",
            params={
                "fields": "thumbnail_url,image_url,video_id,object_story_spec",
                "thumbnail_width": 1080,
                "thumbnail_height": 1080,
                "access_token": access_token,
            },
            timeout=30.0,
        )
        if r.status_code != 200:
            return "", "", ""
        data = r.json()
    except httpx.RequestError:
        return "", "", ""

    story_spec = data.get("object_story_spec") or {}
    link_data = story_spec.get("link_data") or {}
    video_data = story_spec.get("video_data") or {}

    image_url = (
        data.get("image_url", "")
        or link_data.get("picture", "")
        or link_data.get("image_url", "")
        or video_data.get("image_url", "")
        or data.get("thumbnail_url", "")
    )

    video_id = data.get("video_id", "") or video_data.get("video_id", "")
    video_url, permalink = "", ""
    if video_id:
        try:
            vr = httpx.get(
                f"{GRAPH_ROOT}/{video_id}",
                params={"fields": "source,permalink_url", "access_token": access_token},
                timeout=30.0,
            )
            if vr.status_code == 200:
                vdata = vr.json()
                video_url = vdata.get("source", "")
                permalink = vdata.get("permalink_url", "")
        except httpx.RequestError:
            pass

    return image_url, video_url, permalink


def fetch_campaign_ads(
    campaign_id: str,
    access_token: str,
    *,
    since: str | None = None,
    until: str | None = None,
    date_preset: str = "last_30d",
) -> tuple[list[dict[str, Any]], str | None]:
    """Ad-level insights for a single campaign including creative thumbnail URLs."""
    ads_raw, err = paged_get(
        f"{GRAPH_ROOT}/{campaign_id}/ads",
        {"fields": "id,name,creative{id,thumbnail_url,image_url,object_story_spec}", "limit": 200},
        access_token,
    )
    if err:
        return [], err

    # Resolve high-res thumbnails for ads that don't already have image_url
    hires: dict[str, str] = {}
    video_urls: dict[str, str] = {}
    permalinks: dict[str, str] = {}
    for ad in ads_raw:
        creative = ad.get("creative") or {}
        if not isinstance(creative, dict):
            continue
        if creative.get("image_url"):
            continue
        cid = scalar_str(creative.get("id"))
        if not cid:
            continue
        img, vid, perm = _fetch_creative_media(cid, access_token)
        if img:
            hires[cid] = img
        if vid:
            video_urls[cid] = vid
        if perm:
            permalinks[cid] = perm

    # Ad-level insights
    insights_raw, _ = paged_get(
        f"{GRAPH_ROOT}/{campaign_id}/insights",
        {
            "level": "ad",
            "fields": _AD_INSIGHT_FIELDS,
            "limit": 200,
            **_date_params(since, until, date_preset),
        },
        access_token,
    )
    insights_by_id: dict[str, dict[str, Any]] = {
        scalar_str(ins.get("ad_id")): ins
        for ins in insights_raw
        if isinstance(ins, dict) and ins.get("ad_id")
    }

    result: list[dict[str, Any]] = []
    for ad in ads_raw:
        if not isinstance(ad, dict):
            continue
        ad_id = scalar_str(ad.get("id"))
        if not ad_id:
            continue
        creative = ad.get("creative") or {}
        creative_id = scalar_str(creative.get("id") if isinstance(creative, dict) else "")

        image_url = scalar_str(creative.get("image_url") if isinstance(creative, dict) else "")
        if not image_url and isinstance(creative, dict):
            spec = creative.get("object_story_spec") or {}
            ld = spec.get("link_data") or {}
            image_url = scalar_str(ld.get("picture", "") or ld.get("image_url", ""))

        ins = insights_by_id.get(ad_id, {})
        result.append({
            "adId": ad_id,
            "adName": scalar_str(ad.get("name")) or ad_id,
            "thumbnailUrl": image_url or hires.get(creative_id, "") or scalar_str(creative.get("thumbnail_url") if isinstance(creative, dict) else ""),
            "videoUrl": video_urls.get(creative_id, ""),
            "permalinkUrl": permalinks.get(creative_id, ""),
            "impressions": as_int(ins.get("impressions")),
            "clicks": as_int(ins.get("clicks")),
            "spend": round(as_float(ins.get("spend")), 2),
            "ctr": round(as_float(ins.get("ctr")), 2),
            "actions": ins.get("actions"),
        })
    return result, None
