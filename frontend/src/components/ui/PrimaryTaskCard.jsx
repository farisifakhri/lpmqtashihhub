import React from 'react';
import { ArrowRight, AlertCircle, Clock, ShieldAlert } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { clsx } from 'clsx';

export const PrimaryTaskCard = ({
  title,
  description,
  objectRef,
  actionLabel = 'Lanjutkan Tugas',
  onAction,
  actionHref,
  actionIcon = <ArrowRight className="w-4 h-4" />,
  disabled = false,
  disabledReason,
  slaText,
  slaOverdue = false,
  ownerLabel,
  className,
  priority = 'normal', // 'normal' | 'urgent' | 'warning'
}) => {
  const priorityStyles = {
    normal: 'border-slate-200 bg-white shadow-2xs',
    urgent: 'border-rose-300 bg-rose-50/40 shadow-2xs',
    warning: 'border-amber-300 bg-amber-50/40 shadow-2xs',
  };

  return (
    <article
      className={clsx(
        'rounded-xl border p-5 sm:p-6 transition-all space-y-4',
        priorityStyles[priority] || priorityStyles.normal,
        className
      )}
      aria-labelledby="primary-task-title"
    >
      {/* Header Meta & Ownership */}
      <div className="flex flex-wrap items-center justify-between gap-2.5 text-xs text-slate-500">
        <div className="flex flex-wrap items-center gap-2">
          {objectRef && (
            <span className="font-mono font-bold text-slate-900 bg-slate-100 px-2.5 py-1 rounded-md border border-slate-200">
              {objectRef}
            </span>
          )}
          {ownerLabel && (
            <span className="font-medium text-slate-600">
              Pemilik Tindakan: <strong className="text-slate-900">{ownerLabel}</strong>
            </span>
          )}
        </div>

        {slaText && (
          <span
            className={clsx(
              'inline-flex items-center gap-1.5 font-semibold px-2.5 py-1 rounded-md border text-xs',
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

      {/* Task Content */}
      <div className="space-y-1.5">
        <h3 id="primary-task-title" className="text-base sm:text-lg font-bold text-slate-900 tracking-tight">
          {title}
        </h3>
        <p className="text-sm text-slate-600 leading-relaxed max-w-3xl">
          {description}
        </p>
      </div>

      {/* Disabled Reason Banner */}
      {disabled && disabledReason && (
        <div
          role="alert"
          className="flex items-start gap-2.5 rounded-lg border border-amber-200 bg-amber-50/80 p-3 text-xs text-amber-900"
        >
          <ShieldAlert className="w-4 h-4 text-amber-700 shrink-0 mt-0.5" aria-hidden="true" />
          <div>
            <span className="font-bold">Aksi tertahan: </span>
            <span>{disabledReason}</span>
          </div>
        </div>
      )}

      {/* Action CTA */}
      <div className="pt-1 flex items-center justify-end">
        {actionHref ? (
          <Button
            as="a"
            href={actionHref}
            disabled={disabled}
            variant="primary"
            size="md"
            icon={actionIcon}
            className="w-full sm:w-auto"
          >
            {actionLabel}
          </Button>
        ) : (
          <Button
            onClick={onAction}
            disabled={disabled}
            variant="primary"
            size="md"
            icon={actionIcon}
            className="w-full sm:w-auto"
          >
            {actionLabel}
          </Button>
        )}
      </div>
    </article>
  );
};

export default PrimaryTaskCard;

