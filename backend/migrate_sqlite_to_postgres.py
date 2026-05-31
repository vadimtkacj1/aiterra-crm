#!/usr/bin/env python3
"""
SQLite → PostgreSQL migration script.

Before running:
  1. Create the target database:
       psql -U postgres -c "CREATE DATABASE crm;"
  2. Install dependencies (already in requirements.txt):
       pip install psycopg2-binary
  3. Run from the backend/ directory:
       SQLITE_URL=sqlite:///./app.db DATABASE_URL=postgresql://user:pass@host:5432/crm python migrate_sqlite_to_postgres.py

     On Windows PowerShell:
       $env:SQLITE_URL="sqlite:///./app.db"; $env:DATABASE_URL="postgresql://user:pass@host:5432/crm"; python migrate_sqlite_to_postgres.py
"""
import os
import sys

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

SQLITE_URL = os.getenv("SQLITE_URL", "sqlite:///./app.db")
POSTGRES_URL = os.getenv("DATABASE_URL", "postgresql://postgres:password@localhost:5432/crm")

# Must be set BEFORE importing app modules — Pydantic Settings reads env at import time.
os.environ["DATABASE_URL"] = POSTGRES_URL

from sqlalchemy import create_engine, MetaData, text, inspect as sa_inspect  # noqa: E402

print(f"Source  (SQLite):     {SQLITE_URL}")
print(f"Target  (PostgreSQL): {POSTGRES_URL}")
print()

sqlite_engine = create_engine(SQLITE_URL, connect_args={"check_same_thread": False})

# ── Step 1: Bootstrap PostgreSQL schema ───────────────────────────────────────
# Import ORM models AFTER setting DATABASE_URL so the app engine targets PostgreSQL.
print("[1/4] Creating PostgreSQL schema via ORM models + lightweight migrations...")
from app.db.session import Base, engine as pg_engine, _apply_lightweight_migrations  # noqa: E402
import app.db.base  # noqa: F401, E402 — registers all model classes with Base

Base.metadata.create_all(bind=pg_engine)   # creates all ORM tables with proper PG types/sequences
_apply_lightweight_migrations()             # adds ALTER TABLE columns that were added outside ORM
print("  ✓ Schema ready")

# ── Step 2: Reflect both sides ────────────────────────────────────────────────
print("\n[2/4] Reflecting schemas...")
sqlite_meta = MetaData()
sqlite_meta.reflect(bind=sqlite_engine)

pg_meta = MetaData()
pg_meta.reflect(bind=pg_engine)

table_names = sorted(sqlite_meta.tables.keys())
print(f"  SQLite : {len(table_names)} tables — {', '.join(table_names)}")
print(f"  PG     : {len(pg_meta.tables)} tables")

# ── Step 3: Copy rows ─────────────────────────────────────────────────────────
print("\n[3/4] Copying rows...")
total_rows = 0
errors: list[tuple[str, str]] = []

# Disable FK constraint checks for the duration of the copy so we don't have
# to care about insertion order.
with pg_engine.begin() as _fk_off:
    _fk_off.execute(text("SET session_replication_role = 'replica'"))

for table_name in table_names:
    if table_name not in pg_meta.tables:
        print(f"  ⚠  {table_name}: not found in PostgreSQL schema — skipping")
        continue

    src_table = sqlite_meta.tables[table_name]
    dst_table = pg_meta.tables[table_name]

    with sqlite_engine.connect() as src:
        rows = src.execute(src_table.select()).fetchall()

    if not rows:
        print(f"  -  {table_name}: (empty)")
        continue

    # Only copy columns that exist in both (guards against schema drift)
    src_col_names = [c.name for c in src_table.columns]
    dst_col_names = {c.name for c in dst_table.columns}
    data = [
        {col: row[i] for i, col in enumerate(src_col_names) if col in dst_col_names}
        for row in rows
    ]

    try:
        with pg_engine.begin() as dst:
            dst.execute(text("SET session_replication_role = 'replica'"))
            dst.execute(dst_table.insert(), data)
        total_rows += len(rows)
        print(f"  ✓  {table_name}: {len(rows):,} rows")
    except Exception as exc:
        errors.append((table_name, str(exc)))
        print(f"  ✗  {table_name}: {exc}")

# Re-enable FK checks
with pg_engine.begin() as _fk_on:
    _fk_on.execute(text("SET session_replication_role = 'origin'"))

# ── Step 4: Reset sequences ───────────────────────────────────────────────────
print("\n[4/4] Resetting PostgreSQL sequences...")
inspector = sa_inspect(pg_engine)

with pg_engine.begin() as conn:
    for table_name in sorted(pg_meta.tables.keys()):
        pk_cols = inspector.get_pk_constraint(table_name).get("constrained_columns", [])
        for pk_col in pk_cols:
            try:
                seq = conn.execute(
                    text("SELECT pg_get_serial_sequence(:t, :c)"),
                    {"t": table_name, "c": pk_col},
                ).scalar()
                if seq:
                    conn.execute(
                        text(
                            f"SELECT setval(:seq,"
                            f" COALESCE((SELECT MAX({pk_col}) FROM {table_name}), 1),"
                            f" true)"
                        ),
                        {"seq": seq},
                    )
                    print(f"  ✓  {table_name}.{pk_col}")
            except Exception:
                pass

# ── Summary ───────────────────────────────────────────────────────────────────
sep = "=" * 60
print(f"\n{sep}")
if errors:
    print(f"⚠  Completed with {len(errors)} error(s):")
    for tbl, err in errors:
        print(f"   {tbl}: {err}")
    print(f"\n   Rows migrated: {total_rows:,}")
    print(sep)
    sys.exit(1)
else:
    print("✓  Migration complete!")
    print(f"   Tables : {len(table_names)}")
    print(f"   Rows   : {total_rows:,}")
    print(sep)
    print(
        "\nFinal step — update DATABASE_URL in backend/.env:\n"
        f"   DATABASE_URL={POSTGRES_URL}\n"
        "\nThen restart the backend."
    )
