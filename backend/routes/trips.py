from flask import Blueprint, jsonify, request
import db
from services.auth_service import get_current_user
from services.r2_service import delete_r2_objects, generate_presigned_download_url

trips_bp = Blueprint("trips", __name__, url_prefix="/api/trips")


@trips_bp.route("", methods=["GET"])
def get_trips():
    """List trips with moment count and cover photo, scoped to current traveler."""
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
                WHERE t.user_id = %s OR t.user_id IS NULL
                GROUP BY t.id
                ORDER BY t.created_at DESC
            """
            trips = db.query_db(sql, (user["id"],))
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
                GROUP BY t.id
                ORDER BY t.created_at DESC
            """
            trips = db.query_db(sql, (user["id"],))
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

    for trip in trips:
        if trip.get("cover_photo_key"):
            trip["cover_photo_url"] = generate_presigned_download_url(trip["cover_photo_key"])
        else:
            trip["cover_photo_url"] = None

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

    trip = db.query_db("SELECT * FROM trips WHERE id = %s", (trip_id,), one=True)
    if trip:
        trip["moment_count"] = 0

    return jsonify({"trip": trip}), 201


@trips_bp.route("/<int:trip_id>", methods=["GET"])
def get_trip(trip_id: int):
    """Get single trip details."""
    trip = db.query_db(
        """
        SELECT 
            t.id, 
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

    return jsonify({"trip": trip}), 200


@trips_bp.route("/<int:trip_id>", methods=["DELETE"])
def delete_trip(trip_id: int):
    """Delete trip and all associated moments & R2 images."""
    trip = db.query_db("SELECT id FROM trips WHERE id = %s", (trip_id,), one=True)
    if not trip:
        return jsonify({"error": "Trip not found."}), 404

    # Fetch moments with photos to delete from R2
    moments = db.query_db(
        "SELECT photo_key FROM moments WHERE trip_id = %s AND photo_key IS NOT NULL",
        (trip_id,),
    )
    photo_keys = [m["photo_key"] for m in moments if m.get("photo_key")]
    if photo_keys:
        delete_r2_objects(photo_keys)

    # Delete moments and trip
    db.execute_db("DELETE FROM moments WHERE trip_id = %s", (trip_id,))
    db.execute_db("DELETE FROM trips WHERE id = %s", (trip_id,))

    return jsonify({"message": "Trip deleted successfully.", "id": trip_id}), 200
