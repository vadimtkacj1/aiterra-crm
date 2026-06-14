from __future__ import annotations

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from sqlalchemy.orm import Session

from app.api.deps import require_admin
from app.db.session import get_db
from app.models.core import Account, AccountMembership, User
from app.models.site import AccountWhatsAppPhone, AdminWhatsAppPhone, AccountSiteConfig
from app.api.routes.site.routes import _generate_connect_code

router = APIRouter()


class WaConnectionOut(BaseModel):
    phoneId: int
    accountId: int
    accountName: str
    ownerEmail: str | None
    phone: str | None
    verified: bool
    connectCode: str
    label: str | None


@router.get("/whatsapp-connections", response_model=list[WaConnectionOut])
def list_whatsapp_connections(
    db: Session = Depends(get_db),
    _: User = Depends(require_admin),
) -> list[WaConnectionOut]:
    """List all WhatsApp phone slots across all accounts.

    Also auto-migrates legacy AccountSiteConfig entries (wa_connect_code) that
    don't yet have a corresponding AccountWhatsAppPhone row.
    """
    # Auto-migrate legacy site configs that have wa_connect_code but no phone slot
    site_configs = db.query(AccountSiteConfig).filter(
        AccountSiteConfig.wa_connect_code.isnot(None)
    ).all()
    existing_account_ids = {
        p.account_id
        for p in db.query(AccountWhatsAppPhone.account_id).all()
    }
    migrated = False
    for cfg in site_configs:
        if cfg.account_id not in existing_account_ids:
            slot = AccountWhatsAppPhone(
                account_id=cfg.account_id,
                connect_code=cfg.wa_connect_code,
                verified_phone=cfg.wa_owner_phone_verified or None,
            )
            db.add(slot)
            existing_account_ids.add(cfg.account_id)
            migrated = True
    if migrated:
        db.commit()

    phones = (
        db.query(AccountWhatsAppPhone)
        .order_by(AccountWhatsAppPhone.account_id, AccountWhatsAppPhone.id)
        .all()
    )

    # Auto-generate missing connect codes
    dirty = False
    for p in phones:
        if not p.connect_code:
            p.connect_code = _generate_connect_code()
            dirty = True
    if dirty:
        db.commit()

    result = []
    for p in phones:
        account = db.query(Account).filter(Account.id == p.account_id).first()
        if not account:
            continue
        owner = (
            db.query(User)
            .join(AccountMembership, AccountMembership.user_id == User.id)
            .filter(AccountMembership.account_id == p.account_id)
            .order_by(AccountMembership.id)
            .first()
        )
        result.append(WaConnectionOut(
            phoneId=p.id,
            accountId=p.account_id,
            accountName=account.name,
            ownerEmail=owner.email if owner else None,
            phone=p.verified_phone,
            verified=bool(p.verified_phone),
            connectCode=p.connect_code,
            label=p.label,
        ))

    result.sort(key=lambda x: (not x.verified, x.accountName))
    return result


@router.delete("/whatsapp-phones/{phone_id}", status_code=204)
def delete_whatsapp_phone(
    phone_id: int,
    db: Session = Depends(get_db),
    _: User = Depends(require_admin),
) -> None:
    """Delete a WhatsApp phone slot (removes connection + slot entirely)."""
    phone = db.query(AccountWhatsAppPhone).filter_by(id=phone_id).first()
    if not phone:
        raise HTTPException(status_code=404, detail="not_found")
    db.delete(phone)
    db.commit()


# ── Global admin phones ─────────────────────────────────────────────────────


class AdminWaPhoneOut(BaseModel):
    id: int
    phone: str
    label: str | None


class AdminWaPhoneCreate(BaseModel):
    phone: str
    label: str | None = None


@router.get("/whatsapp-admin-phones", response_model=list[AdminWaPhoneOut])
def list_admin_whatsapp_phones(
    db: Session = Depends(get_db),
    _: User = Depends(require_admin),
) -> list[AdminWaPhoneOut]:
    rows = db.query(AdminWhatsAppPhone).order_by(AdminWhatsAppPhone.id).all()
    return [AdminWaPhoneOut(id=r.id, phone=r.phone, label=r.label) for r in rows]


@router.post("/whatsapp-admin-phones", response_model=AdminWaPhoneOut, status_code=201)
def add_admin_whatsapp_phone(
    payload: AdminWaPhoneCreate,
    db: Session = Depends(get_db),
    _: User = Depends(require_admin),
) -> AdminWaPhoneOut:
    phone = payload.phone.strip()
    if not phone:
        raise HTTPException(status_code=400, detail="phone_required")
    row = AdminWhatsAppPhone(phone=phone, label=(payload.label or "").strip() or None)
    db.add(row)
    db.commit()
    db.refresh(row)
    return AdminWaPhoneOut(id=row.id, phone=row.phone, label=row.label)


@router.delete("/whatsapp-admin-phones/{phone_id}", status_code=204)
def delete_admin_whatsapp_phone(
    phone_id: int,
    db: Session = Depends(get_db),
    _: User = Depends(require_admin),
) -> None:
    row = db.query(AdminWhatsAppPhone).filter_by(id=phone_id).first()
    if not row:
        raise HTTPException(status_code=404, detail="not_found")
    db.delete(row)
    db.commit()
