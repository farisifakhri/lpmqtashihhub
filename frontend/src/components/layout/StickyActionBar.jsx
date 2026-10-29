import React from 'react';
import { clsx } from 'clsx';

export const StickyActionBar = ({
  primaryAction,
  secondaryActions,
  statusMessage,
  className,
}) => {
  if (!primaryAction && !secondaryActions && !statusMessage) {
    return null;
  }

  return (
    <aside
      aria-label="Aksi Utama Halaman"
      className={clsx(
        'sticky bottom-0 z-30 bg-surface/95 backdrop-blur-md border-t border-line shadow-[0_-4px_20px_rgba(0,0,0,0.06)] py-3.5 px-4 sm:px-8 transition-all -mx-3.5 sm:-mx-6 lg:-mx-8 -mb-4 sm:-mb-6 lg:-mb-7 mt-8',
        className
      )}
    >
      <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-3">
        {/* Left Status or Helper Message */}
        <div className="text-xs text-ink-muted font-medium truncate w-full sm:w-auto text-center sm:text-left">
          {statusMessage && (
            <div className="flex items-center justify-center sm:justify-start gap-2">
              {statusMessage}
            </div>
          )}
        </div>

        {/* Right Action Group */}
        <div className="flex items-center justify-end gap-2.5 w-full sm:w-auto">
          {secondaryActions && (
            <div className="flex items-center gap-2 flex-1 sm:flex-initial justify-end">
              {secondaryActions}
            </div>
          )}
          {primaryAction && (
            <div className="flex-1 sm:flex-initial">
              {primaryAction}
            </div>
          )}
        </div>
      </div>
    </aside>
  );
};

export default StickyActionBar;
