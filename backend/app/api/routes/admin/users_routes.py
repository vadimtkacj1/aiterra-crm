from __future__ import annotations

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.api.deps import require_admin
from app.api.routes.admin import common
from app.db.session import get_db
from app.models.campaign import TrackedCampaign
from app.models.core import Account, AccountMembership, User
from app.models.integrations import GoogleAdsIntegration
from app.schemas.admin import (
    ResetPasswordRequest,
    UpdateUserRequest,
    UserBusinessGoogleOut,
    UserBusinessGoogleUpdateRequest,
    UserBusinessMetaOut,
    UserBusinessMetaUpdateRequest,
)
from app.schemas.auth import UserOut
from app.services.admin.audit import log_admin_action
from app.services.auth.security import hash_password

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
    meta_campaign_id = str(payload.get("metaCampaignId") or "").strip()
    meta_campaign_name = str(payload.get("metaCampaignName") or "").strip()
    google_customer_id = str(payload.get("googleCustomerId") or "").strip()
    google_developer_token = str(payload.get("googleDeveloperToken") or "").strip()
    google_refresh_token = str(payload.get("googleRefreshToken") or "").strip()
    google_login_customer_id = str(payload.get("googleLoginCustomerId") or "").strip() or None

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
