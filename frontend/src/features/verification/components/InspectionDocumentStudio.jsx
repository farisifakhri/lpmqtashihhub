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
  BookOpen,
  Info,
  ExternalLink,
} from 'lucide-react';
import { PrivateFileViewer } from '@/components/common/PrivateFileViewer';
import { SlaIndicator } from '@/components/ui/SlaIndicator';
import { Button } from '@/components/ui/Button';

export function InspectionDocumentStudio({
  allFiles = [],
  activeFile,
  selectedFileId,
  setSelectedFileId,
  getFileLabel,
  registration = {},
  publisher = {},
  physicalMaster = {},
  assignment = {},
  formatDate,
  handleCopyReceipt,
  copiedReceipt,
}) {
  const [showMetaDrawer, setShowMetaDrawer] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [isCollapsed, setIsCollapsed] = useState(false);

  return (
    <>
      <div className="bg-white rounded-2xl border border-line shadow-2xs overflow-hidden flex flex-col w-full transition-all">
        {/* Studio Header: File Selector Tabs, Collapse Toggle & Fullscreen */}
        <div className="p-3 sm:px-4 sm:py-3 bg-canvas border-b border-line flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-brand-800 text-white shadow-2xs">
              <FileText className="w-4 h-4" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-xs sm:text-sm font-bold text-ink">
                  Studio Berkas & Naskah Digital
                </h3>
                {allFiles.length > 0 && (
                  <span className="text-[11px] font-mono px-2 py-0.2 rounded-full bg-brand-50 text-brand-900 border border-brand-200 font-bold">
                    {allFiles.length} Berkas
                  </span>
                )}
              </div>
              <p className="text-[11px] text-ink-muted hidden sm:block">
                {allFiles.length > 0
                  ? 'Pratinjau naskah & dokumen kelengkapan administrasi pemohon'
                  : 'Master cetak fisik di ruang pentashihan TMII'}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {/* Tab Pills if files exist */}
            {allFiles.length > 0 && (
              <div className="flex flex-wrap items-center gap-1.5">
                {allFiles.map((f) => {
                  const isSelected =
                    activeFile &&
                    (activeFile.id === f.id ||
                      (activeFile.file_id && activeFile.file_id === f.file_id));
                  return (
                    <button
                      key={f.id || f.file_id}
                      type="button"
                      onClick={() => {
                        setSelectedFileId(f.id || f.file_id);
                        if (isCollapsed) setIsCollapsed(false);
                      }}
                      className={`px-3 py-1.5 text-xs rounded-lg font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
                        isSelected
                          ? 'bg-brand-800 text-white shadow-2xs'
                          : 'bg-white text-ink border border-line hover:bg-canvas hover:border-brand-300'
                      }`}
                    >
                      <span>{getFileLabel(f)}</span>
                      {f.version && (
                        <span
                          className={`font-mono text-[10px] px-1.5 py-0.2 rounded ${
                            isSelected
                              ? 'bg-brand-900/70 text-white'
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
            )}

            <div className="flex items-center gap-1 pl-1 border-l border-line">
              {/* Maximize Button */}
              {activeFile && (
                <button
                  type="button"
                  onClick={() => setIsFullscreen(true)}
                  className="p-1.5 rounded-lg border border-line bg-white hover:bg-canvas text-ink-muted hover:text-brand-800 transition-colors cursor-pointer"
                  title="Buka Pratinjau Layar Penuh"
                  aria-label="Perbesar naskah layar penuh"
                >
                  <Maximize2 className="w-4 h-4" />
                </button>
              )}

              {/* Collapse / Expand Toggle Button */}
              <button
                type="button"
                onClick={() => setIsCollapsed(!isCollapsed)}
                className="px-2.5 py-1.5 rounded-lg border border-line bg-white hover:bg-canvas text-ink text-xs font-semibold inline-flex items-center gap-1 transition-colors cursor-pointer"
                title={isCollapsed ? 'Tampilkan Pratinjau Berkas' : 'Kecilkan / Sembunyikan Pratinjau'}
              >
                {isCollapsed ? (
                  <>
                    <ChevronDown className="w-3.5 h-3.5 text-brand-700" />
                    <span className="hidden sm:inline">Buka Pratinjau</span>
                  </>
                ) : (
                  <>
                    <ChevronUp className="w-3.5 h-3.5 text-ink-muted" />
                    <span className="hidden sm:inline">Kecilkan</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>

        {/* Collapsed Banner Notice */}
        {isCollapsed ? (
          <div className="px-4 py-3 bg-surface-subtle flex items-center justify-between text-xs border-b border-line animate-fadeIn">
            <div className="flex items-center gap-2 text-ink-muted">
              <span className="font-semibold text-ink">Pratinjau naskah disembunyikan.</span>
              {activeFile && (
                <span className="hidden sm:inline">
                  Berkas aktif: <strong className="text-brand-900">{getFileLabel(activeFile)}</strong> ({activeFile.file_name || 'Dokumen'})
                </span>
              )}
            </div>
            <button
              type="button"
              onClick={() => setIsCollapsed(false)}
              className="text-xs font-bold text-brand-800 hover:text-brand-900 hover:underline flex items-center gap-1 cursor-pointer"
            >
              <span>Tampilkan Kembali Naskah</span>
              <ChevronDown className="w-3.5 h-3.5" />
            </button>
          </div>
        ) : (
          <>
            {/* Active Document Info Bar */}
            {activeFile && (
              <div className="px-4 py-2 bg-surface-subtle border-b border-line flex flex-wrap items-center justify-between gap-2 text-xs text-ink-muted">
                <div className="flex items-center gap-2 truncate max-w-xl">
                  <span className="font-bold text-ink truncate">
                    {getFileLabel(activeFile)}
                  </span>
                  <span className="text-ink-muted truncate text-[11px]">
                    · {activeFile.file_name || activeFile.original_name || 'Dokumen PDF'}
                  </span>
                  <span className="font-mono text-[10px] px-1.5 py-0.2 rounded bg-white border border-line text-ink-muted shrink-0">
                    {activeFile.file_size ? `${Math.round(activeFile.file_size / 1024)} KB` : 'PDF'}
                  </span>
                </div>

                <div className="flex items-center gap-2">
                  {activeFile.file_url && (
                    <a
                      href={activeFile.file_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1 text-[11px] font-semibold text-brand-800 hover:underline px-2 py-0.5"
                    >
                      <ExternalLink className="w-3 h-3" />
                      <span>Tab Baru</span>
                    </a>
                  )}
                </div>
              </div>
            )}

            {/* Main Document Viewer (Full Width with comfortable height) */}
            <div className="w-full h-[520px] sm:h-[600px] lg:h-[650px] p-2 sm:p-3 bg-surface-subtle flex flex-col justify-center">
              {activeFile ? (
                activeFile.file_url ? (
                  <div className="w-full h-full rounded-xl border border-line overflow-hidden bg-white shadow-2xs flex-1 flex flex-col">
                    <iframe
                      src={`${activeFile.file_url}#toolbar=0`}
                      title={activeFile.file_name || 'Naskah'}
                      className="w-full h-full border-0 flex-1"
                    />
                  </div>
                ) : (
                  <div className="w-full h-full rounded-xl border border-line overflow-hidden bg-white shadow-2xs flex-1 flex flex-col">
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
                /* Fallback Informative Physical Master Desk Card */
                <div className="w-full h-full rounded-xl border border-line bg-white p-6 shadow-2xs flex flex-col justify-between overflow-y-auto">
                  <div className="space-y-4 max-w-3xl mx-auto w-full">
                    <div className="flex items-start gap-3.5">
                      <div className="p-3.5 rounded-2xl bg-brand-50 border border-brand-100 text-brand-800 shrink-0 shadow-2xs">
                        <BookOpen className="w-7 h-7" />
                      </div>
                      <div className="space-y-1">
                        <span className="text-[10px] font-bold tracking-wider uppercase px-2.5 py-0.5 rounded-full bg-brand-100 text-brand-900 border border-brand-200 inline-block">
                          Master Cetak Fisik Resmi
                        </span>
                        <h4 className="text-base font-bold text-ink leading-snug">
                          {registration.title || 'Naskah Master Al-Qur’an'}
                        </h4>
                        <p className="text-xs text-ink-muted leading-relaxed">
                          Pemeriksaan rasm, harakat, waqaf, dan kelengkapan dilakukan langsung menggunakan naskah master fisik di meja kerja verifikator LPMQ.
                        </p>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3 pt-2">
                      <div className="p-3 rounded-xl border border-line bg-surface-subtle space-y-1">
                        <span className="text-[10px] font-bold text-ink-muted uppercase">Tanda Terima Fisik Naskah</span>
                        <div className="flex items-center justify-between">
                          <span className="font-mono font-bold text-brand-900 text-xs">
                            {physicalMaster?.receipt_no || 'TT-LPMQ-PENDING'}
                          </span>
                          {physicalMaster?.receipt_no && (
                            <button
                              type="button"
                              onClick={() => handleCopyReceipt(physicalMaster.receipt_no)}
                              className="inline-flex items-center gap-1 text-[11px] font-bold text-brand-800 hover:underline cursor-pointer"
                            >
                              {copiedReceipt ? <Check className="w-3 h-3 text-brand-700" /> : <Copy className="w-3 h-3" />}
                              {copiedReceipt ? 'Disalin' : 'Salin'}
                            </button>
                          )}
                        </div>
                      </div>

                      <div className="p-3 rounded-xl border border-line bg-surface-subtle space-y-1">
                        <span className="text-[10px] font-bold text-ink-muted uppercase">Format & Jumlah</span>
                        <p className="text-xs font-semibold text-ink">
                          Format {physicalMaster?.format || 'A4'} · {physicalMaster?.volume_count || 30} Jilid
                        </p>
                      </div>

                      <div className="p-3 rounded-xl border border-line bg-surface-subtle space-y-1">
                        <span className="text-[10px] font-bold text-ink-muted uppercase">Kondisi Berkas</span>
                        <p className="text-xs font-semibold text-brand-800">
                          {physicalMaster?.condition || 'BAIK & LENGKAP'}
                        </p>
                      </div>

                      <div className="p-3 rounded-xl border border-line bg-surface-subtle space-y-1">
                        <span className="text-[10px] font-bold text-ink-muted uppercase">Lokasi Penelaahan</span>
                        <p className="text-xs font-semibold text-ink">
                          LPMQ TMII, Jakarta Timur
                        </p>
                      </div>
                    </div>

                    <div className="p-3.5 rounded-xl bg-brand-50/70 border border-brand-100 flex items-start gap-2.5 text-xs text-brand-900 mt-3">
                      <Info className="w-4 h-4 text-brand-700 shrink-0 mt-0.5" />
                      <p className="leading-relaxed">
                        Jika pemohon mengunggah berkas digital susulan (seperti surat permohonan resmi, dumi, atau sampul revisi), dokumen akan otomatis muncul pada tab berkas di atas.
                      </p>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </>
        )}

        {/* Sleek Horizontal Strip: Metadata & Penerimaan Master Fisik */}
        <div className="border-t border-line bg-canvas shrink-0">
          <div className="px-4 py-2.5 flex flex-wrap items-center justify-between gap-2.5 text-xs">
            <div className="flex flex-wrap items-center gap-2 sm:gap-3 text-ink">
              <span className="flex items-center gap-1.5 font-bold text-brand-900">
                <Building2 className="w-4 h-4 text-brand-800" />
                <span>Identitas Naskah:</span>
              </span>
              <span className="font-semibold text-ink truncate max-w-xs sm:max-w-sm">
                {publisher.legal_name || 'Penerbit'}
              </span>
              <span className="text-ink-muted hidden sm:inline">·</span>
              {physicalMaster?.receipt_no ? (
                <span className="font-mono text-[11px] bg-brand-100 text-brand-800 border border-brand-200 px-2 py-0.5 rounded-full font-bold flex items-center gap-1">
                  <span>✓ Fisik Diterima: {physicalMaster.receipt_no}</span>
                </span>
              ) : (
                <span className="font-mono text-[11px] bg-surface-subtle text-ink-muted border border-line px-2 py-0.5 rounded-full">
                  Penerimaan: Menunggu Verifikasi Fisik
                </span>
              )}
              <span className="text-ink-muted hidden md:inline">·</span>
              <span className="text-ink-muted text-[11px] hidden md:inline">
                Format: <strong>{physicalMaster?.format || 'A4'}</strong> ({physicalMaster?.volume_count || 30} Jilid)
              </span>
            </div>

            <button
              type="button"
              onClick={() => setShowMetaDrawer(!showMetaDrawer)}
              className="text-ink-muted hover:text-brand-900 flex items-center gap-1 text-xs font-semibold cursor-pointer py-0.5"
            >
              <span>{showMetaDrawer ? 'Sembunyikan Detail' : 'Lihat Detail Lengkap'}</span>
              {showMetaDrawer ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
            </button>
          </div>

          {showMetaDrawer && (
            <div className="p-4 border-t border-line bg-surface-subtle space-y-3 text-xs animate-fadeIn">
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
                {/* Identitas Pemohon */}
                <div className="p-3 bg-white rounded-xl border border-line space-y-1 shadow-2xs">
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
                <div className="p-3 bg-white rounded-xl border border-line space-y-1 shadow-2xs">
                  <span className="text-[10px] font-bold text-ink-muted uppercase tracking-wider block">
                    Penerimaan Master Fisik di TMII
                  </span>
                  {physicalMaster?.receipt_no ? (
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
                          {copiedReceipt ? <Check className="w-3 h-3 text-brand-700" /> : <Copy className="w-3 h-3" />}
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
                      Menunggu verifikasi fisik di Penerimaan LPMQ.
                    </p>
                  )}
                </div>

                {/* SLA Indicator */}
                <div className="p-3 bg-white rounded-xl border border-line shadow-2xs flex flex-col justify-center">
                  <span className="text-[10px] font-bold text-ink-muted uppercase tracking-wider block mb-1">
                    Target Waktu Layanan (SLA)
                  </span>
                  {assignment?.sla ? (
                    <SlaIndicator
                      dueDate={assignment.sla.due_at}
                      isOverdue={assignment.sla.is_overdue}
                      remainingMs={assignment.sla.remaining_ms}
                      targetDuration={assignment.sla.duration_target || '2 hari'}
                    />
                  ) : (
                    <p className="text-xs text-ink-muted">Target penyelesaian: 10 Hari Kerja</p>
                  )}
                </div>
              </div>
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
                    {getFileLabel(activeFile)} · {activeFile.file_name || 'Naskah'}
                  </h3>
                  <p className="text-xs text-ink-muted">{registration.title}</p>
                </div>
              </div>

              <div className="flex items-center gap-2">
                {activeFile.file_url && (
                  <Button
                    as="a"
                    href={activeFile.file_url}
                    target="_blank"
                    rel="noreferrer"
                    variant="outline"
                    size="sm"
                    className="text-xs"
                  >
                    <Download className="w-3.5 h-3.5 mr-1" />
                    Unduh
                  </Button>
                )}
                <button
                  type="button"
                  onClick={() => setIsFullscreen(false)}
                  className="p-1.5 rounded-lg hover:bg-surface-subtle text-ink-muted hover:text-ink transition-colors cursor-pointer"
                  aria-label="Tutup pratinjau layar penuh"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            <div className="flex-1 bg-surface-subtle p-2">
              {activeFile.file_url ? (
                <iframe
                  src={activeFile.file_url}
                  title={activeFile.file_name || 'Naskah Layar Penuh'}
                  className="w-full h-full border-0 rounded-xl bg-white"
                />
              ) : (
                <PrivateFileViewer
                  fileId={activeFile.file_id || activeFile.id}
                  fileName={activeFile.file_name}
                  mimeType={activeFile.mime_type}
                  height="100%"
                />
              )}
            </div>
          </div>
        </div>
      )}
    </>
  );
}

export default InspectionDocumentStudio;
