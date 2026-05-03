def test_admin_stats_requires_auth(client):
    r = client.get("/api/admin/stats")
    assert r.status_code == 401


def test_admin_stats_ok(client, h_admin):
    r = client.get("/api/admin/stats", headers=h_admin)
    assert r.status_code == 200
    data = r.json()
    assert "usersTotal" in data
    assert "accountsTotal" in data


def test_admin_stats_forbidden_for_member(client, h_member):
    r = client.get("/api/admin/stats", headers=h_member)
    assert r.status_code == 403


def test_admin_users_list(client, h_admin):
    r = client.get("/api/admin/users", headers=h_admin)
    assert r.status_code == 200
    users = r.json()
    emails = {u["email"] for u in users}
    assert "admin@test.local" in emails
    assert "member@test.local" in emails


def test_admin_accounts_list(client, h_admin):
    r = client.get("/api/admin/accounts", headers=h_admin)
    assert r.status_code == 200
    assert isinstance(r.json(), list)


def test_admin_export_users_csv(client, h_admin):
    r = client.get("/api/admin/export/users.csv", headers=h_admin)
    assert r.status_code == 200
    assert "text/csv" in r.headers.get("content-type", "")
    body = r.text
    assert "email" in body.lower() or "admin@test.local" in body


def test_admin_export_billing_history_csv(client, h_admin):
    r = client.get("/api/admin/export/billing-history.csv", headers=h_admin)
    assert r.status_code == 200
    assert "text/csv" in r.headers.get("content-type", "")
    assert "historyId" in r.text
