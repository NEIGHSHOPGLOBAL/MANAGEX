import { createContext, useCallback, useContext, useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Bell, X } from 'lucide-react';
import { api } from '../api/client';
import { useAuth } from './AuthContext';
import { useProductivity } from './ProductivityContext';
import { playNotificationSound } from '../utils/notificationSound';

const NotificationContext = createContext(null);

function getNotifPath(n) {
  if (n.entity_type === 'task' && n.entity_id) return `/tasks/${n.entity_id}`;
  if (n.entity_type === 'meeting') return '/meetings';
  if (n.entity_type === 'bug_report') return '/bug-reports';
  if (n.entity_type === 'project' && n.entity_id) return `/projects/${n.entity_id}`;
  return null;
}

export function NotificationProvider({ children }) {
  const { user } = useAuth();
  const { prefs } = useProductivity();
  const [notifications, setNotifications] = useState([]);
  const [toasts, setToasts] = useState([]);
  const seenIdsRef = useRef(new Set());
  const initialLoadRef = useRef(true);

  const showToast = useCallback((notification) => {
    const id = `toast-${notification.id}-${Date.now()}`;
    setToasts((prev) => [...prev.slice(-4), { ...notification, toastId: id }]);
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.toastId !== id));
    }, 6000);
  }, []);

  const processNew = useCallback((list, playSound) => {
    if (initialLoadRef.current) {
      list.forEach((n) => seenIdsRef.current.add(n.id));
      initialLoadRef.current = false;
      return;
    }
    const fresh = list.filter((n) => !seenIdsRef.current.has(n.id));
    if (fresh.length === 0) return;

    fresh.forEach((n) => {
      seenIdsRef.current.add(n.id);
      if (!n.is_read) {
        showToast(n);
      }
    });

    const hasUnread = fresh.some((n) => !n.is_read);
    if (hasUnread && playSound) {
      playNotificationSound();
    }
  }, [showToast]);

  const refresh = useCallback(async () => {
    if (!user) return;
    try {
      const list = await api.getNotifications();
      const playSound = prefs.sound_notifications !== false;
      processNew(list, playSound);
      setNotifications(list);
    } catch {
      /* ignore */
    }
  }, [user, prefs.sound_notifications, processNew]);

  useEffect(() => {
    if (!user) {
      setNotifications([]);
      seenIdsRef.current = new Set();
      initialLoadRef.current = true;
      return undefined;
    }
    refresh();
    const interval = setInterval(refresh, 25000);
    const onRefresh = () => refresh();
    window.addEventListener('managex:notifications-refresh', onRefresh);
    return () => {
      clearInterval(interval);
      window.removeEventListener('managex:notifications-refresh', onRefresh);
    };
  }, [user, refresh]);

  const markRead = async (id) => {
    await api.markNotificationRead(id);
    setNotifications((prev) => prev.map((n) => (n.id === id ? { ...n, is_read: true } : n)));
  };

  const markAllRead = async () => {
    await api.markAllNotificationsRead();
    setNotifications((prev) => prev.map((n) => ({ ...n, is_read: true })));
  };

  const dismissToast = (toastId) => {
    setToasts((prev) => prev.filter((t) => t.toastId !== toastId));
  };

  const unread = notifications.filter((n) => !n.is_read).length;

  return (
    <NotificationContext.Provider value={{
      notifications,
      unread,
      refresh,
      markRead,
      markAllRead,
    }}>
      {children}
      <NotificationToasts toasts={toasts} onDismiss={dismissToast} onRead={markRead} />
    </NotificationContext.Provider>
  );
}

function NotificationToasts({ toasts, onDismiss, onRead }) {
  const navigate = useNavigate();

  if (toasts.length === 0) return null;

  const handleClick = async (t) => {
    const path = getNotifPath(t);
    if (!t.is_read) await onRead(t.id);
    onDismiss(t.toastId);
    if (path) navigate(path);
  };

  return (
    <div className="fixed top-4 right-4 left-4 sm:left-auto z-[300] flex flex-col gap-2 pointer-events-none max-w-sm sm:ml-auto">
      {toasts.map((t) => (
        <div
          key={t.toastId}
          className="pointer-events-auto animate-fade-in-up card shadow-xl border border-blue-100 dark:border-blue-900/50 p-4 flex gap-3 cursor-pointer hover:shadow-2xl transition-shadow bg-white dark:bg-slate-900"
          onClick={() => handleClick(t)}
          role="alert"
        >
          <div className="shrink-0 w-9 h-9 rounded-full bg-[#2563eb]/10 text-[#2563eb] flex items-center justify-center">
            <Bell size={18} />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-semibold text-slate-800 dark:text-slate-100 truncate">{t.title}</p>
            <p className="text-xs text-slate-500 dark:text-slate-400 line-clamp-2 mt-0.5">{t.message}</p>
          </div>
          <button
            type="button"
            onClick={(e) => { e.stopPropagation(); onDismiss(t.toastId); }}
            className="shrink-0 p-1 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
            aria-label="Dismiss"
          >
            <X size={16} />
          </button>
        </div>
      ))}
    </div>
  );
}

export function useNotifications() {
  const ctx = useContext(NotificationContext);
  if (!ctx) throw new Error('useNotifications must be used within NotificationProvider');
  return ctx;
}
