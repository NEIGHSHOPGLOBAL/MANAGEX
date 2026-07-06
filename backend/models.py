from datetime import datetime, timezone
import json

from werkzeug.security import check_password_hash, generate_password_hash

from extensions import db


def utcnow():
    return datetime.now(timezone.utc)


ROLES = ["super_admin", "admin", "coo", "branch_manager", "employee"]
ROLE_HIERARCHY = {role: idx for idx, role in enumerate(ROLES)}

TASK_TYPES = ["personal", "normal", "project"]
NORMAL_STATUSES = ["assigned", "in_progress", "done"]
PROJECT_STATUSES = [
    "assigned",
    "in_progress",
    "done",
    "pending_verification",
    "completed",
    "rejected",
]
PERSONAL_STATUSES = ["todo", "in_progress", "done"]
PRIORITIES = ["low", "medium", "high", "urgent"]
PROJECT_STATUSES_LIST = ["planning", "active", "completed", "archived"]


class Department(db.Model):
    __tablename__ = "departments"

    id = db.Column(db.Integer, primary_key=True)
    name = db.Column(db.String(120), unique=True, nullable=False)
    description = db.Column(db.Text)
    created_at = db.Column(db.DateTime, default=utcnow)

    employees = db.relationship("User", back_populates="department", lazy="dynamic")

    def to_dict(self):
        return {
            "id": self.id,
            "name": self.name,
            "description": self.description,
        }


class User(db.Model):
    __tablename__ = "users"

    id = db.Column(db.Integer, primary_key=True)
    employee_id = db.Column(db.String(50), unique=True, nullable=False, index=True)
    password_hash = db.Column(db.String(256), nullable=False)
    name = db.Column(db.String(120), nullable=False)
    email = db.Column(db.String(120), unique=True)
    role = db.Column(db.String(30), nullable=False, default="employee")
    designation = db.Column(db.String(120))
    contact = db.Column(db.String(120))
    phone = db.Column(db.String(20))
    blood_group = db.Column(db.String(10))
    emergency_contact = db.Column(db.String(120))
    joining_date = db.Column(db.Date)
    profile_photo = db.Column(db.String(255))
    is_active = db.Column(db.Boolean, default=True)
    department_id = db.Column(db.Integer, db.ForeignKey("departments.id"))
    manager_id = db.Column(db.Integer, db.ForeignKey("users.id"))
    created_by_id = db.Column(db.Integer, db.ForeignKey("users.id"))
    created_at = db.Column(db.DateTime, default=utcnow)
    updated_at = db.Column(db.DateTime, default=utcnow, onupdate=utcnow)

    department = db.relationship("Department", back_populates="employees")
    manager = db.relationship("User", remote_side=[id], foreign_keys=[manager_id], backref="direct_reports")
    created_by = db.relationship("User", remote_side=[id], foreign_keys=[created_by_id], backref="created_users")

    def set_password(self, password):
        self.password_hash = generate_password_hash(password, method="pbkdf2:sha256")

    def check_password(self, password):
        return check_password_hash(self.password_hash, password)

    def to_dict(self, include_contact=True, include_manager=False):
        data = {
            "id": self.id,
            "employee_id": self.employee_id,
            "name": self.name,
            "email": self.email,
            "role": self.role,
            "designation": self.designation,
            "phone": self.phone or self.contact,
            "blood_group": self.blood_group,
            "emergency_contact": self.emergency_contact,
            "joining_date": self.joining_date.isoformat() if self.joining_date else None,
            "profile_photo": self.profile_photo,
            "is_active": self.is_active,
            "department_id": self.department_id,
            "department_name": self.department.name if self.department else None,
            "manager_id": self.manager_id,
            "manager_name": self.manager.name if self.manager else None,
            "created_at": self.created_at.isoformat() if self.created_at else None,
            "updated_at": self.updated_at.isoformat() if self.updated_at else None,
        }
        if include_contact:
            data["contact"] = self.phone or self.contact
        if include_manager and self.manager:
            data["manager"] = self.manager.to_dict(include_contact=False, include_manager=False)
        return data


class Project(db.Model):
    __tablename__ = "projects"

    id = db.Column(db.Integer, primary_key=True)
    name = db.Column(db.String(200), nullable=False)
    description = db.Column(db.Text)
    status = db.Column(db.String(30), default="planning")
    priority = db.Column(db.String(20), default="medium")
    start_date = db.Column(db.Date)
    deadline = db.Column(db.Date)
    progress = db.Column(db.Integer, default=0)
    project_manager_id = db.Column(db.Integer, db.ForeignKey("users.id"))
    created_by_id = db.Column(db.Integer, db.ForeignKey("users.id"), nullable=False)
    created_at = db.Column(db.DateTime, default=utcnow)

    project_manager = db.relationship("User", foreign_keys=[project_manager_id])
    created_by = db.relationship("User", foreign_keys=[created_by_id])
    members = db.relationship("ProjectMember", back_populates="project", cascade="all, delete-orphan")
    tasks = db.relationship("Task", back_populates="project")

    def to_dict(self):
        return {
            "id": self.id,
            "name": self.name,
            "description": self.description,
            "status": self.status,
            "priority": self.priority,
            "start_date": self.start_date.isoformat() if self.start_date else None,
            "deadline": self.deadline.isoformat() if self.deadline else None,
            "progress": self.progress,
            "project_manager_id": self.project_manager_id,
            "project_manager": self.project_manager.to_dict(include_contact=False) if self.project_manager else None,
            "created_by_id": self.created_by_id,
            "created_at": self.created_at.isoformat() if self.created_at else None,
            "task_count": len(self.tasks),
        }


class ProjectMember(db.Model):
    __tablename__ = "project_members"

    id = db.Column(db.Integer, primary_key=True)
    project_id = db.Column(db.Integer, db.ForeignKey("projects.id"), nullable=False)
    user_id = db.Column(db.Integer, db.ForeignKey("users.id"), nullable=False)
    joined_at = db.Column(db.DateTime, default=utcnow)

    project = db.relationship("Project", back_populates="members")
    user = db.relationship("User")


class Task(db.Model):
    __tablename__ = "tasks"

    id = db.Column(db.Integer, primary_key=True)
    title = db.Column(db.String(200), nullable=False)
    description = db.Column(db.Text)
    task_type = db.Column(db.String(20), nullable=False, default="normal")
    priority = db.Column(db.String(20), default="medium")
    due_date = db.Column(db.Date)
    due_time = db.Column(db.Time)
    status = db.Column(db.String(30), default="assigned")
    assigned_by_id = db.Column(db.Integer, db.ForeignKey("users.id"))
    assigned_to_id = db.Column(db.Integer, db.ForeignKey("users.id"))
    project_id = db.Column(db.Integer, db.ForeignKey("projects.id"))
    personal_notes = db.Column(db.Text)
    is_readonly = db.Column(db.Boolean, default=False)
    completed_at = db.Column(db.DateTime)
    completion_lat = db.Column(db.Float)
    completion_lng = db.Column(db.Float)
    completed_in_office = db.Column(db.Boolean)
    device_info = db.Column(db.String(255))
    created_at = db.Column(db.DateTime, default=utcnow)
    updated_at = db.Column(db.DateTime, default=utcnow, onupdate=utcnow)

    assigned_by = db.relationship("User", foreign_keys=[assigned_by_id])
    assigned_to = db.relationship("User", foreign_keys=[assigned_to_id])
    project = db.relationship("Project", back_populates="tasks")
    assignees = db.relationship("TaskAssignee", back_populates="task", cascade="all, delete-orphan")
    checklist_items = db.relationship("TaskChecklist", back_populates="task", cascade="all, delete-orphan")
    comments = db.relationship("TaskComment", back_populates="task", cascade="all, delete-orphan")
    attachments = db.relationship("TaskAttachment", back_populates="task", cascade="all, delete-orphan")

    def assignee_users(self):
        if self.assignees:
            return [a.user for a in self.assignees if a.user]
        return [self.assigned_to] if self.assigned_to else []

    def assignee_ids(self):
        if self.assignees:
            return [a.user_id for a in self.assignees]
        return [self.assigned_to_id] if self.assigned_to_id else []

    def is_late(self):
        if not self.completed_at or not self.due_date:
            return False
        assignee = self.assigned_to
        if not assignee:
            return False
        if assignee.role == "super_admin":
            return False
        if assignee.role == "admin" and self.assigned_by and self.assigned_by.role != "super_admin":
            return False
        from time_utils import combine_due, to_app_tz

        due = combine_due(self.due_date, self.due_time)
        completed = to_app_tz(self.completed_at)
        return completed > due

    def to_dict(self, include_details=False):
        data = {
            "id": self.id,
            "title": self.title,
            "description": self.description,
            "task_type": self.task_type,
            "priority": self.priority,
            "due_date": self.due_date.isoformat() if self.due_date else None,
            "due_time": self.due_time.isoformat() if self.due_time else None,
            "status": self.status,
            "assigned_by_id": self.assigned_by_id,
            "assigned_to_id": self.assigned_to_id,
            "assigned_by": self.assigned_by.to_dict(include_contact=False) if self.assigned_by else None,
            "assigned_to": self.assigned_to.to_dict(include_contact=False) if self.assigned_to else None,
            "assignees": [u.to_dict(include_contact=False) for u in self.assignee_users()],
            "assigned_to_ids": self.assignee_ids(),
            "project_id": self.project_id,
            "project": self.project.to_dict() if self.project else None,
            "is_readonly": self.is_readonly,
            "completed_at": self.completed_at.isoformat() if self.completed_at else None,
            "completion_lat": self.completion_lat,
            "completion_lng": self.completion_lng,
            "completed_in_office": self.completed_in_office,
            "is_late": self.is_late() if self.completed_at else False,
            "created_at": self.created_at.isoformat() if self.created_at else None,
            "updated_at": self.updated_at.isoformat() if self.updated_at else None,
        }
        if include_details:
            data["personal_notes"] = self.personal_notes
            data["checklist"] = [c.to_dict() for c in self.checklist_items]
            data["comments"] = [c.to_dict() for c in self.comments]
            data["attachments"] = [a.to_dict() for a in self.attachments]
        return data


class TaskAssignee(db.Model):
    __tablename__ = "task_assignees"
    __table_args__ = (db.UniqueConstraint("task_id", "user_id", name="uq_task_assignee"),)

    id = db.Column(db.Integer, primary_key=True)
    task_id = db.Column(db.Integer, db.ForeignKey("tasks.id"), nullable=False)
    user_id = db.Column(db.Integer, db.ForeignKey("users.id"), nullable=False)
    created_at = db.Column(db.DateTime, default=utcnow)

    task = db.relationship("Task", back_populates="assignees")
    user = db.relationship("User")


class TaskChecklist(db.Model):
    __tablename__ = "task_checklist"

    id = db.Column(db.Integer, primary_key=True)
    task_id = db.Column(db.Integer, db.ForeignKey("tasks.id"), nullable=False)
    text = db.Column(db.String(300), nullable=False)
    is_done = db.Column(db.Boolean, default=False)
    sort_order = db.Column(db.Integer, default=0)

    task = db.relationship("Task", back_populates="checklist_items")

    def to_dict(self):
        return {"id": self.id, "text": self.text, "is_done": self.is_done, "sort_order": self.sort_order}


class TaskComment(db.Model):
    __tablename__ = "task_comments"

    id = db.Column(db.Integer, primary_key=True)
    task_id = db.Column(db.Integer, db.ForeignKey("tasks.id"), nullable=False)
    user_id = db.Column(db.Integer, db.ForeignKey("users.id"), nullable=False)
    text = db.Column(db.Text)
    created_at = db.Column(db.DateTime, default=utcnow)

    task = db.relationship("Task", back_populates="comments")
    user = db.relationship("User")
    attachments = db.relationship("TaskAttachment", back_populates="comment")

    def to_dict(self):
        return {
            "id": self.id,
            "task_id": self.task_id,
            "user_id": self.user_id,
            "user": self.user.to_dict(include_contact=False) if self.user else None,
            "text": self.text,
            "attachments": [a.to_dict() for a in self.attachments],
            "created_at": self.created_at.isoformat() if self.created_at else None,
        }


class TaskAttachment(db.Model):
    __tablename__ = "task_attachments"

    id = db.Column(db.Integer, primary_key=True)
    task_id = db.Column(db.Integer, db.ForeignKey("tasks.id"), nullable=False)
    comment_id = db.Column(db.Integer, db.ForeignKey("task_comments.id"))
    uploaded_by_id = db.Column(db.Integer, db.ForeignKey("users.id"), nullable=False)
    filename = db.Column(db.String(255), nullable=False)
    original_name = db.Column(db.String(255), nullable=False)
    file_type = db.Column(db.String(20))
    file_size = db.Column(db.Integer)
    created_at = db.Column(db.DateTime, default=utcnow)

    task = db.relationship("Task", back_populates="attachments")
    comment = db.relationship("TaskComment", back_populates="attachments")
    uploaded_by = db.relationship("User")

    def to_dict(self):
        return {
            "id": self.id,
            "task_id": self.task_id,
            "comment_id": self.comment_id,
            "filename": self.filename,
            "original_name": self.original_name,
            "file_type": self.file_type,
            "file_size": self.file_size,
            "url": f"/api/uploads/{self.filename}",
            "created_at": self.created_at.isoformat() if self.created_at else None,
        }


class ActivityLog(db.Model):
    __tablename__ = "activity_logs"

    id = db.Column(db.Integer, primary_key=True)
    user_id = db.Column(db.Integer, db.ForeignKey("users.id"))
    action = db.Column(db.String(100), nullable=False)
    entity_type = db.Column(db.String(50))
    entity_id = db.Column(db.Integer)
    details = db.Column(db.Text)
    ip_address = db.Column(db.String(45))
    latitude = db.Column(db.Float)
    longitude = db.Column(db.Float)
    created_at = db.Column(db.DateTime, default=utcnow)

    user = db.relationship("User")

    def to_dict(self):
        return {
            "id": self.id,
            "user_id": self.user_id,
            "user": self.user.to_dict(include_contact=False) if self.user else None,
            "action": self.action,
            "entity_type": self.entity_type,
            "entity_id": self.entity_id,
            "details": self.details,
            "created_at": self.created_at.isoformat() if self.created_at else None,
        }


class Notification(db.Model):
    __tablename__ = "notifications"

    id = db.Column(db.Integer, primary_key=True)
    user_id = db.Column(db.Integer, db.ForeignKey("users.id"), nullable=False)
    title = db.Column(db.String(200), nullable=False)
    message = db.Column(db.Text)
    notification_type = db.Column(db.String(50))
    entity_type = db.Column(db.String(50))
    entity_id = db.Column(db.Integer)
    is_read = db.Column(db.Boolean, default=False)
    created_at = db.Column(db.DateTime, default=utcnow)

    user = db.relationship("User")

    def to_dict(self):
        return {
            "id": self.id,
            "title": self.title,
            "message": self.message,
            "notification_type": self.notification_type,
            "entity_type": self.entity_type,
            "entity_id": self.entity_id,
            "is_read": self.is_read,
            "created_at": self.created_at.isoformat() if self.created_at else None,
        }


DEFAULT_PREFERENCES = {
    "sticky_today_panel": True,
    "quick_notes_widget": False,
    "keyboard_shortcuts": True,
    "desktop_notifications": False,
    "compact_ui": False,
    "sound_notifications": True,
    "dashboard_widgets": True,
    "today_panel_collapsed": False,
    "task_filter": "all",
    "hidden_widgets": [],
    "widget_order": ["continue", "main", "sidebar"],
}


class UserPreferences(db.Model):
    __tablename__ = "user_preferences"

    id = db.Column(db.Integer, primary_key=True)
    user_id = db.Column(db.Integer, db.ForeignKey("users.id"), unique=True, nullable=False)
    data = db.Column(db.Text, default=lambda: json.dumps(DEFAULT_PREFERENCES))
    updated_at = db.Column(db.DateTime, default=utcnow, onupdate=utcnow)

    user = db.relationship("User", backref=db.backref("preferences", uselist=False))

    def get_prefs(self):
        try:
            return {**DEFAULT_PREFERENCES, **json.loads(self.data or "{}")}
        except json.JSONDecodeError:
            return dict(DEFAULT_PREFERENCES)

    def set_prefs(self, updates):
        current = self.get_prefs()
        current.update(updates)
        self.data = json.dumps(current)

    def to_dict(self):
        return {"user_id": self.user_id, "preferences": self.get_prefs(), "updated_at": self.updated_at.isoformat() if self.updated_at else None}


class QuickNote(db.Model):
    __tablename__ = "quick_notes"

    id = db.Column(db.Integer, primary_key=True)
    user_id = db.Column(db.Integer, db.ForeignKey("users.id"), nullable=False, index=True)
    content = db.Column(db.Text, nullable=False, default="")
    created_at = db.Column(db.DateTime, default=utcnow)
    updated_at = db.Column(db.DateTime, default=utcnow, onupdate=utcnow)

    user = db.relationship("User")

    def to_dict(self):
        return {
            "id": self.id,
            "content": self.content,
            "created_at": self.created_at.isoformat() if self.created_at else None,
            "updated_at": self.updated_at.isoformat() if self.updated_at else None,
        }


class BugReport(db.Model):
    __tablename__ = "bug_reports"

    id = db.Column(db.Integer, primary_key=True)
    user_id = db.Column(db.Integer, db.ForeignKey("users.id"), nullable=False)
    report_type = db.Column(db.String(20), default="bug", nullable=False)
    description = db.Column(db.Text, nullable=False)
    screenshot_filename = db.Column(db.String(255))
    screenshot_original_name = db.Column(db.String(255))
    status = db.Column(db.String(20), default="open", nullable=False)
    created_at = db.Column(db.DateTime, default=utcnow)

    user = db.relationship("User")

    def to_dict(self):
        return {
            "id": self.id,
            "user_id": self.user_id,
            "user": self.user.to_dict(include_contact=False) if self.user else None,
            "report_type": self.report_type,
            "description": self.description,
            "screenshot": {
                "filename": self.screenshot_filename,
                "original_name": self.screenshot_original_name,
                "url": f"/api/uploads/{self.screenshot_filename}" if self.screenshot_filename else None,
            } if self.screenshot_filename else None,
            "status": self.status,
            "created_at": self.created_at.isoformat() if self.created_at else None,
        }


class Meeting(db.Model):
    __tablename__ = "meetings"

    id = db.Column(db.Integer, primary_key=True)
    title = db.Column(db.String(200), nullable=False)
    description = db.Column(db.Text)
    meeting_date = db.Column(db.Date, nullable=False)
    start_time = db.Column(db.Time, nullable=False)
    end_time = db.Column(db.Time)
    location = db.Column(db.String(255))
    meeting_link = db.Column(db.String(500))
    reminder_minutes = db.Column(db.Integer, default=15)
    created_by_id = db.Column(db.Integer, db.ForeignKey("users.id"), nullable=False)
    created_at = db.Column(db.DateTime, default=utcnow)
    updated_at = db.Column(db.DateTime, default=utcnow, onupdate=utcnow)

    created_by = db.relationship("User", foreign_keys=[created_by_id])
    attendees = db.relationship("MeetingAttendee", back_populates="meeting", cascade="all, delete-orphan")

    def to_dict(self, include_attendees=True):
        data = {
            "id": self.id,
            "title": self.title,
            "description": self.description,
            "meeting_date": self.meeting_date.isoformat() if self.meeting_date else None,
            "start_time": self.start_time.isoformat() if self.start_time else None,
            "end_time": self.end_time.isoformat() if self.end_time else None,
            "location": self.location,
            "meeting_link": self.meeting_link,
            "reminder_minutes": self.reminder_minutes,
            "created_by_id": self.created_by_id,
            "created_by": self.created_by.to_dict(include_contact=False) if self.created_by else None,
            "created_at": self.created_at.isoformat() if self.created_at else None,
        }
        if include_attendees:
            data["attendee_ids"] = [a.user_id for a in self.attendees]
            data["attendees"] = [a.user.to_dict(include_contact=False) for a in self.attendees if a.user]
        return data


class MeetingAttendee(db.Model):
    __tablename__ = "meeting_attendees"
    __table_args__ = (db.UniqueConstraint("meeting_id", "user_id", name="uq_meeting_attendee"),)

    id = db.Column(db.Integer, primary_key=True)
    meeting_id = db.Column(db.Integer, db.ForeignKey("meetings.id"), nullable=False)
    user_id = db.Column(db.Integer, db.ForeignKey("users.id"), nullable=False)

    meeting = db.relationship("Meeting", back_populates="attendees")
    user = db.relationship("User")


class DeviceToken(db.Model):
    __tablename__ = "device_tokens"

    id = db.Column(db.Integer, primary_key=True)
    user_id = db.Column(db.Integer, db.ForeignKey("users.id"), nullable=False, index=True)
    token = db.Column(db.String(512), unique=True, nullable=False)
    platform = db.Column(db.String(30), default="web")
    updated_at = db.Column(db.DateTime, default=utcnow, onupdate=utcnow)

    user = db.relationship("User")


class ReminderSent(db.Model):
    __tablename__ = "reminders_sent"

    id = db.Column(db.Integer, primary_key=True)
    reminder_key = db.Column(db.String(200), unique=True, nullable=False, index=True)
    user_id = db.Column(db.Integer, db.ForeignKey("users.id"))
    sent_at = db.Column(db.DateTime, default=utcnow)
