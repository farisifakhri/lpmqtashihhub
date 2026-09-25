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
      <div className={clsx('rounded-xl border border-line bg-canvas p-5 text-center text-xs text-ink-muted', className)}>
        <History className="w-5 h-5 mx-auto text-ink-muted mb-1" />
        Belum ada riwayat revisi versi sebelumnya.
      </div>
    );
  }

  return (
    <div className={clsx('rounded-xl border border-line bg-white p-4 sm:p-5 shadow-2xs space-y-3', className)}>
      <div className="flex items-center gap-2 border-b border-line pb-2.5">
        <History className="w-4 h-4 text-brand-800" />
        <h3 className="text-xs sm:text-sm font-bold text-ink">
          Riwayat Versi Dokumen ({versions.length} Versi)
        </h3>
      </div>

      <div className="space-y-2.5">
        {versions.map((item, idx) => {
          const isCurrent = item.id === currentVersionId || (!currentVersionId && idx === 0);
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
                  ? 'border-brand-100 bg-brand-50/40 shadow-2xs'
                  : 'border-line bg-white hover:bg-canvas'
              )}
            >
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <span
                    className={clsx(
                      'px-2 py-0.5 rounded font-mono font-bold text-[11px] border',
                      isCurrent
                        ? 'bg-brand-800 text-white border-brand-900'
                        : 'bg-surface-subtle text-ink border-line-strong'
                    )}
                  >
                    v{item.version || versions.length - idx}
                  </span>
                  <span className="font-semibold text-ink truncate max-w-xs">
                    {item.file_name || item.name || 'Naskah Mushaf'}
                  </span>
                  {isCurrent && (
                    <span className="text-[10px] font-bold text-brand-800 bg-brand-100 px-1.5 py-0.2 rounded">
                      Aktif
                    </span>
                  )}
                </div>

                <div className="flex flex-wrap items-center gap-3 text-ink-muted text-[11px]">
                  <span className="flex items-center gap-1">
                    <Calendar className="w-3 h-3 text-ink-muted" />
                    {formattedDate} WIB
                  </span>
                  {item.uploader && (
                    <span className="flex items-center gap-1">
                      <User className="w-3 h-3 text-ink-muted" />
                      {item.uploader.name || item.uploader}
                    </span>
                  )}
                </div>

                {item.notes && (
                  <p className="text-ink-muted text-[11px] pt-1 italic">
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
                    className="text-xs py-1 px-2 h-8 min-h-0 text-ink-muted hover:text-brand-800"
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

