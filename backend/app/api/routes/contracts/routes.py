"""
Contract management routes.

Admin routes (require auth + admin role):
  POST   /api/admin/contracts               — create contract
  GET    /api/admin/contracts               — list (optional ?account_id=)
  GET    /api/admin/contracts/{id}          — get with stages
  POST   /api/admin/contracts/{id}/send     — set status pending_signature
  POST   /api/admin/contracts/{id}/void     — set status voided

Public routes (no auth — token-gated):
  GET    /api/contracts/{token}             — get public contract view
  POST   /api/contracts/{token}/sign        — submit signature
"""

from __future__ import annotations

from datetime import datetime, timezone

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session, joinedload

from app.api.deps import get_current_user, require_account_member, require_admin
from app.db.session import get_db
from app.models.contracts import Contract, ContractPaymentStage
from app.models.core import User
from app.schemas.contract import (
    ContractCreate,
    ContractMemberOut,
    ContractOut,
    ContractPublicOut,
    ContractSignRequest,
    ContractStageOut,
)

router = APIRouter()


# ─── helpers ─────────────────────────────────────────────────────────────────


def _get_or_404(db: Session, contract_id: int) -> Contract:
    c = db.query(Contract).filter_by(id=contract_id).first()
    if not c:
        raise HTTPException(status_code=404, detail="contract_not_found")
    return c


def _get_by_token_or_404(db: Session, token: str) -> Contract:
    c = db.query(Contract).filter_by(sign_token=token).first()
    if not c:
        raise HTTPException(status_code=404, detail="contract_not_found")
    return c


def _stage_out(s: ContractPaymentStage) -> ContractStageOut:
    return ContractStageOut(
        id=s.id,
        sortOrder=s.sort_order,
        description=s.description,
        amount=s.amount,
        status=s.status,
    )


def _contract_out(c: Contract) -> ContractOut:
    return ContractOut(
        id=c.id,
        accountId=c.account_id,
        title=c.title,
        body=c.body or "",
        totalAmount=c.total_amount,
        currency=c.currency,
        status=c.status,
        signToken=c.sign_token,
        signedAt=c.signed_at,
        signerName=c.signer_name,
        signaturePngBase64=c.signature_png_base64,
        pdfBase64=c.pdf_base64,
        createdAt=c.created_at,
        stages=[_stage_out(s) for s in c.stages],
    )


def _contract_public_out(c: Contract) -> ContractPublicOut:
    return ContractPublicOut(
        id=c.id,
        title=c.title,
        body=c.body or "",
        totalAmount=c.total_amount,
        currency=c.currency,
        status=c.status,
        signedAt=c.signed_at,
        signerName=c.signer_name,
        pdfBase64=c.pdf_base64,
        stages=[_stage_out(s) for s in c.stages],
    )


def _contract_member_out(c: Contract) -> ContractMemberOut:
    return ContractMemberOut(
        id=c.id,
        title=c.title,
        totalAmount=c.total_amount,
        currency=c.currency,
        status=c.status,
        signToken=c.sign_token,
        signedAt=c.signed_at,
        signerName=c.signer_name,
        createdAt=c.created_at,
        stages=[_stage_out(s) for s in c.stages],
    )


# ─── account member (authenticated) ──────────────────────────────────────────


@router.get("/accounts/{account_id}/contracts", response_model=list[ContractMemberOut])
def list_account_contracts(
    account_id: int,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
) -> list[ContractMemberOut]:
    require_account_member(account_id, db, user)
    rows = (
        db.query(Contract)
        .options(joinedload(Contract.stages))
        .filter(Contract.account_id == account_id, Contract.status != "voided")
        .order_by(Contract.id.desc())
        .all()
    )
    return [_contract_member_out(c) for c in rows]


# ─── admin routes ─────────────────────────────────────────────────────────────


@router.post("/admin/contracts", response_model=ContractOut)
def create_contract(
    body: ContractCreate,
    db: Session = Depends(get_db),
    admin: User = Depends(require_admin),
) -> ContractOut:
    total = sum(s.amount for s in body.stages)
    contract = Contract(
        account_id=body.accountId,
        title=body.title,
        body=body.body,
        total_amount=total,
        currency=body.currency,
        pdf_base64=body.pdfBase64,
        status="draft",
        created_by_admin_id=admin.id,
    )
    db.add(contract)
    db.flush()

    for i, stage in enumerate(body.stages):
        db.add(
            ContractPaymentStage(
                contract_id=contract.id,
                sort_order=i,
                description=stage.description,
                amount=stage.amount,
            )
        )

    db.commit()
    db.refresh(contract)
    return _contract_out(contract)


@router.get("/admin/contracts", response_model=list[ContractOut])
def list_contracts(
    account_id: int | None = None,
    db: Session = Depends(get_db),
    _admin: User = Depends(require_admin),
) -> list[ContractOut]:
    q = db.query(Contract)
    if account_id is not None:
        q = q.filter(Contract.account_id == account_id)
    contracts = q.order_by(Contract.id.desc()).all()
    return [_contract_out(c) for c in contracts]


@router.get("/admin/contracts/{contract_id}", response_model=ContractOut)
def get_contract(
    contract_id: int,
    db: Session = Depends(get_db),
    _admin: User = Depends(require_admin),
) -> ContractOut:
    return _contract_out(_get_or_404(db, contract_id))


@router.post("/admin/contracts/{contract_id}/send", response_model=ContractOut)
def send_contract(
    contract_id: int,
    db: Session = Depends(get_db),
    _admin: User = Depends(require_admin),
) -> ContractOut:
    c = _get_or_404(db, contract_id)
    if c.status not in ("draft",):
        raise HTTPException(status_code=400, detail="can_only_send_draft")
    c.status = "pending_signature"
    db.commit()
    db.refresh(c)
    return _contract_out(c)


@router.post("/admin/contracts/{contract_id}/void", response_model=ContractOut)
def void_contract(
    contract_id: int,
    db: Session = Depends(get_db),
    _admin: User = Depends(require_admin),
) -> ContractOut:
    c = _get_or_404(db, contract_id)
    if c.status == "voided":
        raise HTTPException(status_code=400, detail="already_voided")
    c.status = "voided"
    db.commit()
    db.refresh(c)
    return _contract_out(c)


# ─── public routes ────────────────────────────────────────────────────────────


@router.get("/contracts/{token}", response_model=ContractPublicOut)
def get_contract_public(
    token: str,
    db: Session = Depends(get_db),
) -> ContractPublicOut:
    c = _get_by_token_or_404(db, token)
    if c.status == "voided":
        raise HTTPException(status_code=410, detail="contract_voided")
    return _contract_public_out(c)


@router.post("/contracts/{token}/sign", response_model=ContractPublicOut)
def sign_contract(
    token: str,
    body: ContractSignRequest,
    db: Session = Depends(get_db),
) -> ContractPublicOut:
    c = _get_by_token_or_404(db, token)

    if c.status == "voided":
        raise HTTPException(status_code=410, detail="contract_voided")
    if c.status == "signed":
        raise HTTPException(status_code=409, detail="already_signed")
    # draft and pending_signature — both allow signing (Send is optional workflow step)

    c.signature_png_base64 = body.signaturePngBase64
    c.signer_name = body.signerName.strip()
    c.signed_at = datetime.now(timezone.utc)
    c.status = "signed"

    db.commit()
    db.refresh(c)
    return _contract_public_out(c)
