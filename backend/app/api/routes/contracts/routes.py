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

import base64
import logging
import re
from datetime import datetime, timezone

from fastapi import APIRouter, BackgroundTasks, Depends, HTTPException
from sqlalchemy.orm import Session, joinedload

from app.api.deps import get_current_user, require_account_member, require_admin
from app.api.routes.admin import common
from app.core.settings import settings
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
from app.services.email.smtp_mail import send_signed_contract_pdf

router = APIRouter()
logger = logging.getLogger(__name__)


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
        signerPosition=c.signer_position,
        signedCopyEmail=c.signed_copy_email,
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


def _attachment_filename(contract_id: int, title: str) -> str:
    slug = re.sub(r"[^\w\-]+", "_", title.strip())[:50].strip("_") or "contract"
    return f"contract_{contract_id}_{slug}.pdf"


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


@router.delete("/admin/contracts/{contract_id}", status_code=204)
def delete_contract(
    contract_id: int,
    db: Session = Depends(get_db),
    _admin: User = Depends(require_admin),
) -> None:
    c = _get_or_404(db, contract_id)
    db.delete(c)
    db.commit()


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


def _queue_signed_contract_email(
    to_email: str | None,
    contract_id: int,
    title: str,
    signer_name: str,
    pdf_bytes: bytes | None,
    locale: str | None = None,
) -> None:
    if not to_email or not settings.smtp_host:
        return

    lang = (locale or "en").lower()[:2]
    if lang == "he":
        subject = f"חוזה נחתם: {title}"
        body_text = (
            f"החוזה \"{title}\" נחתם על ידי {signer_name}.\n\n"
            + ("קובץ ה-PDF של החוזה מצורף.\n\n" if pdf_bytes else "")
            + "Aiterra CRM"
        )
    else:
        subject = f"Signed contract: {title}"
        body_text = (
            f"The contract \"{title}\" has been signed by {signer_name}.\n\n"
            + ("The contract PDF is attached.\n\n" if pdf_bytes else "")
            + "Aiterra CRM"
        )

    send_signed_contract_pdf(
        to_email,
        subject,
        body_text,
        pdf_bytes,
        _attachment_filename(contract_id, title),
    )


@router.post("/contracts/{token}/sign", response_model=ContractPublicOut)
def sign_contract(
    token: str,
    body: ContractSignRequest,
    background_tasks: BackgroundTasks,
    db: Session = Depends(get_db),
) -> ContractPublicOut:
    c = _get_by_token_or_404(db, token)

    if c.status == "voided":
        raise HTTPException(status_code=410, detail="contract_voided")
    if c.status == "signed":
        raise HTTPException(status_code=409, detail="already_signed")
    # draft and pending_signature — both allow signing (Send is optional workflow step)

    signed_at = datetime.now(timezone.utc)
    prior_pdf_b64 = c.pdf_base64

    owner_email, _ = common.account_owner_contact(db, c.account_id)
    recipient_raw = str(body.recipientEmail).strip() if body.recipientEmail else None
    delivery_email = recipient_raw or owner_email

    original_pdf_bytes: bytes | None = None
    if prior_pdf_b64 and prior_pdf_b64.strip():
        try:
            original_pdf_bytes = base64.b64decode(prior_pdf_b64.strip())
        except Exception:
            pass

    c.signature_png_base64 = body.signaturePngBase64
    c.signer_name = body.signerName.strip()
    c.signer_position = body.signerPosition or None
    c.signed_copy_email = delivery_email
    c.signed_at = signed_at
    c.status = "signed"
    # pdf_base64 is left unchanged — original PDF is kept as-is

    db.commit()
    db.refresh(c)

    if delivery_email and settings.smtp_host:
        background_tasks.add_task(
            _queue_signed_contract_email,
            delivery_email,
            c.id,
            c.title,
            c.signer_name or "",
            original_pdf_bytes,
            body.locale,
        )
    elif delivery_email and not settings.smtp_host:
        logger.info("Signed contract %s; SMTP not configured, skip email to %s", c.id, delivery_email)

    return _contract_public_out(c)
