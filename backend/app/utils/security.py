# app/utils/security.py

from datetime import datetime, timedelta
from typing import Dict, Any

import bcrypt       # direct bcrypt usage
import jwt

from app.config import settings

MAX_BCRYPT_LENGTH = 72


def _truncate_password(password: str) -> bytes:
    """
    bcrypt only uses the first 72 bytes. Truncate and return bytes.
    """
    if not isinstance(password, str):
        password = str(password)
    return password[:MAX_BCRYPT_LENGTH].encode("utf-8")


def hash_password(password: str) -> str:
    """
    Hash a plaintext password using bcrypt.
    Returns a UTF-8 string you can store in the DB.
    """
    pw_bytes = _truncate_password(password)
    hashed = bcrypt.hashpw(pw_bytes, bcrypt.gensalt())
    return hashed.decode("utf-8")


def verify_password(plain_password: str, hashed_password: str) -> bool:
    """
    Verify a plaintext password against a bcrypt hash.
    """
    pw_bytes = _truncate_password(plain_password)
    try:
        return bcrypt.checkpw(pw_bytes, hashed_password.encode("utf-8"))
    except ValueError:
        # If the stored hash is malformed, just fail verification
        return False


def create_access_token(
    data: Dict[str, Any],
    expires_delta: timedelta | None = None,
) -> str:
    """
    Create a JWT access token.
    """
    to_encode = data.copy()

    if expires_delta is None:
        expires_delta = timedelta(hours=12)

    expire = datetime.utcnow() + expires_delta
    to_encode.update({"exp": expire})

    encoded_jwt = jwt.encode(
        to_encode,
        settings.JWT_SECRET_KEY,
        algorithm=settings.JWT_ALGORITHM,
    )
    return encoded_jwt
