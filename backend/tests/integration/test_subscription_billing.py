"""Recurring billing: the paths where a subscription silently under- or over-charges."""

from __future__ import annotations

from datetime import date, datetime, timedelta, timezone

from sqlalchemy.orm import Session

from app.models.billing import AccountBillingInstruction, SavedCard, SubscriptionPayment
from app.models.contracts import Contract


def _instruction(engine, *, account_id: int, **overrides) -> int:
    fields = dict(
        account_id=account_id,
        charge_type="monthly",
        amount=200.0,
        currency="ILS",
        description="Monthly plan",
        subscription_status="active",
    )
    fields.update(overrides)
    with Session(bind=engine) as s:
        ins = AccountBillingInstruction(**fields)
        s.add(ins)
        s.commit()
        return ins.id


def test_active_subscription_without_a_billing_day_is_repaired(client, test_ids, engine):
    """billing_day IS NULL never matches today -> the plan was active but never charged."""
    from app.jobs import billing_charge_job

    ins_id = _instruction(engine, account_id=test_ids["account_id"], billing_day=None)
    paid_on = datetime(2026, 6, 15, tzinfo=timezone.utc)
    with Session(bind=engine) as s:
        s.add(SubscriptionPayment(
            billing_instruction_id=ins_id, amount=200.0, currency="ILS",
            payment_number=1, status="success", paid_at=paid_on,
        ))
        s.commit()

        billing_charge_job._repair_missing_billing_day(s, date(2026, 7, 24))

        assert s.query(AccountBillingInstruction).filter_by(id=ins_id).one().billing_day == 15


def test_repair_caps_the_billing_day_at_28(client, test_ids, engine):
    """A plan anchored on the 30th would otherwise skip February and short months."""
    from app.jobs import billing_charge_job

    ins_id = _instruction(engine, account_id=test_ids["account_id"], billing_day=None)
    with Session(bind=engine) as s:
        s.add(SubscriptionPayment(
            billing_instruction_id=ins_id, amount=200.0, currency="ILS",
            payment_number=1, status="success",
            paid_at=datetime(2026, 5, 30, tzinfo=timezone.utc),
        ))
        s.commit()

        billing_charge_job._repair_missing_billing_day(s, date(2026, 7, 24))

        assert s.query(AccountBillingInstruction).filter_by(id=ins_id).one().billing_day == 28


def test_repair_leaves_test_interval_subscriptions_alone(client, test_ids, engine):
    from app.jobs import billing_charge_job

    ins_id = _instruction(
        engine, account_id=test_ids["account_id"], billing_day=None, test_interval_minutes=10
    )
    with Session(bind=engine) as s:
        billing_charge_job._repair_missing_billing_day(s, date(2026, 7, 24))
        assert s.query(AccountBillingInstruction).filter_by(id=ins_id).one().billing_day is None


def test_fixed_term_plan_stops_after_its_last_month(client, test_ids, engine):
    """A 12-month plan must not roll into month 13."""
    from app.jobs import billing_charge_job

    ins_id = _instruction(
        engine,
        account_id=test_ids["account_id"],
        billing_day=15,
        amount=300.0,
        installment_months=12,
        installment_total_amount=3600.0,
    )
    with Session(bind=engine) as s:
        for i in range(12):
            s.add(SubscriptionPayment(
                billing_instruction_id=ins_id, amount=300.0, currency="ILS",
                payment_number=i + 1, status="success",
                paid_at=datetime(2025, 8, 15, tzinfo=timezone.utc) + timedelta(days=30 * i),
            ))
        s.add(SavedCard(
            account_id=test_ids["account_id"],
            holder_name="Jane Doe",
            last4="4242",
            exp_month=12,
            exp_year=2030,
            zcredit_token="tok_x",
        ))
        s.commit()

        ins = s.query(AccountBillingInstruction).filter_by(id=ins_id).one()
        billing_charge_job._charge_one(s, ins, date(2026, 8, 15))

        reloaded = s.query(AccountBillingInstruction).filter_by(id=ins_id).one()
        assert reloaded.subscription_status == "completed"
        # No 13th charge was recorded
        assert s.query(SubscriptionPayment).filter_by(billing_instruction_id=ins_id).count() == 12


def test_open_ended_plan_is_never_marked_complete(client, test_ids, engine):
    from app.jobs import billing_charge_job

    ins_id = _instruction(engine, account_id=test_ids["account_id"], billing_day=15)
    with Session(bind=engine) as s:
        for i in range(24):
            s.add(SubscriptionPayment(
                billing_instruction_id=ins_id, amount=200.0, currency="ILS",
                payment_number=i + 1, status="success",
            ))
        s.commit()
        ins = s.query(AccountBillingInstruction).filter_by(id=ins_id).one()
        assert billing_charge_job._term_is_complete(s, ins) is False


def test_signed_subscription_keeps_the_agreed_monthly_price(client, h_admin, test_ids, engine):
    """A 300/mo x 12 contract used to bill 300/12 = 25/mo."""
    r = client.post(
        "/api/admin/contracts",
        headers=h_admin,
        json={
            "accountId": test_ids["account_id"],
            "title": "Yearly retainer",
            "currency": "ILS",
            "isSubscription": True,
            "monthlyAmount": 300.0,
            "subscriptionMonths": 12,
            "billingDay": 5,
            "stages": [],
        },
    )
    assert r.status_code == 200
    token = r.json()["signToken"]

    signed = client.post(
        f"/api/contracts/{token}/sign",
        json={
            "signerName": "Jane Doe",
            "signaturePngBase64": (
                "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg=="
            ),
        },
    )
    assert signed.status_code == 200

    with Session(bind=engine) as s:
        contract = s.query(Contract).filter_by(id=r.json()["id"]).one()
        ins = (
            s.query(AccountBillingInstruction)
            .filter_by(id=contract.billing_instruction_id)
            .one()
        )
        assert ins.amount == 300.0
        assert ins.installment_months == 12
        assert ins.installment_total_amount == 3600.0
        assert ins.billing_day == 5


def test_recurring_charge_lands_in_the_invoice_registry(client, test_ids, engine, monkeypatch):
    """A scheduled charge never has a hosted link — it must still be recorded as money taken."""
    from app.jobs import billing_charge_job
    from app.models.billing import Invoice

    ins_id = _instruction(engine, account_id=test_ids["account_id"], billing_day=15, amount=200.0)
    monkeypatch.setattr(billing_charge_job, "pay_open_invoice", lambda *a, **k: None)

    with Session(bind=engine) as s:
        s.add(SavedCard(
            account_id=test_ids["account_id"], holder_name="Jane Doe", last4="4242",
            exp_month=12, exp_year=2030, zcredit_token="tok_ok",
        ))
        s.commit()

        ins = s.query(AccountBillingInstruction).filter_by(id=ins_id).one()
        billing_charge_job._charge_one(s, ins, date(2026, 8, 15))

        payment = s.query(SubscriptionPayment).filter_by(billing_instruction_id=ins_id).one()
        invoice = s.query(Invoice).filter_by(provider_doc_id=payment.zcredit_transaction_id).one()
        assert invoice.status == "paid"
        assert invoice.amount == 200.0
        assert invoice.source_type == "billing_instruction"
        assert invoice.source_id == ins_id
        assert invoice.account_id == test_ids["account_id"]
        assert invoice.paid_at is not None


def test_a_failed_registry_write_does_not_undo_the_charge(client, test_ids, engine, monkeypatch):
    """Bookkeeping is additive: if it breaks, the collected payment still stands."""
    from app.jobs import billing_charge_job

    ins_id = _instruction(engine, account_id=test_ids["account_id"], billing_day=15, amount=200.0)
    monkeypatch.setattr(billing_charge_job, "pay_open_invoice", lambda *a, **k: None)

    def _boom(*_a, **_k):
        raise RuntimeError("registry down")

    monkeypatch.setattr(billing_charge_job, "record_invoice_safe", _boom)

    with Session(bind=engine) as s:
        s.add(SavedCard(
            account_id=test_ids["account_id"], holder_name="Jane Doe", last4="4242",
            exp_month=12, exp_year=2030, zcredit_token="tok_ok",
        ))
        s.commit()
        ins = s.query(AccountBillingInstruction).filter_by(id=ins_id).one()

        try:
            billing_charge_job._charge_one(s, ins, date(2026, 8, 15))
        except RuntimeError:
            pass

        assert s.query(SubscriptionPayment).filter_by(billing_instruction_id=ins_id).count() == 1
