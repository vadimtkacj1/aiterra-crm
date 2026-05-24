from fastapi import APIRouter

# ── Core ──────────────────────────────────────────────────────────────────────
from app.api.routes.auth.routes import router as auth_router
from app.api.routes.accounts.routes import router as accounts_router

# ── Feature modules ───────────────────────────────────────────────────────────
# To add a new module:
#   1. Create  backend/app/api/routes/<name>/routes.py  with an APIRouter
#   2. Import the router here and add it to the MODULES list below
from app.api.routes.meta.routes import router as meta_router
from app.api.routes.billing import checkout, mock_payment
from app.api.routes.contracts.routes import router as contracts_router
from app.api.routes.contracts.subscription import router as subscription_router
from app.api.routes.site.routes import router as site_router

# ── Infrastructure ────────────────────────────────────────────────────────────
from app.api.routes.admin.routes import router as admin_router
from app.api.routes.legal.routes import router as legal_router
from app.api.routes.webhooks.zcredit_webhook import router as zcredit_webhook_router

api_router = APIRouter()

# Core
api_router.include_router(auth_router, prefix="/auth", tags=["auth"])
api_router.include_router(accounts_router, prefix="/accounts", tags=["accounts"])

# ── Register feature modules here ─────────────────────────────────────────────
api_router.include_router(meta_router, prefix="/meta", tags=["meta"])
api_router.include_router(checkout.router, tags=["checkout"])
api_router.include_router(contracts_router, tags=["contracts"])
api_router.include_router(subscription_router, prefix="/subscriptions", tags=["subscriptions"])
api_router.include_router(mock_payment.router, tags=["mock"])
api_router.include_router(site_router, tags=["site"])

# Infrastructure
api_router.include_router(admin_router, prefix="/admin", tags=["admin"])
api_router.include_router(zcredit_webhook_router, prefix="/webhooks", tags=["webhooks"])
api_router.include_router(legal_router, tags=["legal"])
