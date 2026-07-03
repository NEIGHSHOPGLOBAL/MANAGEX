import {
  LayoutDashboard, CheckSquare, FolderKanban, Calendar,
  Users, HardDrive, Settings, X, LogOut, Bug, Video,
} from 'lucide-react';
import { NavLink, useNavigate } from 'react-router-dom';
import { useAuth, isManagement, isAdmin, ROLE_LABELS } from '../context/AuthContext';
import Logo from './Logo';

const navItems = [
  { to: '/', icon: LayoutDashboard, label: 'Dashboard' },
  { to: '/tasks', icon: CheckSquare, label: 'Tasks' },
  { to: '/projects', icon: FolderKanban, label: 'Projects' },
  { to: '/calendar', icon: Calendar, label: 'Calendar' },
  { to: '/meetings', icon: Video, label: 'Meetings' },
  { to: '/employees', icon: Users, label: 'Employees', management: true },
  { to: '/bug-reports', icon: Bug, label: 'Feedback', admin: true },
  { to: '/storage', icon: HardDrive, label: 'Storage', superAdmin: true },
];

function navClass(isActive) {
  return [
    'flex items-center gap-3 h-11 rounded-xl transition-colors duration-200',
    isActive
      ? 'bg-[#2563eb] text-white shadow-md shadow-blue-500/20'
      : 'text-slate-600 dark:text-slate-300 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 dark:hover:bg-slate-800 hover:text-slate-900 dark:hover:text-slate-100',
  ].join(' ');
}

export default function Sidebar({ mobile, onClose }) {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = () => {
    onClose?.();
    logout();
    navigate('/login', { replace: true });
  };

  const filtered = navItems.filter((item) => {
    if (item.superAdmin) return user?.role === 'super_admin';
    if (item.admin) return isAdmin(user?.role);
    if (item.management) return isManagement(user?.role);
    return true;
  });

  /* Desktop: collapses to icons, expands on hover */
  if (!mobile) {
    return (
      <aside
        className="sidebar-expand group/sidebar h-screen bg-white dark:bg-slate-900 dark:bg-slate-900 border-r border-slate-200 dark:border-slate-700/80 dark:border-slate-700/80 flex flex-col shrink-0 sticky top-0 z-40 overflow-hidden transition-[width,box-shadow] duration-300 ease-in-out hover:shadow-xl dark:hover:shadow-black/20"
      >
        {/* Logo */}
        <div className="flex items-center h-[72px] px-4 border-b border-slate-100 dark:border-slate-800/80 dark:border-slate-800 shrink-0">
          <NavLink to="/" className="flex items-center gap-3 min-w-0 hover:opacity-90 transition-opacity">
            <Logo size={38} />
            <span className="sidebar-label text-[15px] font-bold text-slate-800 dark:text-slate-100 dark:text-slate-100 tracking-tight">
              ManageX
            </span>
          </NavLink>
        </div>

        {/* Nav */}
        <nav className="flex-1 flex flex-col gap-1 px-3 py-4 overflow-y-auto overflow-x-hidden">
          {filtered.map(({ to, icon: Icon, label }) => (
            <NavLink
              key={to}
              to={to}
              end={to === '/'}
              className={({ isActive }) => `${navClass(isActive)} px-3`}
            >
              <span className="w-5 h-5 flex items-center justify-center shrink-0">
                <Icon size={20} strokeWidth={1.75} />
              </span>
              <span className="sidebar-label text-sm font-medium">{label}</span>
            </NavLink>
          ))}
        </nav>

        {/* Settings */}
        <div className="px-3 py-4 border-t border-slate-100 dark:border-slate-800 shrink-0 space-y-1">
          <NavLink
            to="/profile"
            className={({ isActive }) => `${navClass(isActive)} px-3`}
          >
            <span className="w-5 h-5 flex items-center justify-center shrink-0">
              <Settings size={20} strokeWidth={1.75} />
            </span>
            <span className="sidebar-label text-sm font-medium">Settings</span>
          </NavLink>
          <button
            type="button"
            onClick={handleLogout}
            className="w-full flex items-center gap-3 h-11 rounded-xl px-3 text-sm font-medium text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-950/30 transition-colors"
          >
            <span className="w-5 h-5 flex items-center justify-center shrink-0">
              <LogOut size={20} strokeWidth={1.75} />
            </span>
            <span className="sidebar-label">Log out</span>
          </button>
        </div>
      </aside>
    );
  }

  /* Mobile: full drawer */
  return (
    <aside className="w-[280px] max-w-[85vw] h-full bg-white dark:bg-slate-900 dark:bg-slate-900 flex flex-col shadow-2xl">
      <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100 dark:border-slate-800 dark:border-slate-800">
        <Logo size={36} showText />
        <button
          onClick={onClose}
          className="p-2 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 dark:hover:bg-slate-800 text-slate-500 dark:text-slate-400 dark:text-slate-400"
          aria-label="Close menu"
        >
          <X size={20} />
        </button>
      </div>

      <div className="px-5 py-4 border-b border-slate-100 dark:border-slate-800 dark:border-slate-800">
        <p className="text-sm font-semibold text-slate-800 dark:text-slate-100 dark:text-slate-100">{user?.name}</p>
        <p className="text-xs text-slate-500 dark:text-slate-400 dark:text-slate-400">{ROLE_LABELS[user?.role]}</p>
      </div>

      <nav className="flex-1 overflow-y-auto px-3 py-4 space-y-1">
        {filtered.map(({ to, icon: Icon, label }) => (
          <NavLink
            key={to}
            to={to}
            end={to === '/'}
            onClick={onClose}
            className={({ isActive }) => `${navClass(isActive)} px-4`}
          >
            <Icon size={18} strokeWidth={1.75} className="shrink-0" />
            <span className="text-sm font-medium">{label}</span>
          </NavLink>
        ))}
      </nav>

      <div className="px-3 py-4 border-t border-slate-100 dark:border-slate-800 space-y-1">
        <NavLink
          to="/profile"
          onClick={onClose}
          className={({ isActive }) => `${navClass(isActive)} px-4`}
        >
          <Settings size={18} strokeWidth={1.75} />
          <span className="text-sm font-medium">Profile & Settings</span>
        </NavLink>
        <button
          type="button"
          onClick={handleLogout}
          className="w-full flex items-center gap-3 px-4 h-11 rounded-xl text-sm font-medium text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-950/30"
        >
          <LogOut size={18} strokeWidth={1.75} />
          Log out
        </button>
      </div>
    </aside>
  );
}
