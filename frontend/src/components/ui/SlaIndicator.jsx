import React from 'react';
import { Clock, AlertTriangle, CheckCircle2 } from 'lucide-react';
import { clsx } from 'clsx';

export const SlaIndicator = ({
  dueAt,
  targetDuration = '2 hari kerja',
  dayType = 'HARI_KERJA', // 'HARI_KERJA' | 'HARI_KALENDER'
  className,
  showProgress = true,
  totalTargetHours = 48,
}) => {
  if (!dueAt) return null;

  const now = new Date();
  const due = new Date(dueAt);
  const diffMs = due.getTime() - now.getTime();
  const isOverdue = diffMs < 0;

  const hoursRemaining = Math.max(0, Math.floor(diffMs / (1000 * 60 * 60)));
  const daysRemaining = Math.floor(hoursRemaining / 24);
  const remainingHoursInDay = hoursRemaining % 24;

  const totalTargetMs = totalTargetHours * 60 * 60 * 1000;
  const remainingPercent = Math.max(0, Math.min(100, Math.round((diffMs / totalTargetMs) * 100)));

  const dayTypeLabel = dayType === 'HARI_KALENDER' ? 'hari kalender' : 'hari kerja';

  let statusType = 'normal';
  let labelText = '';

  if (isOverdue) {
    statusType = 'overdue';
    const hoursOverdue = Math.abs(Math.floor(diffMs / (1000 * 60 * 60)));
    labelText = `Terlambat ${hoursOverdue} jam (SLA ${targetDuration} terlewati)`;
  } else if (hoursRemaining < 12) {
    statusType = 'warning';
    labelText = `Mendekati batas: Sisa ${hoursRemaining} jam (${dayTypeLabel})`;
  } else {
    statusType = 'normal';
    labelText =
      daysRemaining > 0
        ? `Sisa ${daysRemaining} hari ${remainingHoursInDay} jam (${dayTypeLabel})`
        : `Sisa ${hoursRemaining} jam (${dayTypeLabel})`;
  }

  const badgeStyles = {
    normal: 'bg-emerald-50 text-emerald-900 border-emerald-300',
    warning: 'bg-amber-50 text-amber-900 border-amber-300 font-bold',
    overdue: 'bg-rose-50 text-rose-900 border-rose-300 font-bold',
  };

  const barStyles = {
    normal: 'bg-emerald-700',
    warning: 'bg-amber-600',
    overdue: 'bg-rose-600',
  };

  return (
    <div className={clsx('space-y-1.5', className)} aria-label={`SLA: ${labelText}`}>
      <div className="flex items-center gap-2">
        <span
          className={clsx(
            'inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-semibold border shadow-2xs',
            badgeStyles[statusType]
          )}
        >
          {isOverdue ? (
            <AlertTriangle className="w-3.5 h-3.5 shrink-0 text-rose-700" aria-hidden="true" />
          ) : (
            <Clock className="w-3.5 h-3.5 shrink-0" aria-hidden="true" />
          )}
          <span>{labelText}</span>
        </span>
      </div>

      {showProgress && !isOverdue && (
        <div
          role="progressbar"
          aria-valuenow={remainingPercent}
          aria-valuemin="0"
          aria-valuemax="100"
          className="h-1.5 w-full bg-slate-100 rounded-full overflow-hidden border border-slate-200"
        >
          <div
            className={clsx('h-full transition-all duration-300', barStyles[statusType])}
            style={{ width: `${remainingPercent}%` }}
          />
        </div>
      )}
    </div>
  );
};

export default SlaIndicator;

