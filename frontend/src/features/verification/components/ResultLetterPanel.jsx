import React from 'react';
import { CheckCircle2, AlertTriangle, AlertCircle, FileText } from 'lucide-react';

export const ResultLetterPanel = ({
  activeMobileTab, decision, setDecision, loadOfficialTemplate, setIsDirty,
  isReadOnly, validationErrors, notes, setNotes, letterTab, setLetterTab,
  letterText, setLetterText,
}) => (
          <div
            className={`p-5 bg-white rounded-xl border border-slate-200 shadow-2xs space-y-4 ${
              activeMobileTab === 'checklist' ? 'hidden lg:block' : 'block'
            }`}
          >
            <div className="border-b border-slate-100 pb-3">
              <h3 className="text-sm font-bold text-slate-900">Keputusan Hasil Pemeriksaan</h3>
              <p className="text-[11px] text-slate-500 mt-0.5">
                Kesimpulan akhir verifikasi berkas administrasi dan naskah
              </p>
            </div>

            {/* Decision Radio Boxes */}
            <div className="space-y-2.5">
              <label
                className={`p-3 rounded-xl border-2 cursor-pointer transition-all flex items-start gap-2.5 ${
                  decision === 'PASSED'
                    ? 'border-emerald-700 bg-emerald-50/40 shadow-2xs'
                    : 'border-slate-200 bg-white hover:border-emerald-300'
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
                  <strong className="font-bold text-slate-900 flex items-center gap-1.5">
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-700" />
                    Lolos Verifikasi (PASSED)
                  </strong>
                  <p className="text-slate-600 text-[11px] mt-0.5 leading-relaxed">
                    Seluruh butir terpenuhi. Rekomendasikan penerbitan billing PNBP.
                  </p>
                </div>
              </label>

              <label
                className={`p-3 rounded-xl border-2 cursor-pointer transition-all flex items-start gap-2.5 ${
                  decision === 'REVISION_REQUIRED'
                    ? 'border-amber-600 bg-amber-50/40 shadow-2xs'
                    : 'border-slate-200 bg-white hover:border-amber-300'
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
                  <strong className="font-bold text-slate-900 flex items-center gap-1.5">
                    <AlertTriangle className="w-3.5 h-3.5 text-amber-600" />
                    Perlu Perbaikan Penerbit (REVISION_REQUIRED)
                  </strong>
                  <p className="text-slate-600 text-[11px] mt-0.5 leading-relaxed">
                    Terdapat butir tidak sesuai yang wajib diperbaiki pemohon.
                  </p>
                </div>
              </label>
            </div>

            {validationErrors.decision && (
              <div className="p-2.5 bg-rose-50 border border-rose-200 rounded-lg text-rose-700 text-xs flex items-center gap-2">
                <AlertCircle className="w-4 h-4 shrink-0 text-rose-600" />
                <span>{validationErrors.decision}</span>
              </div>
            )}

            {/* Notes textarea */}
            <div className="space-y-1 text-xs">
              <label className="font-semibold text-slate-800 flex items-center justify-between">
                <span>
                  Catatan Kesimpulan / Alasan Keputusan:
                  {decision === 'REVISION_REQUIRED' && (
                    <span className="text-rose-600 ml-1 font-bold">*Wajib</span>
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
                className="w-full p-2.5 text-xs rounded-lg border border-slate-200 focus:outline-none focus:ring-2 focus:ring-emerald-700/20"
              />
            </div>

            {/* Draf Surat Teks */}
            <div className="space-y-2 text-xs pt-2 border-t border-slate-100">
              <div className="flex items-center justify-between">
                <label className="font-bold text-slate-900 flex items-center gap-1.5">
                  <FileText className="w-3.5 h-3.5 text-emerald-800" />
                  Teks Draf Surat Hasil Verifikasi
                </label>
                <div className="flex items-center gap-1">
                  <button
                    type="button"
                    onClick={() => setLetterTab('editor')}
                    className={`px-2 py-0.5 text-[11px] rounded font-semibold ${
                      letterTab === 'editor' ? 'bg-slate-200 text-slate-900' : 'text-slate-500'
                    }`}
                  >
                    Editor
                  </button>
                  <button
                    type="button"
                    onClick={() => setLetterTab('preview')}
                    className={`px-2 py-0.5 text-[11px] rounded font-semibold ${
                      letterTab === 'preview' ? 'bg-slate-200 text-slate-900' : 'text-slate-500'
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
                  className="w-full p-2.5 text-xs rounded-lg border border-slate-200 font-sans focus:outline-none focus:ring-2 focus:ring-emerald-700/20"
                />
              ) : (
                <div className="p-3 bg-slate-50 border border-slate-200 rounded-lg text-xs whitespace-pre-line text-slate-800 max-h-60 overflow-y-auto leading-relaxed">
                  {letterText}
                </div>
              )}
            </div>
          </div>
);
