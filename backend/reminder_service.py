from datetime import timedelta

from extensions import db
from models import Meeting, MeetingAttendee, ReminderSent, Task, User
from time_utils import app_now, app_today
from utils import notify_user

DONE_STATUSES = {"done", "completed"}


def _already_sent(reminder_key):
    return ReminderSent.query.filter_by(reminder_key=reminder_key).first() is not None


def _mark_sent(reminder_key, user_id):
    if _already_sent(reminder_key):
        return False
    db.session.add(ReminderSent(reminder_key=reminder_key, user_id=user_id))
    return True


def run_reminder_checks(now=None):
    now = now or app_now()
    today = now.date()
    sent = 0
    sent += _check_tasks_due_today(today)
    sent += _check_task_reminders(now)
    sent += _check_meeting_reminders(now)
    db.session.commit()
    return sent


def _check_tasks_due_today(today):
    count = 0
    tasks = Task.query.filter(
        Task.due_date == today,
        Task.status.notin_(list(DONE_STATUSES)),
        Task.assigned_to_id.isnot(None),
    ).all()
    for task in tasks:
        if not task.assigned_to_id:
            continue
        key = f"task_due:{task.id}:{today.isoformat()}"
        if not _mark_sent(key, task.assigned_to_id):
            continue
        notify_user(
            task.assigned_to_id,
            "Task Due Today",
            task.title,
            "task_due",
            "task",
            task.id,
        )
        count += 1
    return count


def _check_task_reminders(now):
    from datetime import datetime, time

    count = 0
    window_start = now - timedelta(minutes=2)
    window_end = now + timedelta(hours=1)
    tasks = Task.query.filter(
        Task.due_date.isnot(None),
        Task.status.notin_(list(DONE_STATUSES)),
        Task.assigned_to_id.isnot(None),
    ).all()
    for task in tasks:
        due_time = task.due_time or time(23, 59)
        due_dt = datetime.combine(task.due_date, due_time, tzinfo=now.tzinfo)
        if not (window_start <= due_dt <= window_end):
            continue
        key = f"task_reminder:{task.id}:{due_dt.isoformat()}"
        if not _mark_sent(key, task.assigned_to_id):
            continue
        notify_user(
            task.assigned_to_id,
            "Task Reminder",
            f"{task.title} is due soon",
            "task_reminder",
            "task",
            task.id,
        )
        count += 1
    return count


def _check_meeting_reminders(now):
    count = 0
    meetings = Meeting.query.filter(Meeting.meeting_date >= now.date()).all()
    for meeting in meetings:
        start_dt = datetime.combine(meeting.meeting_date, meeting.start_time, tzinfo=now.tzinfo)
        remind_at = start_dt - timedelta(minutes=meeting.reminder_minutes or 15)
        if not (remind_at <= now and (now - remind_at) <= timedelta(minutes=5)):
            continue
        attendee_ids = {a.user_id for a in meeting.attendees}
        if meeting.created_by_id:
            attendee_ids.add(meeting.created_by_id)
        for user_id in attendee_ids:
            key = f"meeting_reminder:{meeting.id}:{start_dt.isoformat()}:{user_id}"
            if not _mark_sent(key, user_id):
                continue
            notify_user(
                user_id,
                "Meeting Reminder",
                f"{meeting.title} starts in {meeting.reminder_minutes or 15} min",
                "meeting_reminder",
                "meeting",
                meeting.id,
            )
            count += 1
    return count
