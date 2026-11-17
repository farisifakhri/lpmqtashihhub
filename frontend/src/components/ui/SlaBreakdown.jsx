import React from 'react';
import { Clock, AlertCircle } from 'lucide-react';
import { clsx } from 'clsx';

/**
 * Komponen SlaBreakdown (B-21 & B-23)
 * Menampilkan rincian SLA per tahap (Verifikasi, Naskah Awal, Perbaikan, Dumi)
 * tanpa fallback angka hardcoded (seperti 59).
 */
export const SlaBreakdown = ({
  snapshot = null,
  status = '',
  activeDueAt = null,
  compact = false,
  className = '',
}) => {
  const isVerificationStage = [
    'READY_FOR_VERIFICATION',
    'VERIFICATION_ASSIGNED',
    'IN_VERIFICATION',
    'REVISION_REQUIRED',
    'WAITING_VERIFICATION_APPROVAL',
  ].includes(status);

  const initialDays = snapshot?.sla_initial_days;
  const revisionDays = snapshot?.sla_revision_days;
  const dummyDays = snapshot?.sla_dummy_days;
  const hasPentashihanSla = Boolean(initialDays && initialDays > 0);

  if (compact) {
    if (isVerificationStage || !hasPentashihanSla) {
      return (
        <span
          className={clsx(
            'inline-flex items-center gap-1 text-[11px] font-semibold text-brand-900 bg-brand-50 border border-brand-200 px-2 py-0.5 rounded-md shadow-2xs',
            className
          )}
          title="Estimasi SLA pentashihan ditetapkan setelah verifikasi naskah fisik"
        >
          <Clock className="w-3 h-3 text-brand-700 shrink-0" aria-hidden="true" />
          <span>Verifikasi: maks. 2 HK</span>
        </span>
      );
    }

    return (
      <span
        className={clsx(
          'inline-flex items-center gap-1 text-[11px] font-semibold text-brand-900 bg-brand-50 border border-brand-200 px-2 py-0.5 rounded-md shadow-2xs',
          className
        )}
      >
        <Clock className="w-3 h-3 text-brand-700 shrink-0" aria-hidden="true" />
        <span>SLA Awal: {initialDays} HK</span>
      </span>
    );
  }

  return (
    <div className={clsx('rounded-xl border border-line bg-surface p-3.5 space-y-2.5 shadow-2xs', className)}>
      <div className="flex items-center justify-between border-b border-line/60 pb-2">
        <div className="flex items-center gap-2">
          <Clock className="w-4 h-4 text-brand-700" aria-hidden="true" />
          <h4 className="text-xs font-bold text-ink uppercase tracking-wider">
            Rincian Target SLA Layanan
          </h4>
        </div>
        <span className="text-[11px] font-semibold text-ink-muted">
          Hari Kerja (HK)
        </span>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs">
        {/* Tahap 1: Verifikasi Fisik */}
        <div className="p-2 rounded-lg bg-surface-subtle border border-line">
          <span className="text-[11px] text-ink-muted block font-medium">Verifikasi Fisik</span>
          <span className="text-sm font-black text-ink">Maks. 2 HK</span>
        </div>

        {/* Tahap 2: Naskah Awal */}
        <div className="p-2 rounded-lg bg-surface-subtle border border-line">
          <span className="text-[11px] text-ink-muted block font-medium">Pentashihan Awal</span>
          <span className="text-sm font-black text-ink">
            {hasPentashihanSla ? `${initialDays} HK` : 'Menunggu Verif'}
          </span>
        </div>

        {/* Tahap 3: Perbaikan */}
        <div className="p-2 rounded-lg bg-surface-subtle border border-line">
          <span className="text-[11px] text-ink-muted block font-medium">Naskah Perbaikan</span>
          <span className="text-sm font-black text-ink">
            {hasPentashihanSla && revisionDays ? `${revisionDays} HK` : '-'}
          </span>
        </div>

        {/* Tahap 4: Dumi */}
        <div className="p-2 rounded-lg bg-surface-subtle border border-line">
          <span className="text-[11px] text-ink-muted block font-medium">Naskah Dumi</span>
          <span className="text-sm font-black text-ink">
            {hasPentashihanSla && dummyDays ? `${dummyDays} HK` : '-'}
          </span>
        </div>
      </div>

      {activeDueAt && (
        <div className="flex items-center justify-between text-[11px] bg-brand-50 border border-brand-200 px-2.5 py-1.5 rounded-lg text-brand-900 font-medium">
          <span>Tenggat Waktu Sidang Berjalan (Ditentukan Distributor):</span>
          <strong className="font-mono font-bold text-brand-800">
            {new Date(activeDueAt).toLocaleDateString('id-ID', { dateStyle: 'medium' })}
          </strong>
        </div>
      )}

      {!hasPentashihanSla && (
        <p className="text-[11px] text-ink-muted italic flex items-center gap-1.5 pt-1">
          <AlertCircle className="w-3.5 h-3.5 text-civic-warning shrink-0" aria-hidden="true" />
          <span>Estimasi SLA pentashihan ditetapkan secara definitif setelah verifikasi naskah fisik selesai.</span>
        </p>
      )}
    </div>
  );
};

export default SlaBreakdown;
