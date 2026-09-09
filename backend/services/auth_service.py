import functools
import logging
from typing import Optional, Dict, Any
from flask import g, jsonify, request
from werkzeug.security import generate_password_hash, check_password_hash
from itsdangerous import URLSafeTimedSerializer, SignatureExpired, BadSignature

from config import Config
import db

logger = logging.getLogger(__name__)


def _get_serializer() -> URLSafeTimedSerializer:
    secret = Config.SECRET_KEY or "postcards-default-secret-salt"
    return URLSafeTimedSerializer(secret_key=secret, salt="postcards_auth_token")


def hash_password(password: str) -> str:
    """Securely hash user password."""
    return generate_password_hash(password)


def verify_password(password: str, password_hash: str) -> bool:
    """Verify password against hash."""
    if not password or not password_hash:
        return False
    return check_password_hash(password_hash, password)


def generate_auth_token(user_id: int, remember_me: bool = True) -> str:
    """Generate a signed time-safe auth token for client sessions."""
    s = _get_serializer()
    return s.dumps({"user_id": user_id, "remember": bool(remember_me)})


def decode_auth_token(token: str, max_age_seconds: int = 30 * 24 * 3600) -> Optional[int]:
    """
    Decode and verify signed auth token.
    Default validity: 30 days (or 1 day if remember_me is False).
    """
    if not token:
        return None
    s = _get_serializer()
    try:
        data = s.loads(token, max_age=max_age_seconds)
        if not data.get("remember", True):
            # Non-remembered tokens expire in 24 hours
            s.loads(token, max_age=24 * 3600)
        return data.get("user_id")
    except (SignatureExpired, BadSignature) as e:
        logger.debug(f"Auth token validation failed: {e}")
        return None


def get_user_by_id(user_id: int) -> Optional[Dict[str, Any]]:
    """Fetch user record from TiDB by user ID."""
    if not user_id:
        return None
    return db.query_db(
        "SELECT id, email, username, created_at FROM users WHERE id = %s",
        (user_id,),
        one=True,
    )


def get_user_by_email(email: str) -> Optional[Dict[str, Any]]:
    """Fetch user record from TiDB by email (includes password_hash for auth)."""
    if not email:
        return None
    return db.query_db(
        "SELECT id, email, username, password_hash, created_at FROM users WHERE LOWER(email) = LOWER(%s)",
        (email.strip(),),
        one=True,
    )


def get_token_from_request() -> Optional[str]:
    """Extract token from Authorization Bearer header or query param."""
    auth_header = request.headers.get("Authorization", "")
    if auth_header.startswith("Bearer "):
        return auth_header[7:].strip()
    return request.args.get("auth_token", "").strip() or None


def get_current_user() -> Optional[Dict[str, Any]]:
    """Get currently authenticated user from request context."""
    if hasattr(g, "user") and g.user is not None:
        return g.user

    token = get_token_from_request()
    if not token:
        g.user = None
        return None

    user_id = decode_auth_token(token)
    if not user_id:
        g.user = None
        return None

    user = get_user_by_id(user_id)
    g.user = user
    return user


def login_required(f):
    """Decorator to protect API routes requiring user authentication."""
    @functools.wraps(f)
    def decorated_function(*args, **kwargs):
        user = get_current_user()
        if not user:
            return jsonify({"error": "Authentication required. Please log in."}), 401
        return f(*args, **kwargs)
    return decorated_function
