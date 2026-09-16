import React from 'react';
import { FileText, Printer, Download, Eye, ExternalLink } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { PrivateFileViewer } from './PrivateFileViewer';
import { clsx } from 'clsx';

export const DocumentPreview = ({
  title = 'Pratinjau Dokumen Resmi',
  documentNo,
  version = 1,
  fileId,
  fileName,
  letterHtml,
  letterText,
  metadata = [],
  onPrint,
  onDownload,
  className,
}) => {
  const handlePrint = () => {
    if (onPrint) {
      onPrint();
      return;
    }
    window.print();
  };

  return (
    <div
      className={clsx(
        'rounded-xl border border-slate-200 bg-white shadow-2xs overflow-hidden flex flex-col',
        className
      )}
    >
      {/* Header Bar */}
      <div className="bg-slate-50 border-b border-slate-200 p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
        <div className="space-y-1">
          <div className="flex flex-wrap items-center gap-2">
            <h3 className="font-bold text-slate-900 text-sm">{title}</h3>
            {documentNo && (
              <span className="font-mono bg-white border border-slate-200 px-2 py-0.5 rounded text-slate-800 font-semibold">
                {documentNo}
              </span>
            )}
            {version && (
              <span className="bg-emerald-50 text-emerald-800 border border-emerald-200 px-2 py-0.5 rounded font-semibold">
                Versi {version}
              </span>
            )}
          </div>
          {metadata.length > 0 && (
            <div className="flex flex-wrap items-center gap-3 text-slate-500 pt-0.5">
              {metadata.map((item, idx) => (
                <span key={idx}>
                  {item.label}: <strong className="text-slate-700">{item.value}</strong>
                </span>
              ))}
            </div>
          )}
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <Button
            variant="outline"
            size="sm"
            onClick={handlePrint}
            className="text-xs"
            title="Cetak Dokumen"
          >
            <Printer className="w-3.5 h-3.5 mr-1" /> Cetak
          </Button>
          {onDownload && (
            <Button
              variant="outline"
              size="sm"
              onClick={onDownload}
              className="text-xs"
              title="Unduh Salinan Resmi"
            >
              <Download className="w-3.5 h-3.5 mr-1" /> Unduh PDF
            </Button>
          )}
        </div>
      </div>

      {/* Content Area: Either File Viewer or Official Letter Typography */}
      <div className="p-5 overflow-auto max-h-[700px]">
        {fileId ? (
          <PrivateFileViewer fileId={fileId} fileName={fileName} height="550px" />
        ) : letterHtml ? (
          <div
            className="prose prose-sm max-w-none text-slate-800 leading-relaxed font-sans bg-white p-6 rounded-lg border border-slate-100 shadow-2xs print:border-0 print:p-0"
            dangerouslySetInnerHTML={{ __html: letterHtml }}
          />
        ) : letterText ? (
          <div className="bg-white p-6 rounded-lg border border-slate-100 shadow-2xs font-sans text-slate-800 text-sm whitespace-pre-wrap leading-relaxed">
            {letterText}
          </div>
        ) : (
          <div className="text-center py-12 text-slate-400 space-y-2">
            <FileText className="w-10 h-10 mx-auto stroke-1" />
            <p className="text-xs">Konten dokumen belum tersedia untuk ditampilkan.</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default DocumentPreview;

