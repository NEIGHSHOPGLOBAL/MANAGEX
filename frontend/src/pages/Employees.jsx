import { useEffect, useState } from 'react';
import { Plus, Key } from 'lucide-react';
import { api } from '../api/client';
import { ROLE_LABELS } from '../context/AuthContext';
import Modal from '../components/Modal';
import { SkeletonTable } from '../components/Skeleton';

function UserAvatar({ user }) {
  if (user?.profile_photo) {
    return <img src={user.profile_photo} alt="" className="w-9 h-9 rounded-full object-cover" />;
  }
  return (
    <div className="w-9 h-9 rounded-full bg-gradient-to-br from-[#1a365d] to-[#2563eb] flex items-center justify-center text-white text-xs font-semibold">
      {user?.name?.charAt(0)}
    </div>
  );
}

export default function Employees() {
  const [users, setUsers] = useState([]);
  const [departments, setDepartments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [createOpen, setCreateOpen] = useState(false);
  const [resetOpen, setResetOpen] = useState(null);
  const [form, setForm] = useState({
    employee_id: '', name: '', email: '', role: 'employee', designation: '',
    department_id: '', manager_id: '', password: '', joining_date: '',
  });
  const [newPassword, setNewPassword] = useState('');

  const load = () => {
    setLoading(true);
    Promise.all([api.getUsers(), api.getDepartments()])
      .then(([u, d]) => { setUsers(u); setDepartments(d); })
      .catch(console.error)
      .finally(() => setLoading(false));
  };
  useEffect(() => { load(); }, []);

  const managers = users.filter((u) => ['super_admin', 'admin', 'coo', 'branch_manager'].includes(u.role) && u.is_active);

  const handleCreate = async (e) => {
    e.preventDefault();
    await api.createUser({
      ...form,
      department_id: form.department_id ? Number(form.department_id) : null,
      manager_id: form.manager_id ? Number(form.manager_id) : null,
      password: form.password || form.employee_id,
    });
    setCreateOpen(false);
    load();
  };

  const handleReset = async (e) => {
    e.preventDefault();
    await api.resetPassword(resetOpen.id, newPassword || resetOpen.employee_id);
    setResetOpen(null);
    setNewPassword('');
  };

  const toggleActive = async (user) => {
    await api.updateUser(user.id, { is_active: !user.is_active });
    load();
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-slate-800 dark:text-slate-100">Employees</h1>
          <p className="text-sm text-slate-500 dark:text-slate-400">{users.length} team members from Attendex</p>
        </div>
        <button onClick={() => setCreateOpen(true)} className="btn-primary flex items-center gap-1.5">
          <Plus size={16} /> Add Employee
        </button>
      </div>

      {loading ? (
        <SkeletonTable rows={6} cols={4} />
      ) : (
      <div className="card overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-slate-50 dark:bg-slate-800/50 text-xs text-slate-500 dark:text-slate-400 uppercase">
            <tr>
              <th className="text-left p-3">Employee</th>
              <th className="text-left p-3 hidden sm:table-cell">ID</th>
              <th className="text-left p-3 hidden md:table-cell">Department</th>
              <th className="text-left p-3">Role</th>
              <th className="text-left p-3 hidden lg:table-cell">Manager</th>
              <th className="text-left p-3 hidden md:table-cell">Status</th>
              <th className="text-right p-3">Actions</th>
            </tr>
          </thead>
          <tbody>
            {users.map((u) => (
              <tr key={u.id} className="border-t border-slate-50 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800/50">
                <td className="p-3">
                  <div className="flex items-center gap-3">
                    <UserAvatar user={u} />
                    <div>
                      <p className="font-medium text-slate-700 dark:text-slate-200">{u.name}</p>
                      <p className="text-xs text-slate-400">{u.email || u.contact}</p>
                    </div>
                  </div>
                </td>
                <td className="p-3 text-slate-500 dark:text-slate-400 hidden sm:table-cell">{u.employee_id}</td>
                <td className="p-3 text-slate-500 dark:text-slate-400 hidden md:table-cell">{u.department_name || '—'}</td>
                <td className="p-3">
                  <span className="badge bg-blue-50 text-[#2563eb]">{ROLE_LABELS[u.role]}</span>
                  {u.designation && <p className="text-xs text-slate-400 mt-0.5">{u.designation}</p>}
                </td>
                <td className="p-3 text-slate-500 dark:text-slate-400 hidden lg:table-cell">{u.manager_name || '—'}</td>
                <td className="p-3 hidden md:table-cell">
                  <span className={`badge ${u.is_active ? 'bg-emerald-100 text-emerald-700' : 'bg-red-100 text-red-700'}`}>
                    {u.is_active ? 'Active' : 'Inactive'}
                  </span>
                </td>
                <td className="p-3 text-right space-x-2">
                  <button onClick={() => setResetOpen(u)} className="text-xs text-indigo-600 hover:underline inline-flex items-center gap-1">
                    <Key size={12} /> Reset
                  </button>
                  <button onClick={() => toggleActive(u)} className="text-xs text-slate-500 dark:text-slate-400 hover:underline">
                    {u.is_active ? 'Deactivate' : 'Activate'}
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      )}

      <Modal open={createOpen} onClose={() => setCreateOpen(false)} title="Add Employee">
        <form onSubmit={handleCreate} className="space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-medium text-slate-600 dark:text-slate-300 mb-1 block">Employee ID</label>
              <input className="input" required value={form.employee_id} onChange={(e) => setForm({ ...form, employee_id: e.target.value })} />
            </div>
            <div>
              <label className="text-xs font-medium text-slate-600 dark:text-slate-300 mb-1 block">Joining Date</label>
              <input type="date" className="input" value={form.joining_date} onChange={(e) => setForm({ ...form, joining_date: e.target.value })} />
            </div>
          </div>
          <div>
            <label className="text-xs font-medium text-slate-600 dark:text-slate-300 mb-1 block">Full Name</label>
            <input className="input" required value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
          </div>
          <div>
            <label className="text-xs font-medium text-slate-600 dark:text-slate-300 mb-1 block">Email</label>
            <input type="email" className="input" required value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-medium text-slate-600 dark:text-slate-300 mb-1 block">Role</label>
              <select className="input" value={form.role} onChange={(e) => setForm({ ...form, role: e.target.value })}>
                {Object.entries(ROLE_LABELS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
              </select>
            </div>
            <div>
              <label className="text-xs font-medium text-slate-600 dark:text-slate-300 mb-1 block">Designation</label>
              <input className="input" value={form.designation} onChange={(e) => setForm({ ...form, designation: e.target.value })} />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-medium text-slate-600 dark:text-slate-300 mb-1 block">Department</label>
              <select className="input" value={form.department_id} onChange={(e) => setForm({ ...form, department_id: e.target.value })}>
                <option value="">— Select —</option>
                {departments.map((d) => <option key={d.id} value={d.id}>{d.name}</option>)}
              </select>
            </div>
            <div>
              <label className="text-xs font-medium text-slate-600 dark:text-slate-300 mb-1 block">Manager</label>
              <select className="input" value={form.manager_id} onChange={(e) => setForm({ ...form, manager_id: e.target.value })}>
                <option value="">— None —</option>
                {managers.map((m) => <option key={m.id} value={m.id}>{m.name}</option>)}
              </select>
            </div>
          </div>
          <div>
            <label className="text-xs font-medium text-slate-600 dark:text-slate-300 mb-1 block">Password (defaults to Employee ID)</label>
            <input className="input" value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} placeholder="Leave blank for employee ID" />
          </div>
          <button type="submit" className="btn-primary w-full">Create Employee</button>
        </form>
      </Modal>

      <Modal open={!!resetOpen} onClose={() => setResetOpen(null)} title={`Reset Password — ${resetOpen?.name}`}>
        <form onSubmit={handleReset} className="space-y-3">
          <p className="text-xs text-slate-500 dark:text-slate-400">Default: employee ID ({resetOpen?.employee_id})</p>
          <input className="input" placeholder="New password (optional)" value={newPassword} onChange={(e) => setNewPassword(e.target.value)} />
          <button type="submit" className="btn-primary w-full">Reset Password</button>
        </form>
      </Modal>
    </div>
  );
}
