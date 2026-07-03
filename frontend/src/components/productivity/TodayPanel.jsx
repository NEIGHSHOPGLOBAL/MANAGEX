import { useEffect, useState } from 'react';
import { isTaskOverdue, localTodayISO } from '../../utils/date';
import { Link } from 'react-router-dom';
import { ChevronDown, ChevronUp, Calendar, AlertTriangle, ShieldCheck, Clock } from 'lucide-react';
import { api } from '../../api/client';
import { useProductivity } from '../../context/ProductivityContext';
import OverdueIndicator from '../OverdueIndicator';

export default function TodayPanel() {
  const { prefs, updatePref } = useProductivity();
  const [tasks, setTasks] = useState([]);
  const [mobileOpen, setMobileOpen] = useState(false);
  const collapsed = prefs.today_panel_collapsed;
  const today = localTodayISO();

  useEffect(() => {
    if (!prefs.sticky_today_panel) return;
    api.getTasks().then(setTasks).catch(() => {});
  }, [prefs.sticky_today_panel]);

  if (!prefs.sticky_today_panel) return null;

  const dueToday = tasks.filter((t) => t.due_date === today && !['done', 'completed'].includes(t.status));
  const overdue = tasks.filter((t) => isTaskOverdue(t, today));
  const pending = tasks.filter((t) => t.status === 'pending_verification');
  const personal = tasks.filter((t) => t.task_type === 'personal' && !['done', 'completed'].includes(t.status));
  const recent = tasks
    .filter((t) => t.status === 'assigned')
    .sort((a, b) => new Date(b.created_at) - new Date(a.created_at))
    .slice(0, 3);

  const sections = [
    { icon: Calendar, label: 'Due Today', items: dueToday, color: 'text-amber-600' },
    { icon: AlertTriangle, label: 'Overdue', items: overdue, color: 'text-red-600' },
    { icon: ShieldCheck, label: 'Pending Verify', items: pending, color: 'text-purple-600' },
    { icon: Clock, label: 'Personal', items: personal, color: 'text-violet-600' },
    { icon: Calendar, label: 'Recently Assigned', items: recent, color: 'text-blue-600' },
  ];

  const toggleCollapse = () => updatePref({ today_panel_collapsed: !collapsed });

  const PanelContent = () => (
    <div className="space-y-3 max-h-[60vh] lg:max-h-[calc(100vh-120px)] overflow-y-auto">
      {sections.filter((s) => s.items.length > 0).map(({ icon: Icon, label, items, color }) => (
          <div key={label}>
            <div className={`flex items-center gap-1.5 text-xs font-semibold ${color} mb-1.5`}>
              <Icon size={12} /> {label} ({items.length})
            </div>
            <div className="space-y-1">
              {items.slice(0, 4).map((t) => (
                <Link
                  key={t.id}
                  to={`/tasks/${t.id}`}
                  className="block p-2 rounded-lg bg-slate-50 dark:bg-slate-800/50 hover:bg-slate-100 dark:hover:bg-slate-800 text-xs transition-colors"
                >
                  <p className="font-medium text-slate-800 dark:text-slate-100 truncate">{t.title}</p>
                  <OverdueIndicator task={t} />
                </Link>
              ))}
            </div>
          </div>
      ))}
      {sections.every((s) => s.items.length === 0) && (
        <p className="text-xs text-slate-400 text-center py-4">All clear for today!</p>
      )}
    </div>
  );

  return (
    <>
      {/* Desktop floating panel */}
      <div className={`hidden lg:block fixed z-[80] top-24 right-4 w-72 transition-all duration-300 ${collapsed ? 'w-12' : 'w-72'}`}>
        <div className="card shadow-lg overflow-hidden">
          <button
            onClick={toggleCollapse}
            className="w-full flex items-center justify-between px-3 py-2.5 bg-[#2563eb] text-white text-xs font-semibold"
          >
            {!collapsed && <span>Today's Work</span>}
            {collapsed ? <ChevronDown size={16} className="mx-auto" /> : <ChevronUp size={16} />}
          </button>
          {!collapsed && <div className="p-3"><PanelContent /></div>}
        </div>
      </div>

      {/* Mobile bottom sheet trigger */}
      <button
        onClick={() => setMobileOpen(true)}
        className="lg:hidden fixed z-[80] bottom-[72px] right-4 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 shadow-lg rounded-full px-4 py-2 text-xs font-semibold text-[#2563eb]"
      >
        Today ({dueToday.length + overdue.length})
      </button>
      {mobileOpen && (
        <div className="lg:hidden fixed inset-0 z-[85]">
          <div className="absolute inset-0 bg-black/40" onClick={() => setMobileOpen(false)} />
          <div className="absolute bottom-0 left-0 right-0 card rounded-b-none rounded-t-2xl p-4 max-h-[70vh] animate-fade-in-up">
            <div className="flex items-center justify-between mb-3">
              <h3 className="font-semibold text-slate-800 dark:text-slate-100">Today's Work</h3>
              <button onClick={() => setMobileOpen(false)} className="text-slate-400 text-sm">Close</button>
            </div>
            <PanelContent />
          </div>
        </div>
      )}
    </>
  );
}
