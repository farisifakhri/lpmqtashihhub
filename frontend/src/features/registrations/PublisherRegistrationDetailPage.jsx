import React, { useEffect, useState } from 'react';
import { Link, useParams, useNavigate, useLocation } from 'react-router-dom';
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
  Trash2,
  XCircle,
  ChevronDown,
  ChevronUp,
  CreditCard,
} from 'lucide-react';
import { registrationApi } from '@/api/registration.api';
import { verificationApi } from '@/api/verification.api';
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
  const navigate = useNavigate();
  const location = useLocation();
  const [data, setData] = useState(null);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [showCancelModal, setShowCancelModal] = useState(false);
  const [cancelReason, setCancelReason] = useState('');
  const [actionLoading, setActionLoading] = useState(false);

  useEffect(() => {
    if (location.state?.showReceipt) {
      setShowReceipt(true);
    }
  }, [location.state]);

  const handleDeleteDraft = async () => {
    setActionLoading(true);
    setError('');
    try {
      await registrationApi.deleteRegistration(id);
      setShowDeleteModal(false);
      navigate('/publisher/registrations');
    } catch (err) {
      setError(err.message || 'Gagal menghapus draf permohonan.');
    } finally {
      setActionLoading(false);
    }
  };

  const handleCancelRegistration = async () => {
    setActionLoading(true);
    setError('');
    try {
      await registrationApi.transitionStatus(id, 'CANCELLED', cancelReason);
      setShowCancelModal(false);
      setSuccess('Permohonan berhasil dibatalkan dan ditarik dari antrean.');
      setRefresh((value) => value + 1);
    } catch (err) {
      setError(err.message || 'Gagal membatalkan permohonan.');
    } finally {
      setActionLoading(false);
    }
  };
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [type, setType] = useState('COVER');
  const [file, setFile] = useState(null);
  const [volumeCount, setVolumeCount] = useState(30);
  const [refresh, setRefresh] = useState(0);
  const [showReceipt, setShowReceipt] = useState(false);
  const [physicalReceiptUrl, setPhysicalReceiptUrl] = useState(null);

  useEffect(() => () => {
    if (physicalReceiptUrl) URL.revokeObjectURL(physicalReceiptUrl);
  }, [physicalReceiptUrl]);

  const showPhysicalReceipt = async () => {
    setActionLoading(true);
    setError('');
    try {
      const blob = await verificationApi.getPhysicalReceiptPdf(id);
      setPhysicalReceiptUrl(URL.createObjectURL(blob));
    } catch (reason) {
      setError(reason.message || 'PDF tanda terima fisik belum dapat dibuka.');
    } finally {
      setActionLoading(false);
    }
  };
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

  const [activeTab, setActiveTab] = useState('berkas');
  const [showPhaseDetails, setShowPhaseDetails] = useState(false);

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
            {/* 1. Header Card: Ringkasan Pengajuan & Metadata */}
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
                  <div className="pt-1.5 flex flex-wrap items-center gap-1.5 text-xs text-ink-muted">
                    {data.foreign_metadata?.nama_mushaf && (
                      <span className="inline-flex items-center px-2.5 py-0.5 rounded-md bg-surface-subtle text-ink font-semibold border border-line text-[11px]">
                        Mushaf: <span className="ml-1 text-brand-800 font-bold">{data.foreign_metadata.nama_mushaf}</span>
                      </span>
                    )}
                    {data.foreign_metadata?.jenis_mushaf && (
                      <span className="inline-flex items-center px-2.5 py-0.5 rounded-md bg-brand-50 text-brand-800 font-bold border border-brand-200 text-[11px]">
                        {data.foreign_metadata.jenis_mushaf}
                      </span>
                    )}
                    {data.foreign_metadata?.nama_percetakan && (
                      <span className="inline-flex items-center px-2.5 py-0.5 rounded-md bg-surface-subtle text-ink-muted border border-line text-[11px]">
                        Percetakan: <span className="ml-1 text-ink font-medium">{data.foreign_metadata.nama_percetakan}</span>
                      </span>
                    )}
                    {data.foreign_metadata?.penanggung_jawab_produk && (
                      <span className="inline-flex items-center px-2.5 py-0.5 rounded-md bg-surface-subtle text-ink-muted border border-line text-[11px]">
                        PJ: <span className="ml-1 text-ink font-semibold">{data.foreign_metadata.penanggung_jawab_produk}</span>
                        {data.foreign_metadata?.penanggung_jawab_wa && (
                          <span className="ml-1.5 font-mono text-[10px] text-brand-800">({data.foreign_metadata.penanggung_jawab_wa})</span>
                        )}
                      </span>
                    )}
                  </div>
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

                <div className="flex flex-wrap sm:flex-nowrap items-center gap-2 shrink-0">
                  <StatusBadge registration={data} />
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
                  {data.status === 'DRAFT' && (
                    <Button
                      variant="outline"
                      size="sm"
                      disabled={busy || actionLoading}
                      onClick={() => setShowDeleteModal(true)}
                      className="text-xs font-semibold text-civic-danger border-civic-dangerLine hover:bg-civic-dangerSoft"
                    >
                      <Trash2 className="h-3.5 w-3.5 mr-1 text-civic-danger" />
                      Hapus Draf
                    </Button>
                  )}
                  {data.status === 'READY_FOR_VERIFICATION' && (
                    <Button
                      variant="outline"
                      size="sm"
                      disabled={busy || actionLoading}
                      onClick={() => setShowCancelModal(true)}
                      className="text-xs font-semibold text-civic-warning border-civic-warningLine hover:bg-civic-warningSoft"
                    >
                      <XCircle className="h-3.5 w-3.5 mr-1 text-civic-warning" />
                      Batalkan Permohonan
                    </Button>
                  )}
                </div>
              </div>

              {/* Visual Progress Stepper */}
              <div className="pt-3 border-t border-line space-y-2">
                <PublisherProgress registration={data} />
                <div className="flex justify-end">
                  <button
                    type="button"
                    onClick={() => setShowPhaseDetails(!showPhaseDetails)}
                    className="text-[11px] font-semibold text-brand-800 hover:text-brand-900 inline-flex items-center gap-1 transition-colors cursor-pointer"
                  >
                    {showPhaseDetails ? (
                      <>
                        Sembunyikan Rincian Fase <ChevronUp className="w-3 h-3" />
                      </>
                    ) : (
                      <>
                        Lihat Rincian Fase Alur <ChevronDown className="w-3 h-3" />
                      </>
                    )}
                  </button>
                </div>
                {showPhaseDetails && (
                  <div className="pt-2 animate-fadeIn">
                    <WorkflowPhaseStatus registration={data} />
                  </div>
                )}
              </div>
            </header>

            {/* 2. Hero Next Action Card (Langkah Anda Saat Ini) */}
            {data.status === 'DRAFT' && (
              <section className="rounded-xl border border-brand-200 bg-brand-50/70 p-5 space-y-3 shadow-2xs">
                <div className="flex flex-wrap items-center justify-between gap-2 border-b border-brand-200/80 pb-3">
                  <div className="flex items-center gap-2.5">
                    <div className="w-8 h-8 rounded-lg bg-brand-800 text-white flex items-center justify-center shrink-0">
                      <FileText className="w-4 h-4" />
                    </div>
                    <div>
                      <h2 className="font-bold text-ink text-sm">
                        Langkah Anda Saat Ini: Lengkapi Berkas Naskah & Ajukan
                      </h2>
                      <p className="text-[11px] text-ink-muted">
                        Naskah berstatus Draf. Unggah berkas digital wajib di bawah ini sebelum mengirim permohonan ke LPMQ.
                      </p>
                    </div>
                  </div>
                  <span className="text-[11px] font-bold px-2.5 py-1 rounded-md bg-white border border-brand-200 text-brand-800 shadow-2xs">
                    Menunggu Berkas Penerbit
                  </span>
                </div>

                <div className="flex flex-wrap items-center justify-between gap-3 pt-1">
                  <div className="flex flex-wrap items-center gap-2 text-xs">
                    <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg border text-[11px] font-medium ${
                      data.manuscript_files?.some((f) => f.type === 'COVER')
                        ? 'bg-brand-50 text-brand-800 border-brand-100'
                        : 'bg-civic-warningSoft text-civic-warning border-civic-warningLine'
                    }`}>
                      {data.manuscript_files?.some((f) => f.type === 'COVER') ? '✓ Sampul Terunggah' : '⚠️ Sampul Belum Diunggah'}
                    </span>
                    <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg border text-[11px] font-medium ${
                      data.manuscript_files?.some((f) => f.type === 'SAMPLE_PAGE_1_5')
                        ? 'bg-brand-50 text-brand-800 border-brand-100'
                        : 'bg-civic-warningSoft text-civic-warning border-civic-warningLine'
                    }`}>
                      {data.manuscript_files?.some((f) => f.type === 'SAMPLE_PAGE_1_5') ? '✓ Sampel Hal 1–5 Terunggah' : '⚠️ Sampel Hal 1–5 Belum Diunggah'}
                    </span>
                  </div>

                  <p className="text-[11px] text-ink-muted">
                    {requiredFiles
                      ? 'Berkas wajib lengkap. Silakan kirimkan pengajuan pada formulir di bawah.'
                      : 'Lengkapi berkas wajib di tab di bawah untuk mengirimkan pengajuan.'}
                  </p>
                </div>
              </section>
            )}

            {/* Tahapan Wajib Pengiriman Berkas Fisik */}
            {data.status === 'READY_FOR_VERIFICATION' && (
              <section className="rounded-xl border border-civic-warningLine bg-civic-warningSoft/60 p-5 space-y-3.5 shadow-2xs">
                <div className="flex flex-wrap items-center justify-between gap-2 border-b border-civic-warningLine pb-3">
                  <div className="flex items-center gap-2.5">
                    <div className="w-8 h-8 rounded-lg bg-civic-warning text-white flex items-center justify-center shrink-0">
                      <Send className="w-4 h-4" />
                    </div>
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
                    data.physical_master_intake?.status === 'RECEIVED' || data.physical_dispatch_status === 'DISPATCHED'
                      ? 'bg-brand-100 text-brand-800 border-brand-100'
                      : 'bg-civic-warningSoft text-civic-warning border-civic-warningLine'
                  }`}>
                    {data.physical_master_intake?.status === 'RECEIVED'
                      ? 'Master Fisik Diterima Loket · Menunggu Penugasan'
                      : data.physical_dispatch_status === 'DISPATCHED'
                        ? 'Berkas Dikirim · Menunggu Penerimaan Loket'
                        : 'Menunggu Pengiriman Berkas Fisik'}
                  </span>
                </div>

                {data.physical_master_intake?.status === 'RECEIVED' || data.physical_dispatch_status === 'DISPATCHED' ? (
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
                      {data.physical_master_intake?.status === 'RECEIVED'
                        ? 'Master fisik telah diterima loket LPMQ. Langkah berikutnya: petugas menugaskan verifikator.'
                        : 'Langkah berikutnya: petugas loket menerima dan memeriksa master fisik. Verifikasi dimulai setelah berkas diterima dan verifikator ditugaskan.'}
                    </p>
                    {data.physical_master_intake?.status === 'RECEIVED' && (
                      <Button type="button" variant="outline" size="sm" onClick={showPhysicalReceipt} disabled={actionLoading} className="text-xs">
                        <Printer className="w-3.5 h-3.5 mr-1.5" />
                        Lihat / Cetak PDF Tanda Terima Fisik
                      </Button>
                    )}
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
              <section className="rounded-xl border border-civic-warningLine bg-civic-warningSoft p-5 space-y-3 shadow-2xs">
                <div className="flex items-center justify-between border-b border-civic-warningLine/70 pb-3">
                  <div className="flex items-center gap-2">
                    <AlertTriangle className="w-5 h-5 text-civic-warning shrink-0" />
                    <h2 className="font-bold text-civic-warning text-sm">Catatan perbaikan</h2>
                  </div>
                  <span className="text-[11px] font-bold px-2.5 py-0.5 rounded bg-white text-civic-warning border border-civic-warningLine">
                    Perlu Revisi Penerbit
                  </span>
                </div>
                <p className="text-xs text-civic-warning whitespace-pre-wrap break-words leading-relaxed pl-7">
                  {revisionNote ||
                    'Petugas meminta perbaikan. Hubungi pengelola layanan bila rincian belum tersedia.'}
                </p>
                <p className="text-[11px] text-civic-warning font-medium pl-7">
                  Unggah versi terbaru tanpa menghapus riwayat berkas, kemudian ajukan ulang pada bagian Kirim Pengajuan di bawah.
                </p>
              </section>
            )}

            {/* In Verification Callout */}
            {['IN_VERIFICATION', 'VERIFICATION_ASSIGNED', 'WAITING_VERIFICATION_APPROVAL'].includes(data.status) && (
              <section className="rounded-xl border border-civic-infoLine bg-civic-infoSoft/60 p-5 space-y-2 shadow-2xs">
                <div className="flex items-center gap-2.5">
                  <Clock className="w-5 h-5 text-civic-info shrink-0" />
                  <div>
                    <h2 className="font-bold text-ink text-sm">Sedang Dalam Pemeriksaan Verifikator LPMQ</h2>
                    <p className="text-[11px] text-ink-muted">
                      Tim verifikator LPMQ sedang menelaah kelengkapan administrasi dan fisik naskah Anda. Anda akan diberitahu jika diperlukan perbaikan berkas atau saat penetapan biaya PNBP diterbitkan.
                    </p>
                  </div>
                </div>
              </section>
            )}

            {/* Awaiting Payment Callout */}
            {['AWAITING_PAYMENT', 'PAYMENT_VERIFICATION'].includes(data.status) && (
              <section className="rounded-xl border border-brand-200 bg-brand-50/70 p-5 space-y-3 shadow-2xs">
                <div className="flex flex-wrap items-center justify-between gap-2 border-b border-brand-200/80 pb-3">
                  <div className="flex items-center gap-2.5">
                    <CreditCard className="w-5 h-5 text-brand-800 shrink-0" />
                    <div>
                      <h2 className="font-bold text-ink text-sm">Verifikasi Disetujui: Menunggu Pembayaran PNBP</h2>
                      <p className="text-[11px] text-ink-muted">
                        Surat Ketetapan Tarif PNBP telah diterbitkan. Silakan selesaikan pembayaran agar naskah dapat dijadwalkan untuk sidang pentashihan.
                      </p>
                    </div>
                  </div>
                  <Link
                    to="/publisher/billing"
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-brand-800 hover:bg-brand-900 text-white text-xs font-bold transition-colors shadow-2xs"
                  >
                    Buka Tagihan PNBP
                  </Link>
                </div>
              </section>
            )}

            {/* Tashih in progress Callout */}
            {['TASHIH_IN_PROGRESS', 'WAITING_DISTRIBUTION', 'WAITING_DISTRIBUTOR_RECEIPT'].includes(data.status) && (
              <section className="rounded-xl border border-brand-200 bg-brand-50/50 p-5 space-y-2 shadow-2xs">
                <div className="flex items-center gap-2.5">
                  <BookOpen className="w-5 h-5 text-brand-800 shrink-0" />
                  <div>
                    <h2 className="font-bold text-ink text-sm">Naskah Sedang Dalam Proses Pentashihan</h2>
                    <p className="text-[11px] text-ink-muted">
                      Tim Pentashih LPMQ sedang melakukan penelaahan detail setiap juz, teks ayat, harakat, dan tanda baca naskah Al-Qur'an. Anda dapat memantau riwayat telaah pada tab Riwayat Proses.
                    </p>
                  </div>
                </div>
              </section>
            )}

            {/* STT Issued Callout */}
            {['STT_ISSUED', 'READY_FOR_STT', 'COMPLETED'].includes(data.status) && (
              <section className="rounded-xl border border-brand-100 bg-brand-50/70 p-5 space-y-3 shadow-2xs">
                <div className="flex flex-wrap items-center justify-between gap-2 border-b border-brand-100/80 pb-3">
                  <div className="flex items-center gap-2.5">
                    <CheckCircle2 className="w-5 h-5 text-brand-700 shrink-0" />
                    <div>
                      <h2 className="font-bold text-ink text-sm">Alhamdulillah, Surat Tanda Tashih (STT) Telah Terbit</h2>
                      <p className="text-[11px] text-ink-muted">
                        Naskah Anda dinyatakan sahih dan Surat Tanda Tashih resmi telah disahkan oleh Kepala LPMQ Kemenag RI.
                      </p>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => setActiveTab('dokumen')}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-brand-700 hover:bg-brand-800 text-white text-xs font-bold transition-colors shadow-2xs cursor-pointer"
                  >
                    Unduh Dokumen STT
                  </button>
                </div>
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

            {/* 3. Structured Tab Navigation */}
            <div className="border-b border-line pt-2">
              <nav className="flex items-center gap-2" aria-label="Navigasi Pengajuan">
                <button
                  type="button"
                  onClick={() => setActiveTab('berkas')}
                  className={`inline-flex items-center gap-2 px-4 py-2.5 text-xs font-bold border-b-2 transition-all cursor-pointer ${
                    activeTab === 'berkas'
                      ? 'border-brand-800 text-brand-900 bg-brand-50/50 rounded-t-lg'
                      : 'border-transparent text-ink-muted hover:text-ink hover:border-line'
                  }`}
                >
                  <FileText className="w-4 h-4" />
                  <span>Berkas & Master Fisik</span>
                  <span className="font-mono text-[10px] px-1.5 py-0.2 rounded-full bg-surface-subtle border border-line text-ink">
                    {data.manuscript_files?.length || 0}
                  </span>
                </button>

                <button
                  type="button"
                  onClick={() => setActiveTab('timeline')}
                  className={`inline-flex items-center gap-2 px-4 py-2.5 text-xs font-bold border-b-2 transition-all cursor-pointer ${
                    activeTab === 'timeline'
                      ? 'border-brand-800 text-brand-900 bg-brand-50/50 rounded-t-lg'
                      : 'border-transparent text-ink-muted hover:text-ink hover:border-line'
                  }`}
                >
                  <Clock className="w-4 h-4" />
                  <span>Riwayat & Lacak Proses</span>
                  <span className="font-mono text-[10px] px-1.5 py-0.2 rounded-full bg-surface-subtle border border-line text-ink">
                    {data.timeline?.length || 0}
                  </span>
                </button>

                <button
                  type="button"
                  onClick={() => setActiveTab('dokumen')}
                  className={`inline-flex items-center gap-2 px-4 py-2.5 text-xs font-bold border-b-2 transition-all cursor-pointer ${
                    activeTab === 'dokumen'
                      ? 'border-brand-800 text-brand-900 bg-brand-50/50 rounded-t-lg'
                      : 'border-transparent text-ink-muted hover:text-ink hover:border-line'
                  }`}
                >
                  <Building2 className="w-4 h-4" />
                  <span>Dokumen Resmi</span>
                  {(data.official_documents?.length > 0) && (
                    <span className="font-mono text-[10px] px-1.5 py-0.2 rounded-full bg-brand-100 border border-brand-200 text-brand-800">
                      {data.official_documents.length}
                    </span>
                  )}
                </button>
              </nav>
            </div>

            {/* TAB 1: Berkas & Master Fisik */}
            <div className={activeTab === 'berkas' ? 'space-y-6 animate-fadeIn' : 'hidden'}>
              <div className="grid lg:grid-cols-[1.3fr_1fr] gap-6 items-start">
                {/* Kolom Kiri: Berkas Digital */}
                <div className="space-y-6">
                  <section className="rounded-xl border border-line bg-white p-5 space-y-4 shadow-2xs">
                    <div className="border-b border-line pb-3">
                      <h2 className="font-bold text-ink text-sm flex items-center gap-2">
                        <FileText className="w-4 h-4 text-brand-800" />
                        Berkas naskah
                      </h2>
                      <p className="text-[11px] text-ink-muted mt-0.5">
                        Sampul dan halaman 1–5 adalah berkas awal. PDF, PNG, atau JPEG (maksimal 10 MB).
                      </p>
                    </div>

                    {data.manuscript_files?.length ? (
                      <ul className="space-y-2">
                        {data.manuscript_files.map((item) => (
                          <li
                            key={item.id}
                            className="flex justify-between items-center gap-3 rounded-lg bg-canvas border border-line p-3 text-xs text-ink"
                          >
                            <div className="flex items-center gap-2">
                              <FileText className="w-4 h-4 text-brand-700" />
                              <span className="font-semibold text-ink">
                                {fileTypes[item.type] || item.type}
                              </span>
                            </div>
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
                </div>

                {/* Kolom Kanan: Master Fisik & Tombol Pengajuan */}
                <div className="space-y-6">
                  {/* Master Fisik Declaration */}
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

                  {/* Kirim Pengajuan Form */}
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
                        className="text-xs w-full sm:w-auto"
                      >
                        <Send className="h-3.5 w-3.5 mr-1.5" />
                        {revision ? 'Ajukan ulang perbaikan' : 'Kirim pengajuan'}
                      </Button>
                    </section>
                  )}
                </div>
              </div>
            </div>

            {/* TAB 2: Riwayat & Lacak Proses */}
            <div className={activeTab === 'timeline' ? 'space-y-6 animate-fadeIn' : 'hidden'}>
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

            {/* TAB 3: Dokumen Resmi */}
            <div className={activeTab === 'dokumen' ? 'space-y-6 animate-fadeIn' : 'hidden'}>
              {/* Bukti Pendaftaran Card */}
              <section className="rounded-xl border border-line bg-white p-5 space-y-3 shadow-2xs">
                <div className="flex flex-wrap items-center justify-between gap-3 border-b border-line pb-3">
                  <div>
                    <h2 className="font-bold text-ink text-sm flex items-center gap-2">
                      <Printer className="w-4 h-4 text-brand-800" />
                      Bukti Pendaftaran Resmi (Tanda Terima)
                    </h2>
                    <p className="text-[11px] text-ink-muted mt-0.5">
                      Tanda terima pendaftaran permohonan tashih dengan kode QR verifikasi resmi LPMQ.
                    </p>
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setShowReceipt(true)}
                    className="text-xs font-bold text-brand-800 border-brand-300 hover:bg-brand-50"
                  >
                    <Printer className="h-3.5 w-3.5 mr-1.5 text-brand-700" />
                    Buka Tanda Terima & Unduh PDF
                  </Button>
                </div>
                <div className="p-3 bg-canvas rounded-lg border border-line text-xs space-y-1">
                  <p className="text-ink">Nomor Registrasi: <strong className="font-mono text-brand-800">{data.registration_no}</strong></p>
                  <p className="text-ink-muted text-[11px]">Dapat dicetak sebagai bukti penyerahan saat datang langsung ke Loket LPMQ TMII.</p>
                </div>
              </section>

              {/* Surat Tanda Tashih Section */}
              <section className="rounded-xl border border-line bg-white p-5 space-y-4 shadow-2xs">
                <h2 className="font-bold text-ink text-sm">Surat Tanda Tashih</h2>
                <PublisherDocumentList documents={data.official_documents} />
                <DocumentArchive registrationId={data.id} />
              </section>
            </div>
          </>
        )
      )}

      {/* Modal Hapus Draf */}
      {showDeleteModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-ink/60 backdrop-blur-xs">
          <div className="bg-white rounded-2xl shadow-2xl border border-line max-w-md w-full p-6 space-y-4">
            <div className="w-12 h-12 rounded-full bg-civic-dangerSoft text-civic-danger flex items-center justify-center mx-auto">
              <Trash2 className="w-6 h-6" />
            </div>
            <div className="text-center space-y-1">
              <h3 className="text-base font-bold text-ink">Hapus Draf Permohonan</h3>
              <p className="text-xs text-ink-muted">
                Apakah Anda yakin ingin menghapus draf permohonan <strong className="text-ink">{data?.title}</strong>?
                Seluruh berkas naskah yang telah diunggah akan dihapus permanen. Tindakan ini tidak dapat dibatalkan.
              </p>
            </div>
            <div className="flex items-center justify-end gap-2 pt-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setShowDeleteModal(false)}
                disabled={actionLoading}
                className="text-xs"
              >
                Batal
              </Button>
              <Button
                size="sm"
                onClick={handleDeleteDraft}
                disabled={actionLoading}
                className="bg-civic-danger hover:bg-civic-danger text-white font-semibold text-xs"
              >
                {actionLoading ? 'Menghapus...' : 'Ya, Hapus Draf'}
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Modal Batalkan Permohonan */}
      {showCancelModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-ink/60 backdrop-blur-xs">
          <div className="bg-white rounded-2xl shadow-2xl border border-line max-w-md w-full p-6 space-y-4">
            <div className="w-12 h-12 rounded-full bg-civic-warningSoft text-civic-warning flex items-center justify-center mx-auto">
              <XCircle className="w-6 h-6" />
            </div>
            <div className="text-center space-y-1">
              <h3 className="text-base font-bold text-ink">Batalkan Permohonan Pentashihan</h3>
              <p className="text-xs text-ink-muted">
                Apakah Anda yakin ingin membatalkan permohonan <strong className="text-ink">{data?.title}</strong> ({data?.registration_no})?
                Permohonan akan ditarik dari antrean verifikasi LPMQ.
              </p>
            </div>
            <div className="space-y-1.5 text-left">
              <label className="text-xs font-semibold text-ink">Alasan Pembatalan (Opsional):</label>
              <textarea
                value={cancelReason}
                onChange={(e) => setCancelReason(e.target.value)}
                placeholder="Contoh: Terdapat revisi format master sebelum verifikasi dimulai..."
                rows={3}
                className="w-full rounded-xl border border-line p-2.5 text-xs focus:ring-2 focus:ring-brand-700/20 focus:border-brand-700"
              />
            </div>
            <div className="flex items-center justify-end gap-2 pt-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setShowCancelModal(false)}
                disabled={actionLoading}
                className="text-xs"
              >
                Kembali
              </Button>
              <Button
                size="sm"
                onClick={handleCancelRegistration}
                disabled={actionLoading}
                className="bg-civic-warning hover:bg-civic-warning text-white font-semibold text-xs"
              >
                {actionLoading ? 'Membatalkan...' : 'Ya, Batalkan Permohonan'}
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Dialog Bukti Pendaftaran Resmi */}
      {physicalReceiptUrl && (
        <div role="dialog" aria-modal="true" aria-label="PDF tanda terima fisik" className="fixed inset-0 z-50 bg-ink/70 p-3 sm:p-6 flex items-center justify-center">
          <div className="w-full max-w-5xl h-[92vh] rounded-xl bg-white shadow-xl flex flex-col overflow-hidden">
            <div className="flex flex-wrap items-center justify-between gap-2 border-b border-line px-4 py-3">
              <div>
                <h2 className="text-sm font-bold text-ink">Tanda Terima Master Fisik</h2>
                <p className="text-xs text-ink-muted">Gunakan ikon cetak pada toolbar PDF untuk mencetak dokumen berkop LPMQ.</p>
              </div>
              <div className="flex items-center gap-2">
                <a href={physicalReceiptUrl} download={`tanda-terima-${data?.registration_no || 'master-fisik'}.pdf`} className="rounded-lg border border-line px-3 py-1.5 text-xs font-semibold text-ink hover:bg-canvas">Unduh PDF</a>
                <Button variant="outline" className="text-xs" onClick={() => setPhysicalReceiptUrl(null)}>Tutup</Button>
              </div>
            </div>
            <iframe title="Penampil PDF tanda terima master fisik" src={physicalReceiptUrl} className="flex-1 w-full border-0" />
          </div>
        </div>
      )}
      <RegistrationReceiptDialog
        isOpen={showReceipt}
        onClose={() => {
          setShowReceipt(false);
          if (location.state?.showReceipt) {
            navigate(location.pathname, { replace: true, state: {} });
          }
        }}
        registration={data}
      />
    </div>
  );
}

export default PublisherRegistrationDetailPage;
