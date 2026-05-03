"""
Pydantic request/response models (flat modules; names mirror API areas).

- `auth` — login, user shell
- `accounts` — account DTOs shared by admin and member APIs
- `admin` — admin-only payloads
- `billing` — invoices, instructions, templates, payment records
- `analytics` — campaign snapshots and Meta UI types
- `meta_snapshot_bundle` — normalized Graph API bundle for cache jobs
- `contract` — contract signing and admin contract CRUD
"""
