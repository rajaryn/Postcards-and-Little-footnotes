import logging
import secrets
from datetime import datetime, timedelta
from flask import Blueprint, jsonify, request, g
import db
from services.auth_service import get_current_user, login_required
from services.email_service import email_service

logger = logging.getLogger(__name__)
sharing_bp = Blueprint("sharing", __name__, url_prefix="/api")


def _is_trip_creator(trip_id: int, user_id: int) -> bool:
    """Check if the given user is the creator of the trip."""
    if not user_id:
        return False
    trip = db.query_db("SELECT id, user_id FROM trips WHERE id = %s", (trip_id,), one=True)
    if not trip:
        return False
    return trip.get("user_id") == user_id


def _is_trip_member(trip_id: int, user_id: int) -> bool:
    """Check if the given user is a member or creator of the trip."""
    if not user_id:
        return False
    if _is_trip_creator(trip_id, user_id):
        return True
    member = db.query_db(
        "SELECT id FROM trip_members WHERE trip_id = %s AND user_id = %s",
        (trip_id, user_id),
        one=True,
    )
    return member is not None


# ==============================================================================
# 1. Members Management
# ==============================================================================

@sharing_bp.route("/trips/<int:trip_id>/members", methods=["GET"])
@login_required
def get_trip_members(trip_id: int):
    """List all people who are part of this trip (creator + members)."""
    user = g.user
    if not _is_trip_member(trip_id, user["id"]):
        return jsonify({"error": "You do not have access to this trip's people."}), 403

    trip = db.query_db("SELECT id, user_id, name FROM trips WHERE id = %s", (trip_id,), one=True)
    if not trip:
        return jsonify({"error": "Trip not found."}), 404

    # Query all members joined with users table
    sql = """
        SELECT 
            tm.id AS membership_id,
            tm.trip_id,
            tm.user_id,
            tm.role,
            tm.can_add_moments,
            tm.can_edit_moments,
            tm.can_delete_moments,
            tm.joined_at,
            u.username,
            u.email
        FROM trip_members tm
        JOIN users u ON tm.user_id = u.id
        WHERE tm.trip_id = %s
        ORDER BY tm.role DESC, tm.joined_at ASC
    """
    raw_members = db.query_db(sql, (trip_id,)) or []

    members = []
    for m in raw_members:
        display_name = m.get("username") or (m.get("email", "").split("@")[0] if m.get("email") else "Traveler")
        members.append({
            "membership_id": m["membership_id"],
            "user_id": m["user_id"],
            "name": display_name,
            "email": m["email"],
            "role": m["role"],
            "can_add_moments": bool(m["can_add_moments"]),
            "can_edit_moments": bool(m["can_edit_moments"]),
            "can_delete_moments": bool(m["can_delete_moments"]),
            "joined_at": m["joined_at"],
            "is_current_user": m["user_id"] == user["id"],
        })

    is_creator = trip.get("user_id") == user["id"]

    return jsonify({
        "trip_id": trip_id,
        "trip_name": trip["name"],
        "is_creator": is_creator,
        "members": members,
    }), 200


@sharing_bp.route("/trips/<int:trip_id>/members/<int:member_user_id>", methods=["PATCH"])
@login_required
def update_member_permissions(trip_id: int, member_user_id: int):
    """Update permissions for a trip member (creator only)."""
    user = g.user
    if not _is_trip_creator(trip_id, user["id"]):
        return jsonify({"error": "Only the trip creator can modify member permissions."}), 403

    if member_user_id == user["id"]:
        return jsonify({"error": "You cannot alter your own creator permissions."}), 400

    member = db.query_db(
        "SELECT * FROM trip_members WHERE trip_id = %s AND user_id = %s",
        (trip_id, member_user_id),
        one=True,
    )
    if not member:
        return jsonify({"error": "Member not found in this trip."}), 404

    data = request.get_json(silent=True) or {}
    can_add = data.get("can_add_moments")
    can_edit = data.get("can_edit_moments")
    can_delete = data.get("can_delete_moments")

    update_fields = []
    params = []

    if can_add is not None:
        update_fields.append("can_add_moments = %s")
        params.append(1 if can_add else 0)
    if can_edit is not None:
        update_fields.append("can_edit_moments = %s")
        params.append(1 if can_edit else 0)
    if can_delete is not None:
        update_fields.append("can_delete_moments = %s")
        params.append(1 if can_delete else 0)

    if not update_fields:
        return jsonify({"error": "No permission updates provided."}), 400

    params.extend([trip_id, member_user_id])
    db.execute_db(
        f"UPDATE trip_members SET {', '.join(update_fields)} WHERE trip_id = %s AND user_id = %s",
        tuple(params),
    )

    updated = db.query_db(
        "SELECT * FROM trip_members WHERE trip_id = %s AND user_id = %s",
        (trip_id, member_user_id),
        one=True,
    )

    logger.info(f"🛡️ [Permissions] Updated permissions for user {member_user_id} on trip {trip_id}: add={updated.get('can_add_moments')}, edit={updated.get('can_edit_moments')}, del={updated.get('can_delete_moments')}")
    return jsonify({"message": "Permissions updated.", "member": updated}), 200


@sharing_bp.route("/trips/<int:trip_id>/members/<int:member_user_id>", methods=["DELETE"])
@login_required
def remove_trip_member(trip_id: int, member_user_id: int):
    """Remove a member from the trip (creator only). Their existing memories remain."""
    user = g.user
    if not _is_trip_creator(trip_id, user["id"]):
        return jsonify({"error": "Only the trip creator can remove members."}), 403

    if member_user_id == user["id"]:
        return jsonify({"error": "As creator, you cannot remove yourself from your own trip."}), 400

    member = db.query_db(
        "SELECT id FROM trip_members WHERE trip_id = %s AND user_id = %s",
        (trip_id, member_user_id),
        one=True,
    )
    if not member:
        return jsonify({"error": "Member not found in this trip."}), 404

    # Remove membership record
    db.execute_db("DELETE FROM trip_members WHERE trip_id = %s AND user_id = %s", (trip_id, member_user_id))
    logger.info(f"👋 [Member Removed] User {member_user_id} removed from trip {trip_id} by creator {user['id']}.")

    return jsonify({"message": "Member removed from trip. Their memories remain.", "user_id": member_user_id}), 200


# ==============================================================================
# 2. User Search for Direct Invitations
# ==============================================================================

@sharing_bp.route("/users/search", methods=["GET"])
@login_required
def search_users():
    """Search registered users by username or email prefix to invite to a trip."""
    query = (request.args.get("q") or "").strip()
    trip_id = request.args.get("trip_id")
    current_uid = g.user["id"]

    if not query or len(query) < 2:
        return jsonify({"users": []}), 200

    params = [f"%{query}%", f"%{query}%", current_uid]
    trip_filter = ""
    if trip_id:
        trip_filter = "AND id NOT IN (SELECT user_id FROM trip_members WHERE trip_id = %s)"
        params.append(trip_id)

    sql = f"""
        SELECT id, email, username
        FROM users
        WHERE (username LIKE %s OR email LIKE %s)
          AND id != %s
          {trip_filter}
        ORDER BY username ASC, email ASC
        LIMIT 10
    """
    matches = db.query_db(sql, tuple(params)) or []

    results = []
    for u in matches:
        display_name = u.get("username") or u["email"].split("@")[0]
        results.append({
            "id": u["id"],
            "email": u["email"],
            "username": u.get("username"),
            "display_name": display_name,
        })

    return jsonify({"users": results}), 200


# ==============================================================================
# 3. Invitations & Invite Links
# ==============================================================================

@sharing_bp.route("/trips/<int:trip_id>/invitations", methods=["GET"])
@login_required
def get_trip_invitations(trip_id: int):
    """List active invitations and invite links for this trip (creator only)."""
    user = g.user
    if not _is_trip_creator(trip_id, user["id"]):
        return jsonify({"error": "Only the trip creator can view invitations."}), 403

    now_str = datetime.now().strftime("%Y-%m-%d %H:%M:%S")
    sql = """
        SELECT 
            ti.id,
            ti.trip_id,
            ti.inviter_id,
            ti.invitee_id,
            ti.token,
            ti.status,
            ti.expires_at,
            ti.created_at,
            u.username AS invitee_name,
            u.email AS invitee_email
        FROM trip_invitations ti
        LEFT JOIN users u ON ti.invitee_id = u.id
        WHERE ti.trip_id = %s 
          AND ti.status = 'pending'
          AND (ti.expires_at IS NULL OR ti.expires_at > %s)
        ORDER BY ti.created_at DESC
    """
    invitations = db.query_db(sql, (trip_id, now_str)) or []

    for inv in invitations:
        if inv.get("invitee_id"):
            inv["type"] = "direct"
            inv["invitee_display_name"] = inv.get("invitee_name") or (inv.get("invitee_email", "").split("@")[0] if inv.get("invitee_email") else "Traveler")
        else:
            inv["type"] = "link"
            inv["invitee_display_name"] = None

    return jsonify({"invitations": invitations}), 200


@sharing_bp.route("/trips/<int:trip_id>/invitations", methods=["POST"])
@login_required
def create_invitation(trip_id: int):
    """Create a new direct invitation or shareable invite link (creator only)."""
    user = g.user
    if not _is_trip_creator(trip_id, user["id"]):
        return jsonify({"error": "Only the trip creator can invite people."}), 403

    trip = db.query_db("SELECT id, name, start_date, end_date FROM trips WHERE id = %s", (trip_id,), one=True)
    if not trip:
        return jsonify({"error": "Trip not found."}), 404

    data = request.get_json(silent=True) or {}
    invite_type = data.get("type", "direct")  # 'direct', 'email', or 'link'
    invitee_id = data.get("invitee_id")
    invitee_email = (data.get("email") or "").strip()
    days_valid = int(data.get("days_valid", 7))
    target_email = None

    # Resolve invitee if provided by email
    if not invitee_id and invitee_email:
        target_user = db.query_db("SELECT id, email, username FROM users WHERE LOWER(email) = LOWER(%s)", (invitee_email.strip(),), one=True)
        if target_user:
            invitee_id = target_user["id"]
            target_email = target_user["email"]
        else:
            # Allow inviting via email even if user has not registered yet
            target_email = invitee_email
    elif invitee_id:
        target_user = db.query_db("SELECT id, email, username FROM users WHERE id = %s", (invitee_id,), one=True)
        if target_user:
            target_email = target_user["email"]

    # Direct invite validation
    if invite_type in ("direct", "email") or invitee_id:
        if not invitee_id and not target_email:
            return jsonify({"error": "Please specify a traveler or email address to invite."}), 400

        if invitee_id and invitee_id == user["id"]:
            return jsonify({"error": "You cannot invite yourself to your own trip."}), 400

        # Check if already a member
        if invitee_id and _is_trip_member(trip_id, invitee_id):
            return jsonify({"error": "This traveler is already part of this trip."}), 400

    token = secrets.token_hex(16)
    expires_at = (datetime.now() + timedelta(days=days_valid)).strftime("%Y-%m-%d %H:%M:%S") if days_valid > 0 else None

    inv_id = db.execute_db(
        """
        INSERT INTO trip_invitations (trip_id, inviter_id, invitee_id, token, status, expires_at)
        VALUES (%s, %s, %s, %s, 'pending', %s)
        """,
        (trip_id, user["id"], invitee_id if invitee_id else None, token, expires_at),
    )

    invitation = db.query_db("SELECT * FROM trip_invitations WHERE id = %s", (inv_id,), one=True)
    if invitation:
        invitation["type"] = "direct" if invitee_id else ("email" if target_email else "link")
        if target_email:
            invitation["recipient_email"] = target_email

    # Format trip dates string for email
    s_date = str(trip.get("start_date") or "")
    e_date = str(trip.get("end_date") or "")
    dates_str = f"{s_date} – {e_date}" if s_date and e_date else (s_date or e_date or "")
    inviter_name = user.get("username") or user["email"].split("@")[0]

    # Dispatch email if recipient email is available
    email_dispatched = False
    if target_email:
        email_dispatched = email_service.send_invitation_email(
            to_email=target_email,
            inviter_name=inviter_name,
            trip_name=trip["name"],
            trip_dates=dates_str,
            invite_token=token,
            async_send=True,
        )

    logger.info(f"💌 [Invitation Created] Trip {trip_id} invitation created: id={inv_id}, type={invitation.get('type')}, token={token}, email_dispatched={email_dispatched}")
    return jsonify({
        "message": "Invitation created.",
        "invitation": invitation,
        "token": token,
        "email_sent": email_dispatched,
        "recipient_email": target_email,
    }), 201


@sharing_bp.route("/trips/<int:trip_id>/invitations/<int:invitation_id>", methods=["DELETE"])
@login_required
def revoke_invitation(trip_id: int, invitation_id: int):
    """Revoke / disable an invitation or invite link (creator only)."""
    user = g.user
    if not _is_trip_creator(trip_id, user["id"]):
        return jsonify({"error": "Only the trip creator can revoke invitations."}), 403

    invitation = db.query_db("SELECT id FROM trip_invitations WHERE id = %s AND trip_id = %s", (invitation_id, trip_id), one=True)
    if not invitation:
        return jsonify({"error": "Invitation not found."}), 404

    db.execute_db("UPDATE trip_invitations SET status = 'revoked' WHERE id = %s", (invitation_id,))
    logger.info(f"🚫 [Invitation Revoked] Invitation {invitation_id} for trip {trip_id} revoked by creator {user['id']}.")

    return jsonify({"message": "Invitation link disabled.", "id": invitation_id}), 200


# ==============================================================================
# 4. Invitation Token Preview, Acceptance, and Decline
# ==============================================================================

@sharing_bp.route("/invitations/<token>", methods=["GET"])
def preview_invitation(token: str):
    """
    Public/Authenticated preview of an invitation token.
    Returns minimal preview (trip title, creator name, dates, status).
    NEVER exposes private memories before joining.
    """
    user = get_current_user()
    current_uid = user["id"] if user else None

    inv = db.query_db(
        """
        SELECT 
            ti.id,
            ti.trip_id,
            ti.inviter_id,
            ti.invitee_id,
            ti.token,
            ti.status,
            ti.expires_at,
            ti.created_at,
            t.name AS trip_name,
            t.start_date,
            t.end_date,
            t.user_id AS creator_id,
            u_inviter.username AS inviter_username,
            u_inviter.email AS inviter_email
        FROM trip_invitations ti
        JOIN trips t ON ti.trip_id = t.id
        JOIN users u_inviter ON ti.inviter_id = u_inviter.id
        WHERE ti.token = %s
        """,
        (token.strip(),),
        one=True,
    )

    if not inv:
        return jsonify({
            "status": "invalid",
            "message": "This invitation isn't available.",
        }), 404

    # Determine status
    now = datetime.now()
    if inv["status"] == "revoked":
        return jsonify({
            "status": "revoked",
            "message": "This invitation is no longer active.",
            "trip_name": inv["trip_name"],
        }), 200

    if inv.get("expires_at"):
        expires_dt = inv["expires_at"]
        if isinstance(expires_dt, str):
            try:
                expires_dt = datetime.strptime(expires_dt, "%Y-%m-%d %H:%M:%S")
            except Exception:
                pass
        if isinstance(expires_dt, datetime) and expires_dt < now:
            return jsonify({
                "status": "expired",
                "message": "This invitation has expired.",
                "trip_name": inv["trip_name"],
            }), 200

    # If user is logged in, check membership
    if current_uid:
        if _is_trip_member(inv["trip_id"], current_uid):
            return jsonify({
                "status": "already_member",
                "message": "You're already part of this trip.",
                "trip_id": inv["trip_id"],
                "trip_name": inv["trip_name"],
            }), 200

        # If direct invitation addressed to someone else
        if inv.get("invitee_id") and inv["invitee_id"] != current_uid:
            return jsonify({
                "status": "invalid",
                "message": "This invitation was sent to a different traveler.",
                "trip_name": inv["trip_name"],
            }), 200

    inviter_display = inv.get("inviter_username") or (inv.get("inviter_email", "").split("@")[0] if inv.get("inviter_email") else "Traveler")

    return jsonify({
        "status": "valid",
        "trip_id": inv["trip_id"],
        "trip_name": inv["trip_name"],
        "start_date": inv["start_date"],
        "end_date": inv["end_date"],
        "inviter_name": inviter_display,
        "expires_at": inv["expires_at"],
        "is_authenticated": bool(user),
    }), 200


@sharing_bp.route("/invitations/<token>/accept", methods=["POST"])
@login_required
def accept_invitation(token: str):
    """Accept an invitation to join a trip."""
    user = g.user
    inv = db.query_db(
        "SELECT * FROM trip_invitations WHERE token = %s",
        (token.strip(),),
        one=True,
    )

    if not inv:
        return jsonify({"error": "This invitation isn't available."}), 404

    if inv["status"] == "revoked":
        return jsonify({"error": "This invitation is no longer active."}), 400

    if inv.get("expires_at"):
        expires_dt = inv["expires_at"]
        if isinstance(expires_dt, str):
            try:
                expires_dt = datetime.strptime(expires_dt, "%Y-%m-%d %H:%M:%S")
            except Exception:
                pass
        if isinstance(expires_dt, datetime) and expires_dt < datetime.now():
            return jsonify({"error": "This invitation has expired."}), 400

    if inv.get("invitee_id") and inv["invitee_id"] != user["id"]:
        return jsonify({"error": "This invitation was addressed to a different traveler."}), 403

    trip_id = inv["trip_id"]

    # Check if already a member
    if _is_trip_member(trip_id, user["id"]):
        return jsonify({
            "message": "You're already part of this trip.",
            "trip_id": trip_id,
        }), 200

    # Insert into trip_members
    db.execute_db(
        """
        INSERT INTO trip_members (trip_id, user_id, role, can_add_moments, can_edit_moments, can_delete_moments)
        VALUES (%s, %s, 'member', 1, 1, 1)
        """,
        (trip_id, user["id"]),
    )

    # If direct invite, mark status accepted
    if inv.get("invitee_id"):
        db.execute_db("UPDATE trip_invitations SET status = 'accepted' WHERE id = %s", (inv["id"],))

    logger.info(f"🤝 [Invitation Accepted] User {user['id']} ('{user.get('username') or user['email']}') accepted invitation to trip {trip_id}.")

    return jsonify({
        "message": "Welcome to the trip!",
        "trip_id": trip_id,
    }), 200


@sharing_bp.route("/invitations/<token>/decline", methods=["POST"])
@login_required
def decline_invitation(token: str):
    """Decline a direct invitation to join a trip."""
    user = g.user
    inv = db.query_db("SELECT * FROM trip_invitations WHERE token = %s", (token.strip(),), one=True)
    if not inv:
        return jsonify({"error": "This invitation isn't available."}), 404

    if inv.get("invitee_id") and inv["invitee_id"] == user["id"]:
        db.execute_db("UPDATE trip_invitations SET status = 'declined' WHERE id = %s", (inv["id"],))
        logger.info(f"🙅 [Invitation Declined] User {user['id']} declined invitation {inv['id']} for trip {inv['trip_id']}.")

    return jsonify({"message": "Invitation declined."}), 200


@sharing_bp.route("/invitations/pending", methods=["GET"])
@login_required
def get_user_pending_invitations():
    """Get pending invitations directed to the current user."""
    user = g.user
    now_str = datetime.now().strftime("%Y-%m-%d %H:%M:%S")

    sql = """
        SELECT 
            ti.id,
            ti.token,
            ti.trip_id,
            ti.created_at,
            ti.expires_at,
            t.name AS trip_name,
            t.start_date,
            t.end_date,
            u_inviter.username AS inviter_username,
            u_inviter.email AS inviter_email
        FROM trip_invitations ti
        JOIN trips t ON ti.trip_id = t.id
        JOIN users u_inviter ON ti.inviter_id = u_inviter.id
        WHERE ti.invitee_id = %s
          AND ti.status = 'pending'
          AND (ti.expires_at IS NULL OR ti.expires_at > %s)
        ORDER BY ti.created_at DESC
    """
    pending = db.query_db(sql, (user["id"], now_str)) or []

    for item in pending:
        item["inviter_name"] = item.get("inviter_username") or (item.get("inviter_email", "").split("@")[0] if item.get("inviter_email") else "Traveler")

    return jsonify({"invitations": pending}), 200
