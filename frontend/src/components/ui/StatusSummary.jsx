import React from 'react';
import { TOKENS } from '@/app/tokens';
import { StatusBadge } from './StatusBadge';
import { Clock, UserCheck, ArrowRight, AlertTriangle, ShieldAlert } from 'lucide-react';
import { clsx } from 'clsx';

export const StatusSummary = ({
  status,
  customTitle,
  customDescription,
  actionOwner,
  nextAction,
  slaText,
  slaOverdue = false,
  blockedReason,
  className,
}) => {
  const config =
    TOKENS.registrationStatus[status] ||
    TOKENS.paymentStatus[status] ||
    TOKENS.registrationStatus.DRAFT;

  const title = customTitle || config.label;
  const description = customDescription || config.description;
  const owner = actionOwner || config.actionOwner;
  const action = nextAction || config.nextAction;

  return (
    <div
      className={clsx(
        'rounded-xl border border-slate-200 bg-white p-5 sm:p-6 shadow-2xs space-y-3.5',
        className
      )}
      aria-labelledby="status-summary-title"
    >
      {/* Top Header: Badge & SLA */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <StatusBadge status={status} size="md" />
          {config.phaseLabel && (
            <span className="text-xs text-slate-500 font-medium">
              Fase: <strong>{config.phaseLabel}</strong>
            </span>
          )}
        </div>

        {slaText && (
          <span
            className={clsx(
              'inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-semibold border',
              slaOverdue
                ? 'bg-rose-50 text-rose-800 border-rose-200 font-bold'
                : 'bg-amber-50 text-amber-900 border-amber-200'
            )}
          >
            <Clock className="w-3.5 h-3.5" aria-hidden="true" />
            {slaText}
          </span>
        )}
      </div>

      {/* Human Title & Explanation */}
      <div className="space-y-1">
        <h3 id="status-summary-title" className="text-base sm:text-lg font-bold text-slate-900 tracking-tight">
          {title}
        </h3>
        <p className="text-sm text-slate-600 leading-relaxed max-w-3xl">
          {description}
        </p>
      </div>

      {/* Action Owner & Next Step */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1 border-t border-slate-100 text-xs">
        {owner && (
          <div className="flex items-center gap-2 text-slate-600">
            <UserCheck className="w-4 h-4 text-emerald-800 shrink-0" aria-hidden="true" />
            <span>
              Penanggung jawab saat ini: <strong className="text-slate-900 font-semibold">{owner}</strong>
            </span>
          </div>
        )}

        {action && (
          <div className="flex items-center gap-2 text-slate-600">
            <ArrowRight className="w-4 h-4 text-sky-700 shrink-0" aria-hidden="true" />
            <span>
              Langkah berikutnya: <strong className="text-slate-900 font-semibold">{action}</strong>
            </span>
          </div>
        )}
      </div>

      {/* Blocked Reason if any */}
      {blockedReason && (
        <div
          role="alert"
          className="flex items-start gap-2.5 rounded-lg border border-amber-200 bg-amber-50/90 p-3 text-xs text-amber-900 mt-2"
        >
          <ShieldAlert className="w-4 h-4 text-amber-700 shrink-0 mt-0.5" aria-hidden="true" />
          <div>
            <span className="font-bold">Informasi: </span>
            <span>{blockedReason}</span>
          </div>
        </div>
      )}
    </div>
  );
};

export default StatusSummary;

