import React, { useState } from 'react';
import { BookOpen, X, AlertCircle, AlertTriangle, FileText, Download, Info, Send, Upload, ShieldCheck, CheckCircle2 } from 'lucide-react';
import { clsx } from 'clsx';
import { Button } from '@/components/ui/Button';
import { fileApi } from '@/api/file.api';

export const ReviewForm = ({
  selectedAssignment, reviewResult, setReviewResult, reviewNotes, setReviewNotes,
  submitting, modalError, closeReviewModal, handleReviewSubmit, getStageLabel,
  recapFileId, setRecapFileId, recapScope = 'SELF', setRecapScope,
}) => {
  const [uploadingRecap, setUploadingRecap] = useState(false);
  const [recapFileName, setRecapFileName] = useState('');
  const [uploadError, setUploadError] = useState('');

  const handleFileUpload = async (event) => {
    const file = event.target.files?.[0];
    if (!file) return;
    setUploadingRecap(true);
    setUploadError('');
    try {
      const response = await fileApi.upload(file);
      const uploadedId = response?.data?.id || response?.id;
      if (setRecapFileId) {
        setRecapFileId(uploadedId);
      }
      setRecapFileName(file.name);
    } catch (err) {
      setUploadError(err.message || 'Gagal mengunggah berkas rekapan.');
    } finally {
      setUploadingRecap(false);
    }
  };

  const previousRevLetters = (selectedAssignment?.registration?.official_documents || [])
    .filter((doc) => doc.document_type === 'REVISION_RETURN_LETTER')
    .sort((a, b) => (b.version || 0) - (a.version || 0));

  const juzRangeText = selectedAssignment?.juz_from && selectedAssignment?.juz_to
    ? `Juz ${selectedAssignment.juz_from} s.d. ${selectedAssignment.juz_to}`
    : (selectedAssignment?.juz_items?.length
        ? `Juz ${selectedAssignment.juz_items.map((j) => j.juz_number).join(', ')}`
        : null);

  return (
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

              {/* Catatan Sidang Ronde Sebelumnya (B-07) */}
              {previousRevLetters.length > 0 && (
                <div className="p-3.5 rounded-xl border border-civic-warningLine bg-civic-warningSoft space-y-2 text-xs">
                  <div className="flex items-center gap-2 font-bold text-ink">
                    <AlertTriangle className="w-4 h-4 text-civic-warning shrink-0" />
                    <span>Catatan Sidang Ronde Sebelumnya ({previousRevLetters[0].content_snapshot?.revision_kind === 'NASKAH_DUMI' ? 'Naskah Dumi' : 'Naskah Perbaikan'})</span>
                  </div>
                  <div className="bg-white p-3 rounded-lg border border-civic-warningLine text-ink leading-relaxed">
                    <p className="font-semibold text-ink-muted text-[11px] mb-1">
                      Ronde #{previousRevLetters[0].content_snapshot?.revision_round || previousRevLetters[0].version || 1} • Oleh: {previousRevLetters[0].content_snapshot?.distributor_name || 'Distributor'}
                    </p>
                    <p className="whitespace-pre-line text-xs font-mono bg-canvas p-2 rounded border border-line">
                      {previousRevLetters[0].content_snapshot?.notes || '-'}
                    </p>
                  </div>
                </div>
              )}

              {/* Rincian Naskah */}
              <div className="p-4 rounded-xl bg-canvas border border-line space-y-2">
                <div className="flex items-center justify-between gap-2">
                  <div className="font-bold text-sm text-ink">
                    {selectedAssignment.registration?.title}
                  </div>
                  {juzRangeText && (
                    <span className="px-2.5 py-1 rounded-md bg-brand-50 border border-brand-200 text-brand-900 font-bold text-xs shrink-0">
                      {juzRangeText}
                    </span>
                  )}
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

              {/* Cakupan Rekapitulasi: Kelompok (TEAM) vs Mandiri (SELF) - B-15 */}
              {selectedAssignment?.team_id || selectedAssignment?.team ? (
                <div className="space-y-2.5 p-3.5 rounded-xl border border-brand-200/80 bg-brand-50/20">
                  <div className="flex items-center justify-between">
                    <label className="block text-xs font-bold text-ink uppercase tracking-wider">
                      Cakupan Rekapitulasi Sidang
                    </label>
                    <span className="text-[11px] font-semibold text-brand-800">
                      Tim: {selectedAssignment.team?.name || 'Kelompok Aktif'}
                    </span>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <label
                      className={clsx(
                        'p-3 rounded-xl border-2 transition-all cursor-pointer flex items-start gap-2.5 bg-white',
                        recapScope === 'TEAM'
                          ? 'border-brand-700 ring-2 ring-brand-700/10 shadow-xs'
                          : 'border-line hover:border-line-strong'
                      )}
                    >
                      <input
                        type="radio"
                        name="recapScope"
                        value="TEAM"
                        checked={recapScope === 'TEAM'}
                        onChange={(e) => setRecapScope && setRecapScope(e.target.value)}
                        className="mt-0.5 text-brand-700 focus:ring-brand-700"
                      />
                      <div>
                        <div className="font-bold text-xs text-ink">Rekapan Keseluruhan (Kelompok)</div>
                        <div className="text-[11px] text-ink-muted mt-0.5 leading-snug">
                          Mewakili seluruh anggota tim. Kewajiban unggah anggota lain otomatis terpenuhi.
                        </div>
                      </div>
                    </label>

                    <label
                      className={clsx(
                        'p-3 rounded-xl border-2 transition-all cursor-pointer flex items-start gap-2.5 bg-white',
                        recapScope === 'SELF'
                          ? 'border-brand-700 ring-2 ring-brand-700/10 shadow-xs'
                          : 'border-line hover:border-line-strong'
                      )}
                    >
                      <input
                        type="radio"
                        name="recapScope"
                        value="SELF"
                        checked={recapScope === 'SELF'}
                        onChange={(e) => setRecapScope && setRecapScope(e.target.value)}
                        className="mt-0.5 text-brand-700 focus:ring-brand-700"
                      />
                      <div>
                        <div className="font-bold text-xs text-ink">Hanya Rekapan Saya</div>
                        <div className="text-[11px] text-ink-muted mt-0.5 leading-snug">
                          Hanya bagian juz saya. Anggota kelompok lain tetap wajib mengunggah rekap mandiri.
                        </div>
                      </div>
                    </label>
                  </div>
                </div>
              ) : (
                <div className="p-3 rounded-xl border border-line bg-canvas text-xs text-ink-muted flex items-center justify-between">
                  <span>Penugasan Sidang Mandiri (Individu)</span>
                  <span className="font-semibold text-brand-800">Rekapan Perorangan (SELF)</span>
                </div>
              )}

              {/* Berkas Rekapan Internal Pentashih (RF-DIST-18, RF-DIST-19) */}
              <div className="space-y-2 p-3.5 rounded-xl border border-line bg-surface">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <label className="block text-xs font-bold text-ink uppercase tracking-wider">
                      Berkas Rekapan Hasil Telaah Internal
                    </label>
                    <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-brand-100 text-brand-900 border border-brand-200">
                      Wajib Diunggah
                    </span>
                  </div>
                  <span className="text-xs text-ink-muted">PDF / Word (maks. 25 MB)</span>
                </div>
                <div className="flex items-center gap-3">
                  <label className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg border border-line-strong bg-white hover:bg-surface-subtle cursor-pointer text-xs font-semibold text-ink shadow-2xs">
                    <Upload className="w-3.5 h-3.5 text-brand-700" />
                    <span>{uploadingRecap ? 'Mengunggah…' : recapFileId ? 'Ganti Berkas Rekapan' : 'Pilih Berkas Rekapan'}</span>
                    <input
                      type="file"
                      onChange={handleFileUpload}
                      disabled={uploadingRecap}
                      accept=".pdf,.doc,.docx" className="sr-only"
                    />
                  </label>
                  {recapFileName ? (
                    <span className="text-xs text-brand-800 font-medium inline-flex items-center gap-1">
                      <CheckCircle2 className="w-3.5 h-3.5 text-brand-700" />
                      {recapFileName}
                    </span>
                  ) : (
                    <span className="text-xs text-ink-muted italic">Belum ada berkas rekapan terpilih (wajib diunggah)</span>
                  )}
                </div>
                {uploadError && <p className="text-xs text-civic-danger">{uploadError}</p>}
                <div className="rounded-lg border border-brand-100 bg-brand-50/50 p-2.5 text-xs text-brand-900 flex items-start gap-2">
                  <ShieldCheck className="h-4 w-4 shrink-0 text-brand-700 mt-0.5" />
                  <span>
                    <strong>Kerahasiaan Internal (RF-DIST-19):</strong> Berkas rekapan koreksi rentang ini hanya dapat diakses oleh Anda dan Koordinator Distributor. Berkas ini bersifat internal dan tidak dikirim ke penerbit atau dokumentator.
                  </span>
                </div>
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
                      
                      className="mt-0.5 text-brand-700 focus:ring-brand-700"
                    />
                    <div>
                      <div className="font-bold text-xs text-ink">Lolos Tanpa Catatan (Bersih)</div>
                      <div className="text-xs text-ink-muted mt-0.5">
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
                      
                      className="mt-0.5 text-civic-warning focus:ring-civic-warning"
                    />
                    <div>
                      <div className="font-bold text-xs text-ink">Perlu Perbaikan Naskah</div>
                      <div className="text-xs text-ink-muted mt-0.5">
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
                  <span className="text-xs text-ink-muted">Wajib diisi</span>
                </div>
                <textarea
                  rows={5}
                  value={reviewNotes}
                  maxLength={10000}
                  onChange={(e) => setReviewNotes(e.target.value)}
                  
                  placeholder="Contoh format telaah:&#10;[Juz 1, Hal 15, QS. Al-Baqarah: 25] - Lafazh '...' kurang harakat fathah.&#10;[Juz 2, Hal 32, QS. Al-Baqarah: 142] - Tanda waqaf lazim tertukar dengan waqaf jaiz.&#10;Jika bersih tanpa koreksi: Naskah telah ditashih dan sesuai standar Mushaf Indonesia."
                  className="w-full p-3 text-xs bg-canvas/70 border border-line-strong rounded-xl outline-none focus:bg-white focus:ring-2 focus:ring-brand-700/20 focus:border-brand-700 transition-all font-mono leading-relaxed"
                />
                <p className="text-xs text-ink-muted mt-1 flex items-center gap-1">
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
                  Batal
                </Button>
                <Button
                  type="submit"
                  variant="primary"
                  size="sm"
                  disabled={submitting || !reviewNotes.trim() || !recapFileId}
                  className="bg-brand-700 hover:bg-brand-800 text-white font-bold"
                  icon={<Send className="w-3.5 h-3.5" />}
                >
                  {submitting ? 'Menyimpan...' : (selectedAssignment.status === 'COMPLETED' ? 'Simpan Pembaruan Telaah' : 'Kirim Hasil Telaah')}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
};
