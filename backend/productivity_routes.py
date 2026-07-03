import json

from flask import Blueprint, jsonify, request

from extensions import db
from models import DEFAULT_PREFERENCES, QuickNote, UserPreferences
from utils import jwt_required_active

productivity_bp = Blueprint("productivity", __name__, url_prefix="/api/productivity")


def get_or_create_prefs(user):
    prefs = UserPreferences.query.filter_by(user_id=user.id).first()
    if not prefs:
        prefs = UserPreferences(user_id=user.id, data=json.dumps(DEFAULT_PREFERENCES))
        db.session.add(prefs)
        db.session.commit()
    return prefs


@productivity_bp.route("/preferences", methods=["GET"])
@jwt_required_active
def get_preferences(user):
    return jsonify(get_or_create_prefs(user).to_dict())


@productivity_bp.route("/preferences", methods=["PATCH"])
@jwt_required_active
def update_preferences(user):
    data = request.get_json() or {}
    prefs = get_or_create_prefs(user)
    allowed = set(DEFAULT_PREFERENCES.keys())
    updates = {k: v for k, v in data.items() if k in allowed}
    prefs.set_prefs(updates)
    db.session.commit()
    return jsonify(prefs.to_dict())


@productivity_bp.route("/notes", methods=["GET"])
@jwt_required_active
def list_notes(user):
    q = request.args.get("q", "").strip().lower()
    notes = QuickNote.query.filter_by(user_id=user.id).order_by(QuickNote.updated_at.desc()).all()
    if q:
        notes = [n for n in notes if q in (n.content or "").lower()]
    return jsonify([n.to_dict() for n in notes])


@productivity_bp.route("/notes", methods=["POST"])
@jwt_required_active
def create_note(user):
    data = request.get_json() or {}
    content = (data.get("content") or "").strip()
    if not content:
        return jsonify({"error": "Content required"}), 400
    note = QuickNote(user_id=user.id, content=content)
    db.session.add(note)
    db.session.commit()
    return jsonify(note.to_dict()), 201


@productivity_bp.route("/notes/<int:note_id>", methods=["PUT"])
@jwt_required_active
def update_note(user, note_id):
    note = QuickNote.query.filter_by(id=note_id, user_id=user.id).first_or_404()
    data = request.get_json() or {}
    if "content" in data:
        note.content = data["content"]
    db.session.commit()
    return jsonify(note.to_dict())


@productivity_bp.route("/notes/<int:note_id>", methods=["DELETE"])
@jwt_required_active
def delete_note(user, note_id):
    note = QuickNote.query.filter_by(id=note_id, user_id=user.id).first_or_404()
    db.session.delete(note)
    db.session.commit()
    return jsonify({"message": "Deleted"})
