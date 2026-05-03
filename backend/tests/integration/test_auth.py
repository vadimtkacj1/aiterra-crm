def test_login_success_member(client):
    r = client.post(
        "/api/auth/login",
        json={"email": "member@test.local", "password": "secretmember"},
    )
    assert r.status_code == 200
    data = r.json()
    assert "accessToken" in data
    assert data["user"]["email"] == "member@test.local"
    assert data["user"]["role"] == "user"


def test_login_invalid_password(client):
    r = client.post(
        "/api/auth/login",
        json={"email": "member@test.local", "password": "wrong"},
    )
    assert r.status_code == 401


def test_login_unknown_user(client):
    r = client.post(
        "/api/auth/login",
        json={"email": "nobody@test.local", "password": "x"},
    )
    assert r.status_code == 401


def test_change_password_success(client, h_member):
    r = client.post(
        "/api/auth/change-password",
        headers=h_member,
        json={"currentPassword": "secretmember", "newPassword": "newpass999"},
    )
    assert r.status_code == 200
    assert r.json() == {"ok": True}

    r2 = client.post(
        "/api/auth/login",
        json={"email": "member@test.local", "password": "newpass999"},
    )
    assert r2.status_code == 200


def test_change_password_wrong_current(client, h_member):
    r = client.post(
        "/api/auth/change-password",
        headers=h_member,
        json={"currentPassword": "bad", "newPassword": "otherpass12"},
    )
    assert r.status_code == 400
