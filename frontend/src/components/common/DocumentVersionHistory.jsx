import React from 'react';
import { History, Download, Eye, FileText, Calendar, User } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { clsx } from 'clsx';

export const DocumentVersionHistory = ({
  versions = [],
  currentVersionId,
  onSelectVersion,
  onDownloadVersion,
  className,
}) => {
  if (!versions || versions.length === 0) {
    return (
      <div className={clsx('rounded-xl border border-slate-200 bg-slate-50 p-5 text-center text-xs text-slate-500', className)}>
        <History className="w-5 h-5 mx-auto text-slate-400 mb-1" />
        Belum ada riwayat revisi versi sebelumnya.
      </div>
    );
  }

  return (
    <div className={clsx('rounded-xl border border-slate-200 bg-white p-4 sm:p-5 shadow-2xs space-y-3', className)}>
      <div className="flex items-center gap-2 border-b border-slate-100 pb-2.5">
        <History className="w-4 h-4 text-emerald-800" />
        <h3 className="text-xs sm:text-sm font-bold text-slate-900">
          Riwayat Versi Dokumen ({versions.length} Versi)
        </h3>
      </div>

      <div className="space-y-2.5">
        {versions.map((item, idx) => {
          const isCurrent = item.id === currentVersionId || idx === 0;
          const formattedDate = item.uploaded_at || item.created_at
            ? new Date(item.uploaded_at || item.created_at).toLocaleDateString('id-ID', {
                day: 'numeric',
                month: 'short',
                year: 'numeric',
                hour: '2-digit',
                minute: '2-digit',
              })
            : '-';

          return (
            <div
              key={item.id || idx}
              className={clsx(
                'rounded-lg border p-3 text-xs transition-colors flex flex-col sm:flex-row sm:items-center justify-between gap-3',
                isCurrent
                  ? 'border-emerald-300 bg-emerald-50/40 shadow-2xs'
                  : 'border-slate-200 bg-white hover:bg-slate-50'
              )}
            >
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <span
                    className={clsx(
                      'px-2 py-0.5 rounded font-mono font-bold text-[11px] border',
                      isCurrent
                        ? 'bg-emerald-800 text-white border-emerald-900'
                        : 'bg-slate-100 text-slate-700 border-slate-300'
                    )}
                  >
                    v{item.version || versions.length - idx}
                  </span>
                  <span className="font-semibold text-slate-900 truncate max-w-xs">
                    {item.file_name || item.name || 'Naskah Mushaf'}
                  </span>
                  {isCurrent && (
                    <span className="text-[10px] font-bold text-emerald-800 bg-emerald-100 px-1.5 py-0.2 rounded">
                      Aktif
                    </span>
                  )}
                </div>

                <div className="flex flex-wrap items-center gap-3 text-slate-500 text-[11px]">
                  <span className="flex items-center gap-1">
                    <Calendar className="w-3 h-3 text-slate-400" />
                    {formattedDate} WIB
                  </span>
                  {item.uploader && (
                    <span className="flex items-center gap-1">
                      <User className="w-3 h-3 text-slate-400" />
                      {item.uploader.name || item.uploader}
                    </span>
                  )}
                </div>

                {item.notes && (
                  <p className="text-slate-600 text-[11px] pt-1 italic">
                    Catatan: “{item.notes}”
                  </p>
                )}
              </div>

              <div className="flex items-center gap-1.5 shrink-0 self-start sm:self-center">
                {onSelectVersion && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => onSelectVersion(item)}
                    className="text-xs py-1 px-2.5 h-8 min-h-0"
                  >
                    <Eye className="w-3.5 h-3.5 mr-1" /> Tinjau
                  </Button>
                )}
                {onDownloadVersion && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => onDownloadVersion(item)}
                    className="text-xs py-1 px-2 h-8 min-h-0 text-slate-600 hover:text-emerald-800"
                    title="Unduh versi ini"
                  >
                    <Download className="w-3.5 h-3.5" />
                  </Button>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default DocumentVersionHistory;

