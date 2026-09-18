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
    <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-950/70 backdrop-blur-xs flex items-center justify-center p-4 sm:p-6 animate-fadeIn">
      <div className="relative bg-white rounded-2xl shadow-2xl max-w-2xl w-full border border-slate-200 overflow-hidden my-8">
        {/* Header Modal Bar */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200 bg-slate-50 print:hidden">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-5 h-5 text-emerald-700" />
            <span className="font-bold text-slate-900 text-sm">Bukti Pendaftaran Resmi</span>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="primary" size="sm" onClick={handlePrint} className="text-xs">
              <Printer className="w-3.5 h-3.5 mr-1.5" />
              Cetak Bukti Pendaftaran
            </Button>
            <button
              type="button"
              onClick={onClose}
              className="p-1.5 text-slate-400 hover:text-slate-700 rounded-lg hover:bg-slate-200 transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Printable Receipt Body */}
        <div ref={printRef} className="p-8 sm:p-10 space-y-6 text-slate-900 printable-receipt bg-white">
          {/* Official Letterhead */}
          <div className="text-center border-b-2 border-slate-900 pb-4 space-y-1">
            <p className="text-[11px] font-bold tracking-widest uppercase text-slate-600">
              Kementerian Agama Republik Indonesia
            </p>
            <h2 className="text-base sm:text-lg font-black tracking-tight text-slate-900 uppercase">
              Lajnah Pentashihan Mushaf Al-Qur'an (LPMQ)
            </h2>
            <p className="text-[10px] text-slate-500">
              Gedung Bayt Al-Qur'an & Museum Istiqlal, TMII, Jakarta Timur 13560 · Telp: (021) 87798801 · tashih.kemenag.go.id
            </p>
          </div>

          {/* Title and Reg No */}
          <div className="text-center space-y-1">
            <h3 className="text-sm font-extrabold uppercase tracking-wide text-slate-900 underline decoration-2 underline-offset-4">
              Tanda Bukti Pendaftaran Permohonan Tanda Tashih
            </h3>
            <p className="font-mono text-xs font-bold text-emerald-800 pt-1">
              Nomor Registrasi: {regNo}
            </p>
          </div>

          {/* Details Table */}
          <div className="border border-slate-200 rounded-xl overflow-hidden text-xs">
            <table className="w-full divide-y divide-slate-200">
              <tbody className="divide-y divide-slate-100">
                <tr className="bg-slate-50/70">
                  <td className="py-2.5 px-4 font-bold text-slate-700 w-1/3">Kategori Permohonan</td>
                  <td className="py-2.5 px-4 text-slate-900 font-semibold">{categoryLabel}</td>
                </tr>
                <tr>
                  <td className="py-2.5 px-4 font-bold text-slate-700">Tanggal Pendaftaran</td>
                  <td className="py-2.5 px-4 text-slate-900">{dateFormatted} WIB</td>
                </tr>
                <tr className="bg-slate-50/70">
                  <td className="py-2.5 px-4 font-bold text-slate-700">Nama Penerbit / Pemohon</td>
                  <td className="py-2.5 px-4 text-slate-900 font-bold">
                    {registration.publisher?.legal_name || 'Penerbit Terdaftar'}
                  </td>
                </tr>
                <tr>
                  <td className="py-2.5 px-4 font-bold text-slate-700">Judul Naskah Mushaf</td>
                  <td className="py-2.5 px-4 text-slate-900 font-bold">{registration.title}</td>
                </tr>
                <tr className="bg-slate-50/70">
                  <td className="py-2.5 px-4 font-bold text-slate-700">Jenis Layanan</td>
                  <td className="py-2.5 px-4 text-slate-900">
                    {registration.service_type?.name || 'Mushaf Al-Qur\'an 30 Juz'}
                  </td>
                </tr>
                {registration.foreign_metadata && (
                  <tr>
                    <td className="py-2.5 px-4 font-bold text-slate-700">Negara Asal / Izin Impor</td>
                    <td className="py-2.5 px-4 text-slate-900">
                      {registration.foreign_metadata.country_of_origin || '-'}{' '}
                      {registration.foreign_metadata.recommendation_decree_no ? `(No: ${registration.foreign_metadata.recommendation_decree_no})` : ''}
                    </td>
                  </tr>
                )}
                <tr>
                  <td className="py-2.5 px-4 font-bold text-slate-700">Status Pendaftaran</td>
                  <td className="py-2.5 px-4">
                    <span className="inline-flex items-center px-2 py-0.5 rounded text-[11px] font-bold bg-emerald-100 text-emerald-800">
                      Terdaftar Resmi di Sistem LPMQ
                    </span>
                  </td>
                </tr>
              </tbody>
            </table>
          </div>

          {/* Instructions Box */}
          <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 text-xs space-y-2">
            <p className="font-bold text-slate-800 flex items-center gap-1.5">
              <AlertCircle className="w-4 h-4 text-amber-600 shrink-0" />
              Petunjuk Langkah Selanjutnya:
            </p>
            <ol className="list-decimal list-inside text-slate-600 space-y-1.5 pl-1 leading-relaxed">
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
          <div className="flex items-center justify-between pt-4 border-t border-slate-200 text-[11px] text-slate-500">
            <div className="flex items-center gap-3">
              <div className="p-2 border border-slate-300 rounded-lg bg-slate-50">
                <QrCode className="w-10 h-10 text-slate-800" />
              </div>
              <div className="leading-tight">
                <p className="font-bold text-slate-800">Verifikasi QR Sistem</p>
                <p className="font-mono text-[10px] text-slate-500">{regNo}</p>
                <p className="text-[10px] text-emerald-700 font-semibold">Sah & Terverifikasi Otomatis</p>
              </div>
            </div>

            <div className="text-right leading-tight">
              <p>Diterbitkan secara elektronik oleh</p>
              <p className="font-bold text-slate-800">Sistem Layanan Tanda Tashih LPMQ</p>
              <p className="text-[10px] text-slate-400">tashih.kemenag.go.id</p>
            </div>
          </div>
        </div>

        {/* Footer Actions */}
        <div className="px-6 py-3.5 bg-slate-50 border-t border-slate-200 flex justify-end gap-2 print:hidden">
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

