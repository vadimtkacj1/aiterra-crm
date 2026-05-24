"""Write path for admin billing instructions (Z-Credit sync + history row)."""

from __future__ import annotations

import json

from fastapi import HTTPException
from sqlalchemy.orm import Session

from app.api.routes.admin import common
from app.models.billing import AccountBillingInstruction, BillingInstructionHistory
from app.models.core import Account, User
from app.schemas.billing import (
    BillingInstructionIn,
    BillingInstructionOut,
    monthly_amount_for_installment_plan,
    parse_stored_line_items,
)
from app.services import zcredit_service
from app.services.admin.audit import log_admin_action


def sync_account_billing_instruction(
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
        common.mark_active_history_superseded(db, account_id)

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
    if payload.chargeType == "none":
        instruction.amount = None
        instruction.installment_months = None
        instruction.installment_total_amount = None
    elif payload.chargeType == "monthly" and payload.splitAcrossMonths:
        contract_total = float(payload.amount or 0)
        instruction.amount = monthly_amount_for_installment_plan(contract_total, payload.splitAcrossMonths)
        instruction.installment_months = payload.splitAcrossMonths
        instruction.installment_total_amount = contract_total
    else:
        instruction.amount = payload.amount
        instruction.installment_months = None
        instruction.installment_total_amount = None
    instruction.currency = payload.currency.upper()
    instruction.description = (payload.description or "").strip() or None
    instruction.payment_doc_id = None
    instruction.payment_url = None
    instruction.payment_recurring_id = None
    instruction.payment_plan_id = None
    instruction.subscription_status = None

    if payload.chargeType == "none":
        instruction.line_items_json = None
    elif payload.splitAcrossMonths:
        instruction.line_items_json = None
    elif payload.lineItems:
        instruction.line_items_json = json.dumps(
            [{"code": li.code, "label": li.label, "amount": li.amount} for li in payload.lineItems],
            ensure_ascii=False,
        )
    else:
        instruction.line_items_json = None

    if payload.chargeType != "none" and instruction.amount and instruction.amount > 0:
        owner_email, owner_name = common.account_owner_contact(db, account_id)
        token_id = zcredit_service.ensure_customer(
            account,
            account.zcredit_token_id,
            customer_email=owner_email,
            customer_name=owner_name,
        )
        if token_id:
            account.zcredit_token_id = token_id
            db.add(account)

        amount_minor = int(round(float(instruction.amount) * 100))
        description = instruction.description or (
            "One-time fee" if payload.chargeType == "one_time" else "Monthly subscription"
        )
        if payload.lineItems:
            description = instruction.description or ", ".join(li.label for li in payload.lineItems)
        elif payload.splitAcrossMonths and payload.chargeType == "monthly":
            description = instruction.description or (
                f"Monthly installment ({payload.splitAcrossMonths} months)"
            )

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
            try:
                recurring_id, plan_id, payment_url, first_doc_id = zcredit_service.create_subscription(
                    account,
                    None,
                    amount_minor,
                    payload.currency,
                    description,
                )
            except Exception as e:
                error_msg = str(e)
                print(f"ERROR: Z-Credit subscription creation failed: {error_msg}")
                raise HTTPException(
                    status_code=502,
                    detail=f"Z-Credit API error: {error_msg[:200]}"
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
                installment_months=instruction.installment_months,
                installment_total_amount=instruction.installment_total_amount,
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
        paymentUrl=instruction.payment_url,
        installmentMonths=instruction.installment_months,
        installmentTotalAmount=instruction.installment_total_amount,
    )
