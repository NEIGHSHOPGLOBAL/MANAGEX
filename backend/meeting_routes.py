from datetime import datetime, time

from flask import Blueprint, jsonify, request
from sqlalchemy import or_

from extensions import db
from models import Meeting, MeetingAttendee, User
from time_utils import app_today
from utils import jwt_required_active, notify_user

meetings_bp = Blueprint("meetings", __name__, url_prefix="/api/meetings")

MANAGEMENT_ROLES = {"super_admin", "admin", "coo", "branch_manager"}


def _can_manage_meetings(user):
    return user.role in MANAGEMENT_ROLES


def _parse_date(value):
    if not value:
        return None
    return datetime.fromisoformat(value).date() if isinstance(value, str) else value


def _parse_time(value):
    if not value:
        return None
    if isinstance(value, str):
        parts = value.split(":")
        return time(int(parts[0]), int(parts[1]))
    return value


def _meeting_query_for_user(user):
    attendee_meeting_ids = db.session.query(MeetingAttendee.meeting_id).filter_by(user_id=user.id)
    return Meeting.query.filter(
        or_(Meeting.created_by_id == user.id, Meeting.id.in_(attendee_meeting_ids))
    )


@meetings_bp.route("", methods=["GET"])
@jwt_required_active
def list_meetings(user):
    upcoming = request.args.get("upcoming") == "1"
    q = _meeting_query_for_user(user)
    if upcoming:
        q = q.filter(Meeting.meeting_date >= app_today())
    meetings = q.order_by(Meeting.meeting_date.asc(), Meeting.start_time.asc()).all()
    return jsonify([m.to_dict() for m in meetings])


@meetings_bp.route("/<int:meeting_id>", methods=["GET"])
@jwt_required_active
def get_meeting(user, meeting_id):
    meeting = _meeting_query_for_user(user).filter_by(id=meeting_id).first_or_404()
    return jsonify(meeting.to_dict())


@meetings_bp.route("", methods=["POST"])
@jwt_required_active
def create_meeting(user):
    if not _can_manage_meetings(user):
        return jsonify({"error": "Forbidden"}), 403
    data = request.get_json() or {}
    title = (data.get("title") or "").strip()
    if not title:
        return jsonify({"error": "Title is required"}), 400
    meeting_date = _parse_date(data.get("meeting_date"))
    start_time = _parse_time(data.get("start_time"))
    if not meeting_date or not start_time:
        return jsonify({"error": "Date and start time are required"}), 400

    meeting = Meeting(
        title=title,
        description=data.get("description"),
        meeting_date=meeting_date,
        start_time=start_time,
        end_time=_parse_time(data.get("end_time")),
        location=data.get("location"),
        meeting_link=data.get("meeting_link"),
        reminder_minutes=int(data.get("reminder_minutes") or 15),
        created_by_id=user.id,
    )
    db.session.add(meeting)
    db.session.flush()

    attendee_ids = set(data.get("attendee_ids") or [])
    for uid in attendee_ids:
        if User.query.get(uid):
            db.session.add(MeetingAttendee(meeting_id=meeting.id, user_id=uid))

    for attendee_id in attendee_ids:
        if attendee_id == user.id:
            continue
        notify_user(
            attendee_id,
            "Meeting Assigned",
            f"You are invited to: {meeting.title}",
            "meeting_assigned",
            "meeting",
            meeting.id,
        )

    db.session.commit()
    return jsonify(meeting.to_dict()), 201


@meetings_bp.route("/<int:meeting_id>", methods=["PUT"])
@jwt_required_active
def update_meeting(user, meeting_id):
    meeting = Meeting.query.get_or_404(meeting_id)
    if meeting.created_by_id != user.id and user.role not in {"super_admin", "admin"}:
        return jsonify({"error": "Forbidden"}), 403
    data = request.get_json() or {}
    if "title" in data:
        meeting.title = data["title"]
    if "description" in data:
        meeting.description = data["description"]
    if "meeting_date" in data:
        meeting.meeting_date = _parse_date(data["meeting_date"])
    if "start_time" in data:
        meeting.start_time = _parse_time(data["start_time"])
    if "end_time" in data:
        meeting.end_time = _parse_time(data["end_time"])
    if "location" in data:
        meeting.location = data["location"]
    if "meeting_link" in data:
        meeting.meeting_link = data["meeting_link"]
    if "reminder_minutes" in data:
        meeting.reminder_minutes = int(data["reminder_minutes"])

    if "attendee_ids" in data:
        MeetingAttendee.query.filter_by(meeting_id=meeting.id).delete()
        existing = {a.user_id for a in meeting.attendees}
        new_ids = set(data["attendee_ids"] or [])
        for uid in new_ids:
            if User.query.get(uid):
                db.session.add(MeetingAttendee(meeting_id=meeting.id, user_id=uid))
        for uid in new_ids - existing:
            if uid != user.id:
                notify_user(
                    uid,
                    "Meeting Assigned",
                    f"You are invited to: {meeting.title}",
                    "meeting_assigned",
                    "meeting",
                    meeting.id,
                )

    db.session.commit()
    return jsonify(meeting.to_dict())


@meetings_bp.route("/<int:meeting_id>", methods=["DELETE"])
@jwt_required_active
def delete_meeting(user, meeting_id):
    meeting = Meeting.query.get_or_404(meeting_id)
    if meeting.created_by_id != user.id and user.role not in {"super_admin", "admin"}:
        return jsonify({"error": "Forbidden"}), 403
    db.session.delete(meeting)
    db.session.commit()
    return jsonify({"message": "Meeting deleted"})
