"""
Subscription payment tracking and testing endpoints.
"""

from __future__ import annotations

import logging
from datetime import timedelta
from typing import Any

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from sqlalchemy.orm import Session

from app.api.deps import require_admin
from app.db.session import get_db
from app.models.billing import AccountBillingInstruction, SavedCard, SubscriptionPayment
from app.models.contracts import Contract
from app.models.core import User
from app.services.payments.zcredit.service import (
    _is_gateway_configured,
    pay_open_invoice,
)

logger = logging.getLogger(__name__)

router = APIRouter()


class SubscriptionPaymentOut(BaseModel):
    id: int
    payment_number: int
    amount: float
    currency: str
    status: str
    paid_at: str
    expected_date: str | None
    zcredit_transaction_id: str | None


class SubscriptionStatusOut(BaseModel):
    contract_id: int
    contract_title: str
    monthly_amount: float
    currency: str
    subscription_months: int | None
    subscription_status: str | None
    started_at: str | None
    next_payment_date: str | None
    payments_made: int
    payments_remaining: int | None
    total_paid: float
    billing_day: int | None
    test_interval_minutes: int | None
    payments: list[SubscriptionPaymentOut]


class BillingDayUpdateIn(BaseModel):
    billing_day: int | None


class TestIntervalIn(BaseModel):
    minutes: int | None


@router.get("/contracts/{contract_id}/subscription")
def get_contract_subscription_status(
    contract_id: int,
    db: Session = Depends(get_db),
    admin: User = Depends(require_admin),
) -> SubscriptionStatusOut:
    """Get subscription status and payment history for a contract."""
    contract = db.query(Contract).filter(Contract.id == contract_id).first()
    if not contract:
        raise HTTPException(status_code=404, detail="contract_not_found")

    # If billing hasn't been activated yet, return a pending status with no payments
    if not contract.billing_instruction_id:
        return SubscriptionStatusOut(
            contract_id=contract.id,
            contract_title=contract.title,
            monthly_amount=contract.monthly_amount or 0,
            currency=contract.currency,
            subscription_months=contract.subscription_months,
            subscription_status="pending",
            started_at=contract.signed_at.isoformat() if contract.signed_at else None,
            next_payment_date=None,
            payments_made=0,
            payments_remaining=contract.subscription_months,
            total_paid=0,
            billing_day=contract.billing_day,
            test_interval_minutes=None,
            payments=[],
        )

    billing = db.query(AccountBillingInstruction).filter(
        AccountBillingInstruction.id == contract.billing_instruction_id
    ).first()

    if not billing:
        raise HTTPException(status_code=404, detail="billing_instruction_not_found")

    # Get all payments for this subscription
    payments = db.query(SubscriptionPayment).filter(
        SubscriptionPayment.billing_instruction_id == billing.id
    ).order_by(SubscriptionPayment.payment_number).all()

    payments_made = len([p for p in payments if p.status == "success"])
    total_paid = sum(p.amount for p in payments if p.status == "success")

    # Calculate next payment date (30 days after last payment, or 30 days after contract signed)
    next_payment_date = None
    if contract.signed_at:
        if payments:
            last_payment = max(payments, key=lambda p: p.paid_at)
            next_payment_date = (last_payment.paid_at + timedelta(days=30)).isoformat()
        else:
            next_payment_date = (contract.signed_at + timedelta(days=30)).isoformat()

    # Calculate remaining payments
    payments_remaining = None
    if contract.subscription_months:
        payments_remaining = max(0, contract.subscription_months - payments_made)

    return SubscriptionStatusOut(
        contract_id=contract.id,
        contract_title=contract.title,
        monthly_amount=contract.monthly_amount or 0,
        currency=contract.currency,
        subscription_months=contract.subscription_months,
        subscription_status=billing.subscription_status,
        started_at=contract.signed_at.isoformat() if contract.signed_at else None,
        next_payment_date=next_payment_date,
        payments_made=payments_made,
        payments_remaining=payments_remaining,
        total_paid=total_paid,
        billing_day=billing.billing_day,
        test_interval_minutes=billing.test_interval_minutes,
        payments=[
            SubscriptionPaymentOut(
                id=p.id,
                payment_number=p.payment_number,
                amount=p.amount,
                currency=p.currency,
                status=p.status,
                paid_at=p.paid_at.isoformat(),
                expected_date=p.expected_date.isoformat() if p.expected_date else None,
                zcredit_transaction_id=p.zcredit_transaction_id,
            )
            for p in payments
        ],
    )


@router.patch("/contracts/{contract_id}/subscription/billing-day")
def update_billing_day(
    contract_id: int,
    body: BillingDayUpdateIn,
    db: Session = Depends(get_db),
    admin: User = Depends(require_admin),
) -> SubscriptionStatusOut:
    """Update the billing day on an existing subscription contract and its billing instruction."""
    if body.billing_day is not None and not (1 <= body.billing_day <= 28):
        raise HTTPException(status_code=400, detail="billing_day_must_be_1_to_28")

    contract = db.query(Contract).filter(Contract.id == contract_id).first()
    if not contract:
        raise HTTPException(status_code=404, detail="contract_not_found")

    contract.billing_day = body.billing_day

    # Also update billing instruction if it exists
    if contract.billing_instruction_id:
        billing = db.query(AccountBillingInstruction).filter(
            AccountBillingInstruction.id == contract.billing_instruction_id
        ).first()
        if billing:
            billing.billing_day = body.billing_day

    db.commit()
    db.refresh(contract)

    return get_contract_subscription_status(contract_id, db, admin)


@router.post("/contracts/{contract_id}/subscription/simulate-payment")
def simulate_monthly_payment(
    contract_id: int,
    db: Session = Depends(get_db),
    admin: User = Depends(require_admin),
) -> dict[str, Any]:
    """
    TEST ONLY: Simulate a monthly subscription payment without waiting 30 days.
    This creates a SubscriptionPayment record as if Z-Credit sent a webhook.
    """
    contract = db.query(Contract).filter(Contract.id == contract_id).first()
    if not contract:
        raise HTTPException(status_code=404, detail="contract_not_found")

    if not contract.billing_instruction_id:
        raise HTTPException(status_code=400, detail="contract_has_no_subscription")

    billing = db.query(AccountBillingInstruction).filter(
        AccountBillingInstruction.id == contract.billing_instruction_id
    ).first()

    if not billing or billing.charge_type != "monthly":
        raise HTTPException(status_code=400, detail="not_a_monthly_subscription")

    # Check if subscription is complete
    if contract.subscription_months:
        payment_count = db.query(SubscriptionPayment).filter(
            SubscriptionPayment.billing_instruction_id == billing.id,
            SubscriptionPayment.status == "success",
        ).count()

        if payment_count >= contract.subscription_months:
            raise HTTPException(status_code=400, detail="subscription_already_complete")

    # Count existing payments to determine payment number
    payment_count = db.query(SubscriptionPayment).filter(
        SubscriptionPayment.billing_instruction_id == billing.id
    ).count()

    # Require Gateway to be configured
    if not _is_gateway_configured():
        raise HTTPException(
            status_code=503,
            detail="zcredit_gateway_not_configured: set ZCREDIT_TERMINAL_NUMBER and ZCREDIT_GATEWAY_PASSWORD in .env",
        )

    # Require a saved card token for this account
    saved_card = (
        db.query(SavedCard)
        .filter(SavedCard.account_id == billing.account_id)
        .first()
    )
    if not saved_card or not saved_card.zcredit_token:
        raise HTTPException(
            status_code=400,
            detail="no_saved_card: account has no saved card token — client must complete checkout first",
        )

    # Charge the saved card via Gateway
    doc = pay_open_invoice(
        f"manual_{contract_id}_{payment_count + 1}",
        saved_card.zcredit_token,
        amount_major=float(billing.amount or 0),
        currency=billing.currency or "ILS",
    )

    payment = SubscriptionPayment(
        billing_instruction_id=billing.id,
        contract_id=contract.id,
        amount=billing.amount or 0,
        currency=billing.currency,
        payment_number=payment_count + 1,
        status="success",
        zcredit_transaction_id=doc.id,
        zcredit_approval_number=None,
    )
    db.add(payment)
    db.commit()
    db.refresh(payment)

    logger.info(
        "Real charge payment #%d for contract_id=%s transaction=%s",
        payment.payment_number,
        contract_id,
        doc.id,
    )

    return {
        "success": True,
        "payment_number": payment.payment_number,
        "amount": payment.amount,
        "currency": payment.currency,
        "transaction_id": doc.id,
        "message": f"Charged payment #{payment.payment_number} of {billing.amount} {billing.currency}",
    }


def _get_billing_or_404(contract_id: int, db: Session) -> tuple[Contract, AccountBillingInstruction]:
    contract = db.query(Contract).filter(Contract.id == contract_id).first()
    if not contract:
        raise HTTPException(status_code=404, detail="contract_not_found")
    if not contract.billing_instruction_id:
        raise HTTPException(status_code=400, detail="subscription_not_activated")
    billing = db.query(AccountBillingInstruction).filter(
        AccountBillingInstruction.id == contract.billing_instruction_id
    ).first()
    if not billing:
        raise HTTPException(status_code=404, detail="billing_instruction_not_found")
    return contract, billing


@router.patch("/contracts/{contract_id}/subscription/pause")
def pause_subscription(
    contract_id: int,
    db: Session = Depends(get_db),
    admin: User = Depends(require_admin),
) -> SubscriptionStatusOut:
    contract, billing = _get_billing_or_404(contract_id, db)
    billing.subscription_status = "paused"
    db.commit()
    return get_contract_subscription_status(contract_id, db, admin)


@router.patch("/contracts/{contract_id}/subscription/resume")
def resume_subscription(
    contract_id: int,
    db: Session = Depends(get_db),
    admin: User = Depends(require_admin),
) -> SubscriptionStatusOut:
    contract, billing = _get_billing_or_404(contract_id, db)
    billing.subscription_status = "active"
    db.commit()
    return get_contract_subscription_status(contract_id, db, admin)


@router.patch("/contracts/{contract_id}/subscription/cancel")
def cancel_subscription(
    contract_id: int,
    db: Session = Depends(get_db),
    admin: User = Depends(require_admin),
) -> SubscriptionStatusOut:
    contract, billing = _get_billing_or_404(contract_id, db)
    billing.subscription_status = "cancelled"
    billing.test_interval_minutes = None
    db.commit()
    return get_contract_subscription_status(contract_id, db, admin)


@router.patch("/contracts/{contract_id}/subscription/test-interval")
def set_test_interval(
    contract_id: int,
    body: TestIntervalIn,
    db: Session = Depends(get_db),
    admin: User = Depends(require_admin),
) -> SubscriptionStatusOut:
    """Set or clear the test-interval minutes on a subscription billing instruction.

    If no billing instruction exists yet (client hasn't completed checkout), one is
    auto-created from the contract's monthly_amount / currency / billing_day so that
    admins can start test billing immediately after the contract is signed.
    """
    if body.minutes is not None and body.minutes < 1:
        raise HTTPException(status_code=400, detail="minutes_must_be_positive")

    contract = db.query(Contract).filter(Contract.id == contract_id).first()
    if not contract:
        raise HTTPException(status_code=404, detail="contract_not_found")

    if not contract.monthly_amount or contract.monthly_amount <= 0:
        raise HTTPException(status_code=400, detail="not_a_monthly_subscription")

    if contract.billing_instruction_id:
        billing = db.query(AccountBillingInstruction).filter(
            AccountBillingInstruction.id == contract.billing_instruction_id
        ).first()
        if not billing:
            raise HTTPException(status_code=404, detail="billing_instruction_not_found")
    else:
        # Reuse existing billing instruction for this account, or create one.
        billing = db.query(AccountBillingInstruction).filter(
            AccountBillingInstruction.account_id == contract.account_id
        ).first()
        if not billing:
            billing = AccountBillingInstruction(
                account_id=contract.account_id,
                charge_type="monthly",
                amount=contract.monthly_amount,
                currency=contract.currency,
                billing_day=contract.billing_day,
                subscription_status="active",
            )
            db.add(billing)
            db.flush()
        else:
            billing.charge_type = "monthly"
            billing.amount = billing.amount or contract.monthly_amount
        contract.billing_instruction_id = billing.id

    billing.test_interval_minutes = body.minutes
    if body.minutes is not None:
        billing.subscription_status = "active"

    db.commit()
    return get_contract_subscription_status(contract_id, db, admin)
