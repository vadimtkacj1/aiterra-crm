from datetime import datetime, timezone

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.api.deps import forbid_admin_client_card_write, get_current_user, require_account_member
from app.core.settings import settings
from app.db.session import get_db
from app.models.account import Account
from app.models.billing_instruction import AccountBillingInstruction
from app.models.billing_instruction_history import BillingInstructionHistory
from app.models.campaign import TrackedCampaign
from app.models.integration_google_ads import GoogleAdsIntegration
from app.models.membership import AccountMembership
from app.models.meta_topup import MetaTopup
from app.models.saved_card import SavedCard
from app.models.user import User
from app.schemas.accounts import AccountOut
from app.schemas.analytics import CampaignSnapshot
from app.schemas.billing import (
    BillingOverview,
    CardInfo,
    PayInvoiceResponse,
    PaymentRecord,
    PendingPaymentAction,
    SaveCardRequest,
    SubscriptionRecord,
    parse_stored_line_items,
)
from app.services import zcredit_service
from app.services.meta_analytics import build_meta_campaign_snapshot

router = APIRouter()


@router.get("", response_model=list[AccountOut])
def list_accounts(
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
) -> list[AccountOut]:
    rows = (
        db.query(Account)
        .join(AccountMembership, AccountMembership.account_id == Account.id)
        .filter(AccountMembership.user_id == user.id)
        .all()
    )
    with_meta = {
        aid
        for (aid,) in db.query(TrackedCampaign.account_id)
        .filter(TrackedCampaign.platform == "meta")
        .distinct()
        .all()
    }
    with_google = {
        aid
        for (aid,) in db.query(GoogleAdsIntegration.account_id).distinct().all()
    }
    return [
        AccountOut(id=a.id, name=a.name, hasMeta=a.id in with_meta, hasGoogle=a.id in with_google)
        for a in rows
    ]


@router.get("/{account_id}/meta/snapshot", response_model=CampaignSnapshot)
def meta_snapshot(
    account_id: int,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
) -> CampaignSnapshot:
    require_account_member(account_id, db, user)
    return build_meta_campaign_snapshot(db, account_id)


@router.get("/{account_id}/google/snapshot", response_model=CampaignSnapshot)
def google_snapshot(
    account_id: int,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
) -> CampaignSnapshot:
    require_account_member(account_id, db, user)
    if not settings.google_snapshot_mock:
        raise HTTPException(status_code=503, detail="google_snapshot_not_configured")

    # TODO: replace mock with real Google Ads API call.
    now_iso = datetime.now(timezone.utc).isoformat()
    return CampaignSnapshot(
        currency="USD",
        periodLabel="Last 30 days (mock)",
        periodI18nKey="analytics.period.last30Days",
        updatedAt=now_iso,
        totals={
            "impressions": 890000,
            "clicks": 31500,
            "spend": 9800.0,
            "conversions": 640,
            "reach": 0,
            "frequency": 0.0,
            "cpc": 0.0,
            "cpm": 0.0,
        },
        rows=[
            {
                "campaignId": "g-201",
                "campaignName": "Search — Brand",
                "impressions": 120000,
                "clicks": 18200,
                "spend": 2100.0,
                "conversions": 280,
                "ctr": 15.17,
            },
            {
                "campaignId": "g-202",
                "campaignName": "PMax — All products",
                "impressions": 770000,
                "clicks": 13300,
                "spend": 7700.0,
                "conversions": 360,
                "ctr": 1.73,
            },
        ],
    )


@router.get("/{account_id}/billing/card", response_model=CardInfo | None)
def get_saved_card(
    account_id: int,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
) -> CardInfo | None:
    require_account_member(account_id, db, user)
    card = db.query(SavedCard).filter(SavedCard.account_id == account_id).first()
    if not card:
        return None
    return CardInfo(
        holderName=card.holder_name,
        last4=card.last4,
        brand=card.brand,
        expMonth=card.exp_month,
        expYear=card.exp_year,
    )


@router.post("/{account_id}/billing/card", response_model=CardInfo)
def save_card(
    account_id: int,
    payload: SaveCardRequest,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
) -> CardInfo:
    """Save a Z-Credit token as the account's default payment method."""
    require_account_member(account_id, db, user)
    forbid_admin_client_card_write(user)
    account = db.query(Account).filter(Account.id == account_id).first()
    if not account:
        raise HTTPException(status_code=404, detail="account_not_found")

    zcredit_token = payload.zcreditToken.strip()
    holder_name = (payload.holderName or "").strip() or "Cardholder"

    # Retrieve card display info from Z-Credit (last4, brand, expiry)
    last4, brand, exp_month, exp_year = zcredit_service.fetch_token_card_info(zcredit_token)

    token_id = zcredit_service.ensure_customer(
        account,
        account.zcredit_token_id,
        customer_email=user.email,
        customer_name=user.display_name,
    )
    account.zcredit_token_id = token_id or account.zcredit_token_id
    db.add(account)
    db.commit()

    card = db.query(SavedCard).filter(SavedCard.account_id == account_id).first()
    if card:
        card.holder_name = holder_name
        card.last4 = last4
        card.brand = brand
        card.exp_month = exp_month
        card.exp_year = exp_year
        card.zcredit_token_id = token_id or card.zcredit_token_id
        card.zcredit_token = zcredit_token
    else:
        card = SavedCard(
            account_id=account_id,
            holder_name=holder_name,
            last4=last4,
            brand=brand,
            exp_month=exp_month,
            exp_year=exp_year,
            zcredit_token_id=token_id,
            zcredit_token=zcredit_token,
        )
        db.add(card)
    db.commit()
    db.refresh(card)
    return CardInfo(
        holderName=card.holder_name,
        last4=card.last4,
        brand=card.brand,
        expMonth=card.exp_month,
        expYear=card.exp_year,
    )


@router.delete("/{account_id}/billing/card", status_code=204)
def delete_card(
    account_id: int,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
) -> None:
    require_account_member(account_id, db, user)
    forbid_admin_client_card_write(user)
    card = db.query(SavedCard).filter(SavedCard.account_id == account_id).first()
    if card:
        if card.zcredit_token:
            zcredit_service.detach_token(card.zcredit_token)
        db.delete(card)
        db.commit()


@router.post("/{account_id}/billing/pay-invoice", response_model=PayInvoiceResponse)
def pay_open_invoice(
    account_id: int,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
) -> PayInvoiceResponse:
    """Pay the account's open payment document with the saved Z-Credit token."""
    require_account_member(account_id, db, user)
    forbid_admin_client_card_write(user)
    instruction = (
        db.query(AccountBillingInstruction)
        .filter(AccountBillingInstruction.account_id == account_id)
        .first()
    )
    if not instruction or not instruction.payment_doc_id:
        raise HTTPException(status_code=400, detail="no_open_invoice")
    if instruction.charge_type not in ("one_time", "monthly"):
        raise HTTPException(status_code=400, detail="no_open_invoice")

    card = db.query(SavedCard).filter(SavedCard.account_id == account_id).first()
    if not card or not card.zcredit_token:
        raise HTTPException(status_code=400, detail="no_saved_card")

    inv = zcredit_service.try_retrieve_invoice(instruction.payment_doc_id)
    if not inv or getattr(inv, "status", None) != "open":
        raise HTTPException(status_code=400, detail="invoice_not_open")

    paid = zcredit_service.pay_open_invoice(instruction.payment_doc_id, card.zcredit_token)
    status = str(getattr(paid, "status", "") or "")
    url = getattr(paid, "payment_url", None)
    return PayInvoiceResponse(status=status, hostedInvoiceUrl=str(url) if url else None)


@router.get("/{account_id}/billing/overview", response_model=BillingOverview)
def billing_overview(
    account_id: int,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
) -> BillingOverview:
    require_account_member(account_id, db, user)

    # Z-Credit has no customer portal
    billing_portal_available = False

    # Real payments — Meta top-ups done by admin for this account
    topups = (
        db.query(MetaTopup)
        .filter(MetaTopup.account_id == account_id)
        .order_by(MetaTopup.id.desc())
        .limit(100)
        .all()
    )

    payments: list[PaymentRecord] = []
    for t in topups:
        created = str(t.created_at)[:10] if t.created_at else "—"
        status_map = {"sent_to_meta": "succeeded", "failed": "failed", "pending": "pending"}
        payments.append(
            PaymentRecord(
                id=str(t.id),
                date=created,
                amount=t.amount,
                currency=t.currency,
                description="Meta Ads — top-up",
                status=status_map.get(t.status, "pending"),
            )
        )

    instruction = (
        db.query(AccountBillingInstruction)
        .filter(AccountBillingInstruction.account_id == account_id)
        .first()
    )

    pending_payments: list[PendingPaymentAction] = []
    subscriptions: list[SubscriptionRecord] = []

    card_row = db.query(SavedCard).filter(SavedCard.account_id == account_id).first()
    has_saved_card = bool(card_row and card_row.zcredit_token)

    if instruction and instruction.charge_type == "one_time" and instruction.amount:
        inv = zcredit_service.try_retrieve_invoice(instruction.payment_doc_id or "")
        inv_status = getattr(inv, "status", None) if inv else None

        if inv_status == "paid" and inv:
            paid_minor = int(getattr(inv, "amount_paid", 0) or 0)
            paid_amt = (paid_minor / 100.0) if paid_minor else float(instruction.amount)
            cur_raw = getattr(inv, "currency", None) or instruction.currency or "ils"
            cur = str(cur_raw).upper()
            c_ts = getattr(inv, "created", None)
            date_s = "—"
            if c_ts is not None:
                try:
                    date_s = datetime.fromtimestamp(int(c_ts), tz=timezone.utc).strftime("%Y-%m-%d")
                except (TypeError, ValueError):
                    date_s = "—"
            payments.insert(
                0,
                PaymentRecord(
                    id=str(getattr(inv, "id", "") or f"bi_{instruction.id}"),
                    date=date_s,
                    amount=round(paid_amt, 2),
                    currency=cur,
                    description=instruction.description or "Platform invoice",
                    status="succeeded",
                ),
            )

    elif instruction and instruction.charge_type == "monthly" and instruction.amount:
        bi_lines = parse_stored_line_items(instruction.line_items_json)
        if instruction.payment_recurring_id:
            sub_status = instruction.subscription_status or "active"
            subscriptions.append(
                SubscriptionRecord(
                    id=instruction.payment_recurring_id,
                    planName=instruction.description or "Monthly subscription",
                    status=sub_status,
                    renewsAt="—",
                    amount=instruction.amount,
                    currency=instruction.currency,
                )
            )

        inv = zcredit_service.try_retrieve_invoice(instruction.payment_doc_id or "")
        inv_status = getattr(inv, "status", None) if inv else None
        pay_url = instruction.payment_url or (
            str(inv.payment_url) if inv and getattr(inv, "payment_url", None) else None
        )
        # Same mock fallback as one_time branch above.
        if not pay_url:
            from app.services import zcredit_service as _zs
            if not _zs._is_configured():
                key = instruction.payment_doc_id or f"ins_{instruction.id}"
                pay_url = _zs._mock_payment_url(key)
        first_invoice_open = inv_status == "open"
        assume_open = first_invoice_open or (
            bool(pay_url) and inv_status != "paid"
        )
        if assume_open and inv_status != "paid":
            pay_with_card = bool(
                has_saved_card and first_invoice_open and bool(instruction.payment_doc_id)
            )
            pending_payments.append(
                PendingPaymentAction(
                    id=f"bi_{instruction.id}_sub",
                    flow="monthly",
                    amount=instruction.amount,
                    currency=instruction.currency,
                    summary=instruction.description or "Monthly subscription",
                    payUrl=pay_url,
                    lineItems=bi_lines,
                    payWithSavedCardAvailable=pay_with_card,
                )
            )

    # All still-open one-time invoices for this account (including superseded history rows).
    # The live AccountBillingInstruction row is replaced on each admin change, but older
    # hosted invoices can remain unpaid — surface each as its own pending row.
    live_one_time_doc: str | None = (
        instruction.payment_doc_id
        if instruction and instruction.charge_type == "one_time" and instruction.payment_doc_id
        else None
    )
    covered_one_time_docs: set[str] = set()

    def append_open_one_time_pending(
        *,
        pending_id: str,
        amount: float,
        currency: str,
        description: str | None,
        line_items_json: str | None,
        payment_doc_id: str | None,
        stored_payment_url: str | None,
    ) -> None:
        if not amount or not payment_doc_id:
            return
        if payment_doc_id in covered_one_time_docs:
            return
        bi_lines = parse_stored_line_items(line_items_json)
        inv = zcredit_service.try_retrieve_invoice(payment_doc_id)
        inv_status = getattr(inv, "status", None) if inv else None
        if inv_status == "paid":
            return
        if inv_status in ("void", "uncollectible"):
            return
        pay_url = stored_payment_url or (
            str(inv.payment_url) if inv and getattr(inv, "payment_url", None) else None
        )
        if not pay_url:
            from app.services import zcredit_service as _zs

            if not _zs._is_configured():
                pay_url = _zs._mock_payment_url(payment_doc_id)
        if not pay_url:
            return
        pay_with_card = bool(
            has_saved_card
            and inv_status == "open"
            and bool(payment_doc_id)
            and payment_doc_id == live_one_time_doc
        )
        pending_payments.append(
            PendingPaymentAction(
                id=pending_id,
                flow="one_time",
                amount=amount,
                currency=currency,
                summary=description or "One-time fee",
                payUrl=pay_url,
                lineItems=bi_lines,
                payWithSavedCardAvailable=pay_with_card,
            )
        )
        covered_one_time_docs.add(payment_doc_id)

    history_rows = (
        db.query(BillingInstructionHistory)
        .filter(BillingInstructionHistory.account_id == account_id)
        .order_by(BillingInstructionHistory.id.asc())
        .all()
    )
    for h in history_rows:
        if h.charge_type != "one_time" or not h.amount or h.record_status == "revoked":
            continue
        append_open_one_time_pending(
            pending_id=f"bh_{h.id}",
            amount=float(h.amount),
            currency=h.currency,
            description=h.description,
            line_items_json=h.line_items_json,
            payment_doc_id=h.payment_doc_id,
            stored_payment_url=h.payment_url,
        )

    if (
        instruction
        and instruction.charge_type == "one_time"
        and instruction.amount
        and instruction.payment_doc_id
        and instruction.payment_doc_id not in covered_one_time_docs
    ):
        append_open_one_time_pending(
            pending_id=f"bi_{instruction.id}",
            amount=float(instruction.amount),
            currency=instruction.currency,
            description=instruction.description,
            line_items_json=instruction.line_items_json,
            payment_doc_id=instruction.payment_doc_id,
            stored_payment_url=instruction.payment_url,
        )

    return BillingOverview(
        payments=payments,
        subscriptions=subscriptions,
        offers=[],
        pendingPayments=pending_payments if pending_payments else None,
        billingPortalAvailable=billing_portal_available,
    )
