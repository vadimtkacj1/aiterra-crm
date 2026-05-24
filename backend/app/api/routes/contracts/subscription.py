"""
Subscription payment tracking and testing endpoints.
"""

from __future__ import annotations

import logging
from datetime import datetime, timedelta
from typing import Any

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from sqlalchemy.orm import Session

from app.api.deps import require_admin
from app.db.session import get_db
from app.models.billing import AccountBillingInstruction, SubscriptionPayment
from app.models.contracts import Contract
from app.models.core import User

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
    payments: list[SubscriptionPaymentOut]


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

    if not contract.billing_instruction_id:
        raise HTTPException(status_code=400, detail="contract_has_no_subscription")

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
            # First payment is 30 days after signing
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

    # Create simulated payment
    payment = SubscriptionPayment(
        billing_instruction_id=billing.id,
        contract_id=contract.id,
        amount=billing.amount or 0,
        currency=billing.currency,
        payment_number=payment_count + 1,
        status="success",
        zcredit_transaction_id=f"TEST-{datetime.utcnow().timestamp()}",
        zcredit_approval_number=f"SIMULATED-{payment_count + 1}",
    )
    db.add(payment)
    db.commit()
    db.refresh(payment)

    logger.info(
        "Simulated subscription payment #%d for contract_id=%s (TEST MODE)",
        payment.payment_number,
        contract_id,
    )

    return {
        "success": True,
        "payment_number": payment.payment_number,
        "amount": payment.amount,
        "currency": payment.currency,
        "message": f"Simulated payment #{payment.payment_number} of {billing.amount} {billing.currency}",
    }
