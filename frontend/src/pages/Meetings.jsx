import { useEffect, useState } from 'react';
import { isMeetingPast, localTodayISO } from '../utils/date';
import { Link } from 'react-router-dom';
import { Plus, Video, MapPin, Users, Calendar } from 'lucide-react';
import { api } from '../api/client';
import { useAuth, isManagement } from '../context/AuthContext';
import Modal from '../components/Modal';
import { SkeletonList } from '../components/Skeleton';

const EMPTY = {
  title: '',
  description: '',
  meeting_date: '',
  start_time: '',
  end_time: '',
  location: '',
  meeting_link: '',
  reminder_minutes: '15',
  attendee_ids: [],
};

function formatTime(t) {
  if (!t) return '';
  return t.slice(0, 5);
}

function formatMeetingWhen(m) {
  const date = m.meeting_date || '';
  const start = formatTime(m.start_time);
  const end = formatTime(m.end_time);
  return `${date} ${start}${end ? ` – ${end}` : ''}`;
}

export default function Meetings() {
  const { user } = useAuth();
  const [meetings, setMeetings] = useState([]);
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('upcoming');
  const [modalOpen, setModalOpen] = useState(false);
  const [form, setForm] = useState(EMPTY);
  const [saving, setSaving] = useState(false);
  const canCreate = isManagement(user?.role);

  const load = () => {
    setLoading(true);
    api.getMeetings(filter === 'upcoming')
      .then(setMeetings)
      .catch(console.error)
      .finally(() => setLoading(false));
  };

  useEffect(() => { load(); }, [filter]);

  const openCreate = async () => {
    if (users.length === 0) {
      const u = await api.getAssignableUsers().catch(() => []);
      setUsers(u);
    }
    setForm(EMPTY);
    setModalOpen(true);
  };

  const toggleAttendee = (id) => {
    setForm((f) => ({
      ...f,
      attendee_ids: f.attendee_ids.includes(id)
        ? f.attendee_ids.filter((x) => x !== id)
        : [...f.attendee_ids, id],
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      await api.createMeeting({
        ...form,
        reminder_minutes: parseInt(form.reminder_minutes, 10) || 15,
      });
      setModalOpen(false);
      load();
    } catch (err) {
      alert(err.message);
    } finally {
      setSaving(false);
    }
  };

  const today = localTodayISO();

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-bold text-slate-800 dark:text-slate-100">Meetings</h1>
          <p className="text-sm text-slate-500 dark:text-slate-400">Scheduled team meetings & reminders</p>
        </div>
        {canCreate && (
          <button onClick={openCreate} className="btn-primary flex items-center gap-1.5">
            <Plus size={16} /> Schedule Meeting
          </button>
        )}
      </div>

      <div className="flex gap-2">
        {[
          { id: 'upcoming', label: 'Upcoming' },
          { id: 'all', label: 'All' },
        ].map((f) => (
          <button
            key={f.id}
            type="button"
            onClick={() => setFilter(f.id)}
            className={`text-xs px-3.5 py-1.5 rounded-lg font-medium transition-all
              ${filter === f.id ? 'bg-[#2563eb] text-white shadow-sm' : 'bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300'}`}
          >
            {f.label}
          </button>
        ))}
        <Link to="/calendar" className="text-xs px-3.5 py-1.5 rounded-lg font-medium border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 flex items-center gap-1">
          <Calendar size={14} /> Calendar View
        </Link>
      </div>

      {loading ? (
        <SkeletonList items={4} />
      ) : meetings.length === 0 ? (
        <div className="card p-8 text-center text-slate-400 text-sm">No meetings scheduled</div>
      ) : (
        <div className="grid gap-3">
          {meetings.map((m) => {
            const isPast = isMeetingPast(m);
            return (
              <div key={m.id} className={`card p-4 ${isPast ? 'opacity-70' : ''}`}>
                <div className="flex items-start justify-between gap-3">
                  <div className="flex-1 min-w-0">
                    <h3 className="font-semibold text-slate-800 dark:text-slate-100">{m.title}</h3>
                    <p className="text-xs text-[#2563eb] font-medium mt-1">{formatMeetingWhen(m)}</p>
                    {m.description && (
                      <p className="text-sm text-slate-600 dark:text-slate-300 mt-2">{m.description}</p>
                    )}
                    <div className="flex flex-wrap gap-3 mt-3 text-xs text-slate-500 dark:text-slate-400">
                      {m.location && (
                        <span className="flex items-center gap-1"><MapPin size={12} /> {m.location}</span>
                      )}
                      {m.meeting_link && (
                        <a href={m.meeting_link} target="_blank" rel="noreferrer" className="flex items-center gap-1 text-[#2563eb] hover:underline">
                          <Video size={12} /> Join link
                        </a>
                      )}
                      <span className="flex items-center gap-1">
                        <Users size={12} /> {(m.attendees || []).length} attendees
                      </span>
                    </div>
                    {m.attendees?.length > 0 && (
                      <p className="text-xs text-slate-400 mt-2">
                        {m.attendees.map((a) => a.name).join(', ')}
                      </p>
                    )}
                  </div>
                  <span className="badge bg-purple-50 text-purple-700 dark:bg-purple-950/40 dark:text-purple-300 shrink-0">
                    {isPast ? 'Past' : 'Scheduled'}
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      )}

      <Modal open={modalOpen} onClose={() => setModalOpen(false)} title="Schedule Meeting" wide>
        <form onSubmit={handleSubmit} className="space-y-3">
          <div>
            <label className="text-xs font-medium text-slate-600 dark:text-slate-300 mb-1 block">Title *</label>
            <input className="input" required value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} />
          </div>
          <div>
            <label className="text-xs font-medium text-slate-600 dark:text-slate-300 mb-1 block">Description</label>
            <textarea className="input" rows={2} value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-medium text-slate-600 dark:text-slate-300 mb-1 block">Date *</label>
              <input type="date" className="input" required value={form.meeting_date} onChange={(e) => setForm({ ...form, meeting_date: e.target.value })} />
            </div>
            <div>
              <label className="text-xs font-medium text-slate-600 dark:text-slate-300 mb-1 block">Reminder (min before)</label>
              <input type="number" min="5" max="1440" className="input" value={form.reminder_minutes} onChange={(e) => setForm({ ...form, reminder_minutes: e.target.value })} />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-medium text-slate-600 dark:text-slate-300 mb-1 block">Start Time *</label>
              <input type="time" className="input" required value={form.start_time} onChange={(e) => setForm({ ...form, start_time: e.target.value })} />
            </div>
            <div>
              <label className="text-xs font-medium text-slate-600 dark:text-slate-300 mb-1 block">End Time</label>
              <input type="time" className="input" value={form.end_time} onChange={(e) => setForm({ ...form, end_time: e.target.value })} />
            </div>
          </div>
          <div>
            <label className="text-xs font-medium text-slate-600 dark:text-slate-300 mb-1 block">Location</label>
            <input className="input" value={form.location} onChange={(e) => setForm({ ...form, location: e.target.value })} placeholder="Room / Office" />
          </div>
          <div>
            <label className="text-xs font-medium text-slate-600 dark:text-slate-300 mb-1 block">Meeting Link</label>
            <input className="input" value={form.meeting_link} onChange={(e) => setForm({ ...form, meeting_link: e.target.value })} placeholder="https://meet.google.com/..." />
          </div>
          <div>
            <label className="text-xs font-medium text-slate-600 dark:text-slate-300 mb-2 block">Attendees (team)</label>
            <div className="max-h-40 overflow-y-auto border border-slate-200 dark:border-slate-700 rounded-lg p-2 space-y-1">
              {users.map((u) => (
                <label key={u.id} className="flex items-center gap-2 text-sm p-1.5 rounded hover:bg-slate-50 dark:hover:bg-slate-800 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={form.attendee_ids.includes(u.id)}
                    onChange={() => toggleAttendee(u.id)}
                  />
                  {u.name} <span className="text-slate-400 text-xs">({u.employee_id})</span>
                </label>
              ))}
            </div>
          </div>
          <button type="submit" disabled={saving} className="btn-primary w-full">
            {saving ? 'Scheduling...' : 'Schedule Meeting'}
          </button>
        </form>
      </Modal>
    </div>
  );
}
