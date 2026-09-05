import { useEffect, useMemo, useRef, useState } from 'react';
import { Search } from 'lucide-react';
import { cn } from '../utils/helpers';

const normalize = (s = '') => s.trim().toLowerCase();

export default function StudentPicker({
  students = [],
  value = [],
  onChange,
  label = 'Assign students',
  emptyText = 'No students available',
  searchStudents,
}) {
  const [query, setQuery] = useState('');
  const [remote, setRemote] = useState(null);
  const [searching, setSearching] = useState(false);
  const timer = useRef(null);

  const selected = useMemo(() => new Set(value.map(String)), [value]);

  useEffect(() => {
    if (!searchStudents) return undefined;

    const q = query.trim();
    if (!q) return undefined;

    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(async () => {
      setSearching(true);
      try {
        const results = await searchStudents(q);
        setRemote(results || []);
      } catch {
        setRemote(null);
      } finally {
        setSearching(false);
      }
    }, 250);

    return () => {
      if (timer.current) clearTimeout(timer.current);
    };
  }, [query, searchStudents]);

  const q = normalize(query);
  const hasQuery = q.length > 0;

  const list = useMemo(() => {
    if (!hasQuery) return students;
    if (remote) return remote;
    if (!searchStudents) {
      return students.filter(
        (s) =>
          `${s.firstName} ${s.lastName}`.toLowerCase().includes(q) ||
          (s.email || '').toLowerCase().includes(q) ||
          (s.studentId || '').toLowerCase().includes(q)
      );
    }
    return [];
  }, [hasQuery, q, remote, students, searchStudents]);

  const toggle = (id) => {
    const next = new Set(selected);
    const key = String(id);
    if (next.has(key)) next.delete(key);
    else next.add(key);
    onChange(Array.from(next));
  };

  const allSelected = list.length > 0 && list.every((s) => selected.has(String(s._id)));

  const toggleAll = () => {
    const next = new Set(selected);
    if (allSelected) {
      list.forEach((s) => next.delete(String(s._id)));
    } else {
      list.forEach((s) => next.add(String(s._id)));
    }
    onChange(Array.from(next));
  };

  return (
    <div className="space-y-2">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <label className="block text-sm font-medium text-slate-700 dark:text-slate-300">
          {label}
        </label>
        {list.length > 0 && (
          <div className="flex gap-2 text-xs">
            <button
              type="button"
              onClick={toggleAll}
              className="font-medium text-brand-700 hover:underline dark:text-brand-400"
            >
              {allSelected ? 'Clear all' : 'Select all'}
            </button>
          </div>
        )}
      </div>

      <div className="relative">
        <Search
          size={15}
          className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
        />
        <input
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search students…"
          className="w-full rounded-xl border border-slate-200 bg-white py-2 pl-9 pr-3 text-sm text-ink outline-none transition focus:border-brand-500 focus:ring-2 focus:ring-brand-500/20 dark:border-slate-700 dark:bg-slate-900 dark:text-sand"
        />
      </div>

      <div className="max-h-56 overflow-y-auto rounded-xl border border-slate-200 dark:border-slate-700">
        {searching ? (
          <p className="px-3 py-4 text-center text-sm text-slate-400">Searching…</p>
        ) : list.length === 0 ? (
          <p className="px-3 py-4 text-center text-sm text-slate-400">{emptyText}</p>
        ) : (
          list.map((s) => {
            const checked = selected.has(String(s._id));
            return (
              <label
                key={s._id}
                className={cn(
                  'flex cursor-pointer items-center gap-3 border-b border-slate-100 px-3 py-2.5 text-sm transition last:border-0 dark:border-slate-800',
                  checked ? 'bg-brand-50 dark:bg-brand-950/40' : 'hover:bg-mist dark:hover:bg-slate-800'
                )}
              >
                <input
                  type="checkbox"
                  checked={checked}
                  onChange={() => toggle(s._id)}
                  className="h-4 w-4 rounded border-slate-300 text-brand-700 focus:ring-brand-500"
                />
                <div className="min-w-0 flex-1">
                  <p className="truncate font-medium text-ink dark:text-sand">
                    {s.firstName} {s.lastName}
                  </p>
                  <p className="truncate text-xs text-slate-400">{s.email}</p>
                </div>
              </label>
            );
          })
        )}
      </div>

      <div className="flex items-center justify-between text-xs text-slate-500">
        <span>Selected: {selected.size} students</span>
        {selected.size > 0 ? (
          <span className="text-brand-700 dark:text-brand-400">
            This exam will be available only to the selected students.
          </span>
        ) : (
          <span>None selected</span>
        )}
      </div>
    </div>
  );
}
