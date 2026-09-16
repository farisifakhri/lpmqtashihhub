import React, { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { ArrowLeft, Upload, Send, RefreshCw } from 'lucide-react';
import { registrationApi } from '@/api/registration.api';
import { reportApi } from '@/api/report.api';
import { fileApi } from '@/api/file.api';
import { useAuth } from '@/features/auth/AuthContext';
import { Button } from '@/components/ui/Button';
import { StatusBadge } from '@/components/ui/StatusBadge';
import { PublisherProgress } from './PublisherProgress';
import { PublisherDocumentList } from './PublisherDocumentList';
import { publisherAction, dateLabel } from './publisher-status';

const fileTypes = { COVER: 'Sampul / cover', SAMPLE_PAGE_1_5: 'Sampel halaman 1–5', DUMMY: 'Dumi perbaikan', MASTER_COMPLETED: 'Master lengkap perbaikan' };
export function PublisherRegistrationDetailPage() {
  const { id } = useParams();
  const { currentUser } = useAuth();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [type, setType] = useState('COVER');
  const [file, setFile] = useState(null);
  const [volumeCount, setVolumeCount] = useState(30);
  const [refresh, setRefresh] = useState(0);
  useEffect(() => {
    let active = true;
    setLoading(true); setError('');
    Promise.all([registrationApi.getDetail(id), reportApi.getRegistrationTimeline(id)]).then(([detail, timeline]) => {
      if (active) { setData({ ...detail.data, timeline: timeline.data.timeline }); setVolumeCount(detail.data.physical_master_intake?.volume_count || 30); }
    }).catch(err => { if (active) setError(err.message || 'Detail naskah tidak dapat dimuat.'); }).finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [id, refresh, currentUser?.id]);
  useEffect(() => { setData(null); setSuccess(''); setFile(null); setType('COVER'); }, [id, currentUser?.id]);
  const editable = data && ['DRAFT', 'REVISION_REQUIRED'].includes(data.status);
  const revision = data?.status === 'REVISION_REQUIRED';
  const action = data && publisherAction(data);
  const run = async (operation, message) => {
    if (busy) return;
    setBusy(true); setError(''); setSuccess('');
    try { await operation(); setSuccess(message); setRefresh(value => value + 1); }
    catch (err) { setError(err.message || 'Tindakan gagal. Muat ulang untuk memastikan status terbaru.'); }
    finally { setBusy(false); }
  };
  const upload = event => {
    event.preventDefault();
    if (!file || busy) return;
    if (!['application/pdf', 'image/png', 'image/jpeg'].includes(file.type) || !file.size || file.size > 10 * 1024 * 1024) { setError('Pilih PDF, PNG, atau JPEG berisi data dengan ukuran maksimal 10 MB.'); return; }
    run(async () => { const uploaded = await fileApi.upload(file); await registrationApi.addManuscript(id, { type, file_id: uploaded.id }); setFile(null); event.target.querySelector('input[type="file"]').value = ''; }, 'Berkas berhasil ditambahkan sebagai versi baru.');
  };
  const revisionNote = [...(data?.timeline || [])].reverse().find(item => item.to_status === 'REVISION_REQUIRED')?.notes;
  const requiredFiles = ['COVER', 'SAMPLE_PAGE_1_5'].every(required => data?.manuscript_files?.some(item => item.type === required));
  const fee = data?.fee_sla_snapshot?.total_fee;
  const savePhysical = event => {
    event.preventDefault();
    const existing = data.physical_master_intake;
    run(() => registrationApi.declarePhysicalMaster(id, {
      format: 'A4', binding_method: 'PER_JUZ', volume_count: Number(volumeCount),
      ...(existing?.sent_at ? { sent_at: existing.sent_at } : {}),
      ...(existing?.delivery_method ? { delivery_method: existing.delivery_method } : {}),
      ...(existing?.notes ? { notes: existing.notes } : {}),
    }), 'Pernyataan master fisik berhasil disimpan.');
  };
  return <div className="max-w-5xl mx-auto space-y-6 pb-12">
    <Link to="/publisher/registrations" className="inline-flex gap-2 items-center text-sm text-slate-500 hover:text-emerald-800"><ArrowLeft className="h-4 w-4" />Riwayat pengajuan</Link>
    {error && <p role="alert" className="rounded-xl bg-rose-50 border border-rose-200 text-rose-800 p-4 text-sm">{error}</p>}
    {!loading && !data && error && <Button variant="outline" size="sm" onClick={() => setRefresh(value => value + 1)}>Muat ulang</Button>}
    {success && <p role="status" className="rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 p-4 text-sm">{success}</p>}
    {loading ? <p role="status" className="text-sm text-slate-500">Memuat detail naskah…</p> : data && <>
      <header className="rounded-2xl border border-slate-200 bg-white p-5 sm:p-6 space-y-4"><div className="flex flex-wrap justify-between gap-4"><div className="min-w-0"><p className="font-mono text-xs text-emerald-700">{data.registration_no}</p><h1 className="text-2xl font-bold text-slate-900 mt-2 break-words">{data.title}</h1><p className="mt-2 text-sm text-slate-500">{data.service_type?.name} · Dibuat {dateLabel(data.created_at)}</p>{fee !== undefined && <p className="mt-1 text-xs text-slate-500">Biaya pengajuan: {new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', maximumFractionDigits: 0 }).format(Number(fee))} · bukan status pelunasan</p>}</div><StatusBadge status={data.status} /></div><PublisherProgress registration={data} /><Button variant="outline" size="sm" disabled={busy} onClick={() => setRefresh(value => value + 1)}><RefreshCw className="h-4 w-4" />Muat ulang</Button></header>
      {revision && <section className="rounded-2xl border border-amber-200 bg-amber-50 p-5"><h2 className="font-bold text-amber-900">Catatan perbaikan</h2><p className="text-sm text-amber-900 mt-2 whitespace-pre-wrap break-words">{revisionNote || 'Petugas meminta perbaikan. Hubungi pengelola layanan bila rincian belum tersedia.'}</p><p className="text-xs text-amber-800 mt-3">Unggah versi terbaru tanpa menghapus riwayat berkas, kemudian ajukan ulang.</p></section>}
      {action && !editable && <Link to={action.path} className="inline-flex rounded-xl bg-emerald-700 text-white p-3 text-sm font-bold hover:bg-emerald-800">{action.label}</Link>}
      <div className="grid lg:grid-cols-[1.2fr_1fr] gap-6 items-start"><div className="space-y-6">
        <section className="rounded-2xl border border-slate-200 bg-white p-5 space-y-4"><h2 className="font-bold text-slate-900">Berkas naskah</h2><p className="text-xs text-slate-500">Sampul dan halaman 1–5 adalah berkas awal. PDF, PNG, atau JPEG, maksimal 10 MB per berkas.</p>
          {data.manuscript_files?.length ? <ul className="space-y-2">{data.manuscript_files.map(item => <li key={item.id} className="flex justify-between gap-3 rounded-lg bg-slate-50 p-3 text-xs text-slate-700"><span>{fileTypes[item.type] || item.type}</span><span className="text-slate-500">Versi {item.version}</span></li>)}</ul> : <p className="text-sm text-slate-500">Belum ada berkas naskah.</p>}
          {editable ? <form onSubmit={upload} className="space-y-3 border-t border-slate-100 pt-4"><label htmlFor="publisher-file-type" className="block text-sm font-semibold text-slate-800">Jenis berkas</label><select id="publisher-file-type" value={type} disabled={busy} onChange={event => setType(event.target.value)} className="w-full rounded-lg border border-slate-300 p-2.5 text-sm">{Object.entries(fileTypes).filter(([key]) => revision || ['COVER', 'SAMPLE_PAGE_1_5'].includes(key)).map(([key, label]) => <option key={key} value={key}>{label}</option>)}</select><label htmlFor="publisher-manuscript-file" className="block text-sm font-semibold text-slate-800">Pilih berkas naskah</label><input id="publisher-manuscript-file" type="file" accept="application/pdf,image/png,image/jpeg" disabled={busy} onChange={event => setFile(event.target.files?.[0] || null)} className="w-full text-xs file:rounded-lg file:border-0 file:bg-emerald-50 file:p-3 file:text-emerald-800 file:mr-3" /><Button type="submit" disabled={busy || !file} size="sm"><Upload className="h-4 w-4" />{busy ? 'Memproses…' : 'Unggah versi baru'}</Button></form> : <p className="text-xs text-slate-500">Unggah hanya tersedia saat draf atau setelah petugas meminta perbaikan.</p>}
        </section>
        {editable && <section className="rounded-2xl border border-slate-200 bg-white p-5 space-y-3"><h2 className="font-bold text-slate-900">Kirim pengajuan</h2><p className="text-sm text-slate-500">Periksa kelengkapan sebelum mengirim. Status verifikasi penerbit dan tahapan berikutnya diperiksa oleh server.</p>{!requiredFiles && <p className="text-xs text-amber-800">Lengkapi sampul dan sampel halaman 1–5 terlebih dahulu.</p>}<Button disabled={busy || !requiredFiles} onClick={() => run(() => registrationApi.submitRegistration(id), revision ? 'Perbaikan berhasil diajukan ulang.' : 'Pengajuan berhasil dikirim.')}><Send className="h-4 w-4" />{revision ? 'Ajukan ulang perbaikan' : 'Kirim pengajuan'}</Button></section>}
        <section className="rounded-2xl border border-slate-200 bg-white p-5 space-y-3"><h2 className="font-bold text-slate-900">Master fisik</h2><p className="text-xs text-slate-500">Format A4, dijilid per juz. Pernyataan ini bukan tanda terima dari LPMQ.</p><p className="text-sm text-slate-700">{data.physical_master_intake ? `${data.physical_master_intake.volume_count} jilid · ${data.physical_master_intake.status === 'RECEIVED' ? 'Sudah diterima LPMQ' : 'Menunggu tindak lanjut petugas'}` : 'Belum ada pernyataan master fisik.'}</p>{editable && data.physical_master_intake?.status !== 'RECEIVED' && <form onSubmit={savePhysical} className="space-y-3"><label htmlFor="publisher-master-count" className="block text-sm font-semibold text-slate-800">Jumlah jilid master fisik</label><input id="publisher-master-count" type="number" min="1" max="100" required disabled={busy} value={volumeCount} onChange={event => setVolumeCount(event.target.value)} className="w-full rounded-lg border border-slate-300 p-2.5 text-sm" /><Button type="submit" variant="outline" size="sm" disabled={busy}>Simpan pernyataan fisik</Button></form>}</section>
        <section className="rounded-2xl border border-slate-200 bg-white p-5 space-y-4"><h2 className="font-bold text-slate-900">Surat Tanda Tashih</h2><PublisherDocumentList documents={data.official_documents} /></section>
      </div><section className="rounded-2xl border border-slate-200 bg-white p-5"><h2 className="font-bold text-slate-900 mb-5">Riwayat proses</h2>{data.timeline?.length ? <ol className="space-y-5 border-l-2 border-emerald-100 pl-4">{data.timeline.map(item => <li key={item.id} className="space-y-2"><StatusBadge status={item.to_status} /><p className="text-xs text-slate-500">{new Date(item.changed_at).toLocaleString('id-ID', { timeZone: 'Asia/Jakarta' })} WIB</p>{item.notes && <p className="text-sm text-slate-700 whitespace-pre-wrap break-words">{item.notes}</p>}</li>)}</ol> : <p className="text-sm text-slate-500">Belum ada perubahan status.</p>}<p className="text-xs text-slate-400 mt-5">Catatan ditampilkan sesuai hak akses penerbit.</p></section></div>
    </>}
  </div>;
}
