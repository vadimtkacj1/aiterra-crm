from __future__ import annotations

from fastapi import APIRouter, Depends, HTTPException
from fastapi.responses import HTMLResponse, JSONResponse
from sqlalchemy.orm import Session

from app.db.session import get_db

# Import dev_mock from parent directory
import sys
from pathlib import Path
sys.path.insert(0, str(Path(__file__).parent.parent.parent.parent.parent))

from dev_mock.zcredit_hosted_mock import (
    apply_mock_hosted_confirm,
    build_zcredit_hosted_mock_html,
    find_mock_payment_data,
    require_zcredit_mock_mode,
)

router = APIRouter()


@router.get("/mock-payment/{doc_id}", response_class=HTMLResponse, include_in_schema=False)
def mock_payment_page(doc_id: str, db: Session = Depends(get_db)) -> HTMLResponse:
    require_zcredit_mock_mode()
    data = find_mock_payment_data(db, doc_id)
    if not data:
        raise HTTPException(status_code=404, detail="invoice_not_found")
    confirm_url = f"/api/mock-payment/{doc_id}/confirm"
    html = build_zcredit_hosted_mock_html(data=data, confirm_url=confirm_url)
    return HTMLResponse(content=html)


@router.post("/mock-payment/{doc_id}/confirm", include_in_schema=False)
def mock_payment_confirm(doc_id: str, payload: dict, db: Session = Depends(get_db)) -> JSONResponse:
    require_zcredit_mock_mode()
    success: bool = bool(payload.get("success", True))
    apply_mock_hosted_confirm(db, doc_id, success=success)
    return JSONResponse({"ok": True, "success": success})
