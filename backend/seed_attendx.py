"""Seed ManageX with Attendex team profile data."""

from datetime import date

from extensions import db
from models import Department, Project, ProjectMember, Task, User


ATTENDEX_DEPARTMENTS = [
    ("Engineering", None),
    ("Human Resources", None),
    ("Sales", None),
    ("Executive", "Leadership and administration"),
    ("Operations", "Day-to-day operations"),
]

ATTENDEX_TEAM = [
    {
        "employee_id": "AX001",
        "email": "aakarshan.neighshopglobal@gmail.com",
        "name": "AAKARSHAN MISHRA",
        "role": "super_admin",
        "designation": "Super Admin",
        "password": "AX001",
        "manager_employee_id": None,
        "department": "Executive",
        "join_date": date(2026, 7, 1),
        "photo": "25499a408d7c494c81279ac24851f61a.jpeg",
    },
    {
        "employee_id": "AX002",
        "email": "aryan.neighshopglobal@gmail.com",
        "name": "ARYAN MANGLA",
        "role": "admin",
        "designation": "Admin",
        "password": "AX002",
        "manager_employee_id": "AX001",
        "department": "Executive",
        "join_date": date(2026, 7, 1),
        "photo": "603abc3c4641400ea4165e016ace3582.jpg",
    },
    {
        "employee_id": "AX003",
        "email": "lokesh@attendex.com",
        "name": "LOKESH CHOPRA",
        "role": "coo",
        "designation": "COO",
        "password": "AX003",
        "manager_employee_id": "AX002",
        "department": "Executive",
        "join_date": date(2026, 7, 1),
        "photo": "e03d5d2f2ea1485aa8226a517783bede.jpeg",
    },
    {
        "employee_id": "AX004",
        "email": "ankita.neighshopglobal@gmail.com",
        "name": "ANKITA SHARMA",
        "role": "branch_manager",
        "designation": "Manager",
        "password": "AX004",
        "manager_employee_id": "AX003",
        "department": "Executive",
        "join_date": date(2026, 7, 1),
        "photo": "c622e036c6774579a4f38fd4edb49e0e.jpeg",
    },
    {
        "employee_id": "AX005",
        "email": "komal.neighshopglobal@gmail.com",
        "name": "KOMAL JASROTIA",
        "role": "employee",
        "designation": "Full stack Developer",
        "password": "AX005",
        "manager_employee_id": "AX003",
        "department": "Engineering",
        "join_date": date(2026, 7, 2),
        "photo": "f741d844db044ceab1348c5ede9842e1.jpeg",
    },
    {
        "employee_id": "AX006",
        "email": "tejaswini.neighshopglobal@gmail.com",
        "name": "Tejaswini",
        "role": "employee",
        "designation": "Full stack Developer",
        "password": "AX006",
        "manager_employee_id": "AX003",
        "department": "Engineering",
        "join_date": date(2026, 7, 2),
        "photo": "04d33e3de326431f95a23f99e79e0ccb.jpeg",
    },
    {
        "employee_id": "AX007",
        "email": "parul.neighshopglobal@gmail.com",
        "name": "Parul",
        "role": "employee",
        "designation": "Full stack Developer",
        "password": "AX007",
        "manager_employee_id": "AX003",
        "department": "Engineering",
        "join_date": date(2026, 7, 2),
        "photo": "582d9a910c8440128e3d34846d08c367.jpeg",
    },
    {
        "employee_id": "AX008",
        "email": "gungun.neighshopglobal@gmail.com",
        "name": "Gungun",
        "role": "employee",
        "designation": "Full stack Developer",
        "password": "AX008",
        "manager_employee_id": "AX003",
        "department": "Engineering",
        "join_date": date(2026, 7, 2),
        "photo": "41b85653e0f641429b07ac30830265c1.jpeg",
    },
]


def _photo_url(filename):
    return f"/api/uploads/profile/{filename}" if filename else None


def ensure_departments():
    dept_map = {}
    for name, desc in ATTENDEX_DEPARTMENTS:
        dept = Department.query.filter_by(name=name).first()
        if not dept:
            dept = Department(name=name, description=desc)
            db.session.add(dept)
        dept_map[name] = dept
    db.session.flush()
    return dept_map


def seed_attendex_team(force=False):
    if not force and User.query.filter_by(employee_id="AX001").first():
        return False

    if force:
        Task.query.delete()
        ProjectMember.query.delete()
        Project.query.delete()
        User.query.delete()
        Department.query.delete()
        db.session.commit()

    dept_map = ensure_departments()
    emp_to_user = {}

    for item in ATTENDEX_TEAM:
        user = User(
            employee_id=item["employee_id"],
            email=item["email"],
            name=item["name"],
            role=item["role"],
            designation=item["designation"],
            phone="",
            contact=item["email"],
            joining_date=item["join_date"],
            profile_photo=_photo_url(item.get("photo")),
            department_id=dept_map[item["department"]].id,
            is_active=True,
        )
        user.set_password(item["password"])
        db.session.add(user)
        db.session.flush()
        emp_to_user[item["employee_id"]] = user

    for item in ATTENDEX_TEAM:
        user = emp_to_user[item["employee_id"]]
        mgr_id = item.get("manager_employee_id")
        user.manager_id = emp_to_user[mgr_id].id if mgr_id else None

    db.session.commit()
    return True
