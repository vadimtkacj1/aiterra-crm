"""
Pydantic request/response models — domain packages (each package's __init__.py
contains all models for that domain, so old flat imports still work).

- `auth`      — login, user shell
- `core`      — account DTOs shared by admin and member APIs (was: accounts)
- `admin`     — admin-only payloads
- `billing`   — invoices, instructions, templates, payment records
- `analytics` — campaign snapshots and Meta UI types
- `meta`      — normalized Graph API bundle for cache jobs (was: meta_snapshot_bundle)
- `contracts` — contract signing and admin contract CRUD (was: contract)
- `site`      — site config and leads
"""
