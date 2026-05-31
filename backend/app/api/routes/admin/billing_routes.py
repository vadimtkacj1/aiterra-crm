from __future__ import annotations

import json
import logging
from datetime import datetime, timezone

logger = logging.getLogger(__name__)

from fastapi import APIRouter, Depends, HTTPException
from starlette.responses import Response as StarletteResponse
from sqlalchemy import desc
from sqlalchemy.orm import Session

from app.api.deps import require_admin
from app.api.routes.admin import billing_sync, common
from app.db.session import get_db
from app.models.billing import (
    AccountBillingInstruction,
    BillingInstructionHistory,
    InvoiceTemplate,
    MetaTopup,
)
from app.models.core import Account, User
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
from app.services import zcredit_service
from app.services.admin.audit import log_admin_action

router = APIRouter()


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
        return BillingInstructionOut(
            chargeType="none",
            amount=None,
            currency="ILS",
            description=None,
            lineItems=None,
            installmentMonths=None,
            installmentTotalAmount=None,
        )
    return BillingInstructionOut(
        chargeType=instruction.charge_type,
        amount=instruction.amount,
        currency=instruction.currency,
        description=instruction.description,
        lineItems=parse_stored_line_items(instruction.line_items_json),
        paymentUrl=instruction.payment_url,
        installmentMonths=instruction.installment_months,
        installmentTotalAmount=instruction.installment_total_amount,
        billingDay=instruction.billing_day,
        billingWeekDay=getattr(instruction, "billing_week_day", None),
        testIntervalMinutes=instruction.test_interval_minutes,
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
    return billing_sync.sync_account_billing_instruction(db, account_id, admin, payload)


@router.put(
    "/accounts/{account_id}/billing-instruction/test-interval",
    response_model=BillingInstructionOut,
)
def set_test_billing_interval(
    account_id: int,
    minutes: int | None = None,
    db: Session = Depends(get_db),
    _: User = Depends(require_admin),
) -> BillingInstructionOut:
    """Set or clear the test interval (minutes) on an existing billing instruction.

    Pass ?minutes=10 to charge every 10 minutes (requires SUBSCRIPTION_BILLING_TEST_ENABLED=true).
    Pass ?minutes= (omit) to clear and revert to normal monthly billing.
    """
    instruction = (
        db.query(AccountBillingInstruction)
        .filter(AccountBillingInstruction.account_id == account_id)
        .first()
    )
    if not instruction:
        raise HTTPException(status_code=404, detail="billing_instruction_not_found")
    instruction.test_interval_minutes = minutes
    db.add(instruction)
    db.commit()
    db.refresh(instruction)
    return BillingInstructionOut(
        chargeType=instruction.charge_type,
        amount=instruction.amount,
        currency=instruction.currency,
        description=instruction.description,
        lineItems=parse_stored_line_items(instruction.line_items_json),
        paymentUrl=instruction.payment_url,
        installmentMonths=instruction.installment_months,
        installmentTotalAmount=instruction.installment_total_amount,
        billingDay=instruction.billing_day,
        billingWeekDay=getattr(instruction, "billing_week_day", None),
        testIntervalMinutes=instruction.test_interval_minutes,
    )


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
        installmentMonths=row.installment_months,
        billingDay=row.billing_day,
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
        installment_months=body.splitAcrossMonths,
        billing_day=body.billingDay,
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
) -> StarletteResponse:
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
    return StarletteResponse(status_code=204)


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
        splitAcrossMonths=tpl.installment_months,
        billingDay=tpl.billing_day if tpl.charge_type == "monthly" else None,
    )
    out = billing_sync.sync_account_billing_instruction(db, account_id, admin, payload)
    # sync_account_billing_instruction commits internally; this second commit persists the
    # "invoice_template_applied" audit entry. Wrap so a commit failure here never masks the
    # billing change that already landed.
    try:
        log_admin_action(
            db,
            admin,
            "invoice_template_applied",
            resource_type="invoice_template",
            resource_id=str(template_id),
            detail={"accountId": account_id},
        )
        db.commit()
    except Exception:
        logger.warning("billing_routes: could not write invoice_template_applied audit log", exc_info=True)
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
        owner_emails[aid] = common.account_owner_contact(db, aid)[0]
    out: list[BillingHistoryWithAccountOut] = []
    for row in rows:
        live = lives.get(row.account_id)
        base = common.history_to_out(row, live)
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
    return [common.history_to_out(r, live) for r in rows]


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
            instruction.billing_day = None
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
    return common.history_to_out(row, live)


@router.delete("/accounts/{account_id}/billing-history/{history_id}", status_code=204)
def delete_billing_history_row(
    account_id: int,
    history_id: int,
    db: Session = Depends(get_db),
    admin: User = Depends(require_admin),
) -> StarletteResponse:
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
    return StarletteResponse(status_code=204)
