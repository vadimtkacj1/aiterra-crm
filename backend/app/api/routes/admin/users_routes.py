from __future__ import annotations

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.api.deps import require_admin
from app.api.routes.admin import common
from app.db.session import get_db
from app.models.campaign import TrackedCampaign
from app.models.core import Account, AccountMembership, User
from app.models.integrations import GoogleAdsIntegration
from app.models.site import AccountSiteConfig, AccountWhatsAppPhone
from app.schemas.admin import (
    ResetPasswordRequest,
    UpdateUserRequest,
    UserBusinessGoogleOut,
    UserBusinessGoogleUpdateRequest,
    UserBusinessMetaOut,
    UserBusinessMetaUpdateRequest,
    UserBusinessSiteOut,
    UserBusinessSiteUpdateRequest,
    WaPhoneOut,
    WaPhoneCreate,
    WaPhoneUpdate,
)
from app.schemas.auth import UserOut
from app.services.admin.audit import log_admin_action
from app.core.security import hash_password

router = APIRouter()


@router.get("/users", response_model=list[UserOut])
def list_users(db: Session = Depends(get_db), _: User = Depends(require_admin)) -> list[UserOut]:
    rows = db.query(User).order_by(User.id.asc()).all()
    memberships = (
        db.query(AccountMembership)
        .order_by(AccountMembership.user_id.asc(), AccountMembership.id.asc())
        .all()
    )
    first_account_by_user: dict[int, int] = {}
    for m in memberships:
        if m.user_id not in first_account_by_user:
            first_account_by_user[m.user_id] = m.account_id
    return [
        UserOut(
            id=u.id,
            email=u.email,
            displayName=u.display_name,
            role=u.role,
            accountId=first_account_by_user.get(u.id),
            phone=u.phone,
        )
        for u in rows
    ]


@router.post("/users", response_model=UserOut)
def create_user(
    payload: dict,
    db: Session = Depends(get_db),
    admin: User = Depends(require_admin),
) -> UserOut:
    email = str(payload.get("email", "")).lower().strip()
    password = str(payload.get("password", ""))
    display_name = str(payload.get("displayName", "")).strip()
    role = str(payload.get("role", "user"))
    phone = str(payload.get("phone") or "").strip() or None
    meta_campaign_id = str(payload.get("metaCampaignId") or "").strip()
    meta_campaign_name = str(payload.get("metaCampaignName") or "").strip()
    google_customer_id = str(payload.get("googleCustomerId") or "").strip()
    google_developer_token = str(payload.get("googleDeveloperToken") or "").strip()
    google_refresh_token = str(payload.get("googleRefreshToken") or "").strip()
    google_login_customer_id = str(payload.get("googleLoginCustomerId") or "").strip() or None
    with_site = bool(payload.get("withSite", False))
    site_url = str(payload.get("siteUrl") or "").strip() or None

    if not email or not password or not display_name:
        raise HTTPException(status_code=400, detail="validation_error")
    if role not in ("admin", "user"):
        raise HTTPException(status_code=400, detail="validation_error")
    existing = db.query(User).filter(User.email == email).first()
    if existing:
        raise HTTPException(status_code=409, detail="email_taken")

    if meta_campaign_id:
        taken = db.query(TrackedCampaign).filter(TrackedCampaign.meta_campaign_id == meta_campaign_id).first()
        if taken:
            raise HTTPException(status_code=409, detail="meta_campaign_already_assigned")

    u = User(
        email=email,
        display_name=display_name,
        role=role,
        password_hash=hash_password(password),
        phone=phone,
    )
    db.add(u)
    db.flush()

    biz = Account(name=display_name or (email.split("@", 1)[0] if "@" in email else email) or "Account")
    db.add(biz)
    db.flush()
    db.add(AccountMembership(user_id=u.id, account_id=biz.id, role_in_account="owner"))
    if meta_campaign_id:
        db.add(
            TrackedCampaign(
                account_id=biz.id,
                meta_campaign_id=meta_campaign_id,
                name=meta_campaign_name or meta_campaign_id,
                platform="meta",
            )
        )
    if google_customer_id and google_developer_token and google_refresh_token:
        db.add(
            GoogleAdsIntegration(
                account_id=biz.id,
                customer_id=google_customer_id,
                developer_token=google_developer_token,
                refresh_token=google_refresh_token,
                login_customer_id=google_login_customer_id,
            )
        )
    if with_site:
        db.add(AccountSiteConfig(account_id=biz.id, site_url=site_url))
    log_admin_action(
        db,
        admin,
        "user_created",
        resource_type="user",
        resource_id=str(u.id),
        detail={"email": email, "role": role},
    )
    db.commit()
    db.refresh(u)
    return UserOut(
        id=u.id,
        email=u.email,
        displayName=u.display_name,
        role=u.role,
        accountId=biz.id,
        phone=u.phone,
    )


@router.put("/users/{user_id}", response_model=UserOut)
def update_user(
    user_id: int,
    payload: UpdateUserRequest,
    db: Session = Depends(get_db),
    admin: User = Depends(require_admin),
) -> UserOut:
    u = db.query(User).filter(User.id == user_id).first()
    if not u:
        raise HTTPException(status_code=404, detail="user_not_found")
    if payload.role not in ("admin", "user"):
        raise HTTPException(status_code=400, detail="validation_error")

    u.display_name = payload.displayName.strip() or u.display_name
    u.role = payload.role
    db.add(u)
    log_admin_action(
        db,
        admin,
        "user_updated",
        resource_type="user",
        resource_id=str(user_id),
        detail={"displayName": u.display_name, "role": u.role},
    )
    db.commit()
    db.refresh(u)
    return UserOut(
        id=u.id,
        email=u.email,
        displayName=u.display_name,
        role=u.role,
        accountId=common.first_account_id_for_user(db, u.id),
    )


@router.get("/users/{user_id}/business-meta", response_model=UserBusinessMetaOut)
def get_user_business_meta(
    user_id: int,
    db: Session = Depends(get_db),
    _: User = Depends(require_admin),
) -> UserBusinessMetaOut:
    u = db.query(User).filter(User.id == user_id).first()
    if not u:
        raise HTTPException(status_code=404, detail="user_not_found")
    m = common.owner_membership(db, user_id)
    if not m:
        return UserBusinessMetaOut()
    tc = (
        db.query(TrackedCampaign)
        .filter(TrackedCampaign.account_id == m.account_id, TrackedCampaign.platform == "meta")
        .order_by(TrackedCampaign.id.asc())
        .first()
    )
    return UserBusinessMetaOut(
        accountId=m.account_id,
        metaCampaignId=tc.meta_campaign_id if tc else None,
        metaCampaignName=tc.name if tc else None,
    )


@router.put("/users/{user_id}/business-meta", response_model=UserBusinessMetaOut)
def set_user_business_meta(
    user_id: int,
    payload: UserBusinessMetaUpdateRequest,
    db: Session = Depends(get_db),
    admin: User = Depends(require_admin),
) -> UserBusinessMetaOut:
    u = db.query(User).filter(User.id == user_id).first()
    if not u:
        raise HTTPException(status_code=404, detail="user_not_found")
    m = common.owner_membership(db, user_id)
    if not m:
        raise HTTPException(status_code=400, detail="no_owner_business")

    meta_campaign_id = (payload.metaCampaignId or "").strip()
    meta_campaign_name = (payload.metaCampaignName or "").strip()

    db.query(TrackedCampaign).filter(
        TrackedCampaign.account_id == m.account_id,
        TrackedCampaign.platform == "meta",
    ).delete(synchronize_session=False)

    if meta_campaign_id:
        taken = db.query(TrackedCampaign).filter(TrackedCampaign.meta_campaign_id == meta_campaign_id).first()
        if taken:
            raise HTTPException(status_code=409, detail="meta_campaign_already_assigned")
        db.add(
            TrackedCampaign(
                account_id=m.account_id,
                meta_campaign_id=meta_campaign_id,
                name=meta_campaign_name or meta_campaign_id,
                platform="meta",
            )
        )
    log_admin_action(
        db,
        admin,
        "user_business_meta_updated",
        resource_type="user",
        resource_id=str(user_id),
        detail={"metaCampaignId": meta_campaign_id or None},
    )
    db.commit()

    tc = (
        db.query(TrackedCampaign)
        .filter(TrackedCampaign.account_id == m.account_id, TrackedCampaign.platform == "meta")
        .order_by(TrackedCampaign.id.asc())
        .first()
    )
    return UserBusinessMetaOut(
        accountId=m.account_id,
        metaCampaignId=tc.meta_campaign_id if tc else None,
        metaCampaignName=tc.name if tc else None,
    )


@router.get("/users/{user_id}/business-google", response_model=UserBusinessGoogleOut)
def get_user_business_google(
    user_id: int,
    db: Session = Depends(get_db),
    _: User = Depends(require_admin),
) -> UserBusinessGoogleOut:
    u = db.query(User).filter(User.id == user_id).first()
    if not u:
        raise HTTPException(status_code=404, detail="user_not_found")
    m = common.owner_membership(db, user_id)
    if not m:
        return UserBusinessGoogleOut()
    row = (
        db.query(GoogleAdsIntegration)
        .filter(GoogleAdsIntegration.account_id == m.account_id)
        .first()
    )
    if not row:
        return UserBusinessGoogleOut(accountId=m.account_id)
    return UserBusinessGoogleOut(
        accountId=m.account_id,
        customerId=row.customer_id,
        loginCustomerId=row.login_customer_id,
        hasCredentials=bool((row.developer_token or "").strip() and (row.refresh_token or "").strip()),
    )


@router.put("/users/{user_id}/business-google", response_model=UserBusinessGoogleOut)
def set_user_business_google(
    user_id: int,
    payload: UserBusinessGoogleUpdateRequest,
    db: Session = Depends(get_db),
    admin: User = Depends(require_admin),
) -> UserBusinessGoogleOut:
    u = db.query(User).filter(User.id == user_id).first()
    if not u:
        raise HTTPException(status_code=404, detail="user_not_found")
    m = common.owner_membership(db, user_id)
    if not m:
        raise HTTPException(status_code=400, detail="no_owner_business")

    customer_id = (payload.customerId or "").strip()
    dev_in = (payload.developerToken or "").strip()
    ref_in = (payload.refreshToken or "").strip()
    login_cid = (payload.loginCustomerId or "").strip() or None

    existing = (
        db.query(GoogleAdsIntegration)
        .filter(GoogleAdsIntegration.account_id == m.account_id)
        .first()
    )

    if not customer_id:
        if existing:
            db.delete(existing)
        log_admin_action(
            db,
            admin,
            "user_business_google_updated",
            resource_type="user",
            resource_id=str(user_id),
            detail={"customerId": None},
        )
        db.commit()
        return UserBusinessGoogleOut(accountId=m.account_id)

    developer_token = dev_in or (existing.developer_token if existing else "")
    refresh_token = ref_in or (existing.refresh_token if existing else "")
    if not developer_token or not refresh_token:
        raise HTTPException(status_code=400, detail="google_tokens_required")

    if existing:
        existing.customer_id = customer_id
        existing.developer_token = developer_token
        existing.refresh_token = refresh_token
        existing.login_customer_id = login_cid
        db.add(existing)
    else:
        db.add(
            GoogleAdsIntegration(
                account_id=m.account_id,
                customer_id=customer_id,
                developer_token=developer_token,
                refresh_token=refresh_token,
                login_customer_id=login_cid,
            )
        )
    log_admin_action(
        db,
        admin,
        "user_business_google_updated",
        resource_type="user",
        resource_id=str(user_id),
        detail={"customerId": customer_id},
    )
    db.commit()

    row = (
        db.query(GoogleAdsIntegration)
        .filter(GoogleAdsIntegration.account_id == m.account_id)
        .first()
    )
    assert row is not None
    return UserBusinessGoogleOut(
        accountId=m.account_id,
        customerId=row.customer_id,
        loginCustomerId=row.login_customer_id,
        hasCredentials=bool((row.developer_token or "").strip() and (row.refresh_token or "").strip()),
    )


@router.get("/users/{user_id}/business-site", response_model=UserBusinessSiteOut)
def get_user_business_site(
    user_id: int,
    db: Session = Depends(get_db),
    _: User = Depends(require_admin),
) -> UserBusinessSiteOut:
    u = db.query(User).filter(User.id == user_id).first()
    if not u:
        raise HTTPException(status_code=404, detail="user_not_found")
    m = common.owner_membership(db, user_id)
    if not m:
        return UserBusinessSiteOut()
    config = db.query(AccountSiteConfig).filter_by(account_id=m.account_id).first()
    if config and not config.wa_connect_code:
        from app.api.routes.site.routes import _generate_connect_code
        config.wa_connect_code = _generate_connect_code()
        db.commit()
        db.refresh(config)
    return _site_config_to_admin_out(m.account_id, config)


def _site_config_to_admin_out(account_id: int, config: AccountSiteConfig | None) -> UserBusinessSiteOut:
    if not config:
        return UserBusinessSiteOut(accountId=account_id)
    return UserBusinessSiteOut(
        accountId=account_id,
        hasSite=True,
        siteUrl=config.site_url,
        publicToken=config.public_token,
        notifyChannel=config.notify_channel or "whatsapp",
        waOwnerPhone=config.wa_owner_phone,
        waOwnerPhoneVerified=config.wa_owner_phone_verified,
        waConnectCode=config.wa_connect_code,
        waNotifyMessage=config.wa_notify_message,
        emailNotifySubject=config.email_notify_subject,
        emailNotifyMessage=config.email_notify_message,
    )


@router.put("/users/{user_id}/business-site", response_model=UserBusinessSiteOut)
def set_user_business_site(
    user_id: int,
    payload: UserBusinessSiteUpdateRequest,
    db: Session = Depends(get_db),
    admin: User = Depends(require_admin),
) -> UserBusinessSiteOut:
    u = db.query(User).filter(User.id == user_id).first()
    if not u:
        raise HTTPException(status_code=404, detail="user_not_found")
    m = common.owner_membership(db, user_id)
    if not m:
        raise HTTPException(status_code=400, detail="no_owner_business")
    existing = db.query(AccountSiteConfig).filter_by(account_id=m.account_id).first()
    if payload.hasSite and not existing:
        import uuid as _uuid
        from app.api.routes.site.routes import _generate_connect_code
        existing = AccountSiteConfig(
            account_id=m.account_id,
            site_url=payload.siteUrl,
            public_token=str(_uuid.uuid4()),
            wa_connect_code=_generate_connect_code(),
        )
        db.add(existing)
    elif not payload.hasSite and existing:
        db.delete(existing)
        existing = None

    if payload.hasSite and existing:
        if not existing.wa_connect_code:
            from app.api.routes.site.routes import _generate_connect_code
            existing.wa_connect_code = _generate_connect_code()
        existing.site_url = payload.siteUrl
        if payload.notifyChannel is not None:
            existing.notify_channel = payload.notifyChannel or "whatsapp"
        if payload.waOwnerPhone is not None:
            existing.wa_owner_phone = payload.waOwnerPhone or None
        if payload.waNotifyMessage is not None:
            existing.wa_notify_message = payload.waNotifyMessage or None
        if payload.emailNotifySubject is not None:
            existing.email_notify_subject = payload.emailNotifySubject or None
        if payload.emailNotifyMessage is not None:
            existing.email_notify_message = payload.emailNotifyMessage or None

    log_admin_action(
        db,
        admin,
        "user_business_site_updated",
        resource_type="user",
        resource_id=str(user_id),
        detail={"hasSite": payload.hasSite, "notifyChannel": payload.notifyChannel},
    )
    db.commit()
    config = db.query(AccountSiteConfig).filter_by(account_id=m.account_id).first()
    return _site_config_to_admin_out(m.account_id, config)


@router.put("/users/{user_id}/password")
def reset_password(
    user_id: int,
    payload: ResetPasswordRequest,
    db: Session = Depends(get_db),
    admin: User = Depends(require_admin),
) -> dict:
    if not payload.password or len(payload.password) < 8:
        raise HTTPException(status_code=400, detail="validation_error")
    u = db.query(User).filter(User.id == user_id).first()
    if not u:
        raise HTTPException(status_code=404, detail="user_not_found")
    u.password_hash = hash_password(payload.password)
    db.add(u)
    log_admin_action(db, admin, "user_password_reset", resource_type="user", resource_id=str(user_id), detail=None)
    db.commit()
    return {"ok": True}


@router.delete("/users/{user_id}")
def delete_user(
    user_id: int,
    db: Session = Depends(get_db),
    admin: User = Depends(require_admin),
) -> dict:
    u = db.query(User).filter(User.id == user_id).first()
    if not u:
        raise HTTPException(status_code=404, detail="user_not_found")

    # Don't allow deleting yourself
    if u.id == admin.id:
        raise HTTPException(status_code=400, detail="cannot_delete_yourself")

    # Delete owned accounts and all their related data before deleting the user
    owned = (
        db.query(AccountMembership)
        .filter(AccountMembership.user_id == user_id, AccountMembership.role_in_account == "owner")
        .all()
    )
    for m in owned:
        db.query(AccountWhatsAppPhone).filter_by(account_id=m.account_id).delete(synchronize_session=False)
        db.query(AccountSiteConfig).filter_by(account_id=m.account_id).delete(synchronize_session=False)
        db.query(AccountMembership).filter_by(account_id=m.account_id).delete(synchronize_session=False)
        account = db.query(Account).filter_by(id=m.account_id).first()
        if account:
            db.delete(account)

    log_admin_action(db, admin, "user_deleted", resource_type="user", resource_id=str(user_id), detail=u.email)
    db.delete(u)
    db.commit()
    return {"ok": True}


# ── WhatsApp multi-phone management ────────────────────────────────────────


def _wa_phone_to_out(p: AccountWhatsAppPhone) -> WaPhoneOut:
    return WaPhoneOut(
        id=p.id,
        accountId=p.account_id,
        connectCode=p.connect_code,
        phone=p.verified_phone,
        label=p.label,
        verified=bool(p.verified_phone),
    )


@router.get("/users/{user_id}/whatsapp-phones", response_model=list[WaPhoneOut])
def list_user_whatsapp_phones(
    user_id: int,
    db: Session = Depends(get_db),
    _: User = Depends(require_admin),
) -> list[WaPhoneOut]:
    m = common.owner_membership(db, user_id)
    if not m:
        return []
    phones = (
        db.query(AccountWhatsAppPhone)
        .filter_by(account_id=m.account_id)
        .order_by(AccountWhatsAppPhone.id)
        .all()
    )
    return [_wa_phone_to_out(p) for p in phones]


@router.post("/users/{user_id}/whatsapp-phones", response_model=WaPhoneOut, status_code=201)
def add_user_whatsapp_phone(
    user_id: int,
    payload: WaPhoneCreate,
    db: Session = Depends(get_db),
    _: User = Depends(require_admin),
) -> WaPhoneOut:
    m = common.owner_membership(db, user_id)
    if not m:
        raise HTTPException(status_code=400, detail="no_owner_business")
    from app.api.routes.site.routes import _generate_connect_code
    raw_phone = (payload.phone or "").strip() or None
    phone = AccountWhatsAppPhone(
        account_id=m.account_id,
        connect_code=_generate_connect_code(),
        label=payload.label or None,
        verified_phone=raw_phone,
    )
    db.add(phone)
    db.commit()
    db.refresh(phone)
    return _wa_phone_to_out(phone)


@router.patch("/users/{user_id}/whatsapp-phones/{phone_id}", response_model=WaPhoneOut)
def update_user_whatsapp_phone(
    user_id: int,
    phone_id: int,
    payload: WaPhoneUpdate,
    db: Session = Depends(get_db),
    _: User = Depends(require_admin),
) -> WaPhoneOut:
    m = common.owner_membership(db, user_id)
    if not m:
        raise HTTPException(status_code=404, detail="not_found")
    phone = db.query(AccountWhatsAppPhone).filter_by(id=phone_id, account_id=m.account_id).first()
    if not phone:
        raise HTTPException(status_code=404, detail="not_found")
    if "phone" in payload.model_fields_set:
        phone.verified_phone = (payload.phone or "").strip() or None
    if "label" in payload.model_fields_set:
        phone.label = (payload.label or "").strip() or None
    db.commit()
    db.refresh(phone)
    return _wa_phone_to_out(phone)


@router.delete("/users/{user_id}/whatsapp-phones/{phone_id}", status_code=204)
def delete_user_whatsapp_phone(
    user_id: int,
    phone_id: int,
    db: Session = Depends(get_db),
    _: User = Depends(require_admin),
) -> None:
    m = common.owner_membership(db, user_id)
    if not m:
        raise HTTPException(status_code=404, detail="not_found")
    phone = db.query(AccountWhatsAppPhone).filter_by(id=phone_id, account_id=m.account_id).first()
    if not phone:
        raise HTTPException(status_code=404, detail="not_found")
    db.delete(phone)
    db.commit()
