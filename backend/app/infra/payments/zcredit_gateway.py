"""Z-Credit adapter for the :class:`PaymentGateway` port.

Thin translation only: every method delegates to the existing, production-proven
functions in ``app/services/payments/zcredit/service.py`` and wraps the result in a
provider-neutral value object. No HTTP, request-body or error-handling logic lives here —
that stays in the service, so introducing this seam cannot change money behaviour.
"""

from __future__ import annotations

from app.domain.payments.gateway import (
    CardInfo,
    CheckoutSession,
    GatewayDoc,
    PaymentGateway,
    RecurringInfo,
    SubscriptionSession,
)
from app.models.core import Account
from app.services.payments.zcredit import service as zc


def _to_doc(doc: object | None) -> GatewayDoc | None:
    # Boundary mapper: read every field defensively so a provider result missing an
    # optional field can never crash the translation layer.
    if doc is None:
        return None
    return GatewayDoc(
        id=str(getattr(doc, "id", "") or ""),
        status=str(getattr(doc, "status", "") or ""),
        amount_paid=getattr(doc, "amount_paid", 0),
        currency=getattr(doc, "currency", "ILS"),
        created=getattr(doc, "created", 0),
        payment_url=getattr(doc, "payment_url", None),
    )


class ZCreditGateway(PaymentGateway):
    """The default gateway. Delegates to the Z-Credit WebCheckout service."""

    name = "zcredit"

    def is_configured(self) -> bool:
        return zc._is_webcheckout_configured()

    def can_charge_token(self) -> bool:
        return zc._is_gateway_configured()

    def create_invoice(
        self,
        account: Account,
        amount_minor: int,
        currency: str,
        description: str,
        success_url: str | None = None,
        cancel_url: str | None = None,
        callback_url: str | None = None,
    ) -> CheckoutSession:
        session_id, url = zc.create_invoice(
            account, amount_minor, currency, description,
            success_url=success_url, cancel_url=cancel_url, callback_url=callback_url,
        )
        return CheckoutSession(session_id, url)

    def create_invoice_with_line_items(
        self,
        account: Account,
        currency: str,
        line_items: list[tuple[int, str]],
        invoice_description: str,
        success_url: str | None = None,
        cancel_url: str | None = None,
        callback_url: str | None = None,
    ) -> CheckoutSession:
        session_id, url = zc.create_invoice_with_line_items(
            account, currency, line_items, invoice_description,
            success_url=success_url, cancel_url=cancel_url, callback_url=callback_url,
        )
        return CheckoutSession(session_id, url)

    def create_public_checkout(
        self,
        *,
        amount_minor: int,
        currency: str,
        description: str,
        unique_ref: str,
        success_url: str,
        cancel_url: str,
        callback_url: str | None = None,
    ) -> CheckoutSession:
        session_id, url = zc.create_public_checkout(
            amount_minor=amount_minor, currency=currency, description=description,
            unique_ref=unique_ref, success_url=success_url, cancel_url=cancel_url,
            callback_url=callback_url,
        )
        return CheckoutSession(session_id, url)

    def create_subscription(
        self,
        account: Account,
        zcredit_token: str | None,
        amount_minor: int,
        currency: str,
        description: str,
        success_url: str | None = None,
        cancel_url: str | None = None,
        callback_url: str | None = None,
    ) -> SubscriptionSession:
        session_id, url, recurring_id, plan_id = zc.create_subscription(
            account, zcredit_token, amount_minor, currency, description,
            success_url=success_url, cancel_url=cancel_url, callback_url=callback_url,
        )
        return SubscriptionSession(session_id, url, recurring_id, plan_id)

    def pay_open_invoice(
        self,
        doc_id: str,
        zcredit_token: str,
        *,
        amount_major: float,
        currency: str = "ILS",
    ) -> GatewayDoc:
        doc = zc.pay_open_invoice(
            doc_id, zcredit_token, amount_major=amount_major, currency=currency
        )
        return _to_doc(doc)  # type: ignore[return-value]  # pay_open_invoice never returns None

    def void_invoice(self, doc_id: str) -> None:
        zc.void_invoice(doc_id)

    def retrieve_invoice(self, doc_id: str) -> GatewayDoc | None:
        return _to_doc(zc.try_retrieve_invoice(doc_id))

    def retrieve_subscription(self, recurring_id: str) -> RecurringInfo | None:
        sub = zc.try_retrieve_subscription(recurring_id)
        return RecurringInfo(sub.id, sub.status) if sub else None

    def cancel_subscription(self, recurring_id: str) -> None:
        zc.cancel_subscription(recurring_id)

    def ensure_customer(
        self,
        account: Account,
        existing_token_id: str | None = None,
        *,
        customer_email: str | None = None,
        customer_name: str | None = None,
    ) -> str:
        return zc.ensure_customer(
            account, existing_token_id,
            customer_email=customer_email, customer_name=customer_name,
        )

    def fetch_card_info(self, zcredit_token: str) -> CardInfo:
        last4, brand, exp_month, exp_year = zc.fetch_token_card_info(zcredit_token)
        return CardInfo(last4, brand, exp_month, exp_year)

    def detach_token(self, zcredit_token: str) -> None:
        zc.detach_token(zcredit_token)
