import { useEffect, useState } from 'react';
import { api } from '../api/client';
import { useAuth } from '../context/AuthContext';

import UserMultiSelect from './UserMultiSelect';

const EMPTY_TASK = {
  title: '',
  description: '',
  priority: 'medium',
  due_date: '',
  due_time: '',
  assigned_to_ids: [],
  project_id: '',
  task_type: 'normal',
  personal_notes: '',
};

const EMPTY_PROJECT = {
  title: '',
  description: '',
  priority: 'medium',
  status: 'planning',
  start_date: '',
  deadline: '',
  project_manager_id: '',
};

export default function QuickActionForm({ onDone, defaultAction = 'personal' }) {
  const { user } = useAuth();
  const [action, setAction] = useState(defaultAction);
  const [taskForm, setTaskForm] = useState(EMPTY_TASK);
  const [projectForm, setProjectForm] = useState(EMPTY_PROJECT);
  const [loading, setLoading] = useState(false);
  const [users, setUsers] = useState([]);
  const [projects, setProjects] = useState([]);

  const needsUsers = action === 'assign' || action === 'project';
  const needsProjects = action === 'assign' || action === 'project';

  useEffect(() => {
    if (needsUsers && users.length === 0) {
      api.getAssignableUsers().then(setUsers).catch(() => {});
    }
    if (needsProjects && projects.length === 0) {
      api.getProjects().then(setProjects).catch(() => {});
    }
  }, [action, needsUsers, needsProjects, users.length, projects.length]);

  const switchAction = (type) => {
    setAction(type);
    setTaskForm(EMPTY_TASK);
    setProjectForm(EMPTY_PROJECT);
  };

  const buildTaskPayload = (taskType, extra = {}) => {
    const payload = {
      title: taskForm.title,
      description: taskForm.description,
      task_type: taskType,
      priority: taskForm.priority,
      ...extra,
    };
    if (taskForm.due_date) payload.due_date = taskForm.due_date;
    if (taskForm.due_time) payload.due_time = taskForm.due_time;
    if (taskForm.personal_notes) payload.personal_notes = taskForm.personal_notes;
    if (taskForm.project_id) payload.project_id = parseInt(taskForm.project_id);
    return payload;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      if (action === 'personal') {
        await api.createTask(buildTaskPayload('personal', { status: 'todo' }));
        onDone('/tasks?type=personal');
      } else if (action === 'assign') {
        const taskType = taskForm.task_type;
        const payload = buildTaskPayload(taskType, {
          assigned_to_ids: taskForm.assigned_to_ids.map(Number),
        });
        if (taskType === 'project' && !taskForm.project_id) {
          throw new Error('Please select a project for project tasks');
        }
        await api.createTask(payload);
        onDone('/tasks');
      } else if (action === 'project') {
        await api.createProject({
          name: projectForm.title,
          description: projectForm.description,
          priority: projectForm.priority,
          status: projectForm.status,
          start_date: projectForm.start_date || undefined,
          deadline: projectForm.deadline || undefined,
          project_manager_id: projectForm.project_manager_id
            ? parseInt(projectForm.project_manager_id)
            : null,
        });
        onDone('/projects');
      }
    } catch (err) {
      alert(err.message);
    } finally {
      setLoading(false);
    }
  };

  const tabs = [
    { id: 'personal', label: 'Personal' },
    { id: 'assign', label: 'Assign Task' },
    ...(['super_admin', 'admin', 'coo'].includes(user?.role) ? [{ id: 'project', label: 'New Project' }] : []),
  ];

  const set = (key, val) => setTaskForm((f) => ({ ...f, [key]: val }));
  const setProj = (key, val) => setProjectForm((f) => ({ ...f, [key]: val }));

  return (
    <div>
      <div className="flex gap-2 mb-5 flex-wrap">
        {tabs.map((t) => (
          <button
            key={t.id}
            type="button"
            onClick={() => switchAction(t.id)}
            className={`text-xs px-3 py-1.5 rounded-lg font-medium transition-colors
              ${action === t.id ? 'bg-[#2563eb] text-white' : 'bg-slate-100 text-slate-600 dark:text-slate-300 hover:bg-slate-200'}`}
          >
            {t.label}
          </button>
        ))}
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        {action === 'project' ? (
          <>
            <Field label="Project Name" required>
              <input className="input" required value={projectForm.title} onChange={(e) => setProj('title', e.target.value)} />
            </Field>
            <Field label="Description">
              <textarea className="input" rows={2} value={projectForm.description} onChange={(e) => setProj('description', e.target.value)} />
            </Field>
            <div className="grid grid-cols-2 gap-3">
              <Field label="Status">
                <select className="input" value={projectForm.status} onChange={(e) => setProj('status', e.target.value)}>
                  {['planning', 'active', 'completed', 'archived'].map((s) => (
                    <option key={s} value={s}>{s}</option>
                  ))}
                </select>
              </Field>
              <Field label="Priority">
                <PrioritySelect value={projectForm.priority} onChange={(v) => setProj('priority', v)} />
              </Field>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <Field label="Start Date">
                <input type="date" className="input" value={projectForm.start_date} onChange={(e) => setProj('start_date', e.target.value)} />
              </Field>
              <Field label="Deadline">
                <input type="date" className="input" value={projectForm.deadline} onChange={(e) => setProj('deadline', e.target.value)} />
              </Field>
            </div>
            <Field label="Project Manager">
              <select className="input" value={projectForm.project_manager_id} onChange={(e) => setProj('project_manager_id', e.target.value)}>
                <option value="">Select manager</option>
                {users.map((u) => <option key={u.id} value={u.id}>{u.name}</option>)}
              </select>
            </Field>
          </>
        ) : (
          <>
            <Field label="Title" required>
              <input className="input" required value={taskForm.title} onChange={(e) => set('title', e.target.value)} placeholder="What needs to be done?" />
            </Field>
            <Field label="Description">
              <textarea className="input" rows={2} value={taskForm.description} onChange={(e) => set('description', e.target.value)} placeholder="Add details..." />
            </Field>

            {action === 'assign' && (
              <>
                <Field label="Task Type" required>
                  <select className="input" value={taskForm.task_type} onChange={(e) => set('task_type', e.target.value)}>
                    <option value="normal">Normal Task</option>
                    <option value="project">Project Task</option>
                  </select>
                </Field>
                <Field label="Assign To (multiple)" required>
                  <UserMultiSelect
                    users={users}
                    value={taskForm.assigned_to_ids}
                    onChange={(ids) => set('assigned_to_ids', ids)}
                    required
                    placeholder="Select one or more people"
                  />
                </Field>
                {taskForm.task_type === 'project' && (
                  <Field label="Project" required>
                    <select className="input" required value={taskForm.project_id} onChange={(e) => set('project_id', e.target.value)}>
                      <option value="">Select project</option>
                      {projects.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
                    </select>
                  </Field>
                )}
              </>
            )}

            <div className="grid grid-cols-2 gap-3">
              <Field label="Priority">
                <PrioritySelect value={taskForm.priority} onChange={(v) => set('priority', v)} />
              </Field>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <Field label="Due Date">
                <input type="date" className="input" value={taskForm.due_date} onChange={(e) => set('due_date', e.target.value)} />
              </Field>
              <Field label="Due Time (optional)">
                <input type="time" className="input" value={taskForm.due_time} onChange={(e) => set('due_time', e.target.value)} />
              </Field>
            </div>

            {action === 'personal' && (
              <Field label="Personal Notes">
                <textarea className="input" rows={2} value={taskForm.personal_notes} onChange={(e) => set('personal_notes', e.target.value)} placeholder="Private notes for yourself..." />
              </Field>
            )}
          </>
        )}

        <button type="submit" disabled={loading} className="btn-primary w-full py-2.5">
          {loading ? 'Creating...' : action === 'project' ? 'Create Project' : 'Create Task'}
        </button>
      </form>
    </div>
  );
}

function Field({ label, required, children }) {
  return (
    <div>
      <label className="text-xs font-semibold text-slate-600 dark:text-slate-300 mb-1.5 block uppercase tracking-wide">
        {label}{required && <span className="text-red-500 ml-0.5">*</span>}
      </label>
      {children}
    </div>
  );
}

function PrioritySelect({ value, onChange }) {
  const options = [
    { v: 'low', label: 'Low', color: 'text-slate-600 dark:text-slate-300' },
    { v: 'medium', label: 'Medium', color: 'text-sky-600' },
    { v: 'high', label: 'High', color: 'text-orange-600' },
    { v: 'urgent', label: 'Urgent', color: 'text-red-600' },
  ];
  return (
    <select className="input" value={value} onChange={(e) => onChange(e.target.value)}>
      {options.map(({ v, label }) => <option key={v} value={v}>{label}</option>)}
    </select>
  );
}
