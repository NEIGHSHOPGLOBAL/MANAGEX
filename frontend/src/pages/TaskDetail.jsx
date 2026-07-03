import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { trackRecent } from '../hooks/useRecentItems';
import { ArrowLeft, CheckCircle, XCircle, RotateCcw, Upload, Send, MapPin } from 'lucide-react';
import { api } from '../api/client';
import { useAuth, isManagement } from '../context/AuthContext';
import { StatusBadge, PriorityBadge, TypeBadge } from '../components/Badges';
import { Skeleton } from '../components/Skeleton';

export default function TaskDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [task, setTask] = useState(null);
  const [loading, setLoading] = useState(true);
  const [comment, setComment] = useState('');
  const [checklistText, setChecklistText] = useState('');

  const load = () => {
    setLoading(true);
    api.getTask(id).then(setTask).catch(() => navigate('/tasks')).finally(() => setLoading(false));
  };

  useEffect(() => { load(); }, [id]);

  useEffect(() => {
    if (task) trackRecent({ id: task.id, type: 'task', title: task.title, path: `/tasks/${task.id}` });
  }, [task?.id]);

  const getLocation = () =>
    new Promise((resolve) => {
      if (!navigator.geolocation) resolve({});
      navigator.geolocation.getCurrentPosition(
        (pos) => resolve({ latitude: pos.coords.latitude, longitude: pos.coords.longitude }),
        () => resolve({}),
      );
    });

  const markDone = async () => {
    const loc = await getLocation();
    await api.updateTaskStatus(id, { status: 'done', ...loc });
    load();
  };

  const markInProgress = async () => {
    await api.updateTaskStatus(id, { status: 'in_progress' });
    load();
  };

  const verify = async (approved) => {
    await api.verifyTask(id, approved);
    load();
  };

  const reopen = async () => {
    await api.reopenTask(id);
    load();
  };

  const sendComment = async (e) => {
    e.preventDefault();
    if (!comment.trim()) return;
    await api.addComment(id, comment);
    setComment('');
    load();
  };

  const addChecklistItem = async (e) => {
    e.preventDefault();
    if (!checklistText.trim()) return;
    await api.addChecklist(id, checklistText);
    setChecklistText('');
    load();
  };

  const toggleCheck = async (item) => {
    await api.toggleChecklist(item.id, { is_done: !item.is_done });
    load();
  };

  const uploadFile = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    await api.uploadAttachment(id, file);
    load();
  };

  if (loading) return (
    <div className="max-w-3xl mx-auto space-y-4 animate-fade-in">
      <Skeleton className="h-4 w-24" />
      <div className="card p-5 space-y-3">
        <Skeleton className="h-6 w-2/3" />
        <Skeleton className="h-4 w-full" />
        <Skeleton className="h-4 w-1/2" />
        <div className="flex gap-2 pt-2">
          <Skeleton className="h-8 w-24 rounded-lg" />
          <Skeleton className="h-8 w-24 rounded-lg" />
        </div>
      </div>
      <div className="card p-5 space-y-2">
        <Skeleton className="h-4 w-20 mb-2" />
        <Skeleton className="h-4 w-full" />
        <Skeleton className="h-4 w-3/4" />
      </div>
    </div>
  );

  if (!task) return null;

  const canComplete = !task.is_readonly && task.assigned_to_id === user?.id && !['done', 'completed', 'pending_verification'].includes(task.status);
  const canVerify = isManagement(user?.role) && task.status === 'pending_verification';
  const canReopen = user?.role === 'super_admin' && ['done', 'completed'].includes(task.status);

  return (
    <div className="max-w-3xl mx-auto space-y-4">
      <button onClick={() => navigate('/tasks')} className="flex items-center gap-1 text-sm text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:text-slate-200">
        <ArrowLeft size={16} /> Back to Tasks
      </button>

      <div className="card p-5">
        <div className="flex items-center gap-2 flex-wrap mb-3">
          <TypeBadge type={task.task_type} />
          <PriorityBadge priority={task.priority} />
          <StatusBadge status={task.status} />
          {task.is_late && <span className="badge bg-red-100 text-red-700">Late Completion</span>}
        </div>
        <h1 className="text-xl font-bold text-slate-800 dark:text-slate-100">{task.title}</h1>
        <p className="text-sm text-slate-600 dark:text-slate-300 mt-2">{task.description}</p>

        <div className="grid grid-cols-2 gap-3 mt-4 text-sm">
          {task.assigned_to && <div><span className="text-slate-400">Assigned To:</span> {task.assigned_to.name}</div>}
          {task.assigned_by && <div><span className="text-slate-400">Assigned By:</span> {task.assigned_by.name}</div>}
          {task.due_date && (
            <div>
              <span className="text-slate-400">Due:</span>{' '}
              {task.due_date}
              {task.due_time && ` ${task.due_time.slice(0, 5)}`}
            </div>
          )}
          {task.project && <div><span className="text-slate-400">Project:</span> {task.project.name}</div>}
          {task.completed_at && <div><span className="text-slate-400">Completed:</span> {new Date(task.completed_at).toLocaleString()}</div>}
          {task.completed_in_office !== null && task.completed_in_office !== undefined && (
            <div className="flex items-center gap-1">
              <MapPin size={14} className="text-slate-400" />
              {task.completed_in_office ? 'Completed inside office' : 'Completed outside office'}
            </div>
          )}
        </div>

        <div className="flex gap-2 mt-4 flex-wrap">
          {canComplete && task.status === 'assigned' && (
            <button onClick={markInProgress} className="btn-secondary text-xs">Start Progress</button>
          )}
          {canComplete && (
            <button onClick={markDone} className="btn-primary text-xs flex items-center gap-1">
              <CheckCircle size={14} /> Mark Done
            </button>
          )}
          {canVerify && (
            <>
              <button onClick={() => verify(true)} className="btn-primary text-xs flex items-center gap-1">
                <CheckCircle size={14} /> Verify
              </button>
              <button onClick={() => verify(false)} className="bg-red-100 hover:bg-red-200 text-red-700 text-xs font-medium px-4 py-2 rounded-lg flex items-center gap-1">
                <XCircle size={14} /> Reject
              </button>
            </>
          )}
          {canReopen && (
            <button onClick={reopen} className="btn-secondary text-xs flex items-center gap-1">
              <RotateCcw size={14} /> Reopen
            </button>
          )}
        </div>
      </div>

      {/* Checklist */}
      <div className="card p-5">
        <h3 className="text-sm font-semibold text-slate-700 dark:text-slate-200 mb-3">Checklist</h3>
        <div className="space-y-2">
          {(task.checklist || []).map((item) => (
            <label key={item.id} className="flex items-center gap-2 text-sm cursor-pointer">
              <input type="checkbox" checked={item.is_done} onChange={() => toggleCheck(item)} className="rounded" />
              <span className={item.is_done ? 'line-through text-slate-400' : ''}>{item.text}</span>
            </label>
          ))}
        </div>
        {!task.is_readonly && (
          <form onSubmit={addChecklistItem} className="flex gap-2 mt-3">
            <input className="input flex-1" placeholder="Add checklist item" value={checklistText} onChange={(e) => setChecklistText(e.target.value)} />
            <button type="submit" className="btn-secondary text-xs">Add</button>
          </form>
        )}
      </div>

      {/* Attachments */}
      <div className="card p-5">
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-sm font-semibold text-slate-700 dark:text-slate-200">Attachments</h3>
          <label className="btn-secondary text-xs flex items-center gap-1 cursor-pointer">
            <Upload size={14} /> Upload
            <input type="file" className="hidden" accept="image/*,.pdf" onChange={uploadFile} />
          </label>
        </div>
        <div className="grid grid-cols-2 gap-2">
          {(task.attachments || []).map((a) => (
            <a key={a.id} href={a.url} target="_blank" rel="noreferrer" className="text-xs text-indigo-600 hover:underline p-2 bg-slate-50 dark:bg-slate-800/50 rounded-lg">
              {a.original_name} ({a.file_type})
            </a>
          ))}
          {(task.attachments || []).length === 0 && <p className="text-xs text-slate-400 col-span-2">No attachments</p>}
        </div>
      </div>

      {/* Comments */}
      <div className="card p-5">
        <h3 className="text-sm font-semibold text-slate-700 dark:text-slate-200 mb-3">Discussion</h3>
        <div className="space-y-3 mb-4 max-h-64 overflow-y-auto">
          {(task.comments || []).map((c) => (
            <div key={c.id} className="bg-slate-50 dark:bg-slate-800/50 rounded-lg p-3">
              <div className="flex items-center gap-2 mb-1">
                <span className="text-xs font-medium text-slate-700 dark:text-slate-200">{c.user?.name}</span>
                <span className="text-[10px] text-slate-400">{new Date(c.created_at).toLocaleString()}</span>
              </div>
              <p className="text-sm text-slate-600 dark:text-slate-300">{c.text}</p>
            </div>
          ))}
          {(task.comments || []).length === 0 && <p className="text-xs text-slate-400">No comments yet</p>}
        </div>
        <form onSubmit={sendComment} className="flex gap-2">
          <input className="input flex-1" placeholder="Add a comment..." value={comment} onChange={(e) => setComment(e.target.value)} />
          <button type="submit" className="btn-primary p-2"><Send size={16} /></button>
        </form>
      </div>
    </div>
  );
}
