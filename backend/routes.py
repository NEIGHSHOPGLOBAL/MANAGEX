import os
from datetime import date, datetime, time

from flask import Blueprint, jsonify, request
from flask_jwt_extended import create_access_token
from sqlalchemy import func, or_

from extensions import db
from models import (
    PERSONAL_STATUSES,
    PROJECT_STATUSES,
    NORMAL_STATUSES,
    PRIORITIES,
    PROJECT_STATUSES_LIST,
    ActivityLog,
    Department,
    Notification,
    Project,
    Task,
    TaskAttachment,
    TaskChecklist,
    TaskComment,
    User,
    utcnow,
)
from utils import (
    allowed_file,
    can_edit_task,
    can_manage_user,
    can_reopen_task,
    can_verify_task,
    can_view_task,
    get_assignable_users,
    get_current_user,
    is_in_office,
    jwt_required_active,
    log_activity,
    notify_user,
    save_profile_photo,
    save_upload,
)

auth_bp = Blueprint("auth", __name__, url_prefix="/api/auth")
users_bp = Blueprint("users", __name__, url_prefix="/api/users")
tasks_bp = Blueprint("tasks", __name__, url_prefix="/api/tasks")
projects_bp = Blueprint("projects", __name__, url_prefix="/api/projects")
dashboard_bp = Blueprint("dashboard", __name__, url_prefix="/api/dashboard")
notifications_bp = Blueprint("notifications", __name__, url_prefix="/api/notifications")
uploads_bp = Blueprint("uploads", __name__, url_prefix="/api/uploads")
storage_bp = Blueprint("storage", __name__, url_prefix="/api/storage")


def parse_date(value):
    if not value:
        return None
    return datetime.fromisoformat(value).date() if isinstance(value, str) else value


def parse_time(value):
    if not value:
        return None
    if isinstance(value, str):
        parts = value.split(":")
        return time(int(parts[0]), int(parts[1]))
    return value


@auth_bp.route("/login", methods=["POST"])
def login():
    data = request.get_json() or {}
    employee_id = data.get("employee_id", "").strip()
    password = data.get("password", "")
    user = User.query.filter_by(employee_id=employee_id).first()
    if not user or not user.check_password(password):
        return jsonify({"error": "Invalid employee ID or password"}), 401
    if not user.is_active:
        return jsonify({"error": "Account deactivated"}), 403
    token = create_access_token(identity=str(user.id))
    log_activity(user, "User Logged In")
    db.session.commit()
    return jsonify({"access_token": token, "user": user.to_dict(include_manager=True)})


@auth_bp.route("/me", methods=["GET"])
@jwt_required_active
def me(user):
    return jsonify(user.to_dict(include_manager=True))


@auth_bp.route("/change-password", methods=["POST"])
@jwt_required_active
def change_password(user):
    data = request.get_json() or {}
    if not user.check_password(data.get("current_password", "")):
        return jsonify({"error": "Current password is incorrect"}), 400
    new_password = data.get("new_password", "")
    if len(new_password) < 6:
        return jsonify({"error": "Password must be at least 6 characters"}), 400
    user.set_password(new_password)
    log_activity(user, "Password Changed")
    db.session.commit()
    return jsonify({"message": "Password updated"})


@auth_bp.route("/profile", methods=["PATCH"])
@jwt_required_active
def update_profile(user):
    data = request.get_json() or {}
    for field in ("name", "phone", "blood_group", "emergency_contact"):
        if field in data:
            setattr(user, field, data[field])
            if field == "phone":
                user.contact = data[field]
    db.session.commit()
    return jsonify(user.to_dict(include_manager=True))


@auth_bp.route("/profile-photo", methods=["POST"])
@jwt_required_active
def upload_profile_photo(user):
    if "photo" not in request.files:
        return jsonify({"error": "No photo file"}), 400
    file = request.files["photo"]
    if not file.filename or not allowed_file(file.filename):
        return jsonify({"error": "Invalid image type"}), 400
    try:
        filename, _ = save_profile_photo(file)
    except ValueError as exc:
        return jsonify({"error": str(exc)}), 400
    user.profile_photo = f"/api/uploads/profile/{filename}"
    log_activity(user, "Profile Photo Updated")
    db.session.commit()
    return jsonify({"message": "Profile photo updated", "user": user.to_dict(include_manager=True)})


@users_bp.route("", methods=["GET"])
@jwt_required_active
def list_users(user):
    if user.role not in {"super_admin", "admin", "coo", "branch_manager"}:
        return jsonify({"error": "Forbidden"}), 403
    users = User.query.order_by(User.name).all()
    return jsonify([u.to_dict(include_manager=True) for u in users])


@users_bp.route("/departments", methods=["GET"])
@jwt_required_active
def list_departments(user):
    departments = Department.query.order_by(Department.name).all()
    result = []
    for d in departments:
        count = User.query.filter_by(department_id=d.id, is_active=True).count()
        result.append({**d.to_dict(), "employee_count": count})
    return jsonify(result)


@users_bp.route("/<int:user_id>", methods=["GET"])
@jwt_required_active
def get_user(user, user_id):
    target = User.query.get_or_404(user_id)
    if user.role not in {"super_admin", "admin", "coo", "branch_manager"} and user.id != target.id:
        return jsonify({"error": "Forbidden"}), 403
    return jsonify(target.to_dict(include_manager=True))


@users_bp.route("", methods=["POST"])
@jwt_required_active
def create_user(user):
    if user.role not in {"super_admin", "admin", "coo", "branch_manager"}:
        return jsonify({"error": "Forbidden"}), 403
    data = request.get_json() or {}
    if User.query.filter_by(employee_id=data.get("employee_id")).first():
        return jsonify({"error": "Employee ID already exists"}), 400
    email = (data.get("email") or data.get("contact") or "").strip().lower()
    if email and User.query.filter_by(email=email).first():
        return jsonify({"error": "Email already exists"}), 400
    new_user = User(
        employee_id=data["employee_id"],
        name=data["name"],
        email=email or None,
        role=data.get("role", "employee"),
        designation=data.get("designation"),
        phone=data.get("phone") or data.get("contact"),
        contact=data.get("phone") or data.get("contact"),
        blood_group=data.get("blood_group"),
        emergency_contact=data.get("emergency_contact"),
        joining_date=parse_date(data.get("joining_date")),
        department_id=data.get("department_id"),
        manager_id=data.get("manager_id"),
        created_by_id=user.id,
    )
    new_user.set_password(data.get("password", data["employee_id"]))
    db.session.add(new_user)
    log_activity(user, "Employee Created", "user", None, f"Created {new_user.employee_id}")
    db.session.commit()
    return jsonify(new_user.to_dict(include_manager=True)), 201


@users_bp.route("/<int:user_id>", methods=["PUT"])
@jwt_required_active
def update_user(user, user_id):
    target = User.query.get_or_404(user_id)
    if not can_manage_user(user, target):
        return jsonify({"error": "Forbidden"}), 403
    data = request.get_json() or {}
    for field in ("name", "phone", "role", "designation", "blood_group", "emergency_contact", "department_id", "manager_id"):
        if field in data:
            setattr(target, field, data[field])
            if field == "phone":
                target.contact = data[field]
    if "email" in data:
        email = data["email"].strip().lower()
        existing = User.query.filter(User.email == email, User.id != target.id).first()
        if existing:
            return jsonify({"error": "Email already exists"}), 400
        target.email = email
        if not target.contact:
            target.contact = email
    if "contact" in data:
        target.contact = data["contact"]
        if not target.phone:
            target.phone = data["contact"]
    if "joining_date" in data:
        target.joining_date = parse_date(data["joining_date"])
    if "is_active" in data:
        target.is_active = data["is_active"]
    log_activity(user, "Employee Updated", "user", target.id)
    db.session.commit()
    return jsonify(target.to_dict(include_manager=True))


@users_bp.route("/<int:user_id>/profile-photo", methods=["POST"])
@jwt_required_active
def upload_user_photo(user, user_id):
    target = User.query.get_or_404(user_id)
    if not can_manage_user(user, target) and user.id != target.id:
        return jsonify({"error": "Forbidden"}), 403
    if "photo" not in request.files:
        return jsonify({"error": "No photo file"}), 400
    file = request.files["photo"]
    if not file.filename or not allowed_file(file.filename):
        return jsonify({"error": "Invalid image type"}), 400
    try:
        filename, _ = save_profile_photo(file)
    except ValueError as exc:
        return jsonify({"error": str(exc)}), 400
    target.profile_photo = f"/api/uploads/profile/{filename}"
    log_activity(user, "Profile Photo Updated", "user", target.id)
    db.session.commit()
    return jsonify({"message": "Profile photo updated", "user": target.to_dict(include_manager=True)})


@users_bp.route("/<int:user_id>/reset-password", methods=["POST"])
@jwt_required_active
def reset_password(user, user_id):
    target = User.query.get_or_404(user_id)
    if not can_manage_user(user, target) or user.id == target.id:
        return jsonify({"error": "Forbidden"}), 403
    data = request.get_json() or {}
    target.set_password(data.get("password", "changeme123"))
    log_activity(user, "Password Reset", "user", target.id)
    db.session.commit()
    return jsonify({"message": "Password reset"})


@users_bp.route("/assignable", methods=["GET"])
@jwt_required_active
def assignable_users(user):
    return jsonify([u.to_dict(include_contact=False) for u in get_assignable_users(user)])


def task_query_for_user(user):
    q = Task.query
    if user.role == "super_admin":
        return q
    if user.role == "employee":
        return q.filter(
            or_(
                Task.assigned_to_id == user.id,
                db.and_(Task.task_type == "personal", Task.assigned_to_id == user.id),
                Task.project_id.isnot(None),
            )
        )
    return q.filter(
        or_(
            Task.assigned_to_id == user.id,
            Task.assigned_by_id == user.id,
            Task.task_type != "personal",
        )
    )


@tasks_bp.route("", methods=["GET"])
@jwt_required_active
def list_tasks(user):
    q = task_query_for_user(user)
    task_type = request.args.get("type")
    status = request.args.get("status")
    project_id = request.args.get("project_id")
    if task_type:
        q = q.filter(Task.task_type == task_type)
    if status:
        q = q.filter(Task.status == status)
    if project_id:
        q = q.filter(Task.project_id == int(project_id))
    tasks = q.order_by(Task.due_date.asc().nullslast(), Task.created_at.desc()).all()
    return jsonify([t.to_dict() for t in tasks if can_view_task(user, t)])


@tasks_bp.route("/<int:task_id>", methods=["GET"])
@jwt_required_active
def get_task(user, task_id):
    task = Task.query.get_or_404(task_id)
    if not can_view_task(user, task):
        return jsonify({"error": "Forbidden"}), 403
    return jsonify(task.to_dict(include_details=True))


@tasks_bp.route("", methods=["POST"])
@jwt_required_active
def create_task(user):
    data = request.get_json() or {}
    task_type = data.get("task_type", "normal")

    if task_type == "personal":
        assigned_to_id = user.id
        status = data.get("status", "todo")
    else:
        if user.role == "employee" and task_type != "personal":
            return jsonify({"error": "Employees cannot assign tasks to others"}), 403
        assigned_to_id = data.get("assigned_to_id")
        if not assigned_to_id:
            return jsonify({"error": "assigned_to_id required"}), 400
        status = "assigned"

    task = Task(
        title=data["title"],
        description=data.get("description"),
        task_type=task_type,
        priority=data.get("priority", "medium"),
        due_date=parse_date(data.get("due_date")),
        due_time=parse_time(data.get("due_time")),
        status=status,
        assigned_by_id=user.id if task_type != "personal" else None,
        assigned_to_id=assigned_to_id,
        project_id=data.get("project_id"),
        personal_notes=data.get("personal_notes"),
    )
    db.session.add(task)
    db.session.flush()

    for i, item in enumerate(data.get("checklist", [])):
        db.session.add(TaskChecklist(task_id=task.id, text=item["text"], sort_order=i))

    log_activity(user, "Task Created", "task", task.id, task.title)
    if task.assigned_to_id and task.assigned_to_id != user.id:
        notify_user(task.assigned_to_id, "New Task Assigned", task.title, "task_assigned", "task", task.id)
    db.session.commit()
    return jsonify(task.to_dict(include_details=True)), 201


@tasks_bp.route("/<int:task_id>", methods=["PUT"])
@jwt_required_active
def update_task(user, task_id):
    task = Task.query.get_or_404(task_id)
    if not can_edit_task(user, task):
        return jsonify({"error": "Forbidden or task is read-only"}), 403
    data = request.get_json() or {}
    for field in ("title", "description", "priority", "personal_notes"):
        if field in data:
            setattr(task, field, data[field])
    if "due_date" in data:
        task.due_date = parse_date(data["due_date"])
    if "due_time" in data:
        task.due_time = parse_time(data["due_time"])
    if "status" in data and task.task_type == "personal":
        task.status = data["status"]
    log_activity(user, "Task Updated", "task", task.id)
    db.session.commit()
    return jsonify(task.to_dict(include_details=True))


@tasks_bp.route("/<int:task_id>/status", methods=["POST"])
@jwt_required_active
def update_status(user, task_id):
    task = Task.query.get_or_404(task_id)
    if not can_view_task(user, task):
        return jsonify({"error": "Forbidden"}), 403
    if task.is_readonly and user.role != "super_admin":
        return jsonify({"error": "Task is read-only"}), 403

    data = request.get_json() or {}
    new_status = data.get("status")
    lat = data.get("latitude")
    lng = data.get("longitude")

    if new_status in ("done", "completed") or (
        task.task_type == "project" and new_status == "done"
    ):
        if task.assigned_to_id != user.id and user.role not in {"super_admin", "admin", "coo", "branch_manager"}:
            return jsonify({"error": "Only assignee can mark done"}), 403

    if task.task_type == "normal" and new_status == "done":
        task.status = "done"
        task.is_readonly = True
        task.completed_at = utcnow()
        task.completion_lat = lat
        task.completion_lng = lng
        task.completed_in_office = is_in_office(lat, lng)
        log_activity(user, "Task Completed", "task", task.id)
    elif task.task_type == "project" and new_status == "done":
        task.status = "pending_verification"
        task.completed_at = utcnow()
        task.completion_lat = lat
        task.completion_lng = lng
        task.completed_in_office = is_in_office(lat, lng)
        log_activity(user, "Task Completed", "task", task.id)
        if task.assigned_by_id:
            notify_user(task.assigned_by_id, "Task Pending Verification", task.title, "pending_verification", "task", task.id)
    elif task.task_type == "personal":
        task.status = new_status
        if new_status == "done":
            task.completed_at = utcnow()
    elif new_status in ("in_progress", "assigned"):
        task.status = new_status
    else:
        return jsonify({"error": "Invalid status transition"}), 400

    db.session.commit()
    return jsonify(task.to_dict())


@tasks_bp.route("/<int:task_id>/verify", methods=["POST"])
@jwt_required_active
def verify_task(user, task_id):
    task = Task.query.get_or_404(task_id)
    if not can_verify_task(user, task):
        return jsonify({"error": "Forbidden"}), 403
    data = request.get_json() or {}
    approved = data.get("approved", True)
    if approved:
        task.status = "completed"
        task.is_readonly = True
        log_activity(user, "Verification Approved", "task", task.id)
        notify_user(task.assigned_to_id, "Task Verified", task.title, "task_verified", "task", task.id)
    else:
        task.status = "rejected"
        task.completed_at = None
        log_activity(user, "Verification Rejected", "task", task.id)
        notify_user(task.assigned_to_id, "Task Rejected", task.title, "task_rejected", "task", task.id)
    db.session.commit()
    return jsonify(task.to_dict())


@tasks_bp.route("/<int:task_id>/reopen", methods=["POST"])
@jwt_required_active
def reopen_task(user, task_id):
    task = Task.query.get_or_404(task_id)
    if not can_reopen_task(user, task):
        return jsonify({"error": "Forbidden"}), 403
    task.status = "in_progress"
    task.is_readonly = False
    task.completed_at = None
    log_activity(user, "Task Reopened", "task", task.id)
    db.session.commit()
    return jsonify(task.to_dict())


@tasks_bp.route("/<int:task_id>/comments", methods=["POST"])
@jwt_required_active
def add_comment(user, task_id):
    task = Task.query.get_or_404(task_id)
    if not can_view_task(user, task):
        return jsonify({"error": "Forbidden"}), 403
    data = request.get_json() or {}
    comment = TaskComment(task_id=task.id, user_id=user.id, text=data.get("text", ""))
    db.session.add(comment)
    db.session.flush()
    log_activity(user, "Comment Added", "task", task.id)
    if task.assigned_to_id and task.assigned_to_id != user.id:
        notify_user(task.assigned_to_id, "New Message", f"New comment on: {task.title}", "comment_added", "task", task.id)
    if task.assigned_by_id and task.assigned_by_id != user.id and task.assigned_by_id != task.assigned_to_id:
        notify_user(task.assigned_by_id, "New Message", f"New comment on: {task.title}", "comment_added", "task", task.id)
    db.session.commit()
    return jsonify(comment.to_dict()), 201


@tasks_bp.route("/<int:task_id>/checklist", methods=["POST"])
@jwt_required_active
def add_checklist(user, task_id):
    task = Task.query.get_or_404(task_id)
    if not can_edit_task(user, task):
        return jsonify({"error": "Forbidden"}), 403
    data = request.get_json() or {}
    item = TaskChecklist(task_id=task.id, text=data["text"], sort_order=len(task.checklist_items))
    db.session.add(item)
    db.session.commit()
    return jsonify(item.to_dict()), 201


@tasks_bp.route("/checklist/<int:item_id>", methods=["PUT"])
@jwt_required_active
def toggle_checklist(user, item_id):
    item = TaskChecklist.query.get_or_404(item_id)
    task = item.task
    if not can_edit_task(user, task):
        return jsonify({"error": "Forbidden"}), 403
    data = request.get_json() or {}
    if "is_done" in data:
        item.is_done = data["is_done"]
    if "text" in data:
        item.text = data["text"]
    db.session.commit()
    return jsonify(item.to_dict())


@tasks_bp.route("/<int:task_id>/attachments", methods=["POST"])
@jwt_required_active
def upload_attachment(user, task_id):
    task = Task.query.get_or_404(task_id)
    if not can_view_task(user, task):
        return jsonify({"error": "Forbidden"}), 403
    if "file" not in request.files:
        return jsonify({"error": "No file"}), 400
    file = request.files["file"]
    if not file.filename or not allowed_file(file.filename):
        return jsonify({"error": "Invalid file type. Allowed: images and PDF"}), 400
    filename, file_type, size = save_upload(file)
    att = TaskAttachment(
        task_id=task.id,
        uploaded_by_id=user.id,
        filename=filename,
        original_name=file.filename,
        file_type=file_type,
        file_size=size,
    )
    db.session.add(att)
    log_activity(user, "Attachment Uploaded", "task", task.id)
    db.session.commit()
    return jsonify(att.to_dict()), 201


@projects_bp.route("", methods=["GET"])
@jwt_required_active
def list_projects(user):
    projects = Project.query.order_by(Project.created_at.desc()).all()
    return jsonify([p.to_dict() for p in projects])


@projects_bp.route("/<int:project_id>", methods=["GET"])
@jwt_required_active
def get_project(user, project_id):
    project = Project.query.get_or_404(project_id)
    return jsonify(project.to_dict())


@projects_bp.route("", methods=["POST"])
@jwt_required_active
def create_project(user):
    if user.role not in {"super_admin", "admin", "coo"}:
        return jsonify({"error": "Forbidden"}), 403
    data = request.get_json() or {}
    project = Project(
        name=data["name"],
        description=data.get("description"),
        status=data.get("status", "planning"),
        priority=data.get("priority", "medium"),
        start_date=parse_date(data.get("start_date")),
        deadline=parse_date(data.get("deadline")),
        project_manager_id=data.get("project_manager_id"),
        created_by_id=user.id,
    )
    db.session.add(project)
    db.session.flush()
    log_activity(user, "Project Created", "project", project.id)
    db.session.commit()
    return jsonify(project.to_dict()), 201


@projects_bp.route("/<int:project_id>", methods=["PUT"])
@jwt_required_active
def update_project(user, project_id):
    if user.role not in {"super_admin", "admin", "coo"}:
        return jsonify({"error": "Forbidden"}), 403
    project = Project.query.get_or_404(project_id)
    data = request.get_json() or {}
    for field in ("name", "description", "status", "priority", "progress"):
        if field in data:
            setattr(project, field, data[field])
    if "start_date" in data:
        project.start_date = parse_date(data["start_date"])
    if "deadline" in data:
        project.deadline = parse_date(data["deadline"])
    if "project_manager_id" in data:
        project.project_manager_id = data["project_manager_id"]
    log_activity(user, "Project Updated", "project", project.id)
    db.session.commit()
    return jsonify(project.to_dict())


@dashboard_bp.route("/stats", methods=["GET"])
@jwt_required_active
def dashboard_stats(user):
    from time_utils import app_today, completed_on_app_date, is_task_overdue

    today = app_today()
    q = task_query_for_user(user)
    all_tasks = [t for t in q.all() if can_view_task(user, t)]

    stats = {
        "today": today.isoformat(),
        "total_tasks": len(all_tasks),
        "assigned_tasks": len([t for t in all_tasks if t.assigned_to_id == user.id and t.status not in ("done", "completed")]),
        "my_tasks": len([t for t in all_tasks if t.assigned_to_id == user.id]),
        "due_today": len([t for t in all_tasks if t.due_date == today and t.status not in ("done", "completed")]),
        "overdue": len([t for t in all_tasks if is_task_overdue(t, today)]),
        "pending_verification": len([t for t in all_tasks if t.status == "pending_verification"]),
        "completed_today": len([
            t for t in all_tasks
            if t.completed_at and completed_on_app_date(t.completed_at) == today
        ]),
        "personal_tasks": len([t for t in all_tasks if t.task_type == "personal"]),
        "active_projects": Project.query.filter_by(status="active").count(),
        "status_distribution": {},
        "weekly_productivity": [],
        "recent_activity": [a.to_dict() for a in ActivityLog.query.order_by(ActivityLog.created_at.desc()).limit(10).all()],
    }

    for t in all_tasks:
        stats["status_distribution"][t.status] = stats["status_distribution"].get(t.status, 0) + 1

    return jsonify(stats)


@dashboard_bp.route("/calendar", methods=["GET"])
@jwt_required_active
def calendar_data(user):
    from models import Meeting, MeetingAttendee
    from sqlalchemy import or_

    from time_utils import app_today

    year = int(request.args.get("year", app_today().year))
    month = int(request.args.get("month", app_today().month))
    q = task_query_for_user(user)
    tasks = [t.to_dict() for t in q.all() if can_view_task(user, t) and t.due_date]
    tasks = [t for t in tasks if t["due_date"] and t["due_date"].startswith(f"{year:04d}-{month:02d}")]
    projects = []
    if user.role in {"super_admin", "admin", "coo", "branch_manager"}:
        projects = [
            p.to_dict() for p in Project.query.all()
            if p.deadline and p.deadline.year == year and p.deadline.month == month
        ]
    attendee_ids = db.session.query(MeetingAttendee.meeting_id).filter_by(user_id=user.id)
    meetings_q = Meeting.query.filter(
        or_(Meeting.created_by_id == user.id, Meeting.id.in_(attendee_ids))
    )
    meetings = [
        m.to_dict() for m in meetings_q.all()
        if m.meeting_date and m.meeting_date.year == year and m.meeting_date.month == month
    ]
    return jsonify({"tasks": tasks, "projects": projects, "meetings": meetings})


@notifications_bp.route("", methods=["GET"])
@jwt_required_active
def list_notifications(user):
    notes = Notification.query.filter_by(user_id=user.id).order_by(Notification.created_at.desc()).limit(50).all()
    return jsonify([n.to_dict() for n in notes])


@notifications_bp.route("/<int:note_id>/read", methods=["POST"])
@jwt_required_active
def mark_read(user, note_id):
    note = Notification.query.filter_by(id=note_id, user_id=user.id).first_or_404()
    note.is_read = True
    db.session.commit()
    return jsonify(note.to_dict())


@notifications_bp.route("/read-all", methods=["POST"])
@jwt_required_active
def mark_all_read(user):
    Notification.query.filter_by(user_id=user.id, is_read=False).update({"is_read": True})
    db.session.commit()
    return jsonify({"message": "All marked read"})


@notifications_bp.route("/device-token", methods=["POST"])
@jwt_required_active
def register_device_token(user):
    from models import DeviceToken

    data = request.get_json() or {}
    token = (data.get("token") or "").strip()
    if not token:
        return jsonify({"error": "Token required"}), 400
    platform = data.get("platform", "web")
    existing = DeviceToken.query.filter_by(token=token).first()
    if existing:
        existing.user_id = user.id
        existing.platform = platform
    else:
        db.session.add(DeviceToken(user_id=user.id, token=token, platform=platform))
    db.session.commit()
    return jsonify({"message": "Token registered"})


@notifications_bp.route("/device-token", methods=["DELETE"])
@jwt_required_active
def unregister_device_token(user):
    from models import DeviceToken

    data = request.get_json(silent=True) or {}
    token = (data.get("token") or "").strip()
    if token:
        DeviceToken.query.filter_by(user_id=user.id, token=token).delete()
    else:
        DeviceToken.query.filter_by(user_id=user.id).delete()
    db.session.commit()
    return jsonify({"message": "Token removed"})


@notifications_bp.route("/firebase-config", methods=["GET"])
def firebase_config():
    from push_service import get_firebase_web_config

    return jsonify(get_firebase_web_config())


@notifications_bp.route("/run-reminders", methods=["POST"])
def run_reminders():
    import os
    from reminder_service import run_reminder_checks

    secret = os.environ.get("CRON_SECRET", "")
    if not secret or request.headers.get("X-Cron-Secret") != secret:
        return jsonify({"error": "Forbidden"}), 403
    count = run_reminder_checks()
    return jsonify({"sent": count})


ANNOUNCE_ROLES = {"super_admin", "admin", "coo"}


@notifications_bp.route("/announcements", methods=["POST"])
@jwt_required_active
def send_announcement(user):
    if user.role not in ANNOUNCE_ROLES:
        return jsonify({"error": "Forbidden"}), 403
    data = request.get_json() or {}
    title = (data.get("title") or "").strip()
    message = (data.get("message") or "").strip()
    if not title:
        return jsonify({"error": "Title is required"}), 400
    if not message:
        return jsonify({"error": "Message is required"}), 400
    if len(title) > 200 or len(message) > 2000:
        return jsonify({"error": "Title or message too long"}), 400

    recipients = User.query.filter_by(is_active=True).all()
    for recipient in recipients:
        notify_user(
            recipient.id,
            title,
            message,
            "announcement",
            "announcement",
            None,
        )
    db.session.commit()

    from push_service import broadcast_push

    push_count = broadcast_push(
        title,
        message,
        {"notification_type": "announcement", "entity_type": "announcement"},
    )
    return jsonify({
        "message": f"Announcement sent to {len(recipients)} users",
        "in_app_count": len(recipients),
        "push_count": push_count,
    }), 201


@uploads_bp.route("/<filename>")
def serve_upload(filename):
    from flask import send_from_directory
    from flask import current_app

    return send_from_directory(current_app.config["UPLOAD_FOLDER"], filename)


@uploads_bp.route("/profile/<filename>")
def serve_profile_photo(filename):
    from flask import send_from_directory
    from flask import current_app

    folder = os.path.join(current_app.config["UPLOAD_FOLDER"], "profile_photos")
    return send_from_directory(folder, filename)


@storage_bp.route("/usage", methods=["GET"])
@jwt_required_active
def storage_usage(user):
    if user.role != "super_admin":
        return jsonify({"error": "Forbidden"}), 403
    attachments = TaskAttachment.query.all()
    total_size = sum(a.file_size or 0 for a in attachments)
    return jsonify({
        "total_files": len(attachments),
        "total_size_bytes": total_size,
        "total_size_mb": round(total_size / (1024 * 1024), 2),
        "files": [a.to_dict() for a in attachments],
    })


@storage_bp.route("/files/<int:file_id>", methods=["DELETE"])
@jwt_required_active
def delete_file(user, file_id):
    if user.role != "super_admin":
        return jsonify({"error": "Forbidden"}), 403
    import os
    from flask import current_app

    att = TaskAttachment.query.get_or_404(file_id)
    path = os.path.join(current_app.config["UPLOAD_FOLDER"], att.filename)
    if os.path.exists(path):
        os.remove(path)
    db.session.delete(att)
    db.session.commit()
    return jsonify({"message": "File deleted"})
