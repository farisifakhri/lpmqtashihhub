import React from 'react';
import { Mail, CheckCircle2, Clock, AlertTriangle, RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { clsx } from 'clsx';

export const EmailDeliveryStatus = ({
  status = 'PENDING', // 'SENT' | 'PENDING' | 'FAILED'
  recipient,
  sentAt,
  errorMessage,
  onRetry,
  retrying = false,
  className,
}) => {
  const isSent = status === 'SENT';
  const isFailed = status === 'FAILED';
  const isPending = status === 'PENDING';

  const formattedDate = sentAt
    ? new Date(sentAt).toLocaleDateString('id-ID', {
        day: 'numeric',
        month: 'short',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      })
    : null;

  return (
    <div
      className={clsx(
        'rounded-xl border p-4 text-xs transition-colors space-y-2.5',
        isSent && 'border-brand-100 bg-brand-50/30',
        isPending && 'border-line bg-canvas/60',
        isFailed && 'border-civic-dangerLine bg-civic-dangerSoft/50',
        className
      )}
    >
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex items-center gap-2.5">
          <div
            className={clsx(
              'w-7 h-7 rounded-lg flex items-center justify-center shrink-0',
              isSent && 'bg-brand-800 text-white',
              isPending && 'bg-surface-strong text-ink',
              isFailed && 'bg-civic-danger text-white'
            )}
          >
            <Mail className="w-3.5 h-3.5" />
          </div>

          <div>
            <p className="font-bold text-ink">
              Notifikasi Surat Resmi ke Penerbit
            </p>
            {recipient && (
              <p className="text-ink-muted text-[11px]">
                Tujuan: <strong className="text-ink font-mono">{recipient}</strong>
              </p>
            )}
          </div>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          {isSent && (
            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-brand-100 text-brand-900 border border-brand-100 font-semibold text-xs">
              <CheckCircle2 className="w-3.5 h-3.5 text-brand-700" />
              Terkirim {formattedDate ? `· ${formattedDate} WIB` : ''}
            </span>
          )}

          {isPending && (
            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-surface-subtle text-ink border border-line-strong font-semibold text-xs">
              <Clock className="w-3.5 h-3.5 text-ink-muted" />
              Menunggu Pengiriman
            </span>
          )}

          {isFailed && (
            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-civic-dangerSoft text-civic-danger border border-civic-dangerLine font-bold text-xs">
              <AlertTriangle className="w-3.5 h-3.5 text-civic-danger" />
              Pengiriman Gagal
            </span>
          )}

          {isFailed && onRetry && (
            <Button
              variant="outline"
              size="sm"
              onClick={onRetry}
              disabled={retrying}
              className="text-xs h-8 min-h-0 text-civic-danger border-civic-dangerLine hover:bg-civic-dangerSoft"
            >
              <RefreshCw className={clsx('w-3.5 h-3.5 mr-1', retrying && 'animate-spin')} />
              Kirim Ulang
            </Button>
          )}
        </div>
      </div>

      {isFailed && (
        <div className="p-3 bg-white rounded-lg border border-civic-dangerLine text-[11px] text-civic-danger space-y-1">
          <p className="font-semibold text-civic-danger">Kendala Pengiriman Surat:</p>
          <p className="leading-relaxed">
            {errorMessage ||
              'Email belum berhasil dikirim ke server pos penerbit. Dokumen surat tetap sah tersimpan di sistem LPMQ. Anda dapat menekan tombol Kirim Ulang di atas.'}
          </p>
        </div>
      )}
    </div>
  );
};

export default EmailDeliveryStatus;

