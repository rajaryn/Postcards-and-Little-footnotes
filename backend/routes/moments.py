import logging
from flask import Blueprint, jsonify, request
import db
from services.auth_service import get_current_user
from services.r2_service import generate_presigned_download_url, delete_r2_object

logger = logging.getLogger(__name__)
moments_bp = Blueprint("moments", __name__, url_prefix="/api")


def _format_datetime_for_db(dt_str):
    """Normalize datetime strings like '2026-09-08T14:30' or '2026-09-08' into '2026-09-08 14:30:00'."""
    if not dt_str:
        return None
    dt_str = str(dt_str).strip()
    if not dt_str:
        return None
    dt_clean = dt_str.replace("T", " ")
    if len(dt_clean) == 10:  # YYYY-MM-DD
        dt_clean += " 12:00:00"
    elif len(dt_clean) == 16:  # YYYY-MM-DD HH:MM
        dt_clean += ":00"
    return dt_clean


def _check_moment_permission(trip_id: int, user: dict, action: str):
    """Check if user has permission for action ('add', 'delete') on a trip's moments."""
    if not user:
        # Unauthenticated guest on demo trip
        return True, None

    trip = db.query_db("SELECT id, user_id FROM trips WHERE id = %s", (trip_id,), one=True)
    if not trip:
        return False, ("Trip not found.", 404)

    # Trip creator has all permissions
    if trip.get("user_id") == user["id"] or trip.get("user_id") is None:
        return True, None

    # Check trip_members
    membership = db.query_db(
        "SELECT * FROM trip_members WHERE trip_id = %s AND user_id = %s",
        (trip_id, user["id"]),
        one=True,
    )
    if not membership:
        return False, ("You do not have access to this trip.", 403)

    if action == "add" and not membership.get("can_add_moments", True):
        return False, ("You do not have permission to add moments to this trip.", 403)
    if action == "delete" and not membership.get("can_delete_moments", True):
        return False, ("You do not have permission to delete moments from this trip.", 403)

    return True, None


@moments_bp.route("/trips/<int:trip_id>/moments", methods=["GET"])
def get_trip_moments(trip_id: int):
    """List moments for a specific trip in chronological order with presigned photo URLs and author attribution."""
    user = get_current_user()
    current_uid = user["id"] if user else None

    trip = db.query_db("SELECT id, name, user_id FROM trips WHERE id = %s", (trip_id,), one=True)
    if not trip:
        logger.warning(f"❌ [Moments] Trip ID {trip_id} not found.")
        return jsonify({"error": "Trip not found."}), 404

    moments = db.query_db(
        """
        SELECT 
            m.id, 
            m.trip_id, 
            m.user_id,
            m.author_name,
            m.caption, 
            m.photo_key, 
            m.created_at, 
            m.latitude, 
            m.longitude,
            u.username AS current_username,
            u.email AS current_user_email
        FROM moments m
        LEFT JOIN users u ON m.user_id = u.id
        WHERE m.trip_id = %s 
        ORDER BY m.created_at ASC, m.id ASC
        """,
        (trip_id,),
    ) or []

    # Attach presigned download URLs and resolved author attribution
    for m in moments:
        if m.get("photo_key"):
            m["photo_url"] = generate_presigned_download_url(m["photo_key"])
        else:
            m["photo_url"] = None

        # Resolve author name: snapshot in author_name, fallback to username or email prefix
        if not m.get("author_name"):
            if m.get("current_username"):
                m["author_name"] = m["current_username"]
            elif m.get("current_user_email"):
                m["author_name"] = m["current_user_email"].split("@")[0]

        # Flag if current viewer is the author
        m["is_own_moment"] = bool(current_uid and m.get("user_id") == current_uid)

    logger.info(f"📖 [Moments] Retrieved {len(moments)} moments for trip_id={trip_id} ('{trip['name']}')")
    return jsonify({"moments": moments}), 200


@moments_bp.route("/trips/<int:trip_id>/moments", methods=["POST"])
def create_moment(trip_id: int):
    """Create a moment for a trip with optional photo_key, caption, custom date, and automatic author attribution."""
    user = get_current_user()
    allowed, err = _check_moment_permission(trip_id, user, "add")
    if not allowed:
        return jsonify({"error": err[0]}), err[1]

    data = request.get_json(silent=True) or request.form or {}
    caption_raw = data.get("caption")
    caption = caption_raw.strip() if isinstance(caption_raw, str) else ""

    photo_key_raw = data.get("photo_key")
    photo_key = photo_key_raw.strip() if isinstance(photo_key_raw, str) else ""

    created_at = _format_datetime_for_db(data.get("created_at")) if data else None

    logger.info(f"📝 [Moment Step 4 - TiDB Insert] Received moment creation request: trip_id={trip_id}, photo_key='{photo_key}', caption='{caption[:50]}', created_at='{created_at}'")

    # A moment requires at least one of photo_key or non-empty caption
    if not photo_key and not caption:
        logger.warning("❌ [Moment Step 4] Rejected empty moment (both photo_key and caption missing).")
        return jsonify({"error": "A moment must have a photo, a caption, or both."}), 400

    latitude = data.get("latitude") or None
    longitude = data.get("longitude") or None
    user_id = user["id"] if user else None
    author_name = None
    if user:
        author_name = user.get("username") or user.get("email", "").split("@")[0]

    if created_at:
        moment_id = db.execute_db(
            """
            INSERT INTO moments (trip_id, user_id, author_name, caption, photo_key, latitude, longitude, created_at)
            VALUES (%s, %s, %s, %s, %s, %s, %s, %s)
            """,
            (
                trip_id,
                user_id,
                author_name,
                caption if caption else None,
                photo_key if photo_key else None,
                latitude,
                longitude,
                created_at,
            ),
        )
    else:
        moment_id = db.execute_db(
            """
            INSERT INTO moments (trip_id, user_id, author_name, caption, photo_key, latitude, longitude)
            VALUES (%s, %s, %s, %s, %s, %s, %s)
            """,
            (
                trip_id,
                user_id,
                author_name,
                caption if caption else None,
                photo_key if photo_key else None,
                latitude,
                longitude,
            ),
        )

    moment = db.query_db("SELECT * FROM moments WHERE id = %s", (moment_id,), one=True)
    if moment:
        moment["photo_url"] = generate_presigned_download_url(moment.get("photo_key"))
        moment["is_own_moment"] = True

    logger.info(f"✅ [Moment Step 4 - TiDB Success] Moment successfully saved in TiDB! moment_id={moment_id}, trip_id={trip_id}, created_at='{moment.get('created_at')}'")

    return jsonify({"moment": moment}), 201


@moments_bp.route("/moments/<int:moment_id>", methods=["DELETE"])
def delete_moment(moment_id: int):
    """Delete a single moment and its photo from R2 with permission checks."""
    user = get_current_user()
    moment = db.query_db("SELECT id, trip_id, user_id, photo_key FROM moments WHERE id = %s", (moment_id,), one=True)
    if not moment:
        logger.warning(f"❌ [Moment Delete] Moment ID {moment_id} not found in TiDB.")
        return jsonify({"error": "Moment not found."}), 404

    # Permission check
    trip = db.query_db("SELECT id, user_id FROM trips WHERE id = %s", (moment["trip_id"],), one=True)
    if user and trip:
        is_creator = trip.get("user_id") == user["id"] or trip.get("user_id") is None
        is_author = moment.get("user_id") == user["id"]
        if not is_creator and not is_author:
            return jsonify({"error": "You can only delete your own moments."}), 403

        if not is_creator and is_author:
            allowed, err = _check_moment_permission(moment["trip_id"], user, "delete")
            if not allowed:
                return jsonify({"error": err[0]}), err[1]

    # Delete from R2 object store if key exists
    if moment.get("photo_key"):
        logger.info(f"🗑️ [R2 Delete] Deleting photo from Cloudflare R2: key='{moment['photo_key']}'")
        delete_r2_object(moment["photo_key"])

    db.execute_db("DELETE FROM moments WHERE id = %s", (moment_id,))
    logger.info(f"🗑️ [TiDB Delete] Deleted moment record ID {moment_id} from TiDB.")

    return jsonify({"message": "Moment deleted successfully.", "id": moment_id}), 200


@moments_bp.route("/moments/<int:moment_id>/photo", methods=["DELETE"])
def delete_moment_photo(moment_id: int):
    """Delete only the photo from a moment with permission checks."""
    user = get_current_user()
    moment = db.query_db("SELECT id, trip_id, user_id, photo_key, caption FROM moments WHERE id = %s", (moment_id,), one=True)
    if not moment:
        logger.warning(f"❌ [Photo Delete] Moment ID {moment_id} not found in TiDB.")
        return jsonify({"error": "Moment not found."}), 404

    if not moment.get("photo_key"):
        return jsonify({"error": "This moment has no photo attached."}), 400

    # Permission check
    trip = db.query_db("SELECT id, user_id FROM trips WHERE id = %s", (moment["trip_id"],), one=True)
    if user and trip:
        is_creator = trip.get("user_id") == user["id"] or trip.get("user_id") is None
        is_author = moment.get("user_id") == user["id"]
        if not is_creator and not is_author:
            return jsonify({"error": "You can only delete your own moments."}), 403

        if not is_creator and is_author:
            allowed, err = _check_moment_permission(moment["trip_id"], user, "delete")
            if not allowed:
                return jsonify({"error": err[0]}), err[1]

    # Delete from R2 object store
    logger.info(f"🗑️ [R2 Delete Photo] Deleting photo from Cloudflare R2: key='{moment['photo_key']}'")
    delete_r2_object(moment["photo_key"])

    has_caption = bool(moment.get("caption") and str(moment["caption"]).strip())
    if has_caption:
        # Update moment to remove photo_key
        db.execute_db("UPDATE moments SET photo_key = NULL WHERE id = %s", (moment_id,))
        updated_moment = db.query_db("SELECT * FROM moments WHERE id = %s", (moment_id,), one=True)
        return jsonify({
            "message": "Photo deleted from moment.",
            "moment": updated_moment,
            "deleted_entire_moment": False,
        }), 200
    else:
        # Moment had only a photo and no caption, delete entire moment record
        db.execute_db("DELETE FROM moments WHERE id = %s", (moment_id,))
        return jsonify({
            "message": "Photo and moment deleted.",
            "id": moment_id,
            "deleted_entire_moment": True,
        }), 200


@moments_bp.route("/moments/<int:moment_id>/footnote", methods=["DELETE"])
def delete_moment_footnote(moment_id: int):
    """Delete only the footnote / caption from a moment with permission checks."""
    user = get_current_user()
    moment = db.query_db("SELECT id, trip_id, user_id, photo_key, caption FROM moments WHERE id = %s", (moment_id,), one=True)
    if not moment:
        logger.warning(f"❌ [Footnote Delete] Moment ID {moment_id} not found in TiDB.")
        return jsonify({"error": "Moment not found."}), 404

    if not moment.get("caption") or not str(moment["caption"]).strip():
        return jsonify({"error": "This moment has no footnote attached."}), 400

    # Permission check
    trip = db.query_db("SELECT id, user_id FROM trips WHERE id = %s", (moment["trip_id"],), one=True)
    if user and trip:
        is_creator = trip.get("user_id") == user["id"] or trip.get("user_id") is None
        is_author = moment.get("user_id") == user["id"]
        if not is_creator and not is_author:
            return jsonify({"error": "You can only delete your own moments."}), 403

        if not is_creator and is_author:
            allowed, err = _check_moment_permission(moment["trip_id"], user, "delete")
            if not allowed:
                return jsonify({"error": err[0]}), err[1]

    has_photo = bool(moment.get("photo_key"))
    if has_photo:
        # Clear caption on the moment
        db.execute_db("UPDATE moments SET caption = NULL WHERE id = %s", (moment_id,))
        updated_moment = db.query_db("SELECT * FROM moments WHERE id = %s", (moment_id,), one=True)
        if updated_moment:
            updated_moment["photo_url"] = generate_presigned_download_url(updated_moment.get("photo_key"))
        return jsonify({
            "message": "Footnote deleted from postcard.",
            "moment": updated_moment,
            "deleted_entire_moment": False,
        }), 200
    else:
        # Text-only footnote moment, delete the whole moment record
        db.execute_db("DELETE FROM moments WHERE id = %s", (moment_id,))
        return jsonify({
            "message": "Footnote deleted.",
            "id": moment_id,
            "deleted_entire_moment": True,
        }), 200

