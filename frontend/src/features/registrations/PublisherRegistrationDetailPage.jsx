import React, { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import {
  ArrowLeft,
  Upload,
  Send,
  RefreshCw,
  FileText,
  PackageCheck,
  Building2,
  Calendar,
  AlertTriangle,
  CheckCircle2,
  AlertCircle,
  Clock,
  BookOpen,
  Printer,
} from 'lucide-react';
import { registrationApi } from '@/api/registration.api';
import { reportApi } from '@/api/report.api';
import { fileApi } from '@/api/file.api';
import { useAuth } from '@/features/auth/AuthContext';
import { Button } from '@/components/ui/Button';
import { StatusBadge } from '@/components/ui/StatusBadge';
import { StatusSummary } from '@/components/ui/StatusSummary';
import { WorkflowOwnershipBanner } from '@/components/workflow/WorkflowOwnershipBanner';
import { getWorkflowViewModel } from '@/lib/workflow-view-model';
import { RegistrationReceiptDialog } from './RegistrationReceiptDialog';
import { PublisherProgress } from './PublisherProgress';
import { WorkflowPhaseStatus } from '@/components/common/WorkflowPhaseStatus';
import { PublisherDocumentList } from './PublisherDocumentList';
import { DocumentArchive } from '@/components/common/DocumentArchive';
import { publisherAction, dateLabel } from './publisher-status';

const fileTypes = {
  COVER: 'Sampul / cover',
  SAMPLE_PAGE_1_5: 'Sampel halaman 1–5',
  DUMMY: 'Dumi perbaikan',
  MASTER_COMPLETED: 'Master lengkap perbaikan',
  FOREIGN_TASHIH_CERTIFICATE: 'Bukti Tashih Lembaga Asal',
};

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
  const [showReceipt, setShowReceipt] = useState(false);
  const [dispatchData, setDispatchData] = useState({
    courier: 'LOKET_LPMQ',
    tracking_no: '',
  });

  useEffect(() => {
    let active = true;
    setLoading(true);
    setError('');
    Promise.all([registrationApi.getDetail(id), reportApi.getRegistrationTimeline(id)])
      .then(([detail, timeline]) => {
        if (active) {
          setData({ ...detail.data, timeline: timeline.data.timeline });
          setVolumeCount(detail.data.physical_master_intake?.volume_count || 30);
        }
      })
      .catch((err) => {
        if (active) setError(err.message || 'Detail naskah tidak dapat dimuat.');
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, [id, refresh, currentUser?.id]);

  useEffect(() => {
    setData(null);
    setSuccess('');
    setFile(null);
    setType('COVER');
  }, [id, currentUser?.id]);

  const editable = data && ['DRAFT', 'REVISION_REQUIRED'].includes(data.status);
  const revision = data?.status === 'REVISION_REQUIRED';
  const action = data && publisherAction(data);
  const workflowVm = data ? getWorkflowViewModel(data, currentUser) : null;

  const run = async (operation, message) => {
    if (busy) return;
    setBusy(true);
    setError('');
    setSuccess('');
    try {
      await operation();
      setSuccess(message);
      setRefresh((value) => value + 1);
    } catch (err) {
      setError(err.message || 'Tindakan gagal. Muat ulang untuk memastikan status terbaru.');
    } finally {
      setBusy(false);
    }
  };

  const upload = (event) => {
    event.preventDefault();
    if (!file || busy) return;
    if (
      !['application/pdf', 'image/png', 'image/jpeg'].includes(file.type) ||
      !file.size ||
      file.size > 10 * 1024 * 1024
    ) {
      setError('Pilih PDF, PNG, atau JPEG berisi data dengan ukuran maksimal 10 MB.');
      return;
    }
    run(async () => {
      const uploaded = await fileApi.upload(file);
      await registrationApi.addManuscript(id, { type, file_id: uploaded.id });
      setFile(null);
      const inputEl = event.target.querySelector('input[type="file"]');
      if (inputEl) inputEl.value = '';
    }, 'Berkas berhasil ditambahkan sebagai versi baru.');
  };

  const revisionNote = [...(data?.timeline || [])]
    .reverse()
    .find((item) => item.to_status === 'REVISION_REQUIRED')?.notes;

  const requiredFiles = ['COVER', 'SAMPLE_PAGE_1_5'].every((required) =>
    data?.manuscript_files?.some((item) => item.type === required)
  );

  const fee = data?.fee_sla_snapshot?.total_fee;

  const savePhysical = (event) => {
    event.preventDefault();
    const existing = data.physical_master_intake;
    run(
      () =>
        registrationApi.declarePhysicalMaster(id, {
          format: 'A4',
          binding_method: 'PER_JUZ',
          volume_count: Number(volumeCount),
          ...(existing?.sent_at ? { sent_at: existing.sent_at } : {}),
          ...(existing?.delivery_method ? { delivery_method: existing.delivery_method } : {}),
          ...(existing?.notes ? { notes: existing.notes } : {}),
        }),
      'Pernyataan master fisik berhasil disimpan.'
    );
  };

  const handleDispatch = (event) => {
    event.preventDefault();
    run(
      () => registrationApi.dispatchPhysical(id, dispatchData),
      'Konfirmasi pengiriman berkas fisik ke LPMQ berhasil dicatat. Status diindikasikan sedang diverifikasi.'
    );
  };

  return (
    <div className="max-w-6xl mx-auto space-y-6 pb-16 animate-fadeIn">
      {/* Back Link */}
      <Link
        to="/publisher/registrations"
        className="inline-flex gap-2 items-center text-xs font-semibold text-ink-muted hover:text-brand-800 transition-colors"
      >
        <ArrowLeft className="h-4 w-4" />
        Riwayat pengajuan
      </Link>

      {/* Error Alert */}
      {error && (
        <div
          role="alert"
          className="rounded-xl bg-civic-dangerSoft border border-civic-dangerLine text-civic-danger p-4 text-xs font-semibold"
        >
          {error}
        </div>
      )}

      {!loading && !data && error && (
        <Button variant="outline" size="sm" onClick={() => setRefresh((value) => value + 1)}>
          Muat ulang
        </Button>
      )}

      {/* Success Notification */}
      {success && (
        <div
          role="status"
          className="rounded-xl bg-brand-50 border border-brand-100 text-brand-800 p-4 text-xs font-semibold flex items-center gap-2"
        >
          <CheckCircle2 className="w-4 h-4 text-brand-700 shrink-0" />
          <span>{success}</span>
        </div>
      )}

      {loading ? (
        <div className="py-12 text-center space-y-2">
          <div className="w-7 h-7 border-3 border-brand-700 border-t-transparent rounded-full animate-spin mx-auto" />
          <p role="status" className="text-xs text-ink-muted font-medium">
            Memuat detail naskah…
          </p>
        </div>
      ) : (
        data && (
          <>
            {/* Header Card */}
            <header className="rounded-xl border border-line bg-white p-5 sm:p-6 space-y-4 shadow-2xs">
              <div className="flex flex-wrap items-start justify-between gap-4">
                <div className="min-w-0 space-y-1">
                  <div className="flex items-center gap-2">
                    <span className="font-mono text-xs font-bold text-ink bg-surface-subtle px-2.5 py-0.5 rounded border border-line">
                      {data.registration_no}
                    </span>
                    <span className="text-xs text-ink-muted">
                      Dibuat {dateLabel(data.created_at)}
                    </span>
                  </div>
                  <h1 className="text-xl sm:text-2xl font-bold text-ink break-words mt-1">
                    {data.title}
                  </h1>
                  <p className="text-xs text-ink-muted">
                    Layanan: <strong className="text-ink">{data.service_type?.name}</strong>
                  </p>
                  {(data.foreign_metadata?.negara_asal_mushaf || data.foreign_metadata?.country_of_origin) && (
                    <div className="pt-1.5 flex flex-wrap gap-x-3 gap-y-1 text-xs text-ink-muted">
                      <span className="inline-flex items-center px-2 py-0.5 rounded bg-civic-infoSoft text-civic-info font-semibold border border-civic-infoLine text-[11px]">
                        Mushaf Luar Negeri: {data.foreign_metadata.negara_asal_mushaf || data.foreign_metadata.country_of_origin}
                      </span>
                      {(data.foreign_metadata.penerbit_asal_mushaf || data.foreign_metadata.foreign_publisher_name) && (
                        <span className="text-ink-muted text-[11px]">
                          Penerbit Asal: <strong className="text-ink">{data.foreign_metadata.penerbit_asal_mushaf || data.foreign_metadata.foreign_publisher_name}</strong>
                        </span>
                      )}
                      {(data.foreign_metadata.lembaga_pentashih_asal_mushaf || data.foreign_metadata.foreign_tashih_institution) && (
                        <span className="text-ink-muted text-[11px]">
                          Lembaga Pentashih: <strong className="text-ink">{data.foreign_metadata.lembaga_pentashih_asal_mushaf || data.foreign_metadata.foreign_tashih_institution}</strong>
                        </span>
                      )}
                    </div>
                  )}
                </div>

                <div className="flex flex-col sm:flex-row items-end sm:items-center gap-2 shrink-0">
                  <StatusBadge status={data.status} />
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setShowReceipt(true)}
                    className="text-xs font-bold text-ink hover:text-brand-800"
                  >
                    <Printer className="h-3.5 w-3.5 mr-1 text-brand-700" />
                    Cetak Bukti Pendaftaran
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    disabled={busy}
                    onClick={() => setRefresh((value) => value + 1)}
                    className="text-xs"
                  >
                    <RefreshCw className={`h-3.5 w-3.5 mr-1.5 ${busy ? 'animate-spin' : ''}`} />
                    Muat ulang
                  </Button>
                </div>
              </div>

              {/* Status Summary & Next Action Component */}
              <StatusSummary status={data.status} />

              {/* Visual Progress Steps */}
              <div className="pt-2 border-t border-line">
                <PublisherProgress registration={data} />
              </div>
              <WorkflowPhaseStatus registration={data} />
            </header>

            {/* Workflow Ownership & Action Banner */}
            {workflowVm && (
              <WorkflowOwnershipBanner viewModel={workflowVm} />
            )}

            {/* Tahapan Wajib & CTA: Kirimkan Berkas Fisik ke LPMQ Sebelum Verifikasi Dimulai */}
            {data.status === 'READY_FOR_VERIFICATION' && (
              <section className="rounded-xl border border-civic-warningLine bg-civic-warningSoft/60 p-5 space-y-3.5 shadow-2xs">
                <div className="flex flex-wrap items-center justify-between gap-2 border-b border-civic-warningLine pb-3">
                  <div className="flex items-center gap-2">
                    <Send className="w-5 h-5 text-civic-warning shrink-0" />
                    <div>
                      <h2 className="font-bold text-ink text-sm">
                        Tahapan Pengiriman Berkas Fisik ke LPMQ
                      </h2>
                      <p className="text-[11px] text-ink-muted">
                        Proses verifikasi resmi oleh verifikator LPMQ dimulai setelah naskah master fisik diterima di loket LPMQ.
                      </p>
                    </div>
                  </div>
                  <span className={`text-[11px] font-bold px-2.5 py-1 rounded-md border ${
                    data.physical_dispatch_status === 'DISPATCHED'
                      ? 'bg-brand-100 text-brand-800 border-brand-100'
                      : 'bg-civic-warningSoft text-civic-warning border-civic-warningLine'
                  }`}>
                    {data.physical_dispatch_status === 'DISPATCHED'
                      ? 'Berkas Telah Dikirim · Sedang Verifikasi'
                      : 'Menunggu Pengiriman Berkas Fisik'}
                  </span>
                </div>

                {data.physical_dispatch_status === 'DISPATCHED' ? (
                  <div className="p-4 bg-white rounded-xl border border-civic-warningLine text-xs text-ink space-y-2">
                    <p className="font-bold text-brand-800 flex items-center gap-1.5">
                      <CheckCircle2 className="w-4 h-4 text-brand-700" />
                      Konfirmasi Pengiriman Berkas Tercatat di Sistem
                    </p>
                    <p className="text-ink-muted leading-relaxed">
                      Metode Pengantaran: <strong>{data.dispatch_courier || 'Loket LPMQ'}</strong>
                      {data.dispatch_tracking_no ? ` · Nomor Resi / Tanda Terima: ${data.dispatch_tracking_no}` : ''}
                    </p>
                    <p className="text-[11px] text-civic-info font-semibold bg-civic-infoSoft p-2 rounded-lg border border-civic-infoLine">
                      Naskah telah diindikasikan masuk ke tahap: <strong>Sedang Proses Verifikasi</strong>. Verifikator LPMQ sedang memeriksa administrasi dan fisik naskah.
                    </p>
                  </div>
                ) : (
                  <form onSubmit={handleDispatch} className="p-4 bg-white rounded-xl border border-civic-warningLine space-y-3">
                    <p className="text-xs text-ink leading-relaxed">
                      Silakan bawa berkas master fisik (A4 dijilid per juz) ke <strong>Loket Pelayanan LPMQ Gedung Bayt Al-Qur'an & Museum Istiqlal, TMII Jakarta</strong> atau kirim melalui ekspedisi terpercaya, lalu konfirmasikan pada formulir di bawah ini:
                    </p>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <div>
                        <label className="block text-xs font-bold text-ink mb-1">
                          Metode Pengiriman
                        </label>
                        <select
                          disabled={busy}
                          value={dispatchData.courier}
                          onChange={(e) => setDispatchData({ ...dispatchData, courier: e.target.value })}
                          className="w-full rounded-lg border border-line-strong p-2 text-xs bg-white"
                        >
                          <option value="LOKET_LPMQ">Antar Langsung ke Loket LPMQ TMII</option>
                          <option value="JNE">JNE Express</option>
                          <option value="POS_INDONESIA">Pos Indonesia</option>
                          <option value="TIKI">TIKI</option>
                          <option value="SICEPAT">SiCepat</option>
                          <option value="LAINNYA">Kurir / Ekspedisi Lainnya</option>
                        </select>
                      </div>
                      <div>
                        <label className="block text-xs font-bold text-ink mb-1">
                          Nomor Resi / Keterangan Tanda Kirim
                        </label>
                        <input
                          type="text"
                          disabled={busy}
                          value={dispatchData.tracking_no}
                          onChange={(e) => setDispatchData({ ...dispatchData, tracking_no: e.target.value })}
                          placeholder="Contoh: Resi JNE12345678 atau Diserahkan Staf PT"
                          className="w-full rounded-lg border border-line-strong p-2 text-xs bg-white"
                        />
                      </div>
                    </div>
                    <Button type="submit" disabled={busy} variant="primary" size="sm" className="text-xs font-bold">
                      <Send className="w-3.5 h-3.5 mr-1.5" />
                      Kirimkan Berkas ke LPMQ (Konfirmasi Pengiriman)
                    </Button>
                  </form>
                )}
              </section>
            )}

            {/* Revision Callout Box */}
            {revision && (
              <section className="rounded-xl border border-civic-warningLine bg-civic-warningSoft p-5 space-y-2 shadow-2xs">
                <div className="flex items-center gap-2">
                  <AlertTriangle className="w-5 h-5 text-civic-warning shrink-0" />
                  <h2 className="font-bold text-civic-warning text-sm">Catatan perbaikan</h2>
                </div>
                <p className="text-xs text-civic-warning whitespace-pre-wrap break-words leading-relaxed pl-7">
                  {revisionNote ||
                    'Petugas meminta perbaikan. Hubungi pengelola layanan bila rincian belum tersedia.'}
                </p>
                <p className="text-[11px] text-civic-warning font-medium pl-7">
                  Unggah versi terbaru tanpa menghapus riwayat berkas, kemudian ajukan ulang.
                </p>
              </section>
            )}

            {action && !editable && (
              <Link
                to={action.path}
                className="inline-flex rounded-xl bg-brand-800 hover:bg-brand-900 text-white px-4 py-2.5 text-xs font-bold shadow-xs transition-colors"
              >
                {action.label}
              </Link>
            )}

            {/* Main Content Grid */}
            <div className="grid lg:grid-cols-[1.2fr_1fr] gap-6 items-start">
              <div className="space-y-6">
                {/* 1. Berkas Naskah Digital */}
                <section className="rounded-xl border border-line bg-white p-5 space-y-4 shadow-2xs">
                  <div className="flex items-center justify-between border-b border-line pb-3">
                    <div>
                      <h2 className="font-bold text-ink text-sm flex items-center gap-2">
                        <FileText className="w-4 h-4 text-brand-800" />
                        Berkas naskah
                      </h2>
                      <p className="text-[11px] text-ink-muted mt-0.5">
                        Sampul dan halaman 1–5 adalah berkas awal. PDF, PNG, atau JPEG (maksimal 10 MB).
                      </p>
                    </div>
                  </div>

                  {data.manuscript_files?.length ? (
                    <ul className="space-y-2">
                      {data.manuscript_files.map((item) => (
                        <li
                          key={item.id}
                          className="flex justify-between items-center gap-3 rounded-lg bg-canvas border border-line p-3 text-xs text-ink"
                        >
                          <span className="font-semibold text-ink">
                            {fileTypes[item.type] || item.type}
                          </span>
                          <span className="font-mono text-[11px] text-ink-muted bg-white border border-line px-2 py-0.5 rounded">
                            Versi {item.version}
                          </span>
                        </li>
                      ))}
                    </ul>
                  ) : (
                    <p className="text-xs text-ink-muted">Belum ada berkas naskah.</p>
                  )}

                  {editable ? (
                    <form onSubmit={upload} className="space-y-3 border-t border-line pt-4">
                      <div>
                        <label
                          htmlFor="publisher-file-type"
                          className="block text-xs font-bold text-ink mb-1"
                        >
                          Jenis berkas
                        </label>
                        <select
                          id="publisher-file-type"
                          value={type}
                          disabled={busy}
                          onChange={(event) => setType(event.target.value)}
                          className="w-full rounded-lg border border-line-strong p-2 text-xs focus:outline-none focus:ring-2 focus:ring-brand-700/20"
                        >
                          {Object.entries(fileTypes)
                            .filter(
                              ([key]) =>
                                revision || ['COVER', 'SAMPLE_PAGE_1_5'].includes(key)
                            )
                            .map(([key, label]) => (
                              <option key={key} value={key}>
                                {label}
                              </option>
                            ))}
                        </select>
                      </div>

                      <div>
                        <label
                          htmlFor="publisher-manuscript-file"
                          className="block text-xs font-bold text-ink mb-1"
                        >
                          Pilih berkas naskah
                        </label>
                        <input
                          id="publisher-manuscript-file"
                          type="file"
                          accept="application/pdf,image/png,image/jpeg"
                          disabled={busy}
                          onChange={(event) => setFile(event.target.files?.[0] || null)}
                          className="w-full text-xs file:rounded-lg file:border-0 file:bg-brand-50 file:p-2 file:text-brand-900 file:font-bold file:mr-3 border border-line rounded-lg"
                        />
                      </div>

                      <Button type="submit" disabled={busy || !file} size="sm" className="text-xs">
                        <Upload className="h-3.5 w-3.5 mr-1" />
                        {busy ? 'Memproses…' : 'Unggah versi baru'}
                      </Button>
                    </form>
                  ) : (
                    <p className="text-[11px] text-ink-muted italic pt-1">
                      Unggah hanya tersedia saat draf atau setelah petugas meminta perbaikan.
                    </p>
                  )}
                </section>

                {/* 2. Kirim Pengajuan Form */}
                {editable && (
                  <section className="rounded-xl border border-line bg-white p-5 space-y-3 shadow-2xs">
                    <h2 className="font-bold text-ink text-sm">Kirim pengajuan</h2>
                    <p className="text-xs text-ink-muted leading-relaxed">
                      Periksa kelengkapan sebelum mengirim. Status verifikasi penerbit dan tahapan berikutnya diperiksa oleh sistem.
                    </p>
                    {!requiredFiles && (
                      <p className="text-xs text-civic-warning font-semibold">
                        Lengkapi sampul dan sampel halaman 1–5 terlebih dahulu.
                      </p>
                    )}
                    <Button
                      disabled={busy || !requiredFiles}
                      onClick={() =>
                        run(
                          () => registrationApi.submitRegistration(id),
                          revision ? 'Perbaikan berhasil diajukan ulang.' : 'Pengajuan berhasil dikirim.'
                        )
                      }
                      className="text-xs"
                    >
                      <Send className="h-3.5 w-3.5 mr-1.5" />
                      {revision ? 'Ajukan ulang perbaikan' : 'Kirim pengajuan'}
                    </Button>
                  </section>
                )}

                {/* 3. Master Fisik Declaration */}
                <section className="rounded-xl border border-line bg-white p-5 space-y-3 shadow-2xs">
                  <div className="flex items-center justify-between border-b border-line pb-2.5">
                    <h2 className="font-bold text-ink text-sm flex items-center gap-1.5">
                      <PackageCheck className="w-4 h-4 text-brand-800" />
                      Master fisik
                    </h2>
                    <span className="text-[11px] text-ink-muted">Format A4 Dijilid Per Juz</span>
                  </div>
                  <p className="text-xs text-ink">
                    {data.physical_master_intake
                      ? `${data.physical_master_intake.volume_count} jilid · ${
                          data.physical_master_intake.status === 'RECEIVED'
                            ? 'Sudah diterima LPMQ'
                            : 'Menunggu tindak lanjut petugas'
                        }`
                      : 'Belum ada pernyataan master fisik.'}
                  </p>
                  {editable && data.physical_master_intake?.status !== 'RECEIVED' && (
                    <form onSubmit={savePhysical} className="space-y-3 pt-2">
                      <label
                        htmlFor="publisher-master-count"
                        className="block text-xs font-bold text-ink"
                      >
                        Jumlah jilid master fisik
                      </label>
                      <input
                        id="publisher-master-count"
                        type="number"
                        min="1"
                        max="100"
                        required
                        disabled={busy}
                        value={volumeCount}
                        onChange={(event) => setVolumeCount(event.target.value)}
                        className="w-full rounded-lg border border-line-strong p-2 text-xs font-mono focus:outline-none focus:ring-2 focus:ring-brand-700/20"
                      />
                      <Button type="submit" variant="outline" size="sm" disabled={busy} className="text-xs">
                        Simpan pernyataan fisik
                      </Button>
                    </form>
                  )}
                </section>

                {/* 4. Surat Tanda Tashih Section */}
                <section className="rounded-xl border border-line bg-white p-5 space-y-4 shadow-2xs">
                  <h2 className="font-bold text-ink text-sm">Surat Tanda Tashih</h2>
                  <PublisherDocumentList documents={data.official_documents} />
                  <DocumentArchive registrationId={data.id} />
                </section>
              </div>

              {/* Right Column: Riwayat Proses */}
              <section className="rounded-xl border border-line bg-white p-5 space-y-4 shadow-2xs">
                <div className="border-b border-line pb-3">
                  <h2 className="font-bold text-ink text-sm">Riwayat proses</h2>
                  <p className="text-[11px] text-ink-muted mt-0.5">
                    Catatan resmi tahapan penelaahan naskah
                  </p>
                </div>

                {data.timeline?.length ? (
                  <ol className="space-y-4 border-l-2 border-brand-100 pl-4 text-xs">
                    {data.timeline.map((item) => (
                      <li key={item.id} className="space-y-1.5 relative">
                        <span className="absolute -left-[21px] top-1.5 w-2.5 h-2.5 rounded-full bg-brand-700 ring-4 ring-white" />
                        <StatusBadge status={item.to_status} />
                        <p className="text-[11px] text-ink-muted font-mono">
                          {new Date(item.changed_at).toLocaleString('id-ID', {
                            timeZone: 'Asia/Jakarta',
                          })}{' '}
                          WIB
                        </p>
                        {item.notes && (
                          <div className="p-2.5 bg-canvas rounded-lg border border-line/70 text-ink whitespace-pre-wrap break-words">
                            {item.notes}
                          </div>
                        )}
                      </li>
                    ))}
                  </ol>
                ) : (
                  <p className="text-xs text-ink-muted">Belum ada perubahan status.</p>
                )}

                <p className="text-[10px] text-ink-muted pt-2 border-t border-line">
                  Catatan ditampilkan sesuai hak akses penerbit.
                </p>
              </section>
            </div>
          </>
        )
      )}

      {/* Dialog Bukti Pendaftaran Resmi */}
      <RegistrationReceiptDialog
        isOpen={showReceipt}
        onClose={() => setShowReceipt(false)}
        registration={data}
      />
    </div>
  );
}

export default PublisherRegistrationDetailPage;

