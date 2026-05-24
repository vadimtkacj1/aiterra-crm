# Backward-compatibility shim — implementation moved to app.core.security
from app.core.security import hash_password, verify_password  # noqa: F401
