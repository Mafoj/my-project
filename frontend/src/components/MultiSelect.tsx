import { useEffect, useMemo, useRef, useState } from 'react';

interface Props {
  options: string[];
  value: string[];
  onChange: (v: string[]) => void;
}

export function MultiSelect({ options, value, onChange }: Props) {
  const [open, setOpen] = useState(false);
  const [q, setQ] = useState('');
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const h = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', h);
    return () => document.removeEventListener('mousedown', h);
  }, []);

  const filtered = useMemo(
    () => options.filter((o) => o.toLowerCase().includes(q.toLowerCase())),
    [options, q],
  );
  const toggle = (o: string) => onChange(value.includes(o) ? value.filter((v) => v !== o) : [...value, o]);
  const label = value.length === 0 ? 'All' : value.length === 1 ? value[0] : `${value.length} selected`;

  return (
    <div className="ms-wrap" ref={ref}>
      <button type="button" className="ms-btn" onClick={() => setOpen((o) => !o)}>
        <span className="ms-btn-label">{label}</span>
        <span className="ms-caret">▾</span>
      </button>
      {open && (
        <div className="ms-dropdown">
          <div className="ms-search">
            <input autoFocus value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search…" />
          </div>
          {filtered.map((o) => (
            <label key={o} className="ms-option">
              <input type="checkbox" checked={value.includes(o)} onChange={() => toggle(o)} />
              <span>{o}</span>
            </label>
          ))}
          {filtered.length === 0 && <div className="ms-empty">No results</div>}
        </div>
      )}
    </div>
  );
}
