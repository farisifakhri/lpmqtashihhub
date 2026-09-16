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
        isSent && 'border-emerald-200 bg-emerald-50/30',
        isPending && 'border-slate-200 bg-slate-50/60',
        isFailed && 'border-rose-200 bg-rose-50/50',
        className
      )}
    >
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex items-center gap-2.5">
          <div
            className={clsx(
              'w-7 h-7 rounded-lg flex items-center justify-center shrink-0',
              isSent && 'bg-emerald-800 text-white',
              isPending && 'bg-slate-200 text-slate-700',
              isFailed && 'bg-rose-700 text-white'
            )}
          >
            <Mail className="w-3.5 h-3.5" />
          </div>

          <div>
            <p className="font-bold text-slate-900">
              Notifikasi Surat Resmi ke Penerbit
            </p>
            {recipient && (
              <p className="text-slate-500 text-[11px]">
                Tujuan: <strong className="text-slate-700 font-mono">{recipient}</strong>
              </p>
            )}
          </div>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          {isSent && (
            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-emerald-100 text-emerald-900 border border-emerald-300 font-semibold text-xs">
              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-700" />
              Terkirim {formattedDate ? `· ${formattedDate} WIB` : ''}
            </span>
          )}

          {isPending && (
            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-slate-100 text-slate-700 border border-slate-300 font-semibold text-xs">
              <Clock className="w-3.5 h-3.5 text-slate-500" />
              Menunggu Pengiriman
            </span>
          )}

          {isFailed && (
            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-rose-100 text-rose-900 border border-rose-300 font-bold text-xs">
              <AlertTriangle className="w-3.5 h-3.5 text-rose-700" />
              Pengiriman Gagal
            </span>
          )}

          {isFailed && onRetry && (
            <Button
              variant="outline"
              size="sm"
              onClick={onRetry}
              disabled={retrying}
              className="text-xs h-8 min-h-0 text-rose-800 border-rose-300 hover:bg-rose-100"
            >
              <RefreshCw className={clsx('w-3.5 h-3.5 mr-1', retrying && 'animate-spin')} />
              Kirim Ulang
            </Button>
          )}
        </div>
      </div>

      {isFailed && (
        <div className="p-3 bg-white rounded-lg border border-rose-200 text-[11px] text-rose-800 space-y-1">
          <p className="font-semibold text-rose-900">Kendala Pengiriman Surat:</p>
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

