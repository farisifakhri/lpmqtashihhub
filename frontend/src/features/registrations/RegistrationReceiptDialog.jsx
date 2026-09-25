import React, { useRef } from 'react';
import { Printer, Download, CheckCircle2, X, QrCode, Building2, BookOpen, Calendar, MapPin, AlertCircle } from 'lucide-react';
import { Button } from '@/components/ui/Button';

export const RegistrationReceiptDialog = ({ isOpen, onClose, registration }) => {
  const printRef = useRef(null);

  if (!isOpen || !registration) return null;

  const handlePrint = () => {
    window.print();
  };

  const regNo = registration.registration_no || 'REG-PENDING';
  const categoryLabel =
    registration.registration_category === 'EXTENSION'
      ? 'Perpanjangan Surat Tanda Tashih'
      : registration.registration_category === 'FOREIGN_MANUSCRIPT'
      ? 'Mushaf Al-Qur\'an Cetakan Luar Negeri (Impor)'
      : 'Surat Tanda Tashih Baru';

  const dateFormatted = new Date(registration.created_at || Date.now()).toLocaleDateString('id-ID', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
    timeZone: 'Asia/Jakarta',
  });

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-ink/70 backdrop-blur-xs flex items-center justify-center p-4 sm:p-6 animate-fadeIn">
      <div className="relative bg-white rounded-2xl shadow-2xl max-w-2xl w-full border border-line overflow-hidden my-8">
        {/* Header Modal Bar */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-line bg-canvas print:hidden">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-5 h-5 text-brand-700" />
            <span className="font-bold text-ink text-sm">Bukti Pendaftaran Resmi</span>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="primary" size="sm" onClick={handlePrint} className="text-xs">
              <Printer className="w-3.5 h-3.5 mr-1.5" />
              Cetak Bukti Pendaftaran
            </Button>
            <button
              type="button"
              onClick={onClose}
              className="p-1.5 text-ink-muted hover:text-ink rounded-lg hover:bg-surface-strong transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Printable Receipt Body */}
        <div ref={printRef} className="p-8 sm:p-10 space-y-6 text-ink printable-receipt bg-white">
          {/* Official Letterhead */}
          <div className="text-center border-b-2 border-ink pb-4 space-y-1">
            <p className="text-[11px] font-bold tracking-widest uppercase text-ink-muted">
              Kementerian Agama Republik Indonesia
            </p>
            <h2 className="text-base sm:text-lg font-black tracking-tight text-ink uppercase">
              Lajnah Pentashihan Mushaf Al-Qur'an (LPMQ)
            </h2>
            <p className="text-[10px] text-ink-muted">
              Gedung Bayt Al-Qur'an & Museum Istiqlal, TMII, Jakarta Timur 13560 · Telp: (021) 87798801 · tashih.kemenag.go.id
            </p>
          </div>

          {/* Title and Reg No */}
          <div className="text-center space-y-1">
            <h3 className="text-sm font-extrabold uppercase tracking-wide text-ink underline decoration-2 underline-offset-4">
              Tanda Bukti Pendaftaran Permohonan Tanda Tashih
            </h3>
            <p className="font-mono text-xs font-bold text-brand-800 pt-1">
              Nomor Registrasi: {regNo}
            </p>
          </div>

          {/* Details Table */}
          <div className="border border-line rounded-xl overflow-hidden text-xs">
            <table className="w-full divide-y divide-line">
              <tbody className="divide-y divide-line">
                <tr className="bg-canvas/70">
                  <td className="py-2.5 px-4 font-bold text-ink w-1/3">Kategori Permohonan</td>
                  <td className="py-2.5 px-4 text-ink font-semibold">{categoryLabel}</td>
                </tr>
                <tr>
                  <td className="py-2.5 px-4 font-bold text-ink">Tanggal Pendaftaran</td>
                  <td className="py-2.5 px-4 text-ink">{dateFormatted} WIB</td>
                </tr>
                <tr className="bg-canvas/70">
                  <td className="py-2.5 px-4 font-bold text-ink">Nama Penerbit / Pemohon</td>
                  <td className="py-2.5 px-4 text-ink font-bold">
                    {registration.publisher?.legal_name || 'Penerbit Terdaftar'}
                  </td>
                </tr>
                <tr>
                  <td className="py-2.5 px-4 font-bold text-ink">Judul Naskah Mushaf</td>
                  <td className="py-2.5 px-4 text-ink font-bold">{registration.title}</td>
                </tr>
                <tr className="bg-canvas/70">
                  <td className="py-2.5 px-4 font-bold text-ink">Jenis Layanan</td>
                  <td className="py-2.5 px-4 text-ink">
                    {registration.service_type?.name || 'Mushaf Al-Qur\'an 30 Juz'}
                  </td>
                </tr>
                {registration.foreign_metadata && (
                  <>
                    {(registration.foreign_metadata.country_of_origin || registration.foreign_metadata.negara_asal_mushaf) && (
                      <tr>
                        <td className="py-2.5 px-4 font-bold text-ink">Negara Asal Mushaf</td>
                        <td className="py-2.5 px-4 text-ink font-semibold">
                          {registration.foreign_metadata.country_of_origin || registration.foreign_metadata.negara_asal_mushaf}
                          {registration.foreign_metadata.recommendation_decree_no ? ` (No: ${registration.foreign_metadata.recommendation_decree_no})` : ''}
                        </td>
                      </tr>
                    )}
                    {(registration.foreign_metadata.penerbit_asal_mushaf || registration.foreign_metadata.foreign_publisher_name) && (
                      <tr className="bg-canvas/70">
                        <td className="py-2.5 px-4 font-bold text-ink">Penerbit Asal</td>
                        <td className="py-2.5 px-4 text-ink">
                          {registration.foreign_metadata.penerbit_asal_mushaf || registration.foreign_metadata.foreign_publisher_name}
                        </td>
                      </tr>
                    )}
                    {(registration.foreign_metadata.lembaga_pentashih_asal_mushaf || registration.foreign_tashih_institution) && (
                      <tr>
                        <td className="py-2.5 px-4 font-bold text-ink">Lembaga Pentashih Asal</td>
                        <td className="py-2.5 px-4 text-ink">
                          {registration.foreign_metadata.lembaga_pentashih_asal_mushaf || registration.foreign_tashih_institution}
                        </td>
                      </tr>
                    )}
                  </>
                )}
                <tr>
                  <td className="py-2.5 px-4 font-bold text-ink">Status Pendaftaran</td>
                  <td className="py-2.5 px-4">
                    <span className="inline-flex items-center px-2 py-0.5 rounded text-[11px] font-bold bg-brand-100 text-brand-800">
                      Terdaftar Resmi di Sistem LPMQ
                    </span>
                  </td>
                </tr>
              </tbody>
            </table>
          </div>

          {/* Instructions Box */}
          <div className="p-4 rounded-xl bg-canvas border border-line text-xs space-y-2">
            <p className="font-bold text-ink flex items-center gap-1.5">
              <AlertCircle className="w-4 h-4 text-civic-warning shrink-0" />
              Petunjuk Langkah Selanjutnya:
            </p>
            <ol className="list-decimal list-inside text-ink-muted space-y-1.5 pl-1 leading-relaxed">
              <li>Cetak lembar bukti pendaftaran ini sebanyak <strong>1 (satu) eksemplar</strong>.</li>
              <li>
                Siapkan berkas naskah master fisik (cetak kertas HVS/A4 dijilid rapi per juz) beserta bukti pendaftaran ini.
              </li>
              <li>
                Kirimkan atau serahkan berkas ke <strong>Loket Pelayanan LPMQ</strong> di Gedung Bayt Al-Qur'an & Museum Istiqlal, TMII, Jakarta Timur.
              </li>
              <li>
                Lakukan konfirmasi pengiriman fisik pada sistem melalui tombol <strong>"Kirimkan berkas ke LPMQ"</strong> agar proses verifikasi dapat segera dimulai oleh verifikator.
              </li>
            </ol>
          </div>

          {/* Footer QR & Verification Timestamp */}
          <div className="flex items-center justify-between pt-4 border-t border-line text-[11px] text-ink-muted">
            <div className="flex items-center gap-3">
              <div className="p-2 border border-line-strong rounded-lg bg-canvas">
                <QrCode className="w-10 h-10 text-ink" />
              </div>
              <div className="leading-tight">
                <p className="font-bold text-ink">Verifikasi QR Sistem</p>
                <p className="font-mono text-[10px] text-ink-muted">{regNo}</p>
                <p className="text-[10px] text-brand-700 font-semibold">Sah & Terverifikasi Otomatis</p>
              </div>
            </div>

            <div className="text-right leading-tight">
              <p>Diterbitkan secara elektronik oleh</p>
              <p className="font-bold text-ink">Sistem Layanan Tanda Tashih LPMQ</p>
              <p className="text-[10px] text-ink-muted">tashih.kemenag.go.id</p>
            </div>
          </div>
        </div>

        {/* Footer Actions */}
        <div className="px-6 py-3.5 bg-canvas border-t border-line flex justify-end gap-2 print:hidden">
          <Button variant="outline" size="sm" onClick={onClose} className="text-xs">
            Tutup
          </Button>
          <Button variant="primary" size="sm" onClick={handlePrint} className="text-xs font-bold">
            <Printer className="w-3.5 h-3.5 mr-1.5" />
            Cetak / Simpan PDF
          </Button>
        </div>
      </div>
    </div>
  );
};

export default RegistrationReceiptDialog;

