"""Account-level Meta API fetchers (currency, info, transactions)."""

from __future__ import annotations

from typing import Any

from .graph import GRAPH_ROOT, normalize_meta_ad_account_id
from .http import graph_get, paged_get


def fetch_ad_account_currency(ad_account_id: str, access_token: str) -> tuple[str, str | None]:
    aid = normalize_meta_ad_account_id(ad_account_id)
    data, err = graph_get(aid, access_token, fields="currency")
    if err:
        return "USD", err
    cur = data.get("currency")
    return (str(cur).upper() if cur else "USD"), None


def fetch_ad_account_info(
    ad_account_id: str,
    access_token: str,
) -> tuple[dict[str, Any], str | None]:
    """Ad account financial fields: balance, amount_spent, spend_cap, funding source."""
    aid = normalize_meta_ad_account_id(ad_account_id)
    fields = (
        "name,currency,amount_spent,balance,spend_cap,"
        "funding_source_details,account_status,disable_reason"
    )
    return graph_get(aid, access_token, fields=fields)


def fetch_ad_account_billing_transactions(
    ad_account_id: str,
    access_token: str,
) -> tuple[list[dict[str, Any]], str | None]:
    """Billing / transaction history for the ad account."""
    aid = normalize_meta_ad_account_id(ad_account_id)
    return paged_get(
        f"{GRAPH_ROOT}/{aid}/transactions",
        {"fields": "id,time,amount,currency,status,type", "limit": 200},
        access_token,
    )
