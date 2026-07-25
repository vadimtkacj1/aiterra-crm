"""Infrastructure layer — concrete implementations of domain interfaces.

Repositories, service implementations and external adapters live here. This layer
depends on the domain (implements its interfaces) and on frameworks (SQLAlchemy);
the domain never depends back on it.
"""
