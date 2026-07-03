import { useState } from 'react';
import { Bell, Menu, Search, Plus, ChevronDown, ExternalLink, CheckCircle, XCircle, LogOut, Megaphone } from 'lucide-react';
import { Link, useNavigate } from 'react-router-dom';
import { api } from '../api/client';
import { useAuth, ROLE_LABELS, canAnnounce } from '../context/AuthContext';
import { useNotifications } from '../context/NotificationContext';
import ThemeToggle from './ThemeToggle';
import Logo from './Logo';
import AnnouncementModal from './AnnouncementModal';

function getGreeting() {
  const h = new Date().getHours();
  if (h < 12) return 'Good morning';
  if (h < 17) return 'Good afternoon';
  return 'Good evening';
}

export default function Header({ onMenuClick, onQuickAction, onCommandPalette }) {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const { notifications, unread, markRead, markAllRead, refresh } = useNotifications();
  const [showNotifs, setShowNotifs] = useState(false);
  const [showProfile, setShowProfile] = useState(false);
  const [announceOpen, setAnnounceOpen] = useState(false);
  const firstName = user?.name?.split(' ')[0] || 'there';

  const markAllReadHandler = async () => {
    await markAllRead();
  };

  const handleLogout = () => {
    setShowProfile(false);
    logout();
    navigate('/login', { replace: true });
  };

  const handleNotifAction = async (n, action) => {
    if (action === 'read') {
      await markRead(n.id);
    } else if (action === 'verify' && n.entity_id) {
      await api.verifyTask(n.entity_id, true);
      await markRead(n.id);
      setShowNotifs(false);
      navigate(`/tasks/${n.entity_id}`);
    } else if (action === 'reject' && n.entity_id) {
      await api.verifyTask(n.entity_id, false);
      await markRead(n.id);
      setShowNotifs(false);
    } else if (action === 'open' && n.entity_type === 'task' && n.entity_id) {
      await markRead(n.id);
      setShowNotifs(false);
      navigate(`/tasks/${n.entity_id}`);
    } else if (action === 'open' && n.entity_type === 'project' && n.entity_id) {
      setShowNotifs(false);
      navigate(`/projects/${n.entity_id}`);
    } else if (action === 'open' && n.entity_type === 'meeting' && n.entity_id) {
      await markRead(n.id);
      setShowNotifs(false);
      navigate('/meetings');
    } else if (action === 'open' && n.entity_type === 'bug_report' && n.entity_id) {
      await markRead(n.id);
      setShowNotifs(false);
      navigate('/bug-reports');
    }
  };

  return (
    <header className="h-16 bg-white dark:bg-slate-900 dark:bg-slate-900 border-b border-slate-200 dark:border-slate-700/80 dark:border-slate-700/80 shrink-0 z-30">
      <div className="h-full flex items-center gap-3 px-4 lg:px-5">
        {/* Mobile menu */}
        <button
          onClick={onMenuClick}
          className="lg:hidden p-2 -ml-1 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-300 dark:text-slate-300 shrink-0"
          aria-label="Open menu"
        >
          <Menu size={22} />
        </button>

        {/* Mobile logo */}
        <Link to="/" className="lg:hidden shrink-0">
          <Logo size={34} />
        </Link>

        {/* Greeting — desktop only (logo is in sidebar) */}
        <div className="hidden lg:block min-w-0 mr-2">
          <h1 className="text-[15px] font-semibold text-slate-800 dark:text-slate-100 dark:text-slate-100 leading-tight truncate">
            {getGreeting()}, {firstName}!
          </h1>
          <p className="text-xs text-slate-500 dark:text-slate-400 dark:text-slate-400 truncate">
            {unread > 0
              ? `${unread} new notification${unread > 1 ? 's' : ''}`
              : 'Your workspace is ready'}
          </p>
        </div>

        {/* Search */}
        <div className="relative flex-1 min-w-0 max-w-lg mx-auto hidden md:block" onClick={onCommandPalette}>
          <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
          <div
            className="w-full text-sm border border-slate-200 dark:border-slate-700 dark:border-slate-600 rounded-xl pl-10 pr-4 py-2 bg-slate-50 dark:bg-slate-800/50 dark:bg-slate-800 text-slate-400 dark:text-slate-500 dark:text-slate-400 cursor-pointer hover:border-[#2563eb]/30 transition-all"
          >
            Search tasks, projects...
          </div>
        </div>

        {/* Actions */}
        <div className="flex items-center gap-1 sm:gap-2 ml-auto shrink-0">
          <ThemeToggle className="hidden sm:flex" />

          <button
            onClick={onQuickAction}
            className="btn-primary flex items-center gap-1.5 py-2 px-3 sm:px-3.5 text-sm whitespace-nowrap"
          >
            <Plus size={16} strokeWidth={2.5} />
            <span className="hidden sm:inline">Add Task</span>
          </button>

          {canAnnounce(user?.role) && (
            <button
              type="button"
              onClick={() => { setAnnounceOpen(true); setShowNotifs(false); setShowProfile(false); }}
              className="p-2 rounded-xl hover:bg-amber-50 dark:hover:bg-amber-950/30 text-amber-600 dark:text-amber-400"
              title="Send announcement"
              aria-label="Send announcement"
            >
              <Megaphone size={18} />
            </button>
          )}

          <div className="relative">
            <button
              onClick={() => { setShowNotifs(!showNotifs); setShowProfile(false); }}
              className="relative p-2 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 dark:hover:bg-slate-800 text-slate-500 dark:text-slate-400 dark:text-slate-400"
              aria-label="Notifications"
            >
              <Bell size={18} />
              {unread > 0 && (
                <span className="absolute top-1 right-1 min-w-[16px] h-4 px-0.5 bg-red-500 text-white text-[9px] font-bold rounded-full flex items-center justify-center ring-2 ring-white dark:ring-slate-900">
                  {unread > 9 ? '9+' : unread}
                </span>
              )}
            </button>
            {showNotifs && (
              <>
                <div className="fixed inset-0 z-40" onClick={() => setShowNotifs(false)} />
                <div className="absolute right-0 top-full mt-2 w-80 card shadow-xl z-50 max-h-96 overflow-y-auto">
                  <div className="flex items-center justify-between p-4 border-b border-slate-100 dark:border-slate-800 dark:border-slate-800">
                    <span className="text-sm font-semibold text-slate-800 dark:text-slate-100 dark:text-slate-100">Notifications</span>
                    {unread > 0 && (
                      <button onClick={markAllReadHandler} className="text-xs text-[#2563eb] font-medium hover:underline">
                        Mark all read
                      </button>
                    )}
                  </div>
                  {notifications.length === 0 ? (
                    <p className="p-6 text-sm text-slate-400 text-center">No notifications yet</p>
                  ) : (
                    notifications.map((n) => (
                      <div
                        key={n.id}
                        className={`p-3.5 border-b border-slate-50 dark:border-slate-800 text-sm ${!n.is_read ? 'bg-blue-50/50 dark:bg-blue-950/30' : ''}`}
                      >
                        <p className="font-medium text-slate-700 dark:text-slate-200 dark:text-slate-200">
                          {n.notification_type === 'announcement' && (
                            <Megaphone size={12} className="inline mr-1 text-amber-500" />
                          )}
                          {n.title}
                        </p>
                        <p className="text-slate-500 dark:text-slate-400 dark:text-slate-400 text-xs mt-0.5">{n.message}</p>
                        <div className="flex flex-wrap gap-1.5 mt-2">
                          {n.entity_type === 'task' && n.entity_id && (
                            <button onClick={() => handleNotifAction(n, 'open')} className="text-[10px] font-medium px-2 py-1 rounded-md bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800 dark:bg-slate-800/50 flex items-center gap-1">
                              <ExternalLink size={10} /> Open Task
                            </button>
                          )}
                          {n.entity_type === 'meeting' && (
                            <button onClick={() => handleNotifAction(n, 'open')} className="text-[10px] font-medium px-2 py-1 rounded-md bg-purple-50 text-purple-700 hover:bg-purple-100 flex items-center gap-1">
                              <ExternalLink size={10} /> Meetings
                            </button>
                          )}
                          {(n.entity_type === 'bug_report' || n.notification_type === 'feature_suggestion') && (
                            <button onClick={() => handleNotifAction(n, 'open')} className="text-[10px] font-medium px-2 py-1 rounded-md bg-amber-50 text-amber-700 hover:bg-amber-100 flex items-center gap-1">
                              <ExternalLink size={10} /> View Report
                            </button>
                          )}
                          {n.notification_type === 'pending_verification' && n.entity_id && (
                            <>
                              <button onClick={() => handleNotifAction(n, 'verify')} className="text-[10px] font-medium px-2 py-1 rounded-md bg-green-50 text-green-700 hover:bg-green-100 flex items-center gap-1">
                                <CheckCircle size={10} /> Verify
                              </button>
                              <button onClick={() => handleNotifAction(n, 'reject')} className="text-[10px] font-medium px-2 py-1 rounded-md bg-red-50 text-red-700 hover:bg-red-100 flex items-center gap-1">
                                <XCircle size={10} /> Reject
                              </button>
                            </>
                          )}
                          {!n.is_read && (
                            <button onClick={() => handleNotifAction(n, 'read')} className="text-[10px] font-medium px-2 py-1 rounded-md text-slate-500 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800">
                              Mark read
                            </button>
                          )}
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </>
            )}
          </div>

          <div className="relative">
            <button
              onClick={() => { setShowProfile(!showProfile); setShowNotifs(false); }}
              className="flex items-center gap-2 p-1 pr-2 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 dark:hover:bg-slate-800"
            >
              <div className="w-8 h-8 rounded-full overflow-hidden shrink-0 ring-2 ring-slate-100 dark:ring-slate-700">
                {user?.profile_photo ? (
                  <img src={user.profile_photo} alt="" className="w-full h-full object-cover" />
                ) : (
                  <div className="w-full h-full bg-gradient-to-br from-[#1a365d] to-[#2563eb] flex items-center justify-center text-white text-xs font-semibold">
                    {user?.name?.charAt(0)}
                  </div>
                )}
              </div>
              <div className="hidden xl:block text-left max-w-[120px]">
                <p className="text-xs font-semibold text-slate-700 dark:text-slate-200 dark:text-slate-200 truncate">{user?.name}</p>
                <p className="text-[10px] text-slate-400 dark:text-slate-500 dark:text-slate-400 truncate">{ROLE_LABELS[user?.role]}</p>
              </div>
              <ChevronDown size={14} className="text-slate-400 hidden sm:block" />
            </button>
            {showProfile && (
              <>
                <div className="fixed inset-0 z-40" onClick={() => setShowProfile(false)} />
                <div className="absolute right-0 top-full mt-2 w-52 card shadow-xl z-50 py-1">
                  <Link to="/profile" onClick={() => setShowProfile(false)} className="block px-4 py-2.5 text-sm text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800">
                    Profile & Settings
                  </Link>
                  <Link to="/profile" onClick={() => setShowProfile(false)} className="block px-4 py-2.5 text-sm text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800">
                    Change Password
                  </Link>
                  <div className="border-t border-slate-100 dark:border-slate-800 my-1" />
                  <button
                    type="button"
                    onClick={handleLogout}
                    className="w-full text-left px-4 py-2.5 text-sm text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-950/30 flex items-center gap-2"
                  >
                    <LogOut size={15} />
                    Log out
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      </div>
      <AnnouncementModal
        open={announceOpen}
        onClose={() => setAnnounceOpen(false)}
        onSent={() => refresh()}
      />
    </header>
  );
}
