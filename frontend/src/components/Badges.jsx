const STATUS_COLORS = {
  assigned: 'bg-blue-100 text-blue-700',
  in_progress: 'bg-amber-100 text-amber-700',
  done: 'bg-emerald-100 text-emerald-700',
  pending_verification: 'bg-purple-100 text-purple-700',
  completed: 'bg-green-100 text-green-800',
  rejected: 'bg-red-100 text-red-700',
  todo: 'bg-slate-100 text-slate-600 dark:text-slate-300',
  planning: 'bg-slate-100 text-slate-600 dark:text-slate-300',
  active: 'bg-indigo-100 text-indigo-700',
  archived: 'bg-gray-100 text-gray-600',
};

const PRIORITY_COLORS = {
  low: 'bg-slate-100 text-slate-600 dark:text-slate-300',
  medium: 'bg-sky-100 text-sky-700',
  high: 'bg-orange-100 text-orange-700',
  urgent: 'bg-red-100 text-red-700',
};

export function StatusBadge({ status }) {
  return (
    <span className={`badge ${STATUS_COLORS[status] || 'bg-slate-100 text-slate-600 dark:text-slate-300'}`}>
      {status?.replace(/_/g, ' ')}
    </span>
  );
}

export function PriorityBadge({ priority }) {
  return (
    <span className={`badge ${PRIORITY_COLORS[priority] || 'bg-slate-100 text-slate-600 dark:text-slate-300'}`}>
      {priority}
    </span>
  );
}

export function TypeBadge({ type }) {
  const colors = {
    personal: 'bg-violet-100 text-violet-700',
    normal: 'bg-cyan-100 text-cyan-700',
    project: 'bg-indigo-100 text-indigo-700',
  };
  return (
    <span className={`badge ${colors[type] || 'bg-slate-100'}`}>
      {type}
    </span>
  );
}
