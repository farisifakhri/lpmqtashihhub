import React, { useState } from 'react';
import {
  FileText,
  Eye,
  Download,
  Copy,
  Check,
  PackageCheck,
  Building2,
  ChevronDown,
  ChevronUp,
  Clock,
  Maximize2,
  Minimize2,
  X,
} from 'lucide-react';
import { PrivateFileViewer } from '@/components/common/PrivateFileViewer';
import { SlaIndicator } from '@/components/ui/SlaIndicator';
import { Button } from '@/components/ui/Button';

export function InspectionDocumentStudio({
  allFiles,
  activeFile,
  selectedFileId,
  setSelectedFileId,
  getFileLabel,
  registration,
  publisher,
  physicalMaster,
  assignment,
  formatDate,
  handleCopyReceipt,
  copiedReceipt,
}) {
  const [showMetaDrawer, setShowMetaDrawer] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);

  return (
    <>
      <div className="bg-white rounded-2xl border border-line shadow-2xs overflow-hidden flex flex-col h-full">
        {/* Studio Header: File Selector Tabs & Fullscreen Trigger */}
        <div className="p-3 bg-canvas border-b border-line flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <div className="p-1.5 rounded-lg bg-brand-800 text-white shadow-2xs">
              <FileText className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-xs font-bold text-ink">
                Studio Berkas Digital
              </h3>
              <p className="text-[11px] text-ink-muted">
                {allFiles.length} dokumen naskah terlampir
              </p>
            </div>
          </div>

          <div className="flex items-center gap-1.5">
            {/* Tab Pills */}
            <div className="flex flex-wrap items-center gap-1">
              {allFiles.map((f) => {
                const isSelected =
                  activeFile &&
                  (activeFile.id === f.id ||
                    (activeFile.file_id && activeFile.file_id === f.file_id));
                return (
                  <button
                    key={f.id || f.file_id}
                    type="button"
                    onClick={() => setSelectedFileId(f.id || f.file_id)}
                    className={`px-2.5 py-1 text-xs rounded-lg font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
                      isSelected
                        ? 'bg-brand-800 text-white shadow-2xs'
                        : 'bg-white text-ink border border-line hover:bg-canvas hover:border-brand-300'
                    }`}
                  >
                    <span>{getFileLabel(f)}</span>
                    {f.version && (
                      <span
                        className={`font-mono text-[10px] px-1 py-0.2 rounded ${
                          isSelected
                            ? 'bg-brand-900/60 text-white'
                            : 'bg-surface-subtle text-ink-muted'
                        }`}
                      >
                        v{f.version}
                      </span>
                    )}
                  </button>
                );
              })}
            </div>

            {/* Maximize Button */}
            {activeFile && (
              <button
                type="button"
                onClick={() => setIsFullscreen(true)}
                className="p-1.5 rounded-lg border border-line bg-white hover:bg-canvas text-ink-muted hover:text-brand-800 transition-colors ml-1"
                title="Buka Pratinjau Layar Penuh (Fokus Naskah)"
                aria-label="Perbesar naskah layar penuh"
              >
                <Maximize2 className="w-3.5 h-3.5" />
              </button>
            )}
          </div>
        </div>

        {/* Active Document Info Bar */}
        {activeFile && (
          <div className="px-3.5 py-1.5 bg-surface-subtle border-b border-line flex items-center justify-between text-xs text-ink-muted">
            <div className="flex items-center gap-2 truncate max-w-sm">
              <span className="font-bold text-ink truncate text-xs">
                {getFileLabel(activeFile)}
              </span>
              <span className="text-ink-muted truncate text-[11px]">
                ({activeFile.file_name || activeFile.original_name || 'Dokumen PDF'})
              </span>
            </div>
            <span className="font-mono text-[11px] text-ink-muted shrink-0">
              {activeFile.file_size ? `${Math.round(activeFile.file_size / 1024)} KB` : 'PDF Dokumen'}
            </span>
          </div>
        )}

        {/* Main Document Viewer (Flexible Height for Dual Pane) */}
        <div className="flex-1 min-h-[520px] lg:min-h-0 p-2 bg-surface-subtle flex flex-col justify-center">
          {activeFile ? (
            activeFile.file_url ? (
              <div className="w-full h-full min-h-[500px] lg:min-h-0 rounded-xl border border-line overflow-hidden bg-white shadow-2xs flex-1 flex flex-col">
                <iframe
                  src={`${activeFile.file_url}#toolbar=0`}
                  title={activeFile.file_name || 'Naskah'}
                  className="w-full h-full border-0 flex-1 min-h-[500px] lg:min-h-0"
                />
              </div>
            ) : (
              <div className="w-full h-full min-h-[500px] lg:min-h-0 rounded-xl border border-line overflow-hidden bg-white shadow-2xs flex-1 flex flex-col">
                <PrivateFileViewer
                  fileId={activeFile.file_id || activeFile.id}
                  fileName={
                    activeFile.file_name ||
                    (activeFile.type === 'COVER' ? 'cover.jpg' : 'naskah.pdf')
                  }
                  mimeType={activeFile.mime_type}
                  height="100%"
                />
              </div>
            )
          ) : (
            <div className="py-24 text-center text-ink-muted space-y-2">
              <FileText className="w-10 h-10 mx-auto stroke-1 text-ink-muted/50" />
              <p className="text-xs font-medium">Tidak ada berkas digital terlampir.</p>
            </div>
          )}
        </div>

        {/* Bottom Drawer: Metadata & Master Fisik Loket */}
        <div className="border-t border-line bg-canvas shrink-0">
          <button
            type="button"
            onClick={() => setShowMetaDrawer(!showMetaDrawer)}
            className="w-full px-3.5 py-2 flex items-center justify-between text-xs font-bold text-ink hover:bg-surface-subtle transition-colors cursor-pointer"
          >
            <span className="flex items-center gap-2">
              <Building2 className="w-4 h-4 text-brand-800" />
              <span>Identitas Naskah & Tanda Terima Fisik</span>
              {physicalMaster.receipt_no && (
                <span className="font-mono text-[10px] bg-brand-100 text-brand-800 border border-brand-200 px-2 py-0.5 rounded-full font-bold">
                  ✓ Fisik Diterima
                </span>
              )}
            </span>
            <span className="text-ink-muted flex items-center gap-1 text-[11px] font-medium">
              {showMetaDrawer ? 'Sembunyikan' : 'Lihat Detail'}
              {showMetaDrawer ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
            </span>
          </button>

          {showMetaDrawer && (
            <div className="p-3.5 pt-1 border-t border-line space-y-3 text-xs animate-fadeIn max-h-56 overflow-y-auto">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-2.5">
                {/* Identitas Pemohon */}
                <div className="p-2.5 bg-white rounded-xl border border-line space-y-1">
                  <span className="text-[10px] font-bold text-ink-muted uppercase tracking-wider block">
                    Penerbit Pemohon
                  </span>
                  <p className="font-bold text-ink text-xs">{publisher.legal_name || '-'}</p>
                  <p className="text-ink-muted text-[11px] leading-relaxed line-clamp-2">
                    {publisher.address || 'Alamat kantor terdaftar'}
                  </p>
                  <div className="pt-1 text-[11px] text-ink-muted flex items-center gap-1.5">
                    <span>Layanan:</span>
                    <strong className="text-brand-900 font-semibold">
                      {registration.service_type?.name || 'Mushaf Standar'}
                    </strong>
                  </div>
                </div>

                {/* Tanda Terima Fisik */}
                <div className="p-2.5 bg-white rounded-xl border border-line space-y-1">
                  <span className="text-[10px] font-bold text-ink-muted uppercase tracking-wider block">
                    Penerimaan Master Fisik di TMII
                  </span>
                  {physicalMaster.receipt_no ? (
                    <div className="space-y-1 text-xs">
                      <div className="flex items-center justify-between">
                        <span className="font-mono font-bold text-brand-900 text-xs">
                          {physicalMaster.receipt_no}
                        </span>
                        <button
                          type="button"
                          onClick={() => handleCopyReceipt(physicalMaster.receipt_no)}
                          className="inline-flex items-center gap-1 text-[11px] font-bold text-brand-800 hover:underline cursor-pointer"
                        >
                          {copiedReceipt ? <Check className="w-3 h-3" /> : <Copy className="w-3 h-3" />}
                          {copiedReceipt ? 'Tersalin' : 'Salin'}
                        </button>
                      </div>
                      <p className="text-ink-muted text-[11px]">
                        Format: <strong>{physicalMaster.format || 'A4'}</strong> ·{' '}
                        <strong>{physicalMaster.volume_count || 30} Jilid</strong>
                      </p>
                      <p className="text-brand-800 font-semibold text-[11px]">
                        Kondisi: {physicalMaster.condition || 'Baik'}
                      </p>
                    </div>
                  ) : (
                    <p className="text-ink-muted text-[11px] italic">
                      Menunggu verifikasi fisik di loket LPMQ.
                    </p>
                  )}
                </div>
              </div>

              {/* SLA Indicator */}
              {assignment.sla && (
                <SlaIndicator
                  dueDate={assignment.sla.due_at}
                  isOverdue={assignment.sla.is_overdue}
                  remainingMs={assignment.sla.remaining_ms}
                  targetDuration={assignment.sla.duration_target || '2 hari'}
                />
              )}
            </div>
          )}
        </div>
      </div>

      {/* Fullscreen Document Modal */}
      {isFullscreen && activeFile && (
        <div
          role="dialog"
          aria-modal="true"
          aria-label={`Layar Penuh ${getFileLabel(activeFile)}`}
          className="fixed inset-0 z-50 bg-ink/80 p-2 sm:p-5 flex items-center justify-center animate-fadeIn"
        >
          <div className="w-full max-w-6xl h-[95vh] rounded-2xl bg-white shadow-2xl flex flex-col overflow-hidden border border-line">
            <div className="flex items-center justify-between border-b border-line px-4 py-3 bg-canvas">
              <div className="flex items-center gap-2.5">
                <div className="p-1.5 rounded-lg bg-brand-800 text-white">
                  <FileText className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-ink">
                    {getFileLabel(activeFile)}
                  </h3>
                  <p className="text-xs text-ink-muted">
                    {activeFile.file_name || activeFile.original_name || 'Dokumen PDF Naskah'}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setIsFullscreen(false)}
                  className="text-xs flex items-center gap-1.5"
                >
                  <Minimize2 className="w-3.5 h-3.5" />
                  <span>Kembali ke Studio</span>
                </Button>
                <button
                  type="button"
                  onClick={() => setIsFullscreen(false)}
                  className="p-1 rounded-lg text-ink-muted hover:text-ink hover:bg-surface-subtle"
                  aria-label="Tutup"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>
            <div className="flex-1 w-full p-2 bg-surface-subtle flex flex-col">
              {activeFile.file_url ? (
                <iframe
                  src={`${activeFile.file_url}#toolbar=1`}
                  title={activeFile.file_name || 'Naskah Layar Penuh'}
                  className="w-full h-full border-0 rounded-xl bg-white shadow-xs"
                />
              ) : (
                <div className="w-full h-full rounded-xl overflow-hidden bg-white shadow-xs">
                  <PrivateFileViewer
                    fileId={activeFile.file_id || activeFile.id}
                    fileName={
                      activeFile.file_name ||
                      (activeFile.type === 'COVER' ? 'cover.jpg' : 'naskah.pdf')
                    }
                    mimeType={activeFile.mime_type}
                    height="100%"
                  />
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </>
  );
}
