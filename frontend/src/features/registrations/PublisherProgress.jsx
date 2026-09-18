import React from 'react';
import { RefreshCw, CheckCircle2, Clock, AlertTriangle, Send } from 'lucide-react';

const STAGE_STEPS = [
  { key: 'DRAFT', label: 'Permohonan', percent: 15, color: 'bg-slate-500', text: 'text-slate-700' },
  { key: 'DISPATCH', label: 'Kirim Berkas ke LPMQ', percent: 30, color: 'bg-amber-500', text: 'text-amber-800' },
  { key: 'VERIFICATION', label: 'Sedang Diverifikasi', percent: 45, color: 'bg-sky-500', text: 'text-sky-800' },
  { key: 'PAYMENT', label: 'Pembayaran', percent: 60, color: 'bg-indigo-500', text: 'text-indigo-800' },
  { key: 'TASHIH', label: 'Sedang Proses Tashih', percent: 75, color: 'bg-blue-600', text: 'text-blue-800' },
  { key: 'STT', label: 'STT Terbit', percent: 90, color: 'bg-emerald-600', text: 'text-emerald-800' },
  { key: 'COMPLETED', label: 'Selesai', percent: 100, color: 'bg-emerald-700', text: 'text-emerald-900' },
];

export function getDetailedStage(registration) {
  const status = registration.status;
  const dispatchStatus = registration.physical_dispatch_status;

  if (status === 'DRAFT') {
    return {
      index: 0,
      label: 'Draf Permohonan',
      percent: 15,
      color: 'bg-slate-400',
      badgeClass: 'bg-slate-100 text-slate-700 border-slate-200',
      description: 'Lengkapi dokumen awal dan sampel naskah',
    };
  }

  if (status === 'READY_FOR_VERIFICATION') {
    if (dispatchStatus === 'DISPATCHED') {
      return {
        index: 2,
        label: 'Sedang Diverifikasi',
        percent: 45,
        color: 'bg-sky-500',
        badgeClass: 'bg-sky-50 text-sky-800 border-sky-200',
        description: 'Berkas fisik terkirim; verifikator memeriksa kelengkapan',
      };
    }
    return {
      index: 1,
      label: 'Kirim Berkas ke LPMQ',
      percent: 30,
      color: 'bg-amber-500',
      badgeClass: 'bg-amber-50 text-amber-900 border-amber-300',
      description: 'Menunggu pengiriman naskah master fisik A4 ke loket LPMQ',
    };
  }

  if (['VERIFICATION_ASSIGNED', 'IN_VERIFICATION', 'WAITING_VERIFICATION_APPROVAL', 'VERIFICATION_APPROVED'].includes(status)) {
    return {
      index: 2,
      label: 'Sedang Diverifikasi',
      percent: 45,
      color: 'bg-sky-500',
      badgeClass: 'bg-sky-50 text-sky-800 border-sky-200',
      description: 'Pemeriksaan administrasi dan naskah fisik oleh verifikator',
    };
  }

  if (status === 'REVISION_REQUIRED') {
    const isTashihRevision = Array.isArray(registration.assignments) && registration.assignments.length > 0;
    return {
      index: isTashihRevision ? 4 : 2,
      label: 'Dalam Proses Perbaikan',
      percent: isTashihRevision ? 70 : 40,
      color: 'bg-amber-500',
      badgeClass: 'bg-amber-50 text-amber-900 border-amber-300',
      description: isTashihRevision ? 'Catatan perbaikan sidang tashih (siklus perbaikan ⇄ pentashihan)' : 'Perlu revisi berkas administrasi verifikasi',
      isLoop: isTashihRevision,
    };
  }

  if (['AWAITING_PAYMENT', 'PAYMENT_VERIFICATION'].includes(status)) {
    return {
      index: 3,
      label: 'Pembayaran PNBP',
      percent: 60,
      color: 'bg-indigo-500',
      badgeClass: 'bg-indigo-50 text-indigo-900 border-indigo-200',
      description: 'Penerbitan kode billing SIMPONI dan konfirmasi pembayaran',
    };
  }

  if (['WAITING_DISTRIBUTOR_RECEIPT', 'WAITING_DISTRIBUTION', 'TASHIH_IN_PROGRESS'].includes(status)) {
    return {
      index: 4,
      label: 'Sedang Proses Tashih',
      percent: 75,
      color: 'bg-blue-600',
      badgeClass: 'bg-blue-50 text-blue-900 border-blue-200',
      description: 'Sidang pentashihan naskah oleh tim pentashih (dapat berulang jika ada koreksi)',
      isLoop: true,
    };
  }

  if (['READY_FOR_STT', 'STT_ISSUED', 'DOCUMENTATION_IN_PROGRESS'].includes(status)) {
    return {
      index: 5,
      label: 'STT Terbit',
      percent: 90,
      color: 'bg-emerald-600',
      badgeClass: 'bg-emerald-50 text-emerald-900 border-emerald-300',
      description: 'Surat Tanda Tashih (STT) resmi telah diterbitkan Kepala LPMQ',
    };
  }

  if (status === 'COMPLETED') {
    return {
      index: 6,
      label: 'Selesai',
      percent: 100,
      color: 'bg-emerald-700',
      badgeClass: 'bg-emerald-100 text-emerald-950 border-emerald-400',
      description: 'Seluruh tahapan pentashihan dan dokumentasi tuntas',
    };
  }

  if (status === 'CANCELLED') {
    return {
      index: -1,
      label: 'Dibatalkan',
      percent: 0,
      color: 'bg-rose-500',
      badgeClass: 'bg-rose-50 text-rose-800 border-rose-200',
      description: 'Permohonan dibatalkan',
    };
  }

  return {
    index: 0,
    label: 'Diproses',
    percent: 20,
    color: 'bg-slate-400',
    badgeClass: 'bg-slate-100 text-slate-700 border-slate-200',
    description: 'Tahapan proses sedang berjalan',
  };
}

export function PublisherProgress({ registration }) {
  if (!registration) return null;

  const stage = getDetailedStage(registration);

  if (stage.index === -1) {
    return (
      <div className="flex items-center gap-2 text-xs font-semibold text-rose-700 bg-rose-50 px-3 py-1.5 rounded-lg border border-rose-200">
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
            <span className="text-[10px] text-slate-500 font-medium hidden sm:inline">
              (Proses Tashih ⇄ Perbaikan)
            </span>
          )}
        </div>

        {/* Indikator Persentase Resmi */}
        <div className="flex items-center gap-1.5 font-mono text-xs font-bold text-slate-700 bg-slate-100 px-2 py-0.5 rounded border border-slate-200">
          <span className="text-[10px] text-slate-500 uppercase">Progres</span>
          <span className="text-slate-900">{stage.percent}%</span>
        </div>
      </div>

      {/* Progress Multi-segment Bar */}
      <div className="relative w-full bg-slate-100 rounded-full h-2 overflow-hidden border border-slate-200">
        <div
          className={`h-full transition-all duration-500 rounded-full ${stage.color}`}
          style={{ width: `${stage.percent}%` }}
        />
      </div>

      {/* Rincian Keterangan Tahapan */}
      <div className="flex items-center justify-between text-[11px] text-slate-500">
        <span className="truncate pr-2">{stage.description}</span>
        <span className="shrink-0 font-medium">Langkah {stage.index + 1} dari 7</span>
      </div>
    </div>
  );
}

export default PublisherProgress;
