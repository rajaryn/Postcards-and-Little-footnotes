import logging
import uuid
from pathlib import Path
from flask import Blueprint, jsonify, request
from config import Config
import db
from services.r2_service import (
    generate_presigned_upload_url,
    upload_bytes_to_r2,
    validate_image_metadata,
)

logger = logging.getLogger(__name__)
uploads_bp = Blueprint("uploads", __name__, url_prefix="/api/uploads")


@uploads_bp.route("/presign", methods=["POST"])
def presign_upload():
    """Generate a presigned PUT URL for direct browser-to-R2 upload."""
    data = request.get_json(silent=True) or request.form or {}
    trip_id = data.get("trip_id")
    filename_raw = data.get("filename")
    filename = filename_raw.strip() if isinstance(filename_raw, str) else ""
    content_type_raw = data.get("content_type")
    content_type = content_type_raw.strip() if isinstance(content_type_raw, str) else "image/jpeg"

    logger.info(f"📸 [Upload Step 1] Received presign request: trip_id={trip_id}, filename='{filename}', content_type='{content_type}'")

    if not trip_id:
        logger.warning("❌ [Upload Step 1] Missing trip_id in presign request.")
        return jsonify({"error": "trip_id is required."}), 400

    if not filename:
        logger.warning("❌ [Upload Step 1] Missing filename in presign request.")
        return jsonify({"error": "filename is required."}), 400

    # Ensure trip exists in TiDB
    trip = db.query_db("SELECT id, name FROM trips WHERE id = %s", (trip_id,), one=True)
    if not trip:
        logger.warning(f"❌ [Upload Step 1] Trip with ID {trip_id} not found in TiDB.")
        return jsonify({"error": "Trip not found."}), 404

    upload_url, photo_key, err = generate_presigned_upload_url(
        trip_id=int(trip_id),
        filename=filename,
        content_type=content_type,
    )

    if err:
        logger.error(f"❌ [Upload Step 1] Error generating presigned URL: {err}")
        return jsonify({"error": err}), 400

    logger.info(f"🔗 [Upload Step 2] Presigned PUT URL generated successfully for R2! Key='{photo_key}'")

    return jsonify({
        "upload_url": upload_url,
        "photo_key": photo_key,
    }), 200


@uploads_bp.route("/direct", methods=["POST"])
def direct_upload():
    """
    Direct multipart/form-data upload via backend to Cloudflare R2.
    Provides bulletproof reliability bypassing any browser CORS/preflight limitations.
    """
    trip_id_raw = request.form.get("trip_id")
    if not trip_id_raw:
        return jsonify({"error": "trip_id is required."}), 400

    try:
        trip_id = int(trip_id_raw)
    except (ValueError, TypeError):
        return jsonify({"error": "Invalid trip_id."}), 400

    if "file" not in request.files:
        return jsonify({"error": "No file attached."}), 400

    file = request.files["file"]
    if not file or not file.filename:
        return jsonify({"error": "Empty file provided."}), 400

    # Check trip exists
    trip = db.query_db("SELECT id, name FROM trips WHERE id = %s", (trip_id,), one=True)
    if not trip:
        return jsonify({"error": "Trip not found."}), 404

    filename = file.filename
    content_type = file.content_type or "image/jpeg"
    ext, err = validate_image_metadata(filename, content_type)
    if err:
        return jsonify({"error": err}), 400

    photo_key = f"trips/{trip_id}/moments/{uuid.uuid4().hex}.{ext}"
    data_bytes = file.read()

    logger.info(f"📸 [Upload Step 3 - Server] Streaming {len(data_bytes)} bytes directly to R2 for key: {photo_key}")
    success = upload_bytes_to_r2(data_bytes, photo_key, content_type)
    if not success:
        logger.error(f"❌ [Upload Step 3 - Server] Failed to save photo to R2: {photo_key}")
        return jsonify({"error": "Failed to upload photo to storage."}), 500

    logger.info(f"🎉 [Upload Step 3 - Server] Photo saved to R2 successfully: {photo_key}")
    return jsonify({
        "photo_key": photo_key,
        "message": "Upload successful",
    }), 201


@uploads_bp.route("/local-put", methods=["PUT"])
def local_mock_put():
    """
    Simulated direct PUT endpoint for local offline development when R2 keys are not configured.
    """
    key = request.args.get("key", "").strip()
    if not key:
        return jsonify({"error": "Missing key parameter."}), 400

    # Prevent path traversal
    if ".." in key or key.startswith("/"):
        return jsonify({"error": "Invalid key."}), 400

    target_file = Config.LOCAL_UPLOADS_FOLDER / key
    target_file.parent.mkdir(parents=True, exist_ok=True)

    # Save raw body data
    data_bytes = request.get_data()
    with open(target_file, "wb") as f:
        f.write(data_bytes)

    logger.info(f"💾 [Upload Step 3 - Local] Saved simulated photo upload ({len(data_bytes)} bytes) to {key}")
    return "", 200
