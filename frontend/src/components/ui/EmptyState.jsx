import React from 'react';
import { Inbox, FilePlus } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { clsx } from 'clsx';

export const EmptyState = ({
  icon = <Inbox className="w-10 h-10 text-slate-300 stroke-1" />,
  title = 'Tidak Ada Data',
  description = 'Belum ada data atau berkas yang tercatat dalam daftar ini.',
  actionLabel,
  onAction,
  actionHref,
  actionIcon = <FilePlus className="w-4 h-4" />,
  className,
}) => {
  return (
    <div
      className={clsx(
        'rounded-xl border border-dashed border-slate-300 bg-white p-8 sm:p-12 text-center space-y-3.5 shadow-2xs',
        className
      )}
    >
      <div className="flex justify-center">{icon}</div>

      <div className="space-y-1 max-w-sm mx-auto">
        <h3 className="text-sm sm:text-base font-bold text-slate-800 tracking-tight">
          {title}
        </h3>
        <p className="text-xs sm:text-sm text-slate-500 leading-relaxed font-normal">
          {description}
        </p>
      </div>

      {(actionLabel && (onAction || actionHref)) && (
        <div className="pt-2">
          {actionHref ? (
            <Button
              as="a"
              href={actionHref}
              variant="outline"
              size="sm"
              icon={actionIcon}
            >
              {actionLabel}
            </Button>
          ) : (
            <Button
              onClick={onAction}
              variant="outline"
              size="sm"
              icon={actionIcon}
            >
              {actionLabel}
            </Button>
          )}
        </div>
      )}
    </div>
  );
};

export default EmptyState;

