"""Domain layer — pure business entities, interfaces and rules.

Framework-agnostic: modules here must not import SQLAlchemy, FastAPI or any other
infrastructure. Concrete implementations live under ``app/infra`` and implement the
abstract repositories/services declared here.
"""
