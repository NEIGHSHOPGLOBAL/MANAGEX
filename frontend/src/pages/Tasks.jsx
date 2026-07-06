import { useEffect, useState, useMemo } from 'react';
import { isTaskOverdue, localTodayISO } from '../utils/date';
import { Link, useSearchParams } from 'react-router-dom';
import { Plus, MapPin } from 'lucide-react';
import { api } from '../api/client';
import { useAuth } from '../context/AuthContext';
import { useProductivity } from '../context/ProductivityContext';
import { StatusBadge, PriorityBadge, TypeBadge } from '../components/Badges';
import OverdueIndicator from '../components/OverdueIndicator';
import Modal from '../components/Modal';
import UserMultiSelect from '../components/UserMultiSelect';
import { SkeletonList } from '../components/Skeleton';
import { formatAssigneeNames, isTaskAssignee } from '../utils/taskAssignees';

const QUICK_FILTERS = [
  { id: 'all', label: 'All' },
  { id: 'mine', label: 'Mine' },
  { id: 'today', label: 'Today' },
  { id: 'overdue', label: 'Overdue' },
  { id: 'completed', label: 'Completed' },
  { id: 'pending_verification', label: 'Pending Verify' },
  { id: 'late', label: 'Late' },
  { id: 'personal', label: 'Personal' },
  { id: 'project', label: 'Project' },
];

export default function Tasks() {
  const { user } = useAuth();
  const { prefs, updatePref } = useProductivity();
  const [searchParams] = useSearchParams();
  const [allTasks, setAllTasks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState(searchParams.get('type') || prefs.task_filter || 'all');
  const [createOpen, setCreateOpen] = useState(false);
  const [users, setUsers] = useState([]);
  const [projects, setProjects] = useState([]);
  const [form, setForm] = useState({
    title: '', description: '', task_type: 'normal', priority: 'medium',
    due_date: '', due_time: '', assigned_to_ids: [], project_id: '',
  });

  const load = () => {
    setLoading(true);
    api.getTasks().then(setAllTasks).catch(console.error).finally(() => setLoading(false));
  };

  useEffect(() => { load(); }, []);

  const today = localTodayISO();

  const tasks = useMemo(() => {
    return allTasks.filter((t) => {
      switch (filter) {
        case 'mine': return isTaskAssignee(t, user?.id);
        case 'today': return t.due_date === today && !['done', 'completed'].includes(t.status);
        case 'overdue': return isTaskOverdue(t, today);
        case 'completed': return ['done', 'completed'].includes(t.status);
        case 'pending_verification': return t.status === 'pending_verification';
        case 'late': return t.is_late;
        case 'personal': return t.task_type === 'personal';
        case 'project': return t.task_type === 'project';
        default: return true;
      }
    });
  }, [allTasks, filter, user?.id, today]);

  const setFilterAndSave = (id) => {
    setFilter(id);
    updatePref({ task_filter: id });
  };

  const openCreate = async () => {
    const [u, p] = await Promise.all([
      api.getAssignableUsers().catch(() => []),
      api.getProjects().catch(() => []),
    ]);
    setUsers(u);
    setProjects(p);
    setCreateOpen(true);
  };

  const handleCreate = async (e) => {
    e.preventDefault();
    const payload = { ...form };
    if (form.task_type !== 'personal') payload.assigned_to_ids = form.assigned_to_ids.map(Number);
    else delete payload.assigned_to_ids;
    if (form.project_id) payload.project_id = parseInt(form.project_id);
    if (!form.due_date) {
      delete payload.due_date;
      delete payload.due_time;
    } else if (!form.due_time) {
      delete payload.due_time;
    }
    await api.createTask(payload);
    setCreateOpen(false);
    setForm({ title: '', description: '', task_type: 'normal', priority: 'medium', due_date: '', due_time: '', assigned_to_ids: [], project_id: '' });
    load();
  };

  const filters = QUICK_FILTERS;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-slate-800 dark:text-slate-100">Tasks</h1>
          <p className="text-sm text-slate-500 dark:text-slate-400">{loading ? 'Loading...' : `${tasks.length} tasks`}</p>
        </div>
        <button onClick={openCreate} className="btn-primary flex items-center gap-1.5">
          <Plus size={16} /> New Task
        </button>
      </div>

      <div className="sticky top-0 z-20 -mx-4 px-4 py-2 bg-[#f4f6f9]/95 backdrop-blur-sm border-b border-slate-200 dark:border-slate-700/50 lg:mx-0 lg:px-0 lg:rounded-xl lg:border lg:bg-white dark:bg-slate-900/90">
        <div className="flex gap-2 overflow-x-auto pb-1">
          {filters.map((f) => (
            <button
              key={f.id}
              onClick={() => setFilterAndSave(f.id)}
              className={`text-xs px-3.5 py-1.5 rounded-lg font-medium transition-all whitespace-nowrap shrink-0
                ${filter === f.id ? 'bg-[#2563eb] text-white shadow-sm' : 'bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800'}`}
            >
              {f.label}
            </button>
          ))}
        </div>
      </div>

      {loading ? (
        <SkeletonList items={6} />
      ) : (
      <div className="grid gap-3">
        {tasks.map((task) => (
          <Link key={task.id} to={`/tasks/${task.id}`} className="card p-4 hover:shadow-md transition-all hover:border-blue-100 group">
            <div className="flex items-start justify-between gap-3">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap mb-1">
                  <TypeBadge type={task.task_type} />
                  <PriorityBadge priority={task.priority} />
                  <StatusBadge status={task.status} />
                  {task.is_late && <OverdueIndicator task={task} />}
                  {task.is_readonly && <span className="badge bg-slate-100 text-slate-500 dark:text-slate-400">Read-only</span>}
                </div>
                <h3 className="font-medium text-slate-800 dark:text-slate-100 truncate">{task.title}</h3>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 line-clamp-1">{task.description}</p>
                <div className="flex items-center gap-4 mt-2 text-xs text-slate-400">
                  {formatAssigneeNames(task) && <span>To: {formatAssigneeNames(task)}</span>}
                  {task.due_date && (
                    <span>
                      Due: {task.due_date}
                      {task.due_time && ` ${task.due_time.slice(0, 5)}`}
                    </span>
                  )}
                  {task.completed_in_office !== null && task.completed_in_office !== undefined && (
                    <span className="flex items-center gap-1">
                      <MapPin size={12} />
                      {task.completed_in_office ? 'In office' : 'Outside office'}
                    </span>
                  )}
                </div>
              </div>
            </div>
          </Link>
        ))}
        {tasks.length === 0 && (
          <div className="card p-8 text-center text-slate-400 text-sm">No tasks found</div>
        )}
      </div>
      )}

      <Modal open={createOpen} onClose={() => setCreateOpen(false)} title="Create Task" wide>
        <form onSubmit={handleCreate} className="space-y-3">
          <div>
            <label className="text-xs font-medium text-slate-600 dark:text-slate-300 mb-1 block">Type</label>
            <select className="input" value={form.task_type} onChange={(e) => setForm({ ...form, task_type: e.target.value })}>
              <option value="personal">Personal</option>
              <option value="normal">Normal</option>
              <option value="project">Project</option>
            </select>
          </div>
          <div>
            <label className="text-xs font-medium text-slate-600 dark:text-slate-300 mb-1 block">Title</label>
            <input className="input" required value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} />
          </div>
          <div>
            <label className="text-xs font-medium text-slate-600 dark:text-slate-300 mb-1 block">Description</label>
            <textarea className="input" rows={2} value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} />
          </div>
          {form.task_type !== 'personal' && (
            <div>
              <label className="text-xs font-medium text-slate-600 dark:text-slate-300 mb-1 block">Assign To (multiple)</label>
              <UserMultiSelect
                users={users}
                value={form.assigned_to_ids}
                onChange={(ids) => setForm({ ...form, assigned_to_ids: ids })}
                required
                placeholder="Select one or more people"
              />
            </div>
          )}
          {form.task_type === 'project' && (
            <div>
              <label className="text-xs font-medium text-slate-600 dark:text-slate-300 mb-1 block">Project</label>
              <select className="input" required value={form.project_id} onChange={(e) => setForm({ ...form, project_id: e.target.value })}>
                <option value="">Select project</option>
                {projects.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
              </select>
            </div>
          )}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-medium text-slate-600 dark:text-slate-300 mb-1 block">Priority</label>
              <select className="input" value={form.priority} onChange={(e) => setForm({ ...form, priority: e.target.value })}>
                {['low', 'medium', 'high', 'urgent'].map((p) => <option key={p} value={p}>{p}</option>)}
              </select>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-medium text-slate-600 dark:text-slate-300 mb-1 block">Due Date</label>
              <input type="date" className="input" value={form.due_date} onChange={(e) => setForm({ ...form, due_date: e.target.value })} />
            </div>
            <div>
              <label className="text-xs font-medium text-slate-600 dark:text-slate-300 mb-1 block">
                Due Time <span className="text-slate-400 font-normal">(optional)</span>
              </label>
              <input type="time" className="input" value={form.due_time} onChange={(e) => setForm({ ...form, due_time: e.target.value })} />
            </div>
          </div>
          <button type="submit" className="btn-primary w-full">Create Task</button>
        </form>
      </Modal>
    </div>
  );
}
