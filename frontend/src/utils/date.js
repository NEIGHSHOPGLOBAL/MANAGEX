export function localTodayISO() {
  const d = new Date();
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

export function parseDueDateTime(dueDate, dueTime) {
  if (!dueDate) return null;
  const [y, mo, da] = dueDate.split('-').map(Number);
  if (dueTime) {
    const [h, mi] = dueTime.split(':').map(Number);
    return new Date(y, mo - 1, da, h, mi, 0, 0);
  }
  return new Date(y, mo - 1, da, 23, 59, 59, 999);
}

export function isTaskOverdue(task, today = localTodayISO(), now = new Date()) {
  if (!task.due_date || ['done', 'completed'].includes(task.status)) return false;
  if (task.due_date < today) return true;
  if (task.due_time) {
    const due = parseDueDateTime(task.due_date, task.due_time);
    return due && due < now;
  }
  return false;
}

export function isMeetingPast(meeting, now = new Date()) {
  const today = localTodayISO();
  if (meeting.meeting_date < today) return true;
  if (meeting.meeting_date === today && meeting.start_time) {
    const [h, m] = meeting.start_time.split(':').map(Number);
    const start = new Date();
    start.setHours(h, m, 0, 0);
    return start < now;
  }
  return false;
}
