import React, { useEffect, useRef, useState } from 'react';
import { CalendarDays, ChevronLeft, ChevronRight } from 'lucide-react';

const ymd = (d) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
const fmt = (s) => (s ? new Date(`${s}T00:00:00`).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' }) : '');
const DAYS = ['Min', 'Sen', 'Sel', 'Rab', 'Kam', 'Jum', 'Sab'];

// Satu kolom tanggal seperti sistem lama: klik pertama = tanggal awal, klik kedua = tanggal akhir.
export function DateRangeField({ id, from, to, onChange }) {
  const [open, setOpen] = useState(false);
  const [month, setMonth] = useState(() => (from ? new Date(`${from}T00:00:00`) : new Date()));
  const [pending, setPending] = useState(null); // tanggal awal yang menunggu tanggal akhir
  const ref = useRef(null);

  useEffect(() => {
    if (!open) return undefined;
    const close = (e) => { if (e.type === 'keydown' ? e.key === 'Escape' : !ref.current?.contains(e.target)) { setOpen(false); setPending(null); } };
    document.addEventListener('mousedown', close);
    document.addEventListener('keydown', close);
    return () => { document.removeEventListener('mousedown', close); document.removeEventListener('keydown', close); };
  }, [open]);

  const pick = (day) => {
    if (!pending) { setPending(day); return; }
    const [a, b] = pending <= day ? [pending, day] : [day, pending];
    onChange({ from: a, to: b });
    setPending(null);
    setOpen(false);
  };

  const first = new Date(month.getFullYear(), month.getMonth(), 1);
  const cells = [...Array(first.getDay()).fill(null),
    ...Array.from({ length: new Date(month.getFullYear(), month.getMonth() + 1, 0).getDate() }, (_, i) => ymd(new Date(month.getFullYear(), month.getMonth(), i + 1)))];
  const lo = pending || from;
  const hi = pending ? null : to;
  const label = from ? `${fmt(from)} – ${fmt(to || from)}` : 'Pilih tanggal…';

  return (
    <div ref={ref} className="relative mt-1">
      <button id={id} type="button" aria-haspopup="dialog" aria-expanded={open} onClick={() => setOpen((o) => !o)}
        className="flex w-full items-center justify-between gap-2 rounded-lg border border-line-strong bg-white px-3 py-2 text-left text-sm text-ink focus:outline-none focus:ring-2 focus:ring-brand-700/20 focus:border-brand-700">
        <span className={from ? '' : 'text-ink-muted'}>{label}</span>
        <CalendarDays aria-hidden="true" className="h-4 w-4 text-ink-muted" />
      </button>
      {open && (
        <div role="dialog" aria-label="Pilih rentang tanggal" className="absolute right-0 z-30 mt-1 w-72 rounded-xl border border-line bg-white p-3 shadow-lg">
          <div className="mb-2 flex items-center justify-between">
            <button type="button" aria-label="Bulan sebelumnya" className="rounded p-1 hover:bg-surface-subtle" onClick={() => setMonth(new Date(month.getFullYear(), month.getMonth() - 1, 1))}><ChevronLeft className="h-4 w-4" /></button>
            <span className="text-sm font-bold text-ink">{month.toLocaleDateString('id-ID', { month: 'long', year: 'numeric' })}</span>
            <button type="button" aria-label="Bulan berikutnya" className="rounded p-1 hover:bg-surface-subtle" onClick={() => setMonth(new Date(month.getFullYear(), month.getMonth() + 1, 1))}><ChevronRight className="h-4 w-4" /></button>
          </div>
          <div className="grid grid-cols-7 gap-0.5 text-center text-xs">
            {DAYS.map((d) => <span key={d} className="py-1 font-semibold text-ink-muted">{d}</span>)}
            {cells.map((day, i) => {
              if (!day) return <span key={`x${i}`} />;
              const edge = day === lo || day === hi;
              const inside = lo && hi && day > lo && day < hi;
              return (
                <button key={day} type="button" aria-label={fmt(day)} aria-pressed={edge}
                  onClick={() => pick(day)}
                  className={`rounded py-1.5 ${edge ? 'bg-brand-700 font-bold text-white' : inside ? 'bg-brand-100 text-ink' : 'text-ink hover:bg-surface-subtle'}`}>
                  {Number(day.slice(8))}
                </button>
              );
            })}
          </div>
          <div className="mt-2 flex items-center justify-between text-xs">
            <span className="text-ink-muted">{pending ? 'Pilih tanggal akhir' : 'Pilih tanggal awal'}</span>
            <button type="button" className="font-semibold text-brand-fg hover:underline" onClick={() => { onChange({ from: '', to: '' }); setPending(null); setOpen(false); }}>Semua waktu</button>
          </div>
        </div>
      )}
    </div>
  );
}
