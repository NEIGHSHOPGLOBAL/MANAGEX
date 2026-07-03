import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { api } from '../api/client';
import { StatusBadge } from '../components/Badges';
import Modal from '../components/Modal';
import { Skeleton } from '../components/Skeleton';

const DAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

export default function Calendar() {
  const [date, setDate] = useState(new Date());
  const [data, setData] = useState({ tasks: [], projects: [], meetings: [] });
  const [selectedDay, setSelectedDay] = useState(null);
  const [loading, setLoading] = useState(true);

  const year = date.getFullYear();
  const month = date.getMonth() + 1;

  useEffect(() => {
    setLoading(true);
    api.getCalendar(year, month).then(setData).catch(console.error).finally(() => setLoading(false));
  }, [year, month]);

  const firstDay = new Date(year, month - 1, 1).getDay();
  const daysInMonth = new Date(year, month, 0).getDate();
  const cells = [];
  for (let i = 0; i < firstDay; i++) cells.push(null);
  for (let d = 1; d <= daysInMonth; d++) cells.push(d);

  const getItemsForDay = (day) => {
    if (!day) return { tasks: [], projects: [], meetings: [] };
    const dateStr = `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
    return {
      tasks: data.tasks.filter((t) => t.due_date === dateStr),
      projects: data.projects.filter((p) => p.deadline === dateStr),
      meetings: (data.meetings || []).filter((m) => m.meeting_date === dateStr),
    };
  };

  const prevMonth = () => setDate(new Date(year, month - 2, 1));
  const nextMonth = () => setDate(new Date(year, month, 1));

  const selectedItems = selectedDay ? getItemsForDay(selectedDay) : null;
  const dayTitle = selectedDay
    ? `${selectedDay} ${date.toLocaleString('default', { month: 'long', year: 'numeric' })}`
    : '';

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-xl font-bold text-slate-800 dark:text-slate-100">Calendar</h1>
        <p className="text-sm text-slate-500 dark:text-slate-400">Tasks, meetings & project milestones</p>
      </div>

      <div className="card p-5">
        <div className="flex items-center justify-between mb-4">
          <button onClick={prevMonth} className="p-2 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800"><ChevronLeft size={18} /></button>
          <h2 className="font-semibold text-slate-800 dark:text-slate-100">
            {date.toLocaleString('default', { month: 'long', year: 'numeric' })}
          </h2>
          <button onClick={nextMonth} className="p-2 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800"><ChevronRight size={18} /></button>
        </div>

        <div className="grid grid-cols-7 gap-1">
          {loading ? (
            Array.from({ length: 35 }).map((_, i) => (
              <Skeleton key={i} className="aspect-square rounded-lg" />
            ))
          ) : (
          <>
          {DAYS.map((d) => (
            <div key={d} className="text-center text-xs font-medium text-slate-400 py-2">{d}</div>
          ))}
          {cells.map((day, i) => {
            const items = day ? getItemsForDay(day) : null;
            const count = items ? items.tasks.length + items.projects.length + items.meetings.length : 0;
            const hasMeetings = items && items.meetings.length > 0;
            const hasTasks = items && (items.tasks.length + items.projects.length) > 0;
            const isToday = day && new Date().toDateString() === new Date(year, month - 1, day).toDateString();
            return (
              <button
                key={i}
                disabled={!day}
                onClick={() => day && setSelectedDay(day)}
                className={`aspect-square p-1 rounded-lg text-sm transition-colors relative
                  ${!day ? '' : 'hover:bg-blue-50 dark:hover:bg-blue-950/30 cursor-pointer'}
                  ${isToday ? 'bg-blue-100 dark:bg-blue-950/40 font-bold text-[#2563eb]' : ''}`}
              >
                {day}
                {count > 0 && (
                  <span className="absolute bottom-1 left-1/2 -translate-x-1/2 flex gap-0.5">
                    {hasTasks && <span className="w-1.5 h-1.5 rounded-full bg-[#2563eb]" />}
                    {hasMeetings && <span className="w-1.5 h-1.5 rounded-full bg-purple-500" />}
                  </span>
                )}
              </button>
            );
          })}
          </>
          )}
        </div>
      </div>

      <Modal
        open={!!selectedDay}
        onClose={() => setSelectedDay(null)}
        title={dayTitle}
        wide
      >
        {selectedItems && (
          selectedItems.tasks.length === 0 && selectedItems.projects.length === 0 && selectedItems.meetings.length === 0 ? (
            <p className="text-sm text-slate-400 text-center py-6">No items for this day</p>
          ) : (
            <div className="space-y-2">
              {selectedItems.meetings.map((m) => (
                <Link
                  key={`m-${m.id}`}
                  to="/meetings"
                  onClick={() => setSelectedDay(null)}
                  className="flex items-center justify-between p-3 bg-purple-50 dark:bg-purple-950/30 rounded-lg hover:bg-purple-100 dark:hover:bg-purple-950/50"
                >
                  <div>
                    <span className="text-sm font-medium text-slate-800 dark:text-slate-100">{m.title}</span>
                    <p className="text-xs text-purple-600 dark:text-purple-300">
                      {m.start_time?.slice(0, 5)}{m.end_time ? ` – ${m.end_time.slice(0, 5)}` : ''}
                    </p>
                  </div>
                  <span className="text-xs text-purple-600 dark:text-purple-300">Meeting</span>
                </Link>
              ))}
              {selectedItems.tasks.map((t) => (
                <Link
                  key={t.id}
                  to={`/tasks/${t.id}`}
                  onClick={() => setSelectedDay(null)}
                  className="flex items-center justify-between p-3 bg-slate-50 dark:bg-slate-800/50 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800"
                >
                  <span className="text-sm font-medium text-slate-800 dark:text-slate-100">{t.title}</span>
                  <StatusBadge status={t.status} />
                </Link>
              ))}
              {selectedItems.projects.map((p) => (
                <Link
                  key={p.id}
                  to={`/projects/${p.id}`}
                  onClick={() => setSelectedDay(null)}
                  className="flex items-center justify-between p-3 bg-indigo-50 dark:bg-indigo-950/30 rounded-lg hover:bg-indigo-100 dark:hover:bg-indigo-950/50"
                >
                  <span className="text-sm font-medium text-slate-800 dark:text-slate-100">{p.name} (deadline)</span>
                  <StatusBadge status={p.status} />
                </Link>
              ))}
            </div>
          )
        )}
      </Modal>
    </div>
  );
}
