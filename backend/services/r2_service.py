import logging
import os
import uuid
from pathlib import Path
from typing import List, Optional, Tuple
import boto3
import botocore
from botocore.config import Config as BotoConfig

from config import Config

logger = logging.getLogger(__name__)


def get_s3_client():
    """Create S3 client for Cloudflare R2."""
    if not Config.is_r2_configured():
        return None

    return boto3.client(
        "s3",
        endpoint_url=Config.r2_endpoint_url(),
        aws_access_key_id=Config.R2_ACCESS_KEY_ID,
        aws_secret_access_key=Config.R2_SECRET_ACCESS_KEY,
        region_name="auto",
        config=BotoConfig(signature_version="s3v4"),
    )


def validate_image_metadata(filename: str, content_type: Optional[str] = None) -> Tuple[Optional[str], Optional[str]]:
    """Validate image extension and MIME type."""
    if not filename:
        return None, "Filename is required."

    ext = filename.rsplit(".", 1)[-1].lower() if "." in filename else ""
    if ext not in Config.ALLOWED_EXTENSIONS:
        return None, f"Unsupported file extension .{ext}. Allowed: {', '.join(sorted(Config.ALLOWED_EXTENSIONS))}"

    if content_type:
        mime = content_type.lower()
        if mime not in Config.ALLOWED_MIME_TYPES and not mime.startswith("image/"):
            return None, f"Unsupported content type: {content_type}"

    return ext, None


def generate_presigned_upload_url(
    trip_id: int,
    filename: str,
    content_type: str = "image/jpeg",
    expires_in: int = 900,
) -> Tuple[Optional[str], Optional[str], Optional[str]]:
    """
    Generate a short-lived presigned PUT URL for direct browser upload.
    Returns:
        (upload_url, photo_key, error_message)
    """
    ext, err = validate_image_metadata(filename, content_type)
    if err:
        return None, None, err

    # Construct clean R2 object key: trips/<trip_id>/moments/<uuid>.<ext>
    photo_key = f"trips/{trip_id}/moments/{uuid.uuid4().hex}.{ext}"

    if Config.is_r2_configured():
        try:
            s3 = get_s3_client()
            upload_url = s3.generate_presigned_url(
                ClientMethod="put_object",
                Params={
                    "Bucket": Config.R2_BUCKET_NAME,
                    "Key": photo_key,
                    "ContentType": content_type,
                },
                ExpiresIn=expires_in,
            )
            return upload_url, photo_key, None
        except Exception as e:
            logger.error(f"Failed to generate R2 presigned PUT URL: {e}")
            return None, None, f"Failed to generate upload URL: {str(e)}"
    else:
        # Local development simulated upload URL
        upload_url = f"/api/uploads/local-put?key={photo_key}"
        return upload_url, photo_key, None


def upload_bytes_to_r2(
    data: bytes,
    photo_key: str,
    content_type: str = "image/jpeg",
) -> bool:
    """
    Upload raw binary data directly to Cloudflare R2 or local storage from backend.
    """
    if not photo_key or not data:
        return False

    if Config.is_r2_configured():
        try:
            s3 = get_s3_client()
            s3.put_object(
                Bucket=Config.R2_BUCKET_NAME,
                Key=photo_key,
                Body=data,
                ContentType=content_type,
            )
            logger.info(f"Successfully uploaded {len(data)} bytes directly to R2: {photo_key}")
            return True
        except Exception as e:
            logger.error(f"Failed to upload bytes to R2 ({photo_key}): {e}")
            return False
    else:
        try:
            target_path = Config.LOCAL_UPLOADS_FOLDER / photo_key
            target_path.parent.mkdir(parents=True, exist_ok=True)
            with open(target_path, "wb") as f:
                f.write(data)
            logger.info(f"Saved {len(data)} bytes to local fallback: {photo_key}")
            return True
        except Exception as e:
            logger.error(f"Failed to save bytes locally ({photo_key}): {e}")
            return False


def generate_presigned_download_url(
    photo_key: Optional[str],
    expires_in: int = None,
) -> Optional[str]:
    """
    Generate a temporary presigned GET URL for displaying a private R2 image.
    """
    if not photo_key:
        return None

    if expires_in is None:
        expires_in = Config.R2_PRESIGNED_EXPIRATION

    if Config.is_r2_configured():
        try:
            s3 = get_s3_client()
            return s3.generate_presigned_url(
                ClientMethod="get_object",
                Params={
                    "Bucket": Config.R2_BUCKET_NAME,
                    "Key": photo_key,
                },
                ExpiresIn=expires_in,
            )
        except Exception as e:
            logger.error(f"Failed to generate R2 presigned GET URL for {photo_key}: {e}")
            return None
    else:
        # Local development fallback
        return f"/uploads/{photo_key}"


def delete_r2_object(photo_key: Optional[str]) -> bool:
    """Delete a single object from Cloudflare R2 or local fallback storage."""
    if not photo_key:
        return False

    if Config.is_r2_configured():
        try:
            s3 = get_s3_client()
            s3.delete_object(Bucket=Config.R2_BUCKET_NAME, Key=photo_key)
            return True
        except Exception as e:
            logger.error(f"Failed to delete R2 object {photo_key}: {e}")
            return False
    else:
        target_path = Config.LOCAL_UPLOADS_FOLDER / photo_key
        if target_path.exists() and target_path.is_file():
            try:
                target_path.unlink()
                return True
            except OSError:
                return False
        return False


def delete_r2_objects(photo_keys: List[str]) -> None:
    """Batch delete objects from Cloudflare R2 or local fallback storage."""
    valid_keys = [k for k in photo_keys if k]
    if not valid_keys:
        return

    if Config.is_r2_configured():
        try:
            s3 = get_s3_client()
            # S3 delete_objects takes batches of up to 1000
            for i in range(0, len(valid_keys), 1000):
                batch = valid_keys[i : i + 1000]
                delete_dict = {"Objects": [{"Key": k} for k in batch]}
                s3.delete_objects(Bucket=Config.R2_BUCKET_NAME, Delete=delete_dict)
        except Exception as e:
            logger.error(f"Failed batch delete on R2: {e}")
    else:
        for k in valid_keys:
            delete_r2_object(k)
