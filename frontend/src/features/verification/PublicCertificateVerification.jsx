import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import {
  ShieldCheck,
  ShieldX,
  ShieldAlert,
  CheckCircle2,
  AlertTriangle,
  XCircle,
  Building2,
  Calendar,
  MapPin,
  FileText,
  ArrowLeft,
  RefreshCw,
  BadgeCheck,
} from 'lucide-react';
import { Button } from '@/components/ui/Button';
import apiClient from '@/api/client';

/**
 * Halaman publik verifikasi keaslian Sertifikat Penerbit Al-Qur'an LPMQ
 * Diakses via QR Code pada sertifikat penerbit fisik/digital.
 *
 * Route: /verifikasi/sertifikat/:nomorInduk
 *
 * Tiga status respons:
 * - SAH          : Sertifikat ditemukan & valid — tampilkan data penerbit (hijau)
 * - TIDAK_TERDAFTAR : Nomor tidak ada di database (oranye/kuning)
 * - TIDAK_VALID  : Format nomor tidak valid / terindikasi dimanipulasi (merah / palsu)
 */
export const PublicCertificateVerification = () => {
  const { nomorInduk } = useParams();
  const [loading, setLoading] = useState(true);
  const [result, setResult] = useState(null); // { valid, status, data }
  const [fetchError, setFetchError] = useState(null);

  const formattedNomor = nomorInduk ? decodeURIComponent(nomorInduk) : '';

  useEffect(() => {
    const verify = async () => {
      setLoading(true);
      setFetchError(null);

      // Demo token eksplisit untuk preview & pengujian lokal
      if (formattedNomor === 'DEMO-SERTIFIKAT-2026') {
        setResult({
          valid: true,
          status: 'SAH',
          data: {
            nomor_induk_penerbit: '31.74.26.10.19.001',
            legal_name: 'PT Penerbit Al-Huda Nusantara',
            address: 'Jl. Raya Bogor No. 12, Jakarta Timur, DKI Jakarta',
            npwp: '01.234.567.8-901.000',
            nib: '1234567890123',
            decided_at: '2026-10-19T07:00:00.000Z',
            verification_status: 'VERIFIED',
          },
        });
        setLoading(false);
        return;
      }

      try {
        const res = await apiClient(`/public/verify-certificate/${encodeURIComponent(formattedNomor)}`);
        setResult(res);
      } catch (err) {
        setFetchError(err.message || 'Gagal menghubungi server verifikasi LPMQ.');
      } finally {
        setLoading(false);
      }
    };

    if (formattedNomor) {
      verify();
    } else {
      setResult({ valid: false, status: 'TIDAK_VALID' });
      setLoading(false);
    }
  }, [formattedNomor]);

  /** Format tanggal ke format Indonesia */
  const formatDate = (dateStr) => {
    if (!dateStr) return '-';
    return new Date(dateStr).toLocaleDateString('id-ID', {
      day: 'numeric',
      month: 'long',
      year: 'numeric',
    });
  };

  return (
    <div className="min-h-screen bg-surface-subtle py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-3xl mx-auto space-y-6">
        {/* Back navigation */}
        <div>
          <Link to="/">
            <Button variant="ghost" size="sm" icon={<ArrowLeft className="w-4 h-4" />}>
              Kembali ke Portal LPMQ
            </Button>
          </Link>
        </div>

        {/* Loading State */}
        {loading && (
          <div className="bg-white rounded-xl p-12 text-center shadow-lg">
            <RefreshCw className="w-8 h-8 animate-spin mx-auto text-brand-700 mb-3" />
            <p className="text-sm font-semibold text-ink">
              Memverifikasi Keaslian Sertifikat Penerbit...
            </p>
            <p className="text-xs text-ink-muted mt-1">
              Menghubungi pangkalan data Lajnah Pentashihan Mushaf Al-Qur'an
            </p>
          </div>
        )}

        {/* Network/Fetch Error State */}
        {!loading && fetchError && (
          <div className="bg-white rounded-xl shadow-lg border-2 border-civic-dangerLine p-8 text-center space-y-4">
            <div className="w-14 h-14 rounded-full bg-civic-dangerSoft text-civic-danger flex items-center justify-center mx-auto">
              <AlertTriangle className="w-8 h-8" />
            </div>
            <h2 className="text-lg font-bold text-ink">Gagal Terhubung ke Server</h2>
            <p className="text-sm text-ink-muted max-w-md mx-auto">
              {fetchError}. Pastikan koneksi internet Anda stabil dan coba lagi.
            </p>
            <div className="pt-2">
              <p className="font-mono text-xs text-ink-muted">
                Nomor Induk: {formattedNomor || '(tidak tersedia)'}
              </p>
            </div>
            <button
              onClick={() => window.location.reload()}
              className="mt-2 inline-flex items-center gap-2 px-4 py-2 rounded-lg border border-line bg-surface text-sm font-semibold text-ink hover:bg-surface-subtle transition-colors"
            >
              <RefreshCw className="w-4 h-4" />
              Coba Lagi
            </button>
          </div>
        )}

        {/* Status: SAH / VALID */}
        {!loading && !fetchError && result?.valid === true && (
          <div className="bg-white rounded-xl shadow-lg border-4 border-civicGold-700 relative overflow-hidden">
            {/* Dekorasi pojok */}
            <div className="absolute top-0 right-0 w-32 h-32 bg-brand-100 rounded-bl-full -z-0 opacity-50" />

            {/* Kop Lembaga */}
            <div className="text-center px-8 pt-8 pb-6 border-b-2 border-ink relative z-10">
              <div className="w-16 h-16 mx-auto mb-2 text-brand-700">
                <ShieldCheck className="w-full h-full" />
              </div>
              <p className="text-xs tracking-widest uppercase font-bold text-ink-muted">
                KEMENTERIAN AGAMA REPUBLIK INDONESIA
              </p>
              <p className="text-sm tracking-wider uppercase font-bold text-ink">
                BADAN LITBANG DAN DIKLAT
              </p>
              <h1 className="text-lg sm:text-xl font-bold text-brand-fg tracking-wide mt-1">
                LAJNAH PENTASHIHAN MUSHAF AL-QUR'AN
              </h1>
              <p className="text-xs text-ink-muted mt-1">
                Gedung Bayt Al-Qur'an &amp; Museum Istiqlal, TMII, Jakarta Timur
              </p>
            </div>

            <div className="px-8 sm:px-12 py-6 space-y-5 relative z-10">
              {/* Status Badge SAH */}
              <div className="p-4 rounded-lg bg-brand-50 border border-brand-100 flex items-center gap-3">
                <CheckCircle2 className="w-6 h-6 text-brand-700 flex-shrink-0" />
                <div>
                  <h2 className="text-sm font-bold text-brand-900">
                    SERTIFIKAT RESMI TERCATAT &amp; TERVERIFIKASI
                  </h2>
                  <p className="text-xs text-brand-fg mt-0.5">
                    Sertifikat Penerbit Al-Qur'an ini sah dan tercatat dalam pangkalan data
                    Lajnah Pentashihan Mushaf Al-Qur'an Kemenag RI.
                  </p>
                </div>
              </div>

              {/* Judul Sertifikat */}
              <div className="text-center py-2">
                <span className="text-xs uppercase tracking-widest text-ink-muted font-semibold block">
                  SERTIFIKAT PENERBIT AL-QUR'AN
                </span>
                <span className="font-mono text-base font-bold text-ink block mt-0.5">
                  Nomor Induk: {result.data?.nomor_induk_penerbit || formattedNomor}
                </span>
              </div>

              {/* Detail Data Penerbit */}
              <div className="bg-canvas rounded-lg p-5 border border-line space-y-3">
                {/* Nama Penerbit */}
                <div className="flex items-start justify-between gap-4 border-b border-line pb-3">
                  <span className="text-ink-muted text-xs shrink-0 mt-0.5">Nama Penerbit:</span>
                  <span className="font-semibold text-ink text-right flex items-center gap-1.5">
                    <Building2 className="w-3.5 h-3.5 text-ink-muted shrink-0" />
                    {result.data?.legal_name || '-'}
                  </span>
                </div>

                {/* Alamat */}
                {result.data?.address && result.data.address !== '-' && (
                  <div className="flex items-start justify-between gap-4 border-b border-line pb-3">
                    <span className="text-ink-muted text-xs shrink-0 mt-0.5">Alamat:</span>
                    <span className="font-medium text-ink text-right text-sm flex items-start gap-1.5">
                      <MapPin className="w-3.5 h-3.5 text-ink-muted shrink-0 mt-0.5" />
                      {result.data.address}
                    </span>
                  </div>
                )}

                {/* NPWP */}
                {result.data?.npwp && (
                  <div className="flex items-center justify-between gap-4 border-b border-line pb-3">
                    <span className="text-ink-muted text-xs shrink-0">NPWP:</span>
                    <span className="font-mono text-sm font-semibold text-ink">
                      {result.data.npwp}
                    </span>
                  </div>
                )}

                {/* NIB */}
                {result.data?.nib && (
                  <div className="flex items-center justify-between gap-4 border-b border-line pb-3">
                    <span className="text-ink-muted text-xs shrink-0">NIB:</span>
                    <span className="font-mono text-sm font-semibold text-ink">
                      {result.data.nib}
                    </span>
                  </div>
                )}

                {/* Tanggal Penetapan */}
                <div className="flex items-center justify-between gap-4">
                  <span className="text-ink-muted text-xs shrink-0">Tanggal Penetapan:</span>
                  <span className="font-medium text-ink flex items-center gap-1.5">
                    <Calendar className="w-3.5 h-3.5 text-ink-muted" />
                    {formatDate(result.data?.decided_at)}
                  </span>
                </div>
              </div>

              {/* Tautan URL Verifikasi QR */}
              <div className="p-3 rounded-lg bg-surface-subtle border border-line text-xs flex flex-col sm:flex-row items-center justify-between gap-2">
                <span className="text-ink-muted">Alamat URL Verifikasi QR:</span>
                <span className="font-mono text-brand-fg font-semibold break-all text-[11px]">
                  https://tashih.kemenag.go.id/verifikasi/sertifikat/{encodeURIComponent(result.data?.nomor_induk_penerbit || formattedNomor)}
                </span>
              </div>

              {/* Footer Otoritas */}
              <div className="mt-4 pt-4 border-t border-line flex flex-col sm:flex-row items-center justify-between gap-4">
                <div className="text-center sm:text-left">
                  <p className="text-xs text-ink-muted">Diterbitkan secara elektronik oleh:</p>
                  <p className="text-sm font-bold text-ink mt-1">H. Abdul Aziz Sidqi, M.Ag.</p>
                  <p className="text-xs text-ink-muted">
                    Kepala Lajnah Pentashihan Mushaf Al-Qur'an
                  </p>
                </div>
                <div className="text-center sm:text-right">
                  <div className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded bg-civicGold-100 border border-civicGold-700 text-civicGold-700 text-xs font-semibold">
                    <BadgeCheck className="w-4 h-4" />
                    <span>Sertifikat Penerbit Resmi</span>
                  </div>
                  <p className="text-xs font-mono text-ink-muted mt-1">
                    {result.data?.nomor_induk_penerbit || formattedNomor}
                  </p>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Status: TIDAK TERDAFTAR */}
        {!loading && !fetchError && result?.valid === false && result?.status === 'TIDAK_TERDAFTAR' && (
          <div className="bg-white rounded-xl shadow-lg border-2 border-amber-400 p-8 sm:p-10 space-y-5">
            {/* Kop Lembaga */}
            <div className="text-center pb-5 border-b-2 border-ink">
              <div className="w-14 h-14 mx-auto mb-2 text-amber-500">
                <ShieldAlert className="w-full h-full" />
              </div>
              <p className="text-xs tracking-widest uppercase font-bold text-ink-muted">
                KEMENTERIAN AGAMA REPUBLIK INDONESIA
              </p>
              <h1 className="text-base font-bold text-brand-fg tracking-wide mt-1">
                LAJNAH PENTASHIHAN MUSHAF AL-QUR'AN
              </h1>
            </div>

            {/* Status Banner */}
            <div className="p-4 rounded-lg bg-amber-50 border border-amber-200 flex items-center gap-3">
              <AlertTriangle className="w-6 h-6 text-amber-600 flex-shrink-0" />
              <div>
                <h2 className="text-sm font-bold text-amber-900">SERTIFIKAT TIDAK TERDAFTAR</h2>
                <p className="text-xs text-amber-700 mt-0.5">
                  Nomor induk penerbit ini tidak ditemukan dalam pangkalan data resmi LPMQ
                  Kementerian Agama RI.
                </p>
              </div>
            </div>

            <div className="text-center space-y-2">
              <p className="text-sm text-ink-muted">
                Nomor induk yang Anda pindai:
              </p>
              <p className="font-mono text-base font-bold text-ink bg-amber-50 border border-amber-200 rounded-lg px-4 py-2 inline-block">
                {formattedNomor || '(tidak tersedia)'}
              </p>
            </div>

            <div className="bg-canvas rounded-lg p-4 border border-line text-sm text-ink-muted space-y-2">
              <p className="font-semibold text-ink text-xs uppercase tracking-wider mb-2">
                Kemungkinan Penyebab:
              </p>
              <ul className="space-y-1.5 text-xs list-disc list-inside">
                <li>Nomor induk penerbit belum terdaftar di sistem LPMQ</li>
                <li>Sertifikat diterbitkan sebelum sistem digitalisasi berlaku</li>
                <li>QR Code rusak atau tidak terbaca dengan sempurna</li>
              </ul>
            </div>

            {/* Tautan URL Verifikasi QR */}
            <div className="p-3 rounded-lg bg-surface-subtle border border-line text-xs flex flex-col sm:flex-row items-center justify-between gap-2">
              <span className="text-ink-muted">Alamat URL Verifikasi QR:</span>
              <span className="font-mono text-amber-800 font-semibold break-all text-[11px]">
                https://tashih.kemenag.go.id/verifikasi/sertifikat/{encodeURIComponent(formattedNomor)}
              </span>
            </div>

            <p className="text-xs text-center text-ink-muted">
              Untuk konfirmasi lebih lanjut, hubungi LPMQ Kemenag RI di{' '}
              <a
                href="mailto:lajnah@kemenag.go.id"
                className="text-brand-fg hover:underline font-semibold"
              >
                lajnah@kemenag.go.id
              </a>
            </p>
          </div>
        )}

        {/* Status: TIDAK VALID / PALSU */}
        {!loading && !fetchError && result?.valid === false && result?.status !== 'TIDAK_TERDAFTAR' && (
          <div className="bg-white rounded-xl shadow-lg border-2 border-red-400 p-8 sm:p-10 space-y-5">
            {/* Kop Lembaga */}
            <div className="text-center pb-5 border-b-2 border-ink">
              <div className="w-14 h-14 mx-auto mb-2 text-red-500">
                <ShieldX className="w-full h-full" />
              </div>
              <p className="text-xs tracking-widest uppercase font-bold text-ink-muted">
                KEMENTERIAN AGAMA REPUBLIK INDONESIA
              </p>
              <h1 className="text-base font-bold text-brand-fg tracking-wide mt-1">
                LAJNAH PENTASHIHAN MUSHAF AL-QUR'AN
              </h1>
            </div>

            {/* Status Banner PALSU */}
            <div className="p-4 rounded-lg bg-red-50 border border-red-200 flex items-center gap-3">
              <XCircle className="w-6 h-6 text-red-600 flex-shrink-0" />
              <div>
                <h2 className="text-sm font-bold text-red-900">
                  SERTIFIKAT TERINDIKASI TIDAK SAH / PALSU
                </h2>
                <p className="text-xs text-red-700 mt-0.5">
                  Format atau isi nomor induk ini tidak sesuai dengan standar penerbitan
                  LPMQ Kementerian Agama RI.
                </p>
              </div>
            </div>

            <div className="text-center space-y-2">
              <p className="text-sm text-ink-muted">
                Nomor induk yang dipindai:
              </p>
              <p className="font-mono text-base font-bold text-red-700 bg-red-50 border border-red-200 rounded-lg px-4 py-2 inline-block">
                {formattedNomor || '(tidak dapat dibaca)'}
              </p>
            </div>

            <div className="bg-red-50 rounded-lg p-4 border border-red-200 text-sm space-y-2">
              <p className="font-bold text-red-800 text-xs uppercase tracking-wider">
                ⚠ Peringatan Keamanan
              </p>
              <p className="text-xs text-red-700 leading-relaxed">
                Dokumen dengan sertifikat yang tidak terverifikasi oleh sistem LPMQ berpotensi
                merupakan pemalsuan. Jangan gunakan atau distribusikan Al-Qur'an yang tidak
                memiliki sertifikat tashih resmi.
              </p>
            </div>

            {/* Tautan URL Verifikasi QR */}
            <div className="p-3 rounded-lg bg-surface-subtle border border-line text-xs flex flex-col sm:flex-row items-center justify-between gap-2">
              <span className="text-ink-muted">Alamat URL Verifikasi QR:</span>
              <span className="font-mono text-red-700 font-semibold break-all text-[11px]">
                https://tashih.kemenag.go.id/verifikasi/sertifikat/{encodeURIComponent(formattedNomor)}
              </span>
            </div>

            <div className="flex flex-col sm:flex-row gap-3 justify-center pt-1">
              <a
                href="mailto:lajnah@kemenag.go.id?subject=Laporan%20Sertifikat%20Penerbit%20Diduga%20Palsu"
                className="inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg bg-red-600 text-white font-semibold text-sm hover:bg-red-700 transition-colors"
              >
                <FileText className="w-4 h-4" />
                Laporkan ke LPMQ
              </a>
              <Link
                to="/"
                className="inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg border border-line bg-surface text-ink font-semibold text-sm hover:bg-surface-subtle transition-colors"
              >
                <ArrowLeft className="w-4 h-4" />
                Kembali ke Beranda
              </Link>
            </div>
          </div>
        )}

        {/* Footer info */}
        <p className="text-center text-xs text-ink-muted">
          Sistem Verifikasi Sertifikat Penerbit Publik — Lajnah Pentashihan Mushaf Al-Qur'an
          (LPMQ) &copy; 2026
        </p>
      </div>
    </div>
  );
};

export default PublicCertificateVerification;
