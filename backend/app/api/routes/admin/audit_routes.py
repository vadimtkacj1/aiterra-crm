from __future__ import annotations

from fastapi import APIRouter, Depends
from fastapi.responses import Response
from sqlalchemy import desc
from sqlalchemy.orm import Session

from app.api.deps import require_admin
from app.api.routes.admin import common
from app.db.session import get_db
from app.models.admin import AdminAuditLog
from app.models.core import User
from app.schemas.admin import AdminAuditLogOut
from app.services.admin.audit import log_admin_action
from app.services.admin.reporting import build_billing_history_csv, build_executive_pdf, build_users_csv

router = APIRouter()


@router.get("/audit-logs", response_model=list[AdminAuditLogOut])
def list_audit_logs(
    limit: int = 200,
    db: Session = Depends(get_db),
    _: User = Depends(require_admin),
) -> list[AdminAuditLogOut]:
    lim = max(1, min(limit, 500))
    rows = db.query(AdminAuditLog).order_by(desc(AdminAuditLog.id)).limit(lim).all()
    user_ids = {r.admin_user_id for r in rows if r.admin_user_id}
    email_by_id = (
        {u.id: u.email for u in db.query(User).filter(User.id.in_(user_ids)).all()} if user_ids else {}
    )
    out: list[AdminAuditLogOut] = []
    for r in rows:
        created = common.iso_dt(r.created_at) or ""
        out.append(
            AdminAuditLogOut(
                id=r.id,
                createdAt=created,
                adminUserId=r.admin_user_id,
                adminEmail=email_by_id.get(r.admin_user_id) if r.admin_user_id else None,
                action=r.action,
                resourceType=r.resource_type,
                resourceId=r.resource_id,
                detail=r.detail,
            )
        )
    return out


@router.get("/reports/executive.pdf")
def download_executive_report_pdf(
    startDate: str | None = None,
    endDate: str | None = None,
    db: Session = Depends(get_db),
    admin: User = Depends(require_admin),
) -> Response:
    start_dt = common.parse_date_start(startDate)
    end_dt = common.parse_date_end(endDate)
    if startDate and endDate:
        period_label = f"{startDate} – {endDate}"
    elif startDate or endDate:
        period_label = f"{startDate or '…'} – {endDate or '…'}"
    else:
        period_label = "All time (billing instruction history)"
    body = build_executive_pdf(db, period_label=period_label, start_dt=start_dt, end_dt=end_dt)
    log_admin_action(db, admin, "executive_pdf_downloaded", detail={"period": period_label})
    db.commit()
    return Response(
        content=body,
        media_type="application/pdf",
        headers={"Content-Disposition": 'attachment; filename="executive-summary.pdf"'},
    )


@router.get("/export/users.csv")
def export_users_csv_endpoint(
    db: Session = Depends(get_db),
    admin: User = Depends(require_admin),
) -> Response:
    data = build_users_csv(db)
    log_admin_action(db, admin, "users_csv_exported", detail=None)
    db.commit()
    return Response(
        content=data,
        media_type="text/csv; charset=utf-8",
        headers={"Content-Disposition": 'attachment; filename="users.csv"'},
    )


@router.get("/export/billing-history.csv")
def export_billing_history_csv_endpoint(
    db: Session = Depends(get_db),
    admin: User = Depends(require_admin),
) -> Response:
    data = build_billing_history_csv(db)
    log_admin_action(db, admin, "billing_history_csv_exported", detail=None)
    db.commit()
    return Response(
        content=data,
        media_type="text/csv; charset=utf-8",
        headers={"Content-Disposition": 'attachment; filename="billing-history.csv"'},
    )
