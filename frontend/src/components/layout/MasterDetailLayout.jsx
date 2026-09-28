import React from 'react';
import { ArrowLeft, Inbox } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { clsx } from 'clsx';

export const MasterDetailLayout = ({
  masterContent,
  detailContent,
  hasSelection = false,
  onClearSelection,
  emptyDetailText = 'Pilih salah satu naskah dari antrean di sebelah kiri untuk membuka ruang kerja.',
  masterWidth = 'lg:w-5/12 xl:w-4/12',
  detailWidth = 'lg:w-7/12 xl:w-8/12',
  className,
}) => {
  return (
    <div className={clsx('grid grid-cols-1 lg:flex lg:gap-6 items-start', className)}>
      {/* Master List Pane */}
      <div
        className={clsx(
          'w-full shrink-0 space-y-4',
          masterWidth,
          hasSelection && 'hidden lg:block'
        )}
      >
        {masterContent}
      </div>

      {/* Detail Pane */}
      <div
        className={clsx(
          'w-full min-w-0 space-y-4',
          detailWidth,
          !hasSelection && 'hidden lg:block'
        )}
      >
        {/* Mobile Back Button */}
        {hasSelection && (
          <div className="lg:hidden pb-1">
            <Button
              variant="outline"
              size="sm"
              onClick={onClearSelection}
              icon={<ArrowLeft className="w-4 h-4" />}
            >
              Kembali ke Daftar Antrean
            </Button>
          </div>
        )}

        {hasSelection ? (
          detailContent
        ) : (
          <div className="rounded-xl border border-dashed border-line-strong bg-white p-12 text-center text-ink-muted space-y-3 shadow-2xs">
            <Inbox className="w-12 h-12 text-line-strong mx-auto stroke-1" />
            <h3 className="text-sm font-bold text-ink">Antrean Siap Diperiksa</h3>
            <p className="text-xs text-ink-muted max-w-sm mx-auto leading-relaxed">
              {emptyDetailText}
            </p>
          </div>
        )}
      </div>
    </div>
  );
};

export default MasterDetailLayout;

