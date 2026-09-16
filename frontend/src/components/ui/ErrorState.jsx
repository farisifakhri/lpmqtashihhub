import React from 'react';
import { AlertCircle, RefreshCw, HelpCircle } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { clsx } from 'clsx';

export const ErrorState = ({
  title = 'Gagal Memuat Informasi',
  message = 'Terjadi kendala teknis saat memproses permintaan Anda.',
  reason,
  savedStatus = 'Perubahan data sebelumnya telah tersimpan secara aman.',
  onRetry,
  retrying = false,
  className,
}) => {
  return (
    <div
      role="alert"
      className={clsx(
        'rounded-xl border border-rose-200 bg-rose-50/60 p-6 sm:p-8 space-y-4 text-rose-900 shadow-2xs',
        className
      )}
    >
      <div className="flex items-start gap-3.5">
        <div className="p-2 rounded-lg bg-rose-100 text-rose-700 shrink-0 mt-0.5">
          <AlertCircle className="w-5 h-5" />
        </div>

        <div className="space-y-1.5 flex-1">
          <h3 className="text-sm sm:text-base font-bold text-rose-950">
            {title}
          </h3>
          <p className="text-xs sm:text-sm text-rose-800 leading-relaxed">
            {message}
          </p>

          {reason && (
            <p className="text-xs font-mono bg-white/70 border border-rose-200 p-2 rounded text-rose-800 mt-1">
              Rincian kendala: {reason}
            </p>
          )}

          {savedStatus && (
            <p className="text-xs text-rose-700/90 pt-1 flex items-center gap-1.5">
              <HelpCircle className="w-3.5 h-3.5" />
              <span>{savedStatus}</span>
            </p>
          )}
        </div>
      </div>

      {onRetry && (
        <div className="flex items-center justify-end gap-2 pt-2 border-t border-rose-200/60">
          <Button
            variant="outline"
            size="sm"
            onClick={onRetry}
            disabled={retrying}
            className="border-rose-300 bg-white hover:bg-rose-100 text-rose-800 text-xs"
          >
            <RefreshCw className={clsx('w-3.5 h-3.5 mr-1.5', retrying && 'animate-spin')} />
            Coba Muat Ulang
          </Button>
        </div>
      )}
    </div>
  );
};

export default ErrorState;

