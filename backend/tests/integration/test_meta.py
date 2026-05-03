def test_meta_app_config_requires_auth(client):
    r = client.get("/api/meta/app-config")
    assert r.status_code == 401


def test_meta_app_config_member(client, h_member):
    r = client.get("/api/meta/app-config", headers=h_member)
    assert r.status_code == 200
    data = r.json()
    assert "appId" in data
