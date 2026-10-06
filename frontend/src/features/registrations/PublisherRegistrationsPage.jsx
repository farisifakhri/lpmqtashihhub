import React, { useEffect, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import {
  ArrowLeft,
  Search,
  RefreshCw,
  Plus,
  BookOpen,
  AlertCircle,
  Clock,
  CheckCircle2,
  Filter,
} from 'lucide-react';
import { useAuth } from '@/features/auth/AuthContext';
import { registrationApi } from '@/api/registration.api';
import { Button } from '@/components/ui/Button';
import { EmptyState } from '@/components/ui/EmptyState';
import { QueuePagination } from '@/components/common/QueueOverview';
import { PublisherRegistrationCard } from './PublisherRegistrationCard';
import { PublisherDocumentList } from './PublisherDocumentList';
import { DocumentArchive } from '@/components/common/DocumentArchive';

const STATUS_FILTER_OPTIONS = [
  ['ALL', 'Semua permohonan'],
  ['actions', 'Perlu tindakan'],
  ['processing', 'Sedang diproses'],
  ['DRAFT', 'Draf'],
  ['REVISION_REQUIRED', 'Perlu perbaikan'],
  ['AWAITING_PAYMENT', 'Menunggu pembayaran'],
  ['PAYMENT_VERIFICATION', 'Bukti bayar diperiksa'],
  ['COMPLETED', 'Selesai'],
  ['CANCELLED', 'Dibatalkan'],
];

export function PublisherRegistrationsPage({ documents = false }) {
  const { currentUser } = useAuth();
  const [params, setParams] = useSearchParams();
  const query = params.get('search') || '';
  const view = params.get('view') || 'ALL';
  const requestedPage = Number(params.get('page'));
  const page =
    Number.isSafeInteger(requestedPage) && requestedPage > 0 && requestedPage <= 1000000
      ? requestedPage
      : 1;

  const [search, setSearch] = useState(query);
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [refresh, setRefresh] = useState(0);

  const change = (changes) => {
    const next = new URLSearchParams(params);
    Object.entries(changes).forEach(([key, value]) =>
      value ? next.set(key, value) : next.delete(key)
    );
    setParams(next, { replace: true });
  };

  useEffect(() => {
    setSearch(query);
  }, [query]);

  useEffect(() => {
    if (search === query) return;
    const timer = setTimeout(() => change({ search: search.trim(), page: null }), 300);
    return () => clearTimeout(timer);
  }, [search, query, view]);

  useEffect(() => {
    let active = true;
    setLoading(true);
    setError('');

    registrationApi
      .listRegistrations({
        page,
        limit: 12,
        search: query || undefined,
        segment: documents
          ? 'PUBLISHER_DOCUMENTS'
          : view === 'actions'
          ? 'PUBLISHER_ACTIONS'
          : view === 'processing'
          ? 'PUBLISHER_PROCESSING'
          : undefined,
        status:
          !documents &&
          STATUS_FILTER_OPTIONS.some(([key]) => key === view) &&
          !['ALL', 'actions', 'processing'].includes(view)
            ? view
            : undefined,
      })
      .then((response) => {
        if (active) setData(response);
      })
      .catch((err) => {
        if (active) setError(err.message || 'Permohonan tidak dapat dimuat.');
      })
      .finally(() => {
        if (active) setLoading(false);
      });

    return () => {
      active = false;
    };
  }, [currentUser?.id, documents, page, query, view, refresh]);

  // Quick filter tab definition
  const quickTabs = [
    { key: 'ALL', label: 'Semua', icon: BookOpen },
    { key: 'actions', label: 'Perlu Tindakan', icon: AlertCircle },
    { key: 'processing', label: 'Sedang Diproses', icon: Clock },
    { key: 'COMPLETED', label: 'Selesai', icon: CheckCircle2 },
  ];

  return (
    <div className="max-w-6xl mx-auto space-y-6 pb-16 animate-fadeIn">
      {/* Top Breadcrumb Navigation */}
      <div>
        <Link
          to="/publisher"
          className="inline-flex items-center gap-1.5 text-xs font-bold text-ink-muted hover:text-brand-800 transition-colors"
        >
          <ArrowLeft className="h-3.5 w-3.5" />
          Dashboard penerbit
        </Link>
      </div>

      {/* Main Page Header */}
      <header className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black text-ink">
            {documents ? 'Arsip Dokumen' : 'Permohonan Saya'}
          </h1>
          <p className="text-xs text-ink-muted mt-1 leading-relaxed">
            {documents
              ? 'Surat pemberitahuan, disposisi, hasil tashih, dan semua versi dokumen resmi permohonan Anda.'
              : 'Pantau status penelaahan naskah, lacak berkas fisik, dan tindak lanjuti tahapan pentashihan.'}
          </p>
        </div>

        {!documents && (
          <Link
            to="/publisher/new-registration"
            className="inline-flex items-center gap-2 rounded-xl bg-brand-800 text-white px-4 py-2.5 text-xs font-bold hover:bg-brand-900 shadow-xs transition-colors"
          >
            <Plus className="h-4 w-4" />
            Permohonan Tanda Tashih Baru
          </Link>
        )}
      </header>

      {/* Modern Filter Toolbar */}
      <div className="space-y-3">
        {/* Quick Segment Tabs (Only for registrations list, not documents) */}
        {!documents && (
          <div className="flex flex-wrap items-center gap-1.5 bg-surface-subtle p-1.5 rounded-xl border border-line">
            {quickTabs.map((tab) => {
              const Icon = tab.icon;
              const isActive = view === tab.key;
              return (
                <button
                  key={tab.key}
                  type="button"
                  onClick={() => change({ view: tab.key, page: null })}
                  className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                    isActive
                      ? 'bg-surface text-brand-900 shadow-2xs border border-line'
                      : 'text-ink-muted hover:text-ink hover:bg-surface/50'
                  }`}
                >
                  <Icon className={`w-3.5 h-3.5 ${isActive ? 'text-brand-700' : 'text-ink-muted'}`} />
                  <span>{tab.label}</span>
                </button>
              );
            })}
          </div>
        )}

        {/* Search Bar & Granular Status Filter */}
        <div className="flex flex-col sm:flex-row gap-2.5 bg-surface border border-line rounded-xl p-3 shadow-2xs">
          {/* Search Box */}
          <div className="relative flex-1">
            <label htmlFor="publisher-history-search" className="sr-only">
              Cari judul atau nomor permohonan
            </label>
            <Search className="absolute left-3 top-2.5 h-4 w-4 text-ink-muted pointer-events-none" />
            <input
              id="publisher-history-search"
              aria-label="Cari judul atau nomor permohonan"
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Cari judul atau nomor permohonan…"
              className="w-full rounded-lg border border-line-strong py-2 pl-9 pr-3 text-xs bg-canvas focus:bg-surface focus:ring-2 focus:ring-brand-700/20 focus:border-brand-700 outline-none transition-all"
            />
          </div>

          {/* Granular Status Select */}
          {!documents && (
            <div className="flex items-center gap-2">
              <label htmlFor="publisher-history-filter" className="sr-only">
                Filter permohonan
              </label>
              <select
                id="publisher-history-filter"
                aria-label="Filter permohonan"
                value={view}
                onChange={(event) => change({ view: event.target.value, page: null })}
                className="rounded-lg border border-line-strong px-3 py-2 text-xs bg-canvas font-medium text-ink focus:bg-surface focus:ring-2 focus:ring-brand-700/20 focus:border-brand-700 outline-none cursor-pointer"
              >
                {STATUS_FILTER_OPTIONS.map(([key, label]) => (
                  <option key={key} value={key}>
                    {label}
                  </option>
                ))}
              </select>
            </div>
          )}

          {/* Refresh Button */}
          <Button
            variant="outline"
            size="sm"
            disabled={loading}
            onClick={() => setRefresh((value) => value + 1)}
            className="text-xs shrink-0"
          >
            <RefreshCw className={`h-3.5 w-3.5 mr-1.5 ${loading ? 'animate-spin' : ''}`} />
            Muat ulang
          </Button>
        </div>
      </div>

      {/* Error Alert */}
      {error && (
        <div
          role="alert"
          className="rounded-xl bg-civic-dangerSoft border border-civic-dangerLine p-4 text-xs font-semibold text-civic-danger"
        >
          {error}
        </div>
      )}

      {/* Content Area */}
      {loading ? (
        <div className="py-12 text-center">
          <p role="status" className="text-xs font-medium text-ink-muted">
            Memuat {documents ? 'arsip dokumen' : 'permohonan'}…
          </p>
        </div>
      ) : (
        !error && (
          <>
            {data?.data?.length ? (
              <div className={`grid gap-4 ${documents ? 'grid-cols-1' : 'grid-cols-1 lg:grid-cols-2'}`}>
                {data.data.map((registration) =>
                  documents ? (
                    <article
                      key={registration.id}
                      className="rounded-2xl border border-line bg-surface p-5 space-y-4 shadow-2xs"
                    >
                      <div>
                        <Link
                          to={`/publisher/registrations/${registration.id}`}
                          className="font-bold text-ink hover:text-brand-800 text-sm"
                        >
                          {registration.title}
                        </Link>
                        <p className="font-mono text-xs text-ink-muted mt-1">
                          {registration.registration_no}
                        </p>
                      </div>
                      <PublisherDocumentList
                        documents={registration.official_documents}
                        registration={registration}
                      />
                      <DocumentArchive registrationId={registration.id} />
                    </article>
                  ) : (
                    <PublisherRegistrationCard
                      key={registration.id}
                      registration={registration}
                    />
                  )
                )}
              </div>
            ) : (
              <EmptyState
                title={
                  query || view !== 'ALL'
                    ? 'Permohonan tidak ditemukan'
                    : documents
                    ? 'Arsip dokumen belum tersedia'
                    : 'Belum ada permohonan'
                }
                description={
                  query || view !== 'ALL'
                    ? 'Ubah pencarian atau filter status Anda.'
                    : documents
                    ? 'Belum ada dokumen dalam arsip naskah Anda.'
                    : 'Mulai dengan membuat permohonan tanda tashih naskah baru.'
                }
              />
            )}

            {/* Pagination Controls */}
            {data?.pagination && (
              <QueuePagination
                label="Navigasi riwayat permohonan"
                pagination={data.pagination}
                loading={loading}
                onPageChange={(value) => change({ page: value })}
              />
            )}
          </>
        )
      )}
    </div>
  );
}
