"""
Z-Credit integration: WebCheckout (hosted payment page) + Gateway API (token / charge).

Docs:
  WebCheckout: https://zcreditwc.docs.apiary.io/
  Gateway:     https://zcreditws.docs.apiary.io/

Env:
  ZCREDIT_API_KEY           — Web Checkout "Key" (backoffice → Settings → Clearing → Web Checkout ID)
  ZCREDIT_TERMINAL_NUMBER   — Terminal for Gateway API (GetTokenData, CommitFullTransaction)
  ZCREDIT_GATEWAY_PASSWORD  — Gateway API password (defaults to ZCREDIT_API_KEY if unset)
  APP_BASE_URL              — public API base for CallbackUrl (server-to-server)
  ZCREDIT_CUSTOMER_APP_URL  — optional SPA origin for SuccessUrl/CancelUrl (else first CORS origin)
"""

from __future__ import annotations

import json
import logging
import uuid
from dataclasses import dataclass
from typing import Any
import re

import httpx
from fastapi import HTTPException

from app.core.settings import settings
from app.models.core import Account

logger = logging.getLogger(__name__)

WEBCHECKOUT_TIMEOUT = 60.0
GATEWAY_TIMEOUT = 60.0


@dataclass
class ZCreditDoc:
    id: str
    status: str
    amount_paid: int = 0
    currency: str = "ILS"
    created: int = 0
    payment_url: str | None = None


@dataclass
class ZCreditRecurring:
    id: str
    status: str


@dataclass
class ZCreditToken:
    id: str
    last4: str = "0000"
    brand: str = "unknown"
    exp_month: int = 1
    exp_year: int = 2099


def _is_webcheckout_configured() -> bool:
    return bool((settings.zcredit_api_key or "").strip())


def _is_gateway_configured() -> bool:
    pw = (settings.zcredit_gateway_password or settings.zcredit_api_key or "").strip()
    return bool((settings.zcredit_terminal_number or "").strip() and pw)


def _is_configured() -> bool:
    """True when both Web Checkout key and Gateway terminal+password are set (legacy check)."""
    return _is_webcheckout_configured() and _is_gateway_configured()


def _ensure_webcheckout_configured() -> None:
    if not _is_webcheckout_configured():
        raise HTTPException(status_code=503, detail="zcredit_not_configured")


def _ensure_gateway_configured() -> None:
    if not _is_gateway_configured():
        raise HTTPException(status_code=503, detail="zcredit_gateway_not_configured")


def _webcheckout_base() -> str:
    return (settings.zcredit_api_url or "https://pci.zcredit.co.il/webcheckout/api/WebCheckout").rstrip(
        "/"
    )


def _gateway_base() -> str:
    return settings.zcredit_gateway_base_url.rstrip("/")


def _gateway_password() -> str:
    return (settings.zcredit_gateway_password or settings.zcredit_api_key or "").strip()


def _customer_app_base() -> str:
    if (settings.zcredit_customer_app_url or "").strip():
        return settings.zcredit_customer_app_url.strip().rstrip("/")
    parts = [o.strip() for o in settings.cors_origins.split(",") if o.strip()]
    # Знаходимо реальний домен, ігноруючи localhost
    public_origins = [p for p in parts if "localhost" not in p and "127.0.0.1" not in p]
    if public_origins:
        return public_origins[0].rstrip("/")
    if parts:
        return parts[0].rstrip("/")
    return settings.app_base_url.rstrip("/")


def _callback_url() -> str:
    return f"{settings.app_base_url.rstrip('/')}/api/webhooks/zcredit"


def _success_cancel_urls(account: Account) -> tuple[str, str, str]:
    base = _customer_app_base()
    path = f"/a/{account.id}/billing"
    success = f"{base}{path}/success"
    cancel = f"{base}{path}"
    fail = f"{base}{path}/failed"
    return success, cancel, fail


def _normalize_payment_url(url: str) -> str:
    u = (url or "").strip()
    if not u:
        return u
    if u.startswith("http://") or u.startswith("https://"):
        return u
    if u.startswith("//"):
        return "https:" + u
    if u.startswith("/"):
        return "https://pci.zcredit.co.il" + u
    return u


def _post_json(url: str, body: dict[str, Any], timeout: float) -> dict[str, Any]:
    try:
        with httpx.Client(timeout=timeout) as client:
            r = client.post(
                url,
                json=body,
                headers={"Content-Type": "application/json; charset=utf-8"},
            )
    except httpx.RequestError as exc:
        logger.exception("Z-Credit HTTP error url=%s", url)
        raise HTTPException(status_code=502, detail="zcredit_unreachable") from exc

    try:
        data = r.json()
    except json.JSONDecodeError as exc:
        logger.warning("Z-Credit non-JSON response status=%s body=%s", r.status_code, r.text[:500])
        raise HTTPException(status_code=502, detail="zcredit_bad_response") from exc

    if not isinstance(data, dict):
        raise HTTPException(status_code=502, detail="zcredit_bad_response")
    return data


def _wc_error_message(data: dict[str, Any]) -> str:
    inner = data.get("Data")
    if isinstance(inner, dict):
        msg = inner.get("ReturnMessage")
        if msg:
            return str(msg)
    return str(data.get("ReturnMessage") or data.get("message") or "zcredit_error")


def _sanitize_additional_text(text: str | None) -> str:
    """Z-Credit expects alphanumeric AdditionalText; strip everything else."""
    if not text:
        return ""
    sanitized = re.sub(r"[^A-Za-z0-9\s]", " ", text)
    sanitized = " ".join(sanitized.split())
    return sanitized[:500].strip()


def _installments_for_amount_minor(amount_minor: int) -> dict[str, str]:
    """
    Business rule:
      - Up to 1,000 (major) → no installments (1)
      - More than 1,000     → up to 6 installments (allow 1–6)
    """
    try:
        if amount_minor > 100_000:  # 1,000 major units * 100
            return {"Type": "regular", "MinQuantity": "1", "MaxQuantity": "6"}
        return {"Type": "regular", "MinQuantity": "1", "MaxQuantity": "1"}
    except Exception:
        return {"Type": "regular", "MinQuantity": "1", "MaxQuantity": "1"}


def _create_session_body(
    account: Account,
    *,
    unique_id: str,
    cart_items: list[dict[str, Any]],
    description: str,
    amount_minor: int,
    success_url: str | None = None,
    cancel_url: str | None = None,
    failure_url: str | None = None,
    callback_url: str | None = None,
) -> dict[str, Any]:
    key = (settings.zcredit_api_key or "").strip()
    def_success, def_cancel, def_fail = _success_cancel_urls(account)
    
    s_url = success_url if success_url else def_success
    c_url = cancel_url if cancel_url else def_cancel
    f_url = failure_url if failure_url else def_fail
    cb_url = callback_url if callback_url else _callback_url()

    local = (settings.zcredit_checkout_local or "En").strip() or "En"
    return {
        "Key": key,
        "Local": local,
        "UniqueId": unique_id,
        "SuccessUrl": s_url,
        "CancelUrl": c_url,
        "CallbackUrl": cb_url,
        "FailureCallBackUrl": cb_url,
        "FailureRedirectUrl": c_url,
        "NumberOfFailures": 3,
        "PaymentType": "regular",
        "CreateInvoice": "false",
        "AdditionalText": _sanitize_additional_text(description),
        "ShowCart": "true",
        "ThemeColor": "005ebb",
        "Installments": _installments_for_amount_minor(amount_minor),
        "CartItems": cart_items,
        "FocusType": "None",
        "UseLightMode": "false",
        "ShowTotalSumInPayButton": "true",
        "Bypass3DS": "false",
    }


def _parse_create_session(data: dict[str, Any]) -> tuple[str, str]:
    inner = data.get("Data")
    if not isinstance(inner, dict):
        inner = data
    has_err = bool(data.get("HasError")) or bool(inner.get("HasError"))
    rc = inner.get("ReturnCode", data.get("ReturnCode"))
    if has_err or (rc not in (None, 0, "0")):
        raise HTTPException(status_code=502, detail=_wc_error_message(data))
    session_id = str(inner.get("SessionId") or "").strip()
    session_url = _normalize_payment_url(str(inner.get("SessionUrl") or "").strip())
    if not session_id or not session_url:
        raise HTTPException(status_code=502, detail=_wc_error_message(data))
    return session_id, session_url


def ensure_customer(
    account: Account,
    existing_token_id: str | None = None,
    *,
    customer_email: str | None = None,
    customer_name: str | None = None,
) -> str:
    return (existing_token_id or "").strip()


def fetch_token_card_info(zcredit_token: str) -> tuple[str, str, int, int]:
    _ensure_gateway_configured()
    body = {
        "TerminalNumber": (settings.zcredit_terminal_number or "").strip(),
        "Password": _gateway_password(),
        "Token": zcredit_token.strip(),
    }
    url = f"{_gateway_base()}/Token/GetTokenData"
    data = _post_json(url, body, GATEWAY_TIMEOUT)
    if data.get("HasError") or data.get("ReturnCode") not in (None, 0, "0"):
        logger.warning("GetTokenData failed: %s", data)
        return "0000", "unknown", 1, 2099
    card = str(data.get("CardNumber") or data.get("Card4Digits") or "")
    digits = "".join(c for c in card if c.isdigit())
    last4 = digits[-4:] if len(digits) >= 4 else (digits or "0000")
    exp_raw = str(data.get("ExpDate") or data.get("ExpDate_MMYY") or "01/99")
    exp_month, exp_year = 1, 2099
    if "/" in exp_raw:
        parts = exp_raw.split("/", 1)
        try:
            exp_month = int(parts[0])
            yy = int(parts[1])
            exp_year = 2000 + yy if yy < 100 else yy
        except ValueError:
            pass
    brand = "unknown"
    return last4, brand, exp_month, exp_year


def detach_token(zcredit_token: str) -> None:
    logger.info("detach_token: no Gateway delete-token API; ignoring token=%s", zcredit_token[:8] + "…")


def _mock_payment_url(doc_id: str) -> str:
    return f"/api/mock-payment/{doc_id}"


def create_invoice(
    account: Account,
    amount_minor: int,
    currency: str,
    description: str,
    success_url: str | None = None,
    cancel_url: str | None = None,
    failure_url: str | None = None,
    callback_url: str | None = None,
) -> tuple[str, str]:
    if not _is_webcheckout_configured():
        raise HTTPException(status_code=503, detail="zcredit_not_configured")

    if amount_minor <= 0:
        raise HTTPException(status_code=400, detail="invalid_amount")

    amt_major = f"{amount_minor / 100:.2f}"
    cur = (currency or "ILS").upper()
    unique_id = f"inv_{account.id}_{uuid.uuid4().hex[:12]}"
    cart = [
        {
            "Amount": amt_major,
            "Currency": cur,
            "Name": (description or "Payment")[:120],
            "Description": (description or "")[:500],
            "Quantity": 1,
            "Image": "",
            "IsTaxFree": "false",
            "AdjustAmount": "false",
        }
    ]
    body = _create_session_body(
        account,
        unique_id=unique_id,
        cart_items=cart,
        description=description,
        amount_minor=amount_minor,
        success_url=success_url,
        cancel_url=cancel_url,
        failure_url=failure_url,
        callback_url=callback_url,
    )
    url = f"{_webcheckout_base()}/CreateSession"
    data = _post_json(url, body, WEBCHECKOUT_TIMEOUT)
    session_id, session_url = _parse_create_session(data)
    return session_id, session_url


def create_invoice_with_line_items(
    account: Account,
    currency: str,
    line_items: list[tuple[int, str]],
    invoice_description: str,
    success_url: str | None = None,
    cancel_url: str | None = None,
    failure_url: str | None = None,
    callback_url: str | None = None,
) -> tuple[str, str]:
    if not _is_webcheckout_configured():
        total_minor = sum(amt for amt, _ in line_items if amt > 0)
        return create_invoice(
            account, 
            total_minor, 
            currency, 
            invoice_description, 
            success_url=success_url,
            cancel_url=cancel_url,
            failure_url=failure_url,
            callback_url=callback_url,
        )

    cur = (currency or "ILS").upper()
    unique_id = f"inv_{account.id}_{uuid.uuid4().hex[:12]}"
    cart: list[dict[str, Any]] = []
    for minor, label in line_items:
        if minor <= 0:
            continue
        cart.append(
            {
                "Amount": f"{minor / 100:.2f}",
                "Currency": cur,
                "Name": (label or "Item")[:120],
                "Description": (label or "")[:500],
                "Quantity": 1,
                "Image": "",
                "IsTaxFree": "false",
                "AdjustAmount": "false",
            }
        )
    if not cart:
        raise HTTPException(status_code=400, detail="invalid_line_items")
    body = _create_session_body(
        account,
        unique_id=unique_id,
        cart_items=cart,
        description=invoice_description,
        amount_minor=sum(minor for minor, _ in line_items if minor > 0),
        success_url=success_url,
        cancel_url=cancel_url,
        failure_url=failure_url,
        callback_url=callback_url,
    )
    url = f"{_webcheckout_base()}/CreateSession"
    data = _post_json(url, body, WEBCHECKOUT_TIMEOUT)
    session_id, session_url = _parse_create_session(data)
    return session_id, session_url


def _parse_callback_totals(call_back_json: str) -> tuple[int, str]:
    if not call_back_json:
        return 0, "ILS"
    try:
        j = json.loads(call_back_json)
    except json.JSONDecodeError:
        return 0, "ILS"
    if not isinstance(j, dict):
        return 0, "ILS"
    total = j.get("Total")
    cur = str(j.get("Currency") or "ILS").upper()
    try:
        minor = int(round(float(total) * 100)) if total is not None else 0
    except (TypeError, ValueError):
        minor = 0
    return minor, cur


def try_retrieve_invoice(doc_id: str) -> ZCreditDoc | None:
    if not doc_id or not _is_webcheckout_configured():
        return None
    body = {
        "Key": (settings.zcredit_api_key or "").strip(),
        "SessionId": doc_id.strip(),
    }
    url = f"{_webcheckout_base()}/GetSessionStatus"
    try:
        data = _post_json(url, body, WEBCHECKOUT_TIMEOUT)
    except HTTPException:
        return None

    if data.get("HasError"):
        return None

    success = data.get("TransactionSuccess")
    cb = str(data.get("CallBackJSON") or "")
    amount_paid, cur = _parse_callback_totals(cb)

    if success is True:
        return ZCreditDoc(
            id=doc_id,
            status="paid",
            amount_paid=amount_paid,
            currency=cur,
            payment_url=None,
        )
    return ZCreditDoc(
        id=doc_id,
        status="open",
        amount_paid=0,
        currency="ILS",
        payment_url=None,
    )


def _gateway_currency_type(currency: str) -> str:
    c = (currency or "ILS").upper()
    if c == "ILS":
        return "1"
    if c == "USD":
        return "2"
    return "1"


def pay_open_invoice(
    doc_id: str,
    zcredit_token: str,
    *,
    amount_major: float,
    currency: str = "ILS",
) -> ZCreditDoc:
    """
    Charge using a saved card token (Gateway CommitFullTransaction).
    """
    _ensure_gateway_configured()
    if amount_major <= 0:
        raise HTTPException(status_code=400, detail="invalid_amount")

    uid = f"pay_{uuid.uuid4().hex[:16]}"
    body: dict[str, Any] = {
        "TerminalNumber": (settings.zcredit_terminal_number or "").strip(),
        "Password": _gateway_password(),
        "Token": zcredit_token.strip(),
        "Track2": "",
        "CardNumber": "",
        "CVV": "",
        "ExpDate_MMYY": "",
        "TransactionSum": f"{amount_major:.2f}",
        "NumberOfPayments": "1",
        "FirstPaymentSum": "0",
        "OtherPaymentsSum": "0",
        "TransactionType": "01",
        "CurrencyType": _gateway_currency_type(currency),
        "CreditType": "1",
        "J": "0",
        "IsCustomerPresent": "false",
        "TransactionUniqueID": uid,
        "ItemDescription": "Invoice payment",
    }
    url = f"{_gateway_base()}/Transaction/CommitFullTransaction"
    data = _post_json(url, body, GATEWAY_TIMEOUT)
    if data.get("HasError") or data.get("ReturnCode") not in (None, 0, "0"):
        msg = str(data.get("ReturnMessage") or "charge_failed")
        raise HTTPException(status_code=502, detail=f"zcredit_charge_failed: {msg}")

    ref = str(data.get("ReferenceNumber") or doc_id)
    minor = int(round(float(amount_major) * 100))
    return ZCreditDoc(
        id=ref,
        status="paid",
        amount_paid=minor,
        currency=(currency or "ILS").upper(),
        payment_url=None,
    )


def void_invoice(doc_id: str) -> None:
    if not _is_webcheckout_configured():
        return
    logger.info("void_invoice: WebCheckout has no void API in integration; doc_id=%s", doc_id)


def create_subscription(
    account: Account,
    zcredit_token: str | None,
    amount_minor: int,
    currency: str,
    description: str,
    success_url: str | None = None,
    cancel_url: str | None = None,
    failure_url: str | None = None,
    callback_url: str | None = None,
) -> tuple[str, str, str | None, str | None]:
    """
    WebCheckout has no standing-order API in public docs — create a hosted session for the
    first / periodic charge. We store UniqueId in payment_recurring_id for correlation in callbacks.
    """
    if not _is_webcheckout_configured():
        raise HTTPException(status_code=503, detail="zcredit_not_configured")

    unique_id = f"sub_{account.id}_{uuid.uuid4().hex[:12]}"
    cur = (currency or "ILS").upper()
    amt_major = f"{amount_minor / 100:.2f}"
    cart = [
        {
            "Amount": amt_major,
            "Currency": cur,
            "Name": (description or "Subscription")[:120],
            "Description": (description or "")[:500],
            "Quantity": 1,
            "Image": "",
            "IsTaxFree": "false",
            "AdjustAmount": "false",
        }
    ]
    body = _create_session_body(
        account, 
        unique_id=unique_id, 
        cart_items=cart, 
        description=description, 
        amount_minor=amount_minor,
        success_url=success_url,
        cancel_url=cancel_url,
        failure_url=failure_url,
        callback_url=callback_url,
    )
    url = f"{_webcheckout_base()}/CreateSession"
    data = _post_json(url, body, WEBCHECKOUT_TIMEOUT)
    session_id, session_url = _parse_create_session(data)
    return unique_id, session_id, session_url, session_id


def try_retrieve_subscription(recurring_id: str) -> ZCreditRecurring | None:
    if not recurring_id or not _is_webcheckout_configured():
        return None
    return ZCreditRecurring(id=recurring_id, status="active")


def cancel_subscription(recurring_id: str) -> None:
    logger.info("cancel_subscription: no Z-Credit recurring cancel in WebCheckout; id=%s", recurring_id)
