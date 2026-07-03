import { isTaskOverdue, localTodayISO } from '../utils/date';

export function getUrgencyInfo(task) {
  const today = localTodayISO();
  const now = new Date();

  if (task.status === 'pending_verification') {
    return { label: 'Pending Verification', level: 'review', color: 'text-purple-700 bg-purple-100' };
  }
  if (['done', 'completed'].includes(task.status)) {
    return { label: 'Completed', level: 'done', color: 'text-green-700 bg-green-100' };
  }
  if (!task.due_date) {
    return { label: 'On Time', level: 'ok', color: 'text-slate-600 dark:text-slate-300 bg-slate-100' };
  }

  if (isTaskOverdue(task, today, now)) {
    if (task.due_date < today) {
      const [y, mo, da] = task.due_date.split('-').map(Number);
      const due = new Date(y, mo - 1, da);
      const daysLate = Math.floor((now - due) / 86400000);
      if (daysLate >= 3) return { label: `${daysLate} Days Late`, level: 'critical', color: 'text-red-700 bg-red-100' };
      if (daysLate >= 1) return { label: `${daysLate} Day${daysLate > 1 ? 's' : ''} Late`, level: 'late', color: 'text-red-600 bg-red-50' };
    }
    return { label: 'Overdue', level: 'late', color: 'text-red-600 bg-red-50' };
  }

  if (task.due_date === today) {
    if (task.due_time) {
      const [h, m] = task.due_time.split(':').map(Number);
      const dueDt = new Date();
      dueDt.setHours(h, m, 0, 0);
      const hoursLeft = (dueDt - now) / 3600000;
      if (hoursLeft <= 3) return { label: 'Due in 3 Hours', level: 'soon', color: 'text-orange-700 bg-orange-100' };
    }
    return { label: 'Due Today', level: 'today', color: 'text-amber-700 bg-amber-100' };
  }

  return { label: 'On Time', level: 'ok', color: 'text-emerald-700 bg-emerald-50' };
}

export default function OverdueIndicator({ task, showIcon = false }) {
  const info = getUrgencyInfo(task);
  return (
    <span className={`badge text-[10px] font-semibold ${info.color}`}>
      {info.label}
    </span>
  );
}
