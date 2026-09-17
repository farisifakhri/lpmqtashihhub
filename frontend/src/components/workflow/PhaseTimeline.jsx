import React, { useState } from 'react';
import {
  CheckCircle2,
  Circle,
  Clock,
  ChevronDown,
  ChevronUp,
  ArrowRight,
  AlertCircle,
} from 'lucide-react';
import { clsx } from 'clsx';
import { Link } from 'react-router-dom';
import { WORKFLOW_PHASES } from '@/lib/workflow-view-model';

export const PhaseTimeline = ({
  currentPhase = 'REGISTRATION',
  substatusText,
  publisherAction,
  history = [],
}) => {
  const [showHistory, setShowHistory] = useState(false);

  const activePhaseIndex = WORKFLOW_PHASES.findIndex((p) => p.key === currentPhase);
  const currentIndex = activePhaseIndex >= 0 ? activePhaseIndex : 0;

  return (
    <div className="rounded-xl border border-line bg-surface p-4 sm:p-5 space-y-4 shadow-2xs">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-xs font-bold text-brand-800 uppercase tracking-wider">
            Tahapan Pentashihan
          </h3>
          <p className="text-xs text-ink-muted mt-0.5">
            Proses berjalan sesuai standar 8 tahapan resmi pentashihan mushaf Al-Qur'an.
          </p>
        </div>

        {history.length > 0 && (
          <button
            type="button"
            onClick={() => setShowHistory((prev) => !prev)}
            className="inline-flex items-center gap-1 text-xs font-semibold text-brand-700 hover:text-brand-800 p-1.5 rounded-lg hover:bg-brand-50 transition-colors"
          >
            <span>{showHistory ? 'Sembunyikan Riwayat' : 'Lihat Riwayat'}</span>
            {showHistory ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
          </button>
        )}
      </div>

      {/* Horizontal Phase Steps */}
      <div className="overflow-x-auto pb-2 -mx-2 px-2">
        <ol className="flex items-center min-w-[720px] justify-between relative">
          {WORKFLOW_PHASES.map((phase, idx) => {
            const isCompleted = idx < currentIndex;
            const isCurrent = idx === currentIndex;
            const isUpcoming = idx > currentIndex;

            return (
              <li key={phase.key} className="flex-1 relative last:flex-none">
                <div className="flex flex-col items-center text-center group">
                  {/* Step Circle */}
                  <div
                    className={clsx(
                      'w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold transition-all z-10',
                      isCompleted && 'bg-brand-700 text-white shadow-2xs',
                      isCurrent && 'bg-brand-100 text-brand-900 border-2 border-brand-700 ring-4 ring-brand-50 shadow-sm font-black',
                      isUpcoming && 'bg-surface-subtle text-ink-muted border border-line'
                    )}
                  >
                    {isCompleted ? (
                      <CheckCircle2 className="w-4 h-4" />
                    ) : (
                      <span>{phase.number}</span>
                    )}
                  </div>

                  {/* Label */}
                  <span
                    className={clsx(
                      'text-[11px] mt-2 font-medium max-w-[80px] leading-tight',
                      isCurrent ? 'font-bold text-brand-950' : 'text-ink-muted'
                    )}
                  >
                    {phase.label}
                  </span>
                </div>

                {/* Connecting Line */}
                {idx < WORKFLOW_PHASES.length - 1 && (
                  <div
                    className={clsx(
                      'absolute top-4 left-1/2 right-[-50%] h-[2px] -translate-y-1/2 -z-0',
                      idx < currentIndex ? 'bg-brand-700' : 'bg-line'
                    )}
                    aria-hidden="true"
                  />
                )}
              </li>
            );
          })}
        </ol>
      </div>

      {/* Active Phase Explanation Box */}
      <div className="p-3.5 rounded-lg bg-surface-subtle border border-line flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 text-xs">
        <div className="space-y-0.5">
          <span className="text-[11px] font-bold uppercase text-brand-800">
            Fase Aktif Saat Ini: {WORKFLOW_PHASES[currentIndex]?.label}
          </span>
          <p className="text-ink text-xs font-medium">
            {substatusText || 'Pekerjaan sedang diproses oleh petugas sesuai tahapan SOP.'}
          </p>
        </div>

        {publisherAction && (
          <Link
            to={publisherAction.path}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg bg-brand-700 hover:bg-brand-800 text-white font-bold text-xs shadow-2xs transition-colors shrink-0"
          >
            <span>{publisherAction.label}</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </Link>
        )}
      </div>

      {/* Collapsible History Section */}
      {showHistory && history.length > 0 && (
        <div className="pt-3 border-t border-line space-y-2">
          <h4 className="text-xs font-bold text-ink uppercase tracking-wider">
            Rekam Jejak Status
          </h4>
          <div className="space-y-2 max-h-60 overflow-y-auto">
            {history.map((h, i) => (
              <div key={i} className="flex items-start gap-2.5 text-xs text-ink-muted p-2 rounded-lg bg-surface-subtle/50 border border-line/60">
                <Clock className="w-3.5 h-3.5 text-brand-700 shrink-0 mt-0.5" />
                <div className="flex-1">
                  <div className="flex items-center justify-between gap-2">
                    <span className="font-bold text-ink">{h.status || h.to_status}</span>
                    <span className="text-[11px] text-ink-muted">
                      {h.changed_at ? new Date(h.changed_at).toLocaleString('id-ID') : '-'}
                    </span>
                  </div>
                  {h.notes && <p className="text-[11px] text-ink-muted mt-0.5">{h.notes}</p>}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default PhaseTimeline;

