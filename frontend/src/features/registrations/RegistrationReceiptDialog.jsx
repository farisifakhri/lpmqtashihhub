import React, { useRef, useEffect, useState } from 'react';
import {
  Printer,
  Download,
  CheckCircle2,
  X,
  QrCode,
  AlertCircle,
  Phone,
  Mail,
  Send,
  Eye,
  FileText,
  Loader2,
} from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { registrationApi } from '@/api/registration.api';

export const RegistrationReceiptDialog = ({ isOpen = true, onClose, registration }) => {
  const printRef = useRef(null);
  const [downloading, setDownloading] = useState(false);
  const [downloadError, setDownloadError] = useState('');
  const [viewMode, setViewMode] = useState('dialog'); // 'dialog' | 'print_preview'
  const [pdfUrl, setPdfUrl] = useState(null);

  useEffect(() => () => {
    if (pdfUrl) URL.revokeObjectURL(pdfUrl);
  }, [pdfUrl]);

  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen || !registration) return null;

  const handlePrint = async () => {
    setDownloading(true);
    setDownloadError('');
    try {
      const blob = await registrationApi.getReceiptPdf(registration.id);
      setPdfUrl(URL.createObjectURL(blob));
    } catch (err) {
      setDownloadError(err.message || 'Gagal membuka tanda terima PDF.');
    } finally {
      setDownloading(false);
    }
  };

  const handleDownloadPdf = async () => {
    setDownloading(true);
    setDownloadError('');
    try {
      const safeRegNo = (registration.registration_no || registration.id || 'REG').replace(/[^a-zA-Z0-9_-]/g, '-');
      await registrationApi.downloadReceiptPdf(registration.id, `Tanda-Terima-${safeRegNo}.pdf`);
    } catch (err) {
      setDownloadError(err.message || 'Gagal mengunduh berkas PDF.');
    } finally {
      setDownloading(false);
    }
  };

  const regNo = registration.registration_no || 'REG-PENDING';
  const categoryLabel =
    registration.registration_category === 'EXTENSION'
      ? 'Perpanjangan Surat Tanda Tashih'
      : registration.registration_category === 'FOREIGN_MANUSCRIPT'
      ? "Mushaf Al-Qur'an Cetakan Luar Negeri (Impor)"
      : 'Surat Tanda Tashih Baru';

  const dateFormatted = new Date(registration.created_at || Date.now()).toLocaleDateString('id-ID', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    timeZone: 'Asia/Jakarta',
  });

  const meta = registration.foreign_metadata || {};
  const namaMushaf = meta.nama_mushaf || '';
  const jenisMushaf = meta.jenis_mushaf || 'Mushaf Standar Usmani';
  const namaPercetakan = meta.nama_percetakan || '';
  const pjNama = meta.penanggung_jawab_produk || registration.publisher?.name || 'Penanggung Jawab Pemohon';
  const pjWa = meta.penanggung_jawab_wa || registration.publisher?.phone || '';
  const pjEmail = meta.penanggung_jawab_email || registration.publisher?.email || '';

  return (
    <div
      className="fixed inset-0 z-50 bg-ink/75 backdrop-blur-xs flex items-center justify-center p-2 sm:p-4 animate-fadeIn print:p-0 print:bg-white print:static"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      {pdfUrl && (
        <div role="dialog" aria-modal="true" aria-label="PDF tanda terima pendaftaran" className="fixed inset-0 z-[60] bg-ink/70 p-3 sm:p-6 flex items-center justify-center" onClick={event => event.stopPropagation()}>
          <div className="w-full max-w-5xl h-[92vh] rounded-xl bg-white shadow-xl flex flex-col overflow-hidden">
            <div className="flex flex-wrap items-center justify-between gap-2 border-b border-line px-4 py-3">
              <div>
                <h2 className="text-sm font-bold text-ink">PDF Tanda Terima Pendaftaran</h2>
                <p className="text-xs text-ink-muted">Gunakan ikon cetak pada toolbar PDF untuk mencetak dokumen berkop LPMQ.</p>
              </div>
              <div className="flex items-center gap-2">
                <a href={pdfUrl} download={`tanda-terima-${regNo}.pdf`} className="rounded-lg border border-line px-3 py-1.5 text-xs font-semibold text-ink hover:bg-canvas">Unduh PDF</a>
                <Button variant="outline" className="text-xs" onClick={() => setPdfUrl(null)}>Tutup</Button>
              </div>
            </div>
            <iframe title="Penampil PDF tanda terima pendaftaran" src={pdfUrl} className="flex-1 w-full border-0" />
          </div>
        </div>
      )}
      <div
        className={`relative bg-white rounded-2xl shadow-2xl w-full max-h-[92vh] flex flex-col border border-line overflow-hidden transition-all duration-200 print:max-h-none print:shadow-none print:border-none print:w-full ${
          viewMode === 'print_preview' ? 'max-w-3xl' : 'max-w-2xl'
        }`}
      >
        {/* Sticky Header Bar (Never Cut Off) */}
        <div className="shrink-0 flex items-center justify-between px-4 sm:px-6 py-3 border-b border-line bg-canvas print:hidden">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-brand-700 shrink-0" />
            <span className="font-bold text-ink text-xs sm:text-sm">
              Tanda Terima Permohonan Surat Tanda Tashih
            </span>
            <span className="hidden md:inline-block font-mono text-[11px] font-semibold text-brand-800 bg-brand-50 px-2 py-0.5 rounded border border-brand-200">
              {regNo}
            </span>
          </div>

          <div className="flex items-center gap-1.5 sm:gap-2">
            {/* View Mode Toggle */}
            <div className="hidden sm:flex items-center bg-surface-subtle p-0.5 rounded-lg border border-line text-[11px]">
              <button
                type="button"
                onClick={() => setViewMode('dialog')}
                className={`px-2.5 py-1 rounded-md font-medium transition-all cursor-pointer ${
                  viewMode === 'dialog'
                    ? 'bg-white text-brand-900 font-bold shadow-2xs'
                    : 'text-ink-muted hover:text-ink'
                }`}
              >
                Tampilan Dialog
              </button>
              <button
                type="button"
                onClick={() => setViewMode('print_preview')}
                className={`px-2.5 py-1 rounded-md font-medium transition-all flex items-center gap-1 cursor-pointer ${
                  viewMode === 'print_preview'
                    ? 'bg-white text-brand-900 font-bold shadow-2xs'
                    : 'text-ink-muted hover:text-ink'
                }`}
              >
                <Eye className="w-3 h-3 text-brand-700" />
                Print Preview (A4)
              </button>
            </div>

            {/* Download PDF Button */}
            <Button
              variant="outline"
              size="sm"
              disabled={downloading}
              onClick={handleDownloadPdf}
              className="text-xs font-bold py-1 px-2.5 sm:px-3 text-ink hover:text-brand-800 border-line"
              title="Unduh berkas PDF resmi"
            >
              {downloading ? (
                <Loader2 className="w-3.5 h-3.5 mr-1 animate-spin text-brand-700" />
              ) : (
                <Download className="w-3.5 h-3.5 mr-1 text-brand-700" />
              )}
              {downloading ? 'Mengunduh...' : 'Unduh PDF'}
            </Button>

            {/* Print Button */}
            <Button
              variant="primary"
              size="sm"
              onClick={handlePrint}
              className="text-xs font-bold py-1 px-2.5 sm:px-3"
              title="Cetak langsung menggunakan printer atau cetak ke PDF"
            >
              <Printer className="w-3.5 h-3.5 mr-1" />
              Cetak
            </Button>

            {/* Close Button */}
            <button
              type="button"
              onClick={onClose}
              aria-label="Tutup"
              className="p-1.5 text-ink-muted hover:text-ink rounded-lg hover:bg-surface-strong transition-colors cursor-pointer ml-1"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Download Error Banner if any */}
        {downloadError && (
          <div className="shrink-0 px-4 py-2 bg-civic-dangerSoft border-b border-civic-dangerLine text-xs text-civic-danger flex items-center justify-between">
            <span>{downloadError}</span>
            <button type="button" onClick={() => setDownloadError('')} className="underline text-[11px] ml-2 font-bold">
              Tutup
            </button>
          </div>
        )}

        {/* Scrollable Container (With Print Preview Wrapping) */}
        <div
          className={`flex-1 overflow-y-auto ${
            viewMode === 'print_preview'
              ? 'p-4 sm:p-8 bg-surface-subtle flex justify-center'
              : 'p-4 sm:p-6 bg-white'
          }`}
        >
          {/* Printable Sheet (Simulating an A4 Sheet in Print Preview mode) */}
          <div
            ref={printRef}
            className={`w-full text-ink printable-receipt bg-white ${
              viewMode === 'print_preview'
                ? 'max-w-[210mm] min-h-[280mm] p-8 sm:p-10 shadow-lg border border-line-strong rounded-sm space-y-5 my-auto'
                : 'space-y-4'
            }`}
          >
            {/* Official Letterhead (Kop Surat Resmi LPMQ Kemenag RI) */}
            <div className="text-center border-b-2 border-ink pb-3 space-y-0.5">
              <p className="text-[10px] font-bold tracking-widest uppercase text-ink-muted">
                Kementerian Agama Republik Indonesia
              </p>
              <h2 className="text-sm sm:text-base font-black tracking-tight text-ink uppercase">
                Lajnah Pentashihan Mushaf Al-Qur'an (LPMQ)
              </h2>
              <p className="text-[9px] text-ink-muted">
                Gedung Bayt Al-Qur'an & Museum Istiqlal, TMII, Jakarta Timur 13560 · Telp: (021) 87798801 · Website: tashih.kemenag.go.id
              </p>
            </div>

            {/* Title and Reg No */}
            <div className="text-center space-y-1">
              <h3 className="text-xs sm:text-sm font-extrabold uppercase tracking-wide text-ink underline decoration-1 underline-offset-4">
                Tanda Terima Permohonan Surat Tanda Tashih
              </h3>
              <p className="font-mono text-xs font-black text-brand-800 tracking-wider">
                NOMOR REGISTRASI: {regNo}
              </p>
            </div>

            {/* Details Table */}
            <div className="border border-line rounded-lg overflow-hidden text-[11px]">
              <table className="w-full divide-y divide-line">
                <tbody className="divide-y divide-line">
                  <tr className="bg-canvas/60">
                    <td className="py-1.5 px-3 font-bold text-ink w-2/5">Kategori Permohonan</td>
                    <td className="py-1.5 px-3 text-ink font-semibold">{categoryLabel}</td>
                  </tr>
                  <tr>
                    <td className="py-1.5 px-3 font-bold text-ink">Tanggal & Waktu Permohonan</td>
                    <td className="py-1.5 px-3 text-ink">{dateFormatted} WIB</td>
                  </tr>
                  <tr className="bg-canvas/60">
                    <td className="py-1.5 px-3 font-bold text-ink">Nama Penerbit / Pemohon</td>
                    <td className="py-1.5 px-3 text-ink font-bold">
                      {registration.publisher?.legal_name || 'Penerbit Terdaftar'}
                    </td>
                  </tr>
                  <tr>
                    <td className="py-1.5 px-3 font-bold text-ink">Nama Produk / Judul Naskah</td>
                    <td className="py-1.5 px-3 text-ink font-bold">{registration.title}</td>
                  </tr>
                  {namaMushaf && (
                    <tr className="bg-canvas/60">
                      <td className="py-1.5 px-3 font-bold text-ink">Nama Mushaf</td>
                      <td className="py-1.5 px-3 text-ink font-semibold text-brand-800">{namaMushaf}</td>
                    </tr>
                  )}
                  <tr>
                    <td className="py-1.5 px-3 font-bold text-ink">Jenis Mushaf (Standar LPMQ)</td>
                    <td className="py-1.5 px-3 text-ink font-semibold">{jenisMushaf}</td>
                  </tr>
                  {namaPercetakan && (
                    <tr className="bg-canvas/60">
                      <td className="py-1.5 px-3 font-bold text-ink">Nama Percetakan</td>
                      <td className="py-1.5 px-3 text-ink">{namaPercetakan}</td>
                    </tr>
                  )}
                  <tr>
                    <td className="py-1.5 px-3 font-bold text-ink">Penanggung Jawab Produk</td>
                    <td className="py-1.5 px-3 text-ink font-semibold">{pjNama}</td>
                  </tr>
                  <tr className="bg-canvas/60">
                    <td className="py-1.5 px-3 font-bold text-ink">Kontak Penanggung Jawab</td>
                    <td className="py-1.5 px-3 text-ink">
                      <div className="flex flex-wrap items-center gap-x-3 gap-y-0.5 font-mono text-[11px]">
                        {pjWa && (
                          <span className="inline-flex items-center gap-1 text-ink">
                            <Phone className="w-3 h-3 text-brand-700" />
                            {pjWa}
                          </span>
                        )}
                        {pjEmail && (
                          <span className="inline-flex items-center gap-1 text-ink">
                            <Mail className="w-3 h-3 text-brand-700" />
                            {pjEmail}
                          </span>
                        )}
                        {!pjWa && !pjEmail && <span className="text-ink-muted italic">Belum dicantumkan</span>}
                      </div>
                    </td>
                  </tr>
                  {registration.foreign_metadata && (
                    <>
                      {(registration.foreign_metadata.country_of_origin || registration.foreign_metadata.negara_asal_mushaf) && (
                        <tr>
                          <td className="py-1.5 px-3 font-bold text-ink">Negara Asal Mushaf</td>
                          <td className="py-1.5 px-3 text-ink font-semibold">
                            {registration.foreign_metadata.country_of_origin || registration.foreign_metadata.negara_asal_mushaf}
                            {registration.foreign_metadata.recommendation_decree_no ? ` (No: ${registration.foreign_metadata.recommendation_decree_no})` : ''}
                          </td>
                        </tr>
                      )}
                      {(registration.foreign_metadata.penerbit_asal_mushaf || registration.foreign_metadata.foreign_publisher_name) && (
                        <tr className="bg-canvas/60">
                          <td className="py-1.5 px-3 font-bold text-ink">Penerbit Asal</td>
                          <td className="py-1.5 px-3 text-ink">
                            {registration.foreign_metadata.penerbit_asal_mushaf || registration.foreign_metadata.foreign_publisher_name}
                          </td>
                        </tr>
                      )}
                      {(registration.foreign_metadata.lembaga_pentashih_asal_mushaf || registration.foreign_tashih_institution) && (
                        <tr>
                          <td className="py-1.5 px-3 font-bold text-ink">Lembaga Pentashih Asal</td>
                          <td className="py-1.5 px-3 text-ink">
                            {registration.foreign_metadata.lembaga_pentashih_asal_mushaf || registration.foreign_tashih_institution}
                          </td>
                        </tr>
                      )}
                    </>
                  )}
                  <tr className="bg-canvas/60">
                    <td className="py-1.5 px-3 font-bold text-ink">Status Pendaftaran</td>
                    <td className="py-1.5 px-3">
                      <span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold bg-brand-100 text-brand-800">
                        Terdaftar Resmi di Sistem LPMQ Kemenag RI
                      </span>
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>

            {/* Saluran Notifikasi Otomatis Box */}
            {(pjWa || pjEmail) && (
              <div className="p-3 rounded-lg bg-brand-50/80 border border-brand-200 text-[11px] space-y-0.5">
                <p className="font-bold text-brand-900 flex items-center gap-1.5">
                  <Send className="w-3 h-3 text-brand-700" />
                  Saluran Notifikasi Otomatis Aktif
                </p>
                <p className="text-brand-800 leading-snug">
                  Pemberitahuan verifikasi berkas, tagihan PNBP (SIMPONI), hingga STT akan dikirim ke:
                  {pjEmail && <span className="font-semibold"> Email ({pjEmail})</span>}
                  {pjEmail && pjWa && <span> dan </span>}
                  {pjWa && <span className="font-semibold"> WhatsApp ({pjWa})</span>}.
                </p>
              </div>
            )}

            {/* Instructions Box */}
            <div className="p-3 rounded-lg bg-canvas border border-line text-[11px] space-y-1">
              <p className="font-bold text-ink flex items-center gap-1.5">
                <AlertCircle className="w-3.5 h-3.5 text-civic-warning shrink-0" />
                Petunjuk Langkah Selanjutnya:
              </p>
              <ol className="list-decimal list-inside text-ink-muted space-y-0.5 pl-0.5 leading-snug">
                <li>Cetak lembar tanda terima ini sebanyak <strong>1 (satu) eksemplar</strong> sebagai bukti resmi pendaftaran.</li>
                <li>
                  Siapkan naskah master cetak fisik (kertas HVS/A4 dijilid rapi per juz) beserta bukti ini untuk diserahkan ke <strong>Loket Pelayanan LPMQ TMII Jakarta</strong> jika permohonan memerlukan verifikasi fisik.
                </li>
                <li>
                  Pantau progres status secara berkala melalui menu <strong>Detail Permohonan</strong> pada aplikasi portal Tashih Hub.
                </li>
              </ol>
            </div>

            {/* Footer QR & Verification Timestamp */}
            <div className="flex items-center justify-between pt-3 border-t border-line text-[10px] text-ink-muted">
              <div className="flex items-center gap-2.5">
                <div className="p-1.5 border border-line-strong rounded-lg bg-canvas">
                  <QrCode className="w-7 h-7 text-ink" />
                </div>
                <div className="leading-tight">
                  <p className="font-bold text-ink">Verifikasi QR Sistem Pendaftaran</p>
                  <p className="font-mono text-[9px] text-ink-muted">{regNo}</p>
                  <p className="text-[9px] text-brand-700 font-semibold">Sah & Terverifikasi Otomatis</p>
                </div>
              </div>

              <div className="text-right leading-tight">
                <p>Diterbitkan secara elektronik oleh</p>
                <p className="font-bold text-ink">Sistem Layanan Tanda Tashih LPMQ</p>
                <p className="text-[9px] text-ink-muted">tashih.kemenag.go.id</p>
              </div>
            </div>
          </div>
        </div>

        {/* Sticky Footer Bar (Never Cut Off) */}
        <div className="shrink-0 px-4 sm:px-6 py-2.5 bg-canvas border-t border-line flex items-center justify-between print:hidden">
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setViewMode((prev) => (prev === 'dialog' ? 'print_preview' : 'dialog'))}
              className="text-[11px] font-semibold text-brand-800 hover:underline flex items-center gap-1 cursor-pointer sm:hidden"
            >
              <Eye className="w-3.5 h-3.5" />
              {viewMode === 'print_preview' ? 'Mode Dialog' : 'Print Preview'}
            </button>
            <span className="text-[11px] text-ink-muted hidden sm:inline">
              Bukti pendaftaran resmi tersimpan otomatis di akun penerbit
            </span>
          </div>

          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" onClick={onClose} className="text-xs py-1 px-3">
              Tutup
            </Button>
            <Button
              variant="outline"
              size="sm"
              disabled={downloading}
              onClick={handleDownloadPdf}
              className="text-xs font-bold py-1 px-3 text-ink hover:text-brand-800 border-line"
            >
              {downloading ? (
                <Loader2 className="w-3.5 h-3.5 mr-1 animate-spin text-brand-700" />
              ) : (
                <Download className="w-3.5 h-3.5 mr-1 text-brand-700" />
              )}
              Unduh PDF
            </Button>
            <Button variant="primary" size="sm" onClick={handlePrint} className="text-xs font-bold py-1 px-3">
              <Printer className="w-3.5 h-3.5 mr-1" />
              Cetak
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default RegistrationReceiptDialog;
