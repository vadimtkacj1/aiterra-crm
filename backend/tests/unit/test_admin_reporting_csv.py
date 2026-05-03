"""Unit tests: admin CSV builders against a throwaway SQLite session (no FastAPI)."""

from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from sqlalchemy.pool import StaticPool

from app.db.session import Base
from app.models.billing import BillingInstructionHistory
from app.models.core import Account, User
from app.services.admin.reporting import build_billing_history_csv, build_users_csv
from app.services.auth.security import hash_password


def _memory_session():
    from app.db import base  # noqa: F401 — register models on metadata

    engine = create_engine(
        "sqlite://",
        connect_args={"check_same_thread": False},
        poolclass=StaticPool,
    )
    Base.metadata.create_all(bind=engine)
    return sessionmaker(bind=engine)()


def test_build_users_csv_headers_and_row():
    s = _memory_session()
    try:
        u = User(
            email="csv@test.local",
            display_name="CSV User",
            role="user",
            password_hash=hash_password("p"),
        )
        s.add(u)
        s.commit()
        raw = build_users_csv(s)
        text = raw.decode("utf-8-sig")
        lines = text.strip().splitlines()
        assert lines[0].startswith("id,")
        assert any("csv@test.local" in ln for ln in lines)
    finally:
        s.close()


def test_build_billing_history_csv_installment_columns():
    s = _memory_session()
    try:
        a = Account(name="Acc CSV")
        s.add(a)
        s.commit()
        s.refresh(a)
        h = BillingInstructionHistory(
            account_id=a.id,
            charge_type="monthly",
            amount=100.0,
            currency="ILS",
            description="Plan",
            installment_months=4,
            installment_total_amount=400.0,
            record_status="active",
        )
        s.add(h)
        s.commit()
        raw = build_billing_history_csv(s, limit=50)
        text = raw.decode("utf-8-sig")
        header = text.splitlines()[0]
        assert "installmentMonths" in header
        assert "installmentTotalAmount" in header
        assert "4" in text
        assert "400" in text
    finally:
        s.close()
