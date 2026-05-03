"""Unit tests: password hashing (no DB)."""

from app.services.auth.security import hash_password, verify_password


def test_hash_and_verify_roundtrip():
    h = hash_password("MySecure_Passw0rd!")
    assert verify_password("MySecure_Passw0rd!", h) is True


def test_verify_password_wrong():
    h = hash_password("secret")
    assert verify_password("other", h) is False


def test_verify_legacy_non_pbkdf2_returns_false():
    assert verify_password("x", "$2b$04$invalidbcrypt") is False
