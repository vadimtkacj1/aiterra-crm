from fastapi import APIRouter

from app.api.routes import auth, accounts, admin, meta, zcredit_webhook, mock_payment, checkout

api_router = APIRouter()
api_router.include_router(auth.router, prefix="/auth", tags=["auth"])
api_router.include_router(accounts.router, prefix="/accounts", tags=["accounts"])
api_router.include_router(admin.router, prefix="/admin", tags=["admin"])
api_router.include_router(meta.router, prefix="/meta", tags=["meta"])
api_router.include_router(checkout.router, tags=["checkout"])
api_router.include_router(zcredit_webhook.router, prefix="/webhooks", tags=["webhooks"])
api_router.include_router(mock_payment.router, tags=["mock"])
