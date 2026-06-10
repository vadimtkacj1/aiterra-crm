"""Admin API: composed routers (stats, users, accounts, billing, audit/exports)."""

from __future__ import annotations

from fastapi import APIRouter

from app.api.routes.admin import accounts_routes, audit_routes, billing_routes, leads_routes, stats_routes, users_routes, whatsapp_routes

router = APIRouter()
router.include_router(stats_routes.router)
router.include_router(users_routes.router)
router.include_router(accounts_routes.router)
router.include_router(billing_routes.router)
router.include_router(audit_routes.router)
router.include_router(leads_routes.router)
router.include_router(whatsapp_routes.router)
