import { NavLink, useNavigate } from 'react-router-dom';
import { Home, CheckSquare, Calendar, User, Plus } from 'lucide-react';
import { useProductivity } from '../../context/ProductivityContext';

const items = [
  { to: '/', icon: Home, label: 'Home', end: true },
  { to: '/tasks', icon: CheckSquare, label: 'Tasks' },
  { to: null, icon: Plus, label: 'Add', center: true },
  { to: '/calendar', icon: Calendar, label: 'Calendar' },
  { to: '/profile', icon: User, label: 'Profile' },
];

export default function MobileBottomNav({ onQuickAction }) {
  const navigate = useNavigate();

  return (
    <nav className="lg:hidden fixed bottom-0 left-0 right-0 z-[70] bg-white dark:bg-slate-900 border-t border-slate-200 dark:border-slate-700 safe-bottom">
      <div className="flex items-center justify-around h-16 px-2">
        {items.map(({ to, icon: Icon, label, end, center }) => (
          center ? (
            <button
              key={label}
              onClick={onQuickAction}
              className="w-12 h-12 -mt-5 rounded-full bg-[#2563eb] text-white shadow-lg flex items-center justify-center hover:bg-[#1d4ed8] active:scale-95 transition-all"
              aria-label="Quick actions"
            >
              <Icon size={22} strokeWidth={2.5} />
            </button>
          ) : (
            <NavLink
              key={to}
              to={to}
              end={end}
              className={({ isActive }) =>
                `flex flex-col items-center gap-0.5 px-3 py-1 text-[10px] font-medium transition-colors
                ${isActive ? 'text-[#2563eb]' : 'text-slate-500 dark:text-slate-400'}`
              }
            >
              <Icon size={20} strokeWidth={1.75} />
              {label}
            </NavLink>
          )
        ))}
      </div>
    </nav>
  );
}
