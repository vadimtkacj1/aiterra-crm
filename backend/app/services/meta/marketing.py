"""Re-export barrel — keeps existing imports working after decomposition.

Sub-modules (same package):
  utils      — type coercion helpers
  http       — paged_get / graph_get HTTP primitives
  account    — account-level fetchers
  campaigns  — campaign / ad-level fetchers
"""

from .account import (
    fetch_ad_account_billing_transactions,
    fetch_ad_account_currency,
    fetch_ad_account_info,
)
from .campaigns import (
    fetch_ad_account_campaigns,
    fetch_campaign_ads,
    fetch_campaign_level_insights,
    fetch_daily_account_insights,
)
from .utils import (
    as_float,
    as_int,
    scalar_str,
    sum_conversions_from_actions,
    sum_nested_metric_list,
)

__all__ = [
    "as_float",
    "as_int",
    "scalar_str",
    "sum_conversions_from_actions",
    "sum_nested_metric_list",
    "fetch_ad_account_billing_transactions",
    "fetch_ad_account_currency",
    "fetch_ad_account_info",
    "fetch_ad_account_campaigns",
    "fetch_campaign_ads",
    "fetch_campaign_level_insights",
    "fetch_daily_account_insights",
]
