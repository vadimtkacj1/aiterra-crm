"""Payment gateway selection — the one place a provider is chosen.

Swap providers here: add an adapter class to ``_PROVIDERS`` and set ``PAYMENT_PROVIDER``.
Nothing else in the app names a concrete provider.
"""

from __future__ import annotations

from functools import lru_cache

from app.core.settings import settings
from app.domain.payments.gateway import PaymentGateway
from app.infra.payments.zcredit_gateway import ZCreditGateway

# name -> adapter class. Register additional providers here.
_PROVIDERS: dict[str, type[PaymentGateway]] = {
    "zcredit": ZCreditGateway,
}

DEFAULT_PROVIDER = "zcredit"


@lru_cache(maxsize=None)
def _build(name: str) -> PaymentGateway:
    cls = _PROVIDERS.get(name)
    if cls is None:
        raise ValueError(
            f"unknown payment provider {name!r}; known: {sorted(_PROVIDERS)}"
        )
    return cls()


def get_payment_gateway() -> PaymentGateway:
    """The configured gateway. Adapters are stateless, so instances are cached."""
    name = (getattr(settings, "payment_provider", None) or DEFAULT_PROVIDER).strip().lower()
    return _build(name)


def payment_gateway() -> PaymentGateway:
    """FastAPI dependency form: ``gw: PaymentGateway = Depends(payment_gateway)``."""
    return get_payment_gateway()
