"""Meta Marketing API: campaigns and insights (Graph)."""

from __future__ import annotations

from typing import Any

import httpx

from app.services.meta_graph import GRAPH_ROOT, normalize_meta_ad_account_id

# Action types summed into "conversions" (CRM-facing; tune as needed).
_CONVERSION_ACTION_TYPES = frozenset(
    {
        "lead",
        "purchase",
        "omni_purchase",
        "complete_registration",
        "submit_application",
        "offsite_conversion.fb_pixel_purchase",
        "offsite_conversion.fb_pixel_lead",
        "onsite_conversion.lead_grouped",
        "onsite_conversion.messaging_conversation_started_7d",
    }
)


def _graph_error(data: Any, fallback: str) -> str:
    if isinstance(data, dict):
        err = data.get("error", {})
        if isinstance(err, dict) and err.get("message"):
            return str(err["message"])
    return fallback


def as_int(v: Any) -> int:
    if v is None:
        return 0
    if isinstance(v, bool):
        return int(v)
    if isinstance(v, int):
        return v
    try:
        return int(float(str(v)))
    except (TypeError, ValueError):
        return 0


def as_float(v: Any) -> float:
    if v is None:
        return 0.0
    if isinstance(v, (int, float)):
        return float(v)
    try:
        return float(str(v))
    except (TypeError, ValueError):
        return 0.0


def scalar_str(v: Any) -> str:
    if v is None:
        return ""
    if isinstance(v, list) and v:
        return scalar_str(v[0])
    return str(v)


def sum_nested_metric_list(entries: Any) -> int:
    """Sum `value` from Meta list fields like outbound_clicks."""
    if not isinstance(entries, list):
        return 0
    total = 0
    for item in entries:
        if isinstance(item, dict):
            total += as_int(item.get("value"))
    return total


def sum_conversions_from_actions(actions: Any) -> int:
    if not isinstance(actions, list):
        return 0
    total = 0
    for a in actions:
        if not isinstance(a, dict):
            continue
        at = a.get("action_type")
        if at not in _CONVERSION_ACTION_TYPES:
            continue
        total += as_int(a.get("value"))
    return total


def fetch_ad_account_currency(ad_account_id: str, access_token: str) -> tuple[str, str | None]:
    aid = normalize_meta_ad_account_id(ad_account_id)
    url = f"{GRAPH_ROOT}/{aid}"
    try:
        r = httpx.get(
            url,
            params={"fields": "currency", "access_token": access_token},
            timeout=60.0,
        )
    except httpx.RequestError as e:
        return "USD", f"meta_graph_unreachable: {e}"
    data = r.json()
    if r.status_code != 200:
        return "USD", _graph_error(data, r.text)
    cur = data.get("currency") if isinstance(data, dict) else None
    return (str(cur).upper() if cur else "USD"), None


def _paged_data(url: str, params: dict[str, Any] | None, access_token: str) -> tuple[list[dict[str, Any]], str | None]:
    """GET first page with params, then follow paging.next until done."""
    rows: list[dict[str, Any]] = []
    next_url: str | None = None
    first = True
    while True:
        try:
            if first:
                p = {"access_token": access_token, **(params or {})}
                r = httpx.get(url, params=p, timeout=120.0)
                first = False
            else:
                r = httpx.get(next_url or "", timeout=120.0)
        except httpx.RequestError as e:
            return [], f"meta_graph_unreachable: {e}"
        data = r.json()
        if r.status_code != 200:
            return [], _graph_error(data, r.text)
        if not isinstance(data, dict):
            return [], "meta_invalid_response"
        chunk = data.get("data")
        if isinstance(chunk, list):
            for item in chunk:
                if isinstance(item, dict):
                    rows.append(item)
        paging = data.get("paging") if isinstance(data.get("paging"), dict) else {}
        next_url = paging.get("next") if isinstance(paging, dict) else None
        if not next_url:
            break
    return rows, None


def fetch_campaign_level_insights(
    ad_account_id: str,
    access_token: str,
    *,
    date_preset: str = "last_30d",
    since: str | None = None,
    until: str | None = None,
) -> tuple[list[dict[str, Any]], str | None]:
    """Campaign-level insights. Uses custom date range (since/until) when provided, else date_preset."""
    aid = normalize_meta_ad_account_id(ad_account_id)
    base_url = f"{GRAPH_ROOT}/{aid}/insights"
    params: dict[str, Any] = {
        "level": "campaign",
        "fields": (
            "campaign_id,campaign_name,impressions,clicks,spend,ctr,cpc,cpm,reach,frequency,actions,"
            "action_values,inline_link_clicks,inline_link_click_ctr,cost_per_inline_link_click,"
            "unique_clicks,cost_per_unique_click,unique_ctr,outbound_clicks"
        ),
        "limit": 500,
    }
    if since and until:
        params["time_range"] = f'{{"since":"{since}","until":"{until}"}}'
    else:
        params["date_preset"] = date_preset
    return _paged_data(base_url, params, access_token)


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
    base_url = f"{GRAPH_ROOT}/{aid}/insights"
    params: dict[str, Any] = {
        "level": "account",
        "time_increment": "1",
        "fields": "date_start,impressions,clicks,spend,ctr,cpc,cpm,reach,actions",
        "limit": 500,
    }
    if since and until:
        params["time_range"] = f'{{"since":"{since}","until":"{until}"}}'
    else:
        params["date_preset"] = date_preset
    return _paged_data(base_url, params, access_token)


def fetch_ad_account_info(
    ad_account_id: str,
    access_token: str,
) -> tuple[dict[str, Any], str | None]:
    """Fetch ad account financial fields (balance, amount_spent, spend_cap, funding source)."""
    aid = normalize_meta_ad_account_id(ad_account_id)
    url = f"{GRAPH_ROOT}/{aid}"
    fields = (
        "name,currency,amount_spent,balance,spend_cap,"
        "funding_source_details,account_status,disable_reason"
    )
    try:
        r = httpx.get(
            url,
            params={"fields": fields, "access_token": access_token},
            timeout=60.0,
        )
    except httpx.RequestError as e:
        return {}, f"meta_graph_unreachable: {e}"
    data = r.json()
    if r.status_code != 200:
        return {}, _graph_error(data, r.text)
    return data if isinstance(data, dict) else {}, None


def fetch_ad_account_billing_transactions(
    ad_account_id: str,
    access_token: str,
) -> tuple[list[dict[str, Any]], str | None]:
    """Fetch billing/transaction history from the ad account."""
    aid = normalize_meta_ad_account_id(ad_account_id)
    base_url = f"{GRAPH_ROOT}/{aid}/transactions"
    params = {
        "fields": "id,time,amount,currency,status,type",
        "limit": 200,
    }
    return _paged_data(base_url, params, access_token)


def fetch_ad_account_campaigns(ad_account_id: str, access_token: str) -> tuple[list[dict[str, str]], str | None]:
    """Campaigns in the ad account (id + name + status + objective)."""
    aid = normalize_meta_ad_account_id(ad_account_id)
    base_url = f"{GRAPH_ROOT}/{aid}/campaigns"
    params = {
        "fields": "id,name,status,effective_status,objective",
        "limit": 500,
    }
    raw, err = _paged_data(base_url, params, access_token)
    if err:
        return [], err
    out: list[dict[str, str]] = []
    for row in raw:
        cid = scalar_str(row.get("id"))
        if not cid:
            continue
        name = scalar_str(row.get("name")) or cid
        status = scalar_str(row.get("effective_status") or row.get("status")) or "ACTIVE"
        objective = scalar_str(row.get("objective") or "")
        out.append({"id": cid, "name": name, "status": status, "objective": objective})
    return out, None


def fetch_campaign_ads(
    campaign_id: str,
    access_token: str,
    *,
    since: str | None = None,
    until: str | None = None,
    date_preset: str = "last_30d",
) -> tuple[list[dict[str, Any]], str | None]:
    """Ad-level insights for a single campaign including creative thumbnail URLs."""
    base_url = f"{GRAPH_ROOT}/{campaign_id}/ads"
    # First fetch ads with creative thumbnails
    ads_params: dict[str, Any] = {
        "fields": "id,name,creative{id,thumbnail_url,image_url,object_story_spec}",
        "limit": 200,
    }
    ads_raw, err = _paged_data(base_url, ads_params, access_token)
    if err:
        return [], err

    # Fetch high-res thumbnails + video URLs for video creatives
    creative_ids = [
        scalar_str((ad.get("creative") or {}).get("id"))
        for ad in ads_raw
        if isinstance(ad, dict) and not (ad.get("creative") or {}).get("image_url")
        and (ad.get("creative") or {}).get("id")
    ]
    hires_by_creative: dict[str, str] = {}
    video_url_by_creative: dict[str, str] = {}
    permalink_by_creative: dict[str, str] = {}
    for cid in creative_ids:
        try:
            r = httpx.get(
                f"{GRAPH_ROOT}/{cid}",
                params={"fields": "thumbnail_url,video_id,object_story_spec", "thumbnail_width": 600, "thumbnail_height": 315, "access_token": access_token},
                timeout=30.0,
            )
            if r.status_code == 200:
                data = r.json()
                url = data.get("thumbnail_url", "")
                if url:
                    hires_by_creative[cid] = url
                story_spec = data.get("object_story_spec") or {}
                video_id = data.get("video_id", "") or (story_spec.get("video_data") or {}).get("video_id", "")
                if video_id:
                    try:
                        vr = httpx.get(
                            f"{GRAPH_ROOT}/{video_id}",
                            params={"fields": "source,permalink_url", "access_token": access_token},
                            timeout=30.0,
                        )
                        if vr.status_code == 200:
                            vdata = vr.json()
                            vsrc = vdata.get("source", "")
                            permalink = vdata.get("permalink_url", "")
                            if vsrc:
                                video_url_by_creative[cid] = vsrc
                            if permalink:
                                permalink_by_creative[cid] = permalink
                    except httpx.RequestError:
                        pass
        except httpx.RequestError:
            pass

    # Then fetch insights per ad
    insights_url = f"{GRAPH_ROOT}/{campaign_id}/insights"
    ins_params: dict[str, Any] = {
        "level": "ad",
        "fields": "ad_id,ad_name,impressions,clicks,spend,ctr,actions",
        "limit": 200,
    }
    if since and until:
        ins_params["time_range"] = f'{{"since":"{since}","until":"{until}"}}'
    else:
        ins_params["date_preset"] = date_preset

    insights_raw, ierr = _paged_data(insights_url, ins_params, access_token)
    if ierr:
        insights_raw = []

    # Index insights by ad_id
    insights_by_id: dict[str, dict[str, Any]] = {}
    for ins in insights_raw:
        if isinstance(ins, dict):
            aid = scalar_str(ins.get("ad_id"))
            if aid:
                insights_by_id[aid] = ins

    # Merge ads + insights
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
        thumbnail = image_url or hires_by_creative.get(creative_id) or scalar_str(creative.get("thumbnail_url") if isinstance(creative, dict) else "")
        ins = insights_by_id.get(ad_id, {})
        result.append({
            "adId": ad_id,
            "adName": scalar_str(ad.get("name")) or ad_id,
            "thumbnailUrl": thumbnail,
            "videoUrl": video_url_by_creative.get(creative_id, ""),
            "permalinkUrl": permalink_by_creative.get(creative_id, ""),
            "impressions": as_int(ins.get("impressions")),
            "clicks": as_int(ins.get("clicks")),
            "spend": round(as_float(ins.get("spend")), 2),
            "ctr": round(as_float(ins.get("ctr")), 2),
            "actions": ins.get("actions"),
        })
    return result, None
