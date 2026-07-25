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
    try:
        _backfill_invoices()
    except Exception:
        # The registry is not read from yet — an incomplete import must not stop boot.
        logger.exception("invoice backfill failed — registry may be incomplete")

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


def _backfill_stage_kind() -> None:
    """Classify pre-existing payment stages, preserving the old sort_order rule exactly.

    Before the ``kind`` column, the subscription stage was always the first one of a
    contract carrying monthly_amount. Rows are stamped once; already-classified rows and
    every row written from now on are left alone.
    """
    inspector = inspect(engine)
    if not inspector.has_table("contract_payment_stages"):
        return
    cols = {c["name"] for c in inspector.get_columns("contract_payment_stages")}
    if "kind" not in cols:
        return
    with engine.begin() as conn:
        conn.execute(
            text(
                "UPDATE contract_payment_stages SET kind = 'subscription' "
                "WHERE kind IS NULL AND sort_order = 0 AND contract_id IN "
                "(SELECT id FROM contracts WHERE monthly_amount IS NOT NULL AND monthly_amount > 0)"
            )
        )
        conn.execute(text("UPDATE contract_payment_stages SET kind = 'one_time' WHERE kind IS NULL"))


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


def _backfill_invoices() -> None:
    """Mirror every pre-existing payment into the invoice registry.

    Additive and idempotent: a doc ID already in ``invoices`` is left untouched, so
    this can run on every boot. Nothing is deleted or rewritten in the source tables —
    they remain the authority until the registry is switched on for reads.
    """
    from app.models.billing import (
        AccountBillingInstruction,
        BillingInstructionHistory,
        Invoice,
        InvoiceLine,
        SubscriptionPayment,
    )
    from app.models.contracts import Contract, ContractPaymentStage
    from app.models.core import Account, User

    inspector = inspect(engine)
    if not inspector.has_table("invoices"):
        return

    created = {"contract": 0, "billing_instruction": 0, "history": 0, "recurring": 0}
    detached = 0
    with SessionLocal() as db:
        known: set[str] = {
            doc_id for (doc_id,) in db.query(Invoice.provider_doc_id).all() if doc_id
        }

        # Legacy rows point at accounts/users deleted before foreign keys were enforced.
        # Such an invoice is still money that changed hands: keep the row, drop only the
        # dangling reference (what ON DELETE SET NULL would have done).
        live_accounts: set[int] = {aid for (aid,) in db.query(Account.id).all()}
        live_users: set[int] = {uid for (uid,) in db.query(User.id).all()}

        def _account(account_id: int | None) -> int | None:
            nonlocal detached
            if account_id is None:
                return None
            if account_id in live_accounts:
                return account_id
            detached += 1
            return None

        def _admin(user_id: int | None) -> int | None:
            return user_id if user_id in live_users else None

        # ── Contract stages: stages sharing a doc ID were one combined invoice ──
        stages = (
            db.query(ContractPaymentStage)
            .filter(ContractPaymentStage.payment_doc_id.isnot(None))
            .order_by(ContractPaymentStage.contract_id, ContractPaymentStage.sort_order)
            .all()
        )
        by_doc: dict[str, list[ContractPaymentStage]] = {}
        for stage in stages:
            by_doc.setdefault(stage.payment_doc_id, []).append(stage)

        for doc_id, group in by_doc.items():
            if doc_id in known:
                continue
            contract = db.query(Contract).filter(Contract.id == group[0].contract_id).first()
            paid = [s for s in group if s.status == "paid"]
            paid_dates = [s.paid_at for s in paid if s.paid_at]
            invoice = Invoice(
                account_id=_account(contract.account_id if contract else None),
                source_type="contract",
                source_id=group[0].contract_id,
                amount=sum(s.amount for s in group),
                currency=(contract.currency if contract else "ILS") or "ILS",
                description=f"Contract #{group[0].contract_id}",
                status="paid" if len(paid) == len(group) else "open",
                provider="zcredit",
                provider_doc_id=doc_id,
                provider_url=group[0].payment_url,
                paid_at=max(paid_dates) if paid_dates else None,
            )
            invoice.lines = [
                InvoiceLine(
                    sort_order=i, description=s.description, amount=s.amount, stage_id=s.id
                )
                for i, s in enumerate(group)
            ]
            db.add(invoice)
            known.add(doc_id)
            created["contract"] += 1

        # ── Live billing instructions ────────────────────────────────────────────
        for ins in (
            db.query(AccountBillingInstruction)
            .filter(AccountBillingInstruction.payment_doc_id.isnot(None))
            .all()
        ):
            if ins.payment_doc_id in known:
                continue
            # The webhook clears payment_url on payment — the only paid-marker these
            # rows ever had. Absent URL therefore reads as paid.
            db.add(
                Invoice(
                    account_id=_account(ins.account_id),
                    source_type="billing_instruction",
                    source_id=ins.id,
                    amount=ins.amount or 0.0,
                    currency=ins.currency or "ILS",
                    description=ins.description,
                    status="open" if ins.payment_url else "paid",
                    provider="zcredit",
                    provider_doc_id=ins.payment_doc_id,
                    provider_url=ins.payment_url,
                    created_by_admin_id=_admin(ins.created_by_admin_id),
                )
            )
            known.add(ins.payment_doc_id)
            created["billing_instruction"] += 1

        # ── Superseded / revoked instructions still in history ───────────────────
        history_status = {"active": "open", "superseded": "superseded", "revoked": "canceled"}
        for row in (
            db.query(BillingInstructionHistory)
            .filter(BillingInstructionHistory.payment_doc_id.isnot(None))
            .all()
        ):
            if row.payment_doc_id in known:
                continue
            db.add(
                Invoice(
                    account_id=_account(row.account_id),
                    source_type="billing_instruction",
                    source_id=None,
                    amount=row.amount or 0.0,
                    currency=row.currency or "ILS",
                    description=row.description,
                    status=history_status.get(row.record_status or "", "open"),
                    provider="zcredit",
                    provider_doc_id=row.payment_doc_id,
                    provider_url=row.payment_url,
                    created_by_admin_id=_admin(row.created_by_admin_id),
                )
            )
            known.add(row.payment_doc_id)
            created["history"] += 1

        # ── Recurring charges: money already collected off a saved card ─────────
        # These never had a hosted link, so nothing else records them as invoices.
        for payment in (
            db.query(SubscriptionPayment)
            .filter(
                SubscriptionPayment.status == "success",
                SubscriptionPayment.zcredit_transaction_id.isnot(None),
            )
            .order_by(SubscriptionPayment.id)
            .all()
        ):
            doc_id = payment.zcredit_transaction_id
            if not doc_id or doc_id in known:
                continue
            instruction = (
                db.query(AccountBillingInstruction)
                .filter(AccountBillingInstruction.id == payment.billing_instruction_id)
                .first()
            )
            db.add(
                Invoice(
                    account_id=_account(instruction.account_id if instruction else None),
                    source_type="billing_instruction",
                    source_id=payment.billing_instruction_id,
                    amount=payment.amount,
                    currency=payment.currency or "ILS",
                    description=(
                        f"{(instruction.description if instruction else None) or 'Monthly subscription'}"
                        f" · #{payment.payment_number}"
                    ),
                    status="paid",
                    provider="zcredit",
                    provider_doc_id=doc_id,
                    paid_at=payment.paid_at,
                    reference_number=payment.zcredit_transaction_id,
                    approval_number=payment.zcredit_approval_number or None,
                )
            )
            known.add(doc_id)
            created["recurring"] += 1

        if detached:
            logger.warning(
                "invoice backfill: %d invoice(s) imported without an account — the account "
                "row no longer exists (legacy data predating foreign keys)",
                detached,
            )

        if any(created.values()):
            db.commit()
            logger.info(
                "invoice backfill: %d contract, %d billing instruction, %d history, "
                "%d recurring charge row(s) imported",
                created["contract"], created["billing_instruction"], created["history"],
                created["recurring"],
            )


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
        # Idempotent contract checkout: reuse the open invoice, keep replaced doc IDs
        _ensure_column("contract_payment_stages", "payment_url", "VARCHAR(2048)")
        _ensure_column("contract_payment_stages", "superseded_doc_ids", "TEXT")
        # Explicit stage kind — replaces inferring "this is the subscription" from sort_order
        _ensure_column("contract_payment_stages", "kind", "VARCHAR(20)")
        _backfill_stage_kind()
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

