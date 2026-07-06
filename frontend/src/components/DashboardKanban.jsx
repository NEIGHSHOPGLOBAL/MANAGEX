import { useEffect, useMemo, useState } from 'react';
import { isTaskOverdue, localTodayISO } from '../utils/date';
import { Link } from 'react-router-dom';
import {
  Play, CheckCircle, Eye, ShieldCheck, XCircle, Calendar, GripVertical,
} from 'lucide-react';
import { api } from '../api/client';
import { useAuth, isManagement } from '../context/AuthContext';
import { PriorityBadge, TypeBadge } from './Badges';
import { formatAssigneeNames, isTaskAssignee } from '../utils/taskAssignees';

const COLUMNS = [
  { id: 'todo', label: 'To Do', statuses: ['assigned', 'todo', 'rejected'], accent: 'border-l-slate-400' },
  { id: 'in_progress', label: 'In Progress', statuses: ['in_progress'], accent: 'border-l-blue-500' },
  { id: 'review', label: 'Review', statuses: ['pending_verification'], accent: 'border-l-purple-500' },
  { id: 'done', label: 'Done', statuses: ['done', 'completed'], accent: 'border-l-emerald-500' },
];

const KANBAN_FILTERS = [
  { id: 'mine', label: 'Assigned to Me' },
  { id: 'all', label: 'All' },
  { id: 'today', label: 'Today' },
  { id: 'overdue', label: 'Overdue' },
  { id: 'personal', label: 'Personal' },
  { id: 'project', label: 'Project' },
];

function getLocation() {
  return new Promise((resolve) => {
    if (!navigator.geolocation) resolve({});
    navigator.geolocation.getCurrentPosition(
      (p) => resolve({ latitude: p.coords.latitude, longitude: p.coords.longitude }),
      () => resolve({}),
    );
  });
}

function KanbanCard({ task, onAction, busy, user, today, onDragStart, dragging }) {
  const isOverdue = task.due_date && task.due_date < today && !['done', 'completed'].includes(task.status);
  const canAct = !task.is_readonly && (isTaskAssignee(task, user?.id) || user?.role === 'super_admin');
  const canDrag = canAct || user?.role === 'super_admin';

  const actions = [];
  if (canAct && ['assigned', 'todo', 'rejected'].includes(task.status)) {
    actions.push({ id: 'start', label: 'Start', icon: Play, color: 'text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-950/40' });
  }
  if (canAct && task.status === 'in_progress') {
    actions.push({ id: 'done', label: 'Done', icon: CheckCircle, color: 'text-emerald-600 hover:bg-emerald-50 dark:hover:bg-emerald-950/40' });
  }
  if (isManagement(user?.role) && task.status === 'pending_verification') {
    actions.push({ id: 'verify', label: 'Approve', icon: ShieldCheck, color: 'text-purple-600 hover:bg-purple-50' });
    actions.push({ id: 'reject', label: 'Reject', icon: XCircle, color: 'text-red-600 hover:bg-red-50' });
  }
  actions.push({ id: 'view', label: 'Open', icon: Eye, color: 'text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800' });

  return (
    <div
      draggable={canDrag}
      onDragStart={(e) => canDrag && onDragStart(e, task)}
      className={`group bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl p-3.5 shadow-sm border-l-4 ${
        task.priority === 'urgent' ? 'border-l-red-500' :
        task.priority === 'high' ? 'border-l-orange-500' :
        task.priority === 'medium' ? 'border-l-blue-500' : 'border-l-slate-300'
      } transition-all ${canDrag ? 'cursor-grab active:cursor-grabbing' : ''} ${
        dragging ? 'opacity-40 scale-[0.98]' : 'hover:shadow-md hover:border-slate-300 dark:hover:border-slate-600'
      }`}
    >
      <div className="flex items-start gap-2 mb-2">
        {canDrag && (
          <GripVertical size={14} className="text-slate-300 dark:text-slate-600 shrink-0 mt-0.5 opacity-0 group-hover:opacity-100 transition-opacity" />
        )}
        <div className="flex-1 min-w-0">
          <div className="flex flex-wrap gap-1 mb-1.5">
            <TypeBadge type={task.task_type} />
            <PriorityBadge priority={task.priority} />
            {isOverdue && (
              <span className="text-[10px] font-bold text-red-600 bg-red-50 dark:bg-red-950/40 px-1.5 py-0.5 rounded">LATE</span>
            )}
          </div>
          <h4 className="font-semibold text-slate-800 dark:text-slate-100 text-sm leading-snug line-clamp-2">{task.title}</h4>
        </div>
      </div>

      {task.description && (
        <p className="text-xs text-slate-500 dark:text-slate-400 line-clamp-2 mb-2 pl-0">{task.description}</p>
      )}

      <div className="flex flex-wrap gap-x-2 gap-y-0.5 text-[11px] text-slate-400 mb-2.5">
        {formatAssigneeNames(task) && <span className="truncate max-w-[160px]">{formatAssigneeNames(task)}</span>}
        {task.due_date && (
          <span className="flex items-center gap-0.5 shrink-0">
            <Calendar size={10} />
            {task.due_date}
            {task.due_time && ` ${task.due_time.slice(0, 5)}`}
          </span>
        )}
      </div>

      <div className="flex flex-wrap gap-1 pt-2 border-t border-slate-100 dark:border-slate-800">
        {actions.map(({ id, label, icon: Icon, color: btnColor }) => (
          id === 'view' ? (
            <Link
              key={id}
              to={`/tasks/${task.id}`}
              className={`inline-flex items-center gap-1 px-2 py-1 rounded-md text-[11px] font-medium transition-colors ${btnColor}`}
            >
              <Icon size={12} /> {label}
            </Link>
          ) : (
            <button
              key={id}
              type="button"
              disabled={busy === task.id}
              onClick={() => onAction(task, id)}
              className={`inline-flex items-center gap-1 px-2 py-1 rounded-md text-[11px] font-medium transition-colors disabled:opacity-50 ${btnColor}`}
            >
              <Icon size={12} /> {label}
            </button>
          )
        ))}
      </div>
    </div>
  );
}

export default function DashboardKanban({ tasks, onRefresh }) {
  const { user } = useAuth();
  const [busy, setBusy] = useState(null);
  const [filter, setFilter] = useState(() => localStorage.getItem('kanban-filter') || 'mine');
  const [draggingId, setDraggingId] = useState(null);
  const [dropTarget, setDropTarget] = useState(null);
  const [localTasks, setLocalTasks] = useState(tasks);
  const today = localTodayISO();

  useEffect(() => { setLocalTasks(tasks); }, [tasks]);

  const setFilterAndSave = (id) => {
    setFilter(id);
    localStorage.setItem('kanban-filter', id);
  };

  const filteredTasks = useMemo(() => {
    return localTasks.filter((t) => {
      switch (filter) {
        case 'mine': return isTaskAssignee(t, user?.id);
        case 'today': return t.due_date === today && !['done', 'completed'].includes(t.status);
        case 'overdue': return isTaskOverdue(t, today);
        case 'personal': return t.task_type === 'personal';
        case 'project': return t.task_type === 'project';
        default: return true;
      }
    });
  }, [localTasks, filter, user?.id, today]);

  const activeTasks = filteredTasks.filter((t) => !['archived'].includes(t.status));

  const handleAction = async (task, action) => {
    setBusy(task.id);
    try {
      if (action === 'start') {
        await api.updateTaskStatus(task.id, { status: 'in_progress' });
      } else if (action === 'done') {
        const loc = await getLocation();
        await api.updateTaskStatus(task.id, { status: 'done', ...loc });
      } else if (action === 'verify') {
        await api.verifyTask(task.id, true);
      } else if (action === 'reject') {
        await api.verifyTask(task.id, false);
      }
      onRefresh();
    } catch (err) {
      alert(err.message);
    } finally {
      setBusy(null);
    }
  };

  const resolveStatusForColumn = (task, columnId) => {
    if (columnId === 'todo') {
      if (task.task_type === 'personal') return 'todo';
      return task.status === 'rejected' ? 'rejected' : 'assigned';
    }
    if (columnId === 'in_progress') return 'in_progress';
    if (columnId === 'review') return 'pending_verification';
    if (columnId === 'done') {
      if (['done', 'completed'].includes(task.status)) return task.status;
      return 'done';
    }
    return null;
  };

  const handleDrop = async (task, columnId) => {
    const currentCol = COLUMNS.find((c) => c.statuses.includes(task.status));
    if (currentCol?.id === columnId) return;
    if (task.is_readonly && user?.role !== 'super_admin') return;

    setBusy(task.id);
    try {
      if (columnId === 'done' && task.status === 'pending_verification') {
        if (isManagement(user?.role)) {
          await api.verifyTask(task.id, true);
          onRefresh();
        }
        return;
      }

      if (columnId === 'review') {
        if (task.status === 'pending_verification') return;
        const loc = await getLocation();
        await api.updateTaskStatus(task.id, { status: 'done', ...loc });
        onRefresh();
        return;
      }

      if (columnId === 'done') {
        const loc = await getLocation();
        await api.updateTaskStatus(task.id, { status: 'done', ...loc });
        onRefresh();
        return;
      }

      const newStatus = resolveStatusForColumn(task, columnId);
      if (!newStatus || newStatus === task.status) return;

      if (columnId === 'todo' && task.status === 'rejected') {
        await api.updateTaskStatus(task.id, { status: 'assigned' });
      } else if (task.task_type === 'personal') {
        await api.updateTaskStatus(task.id, { status: newStatus });
      } else {
        await api.updateTaskStatus(task.id, { status: newStatus });
      }
      onRefresh();
    } catch (err) {
      alert(err.message);
      onRefresh();
    } finally {
      setBusy(null);
      setDraggingId(null);
      setDropTarget(null);
    }
  };

  const onDragStart = (e, task) => {
    e.dataTransfer.setData('text/plain', String(task.id));
    e.dataTransfer.effectAllowed = 'move';
    setDraggingId(task.id);
  };

  const onDragEnd = () => {
    setDraggingId(null);
    setDropTarget(null);
  };

  return (
    <div className="animate-fade-in space-y-3">
      <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-thin">
        {KANBAN_FILTERS.map((f) => (
          <button
            key={f.id}
            type="button"
            onClick={() => setFilterAndSave(f.id)}
            className={`text-xs px-3.5 py-1.5 rounded-lg font-medium transition-all whitespace-nowrap shrink-0
              ${filter === f.id
                ? 'bg-[#2563eb] text-white shadow-sm'
                : 'bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800'}`}
          >
            {f.label}
          </button>
        ))}
      </div>

      <div className="flex gap-3 overflow-x-auto pb-2 kanban-scroll min-h-[calc(100vh-200px)]">
        {COLUMNS.map((col) => {
          const colTasks = activeTasks.filter((t) => col.statuses.includes(t.status));
          const isDropTarget = dropTarget === col.id;

          return (
            <div
              key={col.id}
              className="flex-shrink-0 w-[min(100%,280px)] sm:w-[300px] flex flex-col"
              onDragEnd={onDragEnd}
            >
              <div className={`flex items-center gap-2 mb-2.5 px-1 py-1 rounded-lg border-l-4 ${col.accent} bg-slate-50/80 dark:bg-slate-800/40`}>
                <h3 className="text-xs font-bold text-slate-700 dark:text-slate-200 uppercase tracking-wider flex-1 pl-2">
                  {col.label}
                </h3>
                <span className="text-xs font-semibold text-slate-500 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-full px-2 py-0.5 mr-1">
                  {colTasks.length}
                </span>
              </div>

              <div
                className={`flex-1 overflow-y-auto space-y-2.5 p-2.5 rounded-xl min-h-[200px] transition-colors ${
                  isDropTarget
                    ? 'bg-blue-50 dark:bg-blue-950/30 ring-2 ring-[#2563eb] ring-dashed'
                    : 'bg-slate-100/70 dark:bg-slate-800/50 border border-slate-200/80 dark:border-slate-700/60'
                }`}
                onDragOver={(e) => {
                  e.preventDefault();
                  e.dataTransfer.dropEffect = 'move';
                  setDropTarget(col.id);
                }}
                onDragLeave={() => setDropTarget((t) => (t === col.id ? null : t))}
                onDrop={(e) => {
                  e.preventDefault();
                  const id = parseInt(e.dataTransfer.getData('text/plain'), 10);
                  const task = activeTasks.find((t) => t.id === id);
                  if (task) handleDrop(task, col.id);
                  setDropTarget(null);
                }}
              >
                {colTasks.length === 0 ? (
                  <p className="text-xs text-slate-400 text-center py-10 pointer-events-none">
                    {isDropTarget ? 'Drop here' : 'No tasks'}
                  </p>
                ) : (
                  colTasks.map((task) => (
                    <KanbanCard
                      key={task.id}
                      task={task}
                      onAction={handleAction}
                      busy={busy}
                      user={user}
                      today={today}
                      onDragStart={onDragStart}
                      dragging={draggingId === task.id}
                    />
                  ))
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
