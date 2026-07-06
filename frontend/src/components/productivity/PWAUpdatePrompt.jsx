import { useCallback, useState } from 'react';
import { RefreshCw } from 'lucide-react';
import { useRegisterSW } from 'virtual:pwa-register/react';

export default function PWAUpdatePrompt() {
  if (window.managexDesktop?.isDesktop) return null;
  return <PWAUpdatePromptInner />;
}

function PWAUpdatePromptInner() {
  const [updating, setUpdating] = useState(false);
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

  const handleRefresh = useCallback(async () => {
    if (updating) return;
    setUpdating(true);

    let reloaded = false;
    const reload = () => {
      if (reloaded) return;
      reloaded = true;
      window.location.reload();
    };

    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.addEventListener('controllerchange', reload, { once: true });
    }

    try {
      await updateServiceWorker(true);
    } catch {
      /* Some mobile browsers reject or hang on updateServiceWorker */
    }

    // iOS/Android PWAs often never auto-reload after SW activation
    setTimeout(reload, 1200);
  }, [updating, updateServiceWorker]);

  if (!needRefresh) return null;

  return (
    <div
      className="fixed z-[300] inset-x-4 bottom-[5.5rem] lg:bottom-auto lg:top-4 lg:left-1/2 lg:right-auto lg:-translate-x-1/2 lg:inset-x-auto max-w-md lg:max-w-none mx-auto"
      role="alert"
    >
      <div className="card px-4 py-3 shadow-xl animate-fade-in flex flex-col sm:flex-row sm:items-center gap-3">
        <p className="text-sm text-slate-700 dark:text-slate-200 flex-1">
          A new version is available
        </p>
        <div className="flex items-center gap-2 shrink-0">
          <button
            type="button"
            disabled={updating}
            onClick={handleRefresh}
            className="btn-brand text-xs py-2.5 px-4 flex-1 sm:flex-none min-h-[44px] flex items-center justify-center gap-1.5 touch-manipulation disabled:opacity-60"
          >
            <RefreshCw size={14} className={updating ? 'animate-spin' : ''} />
            {updating ? 'Updating…' : 'Refresh'}
          </button>
          <button
            type="button"
            disabled={updating}
            onClick={() => setNeedRefresh(false)}
            className="text-xs text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 min-h-[44px] px-3 touch-manipulation"
          >
            Later
          </button>
        </div>
      </div>
    </div>
  );
}
