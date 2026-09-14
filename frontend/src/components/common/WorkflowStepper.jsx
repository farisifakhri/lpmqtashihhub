import React from 'react';
import {
  FileEdit,
  ClipboardCheck,
  CheckCheck,
  CreditCard,
  Send,
  BookOpen,
  Award,
  PackageCheck,
  CheckCircle2,
  Clock,
  AlertTriangle,
} from 'lucide-react';
import { clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

export const WORKFLOW_STAGES = [
  {
    id: 1,
    key: 'REGISTRATION',
    name: 'Pendaftaran Naskah',
    shortName: 'Pendaftaran',
    icon: FileEdit,
    description: 'Pengajuan data naskah & kelengkapan berkas digital oleh penerbit',
    matchingStatuses: ['DRAFT', 'READY_FOR_VERIFICATION'],
  },
  {
    id: 2,
    key: 'VERIFICATION',
    name: 'Pemeriksaan Verifikator',
    shortName: 'Verifikasi',
    icon: ClipboardCheck,
    description: 'Pemeriksaan berkas administrasi & master fisik mushaf A4 per juz',
    matchingStatuses: ['VERIFICATION_ASSIGNED', 'IN_VERIFICATION'],
  },
  {
    id: 3,
    key: 'VERIFICATION_APPROVAL',
    name: 'Penetapan Hasil Verifikasi',
    shortName: 'Persetujuan',
    icon: CheckCheck,
    description: 'Persetujuan draf hasil verifikasi oleh Kepala LPMQ',
    matchingStatuses: ['WAITING_VERIFICATION_APPROVAL', 'VERIFICATION_APPROVED', 'REVISION_REQUIRED'],
  },
  {
    id: 4,
    key: 'BILLING_PNBP',
    name: 'Billing PNBP (SIMPONI)',
    shortName: 'Billing PNBP',
    icon: CreditCard,
    description: 'Penerbitan kode billing SIMPONI dan konfirmasi pelunasan tarif',
    matchingStatuses: ['AWAITING_PAYMENT', 'PAYMENT_VERIFICATION'],
  },
  {
    id: 5,
    key: 'DISTRIBUTION',
    name: 'Distribusi Sidang',
    shortName: 'Distribusi',
    icon: Send,
    description: 'Penyerahan master fisik kepada Tim Pentashih sesuai SK penugasan',
    matchingStatuses: ['WAITING_DISTRIBUTION', 'WAITING_DISTRIBUTOR_RECEIPT'],
  },
  {
    id: 6,
    key: 'TASHIH_SESSION',
    name: 'Sidang Pentashihan',
    shortName: 'Sidang Tashih',
    icon: BookOpen,
    description: 'Penelaahan rasm usmani, harakat, waqaf, dan tanda baca',
    matchingStatuses: ['TASHIH_IN_PROGRESS'],
  },
  {
    id: 7,
    key: 'STT_ISSUANCE',
    name: 'Penetapan Surat Tanda Tashih',
    shortName: 'Surat Tashih',
    icon: Award,
    description: 'Pengesahan dan penandatanganan elektronik dokumen STT resmi',
    matchingStatuses: ['READY_FOR_STT', 'STT_ISSUED'],
  },
  {
    id: 8,
    key: 'COMPLETION',
    name: 'Dokumentasi & Selesai',
    shortName: 'Selesai',
    icon: PackageCheck,
    description: 'Penyimpanan arsip master fisik dan penyerahan STT kepada penerbit',
    matchingStatuses: ['DOCUMENTATION', 'DOCUMENTATION_IN_PROGRESS', 'COMPLETED'],
  },
];

/**
 * Mendapatkan indeks tahapan aktif (1-based) dari status registrasi
 */
export const getActiveStageIndex = (status) => {
  if (!status) return 1;
  const stage = WORKFLOW_STAGES.find((s) => s.matchingStatuses.includes(status));
  return stage ? stage.id : 1;
};

export const WorkflowStepper = ({
  currentStatus,
  currentStageId,
  className,
  compact = false,
}) => {
  const activeStage = currentStageId || getActiveStageIndex(currentStatus);
  const isRevision = currentStatus === 'REVISION_REQUIRED';

  return (
    <div className={twMerge('bg-white rounded-2xl border border-slate-200/90 shadow-xs p-5 sm:p-6 overflow-hidden', className)}>
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-4 mb-4 border-b border-slate-100">
        <div>
          <h4 className="text-xs font-bold uppercase tracking-wider text-slate-800 flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-emerald-600 animate-pulse" />
            <span>Alur Proses & Siklus Layanan Pentashihan (SOP LPMQ)</span>
          </h4>
          <p className="text-xs text-slate-500 mt-0.5">
            Tahap <span className="font-bold text-emerald-800">{activeStage}</span> dari 8 —{' '}
            <span className="font-semibold text-slate-700">
              {WORKFLOW_STAGES.find((s) => s.id === activeStage)?.name}
            </span>
          </p>
        </div>

        {isRevision && (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-amber-50 text-amber-800 border border-amber-300">
            <AlertTriangle className="w-3.5 h-3.5 text-amber-600" />
            Status: Perlu Revisi Penerbit
          </span>
        )}
      </div>

      {/* Stepper Track */}
      <div className="relative">
        <div className="overflow-x-auto pb-3 pt-1 scrollbar-thin">
          <div className="flex items-start justify-between min-w-[720px] relative">
            {/* Background connecting bar */}
            <div className="absolute top-5 left-6 right-6 h-0.5 bg-slate-200 -z-0 pointer-events-none" />

            {/* Progress line filled */}
            <div
              className="absolute top-5 left-6 h-0.5 bg-gradient-to-r from-emerald-600 via-emerald-700 to-gold-500 -z-0 transition-all duration-500"
              style={{
                width: `${Math.max(0, Math.min(100, ((activeStage - 1) / (WORKFLOW_STAGES.length - 1)) * 100))}%`,
              }}
            />

            {WORKFLOW_STAGES.map((stage) => {
              const Icon = stage.icon;
              const isPast = stage.id < activeStage;
              const isCurrent = stage.id === activeStage;
              const isFuture = stage.id > activeStage;

              return (
                <div
                  key={stage.id}
                  className="flex flex-col items-center text-center relative z-10 group px-1 flex-1 min-w-[85px]"
                >
                  {/* Circle Node */}
                  <div
                    className={clsx(
                      'w-10 h-10 rounded-full flex items-center justify-center text-xs font-bold transition-all duration-200 select-none shadow-2xs',
                      isPast &&
                        'bg-emerald-700 text-white shadow-emerald-950/20 border-2 border-emerald-700 hover:scale-105',
                      isCurrent &&
                        'bg-gradient-to-br from-primary-800 via-primary-700 to-emerald-600 text-white ring-4 ring-gold-400/40 border-2 border-gold-400 shadow-md shadow-emerald-900/30 scale-110',
                      isFuture &&
                        'bg-white text-slate-400 border-2 border-slate-300 group-hover:border-slate-400 group-hover:text-slate-600'
                    )}
                  >
                    {isPast ? (
                      <CheckCircle2 className="w-5 h-5 text-white" />
                    ) : isCurrent ? (
                      <Icon className="w-5 h-5 text-gold-300 animate-pulse" />
                    ) : (
                      <span>{stage.id}</span>
                    )}
                  </div>

                  {/* Stage Label */}
                  <div className="mt-2.5 space-y-0.5 max-w-[100px]">
                    <p
                      className={clsx(
                        'text-[11px] leading-tight font-semibold transition-colors',
                        isPast && 'text-slate-700',
                        isCurrent && 'text-primary-900 font-bold',
                        isFuture && 'text-slate-400'
                      )}
                    >
                      {compact ? stage.shortName : stage.name}
                    </p>
                    {isCurrent && (
                      <span className="inline-block text-[10px] font-bold text-gold-600 bg-gold-50 border border-gold-300/80 px-1.5 py-0.2 rounded-full uppercase tracking-tighter">
                        Sedang Berjalan
                      </span>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
};

export default WorkflowStepper;

