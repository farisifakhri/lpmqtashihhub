import React from 'react';
import { FileText, Printer, Download, CheckCircle2, ShieldCheck } from 'lucide-react';
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
  snapshot = null,
  metadata = [],
  onPrint,
  onDownload,
  className,
}) => {
  // Parse letterText safely if it was passed as raw JSON string
  const parsedLetterText = React.useMemo(() => {
    if (!letterText || typeof letterText !== 'string') return null;
    const trimmed = letterText.trim();
    if ((trimmed.startsWith('{') && trimmed.endsWith('}')) || (trimmed.startsWith('[') && trimmed.endsWith(']'))) {
      try {
        return JSON.parse(trimmed);
      } catch {
        return null;
      }
    }
    return null;
  }, [letterText]);

  const activeSnapshot = snapshot || parsedLetterText;
  const isPlainLetterText = letterText && !parsedLetterText && typeof letterText === 'string';

  return (
    <div
      className={clsx(
        'rounded-xl border border-line bg-white shadow-2xs overflow-hidden flex flex-col',
        className
      )}
    >
      {/* Header Bar */}
      <div className="bg-canvas border-b border-line p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
        <div className="space-y-1">
          <div className="flex flex-wrap items-center gap-2">
            <h3 className="font-bold text-ink text-sm">{title}</h3>
            {documentNo && (
              <span className="font-mono bg-white border border-line px-2 py-0.5 rounded text-ink font-semibold">
                {documentNo}
              </span>
            )}
            {version && (
              <span className="bg-brand-50 text-brand-800 border border-brand-100 px-2 py-0.5 rounded font-semibold">
                Versi {version}
              </span>
            )}
          </div>
          {metadata.length > 0 && (
            <div className="flex flex-wrap items-center gap-3 text-ink-muted pt-0.5">
              {metadata.map((item, idx) => (
                <span key={idx}>
                  {item.label}: <strong className="text-ink">{item.value}</strong>
                </span>
              ))}
            </div>
          )}
        </div>

        <div className="flex items-center gap-2 shrink-0">
          {onPrint && (
            <Button
              variant="outline"
              size="sm"
              onClick={onPrint}
              className="text-xs"
              title="Cetak Dokumen"
            >
              <Printer className="w-3.5 h-3.5 mr-1 text-brand-700" /> Cetak
            </Button>
          )}
          {onDownload && (
            <Button
              variant="outline"
              size="sm"
              onClick={onDownload}
              className="text-xs"
              title="Unduh Salinan Resmi"
            >
              <Download className="w-3.5 h-3.5 mr-1 text-brand-700" /> Unduh PDF
            </Button>
          )}
        </div>
      </div>

      {/* Content Area: File Viewer OR Official Letterhead Typography */}
      <div className="p-4 sm:p-6 overflow-auto max-h-[750px] bg-slate-50/50">
        {fileId ? (
          <PrivateFileViewer fileId={fileId} fileName={fileName} height="550px" />
        ) : letterHtml ? (
          <div
            className="prose prose-sm max-w-none text-ink leading-relaxed font-sans bg-white p-6 sm:p-8 rounded-xl border border-line shadow-2xs print:border-0 print:p-0"
            dangerouslySetInnerHTML={{ __html: letterHtml }}
          />
        ) : (
          /* Official Indonesian State Letter Layout (LPMQ Letterhead) */
          <div className="max-w-3xl mx-auto bg-white p-6 sm:p-10 rounded-xl border border-line shadow-xs space-y-6 text-ink print:border-0 print:p-0 print:shadow-none font-serif">
            {/* Kop Surat Resmi LPMQ Kemenag RI */}
            <header className="border-b-2 border-brand-900 pb-3 text-center space-y-1">
              <h2 className="text-xs sm:text-sm font-bold tracking-wider text-ink font-sans uppercase">
                KEMENTERIAN AGAMA REPUBLIK INDONESIA
              </h2>
              <h3 className="text-xs sm:text-xs font-bold tracking-wide text-brand-900 font-sans uppercase">
                BADAN LITBANG DAN DIKLAT KEMENTERIAN AGAMA
              </h3>
              <h4 className="text-sm sm:text-base font-black tracking-wide text-brand-950 font-sans uppercase">
                LAJNAH PENTASHIHAN MUSHAF AL-QUR'AN
              </h4>
              <p className="text-[11px] text-ink-muted font-sans leading-tight">
                Gedung Bayt Al-Qur'an & Museum Istiqlal, Jl. Raya TMII Pintu I, Jakarta Timur 13560<br />
                Telepon (021) 87798801 · Pos-el: lajnah@kemenag.go.id · Laman: lpmq.kemenag.go.id
              </p>
              <div className="w-full h-0.5 bg-brand-900 mt-2" />
              <div className="w-full h-[1px] bg-brand-900 mt-[2px]" />
            </header>

            {/* Judul & Nomor Dokumen */}
            <div className="text-center space-y-1 pt-1 font-sans">
              <h1 className="text-sm sm:text-base font-bold uppercase tracking-wide text-ink underline underline-offset-4">
                {title}
              </h1>
              {documentNo && (
                <p className="text-xs font-mono text-ink-muted">
                  Nomor: <strong className="text-ink">{documentNo}</strong>
                  {version > 1 && <span className="ml-2 font-sans text-brand-800">(Versi {version})</span>}
                </p>
              )}
            </div>

            {/* Tabel Identitas Naskah */}
            {activeSnapshot && (activeSnapshot.title || activeSnapshot.registration_no || activeSnapshot.publisher) && (
              <div className="bg-canvas/60 rounded-lg border border-line p-3 sm:p-4 text-xs font-sans space-y-2">
                <h5 className="font-bold text-ink border-b border-line pb-1.5 uppercase text-[11px] tracking-wider text-brand-900">
                  Data Naskah Mushaf Al-Qur'an
                </h5>
                <dl className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                  <div>
                    <dt className="text-ink-muted text-[11px]">Judul Naskah:</dt>
                    <dd className="font-semibold text-ink break-words">{activeSnapshot.title || '-'}</dd>
                  </div>
                  <div>
                    <dt className="text-ink-muted text-[11px]">Nomor Registrasi:</dt>
                    <dd className="font-mono font-semibold text-brand-800">{activeSnapshot.registration_no || '-'}</dd>
                  </div>
                  <div>
                    <dt className="text-ink-muted text-[11px]">Penerbit Pemohon:</dt>
                    <dd className="font-semibold text-ink break-words">{activeSnapshot.publisher || '-'}</dd>
                  </div>
                </dl>
              </div>
            )}

            {/* Isi Dokumen / Surat */}
            <div className="text-xs sm:text-sm leading-relaxed text-ink space-y-3 font-sans">
              {isPlainLetterText ? (
                <div className="whitespace-pre-wrap break-words p-4 bg-white rounded-lg border border-line">
                  {letterText}
                </div>
              ) : activeSnapshot?.letter_text ? (
                <div className="whitespace-pre-wrap break-words p-4 bg-white rounded-lg border border-line">
                  {activeSnapshot.letter_text}
                </div>
              ) : activeSnapshot?.notes ? (
                <div className="p-4 bg-white rounded-lg border border-line space-y-1">
                  <p className="font-semibold text-ink">Catatan / Ringkasan:</p>
                  <p className="whitespace-pre-wrap text-ink-muted">{activeSnapshot.notes}</p>
                </div>
              ) : (
                <div className="p-4 bg-white rounded-lg border border-line text-ink-muted space-y-2">
                  <p>
                    Dokumen ini merupakan salinan arsip resmi penetapan Lajnah Pentashihan Mushaf Al-Qur'an (LPMQ) Kementerian Agama Republik Indonesia.
                  </p>
                  <p>
                    Rincian lengkap dan tata letak dokumen cetak resmi dapat dilihat dan diunduh melalui tombol <strong>Lihat Dokumen PDF</strong> di atas.
                  </p>
                </div>
              )}

              {/* Rincian Verifikasi Awal (Jika Ada) */}
              {activeSnapshot?.verification && activeSnapshot.verification.length > 0 && (
                <div className="pt-2">
                  <h6 className="font-bold text-xs text-ink mb-1.5">Riwayat Verifikasi Awal:</h6>
                  <div className="border border-line rounded-lg overflow-hidden">
                    <table className="w-full text-left text-xs">
                      <thead className="bg-canvas border-b border-line text-ink-muted">
                        <tr>
                          <th className="p-2">Verifikator</th>
                          <th className="p-2">Keputusan</th>
                          <th className="p-2">Catatan</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-line">
                        {activeSnapshot.verification.map((v, idx) => (
                          <tr key={idx} className="bg-white">
                            <td className="p-2 font-medium text-ink">{v.verifier?.name || '-'}</td>
                            <td className="p-2">
                              <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${v.decision === 'PASSED' ? 'bg-brand-50 text-brand-800' : 'bg-civic-warningSoft text-civic-warning'}`}>
                                {v.decision || 'SESUAI'}
                              </span>
                            </td>
                            <td className="p-2 text-ink-muted">{v.notes || '-'}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              {/* Rincian Sidang Pentashihan (Jika Ada) */}
              {activeSnapshot?.assignments && activeSnapshot.assignments.length > 0 && (
                <div className="pt-2">
                  <h6 className="font-bold text-xs text-ink mb-1.5">Riwayat Sidang Pentashihan:</h6>
                  <div className="border border-line rounded-lg overflow-hidden">
                    <table className="w-full text-left text-xs">
                      <thead className="bg-canvas border-b border-line text-ink-muted">
                        <tr>
                          <th className="p-2">Anggota Sidang</th>
                          <th className="p-2">Tahap / Tim</th>
                          <th className="p-2">Status</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-line">
                        {activeSnapshot.assignments.map((a, idx) => (
                          <tr key={idx} className="bg-white">
                            <td className="p-2 font-medium text-ink">{a.assignee || '-'}</td>
                            <td className="p-2 text-ink-muted">{a.team?.name || 'Tim Pentashihan'}</td>
                            <td className="p-2">
                              <span className="px-2 py-0.5 rounded bg-surface-subtle border border-line text-[10px] font-semibold text-ink">
                                {a.status || '-'}
                              </span>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              {/* Rincian Billing PNBP (Jika Ada) */}
              {activeSnapshot?.billing_no && (
                <div className="p-3 bg-brand-50 border border-brand-200 rounded-lg text-xs space-y-1">
                  <p className="font-bold text-brand-900">Ketetapan Pembayaran PNBP:</p>
                  <p className="text-ink-muted">
                    Kode Billing Simponi: <strong className="font-mono text-brand-800">{activeSnapshot.billing_no}</strong>
                  </p>
                </div>
              )}
            </div>

            {/* Footer / Pengesahan Resmi */}
            <footer className="pt-6 border-t border-line font-sans flex flex-col sm:flex-row items-start sm:items-end justify-between gap-4 text-xs">
              <div className="space-y-1 text-[11px] text-ink-muted">
                <div className="flex items-center gap-1.5 text-brand-800 font-semibold">
                  <ShieldCheck className="w-4 h-4 text-brand-700" />
                  <span>Dokumen Resmi Terverifikasi Sistem LPMQ</span>
                </div>
                <p>Salinan dokumen digital sah sesuai ketentuan perundang-undangan.</p>
              </div>

              <div className="text-right space-y-1 sm:min-w-[200px]">
                <p className="text-ink font-semibold">
                  Lajnah Pentashihan Mushaf Al-Qur'an
                </p>
                <div className="py-2 flex justify-end">
                  <div className="px-3 py-1.5 bg-brand-50 border border-brand-200 rounded text-brand-900 text-[10px] font-mono font-bold inline-flex items-center gap-1">
                    <CheckCircle2 className="w-3.5 h-3.5 text-brand-700" />
                    TERVERIFIKASI DIGITAL
                  </div>
                </div>
                <p className="font-bold text-ink underline">
                  {activeSnapshot?.verifier_name || 'Kepala LPMQ Kemenag RI'}
                </p>
                <p className="text-[10px] text-ink-muted">Kementerian Agama RI</p>
              </div>
            </footer>
          </div>
        )}
      </div>
    </div>
  );
};

export default DocumentPreview;
