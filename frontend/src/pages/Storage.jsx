import { useEffect, useState } from 'react';
import { Trash2, HardDrive } from 'lucide-react';
import { api } from '../api/client';
import { SkeletonMetricCards, SkeletonTable } from '../components/Skeleton';

export default function Storage() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  const load = () => {
    setLoading(true);
    api.getStorage().then(setData).catch(console.error).finally(() => setLoading(false));
  };
  useEffect(() => { load(); }, []);

  const handleDelete = async (id) => {
    if (!confirm('Delete this file?')) return;
    await api.deleteFile(id);
    load();
  };

  if (loading) return (
    <div className="space-y-4">
      <div>
        <h1 className="text-xl font-bold text-slate-800 dark:text-slate-100">Storage Management</h1>
        <p className="text-sm text-slate-500 dark:text-slate-400">Super Admin only</p>
      </div>
      <SkeletonMetricCards count={2} />
      <SkeletonTable rows={5} cols={4} />
    </div>
  );

  if (!data) return null;

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-xl font-bold text-slate-800 dark:text-slate-100">Storage Management</h1>
        <p className="text-sm text-slate-500 dark:text-slate-400">Super Admin only — manage uploaded files</p>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
        <div className="card p-4">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-blue-50 text-[#2563eb]"><HardDrive size={18} /></div>
            <div>
              <p className="text-2xl font-bold">{data.total_files}</p>
              <p className="text-xs text-slate-500 dark:text-slate-400">Total Files</p>
            </div>
          </div>
        </div>
        <div className="card p-4">
          <p className="text-2xl font-bold">{data.total_size_mb} MB</p>
          <p className="text-xs text-slate-500 dark:text-slate-400">Storage Used</p>
        </div>
      </div>

      <div className="card overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-slate-50 dark:bg-slate-800/50 text-xs text-slate-500 dark:text-slate-400 uppercase">
            <tr>
              <th className="text-left p-3">File</th>
              <th className="text-left p-3 hidden sm:table-cell">Type</th>
              <th className="text-left p-3 hidden sm:table-cell">Size</th>
              <th className="text-right p-3">Action</th>
            </tr>
          </thead>
          <tbody>
            {data.files.map((f) => (
              <tr key={f.id} className="border-t border-slate-50">
                <td className="p-3">
                  <a href={f.url} target="_blank" rel="noreferrer" className="text-indigo-600 hover:underline">{f.original_name}</a>
                </td>
                <td className="p-3 text-slate-500 dark:text-slate-400 hidden sm:table-cell">{f.file_type}</td>
                <td className="p-3 text-slate-500 dark:text-slate-400 hidden sm:table-cell">{((f.file_size || 0) / 1024).toFixed(1)} KB</td>
                <td className="p-3 text-right">
                  <button onClick={() => handleDelete(f.id)} className="text-red-500 hover:text-red-700 p-1">
                    <Trash2 size={16} />
                  </button>
                </td>
              </tr>
            ))}
            {data.files.length === 0 && (
              <tr><td colSpan={4} className="p-8 text-center text-slate-400">No files uploaded</td></tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
