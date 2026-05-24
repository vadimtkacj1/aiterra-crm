"""Authentication helpers (hashing, tokens) — moved to app.core."""
# Backward-compatibility re-exports
from app.core.security import hash_password, verify_password  # noqa: F401
from app.core.jwt import create_access_token, decode_token  # noqa: F401
