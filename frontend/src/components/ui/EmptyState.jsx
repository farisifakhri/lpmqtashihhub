import React from 'react';
import { Inbox, FilePlus } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { clsx } from 'clsx';

const renderIcon = (icon) => {
  if (!icon) return null;
  if (React.isValidElement(icon)) return icon;
  if (typeof icon === 'function' || (typeof icon === 'object' && icon !== null && icon.$$typeof)) {
    const IconComponent = icon;
    return <IconComponent className="w-10 h-10 text-line-strong stroke-1" />;
  }
  return icon;
};

export const EmptyState = ({
  icon = <Inbox className="w-10 h-10 text-line-strong stroke-1" />,
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
        'rounded-xl border border-dashed border-line-strong bg-white p-8 sm:p-12 text-center space-y-3.5 shadow-2xs',
        className
      )}
    >
      <div className="flex justify-center">{renderIcon(icon)}</div>

      <div className="space-y-1 max-w-sm mx-auto">
        <h3 className="text-sm sm:text-base font-bold text-ink tracking-tight">
          {title}
        </h3>
        <p className="text-xs sm:text-sm text-ink-muted leading-relaxed font-normal">
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

