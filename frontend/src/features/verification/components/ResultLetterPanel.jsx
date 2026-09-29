import React from 'react';
import { CheckCircle2, AlertTriangle, AlertCircle, FileText } from 'lucide-react';

export const ResultLetterPanel = ({
  activeMobileTab, decision, setDecision, loadOfficialTemplate, setIsDirty,
  isReadOnly, validationErrors, notes, setNotes, letterTab, setLetterTab,
  letterText, setLetterText,
  registration, publisher,
}) => (
          <div
            className={`p-5 sm:p-6 bg-white rounded-xl border border-line shadow-2xs space-y-5 ${
              activeMobileTab === 'hasil' ? 'block' : 'hidden lg:block'
            }`}
          >
            <div className="border-b border-line pb-3">
              <h3 className="text-base font-bold text-ink">Hasil Pemeriksaan & Draf Surat</h3>
              <p className="text-[11px] text-ink-muted mt-0.5">
                Tentukan hasil pemeriksaan, tulis alasan, lalu periksa surat sebelum diajukan ke Kepala LPMQ.
              </p>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-[minmax(240px,0.75fr)_minmax(0,1.5fr)] gap-6 items-start">
            <div className="space-y-4">
              <h4 className="text-xs font-bold uppercase tracking-wide text-ink-muted">1. Keputusan & catatan</h4>

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
            </div>

            {/* Draf Surat Teks */}
            <div className="space-y-3 text-xs min-w-0">
              <h4 className="text-xs font-bold uppercase tracking-wide text-ink-muted">2. Isi surat untuk penerbit</h4>
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

              <p className="text-[11px] text-ink-muted leading-relaxed">
                Kop, nomor surat, alamat penerbit, dan penutup ditambahkan otomatis pada PDF. Tulis isi surat di bawah ini.
              </p>

              {letterTab === 'editor' ? (
                <div className="space-y-2">
                <textarea
                  rows={15}
                  value={letterText}
                  maxLength={10000}
                  onChange={(e) => {
                    setLetterText(e.target.value);
                    setIsDirty(true);
                  }}
                  disabled={isReadOnly}
                  placeholder="Tuliskan teks draf surat hasil verifikasi resmi..."
                  className="w-full min-h-[320px] p-4 text-sm leading-relaxed rounded-lg border border-line font-sans focus:outline-none focus:ring-2 focus:ring-brand-700/20 resize-y"
                />
                <div className="flex flex-wrap items-center justify-between gap-2 text-[11px] text-ink-muted">
                  <span>{letterText.length}/10000 karakter</span>
                  {!isReadOnly && <button type="button" onClick={() => loadOfficialTemplate(decision)} className="font-semibold text-brand-800 hover:underline">Isi ulang dari contoh surat</button>}
                </div>
                </div>
              ) : (
                <div className="mx-auto max-w-[680px] min-h-[520px] bg-white border border-line-strong shadow-sm p-6 sm:p-10 text-[12px] leading-relaxed text-ink">
                  <div className="flex items-center gap-3 border-b-2 border-ink pb-3 mb-6">
                    <img src="/assets/logo-kemenag.png" alt="Lambang Kementerian Agama" className="h-14 w-14 object-contain shrink-0" />
                    <div className="text-center flex-1">
                      <p className="font-bold">KEMENTERIAN AGAMA REPUBLIK INDONESIA</p>
                      <p className="font-bold">LAJNAH PENTASHIHAN MUSHAF AL-QUR'AN</p>
                      <p className="text-[10px]">Gedung Bayt Al-Qur'an & Museum Istiqlal, Jl. Raya TMII Pintu I, Jakarta Timur 13560</p>
                    </div>
                  </div>
                  <div className="space-y-1 mb-6">
                    <p>Nomor: <span className="text-ink-muted">Diisi saat persetujuan</span></p>
                    <p>Sifat: Biasa</p>
                    <p>Lampiran: -</p>
                    <p>Hal: {decision === 'PASSED' ? 'Hasil verifikasi dan pemberitahuan PNBP' : 'Hasil verifikasi - tidak lolos'}</p>
                  </div>
                  <p>Yth. Pimpinan {publisher?.legal_name || 'Penerbit'}</p>
                  <p>di {publisher?.address || 'alamat terdaftar'}</p>
                  <p className="mt-6">Assalamu'alaikum wr. wb.</p>
                  <p className="mt-4 whitespace-pre-wrap">{letterText || 'Isi surat belum diisi.'}</p>
                  <p className="mt-4">Demikian surat ini kami sampaikan. Atas perhatian dan kerja sama Saudara, kami ucapkan terima kasih.</p>
                  <p className="mt-4">Wassalamu'alaikum wr. wb.</p>
                  <div className="mt-8 text-right">
                    <p>Kepala Lajnah Pentashihan Mushaf Al-Qur'an,</p>
                    <p className="mt-8 text-ink-muted">Menunggu persetujuan</p>
                  </div>
                  <p className="mt-8 text-[10px] text-ink-muted">Pratinjau isi · {registration?.registration_no || '-'}</p>
                </div>
              )}
            </div>
            </div>
          </div>
);
