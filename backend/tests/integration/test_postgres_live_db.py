"""Guardrail tests for the LIVE configured database (read-only).

These verify the running app's database (from settings.database_url / .env) is a
healthy Postgres deployment after the SQLite -> Postgres migration:
  * the backend is really Postgres,
  * every model table exists,
  * core tables are populated and queryable,
  * datetime columns are timezone-aware,
  * foreign-key orphans are limited to the known legacy rows carried over from
    the old SQLite database (which did not enforce foreign keys).

The whole module is skipped automatically when the configured DB is not Postgres
or is unreachable, so it is CI-safe. Every statement here is a SELECT — it never
writes to the live database.
"""

from __future__ import annotations

import datetime

import pytest
from sqlalchemy import inspect, text

from app.db.session import Base, engine
import app.db.base  # noqa: F401 — register all model metadata

# Legacy orphan rows that existed in prod SQLite (which did not enforce foreign
# keys) and were preserved verbatim by the migration. Each references a row that
# had been deleted from the parent table. Documented here so this guardrail
# passes on the current data yet still fails if NEW/unexpected orphans appear.
# (table, local_column)
KNOWN_LEGACY_ORPHANS = {
    ("account_billing_instructions", "account_id"),  # 1 row
    ("contracts", "account_id"),                      # 1 row
    ("billing_instruction_history", "account_id"),    # 5 rows
    ("saved_cards", "account_id"),                    # 1 row
    ("subscription_payments", "contract_id"),         # 1 row
}


def _pg_reachable() -> bool:
    if engine.url.get_backend_name() != "postgresql":
        return False
    try:
        with engine.connect() as c:
            c.execute(text("SELECT 1"))
        return True
    except Exception:
        return False


pytestmark = pytest.mark.skipif(
    not _pg_reachable(),
    reason="live database is not a reachable Postgres instance",
)


def test_configured_db_is_postgres():
    assert engine.url.get_backend_name() == "postgresql"


def test_all_model_tables_exist():
    present = set(inspect(engine).get_table_names())
    expected = set(Base.metadata.tables)
    missing = expected - present
    assert not missing, f"missing tables in live DB: {sorted(missing)}"


def test_core_tables_are_populated():
    with engine.connect() as c:
        for table in ("users", "accounts", "contracts"):
            n = c.execute(text(f'SELECT count(*) FROM "{table}"')).scalar()
            assert n and n > 0, f"expected rows in {table}, found {n}"


def test_datetime_columns_are_timezone_aware():
    """Migrated datetimes must round-trip as tz-aware (DateTime(timezone=True))."""
    with engine.connect() as c:
        row = c.execute(
            text("SELECT created_at FROM contracts ORDER BY id LIMIT 1")
        ).first()
    assert row is not None
    value = row[0]
    assert isinstance(value, datetime.datetime)
    assert value.tzinfo is not None, "expected timezone-aware datetime"


def test_foreign_key_orphans_are_only_known_legacy_rows():
    """Scan every FK in the model metadata for orphan rows in the live DB."""
    offenders: dict[tuple[str, str], int] = {}
    for table in Base.metadata.sorted_tables:
        for fk in table.foreign_keys:
            local_col = fk.parent.name
            ref_table = fk.column.table.name
            ref_col = fk.column.name
            sql = text(
                f'SELECT count(*) FROM "{table.name}" x '
                f'WHERE x."{local_col}" IS NOT NULL '
                f'AND NOT EXISTS (SELECT 1 FROM "{ref_table}" p '
                f'WHERE p."{ref_col}" = x."{local_col}")'
            )
            with engine.connect() as c:  # own connection so one error can't cascade
                n = c.execute(sql).scalar()
            if n:
                offenders[(table.name, local_col)] = n

    unexpected = {k: v for k, v in offenders.items() if k not in KNOWN_LEGACY_ORPHANS}
    assert not unexpected, f"unexpected FK orphans in live DB: {unexpected}"
