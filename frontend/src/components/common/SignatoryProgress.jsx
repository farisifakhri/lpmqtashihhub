import React from 'react';
import { CheckCircle2, Clock, AlertCircle, ShieldCheck } from 'lucide-react';
import { clsx } from 'clsx';

export const SignatoryProgress = ({
  signatories = [],
  className,
}) => {
  if (!signatories || signatories.length === 0) {
    return null;
  }

  return (
    <div className={clsx('rounded-xl border border-slate-200 bg-white p-4 sm:p-5 shadow-2xs space-y-3', className)}>
      <div className="flex items-center gap-2 border-b border-slate-100 pb-2.5">
        <ShieldCheck className="w-4 h-4 text-emerald-800" />
        <h3 className="text-xs sm:text-sm font-bold text-slate-900">
          Progres Tanda Tangan Berjenjang Resmi
        </h3>
      </div>

      <div className="space-y-2">
        {signatories.map((sig, idx) => {
          const isSigned = sig.status === 'SIGNED' || Boolean(sig.signed_at);
          const isRejected = sig.status === 'REJECTED' || sig.status === 'RETURNED';
          const isPending = !isSigned && !isRejected;

          const signedDate = sig.signed_at
            ? new Date(sig.signed_at).toLocaleDateString('id-ID', {
                day: 'numeric',
                month: 'short',
                year: 'numeric',
                hour: '2-digit',
                minute: '2-digit',
              })
            : null;

          return (
            <div
              key={sig.id || idx}
              className={clsx(
                'rounded-lg border p-3 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs transition-colors',
                isSigned && 'border-emerald-200 bg-emerald-50/30',
                isPending && 'border-slate-200 bg-slate-50/60',
                isRejected && 'border-rose-200 bg-rose-50/30'
              )}
            >
              <div className="space-y-0.5">
                <div className="flex items-center gap-2">
                  <span className="font-bold text-slate-900 text-sm">
                    {sig.role_label || sig.role || `Penandatangan ${idx + 1}`}
                  </span>
                  {sig.name && (
                    <span className="text-slate-600 font-medium">({sig.name})</span>
                  )}
                </div>
                {sig.title && <p className="text-slate-500 text-[11px]">{sig.title}</p>}
              </div>

              <div className="flex items-center gap-2 shrink-0">
                {isSigned && (
                  <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-emerald-100 text-emerald-900 border border-emerald-300 font-semibold text-xs">
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-700" />
                    <span>Ditandatangani {signedDate ? `· ${signedDate} WIB` : ''}</span>
                  </span>
                )}

                {isPending && (
                  <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-amber-50 text-amber-900 border border-amber-300 font-semibold text-xs">
                    <Clock className="w-3.5 h-3.5 text-amber-700" />
                    <span>Menunggu tanda tangan</span>
                  </span>
                )}

                {isRejected && (
                  <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-rose-50 text-rose-900 border border-rose-300 font-semibold text-xs">
                    <AlertCircle className="w-3.5 h-3.5 text-rose-700" />
                    <span>Ditolak / Dikembalikan</span>
                  </span>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default SignatoryProgress;

