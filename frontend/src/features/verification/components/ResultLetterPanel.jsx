import React from 'react';
import { CheckCircle2, AlertTriangle, AlertCircle, FileText } from 'lucide-react';

export const ResultLetterPanel = ({
  activeMobileTab, decision, setDecision, loadOfficialTemplate, setIsDirty,
  isReadOnly, validationErrors, notes, setNotes, letterTab, setLetterTab,
  letterText, setLetterText,
}) => (
          <div
            className={`p-5 bg-white rounded-xl border border-line shadow-2xs space-y-4 ${
              activeMobileTab === 'checklist' ? 'hidden lg:block' : 'block'
            }`}
          >
            <div className="border-b border-line pb-3">
              <h3 className="text-sm font-bold text-ink">Keputusan Hasil Pemeriksaan</h3>
              <p className="text-[11px] text-ink-muted mt-0.5">
                Kesimpulan akhir verifikasi berkas administrasi dan naskah
              </p>
            </div>

            {/* Decision Radio Boxes */}
            <div className="space-y-2.5">
              <label
                className={`p-3 rounded-xl border-2 cursor-pointer transition-all flex items-start gap-2.5 ${
                  decision === 'PASSED'
                    ? 'border-brand-700 bg-brand-50/40 shadow-2xs'
                    : 'border-line bg-white hover:border-brand-100'
                } ${isReadOnly ? 'pointer-events-none opacity-80' : ''}`}
              >
                <input
                  type="radio"
                  name="verification_decision"
                  value="PASSED"
                  checked={decision === 'PASSED'}
                  onChange={() => {
                    setDecision('PASSED');
                    loadOfficialTemplate('PASSED');
                    setIsDirty(true);
                  }}
                  disabled={isReadOnly}
                  className="mt-0.5"
                />
                <div className="text-xs">
                  <strong className="font-bold text-ink flex items-center gap-1.5">
                    <CheckCircle2 className="w-3.5 h-3.5 text-brand-700" />
                    Lolos Verifikasi (PASSED)
                  </strong>
                  <p className="text-ink-muted text-[11px] mt-0.5 leading-relaxed">
                    Seluruh butir terpenuhi. Rekomendasikan penerbitan billing PNBP.
                  </p>
                </div>
              </label>

              <label
                className={`p-3 rounded-xl border-2 cursor-pointer transition-all flex items-start gap-2.5 ${
                  decision === 'REVISION_REQUIRED'
                    ? 'border-civic-warning bg-civic-warningSoft/40 shadow-2xs'
                    : 'border-line bg-white hover:border-civic-warningLine'
                } ${isReadOnly ? 'pointer-events-none opacity-80' : ''}`}
              >
                <input
                  type="radio"
                  name="verification_decision"
                  value="REVISION_REQUIRED"
                  checked={decision === 'REVISION_REQUIRED'}
                  onChange={() => {
                    setDecision('REVISION_REQUIRED');
                    loadOfficialTemplate('REVISION_REQUIRED');
                    setIsDirty(true);
                  }}
                  disabled={isReadOnly}
                  className="mt-0.5"
                />
                <div className="text-xs">
                  <strong className="font-bold text-ink flex items-center gap-1.5">
                    <AlertTriangle className="w-3.5 h-3.5 text-civic-warning" />
                    Perlu Perbaikan Penerbit (REVISION_REQUIRED)
                  </strong>
                  <p className="text-ink-muted text-[11px] mt-0.5 leading-relaxed">
                    Terdapat butir tidak sesuai yang wajib diperbaiki pemohon.
                  </p>
                </div>
              </label>
            </div>

            {validationErrors.decision && (
              <div className="p-2.5 bg-civic-dangerSoft border border-civic-dangerLine rounded-lg text-civic-danger text-xs flex items-center gap-2">
                <AlertCircle className="w-4 h-4 shrink-0 text-civic-danger" />
                <span>{validationErrors.decision}</span>
              </div>
            )}

            {/* Notes textarea */}
            <div className="space-y-1 text-xs">
              <label className="font-semibold text-ink flex items-center justify-between">
                <span>
                  Catatan Kesimpulan / Alasan Keputusan:
                  {decision === 'REVISION_REQUIRED' && (
                    <span className="text-civic-danger ml-1 font-bold">*Wajib</span>
                  )}
                </span>
              </label>
              <textarea
                rows={3}
                value={notes}
                maxLength={2000}
                onChange={(e) => {
                  setNotes(e.target.value);
                  setIsDirty(true);
                }}
                disabled={isReadOnly}
                placeholder={
                  decision === 'REVISION_REQUIRED'
                    ? 'Tuliskan rincian kekurangan yang wajib diperbaiki penerbit...'
                    : 'Catatan tambahan jika diperlukan (opsional)...'
                }
                className="w-full p-2.5 text-xs rounded-lg border border-line focus:outline-none focus:ring-2 focus:ring-brand-700/20"
              />
            </div>

            {/* Draf Surat Teks */}
            <div className="space-y-2 text-xs pt-2 border-t border-line">
              <div className="flex items-center justify-between">
                <label className="font-bold text-ink flex items-center gap-1.5">
                  <FileText className="w-3.5 h-3.5 text-brand-800" />
                  Teks Draf Surat Hasil Verifikasi
                </label>
                <div className="flex items-center gap-1">
                  <button
                    type="button"
                    onClick={() => setLetterTab('editor')}
                    className={`px-2 py-0.5 text-[11px] rounded font-semibold ${
                      letterTab === 'editor' ? 'bg-surface-strong text-ink' : 'text-ink-muted'
                    }`}
                  >
                    Editor
                  </button>
                  <button
                    type="button"
                    onClick={() => setLetterTab('preview')}
                    className={`px-2 py-0.5 text-[11px] rounded font-semibold ${
                      letterTab === 'preview' ? 'bg-surface-strong text-ink' : 'text-ink-muted'
                    }`}
                  >
                    Pratinjau
                  </button>
                </div>
              </div>

              {letterTab === 'editor' ? (
                <textarea
                  rows={6}
                  value={letterText}
                  maxLength={10000}
                  onChange={(e) => {
                    setLetterText(e.target.value);
                    setIsDirty(true);
                  }}
                  disabled={isReadOnly}
                  placeholder="Tuliskan teks draf surat hasil verifikasi resmi..."
                  className="w-full p-2.5 text-xs rounded-lg border border-line font-sans focus:outline-none focus:ring-2 focus:ring-brand-700/20"
                />
              ) : (
                <div className="p-3 bg-canvas border border-line rounded-lg text-xs whitespace-pre-line text-ink max-h-60 overflow-y-auto leading-relaxed">
                  {letterText}
                </div>
              )}
            </div>
          </div>
);
