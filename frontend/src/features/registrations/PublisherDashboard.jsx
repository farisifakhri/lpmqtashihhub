import React, { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { Plus, ArrowRight, RefreshCw, ShieldCheck, BookOpen, AlertCircle, Award, Clock, FileText, CreditCard, Building2 } from 'lucide-react';
import { useAuth } from '@/features/auth/AuthContext';
import { registrationApi } from '@/api/registration.api';
import { Button } from '@/components/ui/Button';
import { PublisherRegistrationCard } from './PublisherRegistrationCard';
import { ACTION_STATUSES, publisherAction } from './publisher-status';

export const PublisherDashboard = () => {
  const { currentUser } = useAuth();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const requestId = useRef(0);
  const load = async () => {
    const request = ++requestId.current;
    setLoading(true); setError('');
    try {
      const [recent, actions] = await Promise.all([
        registrationApi.listRegistrations({ page: 1, limit: 6 }),
        registrationApi.listRegistrations({ page: 1, limit: 5, segment: 'PUBLISHER_ACTIONS' }),
      ]);
      if (request === requestId.current) setData({ recent, actions });
    } catch (err) { if (request === requestId.current) setError(err.message || 'Dashboard tidak dapat dimuat. Coba kembali.'); }
    finally { if (request === requestId.current) setLoading(false); }
  };
  useEffect(() => { setData(null); load(); return () => { requestId.current += 1; }; }, [currentUser?.id]);
  const counts = data?.recent.summary?.by_status;
  const total = data?.recent.pagination?.total;
  const actionCount = counts ? ACTION_STATUSES.reduce((sum, status) => sum + (counts[status] || 0), 0) : data?.actions.pagination?.total;
  const processing = counts ? Object.entries(counts).reduce((sum, [status, count]) => sum + (!ACTION_STATUSES.includes(status) && !['COMPLETED', 'CANCELLED'].includes(status) ? count : 0), 0) : null;
  const metrics = [
    { label: 'Total pengajuan', value: total, icon: BookOpen, color: 'bg-slate-100 text-slate-700', path: '/publisher/registrations' },
    { label: 'Perlu tindakan', value: actionCount, icon: AlertCircle, color: 'bg-amber-100 text-amber-800', path: '/publisher/registrations?view=actions' },
    { label: 'Sedang diproses', value: processing, icon: Clock, color: 'bg-sky-100 text-sky-800', path: '/publisher/registrations?view=processing' },
    { label: 'Naskah dengan STT terbit', value: data?.recent.summary?.issued_stt, icon: Award, color: 'bg-emerald-100 text-emerald-800', path: '/publisher/documents' },
  ];
  return <div className="max-w-6xl mx-auto space-y-7 pb-12">
    <header className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-emerald-950 via-emerald-900 to-teal-800 p-6 sm:p-8 text-white shadow-md">
      <div className="absolute -right-16 -top-24 w-80 h-80 rounded-full border-[32px] border-white/5 pointer-events-none" aria-hidden="true" />
      <div className="relative flex flex-col sm:flex-row justify-between gap-6"><div className="max-w-xl"><p className="flex items-center gap-2 text-xs font-semibold tracking-wide text-emerald-200"><Building2 className="h-4 w-4" />PORTAL PENERBIT</p><h1 className="mt-3 text-2xl sm:text-3xl font-bold tracking-tight">Perjalanan naskah Anda, dalam satu tempat.</h1><p className="mt-3 text-sm text-emerald-100 leading-relaxed">{currentUser?.publisherName || currentUser?.name} · Pantau progres, selesaikan perbaikan, dan kelola pembayaran tanpa melewatkan langkah berikutnya.</p><p className="mt-4 flex gap-2 items-center text-xs text-emerald-200"><ShieldCheck className="h-4 w-4" />Data pengajuan dibatasi sesuai akses akun penerbit Anda.</p></div><Link to="/publisher/new-registration" className="inline-flex items-center justify-center gap-2 self-start rounded-xl bg-white text-emerald-950 font-bold px-5 py-3 text-sm shadow-sm hover:bg-emerald-50 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4"><Plus className="h-4 w-4" />Ajukan Naskah Baru</Link></div>
    </header>
    <div className="flex justify-between items-center gap-3"><p className="text-xs text-slate-500">Ringkasan seluruh pengajuan, bukan hanya halaman terbaru.</p><Button variant="outline" size="sm" disabled={loading} onClick={load}><RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />Muat ulang</Button></div>
    {error && <p role="alert" className="rounded-xl border border-rose-200 bg-rose-50 p-4 text-sm text-rose-800">{error} Gunakan Muat ulang untuk mencoba kembali.</p>}
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">{metrics.map(({ label, value, icon: Icon, color, path }) => <Link key={label} to={path} className="rounded-2xl border border-slate-200 bg-white p-4 sm:p-5 hover:border-emerald-400 transition-colors shadow-xs"><div className={`inline-flex rounded-xl p-2.5 ${color}`}><Icon className="h-5 w-5" /></div><p className="mt-3 text-xs sm:text-sm text-slate-600">{label}</p><p className="mt-1 text-2xl font-bold text-slate-900">{loading || error ? '—' : value ?? '—'}</p></Link>)}</div>
    <section aria-labelledby="publisher-actions-title" className="rounded-2xl border border-amber-200 bg-amber-50/40 p-5 sm:p-6">
      <div className="flex flex-wrap items-center justify-between gap-3"><div><h2 id="publisher-actions-title" className="flex items-center gap-2 text-lg font-bold text-slate-900"><AlertCircle className="h-5 w-5 text-amber-700" />Perlu tindakan</h2><p className="mt-1 text-sm text-slate-600">Langkah yang bisa Anda selesaikan sekarang.</p></div><Link to="/publisher/registrations?view=actions" className="text-xs font-bold text-emerald-800 hover:underline">Lihat semua tindakan<ArrowRight className="inline h-4 w-4 ml-1" /></Link></div>
      {loading ? <p role="status" className="mt-5 text-sm text-slate-500">Memuat pengajuan…</p> : !error && <div className="mt-5 space-y-3">{data?.actions.data?.length ? data.actions.data.map(registration => { const action = publisherAction(registration); return action && <article key={registration.id} className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 rounded-xl border border-amber-100 bg-white p-4"><div className="min-w-0"><p className="text-xs font-mono text-slate-500">{registration.registration_no}</p><h3 className="mt-1 font-semibold text-slate-900 break-words">{registration.title}</h3><p className="mt-1 text-xs text-slate-500">{action.description}</p></div><Link to={action.path} className="inline-flex shrink-0 items-center justify-center gap-2 rounded-lg bg-emerald-700 px-4 py-3 text-xs font-bold text-white hover:bg-emerald-800">{action.label}<ArrowRight className="h-4 w-4" /></Link></article>; }) : <p className="rounded-xl bg-white p-4 text-sm text-emerald-800">Tidak ada tindakan yang tertunda. Progres naskah tetap bisa dipantau di bawah.</p>}{data?.actions.pagination?.total > 5 && <p className="text-xs text-slate-500">Menampilkan 5 dari {data.actions.pagination.total} pengajuan yang perlu tindakan.</p>}</div>}
    </section>
    <section aria-labelledby="publisher-recent-title"><div className="flex flex-wrap justify-between items-center gap-3 mb-4"><div><h2 id="publisher-recent-title" className="text-lg font-bold text-slate-900">Pengajuan terbaru</h2><p className="text-sm text-slate-500 mt-1">Urut pengajuan terbaru. Antrean kerja FIFO dikelola tim internal.</p></div><Link to="/publisher/registrations" className="text-xs font-bold text-emerald-800 hover:underline">Semua pengajuan<ArrowRight className="inline h-4 w-4 ml-1" /></Link></div>{!loading && !error && (data?.recent.data?.length ? <div className="grid md:grid-cols-2 gap-4">{data.recent.data.map(registration => <PublisherRegistrationCard key={registration.id} registration={registration} />)}</div> : <div className="rounded-2xl border border-dashed border-slate-300 bg-white p-8 text-center"><BookOpen className="h-8 w-8 text-emerald-700 mx-auto" /><h3 className="mt-3 font-bold text-slate-900">Belum ada pengajuan</h3><p className="mt-2 text-sm text-slate-500">Mulai dengan memilih layanan dan membuat draf naskah pertama Anda.</p><Link to="/publisher/new-registration" className="inline-flex mt-4 text-sm font-bold text-emerald-800 hover:underline">Buat pengajuan pertama<ArrowRight className="h-4 w-4 ml-2" /></Link></div>)}</section>
    <div className="grid sm:grid-cols-2 gap-4">{[{ title: 'Tagihan & bukti bayar', desc: 'Periksa kode billing dan konfirmasi pembayaran.', path: '/publisher/billing', icon: CreditCard }, { title: 'Arsip Surat Tanda Tashih', desc: 'Akses STT yang sudah diterbitkan untuk naskah Anda.', path: '/publisher/documents', icon: FileText }].map(({ title, desc, path, icon: Icon }) => <Link key={path} to={path} className="flex gap-4 items-center rounded-2xl border border-slate-200 p-5 bg-white hover:border-emerald-400"><Icon className="h-6 w-6 text-emerald-700 shrink-0" /><div className="flex-1"><h2 className="text-sm font-bold text-slate-900">{title}</h2><p className="text-xs text-slate-500 mt-1">{desc}</p></div><ArrowRight className="h-4 w-4 text-slate-400" /></Link>)}</div>
  </div>;
};

export default PublisherDashboard;
