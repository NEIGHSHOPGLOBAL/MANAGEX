import os
from datetime import date

from flask import Flask, jsonify, send_from_directory
from flask_cors import CORS

from config import Config
from extensions import db, jwt
from models import Project, Task, User
from seed_attendx import seed_attendex_team
from bug_report_routes import bug_reports_bp
from meeting_routes import meetings_bp
from productivity_routes import productivity_bp
from routes import (
    auth_bp,
    dashboard_bp,
    notifications_bp,
    projects_bp,
    storage_bp,
    tasks_bp,
    uploads_bp,
    users_bp,
)


def create_app(config_class=Config):
    app = Flask(__name__)
    app.config.from_object(config_class)
    os.makedirs(app.config["UPLOAD_FOLDER"], exist_ok=True)

    cors_origins = os.environ.get("CORS_ORIGINS", "*")
    if cors_origins == "*":
        CORS(app, resources={r"/api/*": {"origins": "*"}})
    else:
        origins = [o.strip() for o in cors_origins.split(",") if o.strip()]
        CORS(app, resources={r"/api/*": {"origins": origins}})
    db.init_app(app)
    jwt.init_app(app)

    app.register_blueprint(auth_bp)
    app.register_blueprint(users_bp)
    app.register_blueprint(tasks_bp)
    app.register_blueprint(projects_bp)
    app.register_blueprint(dashboard_bp)
    app.register_blueprint(notifications_bp)
    app.register_blueprint(uploads_bp)
    app.register_blueprint(storage_bp)
    app.register_blueprint(productivity_bp)
    app.register_blueprint(bug_reports_bp)
    app.register_blueprint(meetings_bp)

    @app.route("/api/health")
    def health():
        return jsonify({"status": "ok", "app": "ManageX"})

    _register_frontend(app)

    with app.app_context():
        db.create_all()
        _migrate_schema()

    return app


def _migrate_schema():
    """Lightweight SQLite migrations for new columns."""
    from sqlalchemy import inspect, text

    from models import Task, TaskAssignee

    inspector = inspect(db.engine)
    if "bug_reports" in inspector.get_table_names():
        cols = {c["name"] for c in inspector.get_columns("bug_reports")}
        if "report_type" not in cols:
            db.session.execute(text("ALTER TABLE bug_reports ADD COLUMN report_type VARCHAR(20) DEFAULT 'bug'"))
            db.session.commit()

    if "task_assignees" in inspector.get_table_names():
        tasks = Task.query.filter(
            Task.assigned_to_id.isnot(None),
            Task.task_type != "personal",
        ).all()
        changed = False
        for task in tasks:
            if not TaskAssignee.query.filter_by(task_id=task.id, user_id=task.assigned_to_id).first():
                db.session.add(TaskAssignee(task_id=task.id, user_id=task.assigned_to_id))
                changed = True
        if changed:
            db.session.commit()


def _register_frontend(app):
    dist = app.config.get("FRONTEND_DIST") or os.environ.get("MANAGEX_FRONTEND_DIST")
    if not dist or not os.path.isdir(dist):
        return

    @app.route("/", defaults={"path": ""})
    @app.route("/<path:path>")
    def serve_frontend(path):
        if path.startswith("api/"):
            return jsonify({"error": "Not found"}), 404
        target = os.path.join(dist, path)
        if path and os.path.isfile(target):
            return send_from_directory(dist, path)
        return send_from_directory(dist, "index.html")


def seed_database():
    if seed_attendex_team():
        print("Attendex team seeded successfully.")
        return

    if User.query.filter_by(employee_id="AX001").first():
        return

    if User.query.filter_by(employee_id="SA001").first():
        return

    users_data = [
        ("SA001", "Super Admin", "super_admin", "superadmin123"),
        ("AD001", "System Admin", "admin", "admin123"),
        ("COO001", "Chief Operations", "coo", "coo123"),
        ("BM001", "Branch Manager", "branch_manager", "manager123"),
        ("EMP001", "John Employee", "employee", "employee123"),
        ("EMP002", "Jane Employee", "employee", "employee123"),
    ]

    users = []
    for emp_id, name, role, password in users_data:
        u = User(
            employee_id=emp_id,
            name=name,
            role=role,
            contact=f"{emp_id.lower()}@managex.local",
            joining_date=date(2024, 1, 15),
            is_active=True,
        )
        u.set_password(password)
        db.session.add(u)
        users.append(u)

    db.session.flush()

    project = Project(
        name="Website Redesign",
        description="Redesign company website with modern UI",
        status="active",
        priority="high",
        start_date=date(2025, 1, 1),
        deadline=date(2025, 6, 30),
        progress=35,
        project_manager_id=users[3].id,
        created_by_id=users[2].id,
    )
    db.session.add(project)
    db.session.flush()

    tasks_data = [
        ("Setup development environment", "normal", users[3].id, users[4].id, None, "in_progress", "medium"),
        ("Design homepage mockup", "project", users[3].id, users[5].id, project.id, "assigned", "high"),
        ("Review quarterly report", "normal", users[2].id, users[3].id, None, "assigned", "medium"),
        ("Personal: Update resume", "personal", None, users[4].id, None, "todo", "low"),
        ("Implement authentication module", "project", users[3].id, users[4].id, project.id, "in_progress", "urgent"),
    ]

    for title, ttype, by_id, to_id, proj_id, status, priority in tasks_data:
        t = Task(
            title=title,
            description=f"Task: {title}",
            task_type=ttype,
            priority=priority,
            due_date=date(2025, 7, 15),
            status=status,
            assigned_by_id=by_id,
            assigned_to_id=to_id,
            project_id=proj_id,
        )
        db.session.add(t)

    db.session.commit()
    print("Database seeded successfully.")


if __name__ == "__main__":
    application = create_app()
    with application.app_context():
        seed_database()
    application.run(debug=True, host="0.0.0.0", port=5001)
