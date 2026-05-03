def test_accounts_require_auth(client):
    r = client.get("/api/accounts")
    assert r.status_code == 401


def test_accounts_list_member(client, h_member, test_ids):
    r = client.get("/api/accounts", headers=h_member)
    assert r.status_code == 200
    rows = r.json()
    assert len(rows) == 1
    assert rows[0]["id"] == test_ids["account_id"]
    assert rows[0]["name"] == "Biz One"


def test_billing_overview_member(client, h_member, test_ids):
    r = client.get(
        f"/api/accounts/{test_ids['account_id']}/billing/overview",
        headers=h_member,
    )
    assert r.status_code == 200
    data = r.json()
    assert "payments" in data
    assert "subscriptions" in data
    assert data.get("pendingPayments") in (None, [])


def test_contract_acceptance_success(client, h_member, test_ids):
    sig = "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg=="
    r = client.post(
        f"/api/accounts/{test_ids['account_id']}/billing/contract-acceptance",
        headers=h_member,
        json={"paymentActionId": "pay_test_1", "signaturePngBase64": sig},
    )
    assert r.status_code == 200
    body = r.json()
    assert body["id"] >= 1
    assert "createdAt" in body


def test_contract_acceptance_short_signature(client, h_member, test_ids):
    r = client.post(
        f"/api/accounts/{test_ids['account_id']}/billing/contract-acceptance",
        headers=h_member,
        json={"paymentActionId": "pay_test_2", "signaturePngBase64": "abcd"},
    )
    assert r.status_code == 422  # pydantic min_length before handler


def test_contract_acceptance_forbidden_wrong_account(client, h_member):
    r = client.post(
        "/api/accounts/99999/billing/contract-acceptance",
        headers=h_member,
        json={
            "paymentActionId": "x",
            "signaturePngBase64": "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==",
        },
    )
    assert r.status_code == 403


def test_saved_card_get_member(client, h_member, test_ids):
    r = client.get(
        f"/api/accounts/{test_ids['account_id']}/billing/card",
        headers=h_member,
    )
    assert r.status_code == 200
    assert r.json() is None
