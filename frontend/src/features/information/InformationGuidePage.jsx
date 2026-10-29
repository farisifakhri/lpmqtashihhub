import React, { useCallback, useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import {
  AlertCircle,
  ArrowLeft,
  ChevronLeft,
  ChevronRight,
  Download,
  Eye,
  FileText,
  RefreshCw,
  Search,
  X,
} from 'lucide-react';
import { informationGuideApi } from '@/api/information-guide.api';
import { PublicFooter } from '@/components/public/PublicFooter';
import { PublicHeader, PUBLIC_INFORMATION_NAV_ITEMS } from '@/components/public/PublicHeader';
import { InformationGuideContent } from './InformationGuideContent';

const BASE_PATH = '/informasi/panduan-permohonan-surat-tanda-tashih';

function getFileExtension(mimeType) {
  if (mimeType === 'application/pdf') return '.pdf';
  if (mimeType === 'application/msword') return '.doc';
  if (mimeType === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document') return '.docx';
  return '';
}

export function InformationGuidePage() {
  const navigate = useNavigate();
  const { id } = useParams();
  const [guides, setGuides] = useState([]);
  const [guide, setGuide] = useState(null);
  const [pagination, setPagination] = useState({ page: 1, limit: 10, total: 0, totalPages: 1 });
  const [page, setPage] = useState(1);
  const [searchValue, setSearchValue] = useState('');
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [previewUrl, setPreviewUrl] = useState('');
  const [previewOpen, setPreviewOpen] = useState(false);
  const [previewError, setPreviewError] = useState('');

  const fetchGuides = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const response = await informationGuideApi.listPublic({ page, limit: pagination.limit, search });
      setGuides(response.data || []);
      setPagination(response.pagination || { page: 1, limit: 10, total: 0, totalPages: 1 });
    } catch (requestError) {
      setError(requestError.message || 'Daftar panduan tidak dapat dimuat.');
      setGuides([]);
    } finally {
      setLoading(false);
    }
  }, [page, pagination.limit, search]);

  useEffect(() => {
    if (id) return undefined;
    setGuide(null);
    fetchGuides();
    return undefined;
  }, [fetchGuides, id]);

  useEffect(() => {
    if (!id) return undefined;
    let active = true;
    setLoading(true);
    setError('');
    informationGuideApi.getPublic(id)
      .then((response) => { if (active) setGuide(response.data); })
      .catch((requestError) => { if (active) setError(requestError.message || 'Panduan tidak dapat ditemukan.'); })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [id]);

  useEffect(() => {
    const timer = setTimeout(() => {
      setSearch(searchValue.trim());
      setPage(1);
    }, 350);
    return () => clearTimeout(timer);
  }, [searchValue]);

  useEffect(() => () => {
    if (previewUrl) URL.revokeObjectURL(previewUrl);
  }, [previewUrl]);

  const openFilePreview = async () => {
    if (!guide) return;
    setPreviewError('');
    setPreviewOpen(true);
    if (guide.mime_type !== 'application/pdf') return;
    try {
      const url = await informationGuideApi.fetchFileBlobUrl(guide.id);
      setPreviewUrl(url);
    } catch (requestError) {
      setPreviewError(requestError.message || 'Pratinjau berkas tidak dapat dimuat.');
    }
  };

  const downloadGuide = async () => {
    if (!guide) return;
    try {
      const fileName = `${guide.title}${getFileExtension(guide.mime_type)}`;
      await informationGuideApi.download(guide.id, fileName);
    } catch (requestError) {
      setError(requestError.message || 'Berkas tidak dapat diunduh.');
    }
  };

  const handleNavigate = (path, event) => {
    event?.preventDefault();
    if (path?.startsWith('/')) navigate(path);
  };

  return (
    <div className="min-h-screen bg-canvas font-sans text-ink">
      <PublicHeader
        activePage="Informasi"
        activeHref={BASE_PATH}
        navItems={PUBLIC_INFORMATION_NAV_ITEMS}
        handleNavigate={handleNavigate}
      />
      <main className="mx-auto min-h-[55vh] max-w-[1400px] px-5 py-8 sm:px-8 lg:px-12">
        <nav aria-label="Breadcrumb" className="mb-5 text-xs text-ink-muted">
          <Link to="/" className="hover:text-brand-700">Beranda</Link>
          <span className="mx-2">/</span>
          <Link to={BASE_PATH} className="hover:text-brand-700">Informasi</Link>
          <span className="mx-2">/</span>
          <span className="text-ink">Panduan Permohonan Surat Tanda Tashih/Izin Edar</span>
        </nav>

        {id ? (
          <section aria-labelledby="guide-detail-title" className="mx-auto max-w-4xl">
            <button type="button" onClick={() => navigate(BASE_PATH)} className="mb-5 inline-flex items-center gap-2 text-xs font-semibold text-brand-700 hover:text-brand-800">
              <ArrowLeft className="h-4 w-4" /> Kembali ke daftar panduan
            </button>
            {loading && <div className="h-40 animate-pulse rounded-2xl bg-surface-subtle" aria-busy="true" aria-label="Memuat panduan" />}
            {!loading && error && (
              <div className="rounded-2xl border border-civic-dangerLine bg-civic-dangerSoft p-6 text-center">
                <AlertCircle className="mx-auto h-6 w-6 text-civic-danger" />
                <p className="mt-2 text-sm text-civic-danger" role="alert">{error}</p>
              </div>
            )}
            {!loading && guide && (
              <article className="rounded-2xl border border-line bg-surface p-5 shadow-sm sm:p-8">
                <header className="border-b border-line pb-5">
                  <span className="inline-flex rounded-lg border border-brand-200 bg-brand-50 px-2.5 py-1 text-[11px] font-semibold text-brand-800">Informasi Layanan</span>
                  <h1 id="guide-detail-title" className="mt-3 text-xl font-extrabold leading-tight text-ink sm:text-2xl">{guide.title}</h1>
                  <p className="mt-2 text-xs text-ink-muted">
                    Diperbarui {new Date(guide.updated_at).toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' })}
                  </p>
                  {guide.content_type === 'DOCUMENT' && (
                    <div className="mt-4 flex flex-wrap gap-2">
                      <button type="button" onClick={openFilePreview} className="inline-flex items-center gap-2 rounded-xl border border-brand-200 bg-brand-50 px-4 py-2 text-xs font-semibold text-brand-800 hover:bg-brand-100">
                        <Eye className="h-4 w-4" /> Lihat panduan
                      </button>
                      <button type="button" onClick={downloadGuide} className="inline-flex items-center gap-2 rounded-xl bg-brand-700 px-4 py-2 text-xs font-semibold text-white hover:bg-brand-800">
                        <Download className="h-4 w-4" /> Unduh panduan
                      </button>
                    </div>
                  )}
                </header>
                {guide.content_type === 'EDITOR' ? (
                  <div className="pt-4">
                    <InformationGuideContent html={guide.content_html || ''} />
                  </div>
                ) : (
                  <div className="mt-5 flex items-start gap-3 rounded-xl border border-line bg-surface-subtle p-4">
                    <FileText className="mt-0.5 h-5 w-5 shrink-0 text-brand-700" />
                    <p className="text-sm leading-6 text-ink-muted">
                      {guide.mime_type === 'application/pdf'
                        ? 'Berkas PDF dapat dibaca pada pratinjau atau diunduh.'
                        : 'Berkas Word dapat diunduh dan dibuka menggunakan aplikasi pengolah dokumen.'}
                    </p>
                  </div>
                )}
              </article>
            )}
          </section>
        ) : (
          <section aria-labelledby="guide-list-title">
            <div className="mb-6">
              <span className="inline-flex rounded-lg border border-brand-200 bg-brand-50 px-2.5 py-1 text-[11px] font-bold text-brand-800">Informasi</span>
              <h1 id="guide-list-title" className="mt-3 text-2xl font-extrabold tracking-tight text-ink sm:text-3xl">Panduan Permohonan Surat Tanda Tashih/Izin Edar</h1>
              <p className="mt-2 max-w-3xl text-sm leading-6 text-ink-muted">Temukan panduan layanan permohonan Surat Tanda Tashih dan Izin Edar yang diterbitkan oleh LPMQ.</p>
            </div>
            <div className="mb-5 rounded-2xl border border-line bg-surface p-4 shadow-sm">
              <label className="relative block max-w-xl">
                <span className="sr-only">Cari panduan</span>
                <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-ink-muted" />
                <input type="search" value={searchValue} onChange={(event) => setSearchValue(event.target.value)} placeholder="Cari judul panduan..." className="w-full rounded-xl border border-line bg-surface px-3 py-2.5 pl-9 text-sm text-ink focus:border-brand-600 focus:outline-none focus:ring-1 focus:ring-brand-600" />
              </label>
            </div>

            {loading && <div className="space-y-3 rounded-2xl border border-line bg-surface p-5" aria-busy="true" aria-label="Memuat daftar panduan">{[1, 2, 3].map((row) => <div key={row} className="h-16 animate-pulse rounded-xl bg-surface-subtle" />)}</div>}
            {!loading && error && (
              <div className="rounded-2xl border border-civic-dangerLine bg-civic-dangerSoft p-8 text-center">
                <AlertCircle className="mx-auto h-6 w-6 text-civic-danger" />
                <p className="mt-2 text-sm text-civic-danger" role="alert">{error}</p>
                <button type="button" onClick={fetchGuides} className="mt-4 inline-flex items-center gap-2 rounded-xl bg-brand-700 px-4 py-2 text-xs font-semibold text-white"><RefreshCw className="h-4 w-4" /> Muat ulang</button>
              </div>
            )}
            {!loading && !error && guides.length === 0 && (
              <div className="rounded-2xl border border-line bg-surface px-5 py-14 text-center">
                <FileText className="mx-auto h-8 w-8 text-ink-muted" />
                <h2 className="mt-3 text-base font-bold text-ink">Panduan belum tersedia</h2>
                <p className="mt-1 text-sm text-ink-muted">Silakan kembali lagi nanti untuk melihat panduan layanan.</p>
              </div>
            )}
            {!loading && !error && guides.length > 0 && (
              <div className="overflow-hidden rounded-2xl border border-line bg-surface shadow-sm">
                <div className="divide-y divide-line">
                  {guides.map((item) => (
                    <article key={item.id} className="flex flex-col justify-between gap-4 p-4 sm:flex-row sm:items-center sm:px-5 sm:py-4">
                      <div className="flex min-w-0 items-start gap-3">
                        <span className="mt-0.5 rounded-xl border border-brand-200 bg-brand-50 p-2 text-brand-700"><FileText className="h-4 w-4" /></span>
                        <div className="min-w-0">
                          <h2 className="font-semibold leading-6 text-ink">{item.title}</h2>
                          <p className="mt-1 text-xs text-ink-muted">
                            {item.content_type === 'EDITOR' ? 'Panduan informasi' : 'Berkas unduhan'}
                            <span className="mx-2" aria-hidden="true">·</span>
                            {new Date(item.updated_at).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' })}
                          </p>
                        </div>
                      </div>
                      <Link to={`${BASE_PATH}/${item.id}`} className="inline-flex shrink-0 items-center justify-center gap-2 rounded-xl border border-brand-200 bg-brand-50 px-4 py-2 text-xs font-semibold text-brand-800 hover:bg-brand-100">
                        Lihat panduan <Eye className="h-4 w-4" />
                      </Link>
                    </article>
                  ))}
                </div>
                <div className="flex flex-col items-center justify-between gap-3 border-t border-line bg-surface-subtle/50 p-4 sm:flex-row">
                  <p className="text-xs text-ink-muted">Menampilkan {(pagination.page - 1) * pagination.limit + 1}–{Math.min(pagination.page * pagination.limit, pagination.total)} dari {pagination.total} panduan</p>
                  <div className="flex items-center gap-2">
                    <button type="button" onClick={() => setPage((value) => Math.max(1, value - 1))} disabled={page <= 1} className="inline-flex items-center gap-1 rounded-lg border border-line bg-surface px-3 py-2 text-xs text-ink disabled:opacity-40"><ChevronLeft className="h-3.5 w-3.5" /> Sebelumnya</button>
                    <span className="text-xs text-ink-muted">{pagination.page} / {pagination.totalPages || 1}</span>
                    <button type="button" onClick={() => setPage((value) => Math.min(pagination.totalPages, value + 1))} disabled={page >= pagination.totalPages} className="inline-flex items-center gap-1 rounded-lg border border-line bg-surface px-3 py-2 text-xs text-ink disabled:opacity-40">Berikutnya <ChevronRight className="h-3.5 w-3.5" /></button>
                  </div>
                </div>
              </div>
            )}
          </section>
        )}
      </main>
      <PublicFooter />

      {previewOpen && (
        <div className="fixed inset-0 z-[70] flex items-center justify-center bg-black/60 p-3 sm:p-6" role="dialog" aria-modal="true" aria-labelledby="guide-file-preview-title">
          <div className="flex max-h-[95vh] w-full max-w-5xl flex-col overflow-hidden rounded-2xl border border-line bg-surface shadow-2xl">
            <div className="flex items-center justify-between gap-4 border-b border-line p-4">
              <h2 id="guide-file-preview-title" className="truncate font-bold text-ink">{guide?.title}</h2>
              <button type="button" aria-label="Tutup pratinjau" onClick={() => { setPreviewOpen(false); setPreviewUrl(''); setPreviewError(''); }} className="rounded-lg p-1 text-ink-muted hover:bg-surface-subtle"><X className="h-5 w-5" /></button>
            </div>
            <div className="min-h-[50vh] overflow-auto p-4">
              {previewError && <p className="text-sm text-civic-danger" role="alert">{previewError}</p>}
              {guide?.mime_type === 'application/pdf' && previewUrl && <iframe title={`Pratinjau ${guide.title}`} src={previewUrl} className="h-[75vh] w-full rounded-lg border border-line" />}
              {guide?.mime_type === 'application/pdf' && !previewUrl && !previewError && <div className="py-12 text-center text-sm text-ink-muted">Memuat pratinjau PDF...</div>}
              {guide?.mime_type !== 'application/pdf' && <div className="py-12 text-center text-sm text-ink-muted">Pratinjau langsung tersedia untuk PDF. Unduh berkas Word untuk membukanya.</div>}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
