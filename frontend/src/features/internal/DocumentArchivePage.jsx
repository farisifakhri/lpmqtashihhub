import React, { useEffect, useState } from 'react';
import { registrationApi } from '@/api/registration.api';
import { DocumentArchive } from '@/components/common/DocumentArchive';

export function DocumentArchivePage() {
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [items, setItems] = useState([]);
  const [pagination, setPagination] = useState(null);
  const [error, setError] = useState('');

  useEffect(() => {
    let active = true;
    registrationApi.listRegistrations({ page, limit: 12, search: search || undefined })
      .then(response => {
        if (!active) return;
        setItems(response.data || []);
        setPagination(response.pagination || null);
        setError('');
      })
      .catch(err => { if (active) setError(err.message || 'Arsip tidak dapat dimuat.'); });
    return () => { active = false; };
  }, [page, search]);

  return <main className="mx-auto max-w-6xl space-y-5 pb-12">
    <header><h1 className="text-2xl font-bold text-ink">Arsip Dokumen</h1><p className="text-sm text-ink-muted">Semua versi surat, nota dinas, dan hasil tashih untuk laporan Posdok-Q.</p></header>
    <label className="block text-sm">Cari naskah atau nomor pengajuan
      <input className="mt-1 w-full rounded-lg border border-line-strong p-2" value={search} onChange={event => { setSearch(event.target.value); setPage(1); }} />
    </label>
    {error && <p role="alert" className="text-sm text-civic-danger">{error}</p>}
    {!error && !items.length && <p className="text-sm text-ink-muted">Belum ada pengajuan yang cocok.</p>}
    {items.map(item => <article key={item.id} className="rounded-xl border border-line bg-white p-5 space-y-4">
      <div><h2 className="font-semibold text-ink">{item.title}</h2><p className="text-xs text-ink-muted">{item.registration_no} · {item.publisher?.legal_name}</p></div>
      <DocumentArchive registrationId={item.id} />
    </article>)}
    {pagination && <nav className="flex gap-3" aria-label="Halaman arsip">
      <button type="button" disabled={page <= 1} onClick={() => setPage(value => value - 1)}>Sebelumnya</button>
      <span>Halaman {page} dari {pagination.totalPages || 1}</span>
      <button type="button" disabled={page >= pagination.totalPages} onClick={() => setPage(value => value + 1)}>Selanjutnya</button>
    </nav>}
  </main>;
}
