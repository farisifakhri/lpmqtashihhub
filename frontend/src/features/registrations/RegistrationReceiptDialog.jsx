import React, { useRef, useEffect, useState, useCallback } from 'react';
import {
  Printer,
  Download,
  CheckCircle2,
  X,
  AlertCircle,
  Loader2,
  RefreshCw,
} from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { registrationApi } from '@/api/registration.api';

export const RegistrationReceiptDialog = ({ isOpen = true, onClose, registration }) => {
  const iframeRef = useRef(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [pdfBlob, setPdfBlob] = useState(null);
  const [pdfUrl, setPdfUrl] = useState(null);
  const [isDownloading, setIsDownloading] = useState(false);

  const regId = registration?.id;
  const regNo = registration?.registration_no || regId || 'REG';

  const pdfUrlRef = useRef(null);

  const fetchPdf = useCallback(async () => {
    if (!regId) return;
    setLoading(true);
    setError('');
    try {
      const blob = await registrationApi.getReceiptPdf(regId);
      setPdfBlob(blob);
      const url = URL.createObjectURL(blob);
      if (pdfUrlRef.current) {
        URL.revokeObjectURL(pdfUrlRef.current);
      }
      pdfUrlRef.current = url;
      setPdfUrl(url);
    } catch (err) {
      setError(err.message || 'Gagal memuat tanda terima PDF resmi.');
    } finally {
      setLoading(false);
    }
  }, [regId]);

  useEffect(() => {
    if (isOpen && regId) {
      fetchPdf();
    } else {
      setPdfBlob(null);
      if (pdfUrlRef.current) {
        URL.revokeObjectURL(pdfUrlRef.current);
        pdfUrlRef.current = null;
      }
      setPdfUrl(null);
      setError('');
      setLoading(true);
    }
  }, [isOpen, regId, fetchPdf]);

  useEffect(() => {
    return () => {
      if (pdfUrlRef.current) {
        URL.revokeObjectURL(pdfUrlRef.current);
        pdfUrlRef.current = null;
      }
    };
  }, []);

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

  const handleDownloadPdf = async () => {
    const safeRegNo = (registration.registration_no || registration.id || 'REG').replace(/[^a-zA-Z0-9_-]/g, '-');
    const filename = `Tanda-Terima-${safeRegNo}.pdf`;

    if (pdfBlob) {
      const url = URL.createObjectURL(pdfBlob);
      const link = document.createElement('a');
      link.href = url;
      link.download = filename;
      document.body.appendChild(link);
      link.click();
      link.remove();
      setTimeout(() => URL.revokeObjectURL(url), 1000);
      return;
    }

    setIsDownloading(true);
    setError('');
    try {
      await registrationApi.downloadReceiptPdf(registration.id, filename);
    } catch (err) {
      setError(err.message || 'Gagal mengunduh berkas PDF.');
    } finally {
      setIsDownloading(false);
    }
  };

  const handlePrint = () => {
    try {
      if (iframeRef.current?.contentWindow) {
        if (typeof iframeRef.current.contentWindow.focus === 'function') {
          iframeRef.current.contentWindow.focus();
        }
        if (typeof iframeRef.current.contentWindow.print === 'function') {
          iframeRef.current.contentWindow.print();
          return;
        }
      }
    } catch {
      // Fallback jika iframe print terblokir oleh browser
    }
    if (pdfUrl && typeof window !== 'undefined' && typeof window.open === 'function') {
      window.open(pdfUrl, '_blank');
    }
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="receipt-dialog-title"
      className="fixed inset-0 z-50 bg-ink/75 backdrop-blur-xs flex items-center justify-center p-2 sm:p-4 animate-fadeIn"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-5xl h-[92vh] flex flex-col border border-line overflow-hidden">
        {/* Sticky Header Bar */}
        <div className="shrink-0 flex items-center justify-between px-4 sm:px-6 py-3 border-b border-line bg-canvas">
          <div className="flex items-center gap-2.5 min-w-0">
            <CheckCircle2 className="w-5 h-5 text-brand-700 shrink-0" />
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <h2 id="receipt-dialog-title" className="font-bold text-ink text-xs sm:text-sm truncate">
                  Tanda Terima Permohonan Surat Tanda Tashih
                </h2>
                <span className="hidden sm:inline-block font-mono text-[11px] font-bold text-brand-800 bg-brand-50 px-2 py-0.5 rounded border border-brand-200 shrink-0">
                  {regNo}
                </span>
              </div>
              <p className="text-[11px] text-ink-muted truncate hidden sm:block">
                Dokumen resmi ber-QR diterbitkan elektronik oleh LPMQ Kemenag RI
              </p>
            </div>
          </div>

          <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
            {/* Download PDF Button */}
            <Button
              variant="outline"
              size="sm"
              disabled={loading || isDownloading}
              onClick={handleDownloadPdf}
              className="text-xs font-bold py-1 px-2.5 sm:px-3 text-ink hover:text-brand-800 border-line"
              title="Unduh berkas PDF resmi"
            >
              {isDownloading ? (
                <Loader2 className="w-3.5 h-3.5 mr-1 animate-spin text-brand-700" />
              ) : (
                <Download className="w-3.5 h-3.5 mr-1 text-brand-700" />
              )}
              {isDownloading ? 'Mengunduh...' : 'Unduh PDF'}
            </Button>

            {/* Print Button */}
            <Button
              variant="primary"
              size="sm"
              disabled={loading || !pdfUrl}
              onClick={handlePrint}
              className="text-xs font-bold py-1 px-2.5 sm:px-3"
              title="Cetak dokumen tanda terima resmi"
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

        {/* Modal Body: Loading, Error, or Iframe Preview */}
        <div className="flex-1 bg-surface-subtle relative flex flex-col overflow-hidden">
          {loading && (
            <div className="flex-1 flex flex-col items-center justify-center p-6 text-center">
              <Loader2 className="w-9 h-9 animate-spin text-brand-700 mb-3" />
              <p className="text-sm font-semibold text-ink">Menyiapkan pratinjau tanda terima resmi...</p>
              <p className="text-xs text-ink-muted mt-1">Mengambil dokumen PDF ber-QR resmi dari sistem LPMQ</p>
            </div>
          )}

          {!loading && error && (
            <div className="flex-1 flex flex-col items-center justify-center p-6 text-center max-w-md mx-auto">
              <div className="w-12 h-12 rounded-full bg-civic-dangerSoft text-civic-danger flex items-center justify-center mb-3">
                <AlertCircle className="w-6 h-6" />
              </div>
              <h3 className="text-sm font-bold text-ink">Gagal Membuka Tanda Terima PDF</h3>
              <p className="text-xs text-civic-danger mt-1 mb-4">{error}</p>
              <div className="flex items-center gap-2">
                <Button variant="outline" size="sm" onClick={onClose} className="text-xs">
                  Tutup
                </Button>
                <Button variant="primary" size="sm" onClick={fetchPdf} className="text-xs">
                  <RefreshCw className="w-3.5 h-3.5 mr-1" />
                  Coba Lagi
                </Button>
              </div>
            </div>
          )}

          {!loading && !error && pdfUrl && (
            <iframe
              ref={iframeRef}
              title="Penampil PDF tanda terima pendaftaran"
              src={pdfUrl}
              className="flex-1 w-full h-full border-0 bg-white"
            />
          )}
        </div>

        {/* Sticky Footer Bar */}
        <div className="shrink-0 px-4 sm:px-6 py-2.5 bg-canvas border-t border-line flex items-center justify-between">
          <p className="text-[11px] text-ink-muted hidden sm:block">
            Petunjuk: Cetak 1 eksemplar tanda terima ini sebagai bukti pendaftaran resmi LPMQ.
          </p>
          <div className="flex items-center justify-end gap-2 w-full sm:w-auto">
            <Button variant="outline" size="sm" onClick={onClose} className="text-xs py-1 px-3">
              Tutup
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default RegistrationReceiptDialog;
