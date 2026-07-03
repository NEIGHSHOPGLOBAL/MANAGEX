import os
from datetime import date, datetime, time, timezone
from zoneinfo import ZoneInfo


def get_tz():
    return ZoneInfo(os.environ.get("APP_TIMEZONE", "Asia/Kolkata"))


def app_now():
    return datetime.now(get_tz())


def app_today():
    return app_now().date()


def combine_due(due_date, due_time=None):
    t = due_time if due_time else time.min
    return datetime.combine(due_date, t, tzinfo=get_tz())


def to_app_tz(dt):
    if dt is None:
        return None
    if dt.tzinfo is None:
        dt = dt.replace(tzinfo=timezone.utc)
    return dt.astimezone(get_tz())


def completed_on_app_date(completed_at):
    if not completed_at:
        return None
    return to_app_tz(completed_at).date()


def is_task_overdue(task, today=None):
    today = today or app_today()
    if not task.due_date or task.status in ("done", "completed"):
        return False
    if task.due_date < today:
        return True
    if task.due_date == today and task.due_time:
        return combine_due(task.due_date, task.due_time) < app_now()
    return False
