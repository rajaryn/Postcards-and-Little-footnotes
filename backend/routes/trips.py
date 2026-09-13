from flask import Blueprint, jsonify, request
import db
from services.auth_service import get_current_user, login_required
from services.r2_service import delete_r2_objects, generate_presigned_download_url

trips_bp = Blueprint("trips", __name__, url_prefix="/api/trips")


def _get_trip_members_info(trip_id: int, current_user_id: int = None):
    """Retrieve members summary and count for a trip."""
    # Fetch members from trip_members table joined with users
    sql = """
        SELECT tm.user_id, tm.role, tm.can_add_moments, tm.can_edit_moments, tm.can_delete_moments,
               u.username, u.email
        FROM trip_members tm
        JOIN users u ON tm.user_id = u.id
        WHERE tm.trip_id = %s
        ORDER BY tm.role DESC, tm.joined_at ASC
    """
    members = db.query_db(sql, (trip_id,)) or []
    
    other_member_names = []
    current_member_record = None

    for m in members:
        name = m.get("username") or (m.get("email", "").split("@")[0] if m.get("email") else "Traveler")
        if current_user_id and m["user_id"] == current_user_id:
            current_member_record = m
        else:
            other_member_names.append(name)

    is_shared = len(members) > 1

    return {
        "members": members,
        "members_count": len(members),
        "members_summary": other_member_names,
        "is_shared": is_shared,
        "current_member": current_member_record,
    }


@trips_bp.route("", methods=["GET"])
def get_trips():
    """List trips with moment count, cover photo, and shared member summary, scoped to current traveler."""
    user = get_current_user()

    if user:
        # For rajaryn28@gmail.com, demo trips (user_id IS NULL) are also available
        if user.get("email", "").strip().lower() == "rajaryn28@gmail.com":
            sql = """
                SELECT 
                    t.id, 
                    t.user_id,
                    t.name, 
                    t.start_date, 
                    t.end_date, 
                    t.created_at,
                    COUNT(m.id) AS moment_count,
                    (
                        SELECT m2.photo_key 
                        FROM moments m2 
                        WHERE m2.trip_id = t.id AND m2.photo_key IS NOT NULL AND m2.photo_key != ''
                        ORDER BY m2.created_at DESC 
                        LIMIT 1
                    ) AS cover_photo_key
                FROM trips t
                LEFT JOIN moments m ON t.id = m.trip_id
                WHERE t.user_id = %s 
                   OR t.id IN (SELECT trip_id FROM trip_members WHERE user_id = %s)
                   OR t.user_id IS NULL
                GROUP BY t.id
                ORDER BY t.created_at DESC
            """
            trips = db.query_db(sql, (user["id"], user["id"]))
        else:
            sql = """
                SELECT 
                    t.id, 
                    t.user_id,
                    t.name, 
                    t.start_date, 
                    t.end_date, 
                    t.created_at,
                    COUNT(m.id) AS moment_count,
                    (
                        SELECT m2.photo_key 
                        FROM moments m2 
                        WHERE m2.trip_id = t.id AND m2.photo_key IS NOT NULL AND m2.photo_key != ''
                        ORDER BY m2.created_at DESC 
                        LIMIT 1
                    ) AS cover_photo_key
                FROM trips t
                LEFT JOIN moments m ON t.id = m.trip_id
                WHERE t.user_id = %s 
                   OR t.id IN (SELECT trip_id FROM trip_members WHERE user_id = %s)
                GROUP BY t.id
                ORDER BY t.created_at DESC
            """
            trips = db.query_db(sql, (user["id"], user["id"]))
    else:
        # Unauthenticated guest sees demo trips
        sql = """
            SELECT 
                t.id, 
                t.user_id,
                t.name, 
                t.start_date, 
                t.end_date, 
                t.created_at,
                COUNT(m.id) AS moment_count,
                (
                    SELECT m2.photo_key 
                    FROM moments m2 
                    WHERE m2.trip_id = t.id AND m2.photo_key IS NOT NULL AND m2.photo_key != ''
                    ORDER BY m2.created_at DESC 
                    LIMIT 1
                ) AS cover_photo_key
            FROM trips t
            LEFT JOIN moments m ON t.id = m.trip_id
            WHERE t.user_id IS NULL
            GROUP BY t.id
            ORDER BY t.created_at DESC
        """
        trips = db.query_db(sql)

    current_uid = user["id"] if user else None

    for trip in trips:
        if trip.get("cover_photo_key"):
            trip["cover_photo_url"] = generate_presigned_download_url(trip["cover_photo_key"])
        else:
            trip["cover_photo_url"] = None

        # Add shared trip metadata
        info = _get_trip_members_info(trip["id"], current_uid)
        trip["members_summary"] = info["members_summary"]
        trip["members_count"] = info["members_count"]
        trip["is_shared"] = info["is_shared"]

        if user:
            if trip.get("user_id") == user["id"]:
                trip["user_role"] = "creator"
            elif info["current_member"]:
                trip["user_role"] = info["current_member"].get("role", "member")
            else:
                trip["user_role"] = "creator" if trip.get("user_id") is None else "member"
        else:
            trip["user_role"] = None

    return jsonify({"trips": trips}), 200


@trips_bp.route("", methods=["POST"])
def create_trip():
    """Create a new trip attached to current traveler."""
    user = get_current_user()
    user_id = user["id"] if user else None

    data = request.get_json(silent=True) or request.form or {}
    name_raw = data.get("name")
    name = name_raw.strip() if isinstance(name_raw, str) else ""
    start_date = data.get("start_date") or None
    end_date = data.get("end_date") or None

    if not name:
        return jsonify({"error": "Trip name is required."}), 400

    trip_id = db.execute_db(
        "INSERT INTO trips (user_id, name, start_date, end_date) VALUES (%s, %s, %s, %s)",
        (user_id, name, start_date, end_date),
    )

    if user_id:
        # Add creator to trip_members
        try:
            db.execute_db(
                """
                INSERT INTO trip_members (trip_id, user_id, role, can_add_moments, can_edit_moments, can_delete_moments)
                VALUES (%s, %s, 'creator', 1, 1, 1)
                """,
                (trip_id, user_id),
            )
        except Exception:
            pass

    trip = db.query_db("SELECT * FROM trips WHERE id = %s", (trip_id,), one=True)
    if trip:
        trip["moment_count"] = 0
        trip["members_summary"] = []
        trip["members_count"] = 1 if user_id else 0
        trip["is_shared"] = False
        trip["user_role"] = "creator" if user_id else None

    return jsonify({"trip": trip}), 201


@trips_bp.route("/<int:trip_id>", methods=["GET"])
def get_trip(trip_id: int):
    """Get single trip details including membership and permissions."""
    user = get_current_user()
    current_uid = user["id"] if user else None

    trip = db.query_db(
        """
        SELECT 
            t.id, 
            t.user_id,
            t.name, 
            t.start_date, 
            t.end_date, 
            t.created_at,
            COUNT(m.id) AS moment_count
        FROM trips t
        LEFT JOIN moments m ON t.id = m.trip_id
        WHERE t.id = %s
        GROUP BY t.id
        """,
        (trip_id,),
        one=True,
    )

    if not trip:
        return jsonify({"error": "Trip not found."}), 404

    # Access control
    info = _get_trip_members_info(trip_id, current_uid)
    is_creator = current_uid and (trip["user_id"] == current_uid)
    is_member = current_uid and (info["current_member"] is not None)
    is_demo = trip["user_id"] is None

    # Check access permission
    if not is_creator and not is_member and not is_demo:
        # Special case: rajaryn28@gmail.com can access demo trips
        if not (user and user.get("email", "").strip().lower() == "rajaryn28@gmail.com" and is_demo):
            return jsonify({"error": "You do not have access to this trip."}), 403

    trip["members_summary"] = info["members_summary"]
    trip["members_count"] = info["members_count"]
    trip["is_shared"] = info["is_shared"]

    if is_creator or is_demo:
        trip["user_role"] = "creator"
        trip["user_permissions"] = {
            "can_add_moments": True,
            "can_edit_moments": True,
            "can_delete_moments": True,
        }
    elif is_member:
        cm = info["current_member"]
        trip["user_role"] = cm.get("role", "member")
        trip["user_permissions"] = {
            "can_add_moments": bool(cm.get("can_add_moments", True)),
            "can_edit_moments": bool(cm.get("can_edit_moments", True)),
            "can_delete_moments": bool(cm.get("can_delete_moments", True)),
        }
    else:
        trip["user_role"] = None
        trip["user_permissions"] = {
            "can_add_moments": True,
            "can_edit_moments": True,
            "can_delete_moments": True,
        }

    return jsonify({"trip": trip}), 200


@trips_bp.route("/<int:trip_id>", methods=["DELETE"])
def delete_trip(trip_id: int):
    """Delete trip and all associated moments & R2 images (creator only)."""
    user = get_current_user()
    trip = db.query_db("SELECT id, user_id FROM trips WHERE id = %s", (trip_id,), one=True)
    if not trip:
        return jsonify({"error": "Trip not found."}), 404

    # Enforce creator-only deletion
    if user and trip.get("user_id") and trip["user_id"] != user["id"]:
        return jsonify({"error": "Only the trip creator can delete this trip."}), 403

    # Fetch moments with photos to delete from R2
    moments = db.query_db(
        "SELECT photo_key FROM moments WHERE trip_id = %s AND photo_key IS NOT NULL",
        (trip_id,),
    ) or []
    photo_keys = [m["photo_key"] for m in moments if m.get("photo_key")]
    if photo_keys:
        delete_r2_objects(photo_keys)

    # Delete moments, members, invitations, and trip
    db.execute_db("DELETE FROM moments WHERE trip_id = %s", (trip_id,))
    try:
        db.execute_db("DELETE FROM trip_members WHERE trip_id = %s", (trip_id,))
        db.execute_db("DELETE FROM trip_invitations WHERE trip_id = %s", (trip_id,))
    except Exception:
        pass
    db.execute_db("DELETE FROM trips WHERE id = %s", (trip_id,))

    return jsonify({"message": "Trip deleted successfully.", "id": trip_id}), 200


@trips_bp.route("/<int:trip_id>/leave", methods=["POST"])
@login_required
def leave_trip(trip_id: int):
    """Allow an ordinary member to leave the trip. Their existing moments remain with attribution."""
    user = get_current_user()
    trip = db.query_db("SELECT id, user_id FROM trips WHERE id = %s", (trip_id,), one=True)
    if not trip:
        return jsonify({"error": "Trip not found."}), 404

    # The creator cannot leave their own trip
    if trip.get("user_id") == user["id"]:
        return jsonify({"error": "As the creator, you cannot leave this trip. You can delete it instead."}), 400

    # Check if user is a member
    membership = db.query_db(
        "SELECT id FROM trip_members WHERE trip_id = %s AND user_id = %s",
        (trip_id, user["id"]),
        one=True,
    )
    if not membership:
        return jsonify({"error": "You are not a member of this trip."}), 400

    # Remove membership (moments & attribution remain intact in database)
    db.execute_db("DELETE FROM trip_members WHERE trip_id = %s AND user_id = %s", (trip_id, user["id"]))

    return jsonify({"message": "You have left the trip. Your memories remain.", "trip_id": trip_id}), 200
