import React, { useState } from 'react';
import { TOKENS } from '@/app/tokens';
import { WORKFLOW_PHASES } from '@/features/workflow/workflow-phases';
import { STATUS_DEFINITIONS } from '@/lib/workflow-view-model';
import {
  Check,
  Clock,
  AlertTriangle,
  FileEdit,
  ClipboardCheck,
  CreditCard,
  PackageCheck,
  BookOpen,
  Award,
  FolderCheck,
  ChevronDown,
  ChevronUp,
} from 'lucide-react';
import { clsx } from 'clsx';

const PHASE_ICONS = {
  REGISTRATION: FileEdit,
  VERIFICATION: ClipboardCheck,
  PAYMENT: CreditCard,
  HANDOVER: PackageCheck,
  TASHIH: BookOpen,
  STT_ISSUANCE: Award,
  DOCUMENTATION: FolderCheck,
  COMPLETED: Check,
};

export const WorkflowTimeline = ({
  currentStatus = 'DRAFT',
  statusHistories = [],
  className,
  compact = false,
}) => {
  const [expandedPhase, setExpandedPhase] = useState(null);

  const statusConfig = TOKENS.registrationStatus[currentStatus] || TOKENS.registrationStatus.DRAFT;
  const activePhaseKey = STATUS_DEFINITIONS[currentStatus]?.phase || statusConfig.phaseKey || 'REGISTRATION';

  const activePhaseIndex = WORKFLOW_PHASES.findIndex((p) => p.key === activePhaseKey);
  const currentPhaseNumber = activePhaseIndex >= 0 ? activePhaseIndex + 1 : 1;

  const isRevision = currentStatus === 'REVISION_REQUIRED' || currentStatus === 'PHYSICAL_HANDOVER_CORRECTION_REQUIRED';
  const isCancelled = currentStatus === 'CANCELLED';

  const toggleExpand = (phaseId) => {
    setExpandedPhase((prev) => (prev === phaseId ? null : phaseId));
  };

  return (
    <section
      className={clsx(
        'rounded-xl border border-slate-200 bg-white p-5 sm:p-6 shadow-2xs space-y-4',
        className
      )}
      aria-labelledby="workflow-timeline-title"
    >
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-100 pb-3">
        <div>
          <h2 id="workflow-timeline-title" className="text-sm sm:text-base font-bold text-slate-900">
            Alur Tahapan Pentashihan Mushaf
          </h2>
          <p className="text-xs text-slate-500">
            Fase {currentPhaseNumber} dari {WORKFLOW_PHASES.length}: <strong className="text-emerald-800">{statusConfig.phaseLabel || statusConfig.label}</strong>
          </p>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-xs font-semibold px-2.5 py-1 rounded-md bg-slate-100 text-slate-700 border border-slate-200">
            {statusConfig.label}
          </span>
        </div>
      </div>

      {/* Horizontal Stepper for Desktop */}
      <div className="hidden lg:grid grid-cols-8 gap-2 relative pt-2">
        {WORKFLOW_PHASES.map((phase, idx) => {
          const phaseNumber = idx + 1;
          const isCompleted = phaseNumber < currentPhaseNumber;
          const isCurrent = phaseNumber === currentPhaseNumber;
          const isUpcoming = phaseNumber > currentPhaseNumber;
          const Icon = PHASE_ICONS[phase.key] || Clock;

          return (
            <div key={phase.key} className="flex flex-col items-center text-center group">
              {/* Node Circle */}
              <div
                className={clsx(
                  'w-9 h-9 rounded-lg flex items-center justify-center font-bold text-xs transition-all relative z-10',
                  isCompleted && 'bg-emerald-800 text-white shadow-2xs',
                  isCurrent && !isRevision && 'bg-sky-600 text-white ring-4 ring-sky-100 shadow-2xs',
                  isCurrent && isRevision && 'bg-amber-600 text-white ring-4 ring-amber-100 shadow-2xs',
                  isUpcoming && 'bg-slate-100 text-slate-400 border border-slate-200'
                )}
                title={phase.description}
              >
                {isCompleted ? (
                  <Check className="w-4 h-4 stroke-[3]" />
                ) : isCurrent && isRevision ? (
                  <AlertTriangle className="w-4 h-4" />
                ) : (
                  <Icon className="w-4 h-4" />
                )}
              </div>

              {/* Phase Name */}
              <span
                className={clsx(
                  'text-xs mt-2 font-semibold transition-colors leading-tight',
                  isCurrent ? 'text-slate-900 font-bold' : isCompleted ? 'text-emerald-900' : 'text-slate-400'
                )}
              >
                {phase.shortLabel}
              </span>

              {isCurrent && (
                <span className="text-[11px] font-medium text-sky-700 mt-0.5">
                  {isCancelled ? 'Dibatalkan' : 'Fase Aktif'}
                </span>
              )}
            </div>
          );
        })}
      </div>

      {/* Vertical / Card Stepper for Tablet and Mobile */}
      <div className="lg:hidden space-y-2">
        {WORKFLOW_PHASES.map((phase, idx) => {
          const phaseNumber = idx + 1;
          const isCompleted = phaseNumber < currentPhaseNumber;
          const isCurrent = phaseNumber === currentPhaseNumber;
          const isUpcoming = phaseNumber > currentPhaseNumber;
          const isExpanded = expandedPhase === phase.id;
          const Icon = PHASE_ICONS[phase.key] || Clock;

          return (
            <div
              key={phase.key}
              className={clsx(
                'rounded-lg border p-3 transition-colors text-xs',
                isCurrent && 'border-sky-300 bg-sky-50/50 shadow-2xs',
                isCompleted && 'border-emerald-200 bg-emerald-50/30',
                isUpcoming && 'border-slate-200 bg-white opacity-70'
              )}
            >
              <div
                className="flex items-center justify-between cursor-pointer"
                onClick={() => toggleExpand(phase.id)}
              >
                <div className="flex items-center gap-2.5">
                  <div
                    className={clsx(
                      'w-7 h-7 rounded-md flex items-center justify-center font-bold text-xs shrink-0',
                      isCompleted && 'bg-emerald-800 text-white',
                      isCurrent && !isRevision && 'bg-sky-600 text-white',
                      isCurrent && isRevision && 'bg-amber-600 text-white',
                      isUpcoming && 'bg-slate-100 text-slate-400 border border-slate-200'
                    )}
                  >
                    {isCompleted ? (
                      <Check className="w-3.5 h-3.5 stroke-[3]" />
                    ) : (
                      <Icon className="w-3.5 h-3.5" />
                    )}
                  </div>
                  <div>
                    <p className={clsx('font-bold', isCurrent ? 'text-slate-900' : isCompleted ? 'text-emerald-950' : 'text-slate-600')}>
                      {phaseNumber}. {phase.label}
                    </p>
                    <p className="text-slate-500 text-[11px]">{phase.description}</p>
                  </div>
                </div>

                <div className="flex items-center gap-1.5 shrink-0">
                  {isCurrent && (
                    <span className="text-[11px] font-bold px-2 py-0.5 rounded bg-sky-100 text-sky-800">
                      {isCancelled ? 'Dibatalkan' : 'Aktif'}
                    </span>
                  )}
                  {isExpanded ? (
                    <ChevronUp className="w-4 h-4 text-slate-400" />
                  ) : (
                    <ChevronDown className="w-4 h-4 text-slate-400" />
                  )}
                </div>
              </div>

              {isExpanded && (
                <div className="mt-2.5 pt-2 border-t border-slate-200/80 text-slate-600 text-[11px] space-y-1">
                  <p><strong>Deskripsi:</strong> {phase.description}</p>
                  {isCurrent && (
                    <>
                      <p><strong>Status saat ini:</strong> {statusConfig.label}</p>
                      <p><strong>Tindakan berikutnya:</strong> {statusConfig.nextAction || 'Menunggu proses petugas'}</p>
                    </>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Next Step Instruction Note */}
      {statusConfig.nextAction && (
        <div className="mt-2 p-3 bg-slate-50 border border-slate-200 rounded-lg flex items-start gap-2.5 text-xs text-slate-700">
          <Clock className="w-4 h-4 text-emerald-800 shrink-0 mt-0.5" />
          <div className="flex-1">
            <span className="font-bold text-slate-900">Langkah Berikutnya: </span>
            <span>{statusConfig.nextAction}</span>
            {statusConfig.actionOwner && (
              <span className="text-slate-500 ml-1.5">
                (Penanggung jawab: <strong>{statusConfig.actionOwner}</strong>)
              </span>
            )}
          </div>
        </div>
      )}
    </section>
  );
};

export default WorkflowTimeline;

