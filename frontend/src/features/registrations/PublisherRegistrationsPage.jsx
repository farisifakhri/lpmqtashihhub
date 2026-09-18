import React, { useEffect, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { ArrowLeft, Search, RefreshCw, Plus } from 'lucide-react';
import { useAuth } from '@/features/auth/AuthContext';
import { registrationApi } from '@/api/registration.api';
import { Button } from '@/components/ui/Button';
import { QueuePagination } from '@/components/common/QueueOverview';
import { PublisherRegistrationCard } from './PublisherRegistrationCard';
import { PublisherDocumentList } from './PublisherDocumentList';

const options = [
  ['ALL', 'Semua permohonan'], ['actions', 'Perlu tindakan'], ['processing', 'Sedang diproses'],
  ['DRAFT', 'Draf'], ['REVISION_REQUIRED', 'Perlu perbaikan'], ['AWAITING_PAYMENT', 'Menunggu pembayaran'],
  ['PAYMENT_VERIFICATION', 'Bukti bayar diperiksa'], ['COMPLETED', 'Selesai'], ['CANCELLED', 'Dibatalkan'],
];
export function PublisherRegistrationsPage({ documents = false }) {
  const { currentUser } = useAuth();
  const [params, setParams] = useSearchParams();
  const query = params.get('search') || '';
  const view = params.get('view') || 'ALL';
  const requestedPage = Number(params.get('page'));
  const page = Number.isSafeInteger(requestedPage) && requestedPage > 0 && requestedPage <= 1000000 ? requestedPage : 1;
  const [search, setSearch] = useState(query);
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [refresh, setRefresh] = useState(0);
  const change = changes => { const next = new URLSearchParams(params); Object.entries(changes).forEach(([key, value]) => value ? next.set(key, value) : next.delete(key)); setParams(next, { replace: true }); };
  useEffect(() => { setSearch(query); }, [query]);
  useEffect(() => {
    if (search === query) return;
    const timer = setTimeout(() => change({ search: search.trim(), page: null }), 300);
    return () => clearTimeout(timer);
  }, [search, query, view]);
  useEffect(() => {
    let active = true;
    setLoading(true); setError('');
    registrationApi.listRegistrations({ page, limit: 12, search: query || undefined,
      segment: documents ? 'PUBLISHER_DOCUMENTS' : view === 'actions' ? 'PUBLISHER_ACTIONS' : view === 'processing' ? 'PUBLISHER_PROCESSING' : undefined,
      status: !documents && options.some(([key]) => key === view) && !['ALL', 'actions', 'processing'].includes(view) ? view : undefined,
    }).then(response => { if (active) setData(response); }).catch(err => { if (active) setError(err.message || 'Permohonan tidak dapat dimuat.'); }).finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [currentUser?.id, documents, page, query, view, refresh]);
  return <div className="max-w-6xl mx-auto space-y-6 pb-12">
    <Link to="/publisher" className="inline-flex items-center gap-2 text-sm text-slate-500 hover:text-emerald-800"><ArrowLeft className="h-4 w-4" />Dashboard penerbit</Link>
    <header className="flex flex-wrap items-center justify-between gap-4"><div><h1 className="text-2xl font-bold text-slate-900">{documents ? 'Arsip Surat Tanda Tashih' : 'Riwayat permohonan naskah'}</h1><p className="text-sm text-slate-500 mt-2">{documents ? 'Hanya STT yang sudah diterbitkan. Draf dan dokumen yang dicabut tidak ditampilkan.' : 'Cari naskah, lihat progres, dan lanjutkan tindakan sesuai tahapnya.'}</p></div>{!documents && <Link to="/publisher/new-registration" className="inline-flex gap-2 items-center rounded-xl bg-emerald-700 text-white p-3 text-sm font-bold hover:bg-emerald-800"><Plus className="h-4 w-4" />Buat Permohonan Baru</Link>}</header>
    <div className="flex flex-col sm:flex-row gap-3 bg-white border border-slate-200 rounded-2xl p-4"><div className="relative flex-1"><label htmlFor="publisher-history-search" className="sr-only">Cari judul atau nomor permohonan</label><Search className="absolute left-3 top-3 h-4 w-4 text-slate-400" /><input id="publisher-history-search" value={search} onChange={event => setSearch(event.target.value)} placeholder="Cari judul atau nomor permohonan…" className="w-full rounded-xl border border-slate-300 py-2.5 pl-9 pr-3 text-sm focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-600" /></div>{!documents && <><label htmlFor="publisher-history-filter" className="sr-only">Filter permohonan</label><select id="publisher-history-filter" value={view} onChange={event => change({ view: event.target.value, page: null })} className="rounded-xl border border-slate-300 p-2.5 text-sm">{options.map(([key, label]) => <option key={key} value={key}>{label}</option>)}</select></>}<Button variant="outline" size="sm" disabled={loading} onClick={() => setRefresh(value => value + 1)}><RefreshCw className="h-4 w-4" />Muat ulang</Button></div>
    {error && <p role="alert" className="rounded-xl bg-rose-50 border border-rose-200 p-4 text-sm text-rose-800">{error}</p>}
    {loading ? <p role="status" className="text-sm text-slate-500">Memuat {documents ? 'arsip STT' : 'permohonan'}…</p> : !error && <>{data?.data?.length ? <div className={`grid gap-4 ${documents ? '' : 'md:grid-cols-2'}`}>{data.data.map(registration => documents ? <article key={registration.id} className="rounded-2xl border border-slate-200 bg-white p-5 space-y-4"><div><Link to={`/publisher/registrations/${registration.id}`} className="font-bold text-slate-900 hover:text-emerald-800">{registration.title}</Link><p className="font-mono text-xs text-slate-500 mt-1">{registration.registration_no}</p></div><PublisherDocumentList documents={registration.official_documents} /></article> : <PublisherRegistrationCard key={registration.id} registration={registration} />)}</div> : <p className="rounded-2xl border border-dashed border-slate-300 bg-white p-8 text-center text-sm text-slate-500">{query || view !== 'ALL' ? 'Tidak ada permohonan yang cocok. Ubah pencarian atau filter Anda.' : documents ? 'Belum ada STT yang diterbitkan untuk naskah Anda.' : 'Belum ada permohonan. Mulai dengan membuat draf naskah baru.'}</p>}{data?.pagination && <QueuePagination label="Navigasi riwayat permohonan" pagination={data.pagination} loading={loading} onPageChange={value => change({ page: value })} />}</>}
  </div>;
}
