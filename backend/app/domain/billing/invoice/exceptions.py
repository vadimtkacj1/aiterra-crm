"""Domain exceptions for the invoice module.

Raised by the service/repository on business-rule violations. The API layer is the
only place these are translated into HTTP responses.
"""

from __future__ import annotations


class InvoiceError(Exception):
    """Base class for all invoice domain errors."""


class InvoiceNotFoundError(InvoiceError):
    """No invoice matches the requested identifier."""


class InvoiceValidationError(InvoiceError):
    """The requested invoice operation violates a business rule."""
