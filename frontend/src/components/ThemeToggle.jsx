import { Moon, Sun } from 'lucide-react';
import { useTheme } from '../context/ThemeContext';

export default function ThemeToggle({ className = '', showLabel = false }) {
  const { isDark, toggleTheme } = useTheme();

  return (
    <button
      type="button"
      onClick={toggleTheme}
      className={`p-2 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-500 dark:text-slate-400 transition-colors ${className}`}
      aria-label={isDark ? 'Switch to light mode' : 'Switch to dark mode'}
      title={isDark ? 'Light mode' : 'Dark mode'}
    >
      <span className="flex items-center gap-2">
        {isDark ? <Sun size={18} /> : <Moon size={18} />}
        {showLabel && (
          <span className="text-sm font-medium">{isDark ? 'Light mode' : 'Dark mode'}</span>
        )}
      </span>
    </button>
  );
}
