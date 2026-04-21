"""Meta Marketing API helpers (Graph)."""

from __future__ import annotations

import httpx

# Meta deprecates old versions; v21+ auto-upgrades server-side — pin current stable.
GRAPH_ROOT = "https://graph.facebook.com/v25.0"


def normalize_meta_ad_account_id(raw: str) -> str:
    s = raw.strip()
    if s.isdigit():
        return f"act_{s}"
    return s


def fetch_meta_ad_accounts(access_token: str) -> tuple[list[dict[str, str]], str | None]:
    """
    Returns (accounts as {id, name}, error_message).
    error_message is set on network failure or Graph error.
    """
    url = f"{GRAPH_ROOT}/me/adaccounts"
    try:
        r = httpx.get(
            url,
            params={"fields": "id,name,account_id", "access_token": access_token},
            timeout=30.0,
        )
    except httpx.RequestError as e:
        return [], f"meta_graph_unreachable: {e}"

    data = r.json()
    if r.status_code != 200:
        err = data.get("error", {}) if isinstance(data, dict) else {}
        msg = err.get("message", r.text) if isinstance(err, dict) else r.text
        return [], str(msg)

    rows = data.get("data") if isinstance(data, dict) else None
    if not isinstance(rows, list):
        return [], None

    accounts: list[dict[str, str]] = []
    for item in rows:
        if not isinstance(item, dict):
            continue
        aid = item.get("id")
        if isinstance(aid, str):
            accounts.append({"id": aid, "name": item.get("name") or aid})
    return accounts, None
