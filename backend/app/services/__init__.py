"""
Application services: integrations, auth helpers, admin utilities.

Layout:
  auth/          — password hashing, JWT
  admin/         — reporting, audit logging
  billing/       — invoice registry (every payment demand is recorded here)
  meta/          — Meta Marketing API + analytics bundle
  payments/      — payment provider implementations (behind app.domain.payments.gateway)

The app depends on the payment PORT (app/domain/payments/gateway.py), resolved via
app/infra/payments/factory.py — not on any concrete provider module.
"""
