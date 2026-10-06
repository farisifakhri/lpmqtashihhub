import React, { useRef, useEffect } from 'react';
import { Printer, Download, X, Package, MapPin, Building2, Phone, Mail, FileText, CheckCircle2 } from 'lucide-react';
import { Button } from '@/components/ui/Button';

export const ShippingLabelDialog = ({ isOpen = true, onClose, registration }) => {
  const printRef = useRef(null);

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
  const regNo = registration.registration_no || 'REG-PENDING';
  const namaMushaf = meta.nama_mushaf || registration.title || 'Naskah Mushaf Al-Qur\'an';
  const publisherName = registration.publisher?.name || 'Penerbit Pemohon';
  const publisherAddress = registration.publisher?.address || '-';
  const pjNama = meta.penanggung_jawab_produk || registration.publisher?.name || '-';
  const pjWa = meta.penanggung_jawab_wa || registration.publisher?.phone || '-';
  const pjEmail = meta.penanggung_jawab_email || registration.publisher?.email || '-';
  const volumeCount = registration.physical_master_intake?.volume_count || 30;
  const jenisMushaf = meta.jenis_mushaf || 'Mushaf Standar Usmani';
  const kategori = meta.kategori_pendaftaran || registration.registration_category || 'Mushaf Baru';

  const handlePrint = () => {
    window.print();
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
      <div className="bg-white w-full max-w-2xl rounded-2xl shadow-2xl border border-line flex flex-col max-h-[90vh] overflow-hidden print:max-h-none print:shadow-none print:border-none print:w-full">
        {/* Header Toolbar (Hidden during print) */}
        <div className="flex items-center justify-between px-5 py-3.5 border-b border-line bg-surface-subtle print:hidden">
          <div className="flex items-center gap-2">
            <Package className="w-5 h-5 text-brand-700" />
            <h2 id="shipping-label-title" className="text-sm font-bold text-ink">
              Label Pengiriman Master Fisik ke LPMQ
            </h2>
          </div>
          <div className="flex items-center gap-2">
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

        {/* Printable Label Area */}
        <div className="p-6 overflow-y-auto space-y-4 print:p-0 print:overflow-visible">
          {/* Label Container styled like a shipping package label */}
          <div
            ref={printRef}
            className="border-2 border-dashed border-ink/40 p-6 rounded-2xl bg-white space-y-5 print:border-2 print:border-black print:rounded-none print:p-6"
          >
            {/* Top Bar: Official Branding & Document Title */}
            <div className="border-b-2 border-ink pb-3 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
              <div className="flex items-center gap-3">
                <img
                  src="/favicon.png"
                  alt="Logo LPMQ"
                  className="w-12 h-12 object-contain shrink-0"
                />
                <div>
                  <p className="text-[11px] font-bold uppercase tracking-wider text-ink">
                    Kementerian Agama Republik Indonesia
                  </p>
                  <p className="text-xs font-black text-brand-900 tracking-tight">
                    Lajnah Pentashihan Mushaf Al-Qur'an (LPMQ)
                  </p>
                  <p className="text-[10px] text-ink-muted">
                    Layanan Surat Tanda Tashih — Bayt Al-Qur'an & Museum Istiqlal TMII
                  </p>
                </div>
              </div>
              <div className="text-right sm:self-center bg-brand-50 border border-brand-200 px-3 py-1.5 rounded-lg print:border-black print:bg-transparent">
                <span className="text-[10px] uppercase font-bold text-brand-900 block">
                  Nomor Registrasi
                </span>
                <span className="font-mono text-sm sm:text-base font-black text-brand-950 tracking-wider">
                  {regNo}
                </span>
              </div>
            </div>

            {/* Recipient & Sender Columns */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
              {/* PENERIMA (TUJUAN) */}
              <div className="border-2 border-brand-800/80 rounded-xl p-3.5 bg-brand-50/40 print:border-black print:bg-transparent space-y-2">
                <div className="flex items-center gap-1.5 border-b border-brand-200 pb-1.5 print:border-black">
                  <MapPin className="w-4 h-4 text-brand-800" />
                  <span className="font-black text-xs uppercase tracking-wider text-brand-950">
                    Kepada (Tujuan Pengiriman):
                  </span>
                </div>
                <div className="space-y-1 text-ink leading-relaxed">
                  <p className="font-black text-xs text-brand-950">
                    LOKET PELAYANAN PENTASHIHAN LPMQ
                  </p>
                  <p className="font-semibold text-[11px]">
                    Gedung Bayt Al-Qur'an & Museum Istiqlal
                  </p>
                  <p className="text-[11px] text-ink-muted print:text-black">
                    Jl. Raya TMII Pintu I, Kel. Pinang Ranti, Kec. Makasar, Jakarta Timur 13560
                  </p>
                  <p className="text-[11px] pt-1">
                    <span className="font-bold text-ink">Jam Layanan:</span> Senin – Jumat, 08.00 – 15.00 WIB
                  </p>
                </div>
              </div>

              {/* PENGIRIM */}
              <div className="border border-line rounded-xl p-3.5 bg-canvas/70 print:border-black print:bg-transparent space-y-2">
                <div className="flex items-center gap-1.5 border-b border-line pb-1.5 print:border-black">
                  <Building2 className="w-4 h-4 text-ink-muted" />
                  <span className="font-bold text-xs uppercase tracking-wider text-ink">
                    Pengirim (Penerbit):
                  </span>
                </div>
                <div className="space-y-1 text-ink leading-relaxed text-[11px]">
                  <p className="font-black text-xs text-ink">{publisherName}</p>
                  <p className="text-ink-muted print:text-black">{publisherAddress}</p>
                  <p className="pt-1">
                    <span className="font-semibold">Penanggung Jawab:</span> {pjNama}
                  </p>
                  {pjWa && (
                    <p>
                      <span className="font-semibold">WhatsApp / Telp:</span> {pjWa}
                    </p>
                  )}
                  {pjEmail && (
                    <p>
                      <span className="font-semibold">Email:</span> {pjEmail}
                    </p>
                  )}
                </div>
              </div>
            </div>

            {/* Package Details Box */}
            <div className="border border-line rounded-xl p-3.5 bg-surface-subtle print:border-black print:bg-transparent text-xs space-y-2">
              <p className="font-bold text-ink flex items-center gap-1.5 border-b border-line pb-1.5 print:border-black">
                <FileText className="w-3.5 h-3.5 text-brand-700" />
                Informasi Isi Paket Master Fisik:
              </p>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-[11px]">
                <div>
                  <span className="text-ink-muted block text-[10px]">Nama Mushaf:</span>
                  <span className="font-bold text-ink">{namaMushaf}</span>
                </div>
                <div>
                  <span className="text-ink-muted block text-[10px]">Kategori:</span>
                  <span className="font-semibold text-ink">{kategori}</span>
                </div>
                <div>
                  <span className="text-ink-muted block text-[10px]">Standar Mushaf:</span>
                  <span className="font-semibold text-ink">{jenisMushaf}</span>
                </div>
                <div>
                  <span className="text-ink-muted block text-[10px]">Jumlah Jilid Fisik:</span>
                  <span className="font-bold text-brand-900">{volumeCount} Jilid (Per Juz A4)</span>
                </div>
              </div>
            </div>

            {/* Important Notice */}
            <div className="text-[10px] text-ink-muted border-t border-line pt-2 print:border-black flex items-center justify-between">
              <span>* Tempelkan label ini di permukaan atas kardus / paket pengiriman master fisik naskah.</span>
              <span className="font-mono text-[9px]">Dicetak via Aplikasi Layanan STT LPMQ</span>
            </div>
          </div>

          <div className="text-center print:hidden">
            <p className="text-xs text-ink-muted">
              Gunting atau tempelkan label ini di paket pengiriman master naskah ke Loket TMII LPMQ.
            </p>
          </div>
        </div>

        {/* Footer (Hidden during print) */}
        <div className="px-5 py-3 border-t border-line bg-surface-subtle flex items-center justify-end gap-2 print:hidden">
          <Button type="button" variant="outline" size="sm" onClick={onClose} className="text-xs">
            Tutup
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
  );
};

export default ShippingLabelDialog;
