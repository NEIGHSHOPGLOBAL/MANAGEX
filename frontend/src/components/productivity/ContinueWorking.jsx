import { Link } from 'react-router-dom';
import { RotateCcw, CheckSquare, FolderKanban } from 'lucide-react';
import { getRecentItems } from '../../hooks/useRecentItems';

export default function ContinueWorking() {
  const items = getRecentItems();
  if (items.length === 0) return null;

  const icon = (type) => type === 'project' ? FolderKanban : CheckSquare;

  return (
    <div className="card p-4 mb-5 animate-fade-in">
      <h3 className="text-sm font-semibold text-slate-800 dark:text-slate-100 flex items-center gap-2 mb-3">
        <RotateCcw size={16} className="text-[#2563eb]" /> Continue Working
      </h3>
      <div className="flex gap-2 overflow-x-auto pb-1">
        {items.map((item) => {
          const Icon = icon(item.type);
          return (
            <Link
              key={`${item.type}-${item.id}`}
              to={item.path}
              className="flex items-center gap-2 shrink-0 px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-800/50 hover:bg-blue-50 border border-slate-100 dark:border-slate-800 hover:border-blue-100 transition-colors text-sm"
            >
              <Icon size={14} className="text-[#2563eb]" />
              <span className="font-medium text-slate-700 dark:text-slate-200 max-w-[140px] truncate">{item.title}</span>
            </Link>
          );
        })}
      </div>
    </div>
  );
}
