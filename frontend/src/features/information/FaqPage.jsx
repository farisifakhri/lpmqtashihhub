import React, { useCallback, useEffect, useState } from 'react';
import { AlertCircle, ChevronDown, ChevronLeft, ChevronRight, ChevronUp, HelpCircle, Search } from 'lucide-react';
import { Link, useNavigate } from 'react-router-dom';
import { faqApi, FAQ_CATEGORIES_OPTIONS } from '@/api/faq.api';
import { PublicFooter } from '@/components/public/PublicFooter';
import { PublicHeader, PUBLIC_INFORMATION_NAV_ITEMS } from '@/components/public/PublicHeader';

const EMPTY_PAGINATION = { page: 1, limit: 10, total: 0, totalPages: 1 };

function getCategoryLabel(category) {
  return FAQ_CATEGORIES_OPTIONS.find((item) => item.value === category)?.label || category;
}

function FaqAnswer({ answer }) {
  return (
    <div className="space-y-3 whitespace-pre-line text-sm leading-7 text-ink">
      {String(answer || '').split(/\n{2,}/).map((paragraph, index) => (
        <p key={`answer-${index}`}>{paragraph}</p>
      ))}
    </div>
  );
}

export function FaqPage() {
  const navigate = useNavigate();
  const [faqs, setFaqs] = useState([]);
  const [pagination, setPagination] = useState(EMPTY_PAGINATION);
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(10);
  const [category, setCategory] = useState('');
  const [searchValue, setSearchValue] = useState('');
  const [search, setSearch] = useState('');
  const [expandedId, setExpandedId] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const fetchFaqs = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const response = await faqApi.listPublic({
        page,
        limit,
        search,
        ...(category ? { category } : {}),
      });
      setFaqs(response.data || []);
      setPagination(response.pagination || { ...EMPTY_PAGINATION, page, limit });
    } catch (requestError) {
      setFaqs([]);
      setError(requestError.message || 'Daftar FAQ tidak dapat dimuat.');
    } finally {
      setLoading(false);
    }
  }, [page, limit, search, category]);

  useEffect(() => {
    fetchFaqs();
  }, [fetchFaqs]);

  useEffect(() => {
    const timer = setTimeout(() => {
      setSearch(searchValue.trim());
      setPage(1);
    }, 350);
    return () => clearTimeout(timer);
  }, [searchValue]);

  const handleNavigate = (path, event) => {
    event?.preventDefault();
    if (path?.startsWith('/')) navigate(path);
  };

  const changeCategory = (value) => {
    setCategory(value);
    setPage(1);
    setExpandedId(null);
  };

  const changeLimit = (value) => {
    setLimit(Number(value));
    setPage(1);
    setExpandedId(null);
  };

  return (
    <div className="min-h-screen bg-canvas font-sans text-ink">
      <PublicHeader
        activePage="FAQ"
        activeHref="/faq"
        navItems={PUBLIC_INFORMATION_NAV_ITEMS}
        handleNavigate={handleNavigate}
      />
      <section className="border-b border-line bg-surface">
        <div className="mx-auto max-w-[1400px] px-5 py-6 sm:px-8 lg:px-12">
          <nav aria-label="Breadcrumb" className="mb-4 flex flex-wrap items-center gap-2 text-xs text-ink-muted">
            <Link to="/" className="transition-colors hover:text-brand-700">Beranda</Link>
            <span className="text-line-strong">/</span>
            <span className="font-semibold text-brand-fg">FAQ</span>
          </nav>
          <div className="max-w-3xl space-y-2">
            <span className="inline-flex items-center gap-2 rounded-full border border-brand-200 bg-brand-50 px-3 py-1 text-xs font-semibold text-brand-800">
              <HelpCircle className="h-3.5 w-3.5" />
              Pertanyaan yang Sering Diajukan
            </span>
            <h1 className="text-2xl font-extrabold tracking-tight text-brand-900 sm:text-3xl lg:text-4xl">FAQ</h1>
            <p className="text-xs leading-relaxed text-ink-muted sm:text-sm">
              Temukan jawaban atas pertanyaan seputar layanan tashih online, Mushaf Standar Indonesia, dan regulasi.
            </p>
          </div>
        </div>
      </section>

      <main className="mx-auto min-h-[55vh] max-w-[1400px] px-5 py-8 sm:px-8 lg:px-12">
        <section aria-labelledby="faq-list-title" className="space-y-5">
          <h2 id="faq-list-title" className="sr-only">Daftar pertanyaan dan jawaban</h2>
          <div className="grid gap-3 rounded-2xl border border-line bg-surface p-4 shadow-sm md:grid-cols-[minmax(240px,1fr)_minmax(220px,280px)_auto] md:items-end">
            <label className="relative block">
              <span className="mb-1 block text-xs font-semibold text-ink-muted">Cari FAQ</span>
              <Search className="pointer-events-none absolute left-3 top-[calc(50%+8px)] h-4 w-4 -translate-y-1/2 text-ink-muted" />
              <input
                type="search"
                value={searchValue}
                onChange={(event) => setSearchValue(event.target.value)}
                placeholder="Cari pertanyaan atau jawaban..."
                className="w-full rounded-xl border border-line bg-surface px-3 py-2.5 pl-9 text-sm text-ink focus:border-brand-600 focus:outline-none focus:ring-1 focus:ring-brand-600"
              />
            </label>
            <label className="block">
              <span className="mb-1 block text-xs font-semibold text-ink-muted">Filter kategori</span>
              <select
                value={category}
                onChange={(event) => changeCategory(event.target.value)}
                className="w-full rounded-xl border border-line bg-surface px-3 py-2.5 text-sm text-ink focus:border-brand-600 focus:outline-none focus:ring-1 focus:ring-brand-600"
              >
                <option value="">Semua Kategori</option>
                {FAQ_CATEGORIES_OPTIONS.map((option) => (
                  <option key={option.value} value={option.value}>{option.label}</option>
                ))}
              </select>
            </label>
            <label className="flex items-center gap-2 text-xs text-ink-muted">
              <span>Baris per halaman</span>
              <select
                aria-label="Baris per halaman"
                value={limit}
                onChange={(event) => changeLimit(event.target.value)}
                className="rounded-lg border border-line bg-surface px-2.5 py-2 text-sm text-ink focus:border-brand-600 focus:outline-none"
              >
                {[5, 10, 20, 50].map((value) => <option key={value} value={value}>{value}</option>)}
              </select>
            </label>
          </div>

          {loading && (
            <div className="space-y-3 rounded-2xl border border-line bg-surface p-5" aria-busy="true" aria-label="Memuat daftar FAQ">
              {[1, 2, 3].map((row) => <div key={row} className="h-14 animate-pulse rounded-lg bg-surface-subtle" />)}
            </div>
          )}
          {!loading && error && (
            <div className="rounded-2xl border border-civic-dangerLine bg-civic-dangerSoft p-6 text-sm text-civic-danger" role="alert">
              <AlertCircle className="mr-2 inline h-4 w-4" />
              {error}
              <button type="button" onClick={fetchFaqs} className="ml-3 font-semibold underline">Coba lagi</button>
            </div>
          )}
          {!loading && !error && (
            <div className="overflow-x-auto rounded-2xl border border-line bg-surface shadow-sm">
              <table className="w-full min-w-[640px] text-left text-sm">
                <thead className="border-b border-line bg-surface-subtle text-xs font-bold uppercase tracking-wide text-ink-muted">
                  <tr>
                    <th scope="col" className="w-16 px-4 py-3 sm:px-5">No</th>
                    <th scope="col" className="w-56 px-4 py-3 sm:px-5">Kategori</th>
                    <th scope="col" className="px-4 py-3 sm:px-5">FAQ</th>
                    <th scope="col" className="w-44 px-4 py-3 text-center sm:px-5">Aksi</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-line">
                  {faqs.length ? faqs.map((faq, index) => {
                    const isExpanded = expandedId === faq.id;
                    const answerId = `faq-answer-${faq.id}`;
                    return (
                      <React.Fragment key={faq.id}>
                        <tr className="align-top hover:bg-surface-subtle/60">
                          <td className="px-4 py-4 text-ink-muted sm:px-5">{(pagination.page - 1) * pagination.limit + index + 1}</td>
                          <td className="px-4 py-4 sm:px-5">
                            <span className="inline-flex rounded-lg border border-brand-200 bg-brand-50 px-2.5 py-1 text-xs font-semibold text-brand-800">
                              {getCategoryLabel(faq.category)}
                            </span>
                          </td>
                          <td className="px-4 py-4 font-semibold leading-6 text-ink sm:px-5">{faq.question}</td>
                          <td className="px-4 py-4 text-center sm:px-5">
                            <button
                              type="button"
                              aria-expanded={isExpanded}
                              aria-controls={answerId}
                              onClick={() => setExpandedId(isExpanded ? null : faq.id)}
                              className="inline-flex items-center justify-center gap-1.5 whitespace-nowrap rounded-xl border border-brand-200 bg-brand-50 px-3 py-2 text-xs font-semibold text-brand-800 transition-colors hover:bg-brand-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-600"
                            >
                              {isExpanded ? 'Tutup Jawaban' : 'Lihat Jawaban'}
                              {isExpanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                            </button>
                          </td>
                        </tr>
                        <tr id={answerId} aria-hidden={!isExpanded} className="bg-surface-subtle/70">
                          <td colSpan={4} className="p-0">
                            <div
                              className={`grid overflow-hidden transition-[grid-template-rows,opacity] duration-300 ease-in-out motion-reduce:transition-none ${
                                isExpanded ? 'grid-rows-[1fr] opacity-100' : 'grid-rows-[0fr] opacity-0'
                              }`}
                            >
                              <div className="min-h-0 overflow-hidden">
                                <div className="px-5 py-5 sm:px-8">
                                  <div className="border-l-2 border-brand-600 pl-4">
                                    <p className="mb-2 text-xs font-bold uppercase tracking-wide text-brand-fg">Jawaban</p>
                                    <FaqAnswer answer={faq.answer} />
                                  </div>
                                </div>
                              </div>
                            </div>
                          </td>
                        </tr>
                      </React.Fragment>
                    );
                  }) : (
                    <tr>
                      <td colSpan={4} className="px-4 py-12 text-center text-sm text-ink-muted sm:px-5">
                        FAQ tidak ditemukan. Coba ubah kata kunci atau kategori.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
              {pagination.total > 0 && (
                <div className="flex flex-col items-center justify-between gap-3 border-t border-line bg-surface-subtle/50 p-4 sm:flex-row">
                  <p className="text-xs text-ink-muted">
                    Menampilkan {(pagination.page - 1) * pagination.limit + 1}–{Math.min(pagination.page * pagination.limit, pagination.total)} dari {pagination.total} FAQ
                  </p>
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => { setPage((value) => Math.max(1, value - 1)); setExpandedId(null); }}
                      disabled={page <= 1}
                      className="inline-flex items-center gap-1 rounded-lg border border-line bg-surface px-3 py-2 text-xs text-ink disabled:opacity-40"
                    >
                      <ChevronLeft className="h-3.5 w-3.5" /> Sebelumnya
                    </button>
                    <span className="text-xs text-ink-muted">{pagination.page} / {pagination.totalPages || 1}</span>
                    <button
                      type="button"
                      onClick={() => { setPage((value) => Math.min(pagination.totalPages, value + 1)); setExpandedId(null); }}
                      disabled={page >= pagination.totalPages}
                      className="inline-flex items-center gap-1 rounded-lg border border-line bg-surface px-3 py-2 text-xs text-ink disabled:opacity-40"
                    >
                      Berikutnya <ChevronRight className="h-3.5 w-3.5" />
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}
        </section>
      </main>
      <PublicFooter />
    </div>
  );
}
