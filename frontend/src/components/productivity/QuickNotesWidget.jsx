import { useEffect, useState, useRef } from 'react';
import { StickyNote, X, Search, Trash2, Minimize2 } from 'lucide-react';
import { api } from '../../api/client';
import { useProductivity } from '../../context/ProductivityContext';

export default function QuickNotesWidget() {
  const { prefs } = useProductivity();
  const [open, setOpen] = useState(false);
  const [notes, setNotes] = useState([]);
  const [search, setSearch] = useState('');
  const [active, setActive] = useState(null);
  const [content, setContent] = useState('');
  const saveTimer = useRef(null);

  const load = () => api.getNotes(search).then(setNotes).catch(() => {});

  useEffect(() => {
    if (prefs.quick_notes_widget && open) load();
  }, [prefs.quick_notes_widget, open, search]);

  if (!prefs.quick_notes_widget) return null;

  const selectNote = (note) => {
    setActive(note?.id || null);
    setContent(note?.content || '');
  };

  const autoSave = (text, id) => {
    clearTimeout(saveTimer.current);
    saveTimer.current = setTimeout(async () => {
      if (!text.trim()) return;
      if (id) {
        const updated = await api.updateNote(id, { content: text });
        setNotes((n) => n.map((x) => (x.id === id ? updated : x)));
      } else {
        const created = await api.createNote({ content: text });
        setActive(created.id);
        setNotes((n) => [created, ...n]);
      }
    }, 600);
  };

  const handleChange = (text) => {
    setContent(text);
    autoSave(text, active);
  };

  const deleteNote = async (id) => {
    await api.deleteNote(id);
    setNotes((n) => n.filter((x) => x.id !== id));
    if (active === id) { setActive(null); setContent(''); }
  };

  if (!open) {
    return (
      <button
        onClick={() => setOpen(true)}
        className="fixed z-[80] bottom-20 lg:bottom-6 left-4 w-12 h-12 rounded-full bg-amber-400 text-white shadow-lg flex items-center justify-center hover:bg-amber-500 transition-colors"
        title="Quick Notes"
      >
        <StickyNote size={20} />
      </button>
    );
  }

  return (
    <div className="fixed z-[80] bottom-20 lg:bottom-6 left-4 w-80 max-w-[calc(100vw-2rem)] card shadow-2xl overflow-hidden animate-scale-in">
      <div className="flex items-center justify-between px-3 py-2 bg-amber-400 text-white">
        <span className="text-sm font-semibold flex items-center gap-1.5"><StickyNote size={16} /> Quick Notes</span>
        <div className="flex gap-1">
          <button onClick={() => { selectNote(null); setContent(''); }} className="p-1 hover:bg-amber-500 rounded" title="New note">
            <span className="text-lg leading-none">+</span>
          </button>
          <button onClick={() => setOpen(false)} className="p-1 hover:bg-amber-500 rounded"><Minimize2 size={14} /></button>
        </div>
      </div>
      <div className="p-2 border-b border-slate-100 dark:border-slate-800">
        <div className="relative">
          <Search size={14} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search notes..."
            className="w-full text-xs pl-8 pr-3 py-1.5 border border-slate-200 dark:border-slate-700 rounded-lg focus:outline-none focus:ring-1 focus:ring-amber-300"
          />
        </div>
      </div>
      <textarea
        value={content}
        onChange={(e) => handleChange(e.target.value)}
        placeholder="Jot down an idea..."
        className="w-full h-32 p-3 text-sm bg-amber-50/50 resize-none focus:outline-none"
        style={{ fontFamily: 'Georgia, serif' }}
      />
      <div className="max-h-28 overflow-y-auto border-t border-slate-100 dark:border-slate-800 divide-y divide-slate-50 dark:divide-slate-800">
        {notes.map((n) => (
          <div
            key={n.id}
            className={`flex items-start gap-2 px-3 py-2 text-xs cursor-pointer hover:bg-slate-50 dark:hover:bg-slate-800 ${active === n.id ? 'bg-amber-50 dark:bg-amber-950/30' : ''}`}
            onClick={() => selectNote(n)}
          >
            <div className="flex-1 min-w-0">
              <p className="truncate text-slate-700 dark:text-slate-200">{n.content}</p>
              <p className="text-slate-400 text-[10px]">{new Date(n.updated_at).toLocaleString()}</p>
            </div>
            <button onClick={(e) => { e.stopPropagation(); deleteNote(n.id); }} className="text-slate-400 hover:text-red-500 p-0.5">
              <Trash2 size={12} />
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}
