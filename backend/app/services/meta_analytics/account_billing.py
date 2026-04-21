"""Meta ad account billing summary (balance, cap, transactions)."""

from __future__ import annotations

import logging

from fastapi import HTTPException
from sqlalchemy.orm import Session

from app.schemas.analytics import MetaAccountBilling, MetaBillingTransaction
from app.services.meta_graph import normalize_meta_ad_account_id
from app.services.meta_integration import get_global_meta_integration
from app.services.meta_marketing import (
    as_float,
    as_int,
    fetch_ad_account_billing_transactions,
    fetch_ad_account_info,
    scalar_str,
)

logger = logging.getLogger(__name__)


def build_meta_billing(db: Session) -> MetaAccountBilling:
    integration = get_global_meta_integration(db)
    if not integration:
        raise HTTPException(status_code=400, detail="meta_not_connected")

    aid = normalize_meta_ad_account_id(integration.ad_account_id)
    token = integration.access_token

    info, err = fetch_ad_account_info(aid, token)
    if err:
        logger.warning("Meta billing: ad account fetch failed ad_account=%s: %s", aid, err)
        raise HTTPException(status_code=502, detail=err)

    # Meta returns amount_spent / balance / spend_cap in cents (×0.01 for most currencies)
    def cents(v: object) -> float:
        return round(as_float(v) / 100, 2)

    account_name = scalar_str(info.get("name")) or aid
    currency = scalar_str(info.get("currency")).upper() or "USD"
    amount_spent = cents(info.get("amount_spent"))
    balance = cents(info.get("balance"))
    spend_cap_raw = info.get("spend_cap")
    spend_cap = cents(spend_cap_raw) if spend_cap_raw and str(spend_cap_raw) != "0" else 0.0

    status_map = {
        1: "ACTIVE",
        2: "DISABLED",
        3: "UNSETTLED",
        7: "PENDING_RISK_REVIEW",
        8: "PENDING_SETTLEMENT",
        9: "IN_GRACE_PERIOD",
        100: "PENDING_CLOSURE",
        101: "CLOSED",
        201: "ANY_ACTIVE",
        202: "ANY_CLOSED",
    }
    status_code = as_int(info.get("account_status"))
    account_status = status_map.get(status_code, str(status_code))

    funding: dict = {}
    fsd = info.get("funding_source_details")
    if isinstance(fsd, dict):
        funding = fsd
    funding_label = scalar_str(funding.get("display_string")) or scalar_str(funding.get("type")) or "—"

    # Transactions
    raw_tx, _ = fetch_ad_account_billing_transactions(aid, token)
    transactions: list[MetaBillingTransaction] = []
    for tx in raw_tx:
        if not isinstance(tx, dict):
            continue
        tx_id = scalar_str(tx.get("id"))
        if not tx_id:
            continue
        transactions.append(
            MetaBillingTransaction(
                id=tx_id,
                time=scalar_str(tx.get("time")),
                amount=round(as_float(tx.get("amount")) / 100, 2),
                currency=scalar_str(tx.get("currency")).upper() or currency,
                status=scalar_str(tx.get("status")) or "—",
                txType=scalar_str(tx.get("type")) or "—",
            )
        )
    transactions.sort(key=lambda x: x.time, reverse=True)

    return MetaAccountBilling(
        accountName=account_name,
        currency=currency,
        amountSpent=amount_spent,
        balance=balance,
        spendCap=spend_cap,
        accountStatus=account_status,
        fundingSource=funding_label,
        transactions=transactions,
    )
