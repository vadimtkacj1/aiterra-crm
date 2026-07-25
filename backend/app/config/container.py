"""IoC container — wired incrementally as each domain migrates to Clean Architecture.

The invoice registry is the pilot slice. Providers are ``Factory`` (a fresh instance
per resolution); the request-scoped SQLAlchemy ``Session`` is bound at call time by the
API bridge (``get_invoice_service``), not stored on the container. Swapping an
implementation — e.g. an async repository later — is a one-line change here.
"""

from dependency_injector import containers, providers

from app.infra.billing.invoice.repository import InvoiceRepository
from app.infra.billing.invoice.service import InvoiceService


class Container(containers.DeclarativeContainer):
    wiring_config = containers.WiringConfiguration(
        modules=["app.api.routes.billing.invoices"],
    )

    # session is supplied per request: invoice_repository(session=...)
    invoice_repository = providers.Factory(InvoiceRepository)
    invoice_service = providers.Factory(InvoiceService, repository=invoice_repository)


# Single app-wide instance; wired in app/main.py.
container = Container()
