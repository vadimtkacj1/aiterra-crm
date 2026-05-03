"""Admin Statistics dashboard: GET /api/admin/stats/payments (Revenue / Invoice activity / Currency pie data source)."""


def test_payment_stats_requires_auth(client):
    r = client.get("/api/admin/stats/payments")
    assert r.status_code == 401


def test_payment_stats_forbidden_for_member(client, h_member):
    r = client.get("/api/admin/stats/payments", headers=h_member)
    assert r.status_code == 403


def test_payment_stats_ok_empty_db(client, h_admin):
    """Shape matches AdminPaymentStatsOut; seeded DB may have no billing history rows."""
    r = client.get("/api/admin/stats/payments", headers=h_admin)
    assert r.status_code == 200
    data = r.json()
    assert data["paidCount"] >= 0
    assert data["unpaidCount"] >= 0
    assert isinstance(data["availableYears"], list)
    assert isinstance(data["currencies"], list)
    assert isinstance(data["buckets"], list)


def test_payment_stats_group_by_year(client, h_admin):
    r = client.get("/api/admin/stats/payments?groupBy=year", headers=h_admin)
    assert r.status_code == 200
    data = r.json()
    assert isinstance(data["buckets"], list)
    for b in data["buckets"]:
        assert "label" in b and "paidCount" in b and "unpaidCount" in b


def test_payment_stats_date_filters(client, h_admin):
    r = client.get(
        "/api/admin/stats/payments",
        params={
            "startDate": "2020-01-01",
            "endDate": "2030-12-31",
            "groupBy": "month",
        },
        headers=h_admin,
    )
    assert r.status_code == 200
    assert "buckets" in r.json()
