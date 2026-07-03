from flask import Blueprint, jsonify, request

from extensions import db
from models import BugReport, User
from utils import allowed_file, jwt_required_active, notify_user, save_upload

bug_reports_bp = Blueprint("bug_reports", __name__, url_prefix="/api/bug-reports")

ADMIN_ROLES = {"super_admin", "admin"}
IMAGE_EXTENSIONS = {"png", "jpg", "jpeg", "gif", "webp"}


def _is_admin(user):
    return user.role in ADMIN_ROLES


def _is_image(filename):
    return "." in filename and filename.rsplit(".", 1)[1].lower() in IMAGE_EXTENSIONS


@bug_reports_bp.route("", methods=["POST"])
@jwt_required_active
def create_bug_report(user):
    description = (request.form.get("description") or "").strip()
    if not description:
        return jsonify({"error": "Description is required"}), 400
    if len(description) > 5000:
        return jsonify({"error": "Description is too long (max 5000 characters)"}), 400

    report_type = (request.form.get("report_type") or "bug").strip().lower()
    if report_type not in {"bug", "feature"}:
        return jsonify({"error": "Invalid report type"}), 400

    screenshot_filename = None
    screenshot_original_name = None
    if "screenshot" in request.files:
        file = request.files["screenshot"]
        if file.filename:
            if not allowed_file(file.filename) or not _is_image(file.filename):
                return jsonify({"error": "Screenshot must be an image (PNG, JPG, GIF, WebP)"}), 400
            screenshot_filename, _, _ = save_upload(file)
            screenshot_original_name = file.filename

    report = BugReport(
        user_id=user.id,
        report_type=report_type,
        description=description,
        screenshot_filename=screenshot_filename,
        screenshot_original_name=screenshot_original_name,
    )
    db.session.add(report)
    db.session.flush()

    admins = User.query.filter(User.role.in_(ADMIN_ROLES), User.is_active.is_(True)).all()
    for admin in admins:
        if admin.id == user.id:
            continue
        notify_user(
            admin.id,
            "New feature suggestion" if report_type == "feature" else "New bug report",
            f"{user.name}: {description[:80]}",
            "feature_suggestion" if report_type == "feature" else "bug_report",
            "bug_report",
            report.id,
        )

    db.session.commit()
    return jsonify(report.to_dict()), 201


@bug_reports_bp.route("", methods=["GET"])
@jwt_required_active
def list_bug_reports(user):
    if not _is_admin(user):
        return jsonify({"error": "Forbidden"}), 403
    reports = BugReport.query.order_by(BugReport.created_at.desc()).all()
    return jsonify([r.to_dict() for r in reports])


@bug_reports_bp.route("/<int:report_id>", methods=["PATCH"])
@jwt_required_active
def update_bug_report(user, report_id):
    if not _is_admin(user):
        return jsonify({"error": "Forbidden"}), 403
    report = BugReport.query.get_or_404(report_id)
    data = request.get_json(silent=True) or {}
    status = data.get("status")
    if status not in {"open", "resolved"}:
        return jsonify({"error": "Invalid status"}), 400
    report.status = status
    db.session.commit()
    return jsonify(report.to_dict())
