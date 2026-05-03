"""Type coercion helpers and metric aggregation for Meta API responses."""

from __future__ import annotations

from typing import Any

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
    return sum(as_int(item.get("value")) for item in entries if isinstance(item, dict))


def sum_conversions_from_actions(actions: Any) -> int:
    if not isinstance(actions, list):
        return 0
    return sum(
        as_int(a.get("value"))
        for a in actions
        if isinstance(a, dict) and a.get("action_type") in _CONVERSION_ACTION_TYPES
    )
