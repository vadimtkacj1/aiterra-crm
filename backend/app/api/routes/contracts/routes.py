from __future__ import annotations

import base64
import logging
import re
from datetime import datetime, timezone

from fastapi import APIRouter, BackgroundTasks, Depends, HTTPException, Query, Request
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
from app.services.billing import (
    SOURCE_CONTRACT,
    InvoiceLineIn,
    cancel_open_invoices_safe,
    record_invoice_safe,
)
from app.services.email.smtp_mail import send_signed_contract_pdf
from app.infra.payments.factory import get_payment_gateway

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
        kind=s.kind or "one_time",
    )


def _payment_status(c: Contract) -> str:
    """Where the contract stands on money — derived, never stored, so it cannot drift."""
    stages = list(c.stages)
    if not stages:
        return "unpaid"
    paid = [s for s in stages if s.status == "paid"]
    if len(paid) == len(stages):
        return "paid"
    if paid:
        return "partial"
    if any(s.status == "invoiced" for s in stages):
        return "invoiced"
    return "unpaid"


def _contract_value(c: Contract) -> float | None:
    """What the whole contract is worth.

    total_amount holds ONE month for a subscription, which reads as the full price in a
    list. The real value is monthly x agreed months plus any one-off fees; an open-ended
    subscription has no finite value, hence None.
    """
    if not (c.monthly_amount and c.monthly_amount > 0):
        return c.total_amount
    if not c.subscription_months:
        return None
    one_off = sum(s.amount for s in c.stages if (s.kind or "one_time") != "subscription")
    return c.monthly_amount * c.subscription_months + one_off


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
        paymentStatus=_payment_status(c),
        contractValue=_contract_value(c),
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
        paymentStatus=_payment_status(c),
        contractValue=_contract_value(c),
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
        paymentStatus=_payment_status(c),
        contractValue=_contract_value(c),
    )


class ContractCheckoutOut(BaseModel):
    status: str
    message: str
    gateway: str
    callbackUrl: str
    sessionId: str | None = None
    paymentUrl: str | None = None
    stage: ContractStageOut
    amount: float = 0.0
    coveredStageIds: list[int] = []
    reused: bool = False
    """True when an already-open invoice was returned instead of creating a new one."""


def _webhook_callback_url(request: Request) -> str:
    host = request.headers.get("x-forwarded-host") or request.url.netloc
    scheme = request.headers.get("x-forwarded-proto") or request.url.scheme
    return f"{scheme}://{host}/api/webhooks/zcredit"


def _open_invoice_for(
    pending: list[ContractPaymentStage],
) -> tuple[str, str, list[ContractPaymentStage]] | None:
    """Return (doc_id, payment_url, covered stages) of an invoice already open for *pending*.

    Z-Credit has no void API, so a second invoice for the same stage would leave two
    payable links — the client could pay twice. *pending* must be sorted by sort_order,
    so the invoice covering the earliest unpaid stage wins.
    """
    for stage in pending:
        if stage.status == "invoiced" and stage.payment_doc_id and stage.payment_url:
            covered = [s for s in pending if s.payment_doc_id == stage.payment_doc_id]
            return stage.payment_doc_id, stage.payment_url, covered
    return None


def _has_unreusable_open_invoice(pending: list[ContractPaymentStage]) -> bool:
    """True when a stage is invoiced with a doc ID but no stored payment_url.

    These predate the payment_url column, so the live Z-Credit link can't be handed
    back. Reuse is impossible and issuing a fresh link would double it, so the caller
    must pass ?renew=true to replace it (which records the old doc as superseded).
    """
    return any(
        s.status == "invoiced" and s.payment_doc_id and not s.payment_url
        for s in pending
    )


def _stop_billing_for(db: Session, c: Contract) -> None:
    """Stop the recurring charge a contract set up, when that contract is killed.

    Voiding or deleting used to leave the subscription running: the scheduler keeps
    charging a card every month for an agreement that no longer exists.
    """
    if not c.billing_instruction_id:
        return
    instruction = (
        db.query(AccountBillingInstruction)
        .filter(AccountBillingInstruction.id == c.billing_instruction_id)
        .first()
    )
    if not instruction or instruction.subscription_status in ("canceled", "completed"):
        return
    instruction.subscription_status = "canceled"
    db.add(instruction)
    logger.info(
        "Contract %s ended — subscription on instruction %s stopped", c.id, instruction.id
    )


def _attach_invoice(stage: ContractPaymentStage, doc_id: str, pay_url: str | None) -> None:
    """Point *stage* at a new invoice, remembering the doc ID it replaces (if any)."""
    old = (stage.payment_doc_id or "").strip()
    if old and old != doc_id:
        kept = [p for p in (stage.superseded_doc_ids or "").split(",") if p]
        if old not in kept:
            kept.append(old)
        stage.superseded_doc_ids = ",".join(kept[-10:])
    stage.payment_doc_id = doc_id
    stage.payment_url = pay_url or None
    stage.status = "invoiced"


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
        subscription_stage = ContractStageIn(
            description=f"Monthly subscription ({body.subscriptionMonths or '∞'} months)",
            amount=body.monthlyAmount,  # type: ignore[arg-type]  # validated by schema
        )
        # body.stages may contain optional one-time fees (setup fee, etc.)
        stages_to_create = [(subscription_stage, "subscription")] + [
            (s, "one_time") for s in body.stages
        ]
        total = body.monthlyAmount + sum(s.amount for s in body.stages)  # type: ignore[operator]
    else:
        stages_to_create = [(s, "one_time") for s in body.stages]
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

    for i, (stage, kind) in enumerate(stages_to_create):
        db.add(
            ContractPaymentStage(
                contract_id=contract.id,
                sort_order=i,
                description=stage.description,
                amount=stage.amount,
                kind=kind,
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
    _stop_billing_for(db, c)
    db.commit()
    # The contract is off, but any payment link already handed out stays payable at
    # Z-Credit. Closing the registry rows is what makes those links visible as loose ends.
    cancel_open_invoices_safe(db, SOURCE_CONTRACT, c.id)
    db.refresh(c)
    return _contract_out(c)


@router.delete("/admin/contracts/{contract_id}", status_code=204, response_model=None)
def delete_contract(
    contract_id: int,
    db: Session = Depends(get_db),
    _admin: User = Depends(require_admin),
) -> None:
    c = _get_or_404(db, contract_id)
    # Close the demands before the contract disappears: invoice rows outlive the contract
    # on purpose (they are the record of money asked for), but they must not stay "open".
    cancel_open_invoices_safe(db, SOURCE_CONTRACT, c.id)
    _stop_billing_for(db, c)
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

        # splitAcrossMonths means "divide this TOTAL into N equal charges", while the
        # contract states a price PER MONTH for N months. Passing the monthly price as
        # the total made a 300/mo x 12 contract bill 25/mo. Send the total instead: the
        # split hands back exactly the agreed monthly price and records the term.
        term = c.subscription_months
        if term and term >= 2:
            payload_amount = c.monthly_amount * term
            split_months = term
        else:
            payload_amount = c.monthly_amount
            split_months = None

        billing_payload = BillingInstructionIn(
            chargeType="monthly",
            amount=payload_amount,
            currency=c.currency,
            description=f"Monthly subscription: {c.title}",
            lineItems=None,
            splitAcrossMonths=split_months,
            billingDay=c.billing_day,
        )

        # The sync is attributed to an admin. The one who drafted the contract may since
        # have been deleted — fall back to any admin rather than silently skipping
        # activation, which used to leave the client signed up but never billed.
        from app.models.core import User
        admin = db.query(User).filter(User.id == c.created_by_admin_id).first()
        if not admin:
            admin = (
                db.query(User)
                .filter(User.role == "admin")
                .order_by(User.id.asc())
                .first()
            )
            if admin:
                logger.warning(
                    "Contract %s: creating admin %s is gone, attributing billing activation to admin %s",
                    c.id, c.created_by_admin_id, admin.id,
                )
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
        else:
            logger.error(
                "Contract %s signed with monthly_amount=%s but no admin exists to attribute "
                "billing activation to — subscription NOT activated for account %s",
                c.id, c.monthly_amount, c.account_id,
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
    combined: bool = Query(default=False),
    renew: bool = Query(default=False),
) -> ContractCheckoutOut:
    c = _get_by_token_or_404(db, token)
    if c.status == "voided":
        raise HTTPException(status_code=410, detail="contract_voided")
    if c.status != "signed":
        raise HTTPException(status_code=409, detail="contract_must_be_signed_first")
    # Lock this contract's stages so two near-simultaneous checkout calls can't each
    # pass the reuse check and open a separate payable link (Z-Credit can't void the
    # loser). with_for_update() locks the rows on Postgres; SQLite ignores it silently.
    pending = (
        db.query(ContractPaymentStage)
        .filter(ContractPaymentStage.contract_id == c.id)
        .with_for_update()
        .populate_existing()
        .all()
    )
    pending = [s for s in pending if s.status != "paid"]
    if not pending:
        raise HTTPException(status_code=409, detail="contract_already_paid")
    pending.sort(key=lambda stage: stage.sort_order)

    # Reuse an open invoice rather than issuing a duplicate one. Covers repeat clicks,
    # and the case where one entry point asked for a combined invoice and another for a
    # single stage — both would otherwise stay payable side by side.
    # ?renew=true is the escape hatch for a dead Z-Credit link.
    if not renew:
        open_invoice = _open_invoice_for(pending)
        if open_invoice:
            doc_id, pay_url, covered = open_invoice
            logger.info(
                "contract checkout: reusing open invoice contract_id=%s session=%s stages=%s",
                c.id, doc_id, [s.id for s in covered],
            )
            return ContractCheckoutOut(
                status="ok",
                message="Open paymentUrl in the browser to complete payment.",
                gateway="zcredit",
                callbackUrl=_webhook_callback_url(request),
                sessionId=doc_id,
                paymentUrl=pay_url,
                stage=_stage_out(covered[0]),
                amount=sum(s.amount for s in covered),
                coveredStageIds=[s.id for s in covered],
                reused=True,
            )
        # A stage invoiced before the payment_url column existed has no stored link to
        # hand back. Issuing a fresh invoice would leave two payable links, so make the
        # caller replace it consciously with ?renew=true (which supersedes the old doc).
        if _has_unreusable_open_invoice(pending):
            raise HTTPException(status_code=409, detail="open_invoice_needs_renew")

    account = db.query(Account).filter(Account.id == c.account_id).first()
    if not account:
        raise HTTPException(status_code=404, detail="account_not_found")

    # Resolve URLs
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

    callback_url = _webhook_callback_url(request)
    cancel_url = f"{base_url}/contracts/sign/{token}"
    success_url = f"{base_url}/a/{account.id}/billing/success"

    # ── Combined payment: one invoice covers all pending stages ──────────────
    if combined and len(pending) > 1:
        total_amount = sum(s.amount for s in pending)
        if total_amount <= 0:
            raise HTTPException(status_code=400, detail="invalid_stage_amount")
        descriptions = [s.description or f"Stage {s.sort_order + 1}" for s in pending]
        combined_desc = f"Contract #{c.id} · " + " + ".join(descriptions)
        amount_minor = int(round(total_amount * 100))
        replaced_doc_id = pending[0].payment_doc_id
        session_id, pay_url = get_payment_gateway().create_invoice(
            account, amount_minor, c.currency, combined_desc,
            success_url=success_url, cancel_url=cancel_url, callback_url=callback_url,
        )
        # Store the same session_id on ALL pending stages so the webhook marks all paid
        for s in pending:
            _attach_invoice(s, session_id, pay_url)
        db.commit()
        record_invoice_safe(
            db,
            source_type=SOURCE_CONTRACT,
            source_id=c.id,
            account_id=c.account_id,
            amount=total_amount,
            currency=c.currency,
            description=combined_desc,
            provider_doc_id=session_id,
            provider_url=pay_url,
            lines=[InvoiceLineIn(s.description, s.amount, s.id) for s in pending],
            supersedes_doc_id=replaced_doc_id,
        )
        return ContractCheckoutOut(
            status="ok",
            message="Open paymentUrl in the browser to complete payment.",
            gateway="zcredit",
            callbackUrl=callback_url,
            sessionId=session_id,
            paymentUrl=pay_url,
            stage=_stage_out(pending[0]),
            amount=total_amount,
            coveredStageIds=[s.id for s in pending],
        )

    # ── Single-stage payment (default) ────────────────────────────────────────
    stage = pending[0]
    if stage.amount <= 0:
        raise HTTPException(status_code=400, detail="invalid_stage_amount")
    amount_minor = int(round(float(stage.amount) * 100))
    stage_desc = f"Contract #{c.id} · {stage.description or 'Payment'}"
    replaced_doc_id = stage.payment_doc_id
    session_id, pay_url = get_payment_gateway().create_invoice(
        account, amount_minor, c.currency, stage_desc,
        success_url=success_url, cancel_url=cancel_url, callback_url=callback_url,
    )
    _attach_invoice(stage, session_id, pay_url)
    db.commit()
    record_invoice_safe(
        db,
        source_type=SOURCE_CONTRACT,
        source_id=c.id,
        account_id=c.account_id,
        amount=stage.amount,
        currency=c.currency,
        description=stage_desc,
        provider_doc_id=session_id,
        provider_url=pay_url,
        lines=[InvoiceLineIn(stage.description, stage.amount, stage.id)],
        supersedes_doc_id=replaced_doc_id,
    )
    return ContractCheckoutOut(
        status="ok",
        message="Open paymentUrl in the browser to complete payment.",
        gateway="zcredit",
        callbackUrl=callback_url,
        sessionId=session_id,
        paymentUrl=pay_url,
        stage=_stage_out(stage),
        amount=stage.amount,
        coveredStageIds=[stage.id],
    )
