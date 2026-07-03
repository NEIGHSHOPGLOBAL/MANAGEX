import { RefreshCw } from 'lucide-react';
import { useRegisterSW } from 'virtual:pwa-register/react';

export default function PWAUpdatePrompt() {
  if (window.managexDesktop?.isDesktop) return null;
  return <PWAUpdatePromptInner />;
}

function PWAUpdatePromptInner() {
  const {
    needRefresh: [needRefresh, setNeedRefresh],
    updateServiceWorker,
  } = useRegisterSW({
    onRegisteredSW(_swUrl, registration) {
      if (registration) {
        setInterval(() => registration.update(), 60 * 60 * 1000);
      }
    },
  });

  if (!needRefresh) return null;

  return (
    <div className="fixed top-4 left-1/2 -translate-x-1/2 z-[300] card px-4 py-3 shadow-xl flex items-center gap-3 animate-fade-in">
      <p className="text-sm text-slate-700 dark:text-slate-200">A new version is available</p>
      <button
        onClick={() => updateServiceWorker(true)}
        className="btn-brand text-xs py-1.5 px-3 flex items-center gap-1.5"
      >
        <RefreshCw size={14} /> Refresh
      </button>
      <button onClick={() => setNeedRefresh(false)} className="text-xs text-slate-400 hover:text-slate-600 dark:text-slate-300">Later</button>
    </div>
  );
}
