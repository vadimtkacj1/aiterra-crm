def hash_password(password: str) -> str:
    """
    Use PBKDF2-SHA256 to avoid bcrypt backend issues (72-byte limit and Windows backend quirks).
    """
    from passlib.hash import pbkdf2_sha256

    return pbkdf2_sha256.hash(password)


def verify_password(password: str, password_hash: str) -> bool:
    from passlib.hash import pbkdf2_sha256

    if password_hash.startswith("$pbkdf2-sha256$"):
        return pbkdf2_sha256.verify(password, password_hash)

    # If you have legacy bcrypt hashes, migrate them to pbkdf2_sha256.
    return False

