def test_checkout_requires_auth(client):
    r = client.post(
        "/api/checkout",
        json={"accountId": 1, "amount": 10.0, "currency": "ILS"},
    )
    assert r.status_code == 401


def test_checkout_zcredit_not_configured(client, h_member, test_ids):
    """Without Z-Credit env vars the stub returns 503 after membership check."""
    r = client.post(
        "/api/checkout",
        headers=h_member,
        json={
            "accountId": test_ids["account_id"],
            "amount": 99.5,
            "currency": "ILS",
            "description": "Test charge",
        },
    )
    assert r.status_code == 503
    assert r.json()["detail"] == "zcredit_not_configured"


def test_checkout_forbidden_account(client, h_member):
    r = client.post(
        "/api/checkout",
        headers=h_member,
        json={"accountId": 99999, "amount": 10.0},
    )
    assert r.status_code == 403
