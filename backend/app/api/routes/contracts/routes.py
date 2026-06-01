from __future__ import annotations

import base64
import logging
import re
from datetime import datetime, timezone

from fastapi import APIRouter, BackgroundTasks, Depends, HTTPException, Request
from pydantic import BaseModel
from sqlalchemy.orm import Session, joinedload

from app.api.deps import get_current_user, require_account_member, require_admin
from app.api.routes.admin import common
from app.core.settings import settings
from app.db.session import get_db
from app.models.billing import AccountBillingInstruction
from app.models.contracts import Contract, ContractPaymentStage
from app.models.core import Account
from app.models.core import User
from app.schemas.contract import (
    ContractCreate,
    ContractStageIn,
    ContractMemberOut,
    ContractOut,
    ContractPublicOut,
    ContractSignRequest,
    ContractStageOut,
)
from app.services.email.smtp_mail import send_signed_contract_pdf
from app.services import zcredit_service

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
        paidAt=s.paid_at,
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
        billingInstructionId=c.billing_instruction_id,
        monthlyAmount=c.monthly_amount,
        subscriptionMonths=c.subscription_months,
        billingDay=c.billing_day,
    )


def _contract_public_out(c: Contract, subscription_status: str | None = None) -> ContractPublicOut:
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
        monthlyAmount=c.monthly_amount,
        subscriptionStatus=subscription_status,
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
        monthlyAmount=c.monthly_amount,
        subscriptionMonths=c.subscription_months,
    )


class ContractCheckoutOut(BaseModel):
    status: str
    message: str
    gateway: str
    callbackUrl: str
    sessionId: str | None = None
    paymentUrl: str | None = None
    stage: ContractStageOut


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
    if body.isSubscription:
        stages_to_create = [
            ContractStageIn(
                description=f"Monthly subscription ({body.subscriptionMonths or '∞'} months)",
                amount=body.monthlyAmount,  # type: ignore[arg-type]  # validated by schema
            )
        ]
        total = body.monthlyAmount  # type: ignore[assignment]
    else:
        stages_to_create = body.stages
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
        monthly_amount=body.monthlyAmount if body.isSubscription else None,
        subscription_months=body.subscriptionMonths if body.isSubscription else None,
        billing_day=body.billingDay if body.isSubscription else None,
    )
    db.add(contract)
    db.flush()

    for i, stage in enumerate(stages_to_create):
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
    q = db.query(Contract).options(joinedload(Contract.stages))
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


@router.delete("/admin/contracts/{contract_id}", status_code=204, response_model=None)
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
    subscription_status: str | None = None
    if c.billing_instruction_id:
        instr = db.query(AccountBillingInstruction).filter_by(id=c.billing_instruction_id).first()
        if instr:
            subscription_status = instr.subscription_status
    return _contract_public_out(c, subscription_status=subscription_status)


def _queue_signed_contract_email(
    to_email: str | None,
    contract_id: int,
    title: str,
    signer_name: str,
    pdf_bytes: bytes | None,
    signature_png_bytes: bytes | None = None,
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
        signature_png_bytes,
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
    signer_email = str(body.recipientEmail).strip() if body.recipientEmail else None

    # Unique non-empty addresses: always notify owner + optionally copy signer
    to_addresses = list(dict.fromkeys(e for e in [owner_email, signer_email] if e))

    original_pdf_bytes: bytes | None = None
    if prior_pdf_b64 and prior_pdf_b64.strip():
        try:
            original_pdf_bytes = base64.b64decode(prior_pdf_b64.strip())
        except Exception:
            pass

    signature_png_bytes: bytes | None = None
    sig_b64 = body.signaturePngBase64
    if sig_b64 and sig_b64.strip():
        try:
            signature_png_bytes = base64.b64decode(sig_b64.strip())
        except Exception:
            pass

    c.signature_png_base64 = body.signaturePngBase64
    c.signer_name = body.signerName.strip()
    c.signer_position = body.signerPosition or None
    c.signed_copy_email = signer_email or owner_email
    c.signed_at = signed_at
    c.status = "signed"

    # If this is a subscription contract, try to activate monthly billing.
    # Failure here must not block signing — contract is committed regardless.
    if c.monthly_amount and c.monthly_amount > 0:
        from app.models.billing import AccountBillingInstruction
        from app.schemas.billing import BillingInstructionIn
        from app.api.routes.admin import billing_sync

        billing_payload = BillingInstructionIn(
            chargeType="monthly",
            amount=c.monthly_amount,
            currency=c.currency,
            description=f"Monthly subscription: {c.title}",
            lineItems=None,
            splitAcrossMonths=c.subscription_months,
            billingDay=c.billing_day,
        )

        from app.models.core import User
        admin = db.query(User).filter(User.id == c.created_by_admin_id).first()
        if admin:
            try:
                billing_sync.sync_account_billing_instruction(
                    db, c.account_id, admin, billing_payload
                )
                instruction = (
                    db.query(AccountBillingInstruction)
                    .filter(AccountBillingInstruction.account_id == c.account_id)
                    .first()
                )
                if instruction:
                    c.billing_instruction_id = instruction.id
            except Exception:
                logger.exception(
                    "Billing sync failed for contract %s (account %s); contract signed anyway",
                    c.id, c.account_id,
                )

    # pdf_base64 is left unchanged — original PDF is kept as-is

    db.commit()
    db.refresh(c)

    if to_addresses and settings.smtp_host:
        for addr in to_addresses:
            background_tasks.add_task(
                _queue_signed_contract_email,
                addr,
                c.id,
                c.title,
                c.signer_name or "",
                original_pdf_bytes,
                signature_png_bytes,
                body.locale,
            )
    elif to_addresses and not settings.smtp_host:
        logger.info("Signed contract %s; SMTP not configured, skip email to %s", c.id, to_addresses)

    return _contract_public_out(c)


@router.post("/contracts/{token}/checkout", response_model=ContractCheckoutOut)
def create_contract_checkout(
    token: str,
    request: Request,
    db: Session = Depends(get_db),
) -> ContractCheckoutOut:
    c = _get_by_token_or_404(db, token)
    if c.status == "voided":
        raise HTTPException(status_code=410, detail="contract_voided")
    if c.status != "signed":
        raise HTTPException(status_code=409, detail="contract_must_be_signed_first")
    pending = [s for s in c.stages if s.status != "paid"]
    if not pending:
        raise HTTPException(status_code=409, detail="contract_already_paid")
    pending.sort(key=lambda stage: stage.sort_order)
    stage = pending[0]
    if stage.amount <= 0:
        raise HTTPException(status_code=400, detail="invalid_stage_amount")

    account = db.query(Account).filter(Account.id == c.account_id).first()
    if not account:
        raise HTTPException(status_code=404, detail="account_not_found")

    # Determine dynamic base_url based on the incoming request to avoid localhost issues
    origin = request.headers.get("origin")
    referer = request.headers.get("referer")
    host = request.headers.get("x-forwarded-host") or request.url.netloc
    scheme = request.headers.get("x-forwarded-proto") or request.url.scheme
    
    if origin:
        base_url = origin.rstrip("/")
    elif referer:
        from urllib.parse import urlparse
        parsed = urlparse(referer)
        base_url = f"{parsed.scheme}://{parsed.netloc}"
    else:
        base_url = f"{scheme}://{host}"

    callback_base = f"{scheme}://{host}"
    callback_url = f"{callback_base}/api/webhooks/zcredit"
    amount_minor = int(round(float(stage.amount) * 100))
    
    cancel_url = f"{base_url}/contracts/sign/{token}"
    success_url = f"{base_url}/a/{account.id}/billing/success"

    session_id, pay_url = zcredit_service.create_invoice(
        account,
        amount_minor,
        c.currency,
        f"Contract #{c.id} · {stage.description or 'Payment'}",
        success_url=success_url,
        cancel_url=cancel_url,
        callback_url=callback_url,
    )
    stage.payment_doc_id = session_id
    stage.status = "invoiced"
    db.commit()
    return ContractCheckoutOut(
        status="ok",
        message="Open paymentUrl in the browser to complete payment.",
        gateway="zcredit",
        callbackUrl=callback_url,
        sessionId=session_id,
        paymentUrl=pay_url,
        stage=_stage_out(stage),
    )
