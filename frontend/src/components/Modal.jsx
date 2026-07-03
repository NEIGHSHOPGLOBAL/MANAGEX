import { useEffect } from 'react';
import { createPortal } from 'react-dom';
import { X } from 'lucide-react';

export default function Modal({ open, onClose, title, children, wide }) {
  useEffect(() => {
    if (!open) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => { document.body.style.overflow = prev; };
  }, [open]);

  if (!open) return null;

  return createPortal(
    <div className="fixed inset-0 z-[200] flex items-end sm:items-center justify-center p-0 sm:p-4">
      <div
        className="absolute inset-0 bg-black/40 backdrop-blur-[2px]"
        onClick={onClose}
        aria-hidden="true"
      />
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="modal-title"
        className={`relative card w-full ${wide ? 'max-w-2xl' : 'max-w-lg'} max-h-[100dvh] sm:max-h-[90dvh] flex flex-col shadow-2xl animate-scale-in rounded-none sm:rounded-xl`}
      >
        <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100 dark:border-slate-800 dark:border-slate-800 shrink-0">
          <h2 id="modal-title" className="text-lg font-semibold text-slate-800 dark:text-slate-100 dark:text-slate-100">{title}</h2>
          <button
            onClick={onClose}
            className="p-2 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 dark:hover:bg-slate-800 text-slate-400 transition-colors"
            aria-label="Close"
          >
            <X size={18} />
          </button>
        </div>
        <div className="overflow-y-auto overscroll-contain px-5 py-4 flex-1 min-h-0">
          {children}
        </div>
      </div>
    </div>,
    document.body,
  );
}
