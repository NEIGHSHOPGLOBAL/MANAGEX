import { useMemo, useState } from 'react';

export default function UserMultiSelect({ users, value = [], onChange, required = false, placeholder = 'Select people' }) {
  const [open, setOpen] = useState(false);
  const selected = useMemo(() => new Set((value || []).map(Number)), [value]);

  const toggle = (id) => {
    const next = new Set(selected);
    if (next.has(id)) next.delete(id);
    else next.add(id);
    onChange(Array.from(next));
  };

  const label = users
    .filter((u) => selected.has(u.id))
    .map((u) => u.name)
    .join(', ');

  return (
    <div className="relative">
      <button
        type="button"
        className="input text-left flex items-center justify-between gap-2"
        onClick={() => setOpen((v) => !v)}
      >
        <span className={label ? 'text-slate-800 dark:text-slate-100' : 'text-slate-400'}>
          {label || placeholder}
        </span>
        <span className="text-xs text-slate-400">{selected.size || 0} selected</span>
      </button>
      {required && selected.size === 0 && (
        <input tabIndex={-1} className="absolute opacity-0 h-0 w-0" required value="" readOnly />
      )}
      {open && (
        <div className="absolute z-50 mt-1 w-full max-h-48 overflow-y-auto rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 shadow-lg p-2 space-y-1">
          {users.map((u) => (
            <label key={u.id} className="flex items-center gap-2 px-2 py-1.5 rounded hover:bg-slate-50 dark:hover:bg-slate-800 cursor-pointer text-sm">
              <input
                type="checkbox"
                checked={selected.has(u.id)}
                onChange={() => toggle(u.id)}
              />
              <span>{u.name}</span>
              {u.employee_id && <span className="text-xs text-slate-400">({u.employee_id})</span>}
            </label>
          ))}
        </div>
      )}
    </div>
  );
}
