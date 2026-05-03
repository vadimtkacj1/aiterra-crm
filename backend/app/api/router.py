from fastapi import APIRouter

from app.api.routes.admin.routes import router as admin_router
from app.api.routes.billing import checkout, mock_payment
from app.api.routes.contracts.routes import router as contracts_router
from app.api.routes.core import accounts, auth
from app.api.routes.legal.routes import router as legal_router
from app.api.routes.meta.routes import router as meta_router
from app.api.routes.webhooks.zcredit_webhook import router as zcredit_webhook_router

api_router = APIRouter()
api_router.include_router(auth.router, prefix="/auth", tags=["auth"])
api_router.include_router(accounts.router, prefix="/accounts", tags=["accounts"])
api_router.include_router(admin_router, prefix="/admin", tags=["admin"])
api_router.include_router(meta_router, prefix="/meta", tags=["meta"])
api_router.include_router(checkout.router, tags=["checkout"])
api_router.include_router(zcredit_webhook_router, prefix="/webhooks", tags=["webhooks"])
api_router.include_router(legal_router, tags=["legal"])
api_router.include_router(mock_payment.router, tags=["mock"])
api_router.include_router(contracts_router, tags=["contracts"])
