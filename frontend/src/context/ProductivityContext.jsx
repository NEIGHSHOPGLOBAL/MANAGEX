import { createContext, useCallback, useContext, useEffect, useState } from 'react';
import { api } from '../api/client';
import { useAuth } from './AuthContext';

export const DEFAULT_PREFS = {
  sticky_today_panel: false,
  quick_notes_widget: false,
  keyboard_shortcuts: true,
  desktop_notifications: false,
  compact_ui: false,
  sound_notifications: true,
  dashboard_widgets: true,
  today_panel_collapsed: false,
  task_filter: 'all',
  hidden_widgets: [],
  widget_order: ['continue', 'main', 'sidebar'],
};

const ProductivityContext = createContext(null);

export function ProductivityProvider({ children }) {
  const { user } = useAuth();
  const [prefs, setPrefs] = useState(DEFAULT_PREFS);
  const [loaded, setLoaded] = useState(false);
  const [commandOpen, setCommandOpen] = useState(false);
  const [quickModal, setQuickModal] = useState(null); // 'personal' | 'assign' | 'project' | 'note'

  useEffect(() => {
    if (!user) {
      setLoaded(true);
      return;
    }
    api.getPreferences()
      .then((d) => setPrefs({ ...DEFAULT_PREFS, ...d.preferences }))
      .catch(() => setPrefs(DEFAULT_PREFS))
      .finally(() => setLoaded(true));
  }, [user]);

  useEffect(() => {
    document.documentElement.classList.toggle('compact-ui', !!prefs.compact_ui);
    return () => document.documentElement.classList.remove('compact-ui');
  }, [prefs.compact_ui]);

  const updatePref = useCallback(async (updates) => {
    setPrefs((p) => ({ ...p, ...updates }));
    try {
      localStorage.setItem('managex-prefs-sync', JSON.stringify({ ...updates, _ts: Date.now() }));
      await api.updatePreferences(updates);
    } catch (e) {
      console.error(e);
    }
  }, []);

  useEffect(() => {
    const onStorage = (e) => {
      if (e.key !== 'managex-prefs-sync' || !e.newValue) return;
      try {
        const { _ts, ...updates } = JSON.parse(e.newValue);
        setPrefs((p) => ({ ...p, ...updates }));
      } catch {
        /* ignore */
      }
    };
    window.addEventListener('storage', onStorage);
    return () => window.removeEventListener('storage', onStorage);
  }, []);

  return (
    <ProductivityContext.Provider value={{
      prefs, loaded, updatePref, commandOpen, setCommandOpen,
      quickModal, setQuickModal,
    }}>
      {children}
    </ProductivityContext.Provider>
  );
}

export function useProductivity() {
  return useContext(ProductivityContext);
}
