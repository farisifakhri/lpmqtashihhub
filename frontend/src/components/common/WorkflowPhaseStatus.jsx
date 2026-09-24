import React from 'react';
import { WORKFLOW_PHASES } from '@/features/workflow/workflow-phases';
import { TOKENS } from '@/app/tokens';

const PHASE_BY_STATUS = {
  DRAFT: 'REGISTRATION',
  READY_FOR_VERIFICATION: 'VERIFICATION',
  VERIFICATION_ASSIGNED: 'VERIFICATION',
  IN_VERIFICATION: 'VERIFICATION',
  WAITING_VERIFICATION_APPROVAL: 'VERIFICATION',
  VERIFICATION_APPROVED: 'VERIFICATION',
  AWAITING_PAYMENT: 'PAYMENT',
  PAYMENT_VERIFICATION: 'PAYMENT',
  WAITING_DISTRIBUTOR_RECEIPT: 'HANDOVER',
  PHYSICAL_HANDOVER_CORRECTION_REQUIRED: 'HANDOVER',
  WAITING_DISTRIBUTION: 'TASHIH',
  TASHIH_IN_PROGRESS: 'TASHIH',
  READY_FOR_STT: 'STT_ISSUANCE',
  STT_ISSUED: 'STT_ISSUANCE',
  DOCUMENTATION: 'DOCUMENTATION',
  DOCUMENTATION_IN_PROGRESS: 'DOCUMENTATION',
  COMPLETED: 'COMPLETED',
  CANCELLED: 'REGISTRATION',
};

function revisionPhase(registration) {
  if (registration.revision_source === 'PHYSICAL_MASTER' || registration.physical_master_intake?.status === 'RETURNED') return 'VERIFICATION';
  if (registration.revision_source === 'TASHIH' || registration.assignments?.length || registration.status_histories?.some((item) => item.to_status === 'REVISION_REQUIRED' && ['TASHIH_IN_PROGRESS', 'WAITING_DISTRIBUTION'].includes(item.from_status))) return 'TASHIH';
  return 'VERIFICATION';
}

export function getWorkflowPhaseStatus(registration) {
  const status = registration?.status || 'DRAFT';
  const activeKey = status === 'REVISION_REQUIRED' ? revisionPhase(registration) : PHASE_BY_STATUS[status];
  const activeIndex = Math.max(0, WORKFLOW_PHASES.findIndex((phase) => phase.key === activeKey));
  const isCancelled = status === 'CANCELLED';
  const activeLabel = status === 'REVISION_REQUIRED' && activeKey === 'TASHIH'
    ? 'Perlu Perbaikan Naskah Sidang'
    : status === 'READY_FOR_VERIFICATION' && registration?.physical_master_intake?.status !== 'RECEIVED' && registration?.physical_master?.status !== 'RECEIVED'
      ? 'Menunggu master fisik diterima loket'
      : TOKENS.registrationStatus[status]?.label || status;

  return WORKFLOW_PHASES.map((phase, index) => ({
    ...phase,
    state: index < activeIndex ? 'DONE' : index === activeIndex ? (isCancelled ? 'CANCELLED' : 'CURRENT') : 'WAITING',
    statusText: index < activeIndex ? 'Sudah dilalui' : index === activeIndex ? activeLabel : isCancelled ? 'Tidak dilanjutkan' : 'Belum dimulai',
  }));
}

export function WorkflowPhaseStatus({ registration }) {
  if (!registration) return null;
  const phases = getWorkflowPhaseStatus(registration);
  return <section aria-label="Status per tahap alur" className="rounded-xl border border-slate-200 bg-white p-4 sm:p-5">
    <div className="mb-3">
      <h3 className="text-sm font-bold text-slate-900">Status per tahap alur</h3>
      <p className="text-xs text-slate-500">Posisi proses naskah dari pendaftaran sampai selesai.</p>
    </div>
    <ol className="grid gap-2 sm:grid-cols-2">
      {phases.map((phase) => <li key={phase.key} aria-current={phase.state === 'CURRENT' ? 'step' : undefined} className={`rounded-lg border p-3 ${phase.state === 'CURRENT' ? 'border-emerald-400 bg-emerald-50' : phase.state === 'CANCELLED' ? 'border-rose-300 bg-rose-50' : 'border-slate-200 bg-slate-50'}`}>
        <div className="flex items-start gap-2.5">
          <span aria-hidden="true" className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-xs font-bold ${phase.state === 'DONE' ? 'bg-emerald-700 text-white' : phase.state === 'CURRENT' ? 'bg-emerald-800 text-white' : phase.state === 'CANCELLED' ? 'bg-rose-700 text-white' : 'bg-slate-200 text-slate-600'}`}>{phase.state === 'DONE' ? '✓' : phase.number}</span>
          <div className="min-w-0">
            <p className="text-xs font-bold text-slate-900">{phase.label}</p>
            <p className={`mt-0.5 text-xs ${phase.state === 'CURRENT' ? 'font-semibold text-emerald-900' : phase.state === 'CANCELLED' ? 'font-semibold text-rose-800' : 'text-slate-600'}`}>{phase.statusText}</p>
          </div>
        </div>
      </li>)}
    </ol>
  </section>;
}
