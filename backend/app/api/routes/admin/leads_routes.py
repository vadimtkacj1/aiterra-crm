from __future__ import annotations

from typing import Optional

from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session

from app.api.deps import require_admin
from app.db.session import get_db
from app.models.core import Account, User
from app.models.site import SiteLead
from app.schemas.site import SiteLeadAdminOut

router = APIRouter()


@router.get("/leads", response_model=list[SiteLeadAdminOut])
def list_all_leads(
    account_id: Optional[int] = Query(None),
    db: Session = Depends(get_db),
    _: User = Depends(require_admin),
) -> list[SiteLeadAdminOut]:
    q = db.query(SiteLead, Account.name).join(Account, Account.id == SiteLead.account_id)
    if account_id is not None:
        q = q.filter(SiteLead.account_id == account_id)
    rows = q.order_by(SiteLead.created_at.desc()).all()
    return [
        SiteLeadAdminOut(
            id=lead.id,
            name=lead.name,
            phone=lead.phone,
            email=lead.email,
            message=lead.message,
            source=lead.source,
            createdAt=lead.created_at,
            accountId=lead.account_id,
            accountName=account_name,
        )
        for lead, account_name in rows
    ]
