"""Unit tests: JWT encode/decode (no HTTP)."""

import pytest
from jose import JWTError

from app.services.auth.jwt_service import create_access_token, decode_token


def test_create_and_decode_roundtrip():
    token = create_access_token(user_id=99, role="user")
    payload = decode_token(token)
    assert payload["sub"] == "99"
    assert payload["role"] == "user"


def test_decode_invalid_token_raises():
    with pytest.raises(JWTError):
        decode_token("not-a-valid.jwt.token")
