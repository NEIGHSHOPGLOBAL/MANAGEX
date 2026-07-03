import { useState } from 'react';
import { isTaskOverdue } from '../utils/date';
import { Link } from 'react-router-dom';
import {
  CheckSquare, AlertTriangle, CalendarCheck, TrendingUp,
} from 'lucide-react';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from 'recharts';
import { StatusBadge, PriorityBadge } from './Badges';

const BRAND_COLORS = ['#1a365d', '#2563eb', '#06b6d4', '#22c55e', '#f59e0b', '#ef4444'];

const metricCards = [
  { key: 'total_tasks', label: 'Total Tasks', icon: CheckSquare, accent: 'metric-accent-blue', iconBg: 'bg-blue-50 text-[#2563eb]' },
  { key: 'due_today', label: 'Due Today', icon: CalendarCheck, accent: 'metric-accent-amber', iconBg: 'bg-amber-50 text-amber-500' },
  { key: 'overdue', label: 'Overdue', icon: AlertTriangle, accent: 'metric-accent-red', iconBg: 'bg-red-50 text-red-500' },
  { key: 'completed_today', label: 'Completed Today', icon: TrendingUp, accent: 'metric-accent-green', iconBg: 'bg-green-50 text-[#22c55e]' },
];

const workTabs = [
  { id: 'due_today', label: 'Due Today', filter: (t, today) => t.due_date === today && !['done', 'completed'].includes(t.status) },
  { id: 'overdue', label: 'Overdue', filter: (t, today) => isTaskOverdue(t, today) },
  { id: 'pending', label: 'Pending Verification', filter: (t) => t.status === 'pending_verification' },
];

export default function DashboardStats({ stats, tasks, today }) {
  const [activeTab, setActiveTab] = useState('due_today');

  const pieData = Object.entries(stats?.status_distribution || {}).map(([name, value]) => ({
    name: name.replace(/_/g, ' '),
    value,
  }));

  const completionRate = stats?.total_tasks
    ? Math.round(((stats.completed_today + (stats.status_distribution?.completed || 0) + (stats.status_distribution?.done || 0)) / stats.total_tasks) * 100)
    : 0;

  const currentTab = workTabs.find((t) => t.id === activeTab);
  const filteredTasks = tasks.filter((t) => currentTab.filter(t, today));
  const tabCounts = Object.fromEntries(
    workTabs.map((tab) => [tab.id, tasks.filter((t) => tab.filter(t, today)).length])
  );

  const monthStats = [
    { label: 'My Tasks', value: stats?.my_tasks || 0 },
    { label: 'Assigned', value: stats?.assigned_tasks || 0 },
    { label: 'Personal', value: stats?.personal_tasks || 0 },
    { label: 'Active Projects', value: stats?.active_projects || 0 },
    { label: 'Pending Verify', value: stats?.pending_verification || 0 },
  ];

  return (
    <div className="space-y-5 animate-fade-in">
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {metricCards.map(({ key, label, icon: Icon, accent, iconBg }) => (
          <div key={key} className={`card-metric p-4 ${accent} hover:shadow-md transition-shadow`}>
            <div className="flex items-center justify-between">
              <div>
                <p className="text-2xl font-bold text-slate-800 dark:text-slate-100">{stats?.[key] || 0}</p>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5 font-medium">{label}</p>
              </div>
              <div className={`p-2.5 rounded-xl ${iconBg}`}>
                <Icon size={20} strokeWidth={1.75} />
              </div>
            </div>
          </div>
        ))}
      </div>

      <div className="grid lg:grid-cols-[1fr_300px] gap-5">
        <div className="space-y-5 min-w-0">
          <div className="card">
            <div className="flex items-center justify-between p-5 border-b border-slate-100 dark:border-slate-800">
              <h2 className="text-sm font-semibold text-slate-800 dark:text-slate-100">Today's Work</h2>
              <Link to="/tasks" className="btn-primary text-xs py-1.5 px-3">View all tasks</Link>
            </div>
            <div className="flex gap-1 px-5 pt-3 border-b border-slate-100 dark:border-slate-800 overflow-x-auto">
              {workTabs.map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`flex items-center gap-2 px-4 py-2.5 text-xs font-medium border-b-2 transition-all -mb-px whitespace-nowrap
                    ${activeTab === tab.id ? 'border-[#2563eb] text-[#2563eb]' : 'border-transparent text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:text-slate-200'}`}
                >
                  {tab.label}
                  <span className={`px-1.5 py-0.5 rounded-full text-[10px] font-bold
                    ${activeTab === tab.id ? 'bg-[#2563eb] text-white' : 'bg-slate-100 text-slate-500 dark:text-slate-400'}`}>
                    {tabCounts[tab.id]}
                  </span>
                </button>
              ))}
            </div>
            <div className="divide-y divide-slate-50 dark:divide-slate-800">
              {filteredTasks.length === 0 ? (
                <p className="p-8 text-sm text-slate-400 text-center">No tasks in this category</p>
              ) : (
                filteredTasks.slice(0, 5).map((task) => (
                  <Link key={task.id} to={`/tasks/${task.id}`} className="flex items-center gap-4 px-5 py-3.5 hover:bg-slate-50 dark:hover:bg-slate-800 dark:bg-slate-800/50/80 transition-colors group">
                    <div className="w-8 h-8 rounded-lg bg-slate-100 flex items-center justify-center text-slate-500 dark:text-slate-400 group-hover:bg-blue-50 group-hover:text-[#2563eb]">
                      <CheckSquare size={16} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-slate-800 dark:text-slate-100 truncate">{task.title}</p>
                      <p className="text-xs text-slate-400">{task.assigned_to?.name || 'Unassigned'}</p>
                    </div>
                    <PriorityBadge priority={task.priority} />
                    <StatusBadge status={task.status} />
                  </Link>
                ))
              )}
            </div>
          </div>

          <div className="card">
            <div className="p-5 border-b border-slate-100 dark:border-slate-800">
              <h2 className="text-sm font-semibold text-slate-800 dark:text-slate-100">Needs Attention</h2>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-xs text-slate-400 uppercase tracking-wide">
                    <th className="text-left p-4 font-medium">Task</th>
                    <th className="text-left p-4 font-medium hidden sm:table-cell">Assignee</th>
                    <th className="text-left p-4 font-medium hidden md:table-cell">Due</th>
                    <th className="text-left p-4 font-medium">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-50 dark:divide-slate-800">
                  {tasks
                    .filter((t) => t.status === 'pending_verification' || (t.due_date && t.due_date < today && !['done', 'completed'].includes(t.status)))
                    .slice(0, 6)
                    .map((task) => (
                      <tr key={task.id} className="hover:bg-slate-50 dark:hover:bg-slate-800 dark:bg-slate-800/50/80">
                        <td className="p-4">
                          <Link to={`/tasks/${task.id}`} className="font-medium text-slate-800 dark:text-slate-100 hover:text-[#2563eb]">{task.title}</Link>
                        </td>
                        <td className="p-4 text-slate-500 dark:text-slate-400 hidden sm:table-cell">{task.assigned_to?.name || '—'}</td>
                        <td className="p-4 text-slate-500 dark:text-slate-400 hidden md:table-cell">{task.due_date || '—'}</td>
                        <td className="p-4"><StatusBadge status={task.status} /></td>
                      </tr>
                    ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>

        <div className="space-y-5">
          <div className="card p-5">
            <h3 className="text-sm font-semibold text-slate-800 dark:text-slate-100 mb-4">Your Progress</h3>
            <div className="relative flex items-center justify-center">
              <ResponsiveContainer width="100%" height={180}>
                <PieChart>
                  <Pie
                    data={[{ name: 'Done', value: completionRate }, { name: 'Remaining', value: 100 - completionRate }]}
                    cx="50%" cy="50%" innerRadius={55} outerRadius={75}
                    startAngle={90} endAngle={-270} dataKey="value" stroke="none"
                  >
                    <Cell fill="#2563eb" /><Cell fill="#e2e8f0" />
                  </Pie>
                </PieChart>
              </ResponsiveContainer>
              <div className="absolute inset-0 flex items-center justify-center">
                <span className="text-2xl font-bold text-slate-800 dark:text-slate-100">{completionRate}%</span>
              </div>
            </div>
          </div>

          <div className="card p-5">
            <h3 className="text-sm font-semibold text-slate-800 dark:text-slate-100 mb-4">Overview</h3>
            <div className="divide-y divide-slate-100">
              {monthStats.map(({ label, value }) => (
                <div key={label} className="flex items-center justify-between py-2.5 text-sm">
                  <span className="text-slate-500 dark:text-slate-400">{label}</span>
                  <span className="font-semibold text-slate-800 dark:text-slate-100">{value}</span>
                </div>
              ))}
            </div>
          </div>

          <div className="card p-5">
            <h3 className="text-sm font-semibold text-slate-800 dark:text-slate-100 mb-4">Task Status</h3>
            {pieData.length > 0 ? (
              <>
                <ResponsiveContainer width="100%" height={140}>
                  <PieChart>
                    <Pie data={pieData} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={60} stroke="none">
                      {pieData.map((_, i) => <Cell key={i} fill={BRAND_COLORS[i % BRAND_COLORS.length]} />)}
                    </Pie>
                    <Tooltip />
                  </PieChart>
                </ResponsiveContainer>
                <div className="space-y-1.5 mt-2">
                  {pieData.map((d, i) => (
                    <div key={d.name} className="flex items-center justify-between text-xs">
                      <div className="flex items-center gap-2">
                        <div className="w-2.5 h-2.5 rounded-full" style={{ background: BRAND_COLORS[i % BRAND_COLORS.length] }} />
                        <span className="text-slate-600 dark:text-slate-300 capitalize">{d.name}</span>
                      </div>
                      <span className="font-semibold text-slate-800 dark:text-slate-100">{d.value}</span>
                    </div>
                  ))}
                </div>
              </>
            ) : (
              <p className="text-sm text-slate-400 text-center py-6">No data yet</p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
