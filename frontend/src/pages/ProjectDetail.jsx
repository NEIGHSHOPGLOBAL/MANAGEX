import { useEffect, useState } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';
import { api } from '../api/client';
import { trackRecent } from '../hooks/useRecentItems';
import { StatusBadge, PriorityBadge } from '../components/Badges';
import { Skeleton } from '../components/Skeleton';

export default function ProjectDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [project, setProject] = useState(null);
  const [tasks, setTasks] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    Promise.all([
      api.getProject(id).then(setProject).catch(() => navigate('/projects')),
      api.getTasks({ project_id: id }).then(setTasks).catch(console.error),
    ]).finally(() => setLoading(false));
  }, [id]);

  useEffect(() => {
    if (project) trackRecent({ id: project.id, type: 'project', title: project.name, path: `/projects/${project.id}` });
  }, [project?.id]);

  if (loading) return (
    <div className="space-y-4 animate-fade-in">
      <Skeleton className="h-4 w-28" />
      <div className="card p-5 space-y-3">
        <Skeleton className="h-6 w-1/2" />
        <Skeleton className="h-4 w-full" />
        <Skeleton className="h-2 w-full rounded-full" />
      </div>
      <div className="card p-5 space-y-2">
        <Skeleton className="h-4 w-20" />
        <div className="flex gap-2">{[1,2,3].map(i => <Skeleton key={i} className="h-6 w-20 rounded-full" />)}</div>
      </div>
    </div>
  );

  if (!project) return null;

  return (
    <div className="space-y-4">
      <button onClick={() => navigate('/projects')} className="flex items-center gap-1 text-sm text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:text-slate-200">
        <ArrowLeft size={16} /> Back to Projects
      </button>

      <div className="card p-5">
        <div className="flex items-center gap-2 mb-2">
          <StatusBadge status={project.status} />
          <PriorityBadge priority={project.priority} />
        </div>
        <h1 className="text-xl font-bold text-slate-800 dark:text-slate-100">{project.name}</h1>
        <p className="text-sm text-slate-600 dark:text-slate-300 mt-2">{project.description}</p>
        <div className="mt-4">
          <div className="flex items-center justify-between text-xs text-slate-400 mb-1">
            <span>Progress</span>
            <span>{project.progress}%</span>
          </div>
          <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
            <div className="h-full bg-[#2563eb] rounded-full" style={{ width: `${project.progress}%` }} />
          </div>
        </div>
        <div className="grid grid-cols-2 gap-3 mt-4 text-sm">
          {project.start_date && <div><span className="text-slate-400">Start:</span> {project.start_date}</div>}
          {project.deadline && <div><span className="text-slate-400">Deadline:</span> {project.deadline}</div>}
          {project.project_manager && <div><span className="text-slate-400">Manager:</span> {project.project_manager.name}</div>}
        </div>
      </div>

      <div className="card p-5">
        <h3 className="text-sm font-semibold text-slate-700 dark:text-slate-200 mb-3">Project Tasks ({tasks.length})</h3>
        <div className="space-y-2">
          {tasks.map((t) => (
            <Link key={t.id} to={`/tasks/${t.id}`} className="block p-3 bg-slate-50 dark:bg-slate-800/50 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium text-slate-700 dark:text-slate-200">{t.title}</span>
                <StatusBadge status={t.status} />
              </div>
            </Link>
          ))}
          {tasks.length === 0 && <p className="text-xs text-slate-400">No tasks in this project</p>}
        </div>
      </div>
    </div>
  );
}
