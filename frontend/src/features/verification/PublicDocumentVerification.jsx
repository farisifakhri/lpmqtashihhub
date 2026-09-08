import React from 'react';
import { useParams, Link } from 'react-router-dom';
import { ShieldCheck, CheckCircle2, Award, Calendar, Building2, ArrowLeft } from 'lucide-react';
import { Button } from '@/components/ui/Button';

export const PublicDocumentVerification = () => {
  const { token } = useParams();

  // Mock document data for verification
  const documentData = {
    documentNumber: 'B-1422/LPMQ.01/TL.00/09/2026',
    documentTitle: "SURAT TANDA TASHIH MUSHAF AL-QUR'AN",
    mushafTitle: "Mushaf Al-Qur'an Al-Karim Rasm Usmani Terjemah Tajwid Warna",
    publisherName: 'PT Penerbit Al-Huda Nusantara',
    mushafCategory: 'Al-Qur’an dan Terjemah (30 Juz)',
    beritaAcaraRef: 'BA-TSH/LPMQ/2026/08/0412',
    signedBy: 'Dr. H. Abdul Aziz Sidqi, M.Ag',
    signedTitle: 'Kepala Lajnah Pentashihan Mushaf Al-Qur’an',
    signedDate: '2 September 2026',
    status: 'VALID',
  };

  return (
    <div className="min-h-screen bg-neutral-100 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-3xl mx-auto space-y-6">
        {/* Back navigation */}
        <div>
          <Link to="/">
            <Button variant="ghost" size="sm" icon={<ArrowLeft className="w-4 h-4" />}>
              Kembali ke Beranda LPMQ
            </Button>
          </Link>
        </div>

        {/* Certificate Card (Sesuai DESIGN.md §5: Bingkai emas, kop resmi) */}
        <div className="bg-white rounded-xl shadow-lg border-4 border-gold-400 p-8 sm:p-12 relative overflow-hidden">
          {/* Subtle Islamic watermarks / banner */}
          <div className="absolute top-0 right-0 w-32 h-32 bg-primary-100 rounded-bl-full -z-0 opacity-50" />

          {/* Kop Dokumen Resmi Kemenag */}
          <div className="text-center pb-6 border-b-2 border-neutral-800 relative z-10">
            <div className="w-16 h-16 mx-auto mb-2 text-primary-700">
              <ShieldCheck className="w-full h-full" />
            </div>
            <p className="text-xs tracking-widest uppercase font-bold text-neutral-600">
              KEMENTERIAN AGAMA REPUBLIK INDONESIA
            </p>
            <p className="text-sm tracking-wider uppercase font-bold text-neutral-800">
              BADAN LITBANG DAN DIKLAT
            </p>
            <h1 className="text-lg sm:text-xl font-bold text-primary-700 tracking-wide mt-1">
              LAJNAH PENTASHIHAN MUSHAF AL-QUR'AN
            </h1>
            <p className="text-xs text-neutral-500 mt-1">
              Gedung Bayt Al-Qur'an & Museum Istiqlal, TMII, Jakarta Timur
            </p>
          </div>

          {/* Status Keabsahan Banner */}
          <div className="my-6 p-4 rounded-lg bg-emerald-50 border border-emerald-300 flex items-center gap-3">
            <CheckCircle2 className="w-6 h-6 text-emerald-600 flex-shrink-0" />
            <div>
              <h2 className="text-sm font-bold text-emerald-900">
                DOKUMEN RESMI TERCATAT & TERVERIFIKASI
              </h2>
              <p className="text-xs text-emerald-700">
                Surat Tanda Tashih sah dan tercatat dalam pangkalan data Lajnah Pentashihan Mushaf Al-Qur'an Kemenag RI.
              </p>
            </div>
          </div>

          {/* Detail Surat Tanda Tashih */}
          <div className="space-y-4 text-sm relative z-10">
            <div className="text-center py-2">
              <span className="text-xs uppercase tracking-widest text-neutral-500 font-semibold block">
                {documentData.documentTitle}
              </span>
              <span className="font-mono text-base font-bold text-neutral-900 block mt-0.5">
                Nomor: {documentData.documentNumber}
              </span>
            </div>

            <div className="bg-neutral-50 rounded-lg p-5 border border-neutral-200 space-y-3">
              <div className="flex items-start justify-between border-b border-neutral-200 pb-2.5">
                <span className="text-neutral-500 text-xs">Judul Naskah Mushaf:</span>
                <span className="font-semibold text-neutral-900 text-right max-w-sm">
                  {documentData.mushafTitle}
                </span>
              </div>

              <div className="flex items-center justify-between border-b border-neutral-200 pb-2.5">
                <span className="text-neutral-500 text-xs">Penerbit:</span>
                <span className="font-semibold text-neutral-900 flex items-center gap-1.5">
                  <Building2 className="w-3.5 h-3.5 text-neutral-500" />
                  {documentData.publisherName}
                </span>
              </div>

              <div className="flex items-center justify-between border-b border-neutral-200 pb-2.5">
                <span className="text-neutral-500 text-xs">Kategori Mushaf:</span>
                <span className="font-medium text-neutral-800">{documentData.mushafCategory}</span>
              </div>

              {/* Rujukan Berita Acara yang mendasari sesuai DESIGN.md §5 */}
              <div className="flex items-center justify-between border-b border-neutral-200 pb-2.5">
                <span className="text-neutral-500 text-xs">Dasar Berita Acara Tashih:</span>
                <span className="font-mono text-xs font-semibold text-primary-700">
                  {documentData.beritaAcaraRef}
                </span>
              </div>

              <div className="flex items-center justify-between">
                <span className="text-neutral-500 text-xs">Tanggal Penetapan:</span>
                <span className="font-medium text-neutral-800 flex items-center gap-1.5">
                  <Calendar className="w-3.5 h-3.5 text-neutral-500" />
                  {documentData.signedDate}
                </span>
              </div>
            </div>

            {/* Otoritas Penandatangan */}
            <div className="mt-8 pt-4 flex flex-col sm:flex-row items-center justify-between gap-4">
              <div className="text-center sm:text-left">
                <p className="text-xs text-neutral-500">Ditetapkan secara elektronik oleh:</p>
                <p className="text-sm font-bold text-neutral-900 mt-1">{documentData.signedBy}</p>
                <p className="text-xs text-neutral-600">{documentData.signedTitle}</p>
              </div>

              <div className="text-center sm:text-right">
                <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded bg-gold-50 border border-gold-400 text-gold-700 text-xs font-semibold">
                  <Award className="w-4 h-4" />
                  <span>Sertifikat Asli Bersertifikasi</span>
                </div>
                <p className="text-[10px] font-mono text-neutral-400 mt-1">
                  Token: {token || 'DEMO-TOKEN'}
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Footer info */}
        <p className="text-center text-xs text-neutral-500">
          Sistem Verifikasi Dokumen Publik — Lajnah Pentashihan Mushaf Al-Qur'an (LPMQ) &copy; 2026
        </p>
      </div>
    </div>
  );
};
