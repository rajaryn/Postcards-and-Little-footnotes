import logging
import re
from flask import Blueprint, jsonify, request, g
import db
from services.auth_service import (
    hash_password,
    verify_password,
    generate_auth_token,
    get_user_by_email,
    get_current_user,
    login_required,
)

logger = logging.getLogger(__name__)
auth_bp = Blueprint("auth", __name__, url_prefix="/api/auth")

EMAIL_REGEX = re.compile(r"^[^@\s]+@[^@\s]+\.[^@\s]+$")


@auth_bp.route("/register", methods=["POST"])
def register():
    """Register a new traveler account."""
    data = request.get_json(silent=True) or request.form or {}
    email_raw = data.get("email")
    email = str(email_raw).strip().lower() if email_raw else ""
    password = str(data.get("password") or "")
    username_raw = data.get("username")
    username = str(username_raw).strip() if username_raw else None

    logger.info(f"👤 [Auth] Registration request for: '{email}'")

    if not email or not EMAIL_REGEX.match(email):
        return jsonify({"error": "Please provide a valid email address."}), 400

    if not password or len(password) < 6:
        return jsonify({"error": "Password must be at least 6 characters long."}), 400

    # Check if email is already taken
    existing_user = get_user_by_email(email)
    if existing_user:
        logger.warning(f"❌ [Auth] Email '{email}' is already registered.")
        return jsonify({"error": "An account with this email already exists. Please log in."}), 409

    # Hash password and insert
    pwd_hash = hash_password(password)
    user_id = db.execute_db(
        "INSERT INTO users (email, username, password_hash) VALUES (%s, %s, %s)",
        (email, username, pwd_hash),
    )

    remember_me = bool(data.get("remember_me", True))
    token = generate_auth_token(user_id, remember_me=remember_me)
    user = {
        "id": user_id,
        "email": email,
        "username": username,
    }

    logger.info(f"🎉 [Auth] User account created successfully! user_id={user_id}, email='{email}'")
    return jsonify({
        "message": "Welcome to Postcards & Little Footnotes.",
        "user": user,
        "token": token,
    }), 201


@auth_bp.route("/login", methods=["POST"])
def login():
    """Authenticate existing traveler."""
    data = request.get_json(silent=True) or request.form or {}
    email_raw = data.get("email")
    email = str(email_raw).strip().lower() if email_raw else ""
    password = str(data.get("password") or "")

    logger.info(f"🔑 [Auth] Login attempt for: '{email}'")

    if not email or not password:
        return jsonify({"error": "Email and password are required."}), 400

    user_record = get_user_by_email(email)
    if not user_record or not verify_password(password, user_record.get("password_hash")):
        logger.warning(f"❌ [Auth] Failed login attempt for: '{email}'")
        return jsonify({"error": "Invalid email or password."}), 401

    remember_me = bool(data.get("remember_me", True))
    token = generate_auth_token(user_record["id"], remember_me=remember_me)
    user = {
        "id": user_record["id"],
        "email": user_record["email"],
        "username": user_record.get("username"),
        "created_at": user_record.get("created_at"),
    }

    logger.info(f"✅ [Auth] Login successful for user_id={user_record['id']} ('{email}')")
    return jsonify({
        "message": "Welcome back.",
        "user": user,
        "token": token,
    }), 200


@auth_bp.route("/me", methods=["GET"])
@login_required
def get_me():
    """Get profile of currently logged-in user."""
    return jsonify({"user": g.user}), 200


@auth_bp.route("/logout", methods=["POST"])
def logout():
    """Stateless client logout."""
    return jsonify({"message": "Logged out successfully."}), 200


@auth_bp.route("/account", methods=["DELETE"])
@login_required
def delete_account():
    """Permanently delete traveler account, associated trips, moments, and R2 photos."""
    user_id = g.user["id"]
    email = g.user["email"]
    logger.info(f"⚠️ [Auth] Delete account requested for user_id={user_id} ('{email}')")

    # 1. Fetch all trips for this user
    user_trips = db.query_db("SELECT id FROM trips WHERE user_id = %s", (user_id,)) or []
    trip_ids = [t["id"] for t in user_trips]

    if trip_ids:
        # 2. Fetch moments with photos to delete from R2
        format_strings = ",".join(["%s"] * len(trip_ids))
        moments_with_photos = db.query_db(
            f"SELECT photo_key FROM moments WHERE trip_id IN ({format_strings}) AND photo_key IS NOT NULL",
            tuple(trip_ids),
        ) or []
        photo_keys = [m["photo_key"] for m in moments_with_photos if m.get("photo_key")]
        if photo_keys:
            from services.r2_service import delete_r2_objects
            logger.info(f"🗑️ [Auth Account Delete] Deleting {len(photo_keys)} photos from R2 for user_id={user_id}")
            delete_r2_objects(photo_keys)

        # 3. Delete moments for user's trips
        db.execute_db(f"DELETE FROM moments WHERE trip_id IN ({format_strings})", tuple(trip_ids))

        # 4. Delete trips for user
        db.execute_db("DELETE FROM trips WHERE user_id = %s", (user_id,))

    # 5. Delete user record
    db.execute_db("DELETE FROM users WHERE id = %s", (user_id,))
    logger.info(f"✅ [Auth] Account user_id={user_id} ('{email}') successfully deleted.")

    return jsonify({"message": "Account and all associated journey archives have been deleted."}), 200
