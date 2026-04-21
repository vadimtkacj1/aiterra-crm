import json
from collections import defaultdict
from datetime import datetime, timedelta, timezone

from fastapi import APIRouter, Depends, HTTPException
from fastapi.responses import Response
from sqlalchemy import desc
from sqlalchemy.orm import Session

from app.api.deps import require_admin
from app.db.session import get_db
from app.models.account import Account
from app.models.campaign import TrackedCampaign
from app.models.integration_google_ads import GoogleAdsIntegration
from app.models.membership import AccountMembership
from app.models.meta_topup import MetaTopup
from app.models.user import User
from app.schemas.accounts import AccountOut, AssignMemberRequest, CreateAccountRequest
from app.schemas.admin import (
    AdminAccountOut,
    AdminAuditLogOut,
    AdminPaymentCurrencySummary,
    AdminPaymentStatsBucket,
    AdminPaymentStatsOut,
    AdminStats,
    ResetPasswordRequest,
    UpdateUserRequest,
    UserBusinessGoogleOut,
    UserBusinessGoogleUpdateRequest,
    UserBusinessMetaOut,
    UserBusinessMetaUpdateRequest,
)
from app.schemas.auth import UserOut
from app.models.billing_instruction import AccountBillingInstruction
from app.models.admin_audit_log import AdminAuditLog
from app.models.billing_instruction_history import BillingInstructionHistory
from app.models.invoice_template import InvoiceTemplate
from app.schemas.billing import (
    BillingHistoryOut,
    BillingHistoryWithAccountOut,
    BillingInstructionIn,
    BillingInstructionOut,
    BillingLineItemIn,
    InvoiceTemplateCreate,
    InvoiceTemplateOut,
    MetaTopupRecord,
    MetaTopupRequest,
    parse_stored_line_items,
)
from app.services.admin_audit import log_admin_action
from app.services.admin_reporting import build_billing_history_csv, build_executive_pdf, build_users_csv
from app.services.meta_integration import get_global_meta_integration
from app.services.security import hash_password
from app.services import zcredit_service

router = APIRouter()


def _parse_date_start(value: str | None) -> datetime | None:
    if not value:
        return None
    try:
        dt = datetime.fromisoformat(value)
    except ValueError:
        dt = datetime.fromisoformat(f"{value}T00:00:00")
    if dt.tzinfo is None:
        dt = dt.replace(tzinfo=timezone.utc)
    return dt.astimezone(timezone.utc)


def _parse_date_end(value: str | None) -> datetime | None:
    start = _parse_date_start(value)
    if not start:
        return None
    return start + timedelta(days=1)


def _as_utc(dt: datetime) -> datetime:
    """DB drivers may return naive datetimes; stats filters use UTC-aware bounds."""
    if dt.tzinfo is None:
        return dt.replace(tzinfo=timezone.utc)
    return dt.astimezone(timezone.utc)


@router.get("/stats", response_model=AdminStats)
def get_admin_stats(db: Session = Depends(get_db), _: User = Depends(require_admin)) -> AdminStats:
    users_total = db.query(User).count()
    admins_total = db.query(User).filter(User.role == "admin").count()
    accounts_total = db.query(Account).count()
    campaigns_total = db.query(TrackedCampaign).count()
    integration = get_global_meta_integration(db)
    return AdminStats(
        usersTotal=users_total,
        adminsTotal=admins_total,
        regularUsersTotal=users_total - admins_total,
        accountsTotal=accounts_total,
        trackedCampaignsTotal=campaigns_total,
        metaConnected=integration is not None,
    )


@router.get("/stats/payments", response_model=AdminPaymentStatsOut)
def get_admin_payment_stats(
    startDate: str | None = None,
    endDate: str | None = None,
    year: int | None = None,
    groupBy: str = "month",
    db: Session = Depends(get_db),
    _: User = Depends(require_admin),
) -> AdminPaymentStatsOut:
    rows = db.query(BillingInstructionHistory).order_by(BillingInstructionHistory.created_at.asc()).all()

    available_years = sorted(
        {
            r.created_at.year
            for r in rows
            if getattr(r, "created_at", None) is not None and hasattr(r.created_at, "year")
        }
    )

    start_dt = _parse_date_start(startDate)
    end_dt = _parse_date_end(endDate)
    if year and not start_dt and not end_dt:
        start_dt = datetime(year, 1, 1, tzinfo=timezone.utc)
        end_dt = datetime(year + 1, 1, 1, tzinfo=timezone.utc)

    paid_count = 0
    unpaid_count = 0
    bucket_map: dict[str, dict[str, int]] = defaultdict(lambda: {"paid": 0, "unpaid": 0})
    currency_map: dict[str, dict[str, float]] = defaultdict(lambda: {"paid": 0.0, "unpaid": 0.0})

    for row in rows:
        created_at = getattr(row, "created_at", None)
        if not created_at:
            continue
        created_at = _as_utc(created_at)
        if start_dt and created_at < start_dt:
            continue
        if end_dt and created_at >= end_dt:
            continue

        inv_st: str | None = None
        sub_st: str | None = None
        if row.payment_doc_id:
            inv = zcredit_service.try_retrieve_invoice(row.payment_doc_id)
            if inv:
                inv_st = str(getattr(inv, "status", "") or "") or None
        if row.payment_recurring_id:
            sub = zcredit_service.try_retrieve_subscription(row.payment_recurring_id)
            if sub:
                sub_st = str(getattr(sub, "status", "") or "") or None

        payment_status = _payment_status_for_history(row, inv_st, sub_st)
        normalized: str | None = None
        if payment_status == "paid":
            normalized = "paid"
            paid_count += 1
        elif payment_status in ("unpaid", "ongoing", "unknown"):
            normalized = "unpaid"
            unpaid_count += 1
        else:
            continue

        if groupBy == "year":
            label = created_at.strftime("%Y")
        elif groupBy == "day":
            label = created_at.strftime("%Y-%m-%d")
        else:
            label = created_at.strftime("%Y-%m")

        bucket_map[label][normalized] += 1

        cur = (row.currency or "ILS").upper()
        amt = float(row.amount or 0.0)
        currency_map[cur][normalized] += amt

    buckets = [
        AdminPaymentStatsBucket(label=label, paidCount=data["paid"], unpaidCount=data["unpaid"])
        for label, data in sorted(bucket_map.items(), key=lambda x: x[0])
    ]
    currencies = [
        AdminPaymentCurrencySummary(currency=cur, paidAmount=vals["paid"], unpaidAmount=vals["unpaid"])
        for cur, vals in sorted(currency_map.items(), key=lambda x: x[0])
    ]

    return AdminPaymentStatsOut(
        paidCount=paid_count,
        unpaidCount=unpaid_count,
        availableYears=available_years,
        currencies=currencies,
        buckets=buckets,
    )


@router.get("/users", response_model=list[UserOut])
def list_users(db: Session = Depends(get_db), _: User = Depends(require_admin)) -> list[UserOut]:
    rows = db.query(User).order_by(User.id.asc()).all()
    return [
        UserOut(id=u.id, email=u.email, displayName=u.display_name, role=u.role)
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
    return UserOut(id=u.id, email=u.email, displayName=u.display_name, role=u.role)


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
    return UserOut(id=u.id, email=u.email, displayName=u.display_name, role=u.role)


def _owner_membership(db: Session, user_id: int) -> AccountMembership | None:
    return (
        db.query(AccountMembership)
        .filter(AccountMembership.user_id == user_id, AccountMembership.role_in_account == "owner")
        .order_by(AccountMembership.id.asc())
        .first()
    )


def _account_owner_contact(db: Session, account_id: int) -> tuple[str | None, str | None]:
    owner = (
        db.query(User)
        .join(AccountMembership, AccountMembership.user_id == User.id)
        .filter(
            AccountMembership.account_id == account_id,
            AccountMembership.role_in_account == "owner",
        )
        .order_by(AccountMembership.id.asc())
        .first()
    )
    if not owner:
        return None, None
    return owner.email, owner.display_name


def _iso_dt(value: object | None) -> str | None:
    if value is None:
        return None
    if hasattr(value, "isoformat"):
        return str(value.isoformat())  # type: ignore[union-attr]
    return str(value)


def _mark_active_history_superseded(db: Session, account_id: int) -> None:
    now = datetime.now(timezone.utc)
    active_rows = (
        db.query(BillingInstructionHistory)
        .filter(
            BillingInstructionHistory.account_id == account_id,
            BillingInstructionHistory.record_status == "active",
        )
        .all()
    )
    for row in active_rows:
        row.record_status = "superseded"
        row.closed_at = now
        db.add(row)


def _payment_status_for_history(
    row: BillingInstructionHistory,
    inv_st: str | None,
    sub_st: str | None,
) -> str:
    """Human-oriented payment state for admin list (paid / unpaid / …)."""
    if row.record_status == "revoked":
        return "cancelled"
    inv = (inv_st or "").lower()
    if inv == "paid":
        return "paid"
    if inv in ("open", "draft", "pending"):
        return "unpaid"
    if inv in ("void", "uncollectible", "failed"):
        return "voided"
    sub = (sub_st or "").lower()
    if sub in ("past_due", "unpaid", "incomplete"):
        return "unpaid"
    if sub in ("canceled", "cancelled", "incomplete_expired"):
        return "cancelled"
    if row.charge_type == "monthly" and sub in ("active", "trialing"):
        return "ongoing"
    if row.record_status == "superseded":
        return "superseded"
    return "unknown"


def _history_to_out(
    row: BillingInstructionHistory,
    live: AccountBillingInstruction | None,
) -> BillingHistoryOut:
    inv_st: str | None = None
    sub_st: str | None = None
    if row.payment_doc_id:
        inv = zcredit_service.try_retrieve_invoice(row.payment_doc_id)
        if inv:
            inv_st = str(getattr(inv, "status", "") or "") or None
    if row.payment_recurring_id:
        sub = zcredit_service.try_retrieve_subscription(row.payment_recurring_id)
        if sub:
            sub_st = str(getattr(sub, "status", "") or "") or None
    is_current = False
    if live and live.charge_type != "none":
        if row.payment_doc_id and row.payment_doc_id == live.payment_doc_id:
            is_current = True
        if row.payment_recurring_id and row.payment_recurring_id == live.payment_recurring_id:
            is_current = True
    pay_status = _payment_status_for_history(row, inv_st, sub_st)
    return BillingHistoryOut(
        id=row.id,
        chargeType=row.charge_type,
        amount=row.amount,
        currency=row.currency,
        description=row.description,
        lineItems=parse_stored_line_items(row.line_items_json),
        paymentDocId=row.payment_doc_id,
        paymentUrl=row.payment_url,
        paymentRecurringId=row.payment_recurring_id,
        recordStatus=row.record_status,
        paymentDocStatus=inv_st,
        paymentRecurringStatus=sub_st,
        paymentStatus=pay_status,
        createdAt=_iso_dt(row.created_at) or "",
        closedAt=_iso_dt(row.closed_at),
        isCurrent=is_current,
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
    m = _owner_membership(db, user_id)
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
    m = _owner_membership(db, user_id)
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
    m = _owner_membership(db, user_id)
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
    m = _owner_membership(db, user_id)
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


@router.get("/accounts", response_model=list[AdminAccountOut])
def list_accounts_admin(db: Session = Depends(get_db), _: User = Depends(require_admin)) -> list[AdminAccountOut]:
    accounts = db.query(Account).order_by(Account.id.asc()).all()
    out: list[AdminAccountOut] = []
    for a in accounts:
        count = db.query(AccountMembership).filter(AccountMembership.account_id == a.id).count()
        out.append(AdminAccountOut(id=a.id, name=a.name, membersCount=count))
    return out


@router.get("/accounts/{account_id}/members")
def list_account_members(
    account_id: int,
    db: Session = Depends(get_db),
    _: User = Depends(require_admin),
) -> list[dict]:
    rows = db.query(AccountMembership).filter(AccountMembership.account_id == account_id).all()
    return [{"userId": r.user_id, "accountId": r.account_id, "roleInAccount": r.role_in_account} for r in rows]


@router.post("/accounts", response_model=AccountOut)
def create_account(
    payload: CreateAccountRequest,
    db: Session = Depends(get_db),
    admin: User = Depends(require_admin),
) -> AccountOut:
    campaign_id = (payload.metaCampaignId or "").strip()
    if campaign_id:
        existing = db.query(TrackedCampaign).filter(TrackedCampaign.meta_campaign_id == campaign_id).first()
        if existing:
            raise HTTPException(status_code=409, detail="meta_campaign_already_assigned")

    a = Account(name=payload.name.strip() or "Account")
    db.add(a)
    db.commit()
    db.refresh(a)

    membership = AccountMembership(user_id=admin.id, account_id=a.id, role_in_account="owner")
    db.add(membership)

    if campaign_id:
        campaign_name = (payload.metaCampaignName or "").strip() or campaign_id
        db.add(
            TrackedCampaign(
                account_id=a.id,
                meta_campaign_id=campaign_id,
                name=campaign_name,
                platform="meta",
            )
        )
    db.commit()

    has_meta = (
        db.query(TrackedCampaign)
        .filter(TrackedCampaign.account_id == a.id, TrackedCampaign.platform == "meta")
        .first()
        is not None
    )
    has_google = (
        db.query(GoogleAdsIntegration)
        .filter(GoogleAdsIntegration.account_id == a.id)
        .first()
        is not None
    )
    return AccountOut(id=a.id, name=a.name, hasMeta=has_meta, hasGoogle=has_google)


@router.post("/accounts/{account_id}/members")
def assign_member(
    account_id: int,
    payload: AssignMemberRequest,
    db: Session = Depends(get_db),
    _: User = Depends(require_admin),
) -> dict:
    user = db.query(User).filter(User.id == payload.userId).first()
    if not user:
        raise HTTPException(status_code=404, detail="user_not_found")

    account = db.query(Account).filter(Account.id == account_id).first()
    if not account:
        raise HTTPException(status_code=404, detail="account_not_found")

    existing = (
        db.query(AccountMembership)
        .filter(AccountMembership.user_id == user.id, AccountMembership.account_id == account.id)
        .first()
    )
    if existing:
        return {"ok": True}

    role_in_account = payload.roleInAccount if payload.roleInAccount in ("owner", "member") else "member"
    m = AccountMembership(user_id=user.id, account_id=account.id, role_in_account=role_in_account)
    db.add(m)
    db.commit()
    return {"ok": True}


# ── Meta top-up ───────────────────────────────────────────────────────────────

def _topup_record(t: MetaTopup) -> MetaTopupRecord:
    created_str = str(t.created_at) if t.created_at else ""
    return MetaTopupRecord(
        id=t.id,
        accountId=t.account_id,
        amount=t.amount,
        currency=t.currency,
        status=t.status,
        metaError=t.meta_error,
        createdAt=created_str,
    )


@router.get("/billing/topups", response_model=list[MetaTopupRecord])
def list_topups(
    db: Session = Depends(get_db),
    _: User = Depends(require_admin),
) -> list[MetaTopupRecord]:
    rows = db.query(MetaTopup).order_by(MetaTopup.id.desc()).limit(200).all()
    return [_topup_record(r) for r in rows]


@router.post("/billing/meta-topup", response_model=MetaTopupRecord)
def create_meta_topup(
    _payload: MetaTopupRequest,
    _: User = Depends(require_admin),
) -> MetaTopupRecord:
    """Disabled: admins issue Z-Credit payment pages; clients pay themselves."""
    raise HTTPException(status_code=403, detail="admin_direct_card_charge_disabled")


# ── Billing instruction ───────────────────────────────────────────────────────

@router.get("/accounts/{account_id}/billing-instruction", response_model=BillingInstructionOut)
def get_billing_instruction(
    account_id: int,
    db: Session = Depends(get_db),
    _: User = Depends(require_admin),
) -> BillingInstructionOut:
    instruction = (
        db.query(AccountBillingInstruction)
        .filter(AccountBillingInstruction.account_id == account_id)
        .first()
    )
    if not instruction:
        return BillingInstructionOut(chargeType="none", amount=None, currency="ILS", description=None, lineItems=None)
    return BillingInstructionOut(
        chargeType=instruction.charge_type,
        amount=instruction.amount,
        currency=instruction.currency,
        description=instruction.description,
        lineItems=parse_stored_line_items(instruction.line_items_json),
    )


def _sync_account_billing_instruction(
    db: Session,
    account_id: int,
    admin: User,
    payload: BillingInstructionIn,
) -> BillingInstructionOut:
    account = db.query(Account).filter(Account.id == account_id).first()
    if not account:
        raise HTTPException(status_code=404, detail="account_not_found")

    instruction = (
        db.query(AccountBillingInstruction)
        .filter(AccountBillingInstruction.account_id == account_id)
        .first()
    )

    if instruction and instruction.charge_type != "none":
        _mark_active_history_superseded(db, account_id)

    # Cancel previous Z-Credit objects when changing type
    if instruction:
        if instruction.payment_recurring_id and payload.chargeType != "monthly":
            zcredit_service.cancel_subscription(instruction.payment_recurring_id)
        if instruction.payment_doc_id and payload.chargeType != "one_time":
            zcredit_service.void_invoice(instruction.payment_doc_id)

    if not instruction:
        instruction = AccountBillingInstruction(
            account_id=account_id,
            created_by_admin_id=admin.id,
        )
        db.add(instruction)

    instruction.charge_type = payload.chargeType
    instruction.amount = payload.amount if payload.chargeType != "none" else None
    instruction.currency = payload.currency.upper()
    instruction.description = (payload.description or "").strip() or None
    instruction.payment_doc_id = None
    instruction.payment_url = None
    instruction.payment_recurring_id = None
    instruction.payment_plan_id = None
    instruction.subscription_status = None

    if payload.chargeType == "none":
        instruction.line_items_json = None
    elif payload.lineItems:
        instruction.line_items_json = json.dumps(
            [{"code": li.code, "label": li.label, "amount": li.amount} for li in payload.lineItems],
            ensure_ascii=False,
        )
    else:
        instruction.line_items_json = None

    if payload.chargeType != "none" and payload.amount and payload.amount > 0:
        owner_email, owner_name = _account_owner_contact(db, account_id)
        token_id = zcredit_service.ensure_customer(
            account,
            account.zcredit_token_id,
            customer_email=owner_email,
            customer_name=owner_name,
        )
        if token_id:
            account.zcredit_token_id = token_id
            db.add(account)

        amount_minor = int(round(payload.amount * 100))
        description = instruction.description or (
            "One-time fee" if payload.chargeType == "one_time" else "Monthly subscription"
        )
        if payload.lineItems:
            description = instruction.description or ", ".join(li.label for li in payload.lineItems)

        if payload.chargeType == "one_time":
            if payload.lineItems:
                tuples: list[tuple[int, str]] = []
                for li in payload.lineItems:
                    minor = int(round(li.amount * 100))
                    line_desc = li.label if not li.code else f"{li.label} ({li.code})"
                    tuples.append((minor, line_desc))
                doc_id, payment_url = zcredit_service.create_invoice_with_line_items(
                    account,
                    payload.currency,
                    tuples,
                    description,
                )
            else:
                doc_id, payment_url = zcredit_service.create_invoice(
                    account,
                    amount_minor,
                    payload.currency,
                    description,
                )
            instruction.payment_doc_id = doc_id
            instruction.payment_url = payment_url or None

        elif payload.chargeType == "monthly":
            recurring_id, plan_id, payment_url, first_doc_id = zcredit_service.create_subscription(
                account,
                None,
                amount_minor,
                payload.currency,
                description,
            )
            instruction.payment_recurring_id = recurring_id
            instruction.payment_plan_id = plan_id
            instruction.payment_url = payment_url or None
            instruction.payment_doc_id = first_doc_id

        db.add(
            BillingInstructionHistory(
                account_id=account_id,
                charge_type=payload.chargeType,
                amount=instruction.amount,
                currency=instruction.currency,
                description=instruction.description,
                line_items_json=instruction.line_items_json,
                payment_doc_id=instruction.payment_doc_id,
                payment_url=instruction.payment_url,
                payment_recurring_id=instruction.payment_recurring_id,
                record_status="active",
                created_by_admin_id=admin.id,
            )
        )

    log_admin_action(
        db,
        admin,
        "billing_instruction_set",
        resource_type="account",
        resource_id=str(account_id),
        detail={"chargeType": payload.chargeType, "currency": str(payload.currency)},
    )
    db.commit()
    db.refresh(instruction)
    return BillingInstructionOut(
        chargeType=instruction.charge_type,
        amount=instruction.amount,
        currency=instruction.currency,
        description=instruction.description,
        lineItems=parse_stored_line_items(instruction.line_items_json),
    )


@router.put("/accounts/{account_id}/billing-instruction", response_model=BillingInstructionOut)
def set_billing_instruction(
    account_id: int,
    payload: BillingInstructionIn,
    db: Session = Depends(get_db),
    admin: User = Depends(require_admin),
) -> BillingInstructionOut:
    """
    Create or replace the billing instruction for an account.

    - chargeType="none":     cancels any existing payment / recurring billing.
    - chargeType="one_time": creates a Z-Credit payment page (hosted pay link only).
    - chargeType="monthly":  creates a Z-Credit recurring billing.
    """
    return _sync_account_billing_instruction(db, account_id, admin, payload)


def _invoice_template_to_out(row: InvoiceTemplate) -> InvoiceTemplateOut:
    ca = row.created_at
    created = ca.isoformat() if hasattr(ca, "isoformat") else str(ca)
    return InvoiceTemplateOut(
        id=row.id,
        title=row.title,
        chargeType=row.charge_type,
        amount=float(row.amount),
        currency=row.currency,
        description=row.description,
        lineItems=parse_stored_line_items(row.line_items_json),
        createdAt=created,
    )


@router.get("/invoice-templates", response_model=list[InvoiceTemplateOut])
def list_invoice_templates(
    db: Session = Depends(get_db),
    _: User = Depends(require_admin),
) -> list[InvoiceTemplateOut]:
    rows = db.query(InvoiceTemplate).order_by(desc(InvoiceTemplate.id)).limit(200).all()
    return [_invoice_template_to_out(r) for r in rows]


@router.post("/invoice-templates", response_model=InvoiceTemplateOut)
def create_invoice_template(
    body: InvoiceTemplateCreate,
    db: Session = Depends(get_db),
    admin: User = Depends(require_admin),
) -> InvoiceTemplateOut:
    li_json = None
    if body.lineItems:
        li_json = json.dumps(
            [{"code": li.code, "label": li.label, "amount": li.amount} for li in body.lineItems],
            ensure_ascii=False,
        )
    row = InvoiceTemplate(
        title=(body.title or "").strip() or None,
        charge_type=body.chargeType,
        amount=body.amount,
        currency=body.currency.upper(),
        description=(body.description or "").strip() or None,
        line_items_json=li_json,
        created_by_admin_id=admin.id,
    )
    db.add(row)
    db.flush()
    log_admin_action(
        db,
        admin,
        "invoice_template_created",
        resource_type="invoice_template",
        resource_id=str(row.id),
        detail={"chargeType": body.chargeType},
    )
    db.commit()
    db.refresh(row)
    return _invoice_template_to_out(row)


@router.delete("/invoice-templates/{template_id}", status_code=204)
def delete_invoice_template(
    template_id: int,
    db: Session = Depends(get_db),
    admin: User = Depends(require_admin),
) -> None:
    row = db.query(InvoiceTemplate).filter(InvoiceTemplate.id == template_id).first()
    if not row:
        raise HTTPException(status_code=404, detail="invoice_template_not_found")
    log_admin_action(
        db,
        admin,
        "invoice_template_deleted",
        resource_type="invoice_template",
        resource_id=str(template_id),
        detail=None,
    )
    db.delete(row)
    db.commit()


@router.post(
    "/invoice-templates/{template_id}/apply/{account_id}",
    response_model=BillingInstructionOut,
)
def apply_invoice_template_to_account(
    template_id: int,
    account_id: int,
    db: Session = Depends(get_db),
    admin: User = Depends(require_admin),
) -> BillingInstructionOut:
    tpl = db.query(InvoiceTemplate).filter(InvoiceTemplate.id == template_id).first()
    if not tpl:
        raise HTTPException(status_code=404, detail="invoice_template_not_found")
    parsed = parse_stored_line_items(tpl.line_items_json)
    items: list[BillingLineItemIn] | None = None
    if parsed:
        items = [
            BillingLineItemIn(code=li.code or "", label=li.label, amount=float(li.amount)) for li in parsed
        ]
    payload = BillingInstructionIn(
        chargeType=tpl.charge_type,
        amount=float(tpl.amount),
        currency=tpl.currency,
        description=tpl.description,
        lineItems=items,
    )
    out = _sync_account_billing_instruction(db, account_id, admin, payload)
    log_admin_action(
        db,
        admin,
        "invoice_template_applied",
        resource_type="invoice_template",
        resource_id=str(template_id),
        detail={"accountId": account_id},
    )
    db.commit()
    return out


@router.get("/billing-history", response_model=list[BillingHistoryWithAccountOut])
def list_all_billing_history(
    db: Session = Depends(get_db),
    _: User = Depends(require_admin),
) -> list[BillingHistoryWithAccountOut]:
    """All invoice / subscription rows across businesses (admin). No per-user filter."""
    rows = (
        db.query(BillingInstructionHistory)
        .order_by(desc(BillingInstructionHistory.id))
        .limit(400)
        .all()
    )
    if not rows:
        return []
    account_ids = {r.account_id for r in rows}
    accounts = {a.id: a.name for a in db.query(Account).filter(Account.id.in_(account_ids)).all()}
    lives = {
        x.account_id: x
        for x in db.query(AccountBillingInstruction)
        .filter(AccountBillingInstruction.account_id.in_(account_ids))
        .all()
    }
    owner_emails: dict[int, str | None] = {}
    for aid in account_ids:
        owner_emails[aid] = _account_owner_contact(db, aid)[0]
    out: list[BillingHistoryWithAccountOut] = []
    for row in rows:
        live = lives.get(row.account_id)
        base = _history_to_out(row, live)
        out.append(
            BillingHistoryWithAccountOut.model_validate(
                {
                    **base.model_dump(),
                    "accountId": row.account_id,
                    "accountName": (accounts.get(row.account_id) or "") or "",
                    "ownerEmail": owner_emails.get(row.account_id),
                }
            )
        )
    return out


@router.get("/accounts/{account_id}/billing-history", response_model=list[BillingHistoryOut])
def list_billing_history(
    account_id: int,
    db: Session = Depends(get_db),
    _: User = Depends(require_admin),
) -> list[BillingHistoryOut]:
    if not db.query(Account).filter(Account.id == account_id).first():
        raise HTTPException(status_code=404, detail="account_not_found")
    live = (
        db.query(AccountBillingInstruction)
        .filter(AccountBillingInstruction.account_id == account_id)
        .first()
    )
    rows = (
        db.query(BillingInstructionHistory)
        .filter(BillingInstructionHistory.account_id == account_id)
        .order_by(desc(BillingInstructionHistory.id))
        .limit(100)
        .all()
    )
    return [_history_to_out(r, live) for r in rows]


@router.post("/accounts/{account_id}/billing-history/{history_id}/revoke", response_model=BillingHistoryOut)
def revoke_billing_history_row(
    account_id: int,
    history_id: int,
    db: Session = Depends(get_db),
    admin: User = Depends(require_admin),
) -> BillingHistoryOut:
    if not db.query(Account).filter(Account.id == account_id).first():
        raise HTTPException(status_code=404, detail="account_not_found")
    row = (
        db.query(BillingInstructionHistory)
        .filter(
            BillingInstructionHistory.id == history_id,
            BillingInstructionHistory.account_id == account_id,
        )
        .first()
    )
    if not row:
        raise HTTPException(status_code=404, detail="billing_history_not_found")
    if row.record_status != "active":
        raise HTTPException(status_code=400, detail="billing_history_not_revokable")

    if row.payment_recurring_id:
        zcredit_service.cancel_subscription(row.payment_recurring_id)
    if row.payment_doc_id:
        zcredit_service.void_invoice(row.payment_doc_id)

    now = datetime.now(timezone.utc)
    row.record_status = "revoked"
    row.closed_at = now
    db.add(row)

    instruction = (
        db.query(AccountBillingInstruction)
        .filter(AccountBillingInstruction.account_id == account_id)
        .first()
    )
    if instruction and instruction.charge_type != "none":
        matches = False
        if row.payment_doc_id and instruction.payment_doc_id == row.payment_doc_id:
            matches = True
        if row.payment_recurring_id and instruction.payment_recurring_id == row.payment_recurring_id:
            matches = True
        if matches:
            instruction.charge_type = "none"
            instruction.amount = None
            instruction.description = None
            instruction.line_items_json = None
            instruction.payment_doc_id = None
            instruction.payment_url = None
            instruction.payment_recurring_id = None
            instruction.payment_plan_id = None
            instruction.subscription_status = None
            instruction.currency = "ILS"
            db.add(instruction)

    log_admin_action(
        db,
        admin,
        "billing_history_revoked",
        resource_type="billing_history",
        resource_id=f"{account_id}/{history_id}",
        detail=None,
    )
    db.commit()
    db.refresh(row)
    live = (
        db.query(AccountBillingInstruction)
        .filter(AccountBillingInstruction.account_id == account_id)
        .first()
    )
    return _history_to_out(row, live)


@router.delete("/accounts/{account_id}/billing-history/{history_id}", status_code=204)
def delete_billing_history_row(
    account_id: int,
    history_id: int,
    db: Session = Depends(get_db),
    admin: User = Depends(require_admin),
) -> None:
    """Remove a history row from the admin list (DB only). Active rows must be revoked first."""
    if not db.query(Account).filter(Account.id == account_id).first():
        raise HTTPException(status_code=404, detail="account_not_found")
    row = (
        db.query(BillingInstructionHistory)
        .filter(
            BillingInstructionHistory.id == history_id,
            BillingInstructionHistory.account_id == account_id,
        )
        .first()
    )
    if not row:
        raise HTTPException(status_code=404, detail="billing_history_not_found")
    if row.record_status == "active":
        raise HTTPException(status_code=400, detail="billing_history_delete_revoke_first")
    log_admin_action(
        db,
        admin,
        "billing_history_deleted",
        resource_type="billing_history",
        resource_id=f"{account_id}/{history_id}",
        detail=None,
    )
    db.delete(row)
    db.commit()


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
        created = _iso_dt(r.created_at) or ""
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
    start_dt = _parse_date_start(startDate)
    end_dt = _parse_date_end(endDate)
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
