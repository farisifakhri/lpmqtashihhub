import React from 'react';
import { Link } from 'react-router-dom';
import {
  ShieldCheck,
  User,
  Clock,
  AlertTriangle,
  ArrowRight,
  CheckCircle2,
  AlertCircle,
} from 'lucide-react';
import { clsx } from 'clsx';
import { Button } from '@/components/ui/Button';

export const WorkflowOwnershipBanner = ({
  viewModel,
  className,
  onDirectAction,
}) => {
  if (!viewModel) return null;

  const {
    statusLabel,
    statusDescription,
    ownerRoleLabel,
    ownerName,
    nextActionLabel,
    nextActionPath,
    dueAt,
    isOverdue,
    blockedReason,
    canUserAct,
  } = viewModel;

  const formattedDue = dueAt
    ? new Date(dueAt).toLocaleDateString('id-ID', {
        day: 'numeric',
        month: 'short',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
        timeZone: 'Asia/Jakarta',
      })
    : null;

  return (
    <div
      className={clsx(
        'rounded-xl border bg-surface p-4 sm:p-5 shadow-2xs space-y-3.5 transition-all',
        isOverdue ? 'border-civic-dangerLine bg-civic-dangerSoft/30' : 'border-line',
        className
      )}
      role="region"
      aria-label="Status Alur Kerja dan Pemilik Tindakan"
    >
      {/* Top row: Status header + Owner pill */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2.5">
        <div className="space-y-1">
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-xs font-extrabold text-brand-800 uppercase tracking-wider">
              Status Alur Kerja
            </span>
            <span className="text-line-strong">•</span>
            <h3 className="text-sm sm:text-base font-bold text-ink">
              {statusLabel}
            </h3>
          </div>
          <p className="text-xs text-ink-muted leading-relaxed max-w-2xl">
            {statusDescription}
          </p>
        </div>

        {/* Current Owner Badge */}
        <div className="shrink-0 flex items-center gap-2">
          <div className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-surface-subtle border border-line text-xs">
            <User className="w-3.5 h-3.5 text-brand-700 shrink-0" />
            <span className="text-ink-muted">Pemilik Aksi:</span>
            <span className="font-bold text-ink">
              {ownerName ? `${ownerRoleLabel} (${ownerName})` : ownerRoleLabel}
            </span>
          </div>
        </div>
      </div>

      {/* Blocker Callout if any */}
      {blockedReason && (
        <div
          role="alert"
          className="flex items-start gap-2.5 p-3 rounded-lg border border-civic-warningLine bg-civic-warningSoft/80 text-xs text-civic-warning"
        >
          <AlertCircle className="w-4 h-4 text-civic-warning shrink-0 mt-0.5" />
          <div className="space-y-0.5">
            <span className="font-bold">Pekerjaan Tertahan (Blocker): </span>
            <span>{blockedReason}</span>
          </div>
        </div>
      )}

      {/* Bottom row: SLA indicator & Next action button */}
      <div className="pt-2 border-t border-line/70 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 text-xs">
        {/* SLA Information */}
        <div className="flex items-center gap-2 text-ink-muted">
          <Clock className={clsx('w-4 h-4 shrink-0', isOverdue ? 'text-civic-danger' : 'text-brand-700')} />
          {formattedDue ? (
            <span>
              Target SLA:{' '}
              <strong className={clsx('font-semibold', isOverdue ? 'text-civic-danger font-bold' : 'text-ink')}>
                {formattedDue} {isOverdue && '(Terlambat)'}
              </strong>
            </span>
          ) : (
            <span>SLA mengikuti standar hari kerja SOP v2.2</span>
          )}
        </div>

        {/* Action Button */}
        <div className="flex items-center gap-2">
          {canUserAct && nextActionPath ? (
            onDirectAction ? (
              <Button
                variant="primary"
                size="sm"
                onClick={onDirectAction}
                className="w-full sm:w-auto text-xs"
              >
                <span>{nextActionLabel}</span>
                <ArrowRight className="w-3.5 h-3.5 ml-1" />
              </Button>
            ) : (
              <Link
                to={nextActionPath}
                className="inline-flex items-center justify-center gap-1.5 px-4 py-2 min-h-[38px] rounded-lg bg-brand-700 hover:bg-brand-800 text-white font-bold text-xs shadow-2xs transition-colors w-full sm:w-auto"
              >
                <span>{nextActionLabel}</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </Link>
            )
          ) : (
            <span className="text-[11px] text-ink-muted italic">
              {canUserAct
                ? 'Tidak ada tindakan lanjutan yang diperlukan.'
                : `Tindakan berikutnya merupakan kewenangan ${ownerRoleLabel}.`}
            </span>
          )}
        </div>
      </div>
    </div>
  );
};

export default WorkflowOwnershipBanner;

