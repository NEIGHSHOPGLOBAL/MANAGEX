import { useEffect, useState } from 'react';
import { localTodayISO } from '../utils/date';
import { LayoutGrid, BarChart3 } from 'lucide-react';
import { api } from '../api/client';
import { DashboardSkeleton } from '../components/Skeleton';
import DashboardStats from '../components/DashboardStats';
import DashboardKanban from '../components/DashboardKanban';

const VIEWS = [
  { id: 'board', label: 'Board', icon: LayoutGrid },
  { id: 'stats', label: 'Stats', icon: BarChart3 },
];

export default function Dashboard() {
  const [stats, setStats] = useState(null);
  const [tasks, setTasks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [view, setView] = useState(() => localStorage.getItem('dashboard-view') || 'board');

  const today = stats?.today || localTodayISO();

  const load = (silent = false) => {
    if (!silent) setLoading(true);
    Promise.all([api.getDashboard(), api.getTasks()])
      .then(([s, t]) => { setStats(s); setTasks(t); })
      .catch(console.error)
      .finally(() => { if (!silent) setLoading(false); });
  };

  useEffect(() => { load(); }, []);

  const switchView = (id) => {
    setView(id);
    localStorage.setItem('dashboard-view', id);
  };

  if (loading) return <DashboardSkeleton />;

  return (
    <div className="space-y-4">
      {/* View toggle */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-slate-800 dark:text-slate-100">Dashboard</h1>
          <p className="text-sm text-slate-500 dark:text-slate-400">
            {view === 'board' ? 'Drag tasks between columns to update status' : 'Overview & analytics'}
          </p>
        </div>
        <div className="flex bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl p-1 shadow-sm">
          {VIEWS.map(({ id, label, icon: Icon }) => (
            <button
              key={id}
              onClick={() => switchView(id)}
              className={`flex items-center gap-1.5 px-3 sm:px-4 py-2 rounded-lg text-xs sm:text-sm font-medium transition-all
                ${view === id
                  ? 'bg-[#2563eb] text-white shadow-sm'
                  : 'text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800'}`}
            >
              <Icon size={16} />
              <span className="hidden sm:inline">{label}</span>
            </button>
          ))}
        </div>
      </div>

      {view === 'board' ? (
        <DashboardKanban tasks={tasks} onRefresh={() => load(true)} />
      ) : (
        <DashboardStats stats={stats} tasks={tasks} today={today} />
      )}
    </div>
  );
}
