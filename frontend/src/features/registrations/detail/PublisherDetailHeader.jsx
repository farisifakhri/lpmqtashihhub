import React, { useState, useMemo } from 'react';
import {
  Printer,
  RefreshCw,
  Trash2,
  XCircle,
  ChevronDown,
  ChevronUp,
  Download,
  CheckCircle2,
  Clock,
  CreditCard,
  Award,
  BookOpen,
  FileText,
  PackageCheck,
  AlertTriangle,
} from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { StatusBadge } from '@/components/ui/StatusBadge';
import { PublisherProgress } from '../PublisherProgress';
import { WorkflowPhaseStatus } from '@/components/common/WorkflowPhaseStatus';
import { dateLabel } from '../publisher-status';

export function PublisherDetailHeader({
  data,
  busy,
  actionLoading,
  setRefresh,
  setShowReceipt,
  setShowShippingLabel,
  setShowDeleteModal,
  setShowCancelModal,
}) {
  const [showPhaseDetails, setShowPhaseDetails] = useState(false);

  // Dynamic 5-Milestone Alur Pentashihan (Permohonan -> Verifikasi & Fisik -> Pembayaran PNBP -> Sidang Tashih -> STT)
  const phases = useMemo(() => {
    if (!data) return [];
    const s = data.status;
    const isPhysicalReceived =
      data.physical_master_intake?.status === 'RECEIVED' ||
      data.physical_master?.status === 'RECEIVED';
    const isDispatched = data.physical_dispatch_status === 'DISPATCHED';
    const isTashihRevision =
      s === 'REVISION_REQUIRED' &&
      Array.isArray(data.assignments) &&
      data.assignments.length > 0;
    const isVerificationRevision = s === 'REVISION_REQUIRED' && !isTashihRevision;

    // 1. Permohonan
    const p1 = {
      id: 1,
      name: '1. Permohonan',
      icon: FileText,
      state: s === 'DRAFT' ? 'CURRENT' : 'DONE',
      statusText: s === 'DRAFT' ? 'Draf Belum Diajukan' : 'Permohonan Terdaftar',
      desc: s === 'DRAFT' ? 'Lengkapi data & sampel digital' : `Diajukan ${dateLabel(data.created_at)}`,
    };

    // 2. Verifikasi & Fisik
    const p2Done = [
      'AWAITING_PAYMENT',
      'PAYMENT_VERIFICATION',
      'WAITING_DISTRIBUTOR_RECEIPT',
      'PHYSICAL_HANDOVER_CORRECTION_REQUIRED',
      'WAITING_DISTRIBUTION',
      'TASHIH_IN_PROGRESS',
      'READY_FOR_STT',
      'STT_ISSUED',
      'DOCUMENTATION',
      'DOCUMENTATION_IN_PROGRESS',
      'COMPLETED',
    ].includes(s) || isTashihRevision;

    const p2Active = [
      'READY_FOR_VERIFICATION',
      'VERIFICATION_ASSIGNED',
      'IN_VERIFICATION',
      'WAITING_VERIFICATION_APPROVAL',
      'VERIFICATION_APPROVED',
    ].includes(s) || isVerificationRevision;

    let p2StatusText = 'Menunggu Pengajuan';
    let p2Desc = 'Master fisik A4 & berkas digital';
    if (p2Done) {
      p2StatusText = 'Lolos Verifikasi';
      p2Desc = 'Administrasi & fisik dinyatakan sah';
    } else if (isVerificationRevision) {
      p2StatusText = 'Perlu Perbaikan';
      p2Desc = 'Periksa catatan verifikator loket';
    } else if (p2Active) {
      if (isPhysicalReceived) {
        p2StatusText = 'Sedang Ditelaah';
        p2Desc = 'Master fisik diterima di loket LPMQ';
      } else if (isDispatched) {
        p2StatusText = 'Fisik Dikirim';
        p2Desc = 'Dalam pengiriman menuju loket LPMQ';
      } else {
        p2StatusText = 'Kirim Master Fisik';
        p2Desc = 'Kirim berkas fisik A4 per juz ke loket';
      }
    }

    const p2 = {
      id: 2,
      name: '2. Verifikasi & Fisik',
      icon: PackageCheck,
      state: p2Done ? 'DONE' : isVerificationRevision ? 'REVISION' : p2Active ? 'CURRENT' : 'WAITING',
      statusText: p2StatusText,
      desc: p2Desc,
    };

    // 3. Pembayaran PNBP
    const p3Done = [
      'WAITING_DISTRIBUTOR_RECEIPT',
      'PHYSICAL_HANDOVER_CORRECTION_REQUIRED',
      'WAITING_DISTRIBUTION',
      'TASHIH_IN_PROGRESS',
      'READY_FOR_STT',
      'STT_ISSUED',
      'DOCUMENTATION',
      'DOCUMENTATION_IN_PROGRESS',
      'COMPLETED',
    ].includes(s) || isTashihRevision;

    const p3Active = ['AWAITING_PAYMENT', 'PAYMENT_VERIFICATION'].includes(s);

    let p3StatusText = 'Menunggu Verifikasi';
    let p3Desc = 'Billing SIMPONI Kemenag RI';
    if (p3Done) {
      p3StatusText = 'PNBP Lunas';
      p3Desc = 'Setoran NTPN terverifikasi sah';
    } else if (s === 'PAYMENT_VERIFICATION') {
      p3StatusText = 'Validasi Pembayaran';
      p3Desc = 'Bukti bayar sedang diverifikasi tim';
    } else if (s === 'AWAITING_PAYMENT') {
      p3StatusText = 'Menunggu Bayar';
      p3Desc = 'Kode billing SIMPONI aktif (7 hari)';
    }

    const p3 = {
      id: 3,
      name: '3. Pembayaran PNBP',
      icon: CreditCard,
      state: p3Done ? 'DONE' : p3Active ? 'CURRENT' : 'WAITING',
      statusText: p3StatusText,
      desc: p3Desc,
    };

    // 4. Sidang Pentashihan
    const p4Done = ['READY_FOR_STT', 'STT_ISSUED', 'DOCUMENTATION', 'DOCUMENTATION_IN_PROGRESS', 'COMPLETED'].includes(s);
    const p4Active = [
      'WAITING_DISTRIBUTOR_RECEIPT',
      'PHYSICAL_HANDOVER_CORRECTION_REQUIRED',
      'WAITING_DISTRIBUTION',
      'TASHIH_IN_PROGRESS',
    ].includes(s) || isTashihRevision;

    let p4StatusText = 'Menunggu PNBP';
    let p4Desc = 'Telaah rasm usmani & tanda waqaf';
    if (p4Done) {
      p4StatusText = 'Sidang Lolos';
      p4Desc = 'Telaah pentashih tuntas & disetujui';
    } else if (isTashihRevision) {
      p4StatusText = 'Koreksi Sidang';
      p4Desc = 'Tindak lanjuti catatan rasm / waqaf';
    } else if (s === 'TASHIH_IN_PROGRESS') {
      p4StatusText = 'Sidang Aktif';
      p4Desc = 'Naskah ditelaah tim pentashih';
    } else if (s === 'WAITING_DISTRIBUTION') {
      p4StatusText = 'Antrean Tim';
      p4Desc = 'Penetapan SK tim pentashihan';
    } else if (['WAITING_DISTRIBUTOR_RECEIPT', 'PHYSICAL_HANDOVER_CORRECTION_REQUIRED'].includes(s)) {
      p4StatusText = 'Serah Terima Fisik';
      p4Desc = 'Distribusi master fisik ke tim';
    }

    const p4 = {
      id: 4,
      name: '4. Sidang Pentashihan',
      icon: BookOpen,
      state: p4Done ? 'DONE' : isTashihRevision ? 'REVISION' : p4Active ? 'CURRENT' : 'WAITING',
      statusText: p4StatusText,
      desc: p4Desc,
    };

    // 5. Surat Tanda Tashih
    const p5Done = ['STT_ISSUED', 'COMPLETED'].includes(s);
    const p5Active = ['READY_FOR_STT', 'DOCUMENTATION_IN_PROGRESS', 'DOCUMENTATION'].includes(s);

    let p5StatusText = 'Menunggu Sidang';
    let p5Desc = 'Pengesahan dokumen resmi STT';
    if (p5Done) {
      p5StatusText = 'STT Sah Terbit';
      p5Desc = 'Dokumen ber-QR siap diunduh';
    } else if (p5Active) {
      p5StatusText = 'Penetapan STT';
      p5Desc = 'Penyusunan berita acara & tanda tashih';
    }

    const p5 = {
      id: 5,
      name: '5. Surat Tanda Tashih',
      icon: Award,
      state: p5Done ? 'DONE' : p5Active ? 'CURRENT' : 'WAITING',
      statusText: p5StatusText,
      desc: p5Desc,
    };

    return [p1, p2, p3, p4, p5];
  }, [data]);

  return (
    <header className="rounded-xl border border-line bg-surface p-5 sm:p-6 space-y-5 shadow-2xs">
      {/* 1. Top Bar: Identitas Nomor, Tanggal, Status Badge & Action Toolbar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-line">
        <div className="flex flex-wrap items-center gap-2.5">
          <span className="font-mono text-xs font-bold text-brand-900 bg-brand-50 border border-brand-200/80 px-2.5 py-1 rounded-md">
            {data.registration_no}
          </span>
          <span className="text-xs text-ink-muted">
            Didaftarkan pada {dateLabel(data.created_at)}
          </span>
          <StatusBadge registration={data} />
        </div>

        {/* Action Buttons Toolbar */}
        <div className="flex flex-wrap items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setShowReceipt(true)}
            className="text-xs font-bold text-ink hover:text-brand-800"
          >
            <Printer className="h-3.5 w-3.5 mr-1 text-brand-700" />
            Cetak Bukti Pendaftaran
          </Button>

          {setShowShippingLabel && data.status !== 'DRAFT' && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowShippingLabel(true)}
              className="text-xs font-bold text-brand-800 border-brand-200 hover:bg-brand-50"
            >
              <Download className="h-3.5 w-3.5 mr-1 text-brand-700" />
              Unduh Label Pengiriman
            </Button>
          )}

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

      {/* 2. Middle Row: Title & Metadata (Full Width!) */}
      <div className="space-y-2.5">
        <h1 className="text-xl sm:text-2xl lg:text-3xl font-black text-ink break-words tracking-tight">
          {data.title}
        </h1>

        <div className="flex flex-wrap items-center gap-2 text-xs text-ink-muted pt-0.5">
          <span className="inline-flex items-center px-2.5 py-1 rounded-md bg-surface-subtle text-ink font-semibold border border-line text-xs">
            Layanan: <strong className="ml-1 text-ink">{data.service_type?.name}</strong>
          </span>

          {data.foreign_metadata?.nama_mushaf && (
            <span className="inline-flex items-center px-2.5 py-1 rounded-md bg-surface-subtle text-ink font-semibold border border-line text-xs">
              Mushaf: <span className="ml-1 text-brand-800 font-bold">{data.foreign_metadata.nama_mushaf}</span>
            </span>
          )}

          {data.foreign_metadata?.jenis_mushaf && (
            <span className="inline-flex items-center px-2.5 py-1 rounded-md bg-brand-50 text-brand-800 font-bold border border-brand-200 text-xs">
              {data.foreign_metadata.jenis_mushaf}
            </span>
          )}

          {data.foreign_metadata?.nama_percetakan && (
            <span className="inline-flex items-center px-2.5 py-1 rounded-md bg-surface-subtle text-ink-muted border border-line text-xs">
              Percetakan: <span className="ml-1 text-ink font-medium">{data.foreign_metadata.nama_percetakan}</span>
            </span>
          )}

          {data.foreign_metadata?.penanggung_jawab_produk && (
            <span className="inline-flex items-center px-2.5 py-1 rounded-md bg-surface-subtle text-ink-muted border border-line text-xs">
              PJ: <span className="ml-1 text-ink font-semibold">{data.foreign_metadata.penanggung_jawab_produk}</span>
              {data.foreign_metadata?.penanggung_jawab_wa && (
                <span className="ml-1 font-mono text-xs text-brand-800">({data.foreign_metadata.penanggung_jawab_wa})</span>
              )}
            </span>
          )}
        </div>

        {(data.foreign_metadata?.negara_asal_mushaf || data.foreign_metadata?.country_of_origin) && (
          <div className="pt-1 flex flex-wrap gap-x-3 gap-y-1 text-xs text-ink-muted">
            <span className="inline-flex items-center px-2.5 py-0.5 rounded bg-civic-infoSoft text-civic-info font-semibold border border-civic-infoLine text-xs">
              Mushaf Luar Negeri: {data.foreign_metadata.negara_asal_mushaf || data.foreign_metadata.country_of_origin}
            </span>
            {(data.foreign_metadata.penerbit_asal_mushaf || data.foreign_metadata.foreign_publisher_name) && (
              <span className="text-ink-muted text-xs">
                Penerbit Asal: <strong className="text-ink">{data.foreign_metadata.penerbit_asal_mushaf || data.foreign_metadata.foreign_publisher_name}</strong>
              </span>
            )}
            {(data.foreign_metadata.lembaga_pentashih_asal_mushaf || data.foreign_metadata.foreign_tashih_institution) && (
              <span className="text-ink-muted text-xs">
                Lembaga Pentashih: <strong className="text-ink">{data.foreign_metadata.lembaga_pentashih_asal_mushaf || data.foreign_metadata.foreign_tashih_institution}</strong>
              </span>
            )}
          </div>
        )}
      </div>

      {/* 3. Dynamic Workflow Stepper & 5-Phase Pipeline (REV-13 Dinamis) */}
      <div className="pt-4 border-t border-line space-y-4">
        {/* Progress bar overview */}
        <PublisherProgress registration={data} />

        {/* 5 Dynamic Pipeline Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
          {phases.map((phase) => {
            const isDone = phase.state === 'DONE';
            const isCurrent = phase.state === 'CURRENT';
            const isRevision = phase.state === 'REVISION';

            return (
              <div
                key={phase.id}
                className={`p-3.5 rounded-xl border flex flex-col justify-between transition-all ${
                  isDone
                    ? 'border-brand-200 bg-brand-50/70 shadow-2xs'
                    : isCurrent
                    ? 'border-brand-700 bg-white shadow-xs ring-2 ring-brand-700/15'
                    : isRevision
                    ? 'border-civic-danger bg-civic-dangerSoft/80 shadow-xs'
                    : 'border-line bg-surface-subtle/50 text-ink-muted'
                }`}
              >
                <div>
                  <div className="flex items-center justify-between gap-2 mb-2">
                    <span className="text-xs font-bold text-ink truncate">
                      {phase.name}
                    </span>
                    <div
                      className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold shrink-0 ${
                        isDone
                          ? 'bg-brand-700 text-white shadow-2xs'
                          : isCurrent
                          ? 'bg-brand-800 text-white shadow-2xs'
                          : isRevision
                          ? 'bg-civic-danger text-white'
                          : 'bg-surface-strong text-ink-muted'
                      }`}
                    >
                      {isDone ? '✓' : phase.id}
                    </div>
                  </div>

                  <p
                    className={`text-xs font-bold truncate ${
                      isDone
                        ? 'text-brand-900'
                        : isCurrent
                        ? 'text-brand-800'
                        : isRevision
                        ? 'text-civic-danger font-extrabold'
                        : 'text-ink-muted'
                    }`}
                  >
                    {phase.statusText}
                  </p>
                </div>

                <p className="text-[11px] text-ink-muted mt-2 line-clamp-2 leading-relaxed">
                  {phase.desc}
                </p>
              </div>
            );
          })}
        </div>

        {/* Phase Details Toggle */}
        <div className="flex justify-end pt-1">
          <button
            type="button"
            onClick={() => setShowPhaseDetails(!showPhaseDetails)}
            className="text-xs font-semibold text-brand-800 hover:text-brand-900 inline-flex items-center gap-1 transition-colors cursor-pointer"
          >
            {showPhaseDetails ? (
              <>
                Sembunyikan Rincian Teknis Alur <ChevronUp className="w-3.5 h-3.5" />
              </>
            ) : (
              <>
                Lihat Rincian Teknis Alur & SOP <ChevronDown className="w-3.5 h-3.5" />
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
  );
}

export default PublisherDetailHeader;
