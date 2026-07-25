"""Invoice registry read API — the first Clean Architecture route slice.

The whole stack is exercised here: the route depends on the abstract ``IInvoiceService``,
built per-request by the dependency-injector container with the request-scoped SQLAlchemy
Session bound in ``get_invoice_service``. Domain errors are the only thing translated to
HTTP; auth reuses the existing account-membership dependencies.
"""

from __future__ import annotations

from dependency_injector.wiring import Provide, inject
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session

from app.api.deps import get_current_user, require_account_member
from app.config.container import Container
from app.db.session import get_db
from app.domain.billing.invoice.exceptions import InvoiceNotFoundError
from app.domain.billing.invoice.service import IInvoiceService
from app.models.core import User
from app.schemas.billing.invoice import InvoiceListResponse, InvoiceResponse

router = APIRouter(prefix="/billing/invoices", tags=["billing"])


@inject
def get_invoice_service(
    db: Session = Depends(get_db),
    build_service=Depends(Provide[Container.invoice_service.provider]),
    build_repo=Depends(Provide[Container.invoice_repository.provider]),
) -> IInvoiceService:
    """Build the invoice service for this request, binding the request-scoped Session.

    The container owns the wiring (which repository/service classes); the session is the
    only per-request input, injected here so the same Session backs both the service and
    the route's own membership checks.
    """
    return build_service(repository=build_repo(session=db))


@router.get("", response_model=InvoiceListResponse)
def list_invoices(
    account_id: int | None = Query(default=None),
    status: str | None = Query(default=None),
    source_type: str | None = Query(default=None),
    limit: int = Query(default=50, ge=1, le=200),
    offset: int = Query(default=0, ge=0),
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
    service: IInvoiceService = Depends(get_invoice_service),
) -> InvoiceListResponse:
    """List invoices. Members must scope to an account they belong to; admins may query any."""
    if user.role != "admin":
        if account_id is None:
            raise HTTPException(status_code=400, detail="account_id_required")
        require_account_member(account_id, db, user)

    items, total = service.list_invoices(
        account_id=account_id,
        status=status,
        source_type=source_type,
        limit=limit,
        offset=offset,
    )
    return InvoiceListResponse(
        items=[InvoiceResponse.from_entity(invoice) for invoice in items],
        total=total,
    )


@router.get("/{invoice_id}", response_model=InvoiceResponse)
def get_invoice(
    invoice_id: int,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
    service: IInvoiceService = Depends(get_invoice_service),
) -> InvoiceResponse:
    """Fetch one invoice. Members may only read invoices for accounts they belong to."""
    try:
        invoice = service.get_invoice(invoice_id)
    except InvoiceNotFoundError:
        raise HTTPException(status_code=404, detail="invoice_not_found")

    if user.role != "admin":
        # An accountless invoice (public landing purchase) is never a member's to see.
        if invoice.account_id is None:
            raise HTTPException(status_code=403, detail="forbidden")
        require_account_member(invoice.account_id, db, user)

    return InvoiceResponse.from_entity(invoice)
