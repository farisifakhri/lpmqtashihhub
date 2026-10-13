import React from 'react';
import { CheckCircle2, AlertTriangle, AlertCircle, FileText, CreditCard, Eye, Printer } from 'lucide-react';
import { clsx } from 'clsx';
import { Button } from '@/components/ui/Button';
import { PrivateFileViewer } from '@/components/common/PrivateFileViewer';

export const ResultLetterPanel = ({
  activeMobileTab, decision, setDecision, loadOfficialTemplate, setIsDirty,
  isReadOnly, validationErrors, notes, setNotes, letterTab, setLetterTab,
  letterText, setLetterText,
  billingNo, setBillingNo,
  billingFileId, billingFileName, billingUploading, handleBillingFile, resultDocumentId,
  registration, publisher, showDocumentPdf,
  className,
}) => (
          <div
            className={className || `p-5 sm:p-6 bg-white rounded-xl border border-line shadow-2xs space-y-5 ${
              activeMobileTab === 'hasil' ? 'block' : 'hidden lg:block'
            }`}
          >
            <div className="border-b border-line pb-3">
              <h3 className="text-base font-bold text-ink">Hasil Pemeriksaan & Draf Surat</h3>
              <p className="text-xs text-ink-muted mt-0.5">
                Tentukan hasil pemeriksaan, tulis alasan, lalu periksa surat sebelum diajukan ke Kepala LPMQ.
              </p>
            </div>

            <div className="space-y-8">
            <div className="space-y-4 border-b border-line pb-7">
              <h4 className="text-sm font-semibold text-ink">Keputusan pemeriksaan</h4>

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
                  <p className="text-ink-muted text-xs mt-0.5 leading-relaxed">
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
                  <p className="text-ink-muted text-xs mt-0.5 leading-relaxed">
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

            {decision === 'PASSED' && (
              <div className="space-y-3.5 text-xs border-l-2 border-brand-700 pl-4 py-1">
                {/* Visual Requirement Notice Banner */}
                <div
                  className={clsx(
                    "p-3.5 rounded-xl border transition-all space-y-2.5",
                    (!billingNo?.trim() || !billingFileId)
                      ? "bg-civic-warningSoft border-civic-warningLine text-civic-warning shadow-2xs"
                      : "bg-civic-successSoft border-civic-successLine text-civic-success shadow-2xs"
                  )}
                  role="status"
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex items-center gap-2">
                      {(!billingNo?.trim() || !billingFileId) ? (
                        <AlertTriangle className="w-4 h-4 text-civic-warning shrink-0 mt-0.5" />
                      ) : (
                        <CheckCircle2 className="w-4 h-4 text-civic-success shrink-0 mt-0.5" />
                      )}
                      <div>
                        <h5 className="font-bold text-xs">
                          {(!billingNo?.trim() || !billingFileId)
                            ? "Prasyarat Pengajuan Draf Belum Lengkap"
                            : "Prasyarat Billing Lengkap untuk Pengajuan Draf"}
                        </h5>
                        <p className="text-xs opacity-80 mt-0.5 leading-relaxed">
                          {(!billingNo?.trim() || !billingFileId)
                            ? "Untuk naskah Lolos Verifikasi, SOP Pentashihan LPMQ mewajibkan pengisian Kode Billing SIMPONI dan unggahan berkas PDF billing sebelum draf diajukan atau disahkan."
                            : "Kode billing dan lampiran berkas PDF telah siap. Draf surat hasil verifikasi dapat diajukan kepada Kepala LPMQ."}
                        </p>
                      </div>
                    </div>
                    <span
                      className={clsx(
                        "px-2 py-0.5 rounded-full text-xs font-extrabold uppercase shrink-0 tracking-wider",
                        (!billingNo?.trim() || !billingFileId)
                          ? "bg-civic-warningSoft text-civic-warning border border-civic-warningLine"
                          : "bg-civic-successSoft text-civic-success border border-civic-successLine"
                      )}
                    >
                      {(!billingNo?.trim() || !billingFileId) ? "Wajib Dilengkapi" : "Siap Diajukan"}
                    </span>
                  </div>

                  {/* Checklist item badges */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-1 border-t border-black/10">
                    <div
                      className={clsx(
                        "flex items-center justify-between p-2 rounded-lg border text-xs",
                        billingNo?.trim()?.length >= 3
                          ? "bg-civic-successSoft border-civic-successLine text-civic-success"
                          : "bg-white/90 border-civic-warningLine text-civic-warning"
                      )}
                    >
                      <span className="font-semibold flex items-center gap-1.5">
                        {billingNo?.trim()?.length >= 3 ? (
                          <CheckCircle2 className="w-3.5 h-3.5 text-civic-success" />
                        ) : (
                          <AlertCircle className="w-3.5 h-3.5 text-civic-warning" />
                        )}
                        Kode Billing PNBP
                      </span>
                      <span className="font-mono font-bold text-xs">
                        {billingNo?.trim()?.length >= 3 ? billingNo.trim() : "Belum Diisi"}
                      </span>
                    </div>

                    <div
                      className={clsx(
                        "flex items-center justify-between p-2 rounded-lg border text-xs",
                        billingFileId
                          ? "bg-civic-successSoft border-civic-successLine text-civic-success"
                          : "bg-white/90 border-civic-warningLine text-civic-warning"
                      )}
                    >
                      <span className="font-semibold flex items-center gap-1.5">
                        {billingFileId ? (
                          <CheckCircle2 className="w-3.5 h-3.5 text-civic-success" />
                        ) : (
                          <AlertCircle className="w-3.5 h-3.5 text-civic-warning" />
                        )}
                        Berkas PDF Billing
                      </span>
                      <span className="font-bold text-xs truncate max-w-[130px]" title={billingFileName || 'Dokumen PDF'}>
                        {billingFileId ? (billingFileName || 'Terlampir') : "Belum Diunggah"}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Petunjuk Nominal Billing PNBP Sesuai Naskah */}
                {(() => {
                  const baseFee = Number(registration?.fee_sla_snapshot?.base_fee ?? registration?.service_type?.base_fee ?? 1000000);
                  const hasGroup3Content = (registration?.foreign_metadata?.jenis_naskah || []).some(
                    j => typeof j === 'string' && (j.startsWith('3.') || /transliterasi|terjemah|tajwid|waqaf|tafsir|perkata/i.test(j))
                  );
                  const addonsFee = Number(
                    registration?.fee_sla_snapshot?.addons_fee ??
                    (registration?.addons?.length
                      ? registration.addons.reduce((sum, item) => sum + Number(item.fee_snapshot || item.addon?.fee || 0), 0)
                      : (hasGroup3Content ? 500000 : 0))
                  );
                  const totalFee = Number(registration?.fee_sla_snapshot?.total_fee ?? (baseFee + addonsFee));
                  const serviceName = registration?.fee_sla_snapshot?.service_name || registration?.service_type?.name || "Mushaf Al-Qur'an";

                  return (
                    <div className="p-3 bg-brand-50/70 border border-brand-200 rounded-xl space-y-1 text-brand-950">
                      <div className="flex items-center justify-between">
                        <span className="font-bold flex items-center gap-1.5 text-brand-900">
                          <CreditCard className="w-4 h-4 text-brand-700" />
                          Nominal Billing PNBP (Simponi):
                        </span>
                        <span className="font-mono font-extrabold text-sm text-civic-success">
                          {totalFee === 0 ? 'Rp 0 (Bebas Tarif)' : `Rp ${totalFee.toLocaleString('id-ID')}`}
                        </span>
                      </div>
                      <p className="text-xs text-ink-muted leading-relaxed">
                        Layanan: <strong>{serviceName}</strong>
                        {addonsFee > 0 ? ` (Tarif Dasar: Rp ${baseFee.toLocaleString('id-ID')} + Addon Konten Naskah: Rp ${addonsFee.toLocaleString('id-ID')})` : ''}.
                        Pastikan nominal pada surat billing Simponi sesuai dengan perhitungan resmi ini.
                      </p>
                    </div>
                  );
                })()}

                <div>
                  <label htmlFor="verification-billing-no" className="block font-bold text-ink mb-1">
                    Kode billing PNBP <span className="text-civic-danger">*</span>
                  </label>
                  <input
                    id="verification-billing-no"
                    type="text"
                    value={billingNo || ''}
                    onChange={event => { setBillingNo(event.target.value); setIsDirty(true); }}
                    disabled={isReadOnly}
                    maxLength={191}
                    placeholder="Masukkan kode billing yang sudah diterbitkan (contoh: 82026090123)"
                    className={clsx(
                      "w-full rounded-lg border p-2.5 font-mono text-xs focus:outline-none focus:ring-2 transition-all",
                      validationErrors.billing_no
                        ? "border-civic-danger bg-civic-dangerSoft/20 text-civic-danger focus:ring-civic-danger/30 ring-1 ring-civic-danger"
                        : "border-line-strong bg-white focus:ring-brand-700/20"
                    )}
                  />
                  <p className="text-xs text-ink-muted mt-1">Kode ini akan tercantum pada PDF surat hasil dan tagihan pemohon.</p>
                  {validationErrors.billing_no && (
                    <p role="alert" className="text-civic-danger font-semibold flex items-center gap-1.5 mt-1.5">
                      <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                      <span>{validationErrors.billing_no}</span>
                    </p>
                  )}
                </div>

                <div className="border-t border-line pt-3 space-y-2">
                  <label htmlFor="verification-billing-file" className="block font-bold text-ink">
                    Dokumen billing PNBP (PDF) <span className="text-civic-danger">*</span>
                  </label>
                  {!isReadOnly && (
                    <input
                      id="verification-billing-file"
                      type="file"
                      accept="application/pdf,.pdf"
                      onChange={handleBillingFile}
                      disabled={billingUploading}
                      className={clsx(
                        "block w-full rounded-lg border bg-white p-2 text-xs",
                        validationErrors.billing_file_id ? "border-civic-danger ring-1 ring-civic-danger" : "border-line"
                      )}
                    />
                  )}
                  {billingUploading && <p role="status">Mengunggah dokumen billing…</p>}
                  {billingFileId && <p className="font-medium text-brand-900">Lampiran tersimpan: {billingFileName || 'Dokumen billing PNBP.pdf'}</p>}
                  {validationErrors.billing_file_id && (
                    <p role="alert" className="text-civic-danger font-semibold flex items-center gap-1.5 mt-1">
                      <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                      <span>{validationErrors.billing_file_id}</span>
                    </p>
                  )}
                  {billingFileId && (
                    <details className="rounded-lg border border-line bg-white p-3">
                      <summary className="cursor-pointer font-semibold text-brand-900">Tinjau lampiran billing</summary>
                      <div className="pt-3">
                        <PrivateFileViewer
                          fileId={billingFileId}
                          fileName={billingFileName || 'billing-pnbp.pdf'}
                          mimeType="application/pdf"
                          height="360px"
                          endpoint={isReadOnly && resultDocumentId ? `/verification-documents/${resultDocumentId}/attachments/${billingFileId}` : undefined}
                        />
                      </div>
                    </details>
                  )}
                </div>
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
              <h4 className="text-sm font-semibold text-ink">Naskah surat untuk penerbit</h4>
              <div className="flex flex-wrap items-center justify-between gap-2">
                <label className="font-bold text-ink flex items-center gap-1.5">
                  <FileText className="w-3.5 h-3.5 text-brand-800" />
                  Teks Draf Surat Hasil Verifikasi
                </label>
                <div className="flex flex-wrap items-center gap-2">
                  {showDocumentPdf && resultDocumentId && (
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => showDocumentPdf(resultDocumentId, 'Surat Hasil')}
                      className="text-xs h-7 px-2.5 text-brand-800 border-brand-300 hover:bg-brand-50"
                    >
                      <Printer className="w-3.5 h-3.5 mr-1 text-brand-700" />
                      Lihat PDF Resmi
                    </Button>
                  )}
                  <div className="flex items-center p-0.5 bg-surface-subtle border border-line rounded-lg text-xs">
                    <button
                      type="button"
                      onClick={() => setLetterTab('editor')}
                      className={`flex items-center gap-1 px-3 py-1 rounded-md text-xs font-semibold transition-all ${
                        letterTab === 'editor'
                          ? 'bg-white text-ink shadow-2xs font-bold'
                          : 'text-ink-muted hover:text-ink'
                      }`}
                    >
                      <FileText className="w-3.5 h-3.5" />
                      <span>Editor</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => setLetterTab('preview')}
                      className={`flex items-center gap-1 px-3 py-1 rounded-md text-xs font-semibold transition-all ${
                        letterTab === 'preview'
                          ? 'bg-white text-brand-900 shadow-2xs font-bold'
                          : 'text-ink-muted hover:text-ink'
                      }`}
                    >
                      <Eye className="w-3.5 h-3.5 text-brand-700" />
                      <span>Pratinjau</span>
                    </button>
                  </div>
                </div>
              </div>

              <p className="text-xs text-ink-muted leading-relaxed">
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
                <div className="flex flex-wrap items-center justify-between gap-2 text-xs text-ink-muted">
                  <span>{letterText.length}/10000 karakter</span>
                  {!isReadOnly && <button type="button" onClick={() => loadOfficialTemplate(decision)} className="font-semibold text-brand-800 hover:underline">Isi ulang dari contoh surat</button>}
                </div>
                </div>
              ) : (
                <div className="mx-auto max-w-[680px] min-h-[520px] bg-white border border-line-strong shadow-sm p-6 sm:p-10 text-[12px] leading-relaxed text-ink">
                  <div className="relative text-center border-b-2 border-ink pb-3 mb-6">
                    <img src="/favicon.png" alt="Lambang Kementerian Agama" className="h-12 w-12 object-contain absolute left-0 top-1/2 -translate-y-1/2 hidden sm:block" />
                    <div className="space-y-0.5">
                      <p className="font-bold text-xs uppercase tracking-wider">KEMENTERIAN AGAMA REPUBLIK INDONESIA</p>
                      <p className="font-bold text-xs uppercase tracking-wider">LAJNAH PENTASHIHAN MUSHAF AL-QUR'AN</p>
                      <p className="text-xs text-ink leading-tight">
                        Gedung Bayt Al-Qur'an & Museum Istiqlal, Jalan Raya TMII Pintu I Jakarta Timur 13560<br />
                        Telp: (021) 87798807, 8416466, 8416467, 8416468 Fax: (021) 87798807<br />
                        Website: http://lajnah.kemenag.go.id Email : lajnah@kemenag.go.id
                      </p>
                    </div>
                  </div>
                  <div className="space-y-1 mb-6">
                    <p>Nomor: <span className="text-ink-muted">Diisi saat persetujuan</span></p>
                    <p>Sifat: Biasa</p>
                    <p>Lampiran: {decision === 'PASSED' && billingFileId ? '1 berkas billing PNBP' : '-'}</p>
                    <p>Hal: {decision === 'PASSED' ? 'Hasil verifikasi dan pemberitahuan PNBP' : 'Hasil verifikasi - tidak lolos'}</p>
                  </div>
                  <p>Yth. Pimpinan {publisher?.legal_name || 'Penerbit'}</p>
                  <p>di {publisher?.address || 'alamat terdaftar'}</p>
                  <p className="mt-6">Assalamu'alaikum wr. wb.</p>
                  <p className="mt-4 whitespace-pre-wrap">{letterText || 'Isi surat belum diisi.'}</p>
                  {decision === 'PASSED' && billingNo && <p className="mt-4 font-bold">Kode billing PNBP: {billingNo}</p>}
                  <p className="mt-4">Demikian surat ini kami sampaikan. Atas perhatian dan kerja sama Saudara, kami ucapkan terima kasih.</p>
                  <p className="mt-4">Wassalamu'alaikum wr. wb.</p>
                  <div className="mt-8 text-right">
                    <p>Kepala Lajnah Pentashihan Mushaf Al-Qur'an,</p>
                    <p className="mt-8 text-ink-muted">Menunggu persetujuan</p>
                  </div>
                  <p className="mt-8 text-xs text-ink-muted">Pratinjau isi · {registration?.registration_no || '-'}</p>
                </div>
              )}
            </div>
            </div>
          </div>
);
