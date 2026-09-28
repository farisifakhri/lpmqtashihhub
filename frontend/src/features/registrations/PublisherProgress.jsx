import React from 'react';
import { RefreshCw, CheckCircle2, Clock, AlertTriangle, Send } from 'lucide-react';

const STAGE_STEPS = [
  { key: 'DRAFT', label: 'Permohonan', percent: 15, color: 'bg-line-strong', text: 'text-ink' },
  { key: 'DISPATCH', label: 'Kirim Berkas ke LPMQ', percent: 30, color: 'bg-civic-warning', text: 'text-civic-warning' },
  { key: 'VERIFICATION', label: 'Sedang Diverifikasi', percent: 45, color: 'bg-civic-info', text: 'text-civic-info' },
  { key: 'PAYMENT', label: 'Pembayaran', percent: 60, color: 'bg-civic-info', text: 'text-civic-info' },
  { key: 'TASHIH', label: 'Sedang Proses Tashih', percent: 75, color: 'bg-civic-info', text: 'text-civic-info' },
  { key: 'STT', label: 'STT Terbit', percent: 90, color: 'bg-brand-700', text: 'text-brand-800' },
  { key: 'COMPLETED', label: 'Selesai', percent: 100, color: 'bg-brand-700', text: 'text-brand-900' },
];

export function getDetailedStage(registration) {
  const status = registration.status;
  const dispatchStatus = registration.physical_dispatch_status;

  if (status === 'DRAFT') {
    return {
      index: 0,
      label: 'Draf Permohonan',
      percent: 15,
      color: 'bg-line-strong',
      badgeClass: 'bg-surface-subtle text-ink border-line',
      description: 'Lengkapi dokumen awal dan sampel naskah',
    };
  }

  if (status === 'READY_FOR_VERIFICATION') {
    if (dispatchStatus === 'DISPATCHED') {
      return {
        index: 2,
        label: 'Sedang Diverifikasi',
        percent: 45,
        color: 'bg-civic-info',
        badgeClass: 'bg-civic-infoSoft text-civic-info border-civic-infoLine',
        description: 'Berkas fisik terkirim; verifikator memeriksa kelengkapan',
      };
    }
    return {
      index: 1,
      label: 'Kirim Berkas ke LPMQ',
      percent: 30,
      color: 'bg-civic-warning',
      badgeClass: 'bg-civic-warningSoft text-civic-warning border-civic-warningLine',
      description: 'Menunggu pengiriman naskah master fisik A4 ke loket LPMQ',
    };
  }

  if (['VERIFICATION_ASSIGNED', 'IN_VERIFICATION', 'WAITING_VERIFICATION_APPROVAL', 'VERIFICATION_APPROVED'].includes(status)) {
    return {
      index: 2,
      label: 'Sedang Diverifikasi',
      percent: 45,
      color: 'bg-civic-info',
      badgeClass: 'bg-civic-infoSoft text-civic-info border-civic-infoLine',
      description: 'Pemeriksaan administrasi dan naskah fisik oleh verifikator',
    };
  }

  if (status === 'REVISION_REQUIRED') {
    const isPhysicalReturn =
      registration.revision_source === 'PHYSICAL_MASTER' ||
      registration.physical_master_intake?.status === 'RETURNED';
    const isTashihRevision = Array.isArray(registration.assignments) && registration.assignments.length > 0;

    if (isPhysicalReturn) {
      return {
        index: 1,
        label: 'Perlu Perbaikan Master Fisik',
        percent: 35,
        color: 'bg-civic-danger',
        badgeClass: 'bg-civic-dangerSoft text-civic-danger border-civic-dangerLine',
        description: 'Master fisik dikembalikan loket; serahkan perbaikan jilid naskah ke Loket LPMQ',
        isLoop: false,
      };
    }

    return {
      index: isTashihRevision ? 4 : 2,
      label: 'Dalam Proses Perbaikan',
      percent: isTashihRevision ? 70 : 40,
      color: 'bg-civic-warning',
      badgeClass: 'bg-civic-warningSoft text-civic-warning border-civic-warningLine',
      description: isTashihRevision ? 'Catatan perbaikan sidang tashih (siklus perbaikan ⇄ pentashihan)' : 'Perlu revisi berkas administrasi verifikasi',
      isLoop: isTashihRevision,
    };
  }

  if (['AWAITING_PAYMENT', 'PAYMENT_VERIFICATION'].includes(status)) {
    return {
      index: 3,
      label: 'Pembayaran PNBP',
      percent: 60,
      color: 'bg-civic-info',
      badgeClass: 'bg-civic-infoSoft text-civic-info border-civic-infoLine',
      description: 'Penerbitan kode billing SIMPONI dan konfirmasi pembayaran',
    };
  }

  if (['WAITING_DISTRIBUTOR_RECEIPT', 'WAITING_DISTRIBUTION', 'TASHIH_IN_PROGRESS'].includes(status)) {
    return {
      index: 4,
      label: 'Sedang Proses Tashih',
      percent: 75,
      color: 'bg-civic-info',
      badgeClass: 'bg-civic-infoSoft text-civic-info border-civic-infoLine',
      description: 'Sidang pentashihan naskah oleh tim pentashih (dapat berulang jika ada koreksi)',
      isLoop: true,
    };
  }

  if (['READY_FOR_STT', 'STT_ISSUED', 'DOCUMENTATION_IN_PROGRESS'].includes(status)) {
    return {
      index: 5,
      label: 'STT Terbit',
      percent: 90,
      color: 'bg-brand-700',
      badgeClass: 'bg-brand-50 text-brand-900 border-brand-100',
      description: 'Surat Tanda Tashih (STT) resmi telah diterbitkan Kepala LPMQ',
    };
  }

  if (status === 'COMPLETED') {
    return {
      index: 6,
      label: 'Selesai',
      percent: 100,
      color: 'bg-brand-700',
      badgeClass: 'bg-brand-100 text-brand-950 border-brand-700',
      description: 'Seluruh tahapan pentashihan dan dokumentasi tuntas',
    };
  }

  if (status === 'CANCELLED') {
    return {
      index: -1,
      label: 'Dibatalkan',
      percent: 0,
      color: 'bg-civic-danger',
      badgeClass: 'bg-civic-dangerSoft text-civic-danger border-civic-dangerLine',
      description: 'Permohonan dibatalkan',
    };
  }

  return {
    index: 0,
    label: 'Diproses',
    percent: 20,
    color: 'bg-line-strong',
    badgeClass: 'bg-surface-subtle text-ink border-line',
    description: 'Tahapan proses sedang berjalan',
  };
}

export function PublisherProgress({ registration }) {
  if (!registration) return null;

  const stage = getDetailedStage(registration);

  if (stage.index === -1) {
    return (
      <div className="flex items-center gap-2 text-xs font-semibold text-civic-danger bg-civic-dangerSoft px-3 py-1.5 rounded-lg border border-civic-dangerLine">
        <span>Permohonan dibatalkan.</span>
      </div>
    );
  }

  return (
    <div className="space-y-2.5" aria-label={`Progres naskah: ${stage.label} (${stage.percent}%)`}>
      {/* Header baris status dan badge persentase */}
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <span className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-md text-xs font-bold border shadow-2xs ${stage.badgeClass}`}>
            {stage.isLoop && <RefreshCw className="w-3 h-3 animate-spin text-current" style={{ animationDuration: '6s' }} />}
            <span>{stage.label}</span>
          </span>
          {stage.isLoop && (
            <span className="text-[10px] text-ink-muted font-medium hidden sm:inline">
              (Proses Tashih ⇄ Perbaikan)
            </span>
          )}
        </div>

        {/* Indikator Persentase Resmi */}
        <div className="flex items-center gap-1.5 font-mono text-xs font-bold text-ink bg-surface-subtle px-2 py-0.5 rounded border border-line">
          <span className="text-[10px] text-ink-muted uppercase">Progres</span>
          <span className="text-ink">{stage.percent}%</span>
        </div>
      </div>

      {/* Progress Multi-segment Bar */}
      <div className="relative w-full bg-surface-subtle rounded-full h-2 overflow-hidden border border-line">
        <div
          className={`h-full transition-all duration-500 rounded-full ${stage.color}`}
          style={{ width: `${stage.percent}%` }}
        />
      </div>

      {/* Rincian Keterangan Tahapan */}
      <div className="flex items-center justify-between text-[11px] text-ink-muted">
        <span className="truncate pr-2">{stage.description}</span>
        <span className="shrink-0 font-medium">Langkah {stage.index + 1} dari 7</span>
      </div>
    </div>
  );
}

export default PublisherProgress;
