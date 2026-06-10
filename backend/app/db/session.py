import logging
from typing import AsyncGenerator

from sqlalchemy import create_engine, inspect, text
from sqlalchemy.ext.asyncio import AsyncSession, async_sessionmaker, create_async_engine
from sqlalchemy.orm import sessionmaker, DeclarativeBase

from app.core.settings import settings

logger = logging.getLogger(__name__)


class Base(DeclarativeBase):
    pass


def _make_engine():
    url = settings.database_url
    if url.startswith("sqlite"):
        return create_engine(url, connect_args={"check_same_thread": False})
    return create_engine(url, pool_size=10, max_overflow=20, pool_pre_ping=True)


engine = _make_engine()
SessionLocal = sessionmaker(bind=engine, autoflush=False, autocommit=False)


# ── Async engine (used by new Clean Architecture routes) ─────────────────────

def _make_async_url() -> str:
    url = settings.database_url
    if url.startswith("postgresql+psycopg2://"):
        return url.replace("postgresql+psycopg2://", "postgresql+asyncpg://", 1)
    if url.startswith("postgresql://"):
        return url.replace("postgresql://", "postgresql+asyncpg://", 1)
    if url.startswith("sqlite:///"):
        return url.replace("sqlite:///", "sqlite+aiosqlite:///", 1)
    if url.startswith("sqlite://"):
        return url.replace("sqlite://", "sqlite+aiosqlite://", 1)
    return url


def _make_async_engine():
    url = _make_async_url()
    if url.startswith("sqlite"):
        return create_async_engine(url)
    return create_async_engine(url, pool_size=10, max_overflow=20, pool_pre_ping=True)


async_engine = _make_async_engine()

AsyncSessionLocal = async_sessionmaker(
    async_engine,
    class_=AsyncSession,
    expire_on_commit=False,
    autoflush=False,
)


async def get_async_db() -> AsyncGenerator[AsyncSession, None]:
    async with AsyncSessionLocal() as session:
        try:
            yield session
            await session.commit()
        except Exception:
            await session.rollback()
            raise


# ─────────────────────────────────────────────────────────────────────────────


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


def _backfill_public_tokens() -> None:
    """Assign a UUID public_token to any account_site_configs row that has none."""
    import uuid as _uuid
    inspector = inspect(engine)
    if not inspector.has_table("account_site_configs"):
        return
    cols = {c["name"] for c in inspector.get_columns("account_site_configs")}
    if "public_token" not in cols:
        return
    with engine.begin() as conn:
        rows = conn.execute(
            text("SELECT id FROM account_site_configs WHERE public_token IS NULL")
        ).fetchall()
        for row in rows:
            conn.execute(
                text("UPDATE account_site_configs SET public_token = :tok WHERE id = :id"),
                {"tok": str(_uuid.uuid4()), "id": row[0]},
            )


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
        _ensure_column("account_billing_instructions", "installment_months", "INTEGER")
        _ensure_column("account_billing_instructions", "installment_total_amount", "FLOAT")
        _ensure_column("billing_instruction_history", "payment_doc_id", "VARCHAR(255)")
        _ensure_column("billing_instruction_history", "payment_url", "VARCHAR(2048)")
        _ensure_column("billing_instruction_history", "payment_recurring_id", "VARCHAR(255)")
        _ensure_column("billing_instruction_history", "installment_months", "INTEGER")
        _ensure_column("billing_instruction_history", "installment_total_amount", "FLOAT")
        _ensure_column("account_billing_instructions", "billing_day", "INTEGER")
        _ensure_column("account_billing_instructions", "billing_week_day", "INTEGER")
        _ensure_column("account_billing_instructions", "test_interval_minutes", "INTEGER")
        _ensure_column("billing_instruction_history", "billing_day", "INTEGER")
        _ensure_column("billing_instruction_history", "billing_week_day", "INTEGER")
        _ensure_column("invoice_templates", "installment_months", "INTEGER")
        _ensure_column("invoice_templates", "billing_day", "INTEGER")
        _ensure_column("contracts", "pdf_base64", "TEXT")
        _ensure_column("contracts", "signature_png_base64", "TEXT")
        _ensure_column("contracts", "signer_position", "VARCHAR(255)")
        _ensure_column("contracts", "signed_copy_email", "VARCHAR(255)")
        _ensure_column("contract_payment_stages", "payment_doc_id", "VARCHAR(255)")
        # Subscription contract columns
        _ensure_column("contracts", "billing_instruction_id", "INTEGER")
        _ensure_column("contracts", "monthly_amount", "FLOAT")
        _ensure_column("contracts", "subscription_months", "INTEGER")
        _ensure_column("contracts", "billing_day", "INTEGER")
        _ensure_column("contract_payment_stages", "paid_at", "TIMESTAMP WITH TIME ZONE")
        # User phone
        _ensure_column("users", "phone", "VARCHAR(50)")
        # Site module columns
        _ensure_column("account_site_configs", "site_url", "VARCHAR(2048)")
        _ensure_column("account_site_configs", "gmb_url", "VARCHAR(2048)")
        _ensure_column("account_site_configs", "popup_text", "TEXT")
        _ensure_column("account_site_configs", "popup_image_base64", "TEXT")
        _ensure_column("site_leads", "source", "VARCHAR(2048)")
        _ensure_column("site_leads", "treatment", "VARCHAR(255)")
        # Public token for website form embed (UUID, replaces exposing internal account IDs)
        _ensure_column("account_site_configs", "public_token", "VARCHAR(36)")
        _backfill_public_tokens()
        # Notification channel + per-account message templates
        _ensure_column("account_site_configs", "notify_channel", "VARCHAR(20)")
        _ensure_column("account_site_configs", "wa_notify_message", "TEXT")
        _ensure_column("account_site_configs", "email_notify_subject", "TEXT")
        _ensure_column("account_site_configs", "email_notify_message", "TEXT")
        # WhatsApp owner phone & verification
        _ensure_column("account_site_configs", "wa_owner_phone", "VARCHAR(30)")
        _ensure_column("account_site_configs", "wa_owner_phone_verified", "VARCHAR(30)")
        _ensure_column("account_site_configs", "wa_connect_code", "VARCHAR(20)")
    except Exception:
        logger.exception("Lightweight DB migrations failed — check database permissions and schema.")

    # account_billing_instructions table is created via Base.metadata.create_all above;
    # no extra ALTER TABLE needed for the initial columns.

