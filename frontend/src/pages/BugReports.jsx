import { useEffect, useState } from 'react';
import { Bug, ImageIcon, X } from 'lucide-react';
import { api } from '../api/client';
import { SkeletonTable } from '../components/Skeleton';

function formatDate(iso) {
  if (!iso) return '';
  return new Date(iso).toLocaleString(undefined, {
    dateStyle: 'medium',
    timeStyle: 'short',
  });
}

export default function BugReports() {
  const [reports, setReports] = useState([]);
  const [loading, setLoading] = useState(true);
  const [preview, setPreview] = useState(null);
  const [typeFilter, setTypeFilter] = useState('all');

  const load = () => {
    setLoading(true);
    api.getBugReports()
      .then(setReports)
      .catch(console.error)
      .finally(() => setLoading(false));
  };

  useEffect(() => { load(); }, []);

  const toggleStatus = async (report) => {
    const next = report.status === 'open' ? 'resolved' : 'open';
    await api.updateBugReport(report.id, { status: next });
    load();
  };

  const openCount = reports.filter((r) => r.status === 'open').length;
  const filtered = reports.filter((r) => typeFilter === 'all' || r.report_type === typeFilter);

  if (loading) {
    return (
      <div className="space-y-4">
        <div>
          <h1 className="text-xl font-bold text-slate-800 dark:text-slate-100">Bug Reports</h1>
          <p className="text-sm text-slate-500 dark:text-slate-400">Reports submitted by team members</p>
        </div>
        <SkeletonTable rows={5} cols={4} />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-xl font-bold text-slate-800 dark:text-slate-100">Feedback</h1>
          <p className="text-sm text-slate-500 dark:text-slate-400">Bug reports & feature suggestions from the team</p>
        </div>
        {openCount > 0 && (
          <span className="badge bg-amber-50 text-amber-700 dark:bg-amber-950/40 dark:text-amber-400">
            {openCount} open
          </span>
        )}
      </div>

      <div className="flex gap-2 flex-wrap">
        {[
          { id: 'all', label: 'All' },
          { id: 'bug', label: 'Bugs' },
          { id: 'feature', label: 'Features' },
        ].map((f) => (
          <button
            key={f.id}
            type="button"
            onClick={() => setTypeFilter(f.id)}
            className={`text-xs px-3 py-1.5 rounded-lg font-medium
              ${typeFilter === f.id ? 'bg-[#2563eb] text-white' : 'bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-slate-600'}`}
          >
            {f.label}
          </button>
        ))}
      </div>

      {filtered.length === 0 ? (
        <div className="card p-8 text-center">
          <Bug size={32} className="mx-auto text-slate-300 dark:text-slate-600 mb-3" />
          <p className="text-sm text-slate-500 dark:text-slate-400">No bug reports yet</p>
        </div>
      ) : (
        <div className="space-y-3">
          {filtered.map((report) => (
            <div key={report.id} className="card p-4">
              <div className="flex flex-wrap items-start justify-between gap-2 mb-2">
                <div>
                  <p className="text-sm font-semibold text-slate-800 dark:text-slate-100">
                    {report.user?.name}
                    <span className="font-normal text-slate-400 ml-2">{report.user?.employee_id}</span>
                  </p>
                  <p className="text-xs text-slate-500 dark:text-slate-400">{formatDate(report.created_at)}</p>
                </div>
                <div className="flex items-center gap-2">
                  <span className={`badge ${report.report_type === 'feature' ? 'bg-indigo-50 text-indigo-700' : 'bg-red-50 text-red-700'}`}>
                    {report.report_type === 'feature' ? 'Feature' : 'Bug'}
                  </span>
                  <span className={`badge ${report.status === 'open' ? 'bg-amber-50 text-amber-700 dark:bg-amber-950/40 dark:text-amber-400' : 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-400'}`}>
                    {report.status === 'open' ? 'Open' : 'Resolved'}
                  </span>
                  <button
                    type="button"
                    onClick={() => toggleStatus(report)}
                    className="text-xs px-2.5 py-1 rounded-lg border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800"
                  >
                    Mark {report.status === 'open' ? 'resolved' : 'open'}
                  </button>
                </div>
              </div>
              <p className="text-sm text-slate-700 dark:text-slate-200 whitespace-pre-wrap">{report.description}</p>
              {report.screenshot?.url && (
                <button
                  type="button"
                  onClick={() => setPreview(report.screenshot)}
                  className="mt-3 inline-flex items-center gap-2 text-sm text-[#2563eb] hover:underline"
                >
                  <ImageIcon size={14} />
                  View screenshot
                </button>
              )}
            </div>
          ))}
        </div>
      )}

      {preview && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4"
          onClick={() => setPreview(null)}
        >
          <div className="relative max-w-4xl max-h-[90vh] w-full" onClick={(e) => e.stopPropagation()}>
            <button
              type="button"
              onClick={() => setPreview(null)}
              className="absolute -top-10 right-0 text-white hover:text-slate-200"
            >
              <X size={24} />
            </button>
            <img
              src={preview.url}
              alt={preview.original_name || 'Screenshot'}
              className="max-h-[85vh] w-full object-contain rounded-lg bg-white"
            />
          </div>
        </div>
      )}
    </div>
  );
}
