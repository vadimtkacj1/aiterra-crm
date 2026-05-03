"""Low-level Meta Graph API HTTP client with pagination."""

from __future__ import annotations

from typing import Any

import httpx

from .graph import GRAPH_ROOT


def _graph_error(data: Any, fallback: str) -> str:
    if isinstance(data, dict):
        err = data.get("error", {})
        if isinstance(err, dict) and err.get("message"):
            return str(err["message"])
    return fallback


def paged_get(
    url: str,
    params: dict[str, Any] | None,
    access_token: str,
) -> tuple[list[dict[str, Any]], str | None]:
    """GET first page with params, then follow paging.next until exhausted."""
    rows: list[dict[str, Any]] = []
    next_url: str | None = None
    first = True
    while True:
        try:
            if first:
                r = httpx.get(url, params={"access_token": access_token, **(params or {})}, timeout=120.0)
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
            rows.extend(item for item in chunk if isinstance(item, dict))

        paging = data.get("paging") if isinstance(data.get("paging"), dict) else {}
        next_url = paging.get("next") if isinstance(paging, dict) else None
        if not next_url:
            break

    return rows, None


def graph_get(
    node: str,
    access_token: str,
    fields: str,
    timeout: float = 60.0,
    extra_params: dict[str, Any] | None = None,
) -> tuple[dict[str, Any], str | None]:
    """Single-node GET. Returns (data_dict, error_or_None)."""
    url = f"{GRAPH_ROOT}/{node}"
    params: dict[str, Any] = {"fields": fields, "access_token": access_token, **(extra_params or {})}
    try:
        r = httpx.get(url, params=params, timeout=timeout)
    except httpx.RequestError as e:
        return {}, f"meta_graph_unreachable: {e}"
    data = r.json()
    if r.status_code != 200:
        return {}, _graph_error(data, r.text)
    return data if isinstance(data, dict) else {}, None
