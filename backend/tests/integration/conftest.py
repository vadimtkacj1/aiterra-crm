"""Integration tests: FastAPI + in-memory SQLite + dependency overrides."""

from __future__ import annotations

from unittest.mock import patch

import pytest
from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import Session, sessionmaker
from sqlalchemy.pool import StaticPool

from app.db.session import Base, get_db
from app.main import app
from app.models.core import Account, AccountMembership, User
from app.services.auth.security import hash_password


@pytest.fixture
def engine():
    """Fresh SQLite in-memory database (single connection pool)."""
    eng = create_engine(
        "sqlite://",
        connect_args={"check_same_thread": False},
        poolclass=StaticPool,
    )
    return eng


def _seed_users(session: Session) -> dict[str, int]:
    admin = User(
        email="admin@test.local",
        display_name="Admin",
        role="admin",
        password_hash=hash_password("secretadmin"),
    )
    member = User(
        email="member@test.local",
        display_name="Member",
        role="user",
        password_hash=hash_password("secretmember"),
    )
    session.add_all([admin, member])
    session.flush()
    acct = Account(name="Biz One")
    session.add(acct)
    session.flush()
    session.add(
        AccountMembership(
            user_id=member.id,
            account_id=acct.id,
            role_in_account="owner",
        )
    )
    session.commit()
    return {
        "admin_id": admin.id,
        "member_id": member.id,
        "account_id": acct.id,
    }


@pytest.fixture
def client(engine):
    """FastAPI client with overridden DB and patched startup init."""
    TestingSessionLocal = sessionmaker(bind=engine)

    def override_get_db():
        db = TestingSessionLocal()
        try:
            yield db
        finally:
            db.close()

    def init_db_for_tests() -> None:
        from app.db import base  # noqa: F401 — register model metadata

        Base.metadata.create_all(bind=engine)
        s = Session(bind=engine)
        try:
            _seed_users(s)
        finally:
            s.close()

    app.dependency_overrides[get_db] = override_get_db

    with patch("app.main.init_db", init_db_for_tests):
        with TestClient(app) as test_client:
            yield test_client

    app.dependency_overrides.clear()


@pytest.fixture
def test_ids(client, engine) -> dict[str, int]:
    """Stable IDs from seeded data (after TestClient lifespan ran init)."""
    s = Session(bind=engine)
    try:
        admin = s.query(User).filter(User.email == "admin@test.local").one()
        member = s.query(User).filter(User.email == "member@test.local").one()
        m = s.query(AccountMembership).filter(AccountMembership.user_id == member.id).one()
        return {
            "admin_id": admin.id,
            "member_id": member.id,
            "account_id": m.account_id,
        }
    finally:
        s.close()


@pytest.fixture
def token_admin(client) -> str:
    r = client.post(
        "/api/auth/login",
        json={"email": "admin@test.local", "password": "secretadmin"},
    )
    assert r.status_code == 200
    return r.json()["accessToken"]


@pytest.fixture
def token_member(client) -> str:
    r = client.post(
        "/api/auth/login",
        json={"email": "member@test.local", "password": "secretmember"},
    )
    assert r.status_code == 200
    return r.json()["accessToken"]


def auth_headers(token: str) -> dict[str, str]:
    return {"Authorization": f"Bearer {token}"}


@pytest.fixture
def h_admin(token_admin):
    return auth_headers(token_admin)


@pytest.fixture
def h_member(token_member):
    return auth_headers(token_member)
