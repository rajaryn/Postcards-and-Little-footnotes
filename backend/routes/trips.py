from flask import Blueprint, jsonify, request
import db
from services.r2_service import delete_r2_objects

trips_bp = Blueprint("trips", __name__, url_prefix="/api/trips")


@trips_bp.route("", methods=["GET"])
def get_trips():
    """List all trips with moment count."""
    sql = """
        SELECT 
            t.id, 
            t.name, 
            t.start_date, 
            t.end_date, 
            t.created_at,
            COUNT(m.id) AS moment_count
        FROM trips t
        LEFT JOIN moments m ON t.id = m.trip_id
        GROUP BY t.id
        ORDER BY t.created_at DESC
    """
    trips = db.query_db(sql)
    return jsonify({"trips": trips}), 200


@trips_bp.route("", methods=["POST"])
def create_trip():
    """Create a new trip."""
    data = request.get_json(silent=True) or request.form or {}
    name_raw = data.get("name")
    name = name_raw.strip() if isinstance(name_raw, str) else ""
    start_date = data.get("start_date") or None
    end_date = data.get("end_date") or None

    if not name:
        return jsonify({"error": "Trip name is required."}), 400

    trip_id = db.execute_db(
        "INSERT INTO trips (name, start_date, end_date) VALUES (%s, %s, %s)",
        (name, start_date, end_date),
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
