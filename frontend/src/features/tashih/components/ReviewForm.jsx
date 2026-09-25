import React from 'react';
import { BookOpen, X, AlertCircle, FileText, Download, Info, Send } from 'lucide-react';
import { clsx } from 'clsx';
import { Button } from '@/components/ui/Button';

export const ReviewForm = ({
  selectedAssignment, reviewResult, setReviewResult, reviewNotes, setReviewNotes,
  submitting, modalError, closeReviewModal, handleReviewSubmit, getStageLabel,
}) => (
<>
      {selectedAssignment && (
        <div
          className="fixed inset-0 z-50 bg-ink/60 backdrop-blur-xs p-4 sm:p-6 flex items-center justify-center overflow-y-auto"
          role="dialog"
          aria-modal="true"
          aria-labelledby="review-modal-title"
        >
          <div className="w-full max-w-2xl bg-white rounded-2xl shadow-2xl border border-line overflow-hidden flex flex-col max-h-[90vh]">
            {/* Modal Header */}
            <div className="p-5 border-b border-line flex items-center justify-between gap-4 bg-canvas/80">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl bg-brand-700 text-white flex items-center justify-center shadow-xs">
                  <BookOpen className="w-5 h-5" />
                </div>
                <div>
                  <h3 id="review-modal-title" className="text-base font-bold text-ink">
                    Lembar Telaah Sidang Pentashihan
                  </h3>
                  <p className="text-xs text-ink-muted">
                    {selectedAssignment.registration?.registration_no} •{' '}
                    {getStageLabel(selectedAssignment.stage)}
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={closeReviewModal}
                disabled={submitting}
                className="p-1.5 rounded-lg text-ink-muted hover:text-ink hover:bg-surface-strong/60 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Body Form */}
            <form onSubmit={handleReviewSubmit} className="p-5 sm:p-6 overflow-y-auto space-y-5 flex-1">
              {modalError && (
                <div className="p-3.5 rounded-xl bg-civic-dangerSoft border border-civic-dangerLine text-civic-danger text-xs flex items-start gap-2">
                  <AlertCircle className="w-4 h-4 shrink-0 mt-0.5 text-civic-danger" />
                  <div>{modalError}</div>
                </div>
              )}

              {/* Rincian Naskah */}
              <div className="p-4 rounded-xl bg-canvas border border-line space-y-2">
                <div className="font-bold text-sm text-ink">
                  {selectedAssignment.registration?.title}
                </div>
                <div className="text-xs text-ink-muted flex flex-wrap gap-y-1 gap-x-3">
                  <span>Penerbit: <strong>{selectedAssignment.registration?.publisher?.legal_name}</strong></span>
                  <span>•</span>
                  <span>Layanan: <strong>{selectedAssignment.registration?.service_type?.name}</strong></span>
                </div>
              </div>

              {/* Berkas Digital Master Mushaf */}
              <div>
                <label className="block text-xs font-bold text-ink uppercase tracking-wider mb-2">
                  Berkas Master Mushaf Digital
                </label>
                {selectedAssignment.registration?.manuscript_files?.length ? (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    {selectedAssignment.registration.manuscript_files.map((file) => (
                      <a
                        key={file.id}
                        href={`/api/v1/uploads/${file.file_id}`}
                        target="_blank"
                        rel="noreferrer"
                        className="p-2.5 rounded-lg border border-line bg-white hover:border-brand-700 hover:bg-brand-50/30 transition-all flex items-center justify-between text-xs group"
                      >
                        <div className="flex items-center gap-2 truncate">
                          <FileText className="w-4 h-4 text-brand-700 shrink-0" />
                          <span className="font-medium text-ink group-hover:text-brand-800 truncate">
                            {file.file_type || 'Berkas Naskah'}
                          </span>
                        </div>
                        <Download className="w-3.5 h-3.5 text-ink-muted group-hover:text-brand-700 shrink-0 ml-1" />
                      </a>
                    ))}
                  </div>
                ) : (
                  <div className="p-3 rounded-lg bg-civic-warningSoft border border-civic-warningLine text-civic-warning text-xs">
                    Berkas digital belum diunggah atau naskah diperiksa melalui master fisik cetak A4.
                  </div>
                )}
              </div>

              {/* Pilihan Rekomendasi / Keputusan Sidang */}
              <div>
                <label className="block text-xs font-bold text-ink uppercase tracking-wider mb-2">
                  Rekomendasi Hasil Sidang
                </label>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <label
                    className={clsx(
                      'p-3.5 rounded-xl border-2 transition-all cursor-pointer flex items-start gap-3',
                      reviewResult === 'PASSED'
                        ? 'border-brand-700 bg-brand-50/50'
                        : 'border-line hover:border-line-strong'
                    )}
                  >
                    <input
                      type="radio"
                      name="reviewResult"
                      value="PASSED"
                      checked={reviewResult === 'PASSED'}
                      onChange={(e) => setReviewResult(e.target.value)}
                      disabled={selectedAssignment.status === 'COMPLETED'}
                      className="mt-0.5 text-brand-700 focus:ring-brand-700"
                    />
                    <div>
                      <div className="font-bold text-xs text-ink">Lolos Tanpa Catatan (Bersih)</div>
                      <div className="text-[11px] text-ink-muted mt-0.5">
                        Teks Al-Qur'an bersih, rasm usmani dan harakat telah sesuai standar.
                      </div>
                    </div>
                  </label>

                  <label
                    className={clsx(
                      'p-3.5 rounded-xl border-2 transition-all cursor-pointer flex items-start gap-3',
                      reviewResult === 'REVISION_REQUIRED'
                        ? 'border-civic-warning bg-civic-warningSoft/50'
                        : 'border-line hover:border-line-strong'
                    )}
                  >
                    <input
                      type="radio"
                      name="reviewResult"
                      value="REVISION_REQUIRED"
                      checked={reviewResult === 'REVISION_REQUIRED'}
                      onChange={(e) => setReviewResult(e.target.value)}
                      disabled={selectedAssignment.status === 'COMPLETED'}
                      className="mt-0.5 text-civic-warning focus:ring-civic-warning"
                    />
                    <div>
                      <div className="font-bold text-xs text-ink">Perlu Perbaikan Naskah</div>
                      <div className="text-[11px] text-ink-muted mt-0.5">
                        Terdapat kesalahan rasm, harakat, ayat, atau waqaf yang wajib diperbaiki penerbit.
                      </div>
                    </div>
                  </label>
                </div>
              </div>

              {/* Catatan Koreksi Lafazh & Rasm */}
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="block text-xs font-bold text-ink uppercase tracking-wider">
                    Catatan Koreksi & Telaah Lafazh / Rasm
                  </label>
                  <span className="text-[11px] text-ink-muted">Wajib diisi</span>
                </div>
                <textarea
                  rows={5}
                  value={reviewNotes}
                  maxLength={10000}
                  onChange={(e) => setReviewNotes(e.target.value)}
                  disabled={selectedAssignment.status === 'COMPLETED'}
                  placeholder="Contoh format telaah:&#10;[Juz 1, Hal 15, QS. Al-Baqarah: 25] - Lafazh '...' kurang harakat fathah.&#10;[Juz 2, Hal 32, QS. Al-Baqarah: 142] - Tanda waqaf lazim tertukar dengan waqaf jaiz.&#10;Jika bersih tanpa koreksi: Naskah telah ditashih dan sesuai standar Mushaf Indonesia."
                  className="w-full p-3 text-xs bg-canvas/70 border border-line-strong rounded-xl outline-none focus:bg-white focus:ring-2 focus:ring-brand-700/20 focus:border-brand-700 transition-all font-mono leading-relaxed"
                />
                <p className="text-[11px] text-ink-muted mt-1 flex items-center gap-1">
                  <Info className="w-3.5 h-3.5 text-ink-muted shrink-0" />
                  <span>
                    Catatan ini akan dikompilasi oleh koordinator Distributor untuk keputusan lanjut STT atau surat perbaikan ke penerbit.
                  </span>
                </p>
              </div>

              {/* Modal Actions */}
              <div className="pt-4 border-t border-line flex items-center justify-end gap-2.5">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={closeReviewModal}
                  disabled={submitting}
                >
                  {selectedAssignment.status === 'COMPLETED' ? 'Tutup' : 'Batal'}
                </Button>
                {selectedAssignment.status !== 'COMPLETED' && (
                  <Button
                    type="submit"
                    variant="primary"
                    size="sm"
                    disabled={submitting || !reviewNotes.trim()}
                    className="bg-brand-700 hover:bg-brand-800 text-white font-bold"
                    icon={<Send className="w-3.5 h-3.5" />}
                  >
                    {submitting ? 'Menyimpan...' : 'Kirim Hasil Telaah'}
                  </Button>
                )}
              </div>
            </form>
          </div>
        </div>
      )}
</>
);
