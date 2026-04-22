"""
Z-Credit payment service — replaces Stripe.

Z-Credit (https://www.z-credit.com/) is an Israeli card processor.
API credentials are provided after merchant account approval.

TODO: Replace all stub implementations below with real Z-Credit WebAPI calls
      once you receive credentials and documentation from Z-Credit.
      Contact: info@z-credit.com | 077-32-33-190
"""

from __future__ import annotations

import logging
import uuid
from dataclasses import dataclass, field
from typing import Any

import httpx
from fastapi import HTTPException

from app.core.settings import settings
from app.models.account import Account

logger = logging.getLogger(__name__)

# ── Internal result types (mirror the attributes callers used on Stripe objects) ─

@dataclass
class ZCreditDoc:
    """Represents a Z-Credit payment document / transaction."""
    id: str
    status: str                 # "open" | "paid" | "void" | "pending" | "failed"
    amount_paid: int = 0        # amount in agorot (1/100 ILS) / cents
    currency: str = "ILS"
    created: int = 0            # unix timestamp
    payment_url: str | None = None   # Z-Credit hosted payment page URL


@dataclass
class ZCreditRecurring:
    """Represents a Z-Credit recurring billing / standing order."""
    id: str
    status: str                 # "active" | "canceled" | "past_due"


@dataclass
class ZCreditToken:
    """Represents a saved card token in Z-Credit."""
    id: str
    last4: str = "0000"
    brand: str = "unknown"
    exp_month: int = 1
    exp_year: int = 2099


# ── Config helpers ────────────────────────────────────────────────────────────

def _is_configured() -> bool:
    return bool(
        (settings.zcredit_terminal_number or "").strip()
        and (settings.zcredit_api_key or "").strip()
    )


def _ensure_configured() -> None:
    """Raise 503 if Z-Credit credentials are not configured (real API paths only)."""
    if not _is_configured():
        raise HTTPException(status_code=503, detail="zcredit_not_configured")


def _base_url() -> str:
    return settings.zcredit_api_url.rstrip("/")


def _headers() -> dict[str, str]:
    return {
        "Content-Type": "application/json",
        "Authorization": f"Bearer {settings.zcredit_api_key}",
    }


# ── Customer / token management ───────────────────────────────────────────────

def ensure_customer(
    account: Account,
    existing_token_id: str | None = None,
    *,
    customer_email: str | None = None,
    customer_name: str | None = None,
) -> str:
    """
    Z-Credit does not require explicit customer creation before a payment.
    Returns the existing token_id if present, otherwise returns an empty string
    (will be populated after the first successful payment).

    TODO: If Z-Credit provides a customer/token registration API, implement here.
    """
    return (existing_token_id or "").strip()


def fetch_token_card_info(zcredit_token: str) -> tuple[str, str, int, int]:
    """
    Retrieve card display info (last4, brand, exp_month, exp_year) for a Z-Credit token.

    TODO: Call Z-Credit API to get token details.
    Returns placeholder values until implemented.
    """
    _ensure_configured()
    # TODO: GET {base_url}/tokens/{zcredit_token}
    # Parse response to extract last4, brand, exp_month, exp_year
    logger.warning("fetch_token_card_info: stub — returning placeholder card info for token %s", zcredit_token)
    return "0000", "unknown", 1, 2099


def detach_token(zcredit_token: str) -> None:
    """
    Delete a saved Z-Credit token (remove saved card).

    TODO: Call Z-Credit API to delete the token.
    """
    if not settings.zcredit_terminal_number or not settings.zcredit_api_key:
        return  # best-effort — silently skip if not configured
    try:
        # TODO: DELETE {base_url}/tokens/{zcredit_token}
        logger.info("detach_token: stub — would delete token %s", zcredit_token)
    except Exception:
        logger.exception("detach_token failed for token %s", zcredit_token)


# ── Invoice (one-time payment) ────────────────────────────────────────────────

def _mock_payment_url(doc_id: str) -> str:
    return f"/api/mock-payment/{doc_id}"


def create_invoice(
    account: Account,
    amount_minor: int,
    currency: str,
    description: str,
) -> tuple[str, str]:
    """
    Create a Z-Credit payment page for a one-time charge.

    Returns (doc_id, payment_url).

    TODO: Call Z-Credit redirect/WebAPI to create payment page.
    Endpoint (example): POST {base_url}/payments
    Body: { terminal: ZCREDIT_TERMINAL_NUMBER, amount: amount_minor/100,
            currency, description, successUrl, failUrl, callbackUrl }
    """
    if not _is_configured():
        doc_id = f"mock_inv_{account.id}_{uuid.uuid4().hex[:10]}"
        pay_url = _mock_payment_url(doc_id)
        logger.warning(
            "create_invoice: Z-Credit not configured; mock doc_id=%s pay_url=%s",
            doc_id,
            pay_url,
        )
        return doc_id, pay_url

    # TODO: implement real Z-Credit API call
    raise HTTPException(status_code=501, detail="zcredit_create_invoice_not_implemented")


def create_invoice_with_line_items(
    account: Account,
    currency: str,
    line_items: list[tuple[int, str]],
    invoice_description: str,
) -> tuple[str, str]:
    """
    One-time payment page with multiple line items.

    TODO: Z-Credit may support a description / item list in the payment page.
    Returns (doc_id, payment_url).
    """
    total_minor = sum(amt for amt, _ in line_items if amt > 0)
    return create_invoice(account, total_minor, currency, invoice_description)


def try_retrieve_invoice(doc_id: str) -> ZCreditDoc | None:
    """
    Best-effort retrieval of a Z-Credit payment document status.
    Returns None if not configured or on error.

    TODO: GET {base_url}/payments/{doc_id}
    """
    if not settings.zcredit_terminal_number or not settings.zcredit_api_key or not doc_id:
        return None
    try:
        # TODO: implement real Z-Credit API call
        logger.debug("try_retrieve_invoice: stub — doc_id=%s", doc_id)
        return None
    except Exception:
        logger.exception("try_retrieve_invoice failed doc_id=%s", doc_id)
        return None


def pay_open_invoice(doc_id: str, zcredit_token: str) -> ZCreditDoc:
    """
    Charge a saved Z-Credit token against a pending payment document.

    TODO: POST {base_url}/payments/{doc_id}/charge
    Body: { token: zcredit_token }
    """
    _ensure_configured()
    raise HTTPException(status_code=501, detail="zcredit_pay_invoice_not_implemented")


def void_invoice(doc_id: str) -> None:
    """
    Cancel / void a Z-Credit payment document — best-effort.

    TODO: POST {base_url}/payments/{doc_id}/void
    """
    if not settings.zcredit_terminal_number or not settings.zcredit_api_key:
        return
    try:
        # TODO: implement real Z-Credit API call
        logger.info("void_invoice: stub — would void doc_id=%s", doc_id)
    except Exception:
        logger.exception("void_invoice failed doc_id=%s", doc_id)


# ── Recurring billing (subscription) ─────────────────────────────────────────

def create_subscription(
    account: Account,
    zcredit_token: str | None,
    amount_minor: int,
    currency: str,
    description: str,
) -> tuple[str, str, str | None, str | None]:
    """
    Create a Z-Credit recurring billing (standing order).

    Returns (recurring_id, plan_id, first_payment_url_or_none, first_doc_id_or_none).

    TODO: Z-Credit supports recurring billing via tokens.
    POST {base_url}/recurring
    Body: { terminal, amount, currency, description, interval: "monthly",
            token (if already have saved card), successUrl, callbackUrl }
    """
    if not _is_configured():
        recurring_id = f"mock_sub_{account.id}_{uuid.uuid4().hex[:10]}"
        first_doc = f"mock_inv_{account.id}_{uuid.uuid4().hex[:10]}"
        pay_url = _mock_payment_url(first_doc)
        logger.warning(
            "create_subscription: Z-Credit not configured; mock recurring_id=%s pay_url=%s",
            recurring_id,
            pay_url,
        )
        return recurring_id, "mock_plan", pay_url, first_doc

    raise HTTPException(status_code=501, detail="zcredit_create_subscription_not_implemented")


def try_retrieve_subscription(recurring_id: str) -> ZCreditRecurring | None:
    """
    Best-effort retrieval of a Z-Credit recurring billing status.

    TODO: GET {base_url}/recurring/{recurring_id}
    """
    if not settings.zcredit_terminal_number or not settings.zcredit_api_key or not recurring_id:
        return None
    try:
        # TODO: implement real Z-Credit API call
        logger.debug("try_retrieve_subscription: stub — recurring_id=%s", recurring_id)
        return None
    except Exception:
        logger.exception("try_retrieve_subscription failed recurring_id=%s", recurring_id)
        return None


def cancel_subscription(recurring_id: str) -> None:
    """
    Cancel a Z-Credit recurring billing — best-effort.

    TODO: DELETE {base_url}/recurring/{recurring_id}
    """
    if not settings.zcredit_terminal_number or not settings.zcredit_api_key:
        return
    try:
        # TODO: implement real Z-Credit API call
        logger.info("cancel_subscription: stub — would cancel recurring_id=%s", recurring_id)
    except Exception:
        logger.exception("cancel_subscription failed recurring_id=%s", recurring_id)
