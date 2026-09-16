import React, { useState, useEffect, useRef } from 'react';
import { getAuthToken, ApiError } from '@/api/client';
import { FileText, Download, ExternalLink, RefreshCw, AlertCircle } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { clsx } from 'clsx';

const baseApiUrl = import.meta.env.VITE_API_URL || import.meta.env.VITE_API_BASE_URL || '/api/v1';

export const PrivateFileViewer = ({
  fileId,
  fileName = 'dokumen',
  mimeType,
  className,
  height = '500px',
  fallbackText = 'Pratinjau berkas tidak tersedia langsung.',
}) => {
  const [blobUrl, setBlobUrl] = useState(null);
  const [detectedType, setDetectedType] = useState(mimeType || '');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const activeUrlRef = useRef(null);

  const fetchPrivateBlob = async () => {
    if (!fileId) return;
    setLoading(true);
    setError(null);

    try {
      const token = getAuthToken();
      const response = await fetch(`${baseApiUrl}/uploads/${encodeURIComponent(fileId)}`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (!response.ok) {
        let msg = 'Gagal memuat berkas dari server yang aman.';
        try {
          const errData = await response.json();
          if (errData?.message) msg = errData.message;
        } catch {
          // ignore
        }
        throw new ApiError(msg, response.status);
      }

      const contentType = response.headers.get('content-type') || mimeType || '';
      setDetectedType(contentType);

      const blob = await response.blob();
      const url = URL.createObjectURL(blob);

      // Clean up previous blob URL if any
      if (activeUrlRef.current) {
        URL.revokeObjectURL(activeUrlRef.current);
      }

      activeUrlRef.current = url;
      setBlobUrl(url);
    } catch (err) {
      setError(err.message || 'Gagal memuat berkas.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPrivateBlob();

    return () => {
      if (activeUrlRef.current) {
        URL.revokeObjectURL(activeUrlRef.current);
        activeUrlRef.current = null;
      }
    };
  }, [fileId]);

  const handleDownload = () => {
    if (!blobUrl) return;
    const link = document.createElement('a');
    link.href = blobUrl;
    link.download = fileName.replace(/[\\/:*?"<>|]/g, '-');
    document.body.appendChild(link);
    link.click();
    link.remove();
  };

  const isPdf = detectedType.includes('pdf') || fileName.toLowerCase().endsWith('.pdf');
  const isImage = detectedType.startsWith('image/') || /\.(png|jpe?g|webp|gif)$/i.test(fileName);

  if (loading) {
    return (
      <div
        className={clsx(
          'flex flex-col items-center justify-center rounded-xl border border-slate-200 bg-slate-50 text-slate-500 p-8 space-y-3',
          className
        )}
        style={{ minHeight: height }}
      >
        <RefreshCw className="w-6 h-6 animate-spin text-emerald-700" />
        <p className="text-xs font-medium">Memuat pratinjau dokumen terenkripsi...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div
        className={clsx(
          'flex flex-col items-center justify-center rounded-xl border border-rose-200 bg-rose-50/50 text-rose-800 p-8 space-y-3 text-center',
          className
        )}
        style={{ minHeight: height }}
      >
        <AlertCircle className="w-8 h-8 text-rose-600" />
        <p className="text-sm font-bold">Berkas Belum Dapat Ditampilkan</p>
        <p className="text-xs text-rose-700 max-w-sm">{error}</p>
        <Button variant="outline" size="sm" onClick={fetchPrivateBlob} className="mt-2">
          <RefreshCw className="w-3.5 h-3.5 mr-1" /> Coba Lagi
        </Button>
      </div>
    );
  }

  return (
    <div
      className={clsx(
        'relative rounded-xl border border-slate-200 bg-slate-900/5 overflow-hidden flex flex-col',
        className
      )}
      style={{ height }}
    >
      {/* Top Toolbar */}
      <div className="bg-white border-b border-slate-200 px-4 py-2.5 flex items-center justify-between text-xs shrink-0">
        <div className="flex items-center gap-2 truncate max-w-md">
          <FileText className="w-4 h-4 text-emerald-800 shrink-0" />
          <span className="font-semibold text-slate-800 truncate" title={fileName}>
            {fileName}
          </span>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <Button
            variant="ghost"
            size="sm"
            onClick={handleDownload}
            className="text-xs text-slate-700 hover:text-emerald-800"
            title="Unduh Berkas"
          >
            <Download className="w-3.5 h-3.5 mr-1" /> Unduh
          </Button>
          {blobUrl && (
            <a
              href={blobUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1 text-xs font-semibold text-emerald-800 hover:underline px-2 py-1"
              title="Buka di Tab Baru"
            >
              <ExternalLink className="w-3.5 h-3.5" /> Tab Baru
            </a>
          )}
        </div>
      </div>

      {/* Main Preview Container */}
      <div className="flex-1 overflow-auto bg-slate-100 flex items-center justify-center p-2">
        {isPdf && blobUrl && (
          <iframe
            src={`${blobUrl}#toolbar=0&navpanes=0`}
            title={`Pratinjau Dokumen: ${fileName}`}
            className="w-full h-full border-0 rounded-lg bg-white shadow-2xs"
          />
        )}

        {isImage && blobUrl && (
          <img
            src={blobUrl}
            alt={`Pratinjau Gambar: ${fileName}`}
            className="max-w-full max-h-full object-contain rounded shadow-2xs"
          />
        )}

        {!isPdf && !isImage && (
          <div className="text-center p-8 space-y-3 bg-white rounded-xl border border-slate-200 max-w-md shadow-2xs">
            <FileText className="w-10 h-10 text-slate-400 mx-auto" />
            <h4 className="text-sm font-bold text-slate-800">{fileName}</h4>
            <p className="text-xs text-slate-500">{fallbackText}</p>
            <Button variant="primary" size="sm" onClick={handleDownload} className="mx-auto">
              <Download className="w-3.5 h-3.5 mr-1.5" /> Unduh Berkas Sekarang
            </Button>
          </div>
        )}
      </div>
    </div>
  );
};

export default PrivateFileViewer;

