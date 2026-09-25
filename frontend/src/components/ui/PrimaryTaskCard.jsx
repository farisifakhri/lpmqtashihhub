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
    normal: 'border-line bg-white shadow-2xs',
    urgent: 'border-civic-dangerLine bg-civic-dangerSoft/40 shadow-2xs',
    warning: 'border-civic-warningLine bg-civic-warningSoft/40 shadow-2xs',
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
      <div className="flex flex-wrap items-center justify-between gap-2.5 text-xs text-ink-muted">
        <div className="flex flex-wrap items-center gap-2">
          {objectRef && (
            <span className="font-mono font-bold text-ink bg-surface-subtle px-2.5 py-1 rounded-md border border-line">
              {objectRef}
            </span>
          )}
          {ownerLabel && (
            <span className="font-medium text-ink-muted">
              Pemilik Tindakan: <strong className="text-ink">{ownerLabel}</strong>
            </span>
          )}
        </div>

        {slaText && (
          <span
            className={clsx(
              'inline-flex items-center gap-1.5 font-semibold px-2.5 py-1 rounded-md border text-xs',
              slaOverdue
                ? 'bg-civic-dangerSoft text-civic-danger border-civic-dangerLine font-bold'
                : 'bg-civic-warningSoft text-civic-warning border-civic-warningLine'
            )}
          >
            <Clock className="w-3.5 h-3.5" aria-hidden="true" />
            {slaText}
          </span>
        )}
      </div>

      {/* Task Content */}
      <div className="space-y-1.5">
        <h3 id="primary-task-title" className="text-base sm:text-lg font-bold text-ink tracking-tight">
          {title}
        </h3>
        <p className="text-sm text-ink-muted leading-relaxed max-w-3xl">
          {description}
        </p>
      </div>

      {/* Disabled Reason Banner */}
      {disabled && disabledReason && (
        <div
          role="alert"
          className="flex items-start gap-2.5 rounded-lg border border-civic-warningLine bg-civic-warningSoft/80 p-3 text-xs text-civic-warning"
        >
          <ShieldAlert className="w-4 h-4 text-civic-warning shrink-0 mt-0.5" aria-hidden="true" />
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

