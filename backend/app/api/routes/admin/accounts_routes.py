from __future__ import annotations

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.api.deps import require_admin
from app.db.session import get_db
from app.models.campaign import TrackedCampaign
from app.models.core import Account, AccountMembership, User
from app.models.integrations import GoogleAdsIntegration
from app.schemas.accounts import AccountOut, AssignMemberRequest, CreateAccountRequest
from app.schemas.admin import AdminAccountOut

router = APIRouter()


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
