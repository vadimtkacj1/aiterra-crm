import logging

from sqlalchemy import create_engine, inspect, text
from sqlalchemy.orm import sessionmaker, DeclarativeBase

from app.core.settings import settings

logger = logging.getLogger(__name__)


class Base(DeclarativeBase):
    pass


def _make_engine():
    if settings.database_url.startswith("sqlite"):
        connect_args = {"check_same_thread": False, "timeout": 15}
        engine = create_engine(
            settings.database_url,
            connect_args=connect_args,
            # One connection per thread is safe with check_same_thread=False.
            pool_size=10,
            max_overflow=20,
        )
        # WAL mode: multiple concurrent readers, no blocking on reads.
        with engine.connect() as conn:
            conn.execute(text("PRAGMA journal_mode=WAL"))
            conn.execute(text("PRAGMA busy_timeout=10000"))
        return engine
    return create_engine(settings.database_url)


engine = _make_engine()
SessionLocal = sessionmaker(bind=engine, autoflush=False, autocommit=False)


def init_db() -> None:
    # Import models for metadata
    from app.db import base  # noqa: F401

    Base.metadata.create_all(bind=engine)
    _apply_lightweight_migrations()

    # Seed admin user
    from app.db.seed import seed_admin

    seed_admin()


def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()


def _ensure_column(table: str, column: str, type_sql: str) -> None:
    """Append a column if missing. type_sql e.g. TEXT, VARCHAR(255)."""
    inspector = inspect(engine)
    if not inspector.has_table(table):
        return
    existing_cols = {c["name"] for c in inspector.get_columns(table)}
    if column in existing_cols:
        return
    with engine.begin() as conn:
        # Must include column name — was previously broken (only type_sql ran).
        conn.execute(text(f"ALTER TABLE {table} ADD COLUMN {column} {type_sql}"))


def _apply_lightweight_migrations() -> None:
    """
    Add new columns for deployments without Alembic.
    Safe to run multiple times; skips if columns already exist.
    """
    try:
        # Z-Credit columns (new schema)
        _ensure_column("accounts", "zcredit_token_id", "VARCHAR(255)")
        _ensure_column("saved_cards", "zcredit_token_id", "VARCHAR(255)")
        _ensure_column("saved_cards", "zcredit_token", "VARCHAR(255)")
        _ensure_column("meta_topups", "payment_intent_id", "VARCHAR(255)")
        _ensure_column("account_billing_instructions", "payment_doc_id", "VARCHAR(255)")
        _ensure_column("account_billing_instructions", "payment_url", "VARCHAR(2048)")
        _ensure_column("account_billing_instructions", "payment_recurring_id", "VARCHAR(255)")
        _ensure_column("account_billing_instructions", "payment_plan_id", "VARCHAR(255)")
        _ensure_column("account_billing_instructions", "line_items_json", "TEXT")
        _ensure_column("account_billing_instructions", "subscription_status", "VARCHAR(32)")
        _ensure_column("billing_instruction_history", "payment_doc_id", "VARCHAR(255)")
        _ensure_column("billing_instruction_history", "payment_url", "VARCHAR(2048)")
        _ensure_column("billing_instruction_history", "payment_recurring_id", "VARCHAR(255)")
    except Exception:
        logger.exception("Lightweight DB migrations failed — check database permissions and schema.")

    # account_billing_instructions table is created via Base.metadata.create_all above;
    # no extra ALTER TABLE needed for the initial columns.

