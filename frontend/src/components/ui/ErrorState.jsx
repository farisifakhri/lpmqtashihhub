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
        'rounded-xl border border-civic-dangerLine bg-civic-dangerSoft/60 p-6 sm:p-8 space-y-4 text-civic-danger shadow-2xs',
        className
      )}
    >
      <div className="flex items-start gap-3.5">
        <div className="p-2 rounded-lg bg-civic-dangerSoft text-civic-danger shrink-0 mt-0.5">
          <AlertCircle className="w-5 h-5" />
        </div>

        <div className="space-y-1.5 flex-1">
          <h3 className="text-sm sm:text-base font-bold text-civic-danger">
            {title}
          </h3>
          <p className="text-xs sm:text-sm text-civic-danger leading-relaxed">
            {message}
          </p>

          {reason && (
            <p className="text-xs font-mono bg-white/70 border border-civic-dangerLine p-2 rounded text-civic-danger mt-1">
              Rincian kendala: {reason}
            </p>
          )}

          {savedStatus && (
            <p className="text-xs text-civic-danger/90 pt-1 flex items-center gap-1.5">
              <HelpCircle className="w-3.5 h-3.5" />
              <span>{savedStatus}</span>
            </p>
          )}
        </div>
      </div>

      {onRetry && (
        <div className="flex items-center justify-end gap-2 pt-2 border-t border-civic-dangerLine/60">
          <Button
            variant="outline"
            size="sm"
            onClick={onRetry}
            disabled={retrying}
            className="border-civic-dangerLine bg-white hover:bg-civic-dangerSoft text-civic-danger text-xs"
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

