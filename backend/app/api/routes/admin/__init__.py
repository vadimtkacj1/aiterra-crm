"""
Admin API routes.

- `routes` — aggregated `APIRouter` for `/api/admin`
- `common` — shared helpers (billing history projection, dates, memberships)
- `billing_sync` — Z-Credit sync when setting billing instructions
- `*_routes` — endpoint groups (stats, users, accounts, billing, audit/exports)
"""
