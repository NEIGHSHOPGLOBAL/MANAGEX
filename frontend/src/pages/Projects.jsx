import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Plus } from 'lucide-react';
import { api } from '../api/client';
import { useAuth } from '../context/AuthContext';
import { StatusBadge, PriorityBadge } from '../components/Badges';
import Modal from '../components/Modal';

import { SkeletonList } from '../components/Skeleton';

export default function Projects() {
  const { user } = useAuth();
  const [projects, setProjects] = useState([]);
  const [loading, setLoading] = useState(true);
  const [createOpen, setCreateOpen] = useState(false);
  const [users, setUsers] = useState([]);
  const [form, setForm] = useState({
    name: '', description: '', status: 'planning', priority: 'medium',
    start_date: '', deadline: '', project_manager_id: '',
  });

  const load = () => {
    setLoading(true);
    api.getProjects().then(setProjects).catch(console.error).finally(() => setLoading(false));
  };
  useEffect(() => { load(); }, []);

  const openCreate = async () => {
    const u = await api.getAssignableUsers();
    setUsers(u);
    setCreateOpen(true);
  };

  const handleCreate = async (e) => {
    e.preventDefault();
    await api.createProject({
      ...form,
      project_manager_id: form.project_manager_id ? parseInt(form.project_manager_id) : null,
    });
    setCreateOpen(false);
    load();
  };

  const canCreate = ['super_admin', 'admin', 'coo'].includes(user?.role);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-slate-800 dark:text-slate-100">Projects</h1>
          <p className="text-sm text-slate-500 dark:text-slate-400">{projects.length} projects · open to all</p>
        </div>
        {canCreate && (
          <button onClick={openCreate} className="btn-primary flex items-center gap-1.5">
            <Plus size={16} /> New Project
          </button>
        )}
      </div>

      <div className="grid md:grid-cols-2 gap-4">
        {loading ? (
          <div className="col-span-2"><SkeletonList items={4} /></div>
        ) : (
        <>
        {projects.map((p) => (
          <Link key={p.id} to={`/projects/${p.id}`} className="card p-5 hover:shadow-md transition-all">
            <div className="flex items-center gap-2 mb-2">
              <StatusBadge status={p.status} />
              <PriorityBadge priority={p.priority} />
            </div>
            <h3 className="font-semibold text-slate-800 dark:text-slate-100">{p.name}</h3>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 line-clamp-2">{p.description}</p>
            <div className="mt-3">
              <div className="flex items-center justify-between text-xs text-slate-400 mb-1">
                <span>Progress</span>
                <span>{p.progress}%</span>
              </div>
              <div className="h-1.5 bg-slate-100 rounded-full overflow-hidden">
                <div className="h-full bg-[#2563eb] rounded-full transition-all" style={{ width: `${p.progress}%` }} />
              </div>
            </div>
            <div className="flex items-center gap-4 mt-3 text-xs text-slate-400">
              <span>{p.task_count} tasks</span>
              {p.deadline && <span>Due: {p.deadline}</span>}
            </div>
          </Link>
        ))}
        {projects.length === 0 && (
          <div className="card p-8 text-center text-slate-400 text-sm col-span-2">No projects yet</div>
        )}
        </>
        )}
      </div>

      <Modal open={createOpen} onClose={() => setCreateOpen(false)} title="Create Project" wide>
        <form onSubmit={handleCreate} className="space-y-3">
          <div>
            <label className="text-xs font-medium text-slate-600 dark:text-slate-300 mb-1 block">Name</label>
            <input className="input" required value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
          </div>
          <div>
            <label className="text-xs font-medium text-slate-600 dark:text-slate-300 mb-1 block">Description</label>
            <textarea className="input" rows={2} value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-medium text-slate-600 dark:text-slate-300 mb-1 block">Status</label>
              <select className="input" value={form.status} onChange={(e) => setForm({ ...form, status: e.target.value })}>
                {['planning', 'active', 'completed', 'archived'].map((s) => <option key={s} value={s}>{s}</option>)}
              </select>
            </div>
            <div>
              <label className="text-xs font-medium text-slate-600 dark:text-slate-300 mb-1 block">Priority</label>
              <select className="input" value={form.priority} onChange={(e) => setForm({ ...form, priority: e.target.value })}>
                {['low', 'medium', 'high', 'urgent'].map((p) => <option key={p} value={p}>{p}</option>)}
              </select>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-medium text-slate-600 dark:text-slate-300 mb-1 block">Start Date</label>
              <input type="date" className="input" value={form.start_date} onChange={(e) => setForm({ ...form, start_date: e.target.value })} />
            </div>
            <div>
              <label className="text-xs font-medium text-slate-600 dark:text-slate-300 mb-1 block">Deadline</label>
              <input type="date" className="input" value={form.deadline} onChange={(e) => setForm({ ...form, deadline: e.target.value })} />
            </div>
          </div>
          <div>
            <label className="text-xs font-medium text-slate-600 dark:text-slate-300 mb-1 block">Project Manager</label>
            <select className="input" value={form.project_manager_id} onChange={(e) => setForm({ ...form, project_manager_id: e.target.value })}>
              <option value="">Select (optional)</option>
              {users.map((u) => <option key={u.id} value={u.id}>{u.name}</option>)}
            </select>
          </div>
          <p className="text-xs text-slate-500 dark:text-slate-400">Projects are visible to everyone. Tag people on individual tasks.</p>
          <button type="submit" className="btn-primary w-full mt-2">Create Project</button>
        </form>
      </Modal>
    </div>
  );
}
