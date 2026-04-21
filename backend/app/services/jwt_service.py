from datetime import datetime, timedelta, timezone

from jose import jwt

from app.core.settings import settings


def create_access_token(*, user_id: int, role: str) -> str:
    now = datetime.now(timezone.utc)
    exp = now + timedelta(hours=settings.jwt_expires_hours)
    payload = {
        "sub": str(user_id),
        "role": role,
        "iss": settings.jwt_issuer,
        "iat": int(now.timestamp()),
        "exp": int(exp.timestamp()),
    }
    return jwt.encode(payload, settings.jwt_secret, algorithm="HS256")


def decode_token(token: str) -> dict:
    return jwt.decode(token, settings.jwt_secret, algorithms=["HS256"], issuer=settings.jwt_issuer)

