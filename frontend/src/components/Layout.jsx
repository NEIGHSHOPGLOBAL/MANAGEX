import { useState } from 'react';
import { Outlet, useNavigate } from 'react-router-dom';
import Sidebar from './Sidebar';
import Header from './Header';
import Modal from './Modal';
import QuickActionForm from './QuickActionForm';
import PageTransition from './PageTransition';
import CommandPalette from './productivity/CommandPalette';
import QuickNoteModal from './productivity/QuickNoteModal';
import MobileBottomNav from './productivity/MobileBottomNav';
import PWAInstallPrompt from './productivity/PWAInstallPrompt';
import PWAUpdatePrompt from './productivity/PWAUpdatePrompt';
import { useProductivity } from '../context/ProductivityContext';
import { useAuth } from '../context/AuthContext';
import { useKeyboardShortcuts } from '../hooks/useKeyboardShortcuts';
import { useFirebaseMessaging } from '../hooks/useFirebaseMessaging';

export default function Layout() {
  const [mobileOpen, setMobileOpen] = useState(false);
  const [quickOpen, setQuickOpen] = useState(false);
  const [noteOpen, setNoteOpen] = useState(false);
  const [quickDefault, setQuickDefault] = useState('personal');
  const navigate = useNavigate();
  const { user } = useAuth();
  const { setCommandOpen, prefs } = useProductivity();
  useFirebaseMessaging(user, !!prefs.desktop_notifications);

  const openQuick = (action = 'personal') => {
    if (action === 'note') {
      setNoteOpen(true);
      return;
    }
    setQuickDefault(action);
    setQuickOpen(true);
  };

  useKeyboardShortcuts({ onQuickAction: openQuick });

  return (
    <div className="flex min-h-screen bg-[#f4f6f9] dark:bg-slate-950">
      <div className="hidden lg:block">
        <Sidebar />
      </div>

      {mobileOpen && (
        <div className="fixed inset-0 z-50 lg:hidden">
          <div className="absolute inset-0 bg-black/40 backdrop-blur-[2px]" onClick={() => setMobileOpen(false)} />
          <div className="absolute inset-y-0 left-0 animate-fade-in">
            <Sidebar mobile onClose={() => setMobileOpen(false)} />
          </div>
        </div>
      )}

      <div className="flex-1 flex flex-col min-w-0 min-h-screen">
        <Header
          onMenuClick={() => setMobileOpen(true)}
          onQuickAction={() => openQuick('assign')}
          onCommandPalette={() => setCommandOpen(true)}
        />
        <main className="flex-1 overflow-y-auto overflow-x-hidden pb-20 lg:pb-6">
          <div className="p-4 lg:p-6 max-w-[1600px] mx-auto w-full">
            <PageTransition>
              <Outlet />
            </PageTransition>
          </div>
        </main>
      </div>

      <CommandPalette onQuickAction={openQuick} />
      <MobileBottomNav onQuickAction={() => openQuick('personal')} />
      <PWAInstallPrompt />
      <PWAUpdatePrompt />

      <Modal open={quickOpen} onClose={() => setQuickOpen(false)} title="Quick Action" wide>
        <QuickActionForm
          defaultAction={quickDefault}
          onDone={(path) => { setQuickOpen(false); if (path) navigate(path); }}
        />
      </Modal>

      <QuickNoteModal open={noteOpen} onClose={() => setNoteOpen(false)} />
    </div>
  );
}
