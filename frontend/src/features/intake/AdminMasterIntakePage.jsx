import React, { useState, useEffect } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { clsx } from 'clsx';
import { useAuth } from '@/features/auth/AuthContext';
import { registrationApi } from '@/api/registration.api';
import { verificationApi } from '@/api/verification.api';
import { PageHeader } from '@/components/ui/PageHeader';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { Modal } from '@/components/ui/Modal';
import { ConfirmationSummaryDialog } from '@/components/common/ConfirmationSummaryDialog';
import { invalidateQueueCounts } from '@/api/queue.api';
import {
  PackageCheck,
  Search,
  AlertTriangle,
  CheckCircle2,
  AlertCircle,
  Printer,
  RefreshCw,
  Building2,
  ArrowRight,
  ArrowLeft,
  UserCheck,
  ExternalLink,
  Hourglass,
  QrCode,
  X,
} from 'lucide-react';
import { AssignVerificationDialog } from '@/features/verification/AssignVerificationDialog';
import { IntakeQueueList } from './IntakeQueueList';
import { CopyButton, IntakeProgress, ShipmentDetails, formatDate } from './intake-parts';

const CONDITIONS = [
  { id: 'BAIK', label: 'Baik & lengkap', desc: 'Jilid rapi, cetakan jelas' },
  { id: 'LENGKAP_CATATAN', label: 'Ada catatan', desc: 'Jilid lecek / longgar' },
  { id: 'CACAT', label: 'Cacat / buram', desc: 'Halaman hilang / buram' },
];
const conditionLabel = (id) => CONDITIONS.find((item) => item.id === id)?.label || id || 'Baik';

const inputClass =
  'w-full rounded-lg border border-line-strong bg-white px-3 py-2.5 text-sm text-ink focus:border-brand-700 focus:outline-none focus:ring-2 focus:ring-brand-700/20 disabled:bg-canvas disabled:text-ink-muted';

// Format resmi nomor tanda terima: TT-LPMQ-YYYY-XXXX
const generateReceiptNo = () => `TT-LPMQ-${new Date().getFullYear()}-${Math.floor(1000 + Math.random() * 9000)}`;

const Alert = ({ tone, icon: Icon, children, onClose }) => (
  <div
    role={tone === 'danger' ? 'alert' : 'status'}
    className={clsx(
      'flex items-start justify-between gap-3 rounded-xl border p-3.5 text-sm animate-fadeIn',
      tone === 'danger' && 'border-civic-dangerLine bg-civic-dangerSoft text-civic-danger',
      tone === 'success' && 'border-brand-100 bg-brand-50 text-brand-900',
      tone === 'warning' && 'border-civic-warningLine bg-civic-warningSoft text-civic-warning'
    )}
  >
    <div className="flex items-start gap-2.5">
      <Icon className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
      <div className="space-y-0.5">{children}</div>
    </div>
    {onClose && (
      <button type="button" onClick={onClose} aria-label="Tutup pesan" className="rounded-md p-1 hover:bg-white/60 focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-700">
        <X className="h-4 w-4" />
      </button>
    )}
  </div>
);

const Panel = ({ title, subtitle, icon: Icon, children, className }) => (
  <section className={clsx('rounded-xl border border-line bg-white p-5 shadow-2xs sm:p-6', className)}>
    <header className="mb-4 flex items-start gap-3">
      <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-brand-50 text-brand-800">
        <Icon className="h-4 w-4" aria-hidden="true" />
      </span>
      <div>
        <h2 className="text-sm font-bold text-ink">{title}</h2>
        <p className="text-xs text-ink-muted">{subtitle}</p>
      </div>
    </header>
    {children}
  </section>
);

export const AdminMasterIntakePage = () => {
  const { currentUser } = useAuth();
  const [searchParams, setSearchParams] = useSearchParams();

  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(false);
  const [actionLoading, setActionLoading] = useState(false);
  const [error, setError] = useState(null);
  const [searchError, setSearchError] = useState(null);
  const [receiveError, setReceiveError] = useState(null);
  const [returnModalError, setReturnModalError] = useState(null);
  const [successMessage, setSuccessMessage] = useState(null);

  const [selectedReg, setSelectedReg] = useState(null);

  const [waitingList, setWaitingList] = useState([]);
  const [waitingLoading, setWaitingLoading] = useState(false);
  const [waitingPagination, setWaitingPagination] = useState({ page: 1, limit: 20, total: 0, totalPages: 1 });

  const [condition, setCondition] = useState('BAIK');
  const [actualVolumeCount, setActualVolumeCount] = useState(30);
  const [receiptNo, setReceiptNo] = useState('');
  const [notes, setNotes] = useState('');

  const [confirmReceiveOpen, setConfirmReceiveOpen] = useState(false);
  const [returnModalOpen, setReturnModalOpen] = useState(false);
  const [returnReason, setReturnReason] = useState('');
  const [assignDialogOpen, setAssignDialogOpen] = useState(false);
  const [receiptPdfUrl, setReceiptPdfUrl] = useState(null);

  useEffect(() => () => {
    if (receiptPdfUrl) URL.revokeObjectURL(receiptPdfUrl);
  }, [receiptPdfUrl]);

  const showReceiptPdf = async () => {
    if (!selectedReg?.id) return;
    setActionLoading(true);
    setError(null);
    try {
      const blob = await verificationApi.getPhysicalReceiptPdf(selectedReg.id);
      setReceiptPdfUrl(URL.createObjectURL(blob));
    } catch (reason) {
      setError(reason.message || 'PDF tanda terima belum dapat dibuka.');
    } finally {
      setActionLoading(false);
    }
  };

  const fetchWaitingList = async (page = waitingPagination.page) => {
    setWaitingLoading(true);
    try {
      const response = await registrationApi.listRegistrations({
        segment: 'MASTER_INTAKE',
        page,
        limit: waitingPagination.limit,
      });
      const items = Array.isArray(response?.data) ? response.data : (response?.data?.items || []);
      setWaitingList(items);
      const pagination = response?.pagination || response?.data?.pagination;
      if (pagination) {
        setWaitingPagination((current) => ({
          ...current,
          page: pagination.page || page,
          total: pagination.total ?? pagination.total_records ?? 0,
          totalPages: pagination.totalPages ?? pagination.total_pages ?? 1,
        }));
      }
    } catch (err) {
      setError(err.message || 'Gagal memuat antrean master fisik.');
    } finally {
      setWaitingLoading(false);
    }
  };

  const prefillForm = (data) => {
    const declaration = data.physical_master_intake || {};
    setActualVolumeCount(declaration.volume_count || 30);
    setCondition(declaration.condition || 'BAIK');
    setReceiptNo(declaration.receipt_no || generateReceiptNo());
    setNotes(declaration.notes || '');
  };

  const loadRegistrationById = async (id) => {
    if (!id) return;
    setLoading(true);
    setError(null);
    setSuccessMessage(null);
    try {
      const detailRes = await registrationApi.getDetail(id);
      const data = detailRes?.data || detailRes;
      if (data) {
        setSelectedReg(data);
        setSearchQuery(data.registration_no || '');
        prefillForm(data);
      }
    } catch (err) {
      setError(err.message || 'Gagal memuat detail naskah.');
    } finally {
      setLoading(false);
    }
  };

  const handleSearch = async (query = searchQuery) => {
    const trimmed = (query || '').trim();
    if (!trimmed) return;

    setLoading(true);
    setSearchError(null);
    setError(null);
    setSuccessMessage(null);
    try {
      const res = await registrationApi.listRegistrations({ search: trimmed, limit: 10 });
      const items = Array.isArray(res?.data) ? res.data : (res?.data?.items || []);
      if (items.length === 0) {
        setSelectedReg(null);
        setSearchError(`Tidak ditemukan pendaftaran dengan nomor atau kata kunci '${trimmed}'.`);
      } else {
        const detailRes = await registrationApi.getDetail(items[0].id);
        const data = detailRes?.data || items[0];
        setSelectedReg(data);
        prefillForm(data);
      }
    } catch (err) {
      setSearchError(err.message || 'Gagal mencari pendaftaran.');
    } finally {
      setLoading(false);
    }
  };

  // Baca URL query parameter saat pertama kali dibuka atau parameter berubah
  useEffect(() => {
    const q = searchParams.get('search') || searchParams.get('q');
    const id = searchParams.get('id');
    if (id) {
      loadRegistrationById(id);
    } else if (q) {
      setSearchQuery(q);
      handleSearch(q);
    } else {
      fetchWaitingList();
    }
  }, [searchParams]);

  const handleBackToQueue = () => {
    setSelectedReg(null);
    setSearchQuery('');
    setSearchParams({});
    fetchWaitingList();
  };

  const refreshSelected = async () => {
    const detailRes = await registrationApi.getDetail(selectedReg.id);
    if (detailRes?.data) setSelectedReg(detailRes.data);
  };

  const declaredVolumeCount = selectedReg?.physical_master_intake?.volume_count ?? 30;
  const isVolumeMismatch = Number(actualVolumeCount) !== Number(declaredVolumeCount);

  const handleConfirmReceive = async () => {
    if (!selectedReg?.id) return;
    if (!receiptNo.trim()) {
      setReceiveError('Nomor tanda terima fisik wajib diisi.');
      return;
    }

    setActionLoading(true);
    setReceiveError(null);
    setError(null);
    setSuccessMessage(null);
    try {
      await verificationApi.receivePhysicalMaster(selectedReg.id, {
        decision: 'RECEIVED',
        volume_count: Number(actualVolumeCount),
        condition: condition.trim(),
        receipt_no: receiptNo.trim(),
        notes: notes.trim() || undefined,
      });
      invalidateQueueCounts();
      setSuccessMessage(`Master fisik mushaf berhasil diterima. Nomor Tanda Terima ${receiptNo} telah diterbitkan.`);
      setConfirmReceiveOpen(false);
      await refreshSelected();
    } catch (err) {
      setReceiveError(err.message || 'Gagal memproses penerimaan master fisik.');
    } finally {
      setActionLoading(false);
    }
  };

  const closeReturnModal = () => {
    setReturnModalOpen(false);
    setReturnModalError(null);
  };

  const handleReturnSubmit = async (e) => {
    e.preventDefault();
    if (!selectedReg?.id) return;
    if (!returnReason.trim() || returnReason.trim().length < 5) {
      setReturnModalError('Alasan pengembalian master fisik minimal 5 karakter.');
      return;
    }

    setActionLoading(true);
    setReturnModalError(null);
    setError(null);
    setSuccessMessage(null);
    try {
      await verificationApi.receivePhysicalMaster(selectedReg.id, {
        decision: 'RETURNED',
        volume_count: Number(actualVolumeCount),
        condition: condition.trim(),
        notes: returnReason.trim(),
      });
      invalidateQueueCounts();
      setSuccessMessage('Master fisik mushaf dikembalikan kepada penerbit dengan catatan perbaikan.');
      setReturnModalOpen(false);
      setReturnReason('');
      await refreshSelected();
    } catch (err) {
      setReturnModalError(err.message || 'Gagal mengembalikan master fisik.');
    } finally {
      setActionLoading(false);
    }
  };

  const intake = selectedReg?.physical_master_intake;
  const intakeStatus = intake?.status || 'PENDING';
  const isReceived = intakeStatus === 'RECEIVED';
  const isReturned = intakeStatus === 'RETURNED';
  // Backend menolak penerimaan sebelum penerbit mengonfirmasi pengiriman (dispatch-physical).
  const isDispatched = selectedReg?.physical_dispatch_status === 'DISPATCHED';
  const awaitingDispatch = Boolean(selectedReg) && !isReceived && !isReturned && !isDispatched;
  const userRoles = currentUser?.roles || (currentUser?.role ? [currentUser.role] : []);
  const canAssign = userRoles.includes('ADMIN_INTERNAL') || userRoles.includes('SUPERADMIN') || ['ADMIN_INTERNAL', 'SUPERADMIN'].includes(currentUser?.role);
  const isAssigned = selectedReg?.status && !['READY_FOR_VERIFICATION', 'REVISION_REQUIRED'].includes(selectedReg.status);

  const progressSteps = selectedReg ? [
    { label: 'Diajukan', hint: formatDate(selectedReg.fee_sla_snapshot?.submitted_at || selectedReg.created_at, 'short'), done: true },
    { label: 'Dikirim penerbit', hint: isDispatched ? formatDate(selectedReg.dispatch_date, 'short') : 'Menunggu resi', done: isDispatched || isReceived },
    { label: 'Diterima LPMQ', hint: isReceived ? formatDate(intake?.received_at, 'short') : isReturned ? 'Dikembalikan' : 'Pemeriksaan loket', done: isReceived },
    { label: 'Diteruskan', hint: isAssigned ? 'Tahap berikutnya berjalan' : 'Penugasan / distribusi', done: isReceived && isAssigned },
  ] : [];

  const statusBadge = isReceived
    ? <Badge variant="success" icon={CheckCircle2}>Fisik diterima</Badge>
    : isReturned
      ? <Badge variant="danger" icon={AlertTriangle}>Dikembalikan</Badge>
      : awaitingDispatch
        ? <Badge variant="default" icon={Hourglass}>Belum dikirim penerbit</Badge>
        : <Badge variant="info" icon={PackageCheck}>Siap diperiksa</Badge>;

  const nextStepAction = !isAssigned && (canAssign ? (
    <Button type="button" variant="primary" size="sm" onClick={() => setAssignDialogOpen(true)}>
      <UserCheck className="h-3.5 w-3.5" aria-hidden="true" />
      Tugaskan Verifikator Sekarang
    </Button>
  ) : (
    <Link
      to={`/internal/verifications?tab=NEED_ASSIGNMENT&id=${selectedReg?.id}`}
      className="inline-flex min-h-[38px] items-center justify-center gap-1.5 rounded-lg bg-brand-700 px-3 py-1.5 text-xs font-bold text-white shadow-2xs transition-colors hover:bg-brand-800 focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-700 focus-visible:ring-offset-2"
    >
      Buka Antrean Penugasan
      <ArrowRight className="h-3.5 w-3.5" aria-hidden="true" />
    </Link>
  ));

  return (
    <div className="mx-auto max-w-7xl space-y-5 pb-24 animate-fadeIn">
      <PageHeader
        title="Penerimaan Master Fisik Mushaf"
        subtitle="Periksa paket master fisik yang sudah dikirim penerbit, lalu terbitkan tanda terima resmi LPMQ."
        breadcrumbs={[
          { label: 'Portal Petugas', href: '/internal' },
          { label: 'Penerimaan Master Fisik' },
        ]}
      />

      {successMessage && (
        <Alert tone="success" icon={CheckCircle2} onClose={() => setSuccessMessage(null)}>
          <p className="font-semibold">{successMessage}</p>
        </Alert>
      )}
      {error && (
        <Alert tone="danger" icon={AlertCircle} onClose={() => setError(null)}>
          <p className="font-semibold">{error}</p>
        </Alert>
      )}

      {/* Pencarian cepat / scan QR bukti pendaftaran */}
      <form
        role="search"
        onSubmit={(e) => {
          e.preventDefault();
          handleSearch();
        }}
        className="flex flex-col gap-2.5 rounded-xl border border-line bg-white p-3 shadow-2xs sm:flex-row sm:items-center"
      >
        <label htmlFor="intake-search" className="sr-only">
          Cari nomor registrasi atau scan QR tanda bukti pendaftaran
        </label>
        <div className="relative flex-1">
          <QrCode className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-ink-muted" aria-hidden="true" />
          <input
            id="intake-search"
            type="text"
            value={searchQuery}
            onChange={(e) => {
              setSearchQuery(e.target.value);
              setSearchError(null);
            }}
            placeholder="Contoh: REG-2026-001 atau tempel kode QR..."
            className={clsx(inputClass, 'pl-10 font-mono')}
          />
        </div>
        <Button type="submit" variant="primary" disabled={loading || !searchQuery.trim()} className="sm:w-auto">
          <Search className={clsx('h-4 w-4', loading && 'animate-spin')} aria-hidden="true" />
          {loading ? 'Mencari...' : 'Periksa Naskah'}
        </Button>
      </form>
      {searchError && (
        <Alert tone="danger" icon={AlertCircle}>
          <p>{searchError}</p>
        </Alert>
      )}

      {selectedReg ? (
        <div className="space-y-5">
          {/* Identitas naskah + progres alur */}
          <section className="space-y-5 rounded-xl border border-line bg-white p-5 shadow-2xs sm:p-6">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
              <div className="min-w-0 space-y-1.5">
                <button
                  type="button"
                  onClick={handleBackToQueue}
                  className="group inline-flex items-center gap-1.5 rounded-md text-xs font-semibold text-ink-muted hover:text-brand-800 focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-700"
                >
                  <ArrowLeft className="h-3.5 w-3.5 transition-transform group-hover:-translate-x-0.5" aria-hidden="true" />
                  Kembali ke Antrean Penerimaan Fisik
                </button>
                <h2 className="text-lg font-bold leading-snug text-ink">{selectedReg.title}</h2>
                <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-ink-muted">
                  <span className="inline-flex items-center font-mono font-bold text-brand-900">
                    {selectedReg.registration_no}
                    <CopyButton text={selectedReg.registration_no} label="nomor registrasi" />
                  </span>
                  <span className="inline-flex items-center gap-1.5">
                    <Building2 className="h-3.5 w-3.5" aria-hidden="true" />
                    {selectedReg.publisher?.legal_name || '-'}
                  </span>
                  <span>{selectedReg.service_type?.name || 'Mushaf Standar'}</span>
                </div>
              </div>
              <div className="shrink-0">{statusBadge}</div>
            </div>
            <div className="border-t border-line pt-5">
              <IntakeProgress steps={progressSteps} />
            </div>
          </section>

          {isReturned && (
            <Alert tone="danger" icon={AlertTriangle}>
              <p className="font-bold">Master Fisik Dikembalikan ke Penerbit (Perlu Perbaikan)</p>
              <p>
                Alasan: <em>&ldquo;{intake?.notes || 'Master fisik tidak lengkap atau cacat.'}&rdquo;</em> · Kondisi: {conditionLabel(intake?.condition)}
              </p>
            </Alert>
          )}

          <div className="grid grid-cols-1 gap-5 lg:grid-cols-12">
            {/* Paket dari penerbit */}
            <Panel
              title="Paket dari Penerbit"
              subtitle="Data pengiriman dan deklarasi yang diisi penerbit"
              icon={PackageCheck}
              className="lg:col-span-5"
            >
              <div className="space-y-4">
                {isDispatched ? (
                  <ShipmentDetails reg={selectedReg} />
                ) : (
                  <div className="rounded-lg border border-dashed border-line-strong bg-canvas/60 p-4 text-center text-xs text-ink-muted">
                    Penerbit belum mengonfirmasi pengiriman, jadi belum ada kurir atau nomor resi.
                  </div>
                )}

                <dl className="grid grid-cols-2 gap-3">
                  <div className="rounded-lg border border-line p-3">
                    <dt className="text-xs text-ink-muted">Format master</dt>
                    <dd className="mt-0.5 text-sm font-bold text-ink">{intake?.format || 'A4'} · per juz</dd>
                  </div>
                  <div className="rounded-lg border border-brand-100 bg-brand-50/60 p-3">
                    <dt className="text-xs text-brand-900">Jilid dideklarasikan</dt>
                    <dd className="mt-0.5 font-mono text-lg font-black leading-none text-brand-950">
                      {declaredVolumeCount} <span className="font-sans text-xs font-bold text-brand-800">jilid</span>
                    </dd>
                  </div>
                </dl>

                <div className="space-y-0.5 text-xs">
                  <p className="font-semibold text-ink">{selectedReg.publisher?.legal_name || '-'}</p>
                  <p className="leading-relaxed text-ink-muted">{selectedReg.publisher?.address || 'Alamat tidak terdata'}</p>
                  {selectedReg.publisher?.phone && <p className="font-mono text-ink-muted">Telp: {selectedReg.publisher.phone}</p>}
                </div>

                <Link
                  to={`/publisher/registrations/${selectedReg.id}`}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex items-center gap-1.5 rounded-md text-xs font-semibold text-brand-800 hover:underline focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-700"
                >
                  Buka berkas lengkap permohonan
                  <ExternalLink className="h-3.5 w-3.5" aria-hidden="true" />
                  <span className="sr-only">(tab baru)</span>
                </Link>
              </div>
            </Panel>

            {/* Pemeriksaan & keputusan petugas */}
            <Panel
              title="Pemeriksaan Fisik di Loket"
              subtitle={isReceived ? 'Tanda terima resmi sudah diterbitkan' : 'Hitung jilid, periksa kondisi, lalu putuskan'}
              icon={isReceived ? CheckCircle2 : UserCheck}
              className="lg:col-span-7"
            >
              {awaitingDispatch ? (
                <div className="flex flex-col items-center gap-3 rounded-lg border border-dashed border-line-strong bg-canvas/60 px-6 py-10 text-center">
                  <Hourglass className="h-8 w-8 text-ink-muted" aria-hidden="true" />
                  <div className="max-w-md space-y-1">
                    <p className="text-sm font-bold text-ink">Menunggu penerbit mengirim master fisik</p>
                    <p className="text-xs leading-relaxed text-ink-muted">
                      Penerimaan baru bisa diproses setelah penerbit mengisi kurir dan nomor resi, atau memilih
                      antar langsung ke loket LPMQ, di portal penerbit. Naskah ini otomatis masuk antrean setelahnya.
                    </p>
                  </div>
                </div>
              ) : isReceived ? (
                <div className="space-y-4">
                  <div className="rounded-lg border border-brand-100 bg-brand-50 p-4">
                    <p className="text-sm font-bold text-brand-900">Master Fisik Telah Resmi Diterima oleh Admin Internal LPMQ</p>
                    <dl className="mt-3 grid grid-cols-1 gap-3 text-xs sm:grid-cols-3">
                      <div>
                        <dt className="text-brand-800">Nomor tanda terima</dt>
                        <dd className="flex items-center font-mono font-bold text-brand-950">
                          {intake?.receipt_no}
                          <CopyButton text={intake?.receipt_no} label="nomor tanda terima" />
                        </dd>
                      </div>
                      <div>
                        <dt className="text-brand-800">Kondisi</dt>
                        <dd className="font-semibold text-brand-950">{conditionLabel(intake?.condition)}</dd>
                      </div>
                      <div>
                        <dt className="text-brand-800">Diterima</dt>
                        <dd className="font-semibold text-brand-950">{formatDate(intake?.received_at)}</dd>
                      </div>
                    </dl>
                  </div>
                  <div className="flex flex-col-reverse gap-2.5 border-t border-line pt-4 sm:flex-row sm:items-center sm:justify-between">
                    <p className="text-xs text-ink-muted">
                      {isAssigned ? 'Naskah sudah diteruskan ke tahap berikutnya.' : 'Langkah berikutnya: penugasan verifikator.'}
                    </p>
                    <div className="flex flex-wrap items-center gap-2">
                      <Button variant="outline" size="sm" onClick={showReceiptPdf} disabled={actionLoading}>
                        <Printer className="h-3.5 w-3.5" aria-hidden="true" />
                        Lihat / Cetak PDF Tanda Terima
                      </Button>
                      {nextStepAction}
                      {isAssigned && (
                        <Link
                          to={`/internal/verifications/${selectedReg.verification_assignment?.id || selectedReg.verification_assignments?.[0]?.id || selectedReg.id}`}
                          className="inline-flex min-h-[38px] items-center justify-center gap-1.5 rounded-lg bg-ink px-3 py-1.5 text-xs font-bold text-canvas shadow-2xs focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-700 focus-visible:ring-offset-2"
                        >
                          Lihat Pemeriksaan
                          <ArrowRight className="h-3.5 w-3.5" aria-hidden="true" />
                        </Link>
                      )}
                    </div>
                  </div>
                </div>
              ) : (
                <div className="space-y-5">
                  <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                    <div>
                      <label htmlFor="actual-volume-count" className="mb-1.5 block text-xs font-bold text-ink">
                        Jumlah jilid aktual diterima <span className="text-civic-danger" aria-hidden="true">*</span>
                      </label>
                      <input
                        id="actual-volume-count"
                        type="number"
                        min="1"
                        max="60"
                        inputMode="numeric"
                        required
                        aria-describedby="volume-hint"
                        aria-invalid={isVolumeMismatch}
                        value={actualVolumeCount}
                        onChange={(e) => setActualVolumeCount(e.target.value)}
                        className={clsx(
                          inputClass,
                          'font-mono font-bold',
                          isVolumeMismatch && 'border-civic-warningLine bg-civic-warningSoft text-civic-warning focus:ring-civic-warning/20'
                        )}
                      />
                      <p id="volume-hint" className={clsx('mt-1 inline-flex items-center gap-1 text-xs font-semibold', isVolumeMismatch ? 'text-civic-warning' : 'text-civic-success')}>
                        {isVolumeMismatch ? <AlertTriangle className="h-3.5 w-3.5" aria-hidden="true" /> : <CheckCircle2 className="h-3.5 w-3.5" aria-hidden="true" />}
                        {isVolumeMismatch ? `Berbeda dari deklarasi (${declaredVolumeCount} jilid)` : `Sesuai deklarasi (${declaredVolumeCount} jilid)`}
                      </p>
                    </div>

                    <div>
                      <label htmlFor="receipt-number-input" className="mb-1.5 block text-xs font-bold text-ink">
                        Nomor tanda terima LPMQ <span className="text-civic-danger" aria-hidden="true">*</span>
                      </label>
                      <div className="flex gap-2">
                        <input
                          id="receipt-number-input"
                          type="text"
                          required
                          value={receiptNo}
                          onChange={(e) => setReceiptNo(e.target.value)}
                          placeholder="TT-LPMQ-YYYY-XXXX"
                          className={clsx(inputClass, 'font-mono font-bold')}
                        />
                        <Button type="button" variant="outline" size="sm" onClick={() => setReceiptNo(generateReceiptNo())} aria-label="Buat nomor tanda terima baru" className="shrink-0">
                          <RefreshCw className="h-3.5 w-3.5" aria-hidden="true" />
                        </Button>
                      </div>
                      <p className="mt-1 text-xs text-ink-muted">Format: TT-LPMQ-TAHUN-NOMOR</p>
                    </div>
                  </div>

                  {isVolumeMismatch && (
                    <Alert tone="warning" icon={AlertTriangle}>
                      <p className="font-bold">Peringatan Perbedaan Jumlah Jilid Fisik</p>
                      <p>
                        Dihitung <strong>{actualVolumeCount} jilid</strong>, deklarasi penerbit <strong>{declaredVolumeCount} jilid</strong>.
                        Sesuai SOP, penerimaan ditolak bila jumlah berbeda. Kembalikan master dengan catatan agar penerbit memperbarui deklarasi.
                      </p>
                    </Alert>
                  )}

                  <fieldset>
                    <legend className="mb-1.5 text-xs font-bold text-ink">
                      Kondisi fisik master <span className="text-civic-danger" aria-hidden="true">*</span>
                    </legend>
                    <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
                      {CONDITIONS.map((item) => {
                        const selected = condition === item.id;
                        return (
                          <label
                            key={item.id}
                            className={clsx(
                              'relative flex cursor-pointer flex-col rounded-lg border p-3 transition-colors focus-within:ring-2 focus-within:ring-brand-700',
                              selected
                                ? item.id === 'CACAT'
                                  ? 'border-civic-danger bg-civic-dangerSoft text-civic-danger'
                                  : 'border-brand-700 bg-brand-50 text-brand-950'
                                : 'border-line bg-white text-ink hover:bg-canvas'
                            )}
                          >
                            <input
                              type="radio"
                              name="intake-condition"
                              value={item.id}
                              checked={selected}
                              onChange={() => setCondition(item.id)}
                              className="sr-only"
                            />
                            <span className="text-xs font-bold">{item.label}</span>
                            <span className="text-xs text-ink-muted">{item.desc}</span>
                            {selected && <CheckCircle2 className="absolute right-2.5 top-2.5 h-3.5 w-3.5" aria-hidden="true" />}
                          </label>
                        );
                      })}
                    </div>
                  </fieldset>

                  <div>
                    <label htmlFor="intake-notes-textarea" className="mb-1.5 block text-xs font-bold text-ink">
                      Catatan pemeriksaan <span className="font-normal text-ink-muted">(opsional)</span>
                    </label>
                    <textarea
                      id="intake-notes-textarea"
                      rows={2}
                      value={notes}
                      onChange={(e) => setNotes(e.target.value)}
                      placeholder="Contoh: jilid per juz rapi, tidak ada halaman buram..."
                      className={inputClass}
                    />
                  </div>

                  <div className="flex flex-col gap-3 border-t border-line pt-4 sm:flex-row sm:items-center sm:justify-between">
                    <p className="flex items-center gap-1.5 text-xs text-ink-muted">
                      <UserCheck className="h-3.5 w-3.5" aria-hidden="true" />
                      Petugas: <span className="font-semibold text-ink">{currentUser?.name || 'Admin Internal'}</span> · {formatDate(new Date())}
                    </p>
                    <div className="flex flex-col-reverse gap-2 sm:flex-row">
                      <Button
                        type="button"
                        variant="outline"
                        onClick={() => {
                          setReturnModalError(null);
                          setError(null);
                          setReturnModalOpen(true);
                        }}
                        disabled={actionLoading}
                        className="border-civic-dangerLine text-civic-danger hover:bg-civic-dangerSoft"
                      >
                        <AlertTriangle className="h-4 w-4" aria-hidden="true" />
                        Kembalikan ke Penerbit
                      </Button>
                      <Button
                        type="button"
                        variant="primary"
                        onClick={() => {
                          setReceiveError(null);
                          setError(null);
                          setConfirmReceiveOpen(true);
                        }}
                        disabled={actionLoading || isVolumeMismatch}
                      >
                        <CheckCircle2 className="h-4 w-4" aria-hidden="true" />
                        Terima Master Fisik & Terbitkan Tanda Terima
                      </Button>
                    </div>
                  </div>
                </div>
              )}
            </Panel>
          </div>
        </div>
      ) : (
        <IntakeQueueList
          items={waitingList}
          loading={waitingLoading}
          pagination={waitingPagination}
          onRefresh={fetchWaitingList}
          onOpen={loadRegistrationById}
          onPageChange={fetchWaitingList}
        />
      )}

      {receiptPdfUrl && (
        <div role="dialog" aria-modal="true" aria-label="PDF tanda terima master fisik" className="fixed inset-0 z-50 flex items-center justify-center bg-ink/70 p-3 sm:p-6">
          <div className="flex h-[92vh] w-full max-w-5xl flex-col overflow-hidden rounded-xl bg-white shadow-xl">
            <div className="flex flex-wrap items-center justify-between gap-2 border-b border-line px-4 py-3">
              <div>
                <h2 className="text-sm font-bold text-ink">Tanda Terima Master Fisik</h2>
                <p className="text-xs text-ink-muted">Gunakan ikon cetak pada toolbar PDF untuk mencetak dokumen berkop LPMQ.</p>
              </div>
              <div className="flex items-center gap-2">
                <a href={receiptPdfUrl} download={`tanda-terima-${selectedReg?.registration_no || 'master-fisik'}.pdf`} className="rounded-lg border border-line px-3 py-1.5 text-xs font-semibold text-ink hover:bg-canvas">Unduh PDF</a>
                <Button variant="outline" size="sm" onClick={() => setReceiptPdfUrl(null)}>Tutup</Button>
              </div>
            </div>
            <iframe title="Penampil PDF tanda terima master fisik" src={receiptPdfUrl} className="w-full flex-1 border-0" />
          </div>
        </div>
      )}

      {selectedReg && (
        <ConfirmationSummaryDialog
          isOpen={confirmReceiveOpen}
          onClose={() => {
            setConfirmReceiveOpen(false);
            setReceiveError(null);
          }}
          onConfirm={handleConfirmReceive}
          errorMessage={receiveError}
          title="Terima Master Fisik & Terbitkan Tanda Terima"
          description="Pastikan naskah fisik print-out A4 telah diperiksa lengkap sebelum tanda terima resmi diterbitkan."
          summaryItems={[
            { label: 'Nomor Registrasi', value: selectedReg.registration_no },
            { label: 'Judul Naskah', value: selectedReg.title },
            { label: 'Penerbit', value: selectedReg.publisher?.legal_name || '-' },
            { label: 'Jumlah Jilid', value: `${actualVolumeCount} Jilid A4` },
            { label: 'Kondisi', value: conditionLabel(condition) },
            { label: 'Nomor Tanda Terima', value: receiptNo },
          ]}
          impactMessage={selectedReg.status === 'REVISION_REQUIRED' ? 'Tanda terima resmi (TT-LPMQ) diterbitkan dan naskah fisik diteruskan kepada Distributor untuk sidang pentashihan.' : 'Tanda terima resmi (TT-LPMQ) akan diterbitkan ke akun penerbit dan naskah siap ditugaskan kepada Verifikator oleh Admin Internal.'}
          confirmLabel="Terbitkan Tanda Terima"
          confirmVariant="primary"
          loading={actionLoading}
        />
      )}

      {selectedReg && (
        <Modal
          isOpen={returnModalOpen}
          onClose={closeReturnModal}
          title="Kembalikan Master Fisik ke Penerbit"
          description="Penerbit menerima notifikasi berisi alasan ini untuk memperbaiki atau melengkapi master fisik."
          size="md"
        >
          <form onSubmit={handleReturnSubmit} className="space-y-4">
            <div>
              <label htmlFor="return-reason" className="mb-1.5 block text-xs font-bold text-ink">
                Alasan pengembalian <span className="text-civic-danger" aria-hidden="true">*</span>
              </label>
              <textarea
                id="return-reason"
                value={returnReason}
                onChange={(e) => setReturnReason(e.target.value)}
                placeholder="Contoh: jilid yang diserahkan hanya 29 juz (kurang juz 30), mohon dilengkapi."
                rows={4}
                required
                aria-describedby="return-reason-hint"
                className={clsx(inputClass, 'focus:border-civic-danger focus:ring-civic-danger/20')}
              />
              <span id="return-reason-hint" className="text-xs text-ink-muted">Minimal 5 karakter.</span>
            </div>
            {returnModalError && (
              <Alert tone="danger" icon={AlertCircle}>
                <p>{returnModalError}</p>
              </Alert>
            )}
            <div className="flex items-center justify-end gap-2.5">
              <Button type="button" variant="outline" onClick={closeReturnModal} disabled={actionLoading}>
                Batal
              </Button>
              <Button type="submit" variant="danger" disabled={actionLoading || returnReason.trim().length < 5}>
                {actionLoading ? 'Memproses...' : 'Kembalikan Master'}
              </Button>
            </div>
          </form>
        </Modal>
      )}

      {assignDialogOpen && selectedReg && (
        <AssignVerificationDialog
          isOpen={assignDialogOpen}
          onClose={() => setAssignDialogOpen(false)}
          registration={selectedReg}
          onSuccess={async () => {
            setAssignDialogOpen(false);
            invalidateQueueCounts();
            setSuccessMessage(`Verifikator berhasil ditugaskan untuk naskah ${selectedReg.registration_no}. Disposisi telah diterbitkan.`);
            try {
              await refreshSelected();
            } catch {
              // Abaikan jika muat ulang gagal
            }
          }}
          onConflict={async () => {
            try {
              await refreshSelected();
            } catch {
              // Abaikan
            }
          }}
        />
      )}
    </div>
  );
};

export default AdminMasterIntakePage;
