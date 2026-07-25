"""Repository integration tests — real SQLite, ORM<->entity mapping and write semantics."""

from __future__ import annotations

from sqlalchemy.orm import Session

from app.db.session import Base
from app.domain.billing.invoice.entity import InvoiceIssueInput, InvoiceLineIn
from app.infra.billing.invoice.repository import InvoiceRepository
from app.models.billing import Invoice


def _session(engine) -> Session:
    from app.db import base  # noqa: F401 — register all model metadata

    Base.metadata.create_all(bind=engine)
    return Session(bind=engine)


def _issue(**overrides) -> InvoiceIssueInput:
    base = dict(source_type="manual", source_id=None, amount=120.0, currency="ils")
    base.update(overrides)
    return InvoiceIssueInput(**base)


def test_upsert_is_idempotent_on_doc_id_and_uppercases_currency(engine):
    with _session(engine) as s:
        repo = InvoiceRepository(s)
        for _ in range(2):
            repo.upsert_by_doc_id(_issue(provider_doc_id="doc_x"))
        s.commit()

        rows = s.query(Invoice).filter_by(provider_doc_id="doc_x").all()
        assert len(rows) == 1
        assert rows[0].currency == "ILS"


def test_upsert_replaces_lines_when_provided(engine):
    with _session(engine) as s:
        repo = InvoiceRepository(s)
        repo.upsert_by_doc_id(
            _issue(provider_doc_id="doc_lines", amount=300.0, lines=(
                InvoiceLineIn("A", 100.0),
                InvoiceLineIn("B", 200.0),
            ))
        )
        s.commit()

        entity = repo.get_by_doc_id("doc_lines")
        assert entity is not None
        assert sorted(line.amount for line in entity.lines) == [100.0, 200.0]


def test_supersede_marks_old_open_invoice(engine):
    with _session(engine) as s:
        repo = InvoiceRepository(s)
        old = repo.upsert_by_doc_id(_issue(provider_doc_id="old"))
        new = repo.upsert_by_doc_id(_issue(provider_doc_id="new"))
        repo.supersede("old", new.id)
        s.commit()

        old_reloaded = repo.get(old.id)
        assert old_reloaded is not None
        assert old_reloaded.is_superseded
        assert old_reloaded.superseded_by_id == new.id


def test_mark_paid_is_idempotent(engine):
    with _session(engine) as s:
        repo = InvoiceRepository(s)
        repo.upsert_by_doc_id(_issue(provider_doc_id="pay"))
        first = repo.mark_paid("pay", reference_number="REF-1", approval_number="APP-1")
        second = repo.mark_paid("pay")
        s.commit()

        assert first is not None and first.is_paid
        assert first.paid_at is not None
        assert first.reference_number == "REF-1"
        # A second callback keeps the row paid and does not clear the reference.
        assert second is not None and second.is_paid
        assert second.reference_number == "REF-1"


def test_mark_paid_returns_none_for_unknown_doc(engine):
    with _session(engine) as s:
        assert InvoiceRepository(s).mark_paid("nope") is None


def test_list_and_count_filter_by_account_and_status(engine):
    from app.models.core import Account

    with _session(engine) as s:
        # Real accounts: invoices.account_id is a foreign key, and the database enforces it.
        first, second = Account(name="Acct One"), Account(name="Acct Two")
        s.add_all([first, second])
        s.flush()

        repo = InvoiceRepository(s)
        repo.upsert_by_doc_id(_issue(provider_doc_id="a1", account_id=first.id))
        repo.upsert_by_doc_id(_issue(provider_doc_id="a2", account_id=first.id))
        repo.upsert_by_doc_id(_issue(provider_doc_id="b1", account_id=second.id))
        s.commit()

        assert repo.count(account_id=first.id) == 2
        assert repo.count(account_id=second.id) == 1
        assert repo.count(status="open") == 3
        items = repo.list(account_id=first.id)
        assert {i.provider_doc_id for i in items} == {"a1", "a2"}
