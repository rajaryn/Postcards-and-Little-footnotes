import os
import uuid
from pathlib import Path
from typing import Optional, Tuple
from PIL import Image, ImageOps
from werkzeug.datastructures import FileStorage
from config import Config


def validate_and_save_image(file_storage: FileStorage) -> Tuple[Optional[str], Optional[str]]:
    """
    Validates uploaded image and saves it with a unique filename.
    Returns:
        (saved_filename, error_message)
    """
    if not file_storage or not file_storage.filename:
        return None, "No image file provided."

    # Check extension
    orig_name = file_storage.filename
    ext = orig_name.rsplit(".", 1)[-1].lower() if "." in orig_name else ""
    if ext not in Config.ALLOWED_EXTENSIONS:
        return None, f"Unsupported image format .{ext}. Allowed formats: {', '.join(sorted(Config.ALLOWED_EXTENSIONS))}"

    # Generate unique safe filename
    safe_filename = f"{uuid.uuid4().hex}.{ext}"
    target_path = Config.UPLOAD_FOLDER / safe_filename

    try:
        # Verify file is an actual valid image using Pillow
        image = Image.open(file_storage.stream)
        image.verify()  # Verifies file integrity

        # Re-open stream for saving because verify() modifies file pointer
        file_storage.stream.seek(0)
        image = Image.open(file_storage.stream)

        # Transpose image based on EXIF orientation if present
        image = ImageOps.exif_transpose(image)

        # Resize if exceptionally large (e.g. max width/height 2560px for fast mobile display)
        max_dim = 2560
        if image.width > max_dim or image.height > max_dim:
            image.thumbnail((max_dim, max_dim), Image.Resampling.LANCZOS)

        # Save normalized image
        if ext in ("jpg", "jpeg"):
            image.save(target_path, format="JPEG", quality=85, optimize=True)
        elif ext == "webp":
            image.save(target_path, format="WEBP", quality=85)
        elif ext == "png":
            image.save(target_path, format="PNG", optimize=True)
        else:
            image.save(target_path)

        return safe_filename, None

    except Exception as e:
        # Clean up if partially created
        if target_path.exists():
            target_path.unlink()
        return None, f"Invalid or corrupted image file: {str(e)}"


def delete_image_file(filename: Optional[str]) -> bool:
    """Deletes image file from disk if it exists."""
    if not filename:
        return False
    # Avoid path traversal
    safe_name = os.path.basename(filename)
    target_path = Config.UPLOAD_FOLDER / safe_name
    if target_path.exists() and target_path.is_file():
        try:
            target_path.unlink()
            return True
        except OSError:
            return False
    return False
