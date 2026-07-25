"""Recognised invoice sources and statuses.

Kept as plain strings — a source or status is added by writing the value, not by
migrating an enum. These live in the domain so every layer references one definition.
"""

from __future__ import annotations

# ── Sources: who issued the payment demand ──────────────────────────────────
SOURCE_CONTRACT = "contract"
SOURCE_BILLING_INSTRUCTION = "billing_instruction"
SOURCE_META_TOPUP = "meta_topup"
SOURCE_LANDING = "landing"
SOURCE_MANUAL = "manual"

# ── Lifecycle statuses ──────────────────────────────────────────────────────
STATUS_OPEN = "open"
STATUS_PAID = "paid"
STATUS_SUPERSEDED = "superseded"
STATUS_CANCELED = "canceled"
