# Backward-compatibility shim — implementation moved to app.core.jwt
from app.core.jwt import create_access_token, decode_token  # noqa: F401
