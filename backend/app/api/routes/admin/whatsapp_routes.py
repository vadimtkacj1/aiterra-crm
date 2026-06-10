from __future__ import annotations

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from sqlalchemy.orm import Session

from app.api.deps import require_admin
from app.db.session import get_db
from app.models.core import Account, AccountMembership, User
from app.models.site import AccountSiteConfig
from app.api.routes.site.routes import _generate_connect_code

router = APIRouter()


class WaConnectionOut(BaseModel):
    accountId: int
    accountName: str
    ownerEmail: str | None
    phone: str | None
    verified: bool
    connectCode: str | None


@router.get("/whatsapp-connections", response_model=list[WaConnectionOut])
def list_whatsapp_connections(
    db: Session = Depends(get_db),
    _: User = Depends(require_admin),
) -> list[WaConnectionOut]:
    """List all accounts that have a site config, with their WhatsApp status."""
    configs = db.query(AccountSiteConfig).all()
    dirty = False
    for cfg in configs:
        if not cfg.wa_connect_code:
            cfg.wa_connect_code = _generate_connect_code()
            dirty = True
    if dirty:
        db.commit()
    result = []
    for cfg in configs:
        account = db.query(Account).filter(Account.id == cfg.account_id).first()
        if not account:
            continue
        owner = (
            db.query(User)
            .join(AccountMembership, AccountMembership.user_id == User.id)
            .filter(AccountMembership.account_id == cfg.account_id)
            .order_by(AccountMembership.id)
            .first()
        )
        result.append(WaConnectionOut(
            accountId=cfg.account_id,
            accountName=account.name,
            ownerEmail=owner.email if owner else None,
            phone=cfg.wa_owner_phone_verified or cfg.wa_owner_phone,
            verified=bool(cfg.wa_owner_phone_verified),
            connectCode=cfg.wa_connect_code,
        ))
    result.sort(key=lambda x: (not x.verified, x.accountName))
    return result


@router.delete("/whatsapp-connections/{account_id}", status_code=204)
def disconnect_whatsapp(
    account_id: int,
    db: Session = Depends(get_db),
    _: User = Depends(require_admin),
) -> None:
    """Remove WhatsApp connection for an account (keeps connect code so they can re-link)."""
    cfg = db.query(AccountSiteConfig).filter_by(account_id=account_id).first()
    if not cfg:
        raise HTTPException(status_code=404, detail="not_found")
    cfg.wa_owner_phone = None
    cfg.wa_owner_phone_verified = None
    db.commit()
