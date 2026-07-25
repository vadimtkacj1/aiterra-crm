"""Payment provider port — the seam the rest of the app depends on.

The application never talks to Z-Credit (or any provider) directly. It depends on this
abstract ``PaymentGateway`` and the provider-neutral value objects below. Swapping the
provider is: write one adapter that implements this interface, register it in
``app/infra/payments/factory.py``, and point ``PAYMENT_PROVIDER`` at it. No call site
changes.

Value objects are ``NamedTuple``s on purpose: existing callers unpack ``session_id, url =
gateway.create_invoice(...)`` and read ``doc.status`` / ``doc.payment_url`` — both keep
working, so the port can be introduced without rewriting the call sites' internals.
"""

from __future__ import annotations

from abc import ABC, abstractmethod
from typing import NamedTuple

from app.models.core import Account


class CheckoutSession(NamedTuple):
    """A hosted payment session: an id to reconcile by and a URL to send the payer to."""

    session_id: str
    payment_url: str


class SubscriptionSession(NamedTuple):
    """A recurring-billing session; recurring_id/plan_id are provider handles, may be None."""

    session_id: str
    payment_url: str
    recurring_id: str | None
    plan_id: str | None


class GatewayDoc(NamedTuple):
    """State of a payment document as the provider reports it.

    Field names mirror the previous ``ZCreditDoc`` so callers reading ``.status`` /
    ``.payment_url`` / ``.amount_paid`` are unaffected.
    """

    id: str
    status: str
    amount_paid: int = 0
    currency: str = "ILS"
    created: int = 0
    payment_url: str | None = None


class RecurringInfo(NamedTuple):
    id: str
    status: str


class CardInfo(NamedTuple):
    """Card behind a saved token. Order matches the legacy 4-tuple return."""

    last4: str
    brand: str
    exp_month: int
    exp_year: int


class PaymentGateway(ABC):
    """Provider-neutral payment operations. One implementation per provider."""

    # ── capabilities ──────────────────────────────────────────────────────────
    @abstractmethod
    def is_configured(self) -> bool:
        """True when the provider can process hosted checkouts (else mock/dev mode)."""

    @abstractmethod
    def can_charge_token(self) -> bool:
        """True when the provider can charge a saved card token directly."""

    # ── hosted checkout ───────────────────────────────────────────────────────
    @abstractmethod
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
        """Open a hosted session for a single amount against an account."""

    @abstractmethod
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
        """Open a hosted session itemised into (amount_minor, label) lines."""

    @abstractmethod
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
        """Open a hosted session for a buyer who has no account yet (public purchase)."""

    @abstractmethod
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
        """Open a recurring-billing session."""

    # ── charging & lifecycle ──────────────────────────────────────────────────
    @abstractmethod
    def pay_open_invoice(
        self,
        doc_id: str,
        zcredit_token: str,
        *,
        amount_major: float,
        currency: str = "ILS",
    ) -> GatewayDoc:
        """Charge a saved token for an open document. Returns the settled document."""

    @abstractmethod
    def void_invoice(self, doc_id: str) -> None:
        """Void a document if the provider supports it (a no-op where it does not)."""

    @abstractmethod
    def retrieve_invoice(self, doc_id: str) -> GatewayDoc | None:
        """Authoritative status of a document, or None if it cannot be resolved."""

    @abstractmethod
    def retrieve_subscription(self, recurring_id: str) -> RecurringInfo | None:
        """Authoritative status of a recurring billing, or None."""

    @abstractmethod
    def cancel_subscription(self, recurring_id: str) -> None:
        """Cancel a recurring billing."""

    # ── customers & cards ─────────────────────────────────────────────────────
    @abstractmethod
    def ensure_customer(
        self,
        account: Account,
        existing_token_id: str | None = None,
        *,
        customer_email: str | None = None,
        customer_name: str | None = None,
    ) -> str:
        """Return the provider customer/token id for an account, creating one if needed."""

    @abstractmethod
    def fetch_card_info(self, zcredit_token: str) -> CardInfo:
        """Card details behind a saved token."""

    @abstractmethod
    def detach_token(self, zcredit_token: str) -> None:
        """Forget a saved card token at the provider."""
