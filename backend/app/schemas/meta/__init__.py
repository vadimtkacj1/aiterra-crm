"""Serialized Meta Marketing API payload for daily analytics cache (one global ad account)."""

from __future__ import annotations

from typing import Any

from pydantic import BaseModel, Field


class MetaSnapshotBundle(BaseModel):
    """Raw-ish Graph responses sufficient to build CampaignSnapshot per CRM account (tracked filter)."""

    currency: str
    all_meta_campaigns: list[dict[str, Any]] = Field(default_factory=list)
    raw_rows: list[dict[str, Any]] = Field(default_factory=list)
    period_label: str = "Last 30 days"
    period_i18n: str | None = "analytics.period.last30Days"
    preset_used: str = "last_30d"
    daily_rows: list[dict[str, Any]] = Field(default_factory=list)
    fetched_at_iso: str = ""
