import math
import os
import uuid
from functools import wraps

from flask import current_app, request
from flask_jwt_extended import get_jwt_identity, verify_jwt_in_request

from extensions import db
from models import ActivityLog, Notification, ROLES, ROLE_HIERARCHY, TaskAssignee, User


MANAGEMENT_ROLES = {"super_admin", "admin", "coo", "branch_manager"}
VERIFY_ROLES = {"super_admin", "admin", "coo", "branch_manager"}
EMPLOYEE_MANAGE_ROLES = {"super_admin", "admin", "coo", "branch_manager"}


def role_level(role):
    return ROLE_HIERARCHY.get(role, 99)


def get_current_user():
    verify_jwt_in_request()
    user_id = int(get_jwt_identity())
    return User.query.get_or_404(user_id)


def jwt_required_active(fn):
    @wraps(fn)
    def wrapper(*args, **kwargs):
        user = get_current_user()
        if not user.is_active:
            return {"error": "Account deactivated"}, 403
        return fn(user, *args, **kwargs)

    return wrapper


def can_manage_user(actor, target):
    if actor.role == "super_admin":
        return True
    if actor.id == target.id:
        return True
    if role_level(actor.role) >= role_level(target.role):
        return False
    return actor.role in EMPLOYEE_MANAGE_ROLES


def user_is_task_assignee(user, task):
    if task.assigned_to_id == user.id:
        return True
    return any(a.user_id == user.id for a in task.assignees)


def resolve_assignee_ids(data):
    ids = data.get("assigned_to_ids") or []
    if not ids and data.get("assigned_to_id"):
        ids = [data["assigned_to_id"]]
    return list(dict.fromkeys(int(i) for i in ids if i))


def sync_task_assignees(task, user_ids):
    user_ids = list(dict.fromkeys(int(u) for u in user_ids if u))
    if not user_ids:
        return []
    existing = {a.user_id for a in task.assignees}
    task.assigned_to_id = user_ids[0]
    for assignee in list(task.assignees):
        if assignee.user_id not in user_ids:
            db.session.delete(assignee)
    for uid in user_ids:
        if uid not in existing:
            db.session.add(TaskAssignee(task_id=task.id, user_id=uid))
    return user_ids


def notify_task_assignees(task, actor_id, title, message, notification_type):
    for uid in task.assignee_ids():
        if uid != actor_id:
            notify_user(uid, title, message, notification_type, "task", task.id)


def can_view_task(user, task):
    if user.role == "super_admin":
        return True
    if task.task_type == "personal":
        return task.assigned_to_id == user.id
    if user_is_task_assignee(user, task) or task.assigned_by_id == user.id:
        return True
    if user.role in MANAGEMENT_ROLES:
        return True
    if task.project_id:
        return True
    return False


def can_edit_task(user, task):
    if task.is_readonly and user.role != "super_admin":
        return False
    if user.role == "super_admin":
        return True
    if task.task_type == "personal":
        return task.assigned_to_id == user.id
    if user.role in MANAGEMENT_ROLES:
        return True
    return user_is_task_assignee(user, task) and task.status not in ("done", "completed", "pending_verification")


def can_verify_task(user, task):
    return task.task_type == "project" and task.status == "pending_verification" and user.role in VERIFY_ROLES


def can_reopen_task(user, task):
    return user.role == "super_admin" and task.status in ("done", "completed")


def haversine_m(lat1, lng1, lat2, lng2):
    r = 6371000
    p1, p2 = math.radians(lat1), math.radians(lat2)
    dp = math.radians(lat2 - lat1)
    dl = math.radians(lng2 - lng1)
    a = math.sin(dp / 2) ** 2 + math.cos(p1) * math.cos(p2) * math.sin(dl / 2) ** 2
    return 2 * r * math.asin(math.sqrt(a))


def is_in_office(lat, lng):
    if lat is None or lng is None:
        return None
    dist = haversine_m(lat, lng, current_app.config["OFFICE_LAT"], current_app.config["OFFICE_LNG"])
    return dist <= current_app.config["OFFICE_RADIUS_M"]


def allowed_file(filename):
    return "." in filename and filename.rsplit(".", 1)[1].lower() in current_app.config["ALLOWED_EXTENSIONS"]


def save_upload(file):
    ext = file.filename.rsplit(".", 1)[1].lower()
    filename = f"{uuid.uuid4().hex}.{ext}"
    path = os.path.join(current_app.config["UPLOAD_FOLDER"], filename)
    file.save(path)
    file_type = "pdf" if ext == "pdf" else "image"
    return filename, file_type, os.path.getsize(path)


def save_profile_photo(file):
    ext = file.filename.rsplit(".", 1)[1].lower()
    if ext not in {"png", "jpg", "jpeg", "gif", "webp"}:
        raise ValueError("Invalid image type")
    filename = f"{uuid.uuid4().hex}.{ext}"
    folder = os.path.join(current_app.config["UPLOAD_FOLDER"], "profile_photos")
    os.makedirs(folder, exist_ok=True)
    path = os.path.join(folder, filename)
    file.save(path)
    return filename, os.path.getsize(path)


def log_activity(user, action, entity_type=None, entity_id=None, details=None):
    log = ActivityLog(
        user_id=user.id if user else None,
        action=action,
        entity_type=entity_type,
        entity_id=entity_id,
        details=details,
        ip_address=request.remote_addr,
    )
    db.session.add(log)


def notify_user(user_id, title, message, notification_type, entity_type=None, entity_id=None):
    n = Notification(
        user_id=user_id,
        title=title,
        message=message,
        notification_type=notification_type,
        entity_type=entity_type,
        entity_id=entity_id,
    )
    db.session.add(n)
    try:
        from push_service import send_push_to_user

        send_push_to_user(
            user_id,
            title,
            message,
            {
                "notification_type": notification_type,
                "entity_type": entity_type or "",
                "entity_id": entity_id or "",
            },
        )
    except Exception:
        pass


def get_assignable_users(actor):
    return User.query.filter(User.is_active.is_(True)).order_by(User.name).all()
