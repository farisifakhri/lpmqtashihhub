import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { ShieldCheck, CheckCircle2, Award, Calendar, Building2, ArrowLeft, AlertTriangle, RefreshCw, FileText, FileSearch } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { publicApi } from '@/api/public.api';

export const PublicDocumentVerification = () => {
  const { token } = useParams();
  const [loading, setLoading] = useState(true);
  const [doc, setDoc] = useState(null);
  const [error, setError] = useState(null);
  const [opening, setOpening] = useState(false);
  const [fileError, setFileError] = useState(null);

  // Pratinjau/unduh STT asli dari arsip (issue log #40).
  const openOriginal = async () => {
    const preview = window.open('', '_blank');
    setOpening(true);
    setFileError(null);
    try {
      const blob = await publicApi.getOriginalSttFile(token);
      const url = URL.createObjectURL(blob);
      if (preview) preview.location.href = url;
      else window.location.href = url;
      setTimeout(() => URL.revokeObjectURL(url), 60_000);
    } catch (err) {
      preview?.close();
      setFileError(err.message);
    } finally {
      setOpening(false);
    }
  };

  useEffect(() => {
    const checkToken = async () => {
      setLoading(true);
      setError(null);

      try {
        const res = await publicApi.verifyDocument(token);
        const d = res?.data;
        // Tanpa data dari server dokumen tidak boleh ditampilkan sebagai sah.
        if (!d) throw new Error('Dokumen resmi tidak ditemukan atau token tidak valid');
        setDoc({
          documentNumber: d.document_no,
          documentTitle: d.document_type === 'BERITA_ACARA_TASHIH' ? 'BERITA ACARA TASHIH' : "SURAT TANDA TASHIH MUSHAF AL-QUR'AN",
          mushafTitle: d.title,
          publisherName: d.publisher_name,
          mushafCategory: d.service_name,
          signedBy: d.signatories?.[0]?.name_position_snapshot || 'Kepala LPMQ Kemenag RI',
          signedTitle: 'Kepala Lajnah Pentashihan Mushaf Al-Qur’an',
          signedDate: d.issued_at ? new Date(d.issued_at).toLocaleDateString('id-ID') : '—',
          validUntil: d.valid_until ? new Date(d.valid_until).toLocaleDateString('id-ID') : null,
          status: d.status,
          isValid: d.is_valid,
          originalAvailable: d.original_file_available,
        });
      } catch (err) {
        setError(err.message || 'Dokumen resmi tidak ditemukan atau token tidak valid.');
      } finally {
        setLoading(false);
      }
    };

    checkToken();
  }, [token]);

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

        {loading ? (
          <div className="bg-white rounded-xl p-12 text-center shadow-lg">
            <RefreshCw className="w-8 h-8 animate-spin mx-auto text-brand-700 mb-3" />
            <p className="text-sm font-semibold text-ink">
              Memverifikasi Keabsahan Dokumen...
            </p>
            <p className="text-xs text-ink-muted mt-1">
              Menghubungi pangkalan data sertifikat digital LPMQ
            </p>
          </div>
        ) : error ? (
          <div className="bg-white rounded-xl shadow-lg border-2 border-civic-dangerLine p-8 text-center space-y-4">
            <div className="w-14 h-14 rounded-full bg-civic-dangerSoft text-civic-danger flex items-center justify-center mx-auto">
              <AlertTriangle className="w-8 h-8" />
            </div>
            <h2 className="text-lg font-bold text-ink">
              Dokumen Tidak Ditemukan / Tidak Valid
            </h2>
            <p className="text-sm text-ink-muted max-w-md mx-auto">
              {error}. Pastikan QR Code yang Anda pindai berasal dari dokumen fisik resmi yang diterbitkan oleh LPMQ Kementerian Agama RI.
            </p>
            <div className="pt-2">
              <p className="font-mono text-xs text-ink-muted">Token ID: {token}</p>
            </div>
          </div>
        ) : (
          /* Certificate Card */
          <div className="bg-white rounded-xl shadow-lg border-4 border-civicGold-700 p-8 sm:p-12 relative overflow-hidden">
            <div className="absolute top-0 right-0 w-32 h-32 bg-brand-100 rounded-bl-full -z-0 opacity-50" />

            {/* Kop Dokumen Resmi Kemenag */}
            <div className="text-center pb-6 border-b-2 border-ink relative z-10">
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
                Gedung Bayt Al-Qur'an & Museum Istiqlal, TMII, Jakarta Timur
              </p>
            </div>

            {/* Status Keabsahan Banner */}
            {doc?.isValid ? (
              <div className="my-6 p-4 rounded-lg bg-brand-50 border border-brand-100 flex items-center gap-3">
                <CheckCircle2 className="w-6 h-6 text-brand-700 flex-shrink-0" />
                <div>
                  <h2 className="text-sm font-bold text-brand-900">
                    DOKUMEN RESMI TERCATAT & TERVERIFIKASI
                  </h2>
                  <p className="text-xs text-brand-fg">
                    Dokumen sah dan tercatat dalam pangkalan data Lajnah Pentashihan Mushaf Al-Qur'an Kemenag RI.
                  </p>
                </div>
              </div>
            ) : (
              <div className="my-6 p-4 rounded-lg bg-civic-dangerSoft border border-civic-dangerLine flex items-center gap-3">
                <AlertTriangle className="w-6 h-6 text-civic-danger flex-shrink-0" />
                <div>
                  <h2 className="text-sm font-bold text-civic-danger">
                    DOKUMEN TERCATAT TETAPI TIDAK BERLAKU ({doc?.status === 'REVOKED' ? 'DICABUT' : 'KEDALUWARSA'})
                  </h2>
                  <p className="text-xs text-ink-muted">
                    Dokumen ini pernah diterbitkan LPMQ, tetapi saat ini tidak lagi berlaku.
                  </p>
                </div>
              </div>
            )}

            {doc?.originalAvailable && (
              <div className="mb-6 p-4 rounded-lg border border-line bg-canvas space-y-2 relative z-10">
                <p className="text-xs text-ink-muted">
                  Bandingkan surat yang Anda pegang dengan STT asli dari arsip LPMQ. Yang berlaku adalah isi STT asli.
                </p>
                <div className="flex flex-wrap gap-2">
                  <Button type="button" variant="primary" size="sm" onClick={openOriginal} disabled={opening} icon={<FileText className="w-4 h-4" />}>
                    {opening ? 'Membuka…' : 'Lihat / Unduh STT Asli'}
                  </Button>
                  <Link to="/cek-dokumen">
                    <Button type="button" variant="outline" size="sm" icon={<FileSearch className="w-4 h-4" />}>
                      Cocokkan PDF yang Anda miliki
                    </Button>
                  </Link>
                </div>
                {fileError && <p role="alert" className="text-xs text-civic-danger">{fileError}</p>}
              </div>
            )}

            {/* Detail Surat Tanda Tashih */}
            <div className="space-y-4 text-sm relative z-10">
              <div className="text-center py-2">
                <span className="text-xs uppercase tracking-widest text-ink-muted font-semibold block">
                  {doc?.documentTitle}
                </span>
                <span className="font-mono text-base font-bold text-ink block mt-0.5">
                  Nomor: {doc?.documentNumber}
                </span>
              </div>

              <div className="bg-canvas rounded-lg p-5 border border-line space-y-3">
                <div className="flex items-start justify-between border-b border-line pb-2.5">
                  <span className="text-ink-muted text-xs">Judul Naskah Mushaf:</span>
                  <span className="font-semibold text-ink text-right max-w-sm">
                    {doc?.mushafTitle}
                  </span>
                </div>

                <div className="flex items-center justify-between border-b border-line pb-2.5">
                  <span className="text-ink-muted text-xs">Penerbit:</span>
                  <span className="font-semibold text-ink flex items-center gap-1.5">
                    <Building2 className="w-3.5 h-3.5 text-ink-muted" />
                    {doc?.publisherName}
                  </span>
                </div>

                <div className="flex items-center justify-between border-b border-line pb-2.5">
                  <span className="text-ink-muted text-xs">Jenis Layanan:</span>
                  <span className="font-medium text-ink">{doc?.mushafCategory}</span>
                </div>

                <div className="flex items-center justify-between border-b border-line pb-2.5">
                  <span className="text-ink-muted text-xs">Berlaku Sampai:</span>
                  <span className="font-medium text-ink">{doc?.validUntil || '—'}</span>
                </div>

                <div className="flex items-center justify-between">
                  <span className="text-ink-muted text-xs">Tanggal Penetapan:</span>
                  <span className="font-medium text-ink flex items-center gap-1.5">
                    <Calendar className="w-3.5 h-3.5 text-ink-muted" />
                    {doc?.signedDate}
                  </span>
                </div>
              </div>

              {/* Otoritas Penandatangan */}
              <div className="mt-8 pt-4 flex flex-col sm:flex-row items-center justify-between gap-4">
                <div className="text-center sm:text-left">
                  <p className="text-xs text-ink-muted">Ditetapkan secara elektronik oleh:</p>
                  <p className="text-sm font-bold text-ink mt-1">{doc?.signedBy}</p>
                  <p className="text-xs text-ink-muted">{doc?.signedTitle}</p>
                </div>

                <div className="text-center sm:text-right">
                  {doc?.isValid && (
                    <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded bg-civicGold-100 border border-civicGold-700 text-civicGold-700 text-xs font-semibold">
                      <Award className="w-4 h-4" />
                      <span>Dokumen Asli Terdaftar</span>
                    </div>
                  )}
                  <p className="text-xs font-mono text-ink-muted mt-1">
                    Token: {token}
                  </p>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Footer info */}
        <p className="text-center text-xs text-ink-muted">
          Sistem Verifikasi Dokumen Publik — Lajnah Pentashihan Mushaf Al-Qur'an (LPMQ) &copy; 2026
        </p>
      </div>
    </div>
  );
};

export default PublicDocumentVerification;
