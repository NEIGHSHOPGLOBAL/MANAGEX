import { useEffect, useState } from 'react';
import { Download, X } from 'lucide-react';

export default function PWAInstallPrompt() {
  if (window.managexDesktop?.isDesktop) return null;
  const [prompt, setPrompt] = useState(null);
  const [dismissed, setDismissed] = useState(() => localStorage.getItem('pwa-install-dismissed') === '1');

  useEffect(() => {
    const handler = (e) => {
      e.preventDefault();
      setPrompt(e);
    };
    window.addEventListener('beforeinstallprompt', handler);
    return () => window.removeEventListener('beforeinstallprompt', handler);
  }, []);

  if (!prompt || dismissed) return null;

  const install = async () => {
    prompt.prompt();
    await prompt.userChoice;
    setPrompt(null);
  };

  return (
    <div className="fixed bottom-24 lg:bottom-6 left-4 right-4 lg:left-auto lg:right-24 lg:w-80 z-[75] card p-4 shadow-xl animate-fade-in-up">
      <button onClick={() => { setDismissed(true); localStorage.setItem('pwa-install-dismissed', '1'); }} className="absolute top-2 right-2 p-1 text-slate-400 hover:text-slate-600 dark:text-slate-300">
        <X size={16} />
      </button>
      <div className="flex items-start gap-3">
        <img src="/managex_logo.png" alt="" className="w-10 h-10 rounded-full" />
        <div>
          <p className="text-sm font-semibold text-slate-800 dark:text-slate-100">Install ManageX</p>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">Install as a desktop app for quick access from your dock</p>
          <button onClick={install} className="btn-brand mt-2 text-xs py-1.5 px-3 flex items-center gap-1.5">
            <Download size={14} /> Install App
          </button>
        </div>
      </div>
    </div>
  );
}
