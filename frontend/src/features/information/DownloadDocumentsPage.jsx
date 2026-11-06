import React, { useCallback, useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { AlertCircle, ChevronDown, ChevronLeft, ChevronRight, Download, FileText, Filter, RefreshCw, X } from 'lucide-react';
import { PublicAppPromotion } from '@/components/public/PublicAppPromotion';
import { PublicFooter } from '@/components/public/PublicFooter';
import { PUBLIC_INFORMATION_NAV_ITEMS, PublicHeader } from '@/components/public/PublicHeader';
import { serviceDocumentApi } from '@/api/service-document.api';
import { SERVICE_DOCUMENT_CATEGORIES } from './service-document.constants';

const PAGE_SIZE_OPTIONS = [5, 10, 25, 50];
const PAGE_TITLE = 'Unduh Dokumen Seputar Pelayanan Surat Tanda Tashih/Izin Edar';
const PAGE_PATH = '/informasi/unduh-dokumen-pelayanan-surat-tanda-tashih';

export const DownloadDocumentsPage = () => {
  const navigate = useNavigate();
  const [documents, setDocuments] = useState([]);
  const [pagination, setPagination] = useState({ page: 1, limit: 10, total: 0, totalPages: 1 });
  const [category, setCategory] = useState('ALL');
  const [limit, setLimit] = useState(10);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [downloadError, setDownloadError] = useState(null);
  const [downloadingId, setDownloadingId] = useState(null);

  const fetchDocuments = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await serviceDocumentApi.listPublic({ page, limit, category });
      if (!response?.success) throw new Error('Daftar dokumen belum dapat dimuat.');
      setDocuments(response.data || []);
      setPagination(response.pagination || { page, limit, total: 0, totalPages: 1 });
    } catch (requestError) {
      console.error('Gagal mengambil daftar dokumen unduhan:', requestError);
      setError(requestError.message || 'Terjadi kendala saat memuat dokumen. Silakan coba kembali.');
      setDocuments([]);
    } finally {
      setLoading(false);
    }
  }, [page, limit, category]);

  useEffect(() => {
    fetchDocuments();
  }, [fetchDocuments]);

  const handleNavigate = (path, event) => {
    if (event && (event.metaKey || event.ctrlKey || event.shiftKey || event.altKey || event.button !== 0)) return;
    if (event) event.preventDefault();
    navigate(path);
  };

  const handleDownload = async (document) => {
    setDownloadingId(document.id);
    try {
      await serviceDocumentApi.download(document.id, document.file_name || `${document.title}.pdf`);
    } catch (downloadError) {
      console.error('Gagal mengunduh dokumen pelayanan:', downloadError);
      setDownloadError(downloadError.message || 'Dokumen tidak dapat diunduh. Silakan coba kembali.');
    } finally {
      setDownloadingId(null);
    }
  };

  const totalPages = pagination.totalPages || 1;
  const startRecord = pagination.total ? (pagination.page - 1) * pagination.limit + 1 : 0;
  const endRecord = Math.min(pagination.page * pagination.limit, pagination.total);

  return (
    <div className="min-h-screen bg-canvas font-sans text-ink">
      <PublicHeader
        activePage="Informasi"
        activeHref={PAGE_PATH}
        handleNavigate={handleNavigate}
        navItems={PUBLIC_INFORMATION_NAV_ITEMS}
        logoHref="/"
      />

      <section className="border-b border-line bg-surface">
        <div className="mx-auto max-w-[1400px] px-5 py-6 sm:px-8 lg:px-12">
          <nav aria-label="Breadcrumb" className="mb-4 flex flex-wrap items-center gap-2 text-xs text-ink-muted">
            <Link to="/" onClick={(event) => handleNavigate('/', event)} className="hover:text-brand-700">
              Beranda
            </Link>
            <span aria-hidden="true">/</span>
            <span>Informasi</span>
            <span aria-hidden="true">/</span>
            <span className="font-semibold text-brand-fg">{PAGE_TITLE}</span>
          </nav>
          <div className="flex flex-col justify-between gap-4 md:flex-row md:items-end">
            <div className="max-w-3xl space-y-2">
              <div className="inline-flex items-center gap-2 rounded-full border border-brand-200 bg-brand-50 px-3 py-1 text-xs font-semibold text-brand-800">
                <FileText className="h-3.5 w-3.5" />
                <span>Dokumen Pelayanan</span>
              </div>
              <h1 className="text-2xl font-extrabold tracking-tight text-brand-900 sm:text-3xl lg:text-4xl">
                {PAGE_TITLE}
              </h1>
              <p className="text-xs leading-relaxed text-ink-muted sm:text-sm">
                Unduh dokumen dan panduan seputar pelayanan Surat Tanda Tashih/Izin Edar.
              </p>
            </div>
            <button
              type="button"
              onClick={fetchDocuments}
              disabled={loading}
              className="inline-flex shrink-0 items-center justify-center gap-1.5 rounded-xl border border-line bg-surface px-3.5 py-2 text-xs font-medium text-ink transition-colors hover:bg-surface-subtle disabled:opacity-50"
            >
              <RefreshCw className={`h-3.5 w-3.5 ${loading ? 'animate-spin' : ''}`} />
              <span>Segarkan</span>
            </button>
          </div>
        </div>
      </section>

      <main className="mx-auto max-w-[1400px] px-5 py-8 sm:px-8 lg:px-12">
        <div className="mb-6 grid grid-cols-1 gap-3 rounded-2xl border border-line bg-surface p-4 shadow-sm sm:grid-cols-2 sm:p-5">
          <div className="relative">
            <label htmlFor="service-document-category" className="mb-1.5 block text-xs font-semibold text-ink-muted">
              Filter Kategori
            </label>
            <div className="relative">
              <select
                id="service-document-category"
                value={category}
                onChange={(event) => {
                  setCategory(event.target.value);
                  setPage(1);
                }}
                className="w-full appearance-none rounded-xl border border-line bg-surface py-2.5 pl-9 pr-9 text-xs font-medium text-ink focus:border-brand-600 focus:outline-none focus:ring-1 focus:ring-brand-600"
              >
                <option value="ALL">Semua Kategori</option>
                {SERVICE_DOCUMENT_CATEGORIES.map((item) => <option key={item} value={item}>{item}</option>)}
              </select>
              <Filter className="pointer-events-none absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-ink-muted" />
              <ChevronDown className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-ink-muted" />
            </div>
          </div>
          <div className="relative">
            <label htmlFor="service-document-limit" className="mb-1.5 block text-xs font-semibold text-ink-muted">
              Tampilkan Baris
            </label>
            <div className="relative">
              <select
                id="service-document-limit"
                value={limit}
                onChange={(event) => {
                  setLimit(Number(event.target.value));
                  setPage(1);
                }}
                className="w-full appearance-none rounded-xl border border-line bg-surface py-2.5 pl-3 pr-9 text-xs font-medium text-ink focus:border-brand-600 focus:outline-none focus:ring-1 focus:ring-brand-600"
              >
                {PAGE_SIZE_OPTIONS.map((size) => <option key={size} value={size}>{size} baris</option>)}
              </select>
              <ChevronDown className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-ink-muted" />
            </div>
          </div>
        </div>

        <div className="overflow-hidden rounded-2xl border border-line bg-surface shadow-sm">
          {downloadError && (
            <div role="alert" className="flex items-center justify-between gap-3 border-b border-civic-dangerLine bg-civic-dangerSoft px-4 py-3 text-xs font-medium text-civic-danger">
              <span>{downloadError}</span>
              <button type="button" onClick={() => setDownloadError(null)} aria-label="Tutup notifikasi unduhan" className="rounded p-1 hover:bg-white/50">
                <X className="h-4 w-4" />
              </button>
            </div>
          )}
          {error && !loading && (
            <div role="alert" className="flex flex-col items-center gap-3 p-8 text-center">
              <AlertCircle className="h-6 w-6 text-civic-danger" />
              <p className="text-sm font-semibold text-ink">{error}</p>
              <button type="button" onClick={fetchDocuments} className="rounded-xl bg-brand-700 px-4 py-2 text-xs font-semibold text-white hover:bg-brand-800">
                Coba Lagi
              </button>
            </div>
          )}

          <div className="overflow-x-auto">
            <table className="w-full border-collapse text-left">
              <thead>
                <tr className="border-b border-line bg-surface-subtle text-xs font-bold uppercase tracking-wider text-ink-muted">
                  <th scope="col" className="w-16 px-4 py-3.5 text-center">No</th>
                  <th scope="col" className="min-w-[240px] px-4 py-3.5">Judul Dokumen</th>
                  <th scope="col" className="min-w-[220px] px-4 py-3.5">Kategori</th>
                  <th scope="col" className="w-36 px-4 py-3.5 text-center">Aksi</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-line text-xs">
                {loading && (
                  <tr><td colSpan="4" className="px-4 py-12 text-center text-ink-muted">Memuat daftar dokumen...</td></tr>
                )}
                {!loading && !error && documents.length === 0 && (
                  <tr><td colSpan="4" className="px-4 py-12 text-center text-ink-muted">Belum ada dokumen yang tersedia.</td></tr>
                )}
                {!loading && !error && documents.map((document, index) => (
                  <tr key={document.id} className="transition-colors hover:bg-surface-subtle/70">
                    <td className="px-4 py-4 text-center font-semibold text-ink-muted">
                      {(pagination.page - 1) * pagination.limit + index + 1}
                    </td>
                    <td className="px-4 py-4 font-semibold leading-relaxed text-ink">{document.title}</td>
                    <td className="px-4 py-4">
                      <span className="inline-flex whitespace-normal rounded-lg border border-brand-200 bg-brand-50 px-2.5 py-1 text-[11px] font-semibold text-brand-800">
                        {document.category}
                      </span>
                    </td>
                    <td className="px-4 py-4 text-center">
                      <button
                        type="button"
                        onClick={() => handleDownload(document)}
                        disabled={downloadingId === document.id}
                        className="inline-flex items-center justify-center gap-1.5 rounded-xl bg-brand-700 px-3 py-1.5 text-xs font-semibold text-white transition-colors hover:bg-brand-800 disabled:opacity-50"
                        aria-label={`Unduh ${document.title}`}
                      >
                        <Download className={`h-3.5 w-3.5 ${downloadingId === document.id ? 'animate-bounce' : ''}`} />
                        <span>{downloadingId === document.id ? 'Mengunduh...' : 'Unduh'}</span>
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {!loading && !error && documents.length > 0 && (
            <div className="flex flex-col items-center justify-between gap-3 border-t border-line px-4 py-3 text-xs sm:flex-row">
              <span className="text-ink-muted">Menampilkan {startRecord}-{endRecord} dari {pagination.total} dokumen</span>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setPage((current) => Math.max(1, current - 1))}
                  disabled={pagination.page <= 1}
                  className="inline-flex items-center gap-1 rounded-lg border border-line px-2.5 py-1.5 font-medium text-ink hover:bg-surface-subtle disabled:pointer-events-none disabled:opacity-40"
                >
                  <ChevronLeft className="h-3.5 w-3.5" /> Sebelumnya
                </button>
                <span className="font-semibold text-ink">Halaman {pagination.page} dari {totalPages}</span>
                <button
                  type="button"
                  onClick={() => setPage((current) => Math.min(totalPages, current + 1))}
                  disabled={pagination.page >= totalPages}
                  className="inline-flex items-center gap-1 rounded-lg border border-line px-2.5 py-1.5 font-medium text-ink hover:bg-surface-subtle disabled:pointer-events-none disabled:opacity-40"
                >
                  Berikutnya <ChevronRight className="h-3.5 w-3.5" />
                </button>
              </div>
            </div>
          )}
        </div>
      </main>

      <PublicAppPromotion />
      <PublicFooter handleNavigate={handleNavigate} linkTargets={{ complaint: '/', faq: '/' }} />
    </div>
  );
};

export default DownloadDocumentsPage;
