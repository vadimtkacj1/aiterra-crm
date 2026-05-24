"""
Migration script: SQLite → PostgreSQL

Usage:
    python migrate_sqlite_to_postgres.py

Before running:
    1. Create PostgreSQL database: CREATE DATABASE crm;
    2. Set environment variables or update this script with connection strings
    3. Backup your SQLite database first!
"""

import os
import sys
from sqlalchemy import create_engine, MetaData, Table, inspect
from sqlalchemy.orm import sessionmaker

# ── Configuration ──────────────────────────────────────────────────────────
SQLITE_URL = os.getenv(
    "SQLITE_URL",
    "sqlite:///C:/Users/vadim/Downloads/crm/backend/app.db"
)

POSTGRES_URL = os.getenv(
    "DATABASE_URL",
    "postgresql://postgres:password@localhost:5432/crm"
)

# ── Connect to both databases ──────────────────────────────────────────────
print(f"Connecting to SQLite: {SQLITE_URL}")
sqlite_engine = create_engine(SQLITE_URL)

print(f"Connecting to PostgreSQL: {POSTGRES_URL}")
postgres_engine = create_engine(POSTGRES_URL)

# ── Reflect SQLite schema ──────────────────────────────────────────────────
print("\nReflecting SQLite schema...")
sqlite_metadata = MetaData()
sqlite_metadata.reflect(bind=sqlite_engine)

table_names = list(sqlite_metadata.tables.keys())
print(f"Found {len(table_names)} tables: {', '.join(table_names)}")

# ── Create tables in PostgreSQL ────────────────────────────────────────────
print("\nCreating tables in PostgreSQL...")
sqlite_metadata.create_all(bind=postgres_engine)

# ── Migrate data table by table ────────────────────────────────────────────
SqliteSession = sessionmaker(bind=sqlite_engine)
PostgresSession = sessionmaker(bind=postgres_engine)

sqlite_session = SqliteSession()
postgres_session = PostgresSession()

total_rows = 0

try:
    for table_name in table_names:
        print(f"\nMigrating table: {table_name}")

        table = Table(table_name, sqlite_metadata, autoload_with=sqlite_engine)

        # Read all rows from SQLite
        sqlite_conn = sqlite_engine.connect()
        rows = sqlite_conn.execute(table.select()).fetchall()
        sqlite_conn.close()

        if not rows:
            print(f"  ✓ {table_name}: 0 rows (empty)")
            continue

        # Insert into PostgreSQL
        postgres_conn = postgres_engine.connect()

        # Convert rows to dicts
        columns = [col.name for col in table.columns]
        data = [dict(zip(columns, row)) for row in rows]

        # Batch insert
        postgres_conn.execute(table.insert(), data)
        postgres_conn.commit()
        postgres_conn.close()

        row_count = len(rows)
        total_rows += row_count
        print(f"  ✓ {table_name}: {row_count} rows migrated")

    print(f"\n{'='*60}")
    print(f"✓ Migration complete!")
    print(f"  Total tables: {len(table_names)}")
    print(f"  Total rows: {total_rows}")
    print(f"{'='*60}")

    # ── Reset PostgreSQL sequences (for auto-increment columns) ───────────
    print("\nResetting PostgreSQL sequences...")
    inspector = inspect(postgres_engine)

    with postgres_engine.connect() as conn:
        for table_name in table_names:
            # Get primary key columns
            pk_columns = inspector.get_pk_constraint(table_name).get('constrained_columns', [])

            for pk_col in pk_columns:
                # Check if column has a sequence (auto-increment)
                try:
                    result = conn.execute(f"""
                        SELECT pg_get_serial_sequence('{table_name}', '{pk_col}')
                    """)
                    sequence_name = result.scalar()

                    if sequence_name:
                        # Reset sequence to max value + 1
                        conn.execute(f"""
                            SELECT setval('{sequence_name}',
                                COALESCE((SELECT MAX({pk_col}) FROM {table_name}), 1),
                                true)
                        """)
                        print(f"  ✓ Reset sequence for {table_name}.{pk_col}")
                except Exception as e:
                    # Not all PKs have sequences, skip silently
                    pass

        conn.commit()

    print("\n✓ All done! You can now update DATABASE_URL in .env to PostgreSQL.")

except Exception as e:
    print(f"\n✗ Migration failed: {e}")
    import traceback
    traceback.print_exc()
    sys.exit(1)

finally:
    sqlite_session.close()
    postgres_session.close()
