import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useProductivity } from '../context/ProductivityContext';
import { useAuth } from '../context/AuthContext';

export function useKeyboardShortcuts({ onQuickAction }) {
  const navigate = useNavigate();
  const { prefs, setCommandOpen } = useProductivity();
  const { user } = useAuth();

  useEffect(() => {
    if (!prefs.keyboard_shortcuts) return;

    const handler = (e) => {
      const tag = e.target.tagName;
      const typing = tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT' || e.target.isContentEditable;
      if (typing) return;

      const mod = e.metaKey || e.ctrlKey;

      if (mod && e.key === 'k') {
        e.preventDefault();
        setCommandOpen(true);
        return;
      }
      if (e.key === 'Escape') {
        setCommandOpen(false);
        return;
      }
      if (mod) return;

      switch (e.key.toLowerCase()) {
        case 'n':
          e.preventDefault();
          onQuickAction?.('personal');
          break;
        case 'a':
          e.preventDefault();
          onQuickAction?.('assign');
          break;
        case 'p':
          e.preventDefault();
          navigate('/projects');
          break;
        case 't':
          e.preventDefault();
          navigate('/tasks');
          break;
        default:
          break;
      }
    };

    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [prefs.keyboard_shortcuts, setCommandOpen, navigate, onQuickAction, user?.role]);
}
