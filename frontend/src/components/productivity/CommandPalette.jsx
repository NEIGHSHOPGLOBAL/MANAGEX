import { useEffect, useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Search, LayoutDashboard, CheckSquare, FolderKanban, Calendar,
  Users, UserPlus, StickyNote,
} from 'lucide-react';
import { api } from '../../api/client';
import { useAuth, isManagement } from '../../context/AuthContext';
import { useProductivity } from '../../context/ProductivityContext';

export default function CommandPalette({ onQuickAction }) {
  const { commandOpen, setCommandOpen } = useProductivity();
  const { user } = useAuth();
  const navigate = useNavigate();
  const [query, setQuery] = useState('');
  const [tasks, setTasks] = useState([]);
  const [users, setUsers] = useState([]);
  const [active, setActive] = useState(0);

  useEffect(() => {
    if (!commandOpen) { setQuery(''); setActive(0); return; }
    api.getTasks().then(setTasks).catch(() => {});
    if (isManagement(user?.role)) api.getUsers().then(setUsers).catch(() => {});
  }, [commandOpen, user?.role]);

  const actions = useMemo(() => {
    const list = [
      { id: 'nav-dash', label: 'Open Dashboard', icon: LayoutDashboard, action: () => navigate('/') },
      { id: 'nav-tasks', label: 'Open Tasks', icon: CheckSquare, action: () => navigate('/tasks') },
      { id: 'nav-projects', label: 'Open Projects', icon: FolderKanban, action: () => navigate('/projects') },
      { id: 'nav-cal', label: 'Open Calendar', icon: Calendar, action: () => navigate('/calendar') },
      { id: 'new-personal', label: 'Create Personal Task', icon: CheckSquare, action: () => onQuickAction('personal') },
    ];
    list.push({ id: 'new-assign', label: 'Assign Task', icon: UserPlus, action: () => onQuickAction('assign') });
    if (['super_admin', 'admin', 'coo'].includes(user?.role)) {
      list.push({ id: 'new-project', label: 'Create Project', icon: FolderKanban, action: () => onQuickAction('project') });
      list.push({ id: 'nav-employees', label: 'Search Employees', icon: Users, action: () => navigate('/employees') });
    }
    list.push({ id: 'quick-note', label: 'Quick Note', icon: StickyNote, action: () => onQuickAction('note') });

    const q = query.toLowerCase();
    const taskHits = tasks
      .filter((t) => t.title.toLowerCase().includes(q))
      .slice(0, 5)
      .map((t) => ({
        id: `task-${t.id}`,
        label: t.title,
        sub: t.status,
        icon: CheckSquare,
        action: () => navigate(`/tasks/${t.id}`),
      }));

    const userHits = isManagement(user?.role)
      ? users.filter((u) => u.name.toLowerCase().includes(q) || u.employee_id.toLowerCase().includes(q))
          .slice(0, 5)
          .map((u) => ({
            id: `user-${u.id}`,
            label: u.name,
            sub: u.employee_id,
            icon: Users,
            action: () => navigate('/employees'),
          }))
      : [];

    const filtered = list.filter((a) => a.label.toLowerCase().includes(q));
    return [...filtered, ...taskHits, ...userHits];
  }, [query, tasks, users, navigate, onQuickAction, user?.role]);

  useEffect(() => setActive(0), [query]);

  const run = (item) => {
    setCommandOpen(false);
    item.action();
  };

  const onKey = (e) => {
    if (e.key === 'ArrowDown') { e.preventDefault(); setActive((a) => Math.min(a + 1, actions.length - 1)); }
    if (e.key === 'ArrowUp') { e.preventDefault(); setActive((a) => Math.max(a - 1, 0)); }
    if (e.key === 'Enter' && actions[active]) { e.preventDefault(); run(actions[active]); }
    if (e.key === 'Escape') setCommandOpen(false);
  };

  if (!commandOpen) return null;

  return (
    <div className="fixed inset-0 z-[250] flex items-start justify-center pt-[15vh] px-4">
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={() => setCommandOpen(false)} />
      <div className="relative w-full max-w-lg card shadow-2xl overflow-hidden animate-scale-in">
        <div className="flex items-center gap-3 px-4 border-b border-slate-100 dark:border-slate-800">
          <Search size={18} className="text-slate-400 shrink-0" />
          <input
            autoFocus
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={onKey}
            placeholder="Search tasks, navigate, or run actions..."
            className="flex-1 py-4 text-sm bg-transparent focus:outline-none"
          />
          <kbd className="text-[10px] text-slate-400 bg-slate-100 px-1.5 py-0.5 rounded hidden sm:inline">ESC</kbd>
        </div>
        <div className="max-h-72 overflow-y-auto py-2">
          {actions.length === 0 ? (
            <p className="text-sm text-slate-400 text-center py-8">No results</p>
          ) : (
            actions.map((item, i) => (
              <button
                key={item.id}
                onClick={() => run(item)}
                className={`w-full flex items-center gap-3 px-4 py-2.5 text-left text-sm transition-colors
                  ${i === active ? 'bg-[#2563eb]/10 text-[#2563eb]' : 'text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800'}`}
              >
                <item.icon size={16} className="shrink-0 opacity-60" />
                <div className="flex-1 min-w-0">
                  <p className="font-medium truncate">{item.label}</p>
                  {item.sub && <p className="text-xs text-slate-400 truncate">{item.sub}</p>}
                </div>
              </button>
            ))
          )}
        </div>
        <div className="px-4 py-2 border-t border-slate-100 dark:border-slate-800 text-[10px] text-slate-400 flex gap-3">
          <span>↑↓ navigate</span><span>↵ select</span><span>⌘K open</span>
        </div>
      </div>
    </div>
  );
}
