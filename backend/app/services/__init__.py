"""
Application services: integrations, auth helpers, admin utilities.

Layout:
  auth/          — password hashing, JWT
  admin/         — reporting, audit logging
  meta/          — Meta Marketing API + analytics bundle
  payments/      — payment providers (Z-Credit)
"""

from app.services.payments import zcredit_service

__all__ = ["zcredit_service"]
