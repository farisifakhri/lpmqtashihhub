import React, { useRef, useEffect, useState } from 'react';
import { Printer, Download, X, Package, MapPin, Building2, Phone, Mail, FileText, CheckCircle2, AlertCircle } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { registrationApi } from '@/api/registration.api';

export const ShippingLabelDialog = ({ isOpen = true, onClose, registration }) => {
  const printRef = useRef(null);
  const [downloading, setDownloading] = useState(false);
  const [error, setError] = useState(null);

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

  const meta = registration.foreign_metadata || {};
  const publisher = registration.publisher || {};
  const regNo = registration.registration_no || 'REG-PENDING';
  const namaMushaf = registration.title || meta.nama_mushaf || meta.judul_mushaf || "Mushaf Al-Qur'an Standar Indonesia";
  const publisherName = publisher.legal_name || publisher.brand_name || publisher.name || meta.nama_penerbit || meta.nama_pemohon || 'Penerbit Terdaftar';
  const publisherAddress = publisher.address || publisher.legal_address || meta.alamat_penerbit || meta.alamat || 'Alamat Kantor Penerbit';
  const pjNama = meta.penanggung_jawab_produk || meta.nama_pj || meta.contact_person || publisher.legal_name || 'Penanggung Jawab Produk';
  const pjWa = meta.penanggung_jawab_wa || meta.no_telp || meta.no_wa || meta.telepon || publisher.phone || publisher.contact_phone || '-';
  const pjEmail = meta.penanggung_jawab_email || meta.email || publisher.email || publisher.contact_email || '-';
  const volumeCount = registration.physical_master_intake?.volume_count || registration.physical_volume_count || (registration.physical_master?.volume_count) || 30;
  const jenisMushaf = registration.service_type?.name || meta.jenis_mushaf || "Mushaf Al-Qur'an Standar Usmani";
  const kategori = registration.service_type?.category?.name || meta.kategori_pendaftaran || registration.registration_category || 'Tanda Tashih Baru';

  const handlePrint = () => {
    window.print();
  };

  const handleDownload = async () => {
    setDownloading(true);
    setError(null);
    try {
      const safeRegNo = (registration.registration_no || registration.id).replace(/[^a-zA-Z0-9_-]/g, '-');
      await registrationApi.downloadShippingLabelPdf(registration.id, `Label-Pengiriman-${safeRegNo}.pdf`);
    } catch (err) {
      setError(err.message || 'Gagal mengunduh label pengiriman PDF.');
    } finally {
      setDownloading(false);
    }
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="shipping-label-title"
      className="fixed inset-0 z-50 bg-ink/75 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4 animate-fadeIn print:p-0 print:bg-white print:static"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="bg-white w-full max-w-2xl rounded-2xl shadow-2xl border border-line flex flex-col max-h-[92vh] overflow-hidden print:max-h-none print:shadow-none print:border-none print:w-full">
        {/* Header Toolbar (Hidden during print) */}
        <div className="flex items-center justify-between px-5 py-3.5 border-b border-line bg-surface-subtle print:hidden">
          <div className="flex items-center gap-2">
            <Package className="w-5 h-5 text-brand-700" />
            <div>
              <h2 id="shipping-label-title" className="text-sm font-bold text-ink">
                Label Pengiriman Master Fisik ke LPMQ
              </h2>
              <p className="text-[11px] text-ink-muted">Format A4 resmi Kementerian Agama RI</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={handleDownload}
              disabled={downloading}
              icon={<Download className="w-4 h-4 text-brand-700" />}
              className="text-xs font-semibold text-brand-800 border-brand-300 hover:bg-brand-50"
            >
              {downloading ? 'Mengunduh...' : 'Unduh Label PDF'}
            </Button>
            <Button
              type="button"
              variant="primary"
              size="sm"
              onClick={handlePrint}
              icon={<Printer className="w-4 h-4" />}
              className="text-xs font-bold"
            >
              Cetak Label
            </Button>
            <button
              type="button"
              onClick={onClose}
              className="p-1.5 rounded-lg text-ink-muted hover:text-ink hover:bg-canvas transition-colors cursor-pointer"
              aria-label="Tutup dialog"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {error && (
          <div className="px-5 py-2.5 bg-civic-dangerSoft border-b border-civic-dangerLine text-civic-danger text-xs flex items-center gap-2 print:hidden">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {/* Printable Label Area */}
        <div className="p-6 overflow-y-auto space-y-4 print:p-0 print:overflow-visible">
          {/* Label Container styled like a shipping package label */}
          <div
            ref={printRef}
            className="border-2 border-black p-6 sm:p-8 bg-white space-y-6 print:border-2 print:border-black print:p-6"
          >
            {/* Header: Logo & Centered Title */}
            <div className="relative text-center pb-2">
              <img
                src="/favicon.png"
                alt="Logo Kemenag"
                className="w-14 h-14 object-contain absolute left-0 top-0 hidden sm:block"
              />
              <div className="space-y-0.5">
                <h3 className="text-sm sm:text-base font-bold text-ink uppercase tracking-wide">
                  Sistem Informasi Layanan Tashih
                </h3>
                <h4 className="text-sm sm:text-base font-bold text-ink uppercase tracking-wide">
                  Kementerian Agama Republik Indonesia
                </h4>
                <div className="pt-3">
                  <h2 className="text-xs sm:text-sm font-semibold text-ink">
                    Pengiriman Berkas Pendaftaran Mushaf Al-Qur’an
                  </h2>
                </div>
              </div>
            </div>

            {/* Official Table: Penerima, Pengirim, Detail Barang */}
            <table className="w-full border-collapse border border-black text-xs text-ink font-sans">
              <tbody>
                {/* Penerima */}
                <tr className="border border-black">
                  <td className="w-32 sm:w-36 p-3 sm:p-4 font-semibold align-top border-r border-black bg-slate-50/50">
                    Penerima
                  </td>
                  <td className="p-3 sm:p-4 leading-relaxed">
                    <p className="font-semibold">
                      Lajnah Pentashihan Mushaf Al-Qur’an Kementerian Agama Republik Indonesia
                    </p>
                    <p>Layanan Permohonan Tanda Tashih</p>
                    <p>Gedung Bayt Al-Qur'an & Museum Istiqlal Jalan Raya TMII Pintu I Jakarta Timur 13560</p>
                    <p className="text-ink-muted print:text-black">Telp: (021) 8416468 – 8416466</p>
                  </td>
                </tr>

                {/* Pengirim */}
                <tr className="border border-black">
                  <td className="p-3 sm:p-4 font-semibold align-top border-r border-black bg-slate-50/50">
                    Pengirim
                  </td>
                  <td className="p-3 sm:p-4 leading-relaxed">
                    <p className="font-bold uppercase text-ink">{publisherName}</p>
                    <p className="text-ink">{publisherAddress}</p>
                    <div className="pt-1 text-xs space-y-0.5">
                      {pjNama && pjNama !== publisherName && (
                        <p className="text-ink-muted print:text-black">U.p.: <strong className="text-ink">{pjNama}</strong></p>
                      )}
                      <p className="font-mono text-ink">Telp/WA: <strong>{pjWa}</strong></p>
                      {pjEmail && pjEmail !== '-' && (
                        <p className="text-ink-muted print:text-black text-[11px]">Email: {pjEmail}</p>
                      )}
                    </div>
                  </td>
                </tr>

                {/* Detail Barang */}
                <tr className="border border-black">
                  <td className="p-3 sm:p-4 font-semibold align-top border-r border-black bg-slate-50/50">
                    Detail barang
                  </td>
                  <td className="p-3 sm:p-4 leading-relaxed space-y-1">
                    <p className="font-bold text-ink">Mushaf Al-Qur’an</p>
                    <p>
                      No. Pendaftaran: <strong className="font-mono text-brand-800">{regNo}</strong>
                    </p>
                    <p>
                      Nama mushaf: <strong className="text-ink">{namaMushaf}</strong>
                    </p>
                    <p className="text-ink-muted print:text-black text-[11px]">
                      Jenis & Kategori: <span className="text-ink font-medium">{jenisMushaf}</span> ({kategori})
                    </p>
                    <p className="font-medium text-ink pt-0.5">
                      Jumlah: <strong className="text-brand-900">{volumeCount} Jilid</strong> (Master Naskah Fisik A4 per juz)
                    </p>
                  </td>
                </tr>
              </tbody>
            </table>

            {/* Catatan Bawah */}
            <div className="pt-2 text-[10px] text-ink-muted flex items-center justify-between border-t border-line print:border-black">
              <span>* Tempelkan label ini secara jelas pada bagian luar kardus atau paket pengiriman fisik naskah.</span>
              <span className="font-mono font-bold text-ink">LPMQ Kemenag RI</span>
            </div>
          </div>

          <div className="text-center print:hidden">
            <p className="text-xs text-ink-muted">
              Gunting atau tempelkan label ini di paket pengiriman master naskah ke LPMQ TMII.
            </p>
          </div>
        </div>

        {/* Footer (Hidden during print) */}
        <div className="px-5 py-3 border-t border-line bg-surface-subtle flex flex-wrap items-center justify-between gap-2 print:hidden">
          <p className="text-[11px] text-ink-muted hidden sm:block">
            Label siap dicetak atau diunduh sebagai berkas PDF resmi.
          </p>
          <div className="flex items-center gap-2 w-full sm:w-auto justify-end">
            <Button type="button" variant="outline" size="sm" onClick={onClose} className="text-xs">
              Tutup
            </Button>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={handleDownload}
              disabled={downloading}
              icon={<Download className="w-3.5 h-3.5 text-brand-700" />}
              className="text-xs font-semibold text-brand-800 border-brand-300 hover:bg-brand-50"
            >
              {downloading ? 'Mengunduh...' : 'Unduh Label PDF'}
            </Button>
            <Button
              type="button"
              variant="primary"
              size="sm"
              onClick={handlePrint}
              icon={<Printer className="w-3.5 h-3.5" />}
              className="text-xs font-bold"
            >
              Cetak Label Pengiriman
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ShippingLabelDialog;
