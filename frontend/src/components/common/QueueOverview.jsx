import React from 'react';
import { ArrowDownWideNarrow, Clock, Inbox } from 'lucide-react';

export function waitingLabel(date, now = Date.now()) {
  const timestamp = new Date(date).getTime();
  if (!date || !Number.isFinite(timestamp)) return 'Belum tercatat';
  const hours = Math.max(0, Math.floor((now - timestamp) / 3600000));
  if (hours < 1) return 'Kurang dari 1 jam';
  if (hours < 24) return `${hours} jam`;
  return `${Math.floor(hours / 24)} hari ${hours % 24} jam`;
}

export function QueueOverview({ total, oldest, fifo = true, loading = false }) {
  return (
    <section aria-label="Ringkasan antrean" className="grid grid-cols-1 sm:grid-cols-3 gap-3">
      <div className="rounded-xl border border-line bg-white p-4 flex items-center gap-3">
        <span className="rounded-lg bg-brand-50 p-2.5 text-brand-700"><Inbox className="h-5 w-5" /></span>
        <div><p className="text-xs text-ink-muted">Dalam filter ini</p><p className="text-lg font-bold text-ink">{loading ? '…' : total} <span className="text-xs font-medium">naskah</span></p></div>
      </div>
      <div className="rounded-xl border border-brand-100 bg-brand-50/60 p-4 flex items-center gap-3">
        <ArrowDownWideNarrow className="h-5 w-5 shrink-0 text-brand-700" />
        <div><p className="text-sm font-bold text-brand-950">{fifo ? 'Tertua lebih dahulu · FIFO' : 'Riwayat terbaru dahulu'}</p><p className="text-xs text-brand-800 mt-1">{fifo ? 'Urutan berdasarkan waktu masuk tahapan.' : 'Pekerjaan selesai dipisahkan dari antrean aktif.'}</p></div>
      </div>
      <div className="rounded-xl border border-line bg-white p-4 flex items-center gap-3">
        <Clock className="h-5 w-5 shrink-0 text-civic-warning" />
        <div><p className="text-xs text-ink-muted">{fifo ? 'Status antrean teratas' : 'Tampilan riwayat'}</p><p className="text-sm font-bold text-ink mt-1">{loading ? 'Memuat…' : fifo && oldest ? `Terdaftar ${new Date(oldest).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' })}` : '—'}</p></div>
      </div>
    </section>
  );
}

export function QueueItemMeta({ item }) {
  if (!item.queue_position) return null;
  return <span className="inline-flex flex-wrap items-center gap-2 text-xs text-ink-muted">
    <span className="rounded-md bg-surface-subtle px-2 py-1 font-semibold text-ink">Urutan #{item.queue_position}</span>
    {item.queue_entered_at && (
      <span className="text-ink-muted">
        Masuk: {new Date(item.queue_entered_at).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' })}
      </span>
    )}
  </span>;
}

export function QueuePagination({ pagination, loading, onPageChange, label = 'Navigasi halaman antrean' }) {
  const totalPages = pagination.totalPages ?? pagination.total_pages ?? 0;
  return <nav aria-label={label} className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-line bg-white p-4 text-xs text-ink-muted">
    <span aria-live="polite">Halaman {pagination.page} dari {Math.max(1, totalPages)} · {pagination.total} naskah</span>
    <div className="flex gap-2">
      <button type="button" disabled={loading || pagination.page <= 1} onClick={() => onPageChange(pagination.page - 1)} className="rounded-lg border border-line-strong px-3 py-2 font-semibold hover:bg-canvas disabled:opacity-40">Sebelumnya</button>
      <button type="button" disabled={loading || pagination.page >= totalPages} onClick={() => onPageChange(pagination.page + 1)} className="rounded-lg border border-line-strong px-3 py-2 font-semibold hover:bg-canvas disabled:opacity-40">Selanjutnya</button>
    </div>
  </nav>;
}
