import Logo from './Logo';

export default function LoadingScreen({ message = 'Loading your workspace...' }) {
  return (
    <div className="fixed inset-0 z-[100] bg-[#f4f6f9] dark:bg-slate-950 flex flex-col items-center justify-center">
      <div className="relative mb-8">
        <div className="absolute inset-0 rounded-full bg-[#2563eb]/10 animate-ping" style={{ animationDuration: '2s' }} />
        <div className="relative animate-logo-pulse">
          <Logo size={80} />
        </div>
      </div>
      <h2 className="text-lg font-semibold text-slate-800 dark:text-slate-100 dark:text-slate-100 mb-1 animate-fade-in">ManageX</h2>
      <p className="text-sm text-slate-500 dark:text-slate-400 dark:text-slate-400 mb-6 animate-fade-in">{message}</p>
      <div className="w-48 h-1 bg-slate-200 dark:bg-slate-700 rounded-full overflow-hidden">
        <div
          className="h-full bg-gradient-to-r from-[#1a365d] via-[#2563eb] to-[#06b6d4] rounded-full"
          style={{ animation: 'progressBar 1.8s ease-in-out infinite' }}
        />
      </div>
    </div>
  );
}
