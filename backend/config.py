import os
from pathlib import Path
from dotenv import load_dotenv

# Load .env from backend/ or project root
BASE_DIR = Path(__file__).resolve().parent
if (BASE_DIR / ".env").exists():
    load_dotenv(BASE_DIR / ".env")
elif (BASE_DIR.parent / ".env").exists():
    load_dotenv(BASE_DIR.parent / ".env")
else:
    load_dotenv()


def _get_env(keys, default=""):
    """Helper to get env variable matching any of the candidate keys, stripped of outer quotes."""
    for k in keys:
        v = os.getenv(k)
        if v is not None and v != "":
            v_str = str(v).strip().strip("'\"")
            if v_str:
                return v_str
    return default


def _resolve_ca_path(ca_val: str) -> str:
    """Resolve CA certificate path if provided as relative path."""
    if not ca_val:
        return ""
    p = Path(ca_val)
    if p.is_file():
        return str(p.resolve())
    if (BASE_DIR / ca_val).is_file():
        return str((BASE_DIR / ca_val).resolve())
    if (BASE_DIR.parent / ca_val).is_file():
        return str((BASE_DIR.parent / ca_val).resolve())
    return ca_val


class Config:
    """Application configuration settings."""

    # Server Settings
    DEBUG = _get_env(["DEBUG"], "True").lower() in ("true", "1", "t")
    PORT = int(_get_env(["PORT"], "5000"))
    SECRET_KEY = _get_env(["SECRET_KEY"], "dev-secret-trip-moments-key")

    # Uploads & Allowed formats
    MAX_CONTENT_LENGTH = int(_get_env(["MAX_CONTENT_LENGTH"], str(16 * 1024 * 1024)))
    ALLOWED_EXTENSIONS = {"png", "jpg", "jpeg", "webp", "gif"}
    ALLOWED_MIME_TYPES = {
        "image/png": "png",
        "image/jpeg": "jpg",
        "image/jpg": "jpg",
        "image/webp": "webp",
        "image/gif": "gif",
    }

    # TiDB Configuration (Supports TIDB_* and DB_* variations)
    TIDB_HOST = _get_env(["TIDB_HOST", "DB_host", "DB_HOST", "tidb_host"], "127.0.0.1")
    TIDB_PORT = int(_get_env(["TIDB_PORT", "DB_port", "DB_PORT", "tidb_port"], "4000"))
    TIDB_USER = _get_env(["TIDB_USER", "DB_user", "DB_USER", "tidb_user"], "root")
    TIDB_PASSWORD = _get_env(["TIDB_PASSWORD", "DB_password", "DB_PASSWORD", "tidb_password"], "")
    _db_raw = _get_env(["TIDB_DATABASE", "DB_database", "DB_DATABASE", "tidb_database"], "trip_moments")
    TIDB_DATABASE = "trip_moments" if _db_raw == "sys" else _db_raw
    TIDB_SSL_CA = _resolve_ca_path(_get_env(["TIDB_SSL_CA", "DB_ssl_ca", "DB_SSL_CA", "tidb_ssl_ca"], ""))
    TIDB_CONNECT_TIMEOUT = int(_get_env(["TIDB_CONNECT_TIMEOUT", "DB_connect_timeout"], "15"))

    # Cloudflare R2 Configuration (Supports R2_* and Access_Key_Id/Account_Id variations)
    R2_ACCOUNT_ID = _get_env(["R2_ACCOUNT_ID", "Account_Id", "ACCOUNT_ID", "account_id"], "")
    R2_ACCESS_KEY_ID = _get_env(["R2_ACCESS_KEY_ID", "Access_Key_Id", "ACCESS_KEY_ID", "access_key_id"], "")
    R2_SECRET_ACCESS_KEY = _get_env(["R2_SECRET_ACCESS_KEY", "Secret_Access_Key", "SECRET_ACCESS_KEY", "secret_access_key"], "")
    R2_BUCKET_NAME = _get_env(["R2_BUCKET_NAME", "Bucket_name", "BUCKET_NAME", "bucket_name"], "trip-moments")
    R2_PRESIGNED_EXPIRATION = int(_get_env(["R2_PRESIGNED_EXPIRATION"], "3600"))

    # Local fallback uploads folder (used when R2 is not configured)
    LOCAL_UPLOADS_FOLDER = BASE_DIR / "uploads"

    @classmethod
    def is_r2_configured(cls) -> bool:
        """Returns True if Cloudflare R2 credentials are configured."""
        return bool(
            cls.R2_ACCOUNT_ID and cls.R2_ACCESS_KEY_ID and cls.R2_SECRET_ACCESS_KEY and cls.R2_BUCKET_NAME
        )

    @classmethod
    def r2_endpoint_url(cls) -> str:
        """Construct Cloudflare S3 API endpoint URL."""
        if cls.R2_ACCOUNT_ID:
            return f"https://{cls.R2_ACCOUNT_ID}.r2.cloudflarestorage.com"
        return ""


# Ensure local fallback upload folder exists
Config.LOCAL_UPLOADS_FOLDER.mkdir(parents=True, exist_ok=True)
