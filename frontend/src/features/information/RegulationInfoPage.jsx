import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  Search,
  Filter,
  Eye,
  Download,
  FileText,
  ChevronLeft,
  ChevronRight,
  AlertCircle,
  RefreshCw,
  X,
  Plus,
  Minus,
  Menu,
  ExternalLink,
  ChevronDown,
  Layers,
  ArrowLeft,
  LogIn,
} from 'lucide-react';
import logoTashih from '@/assets/logo-lpmq1.webp';
import logoyt from '@/assets/logoyt.webp';
import logox from '@/assets/logox.webp';
import logoig from '@/assets/logoig.webp';
import logofb from '@/assets/logofb.webp';
import qrcodeapk from '@/assets/qrcodeapk.webp';
import mockup from '@/assets/mockup.webp';
import playstore from '@/assets/playstore.webp';
import appstore from '@/assets/appstore.webp';
import pilihanfitur from '@/assets/pilihanfitur.webp';
import { regulationApi } from '@/api/regulation.api';

const CATEGORIES = [
  'Semua Kategori',
  'Ketentuan Pentashihan',
  'Peraturan Menteri Agama RI',
  'Peraturan Pemerintah Republik Indonesia',
  'Siaran Pers LPMQ',
  'SK Kepala Badan Litbang dan Diklat Kementerian Agama RI',
  'SK Kepala Lajnah Pentashihan Mushaf Al-Qur\'an',
  'Surat Edaran Kepala Lajnah Pentashihan Mushaf Al-Qur\'an',
];

const navItems = [
  { label: 'Beranda', href: '/' },
  {
    label: 'Informasi',
    href: '#',
    children: [
      { label: 'Informasi Layanan Pentashihan', href: '/' },
      { label: 'Alur & Regulasi STT', href: '/' },
      { label: 'Persyaratan Berkas Naskah', href: '/' },
      { label: "Regulasi Penerbit Mushaf Al-Qur'an", href: '/informasi/regulasi-penerbit-mushaf' },
    ],
  },
  { label: 'Permohonan Master', href: '/' },
  {
    label: 'Pengaduan',
    href: '#',
    children: [
      { label: 'Saluran Pengaduan Masyarakat', href: '/' },
      { label: 'Cek Status Laporan Naskah', href: '/' },
      { label: 'Kontak Pusat Bantuan LPMQ', href: '/' },
    ],
  },
  { label: 'FAQ', href: '/' },
];

const socialMediaLinks = [
  { name: 'YouTube', href: 'https://www.youtube.com/@lajnahpentashihanmushafal-6842', icon: logoyt, ariaLabel: 'Kunjungi YouTube resmi LPMQ' },
  { name: 'X', href: 'https://x.com/LPMQKemenagRI', icon: logox, ariaLabel: 'Kunjungi akun X (Twitter) resmi LPMQ' },
  { name: 'Instagram', href: 'https://www.instagram.com/lpmqkemenag/', icon: logoig, ariaLabel: 'Kunjungi Instagram resmi LPMQ' },
  { name: 'Facebook', href: 'https://www.facebook.com/lajnahkemenag15', icon: logofb, ariaLabel: 'Kunjungi Facebook resmi LPMQ' },
];

export const RegulationInfoPage = () => {
  const navigate = useNavigate();
  const [menuOpen, setMenuOpen] = useState(false);
  const [activeDropdown, setActiveDropdown] = useState(null);
  const [mobileDropdown, setMobileDropdown] = useState(null);

  // Data states
  const [regulations, setRegulations] = useState([]);
  const [pagination, setPagination] = useState({ page: 1, limit: 10, total: 0, totalPages: 1 });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Filters & controls
  const [selectedCategory, setSelectedCategory] = useState('Semua Kategori');
  const [searchInput, setSearchInput] = useState('');
  const [activeSearch, setActiveSearch] = useState('');
  const [limit, setLimit] = useState(10);
  const [page, setPage] = useState(1);

  // Preview Modal
  const [previewDoc, setPreviewDoc] = useState(null);
  const [previewBlobUrl, setPreviewBlobUrl] = useState(null);
  const [previewLoading, setPreviewLoading] = useState(false);
  const [previewError, setPreviewError] = useState(null);

  // Download indicator state
  const [downloadingId, setDownloadingId] = useState(null);

  // Fetch regulations from backend
  const fetchRegulations = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await regulationApi.getPublicRegulations({
        page,
        limit,
        category: selectedCategory,
        search: activeSearch,
      });

      if (response && response.success) {
        setRegulations(response.data || []);
        if (response.pagination) {
          setPagination(response.pagination);
        }
      } else {
        setRegulations([]);
      }
    } catch (err) {
      console.error('Gagal mengambil data regulasi:', err);
      setError(err.message || 'Terjadi kendala saat memuat dokumen regulasi. Silakan periksa koneksi Anda.');
      setRegulations([]);
    } finally {
      setLoading(false);
    }
  }, [page, limit, selectedCategory, activeSearch]);

  useEffect(() => {
    fetchRegulations();
  }, [fetchRegulations]);

  // Handle live search debounce
  useEffect(() => {
    const timer = setTimeout(() => {
      setActiveSearch(searchInput);
      setPage(1);
    }, 350);
    return () => clearTimeout(timer);
  }, [searchInput]);

  const handleCategoryChange = (e) => {
    setSelectedCategory(e.target.value);
    setPage(1);
  };

  const handleLimitChange = (e) => {
    setLimit(Number(e.target.value));
    setPage(1);
  };

  const handleResetFilter = () => {
    setSelectedCategory('Semua Kategori');
    setSearchInput('');
    setActiveSearch('');
    setPage(1);
  };

  // Preview Document Handler
  const handleOpenPreview = async (doc) => {
    setPreviewDoc(doc);
    setPreviewLoading(true);
    setPreviewError(null);
    setPreviewBlobUrl(null);

    try {
      const blobUrl = await regulationApi.fetchPreviewBlobUrl(doc.id);
      setPreviewBlobUrl(blobUrl);
    } catch (err) {
      console.error('Gagal memuat pratinjau PDF:', err);
      setPreviewError(err.message || 'Gagal memuat pratinjau berkas dokumen. Anda dapat mengunduhnya secara langsung.');
    } finally {
      setPreviewLoading(false);
    }
  };

  const handleClosePreview = () => {
    if (previewBlobUrl) {
      URL.revokeObjectURL(previewBlobUrl);
    }
    setPreviewDoc(null);
    setPreviewBlobUrl(null);
    setPreviewError(null);
  };

  // Download Handler
  const handleDownload = async (doc) => {
    setDownloadingId(doc.id);
    try {
      const fileName = doc.file_name || `${doc.title}.pdf`;
      await regulationApi.downloadRegulation(doc.id, fileName);
    } catch (err) {
      console.error('Gagal mengunduh dokumen:', err);
      alert('Gagal mengunduh dokumen regulasi. Silakan coba kembali.');
    } finally {
      setDownloadingId(null);
    }
  };

  // Navigation handler
  const handleNavigate = (path, e) => {
    if (e && (e.metaKey || e.ctrlKey || e.shiftKey || e.altKey || e.button !== 0)) {
      return;
    }
    if (e) e.preventDefault();
    setMenuOpen(false);
    setActiveDropdown(null);
    setMobileDropdown(null);
    navigate(path);
  };

  // Compute pagination range
  const paginationRange = useMemo(() => {
    const totalPages = pagination.totalPages || 1;
    const current = pagination.page || 1;
    const delta = 1;
    const range = [];

    for (let i = Math.max(2, current - delta); i <= Math.min(totalPages - 1, current + delta); i++) {
      range.push(i);
    }

    if (current - delta > 2) {
      range.unshift('...');
    }
    if (current + delta < totalPages - 1) {
      range.push('...');
    }

    range.unshift(1);
    if (totalPages > 1) {
      range.push(totalPages);
    }

    return range;
  }, [pagination.page, pagination.totalPages]);

  const startRecord = (pagination.page - 1) * pagination.limit + 1;
  const endRecord = Math.min(pagination.page * pagination.limit, pagination.total);

  return (
    <div className="min-h-screen bg-canvas font-sans text-ink">
      {/* 1. Sticky Header / Navbar */}
      <header className="sticky top-0 z-50 border-b border-line bg-surface/95 backdrop-blur">
        <div className="mx-auto flex h-[76px] max-w-[1400px] items-center justify-between px-5 sm:px-8 lg:px-12">
          {/* Desktop Nav */}
          <nav className="hidden items-center gap-7 lg:flex" aria-label="Navigasi utama">
            {navItems.map((item) => {
              const hasChildren = item.children && item.children.length > 0;
              const isOpen = activeDropdown === item.label;

              if (hasChildren) {
                return (
                  <div
                    key={item.label}
                    className="relative py-2"
                    onMouseEnter={() => setActiveDropdown(item.label)}
                    onMouseLeave={() => setActiveDropdown(null)}
                  >
                    <button
                      type="button"
                      onClick={() => setActiveDropdown(isOpen ? null : item.label)}
                      className={`inline-flex items-center gap-1.5 text-[13px] font-medium transition-colors ${
                        item.label === 'Informasi'
                          ? 'text-brand-700 font-semibold'
                          : 'text-ink-muted hover:text-brand-700'
                      }`}
                    >
                      <span>{item.label}</span>
                      <span
                        className={`inline-flex items-center justify-center w-3.5 h-3.5 rounded text-[11px] font-bold transition-transform duration-200 ${
                          isOpen ? 'text-brand-700 rotate-180' : 'text-ink-muted'
                        }`}
                        aria-hidden="true"
                      >
                        {isOpen ? <Minus className="h-3 w-3 stroke-[2.5]" /> : <Plus className="h-3 w-3 stroke-[2.5]" />}
                      </span>
                    </button>

                    {/* Dropdown desktop */}
                    <div
                      className={`absolute left-0 top-full pt-2 w-72 z-50 transition-all duration-200 ease-out origin-top-left ${
                        isOpen
                          ? 'opacity-100 scale-100 translate-y-0 pointer-events-auto'
                          : 'opacity-0 scale-95 -translate-y-1.5 pointer-events-none'
                      }`}
                    >
                      <div className="rounded-2xl border border-line bg-surface p-2 shadow-2xl">
                        <div className="flex flex-col gap-1">
                          {item.children.map((child, cIdx) => {
                            const isCurrent = child.href === '/informasi/regulasi-penerbit-mushaf';
                            return (
                              <button
                                key={cIdx}
                                type="button"
                                onClick={(e) => {
                                  setActiveDropdown(null);
                                  handleNavigate(child.href, e);
                                }}
                                className={`flex items-center gap-2.5 rounded-xl px-3 py-2 text-xs font-semibold text-left transition-colors ${
                                  isCurrent
                                    ? 'bg-brand-50 text-brand-700'
                                    : 'text-ink hover:bg-surface-subtle hover:text-brand-700'
                                }`}
                              >
                                <span
                                  className={`w-1.5 h-1.5 rounded-full shrink-0 ${
                                    isCurrent ? 'bg-brand-700' : 'bg-line-strong'
                                  }`}
                                />
                                <span>{child.label}</span>
                              </button>
                            );
                          })}
                        </div>
                      </div>
                    </div>
                  </div>
                );
              }

              return (
                <button
                  key={item.label}
                  type="button"
                  onClick={(e) => handleNavigate(item.href, e)}
                  className="text-[13px] font-medium transition-colors py-2 text-ink-muted hover:text-brand-700"
                >
                  {item.label}
                </button>
              );
            })}
          </nav>

          {/* Logo Branding */}
          <Link
            to="/"
            onClick={(e) => handleNavigate('/', e)}
            className="group flex items-center gap-3 transition-opacity hover:opacity-95"
            aria-label="Kembali ke Beranda LPMQ Tashih Hub"
          >
            <div className="flex flex-col items-end">
              <span className="text-right text-xs font-bold leading-tight tracking-wider text-brand-800">
                KEMENTERIAN AGAMA RI
              </span>
              <span className="text-right text-[11px] font-medium leading-tight text-ink-muted">
                Lajnah Pentashihan Mushaf Al-Qur'an
              </span>
            </div>
            <img
              src={logoTashih}
              alt="Logo Resmi LPMQ"
              className="h-10 w-auto object-contain transition-transform group-hover:scale-105"
            />
          </Link>

          {/* Login Penerbit & Mobile Menu Button */}
          <div className="flex items-center gap-3">
            <Link
              to="/login"
              onClick={(e) => handleNavigate('/login', e)}
              className="hidden sm:inline-flex items-center gap-2 rounded-xl bg-brand-700 px-5 py-2.5 text-xs font-semibold text-white shadow-sm transition hover:bg-brand-800 focus:outline-none"
            >
              <LogIn className="h-4 w-4" />
              <span>Login Penerbit</span>
            </Link>

            <button
              type="button"
              onClick={() => setMenuOpen(!menuOpen)}
              className="rounded-xl p-2.5 text-ink-muted hover:bg-surface-subtle hover:text-ink lg:hidden focus:outline-none"
              aria-label="Buka navigasi mobile"
              aria-expanded={menuOpen}
            >
              {menuOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
            </button>
          </div>
        </div>

        {/* Mobile Dropdown Panel */}
        {menuOpen && (
          <div className="border-b border-line bg-surface p-4 shadow-xl lg:hidden">
            <div className="flex flex-col gap-1.5">
              {navItems.map((item) => {
                const hasChildren = item.children && item.children.length > 0;
                const isMobileOpen = mobileDropdown === item.label;

                if (hasChildren) {
                  return (
                    <div key={item.label} className="rounded-xl overflow-hidden">
                      <div className="flex items-center justify-between rounded-xl px-3 py-2.5 text-sm font-medium text-ink hover:bg-surface-subtle">
                        <span className="flex-1 font-semibold text-brand-700">{item.label}</span>
                        <button
                          type="button"
                          onClick={() => setMobileDropdown((prev) => (prev === item.label ? null : item.label))}
                          className="p-1 rounded-md text-ink-muted hover:text-brand-fg focus:outline-none"
                          aria-label={`Toggle submenu ${item.label}`}
                        >
                          {isMobileOpen ? <Minus className="h-4 w-4 stroke-[2.5]" /> : <Plus className="h-4 w-4 stroke-[2.5]" />}
                        </button>
                      </div>

                      {isMobileOpen && (
                        <div className="mx-2 mb-2 p-2 bg-surface-subtle rounded-xl border border-line flex flex-col gap-1">
                          {item.children.map((child, cIdx) => (
                            <button
                              key={cIdx}
                              type="button"
                              onClick={(e) => handleNavigate(child.href, e)}
                              className="flex items-center gap-2 rounded-lg px-3 py-2 text-xs font-medium text-ink hover:text-brand-700 text-left"
                            >
                              <span className="w-1.5 h-1.5 rounded-full bg-brand-600 shrink-0" />
                              <span>{child.label}</span>
                            </button>
                          ))}
                        </div>
                      )}
                    </div>
                  );
                }

                return (
                  <button
                    key={item.label}
                    type="button"
                    onClick={(e) => handleNavigate(item.href, e)}
                    className="flex w-full items-center rounded-xl px-3 py-2.5 text-sm font-medium text-ink hover:bg-surface-subtle hover:text-brand-700 text-left"
                  >
                    {item.label}
                  </button>
                );
              })}

              <div className="pt-2 border-t border-line mt-1">
                <Link
                  to="/login"
                  onClick={(e) => handleNavigate('/login', e)}
                  className="flex w-full items-center justify-center gap-2 rounded-xl bg-brand-700 px-4 py-2.5 text-xs font-semibold text-white shadow-sm hover:bg-brand-800"
                >
                  <LogIn className="h-4 w-4" />
                  <span>Login Penerbit</span>
                </Link>
              </div>
            </div>
          </div>
        )}
      </header>

      {/* 2. Breadcrumb & Section Header */}
      <section className="border-b border-line bg-surface">
        <div className="mx-auto max-w-[1400px] px-5 py-6 sm:px-8 lg:px-12">
          {/* Breadcrumbs */}
          <nav aria-label="Breadcrumb" className="mb-4 flex items-center gap-2 text-xs text-ink-muted">
            <Link
              to="/"
              onClick={(e) => handleNavigate('/', e)}
              className="hover:text-brand-700 transition-colors flex items-center gap-1"
            >
              <span>Beranda</span>
            </Link>
            <span className="text-line-strong">/</span>
            <span className="text-ink-muted">Informasi</span>
            <span className="text-line-strong">/</span>
            <span className="font-semibold text-brand-700">Regulasi Penerbit Mushaf Al-Qur’an</span>
          </nav>

          <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
            <div className="max-w-3xl space-y-2">
              <div className="inline-flex items-center gap-2 rounded-full border border-brand-200 bg-brand-50 px-3 py-1 text-xs font-semibold text-brand-800">
                <FileText className="h-3.5 w-3.5" />
                <span>Dokumen Regulasi Resmi</span>
              </div>
              <h1 className="text-2xl sm:text-3xl lg:text-4xl font-extrabold text-brand-900 tracking-tight">
                Regulasi Penerbit Mushaf Al-Qur’an
              </h1>
              <p className="text-xs sm:text-sm text-ink-muted leading-relaxed">
                Halaman ini menyajikan dokumen regulasi resmi, ketentuan teknis pentashihan, peraturan pemerintah, serta keputusan kepala lajnah terkait penerbitan mushaf Al-Qur’an di Indonesia sesuai ketetapan Lajnah Pentashihan Mushaf Al-Qur'an (LPMQ) Kementerian Agama Republik Indonesia.
              </p>
            </div>

            <div className="flex items-center gap-2 shrink-0">
              <button
                type="button"
                onClick={fetchRegulations}
                disabled={loading}
                className="inline-flex items-center gap-1.5 rounded-xl border border-line bg-surface px-3.5 py-2 text-xs font-medium text-ink hover:bg-surface-subtle transition-colors disabled:opacity-50"
                title="Muat ulang data"
              >
                <RefreshCw className={`h-3.5 w-3.5 ${loading ? 'animate-spin' : ''}`} />
                <span>Segarkan</span>
              </button>
            </div>
          </div>
        </div>
      </section>

      {/* 3. Main Content: Filter, Search, and Regulation Table */}
      <main className="mx-auto max-w-[1400px] px-5 py-8 sm:px-8 lg:px-12">
        {/* Controls Bar */}
        <div className="mb-6 rounded-2xl border border-line bg-surface p-4 sm:p-5 shadow-sm space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-12 gap-3.5 items-center">
            {/* Filter Kategori Dropdown */}
            <div className="md:col-span-5 relative">
              <label htmlFor="category-filter" className="block text-xs font-semibold text-ink-muted mb-1.5">
                Kategori Regulasi
              </label>
              <div className="relative">
                <select
                  id="category-filter"
                  value={selectedCategory}
                  onChange={handleCategoryChange}
                  className="w-full appearance-none rounded-xl border border-line bg-surface py-2.5 pl-9 pr-9 text-xs font-medium text-ink focus:border-brand-600 focus:outline-none focus:ring-1 focus:ring-brand-600 transition"
                >
                  {CATEGORIES.map((cat) => (
                    <option key={cat} value={cat}>
                      {cat}
                    </option>
                  ))}
                </select>
                <Filter className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-ink-muted" />
                <ChevronDown className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-ink-muted" />
              </div>
            </div>

            {/* Pencarian Dokumen */}
            <div className="md:col-span-5 relative">
              <label htmlFor="search-input" className="block text-xs font-semibold text-ink-muted mb-1.5">
                Cari Judul atau Nomor Dokumen
              </label>
              <div className="relative">
                <input
                  id="search-input"
                  type="text"
                  value={searchInput}
                  onChange={(e) => setSearchInput(e.target.value)}
                  placeholder="Ketik kata kunci pencarian..."
                  className="w-full rounded-xl border border-line bg-surface py-2.5 pl-9 pr-8 text-xs font-medium text-ink placeholder:text-ink-muted/60 focus:border-brand-600 focus:outline-none focus:ring-1 focus:ring-brand-600 transition"
                />
                <Search className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-ink-muted" />
                {searchInput && (
                  <button
                    type="button"
                    onClick={() => setSearchInput('')}
                    className="absolute right-2.5 top-1/2 -translate-y-1/2 p-0.5 rounded-full text-ink-muted hover:text-ink hover:bg-surface-subtle"
                    aria-label="Bersihkan pencarian"
                  >
                    <X className="h-3.5 w-3.5" />
                  </button>
                )}
              </div>
            </div>

            {/* Kontrol Jumlah Baris */}
            <div className="md:col-span-2">
              <label htmlFor="limit-select" className="block text-xs font-semibold text-ink-muted mb-1.5">
                Tampilkan Baris
              </label>
              <div className="relative">
                <select
                  id="limit-select"
                  value={limit}
                  onChange={handleLimitChange}
                  className="w-full appearance-none rounded-xl border border-line bg-surface py-2.5 pl-3 pr-8 text-xs font-medium text-ink focus:border-brand-600 focus:outline-none focus:ring-1 focus:ring-brand-600 transition"
                >
                  <option value={5}>5 baris</option>
                  <option value={10}>10 baris</option>
                  <option value={25}>25 baris</option>
                  <option value={50}>50 baris</option>
                </select>
                <ChevronDown className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-ink-muted" />
              </div>
            </div>
          </div>

          {/* Active Filter Chips */}
          {(selectedCategory !== 'Semua Kategori' || activeSearch) && (
            <div className="flex flex-wrap items-center gap-2 pt-2 border-t border-line text-xs">
              <span className="text-ink-muted font-medium">Filter aktif:</span>
              {selectedCategory !== 'Semua Kategori' && (
                <span className="inline-flex items-center gap-1.5 rounded-lg border border-brand-200 bg-brand-50 px-2.5 py-1 font-semibold text-brand-800">
                  <span>Kategori: {selectedCategory}</span>
                  <button
                    type="button"
                    onClick={() => setSelectedCategory('Semua Kategori')}
                    className="hover:text-brand-950"
                  >
                    <X className="h-3 w-3" />
                  </button>
                </span>
              )}
              {activeSearch && (
                <span className="inline-flex items-center gap-1.5 rounded-lg border border-brand-200 bg-brand-50 px-2.5 py-1 font-semibold text-brand-800">
                  <span>Pencarian: "{activeSearch}"</span>
                  <button
                    type="button"
                    onClick={() => setSearchInput('')}
                    className="hover:text-brand-950"
                  >
                    <X className="h-3 w-3" />
                  </button>
                </span>
              )}
              <button
                type="button"
                onClick={handleResetFilter}
                className="text-xs text-brand-700 font-semibold hover:underline ml-1"
              >
                Reset Semua
              </button>
            </div>
          )}
        </div>

        {/* Tabel Regulasi */}
        <div className="rounded-2xl border border-line bg-surface shadow-sm overflow-hidden">
          {/* Error State */}
          {error && !loading && (
            <div className="p-8 text-center space-y-3">
              <div className="inline-flex p-3 rounded-full bg-civic-dangerSoft text-civic-danger">
                <AlertCircle className="h-6 w-6" />
              </div>
              <p className="text-sm font-semibold text-ink">{error}</p>
              <button
                type="button"
                onClick={fetchRegulations}
                className="inline-flex items-center gap-2 rounded-xl bg-brand-700 px-4 py-2 text-xs font-semibold text-white hover:bg-brand-800 transition"
              >
                <RefreshCw className="h-3.5 w-3.5" />
                <span>Coba Lagi</span>
              </button>
            </div>
          )}

          {/* Loading Skeleton */}
          {loading && (
            <div className="p-6 space-y-4">
              <div className="h-5 w-48 rounded bg-surface-subtle animate-pulse" />
              <div className="space-y-3">
                {[1, 2, 3, 4, 5].map((i) => (
                  <div key={i} className="h-12 w-full rounded-xl bg-surface-subtle animate-pulse" />
                ))}
              </div>
            </div>
          )}

          {/* Empty State */}
          {!loading && !error && regulations.length === 0 && (
            <div className="py-16 px-4 text-center space-y-3">
              <div className="inline-flex p-3.5 rounded-full bg-surface-subtle text-ink-muted">
                <FileText className="h-8 w-8" />
              </div>
              <h3 className="text-base font-bold text-ink">Tidak Ada Dokumen Regulasi Ditemukan</h3>
              <p className="text-xs sm:text-sm text-ink-muted max-w-md mx-auto">
                {selectedCategory !== 'Semua Kategori' || activeSearch
                  ? 'Tidak ditemukan dokumen regulasi yang cocok dengan kriteria filter atau pencarian Anda. Silakan coba atur ulang filter.'
                  : 'Belum ada dokumen regulasi resmi yang terdaftar pada sistem saat ini.'}
              </p>
              {(selectedCategory !== 'Semua Kategori' || activeSearch) && (
                <button
                  type="button"
                  onClick={handleResetFilter}
                  className="inline-flex items-center gap-2 rounded-xl border border-line px-4 py-2 text-xs font-semibold text-ink hover:bg-surface-subtle transition"
                >
                  <RefreshCw className="h-3.5 w-3.5" />
                  <span>Atur Ulang Filter</span>
                </button>
              )}
            </div>
          )}

          {/* Table Data */}
          {!loading && !error && regulations.length > 0 && (
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b border-line bg-surface-subtle text-xs font-bold text-ink-muted uppercase tracking-wider">
                    <th scope="col" className="py-3.5 px-4 text-center w-16">
                      No
                    </th>
                    <th scope="col" className="py-3.5 px-4 min-w-[280px]">
                      Judul Dokumen
                    </th>
                    <th scope="col" className="py-3.5 px-4 min-w-[200px]">
                      Kategori
                    </th>
                    <th scope="col" className="py-3.5 px-4 min-w-[180px]">
                      Nomor Regulasi
                    </th>
                    <th scope="col" className="py-3.5 px-4 text-center min-w-[170px] w-48">
                      Aksi
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-line text-xs font-normal">
                  {regulations.map((doc, idx) => {
                    const rowNumber = (pagination.page - 1) * pagination.limit + idx + 1;
                    const isDownloading = downloadingId === doc.id;

                    return (
                      <tr
                        key={doc.id}
                        className="transition-colors hover:bg-surface-subtle/70 group"
                      >
                        {/* No */}
                        <td className="py-4 px-4 text-center font-semibold text-ink-muted">
                          {rowNumber}
                        </td>

                        {/* Judul */}
                        <td className="py-4 px-4">
                          <div className="font-semibold text-ink leading-relaxed group-hover:text-brand-800 transition-colors">
                            {doc.title}
                          </div>
                          {doc.file_name && (
                            <div className="text-[11px] text-ink-muted mt-0.5 flex items-center gap-1.5">
                              <span className="font-mono text-ink-muted/80">{doc.file_name}</span>
                              {doc.file_size && (
                                <span className="text-ink-muted/60">
                                  ({(doc.file_size / 1024).toFixed(0)} KB)
                                </span>
                              )}
                            </div>
                          )}
                        </td>

                        {/* Kategori */}
                        <td className="py-4 px-4">
                          <span className="inline-flex items-center rounded-lg border border-brand-200 bg-brand-50 px-2.5 py-1 text-[11px] font-semibold text-brand-800">
                            {doc.category}
                          </span>
                        </td>

                        {/* Nomor Regulasi */}
                        <td className="py-4 px-4">
                          <span className="font-mono text-xs font-medium text-ink bg-surface-subtle px-2 py-0.5 rounded border border-line">
                            {doc.document_number}
                          </span>
                        </td>

                        {/* Aksi: Lihat & Unduh */}
                        <td className="py-4 px-4 text-center">
                          <div className="flex items-center justify-center gap-2">
                            {/* Tombol Lihat */}
                            <button
                              type="button"
                              onClick={() => handleOpenPreview(doc)}
                              className="inline-flex items-center gap-1.5 rounded-xl bg-brand-50 border border-brand-200 px-3 py-1.5 text-xs font-semibold text-brand-700 hover:bg-brand-700 hover:text-white transition-colors focus:outline-none"
                              title="Lihat Pratinjau Dokumen"
                            >
                              <Eye className="h-3.5 w-3.5" />
                              <span>Lihat</span>
                            </button>

                            {/* Tombol Unduh */}
                            <button
                              type="button"
                              onClick={() => handleDownload(doc)}
                              disabled={isDownloading}
                              className="inline-flex items-center gap-1.5 rounded-xl border border-line bg-surface px-3 py-1.5 text-xs font-semibold text-ink hover:bg-surface-subtle hover:text-brand-700 transition-colors focus:outline-none disabled:opacity-50"
                              title="Unduh Berkas Resmi"
                            >
                              <Download className={`h-3.5 w-3.5 ${isDownloading ? 'animate-bounce' : ''}`} />
                              <span>{isDownloading ? 'Mengunduh...' : 'Unduh'}</span>
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}

          {/* Pagination Controls */}
          {!loading && !error && regulations.length > 0 && (
            <div className="flex flex-col sm:flex-row items-center justify-between gap-4 p-4 border-t border-line bg-surface">
              <div className="text-xs text-ink-muted font-medium">
                Menampilkan <span className="font-semibold text-ink">{startRecord}</span> -{' '}
                <span className="font-semibold text-ink">{endRecord}</span> dari{' '}
                <span className="font-semibold text-ink">{pagination.total}</span> dokumen
              </div>

              <div className="flex items-center gap-1">
                {/* Previous Button */}
                <button
                  type="button"
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                  disabled={pagination.page <= 1}
                  className="inline-flex items-center gap-1 rounded-lg border border-line bg-surface px-2.5 py-1.5 text-xs font-medium text-ink hover:bg-surface-subtle transition-colors disabled:opacity-40 disabled:pointer-events-none"
                  aria-label="Halaman sebelumnya"
                >
                  <ChevronLeft className="h-3.5 w-3.5" />
                  <span className="hidden sm:inline">Sebelumnya</span>
                </button>

                {/* Page Number Buttons */}
                <div className="flex items-center gap-1">
                  {paginationRange.map((item, idx) => {
                    if (item === '...') {
                      return (
                        <span key={`dots-${idx}`} className="px-2 text-xs text-ink-muted">
                          ...
                        </span>
                      );
                    }

                    const isCurrent = item === pagination.page;
                    return (
                      <button
                        key={item}
                        type="button"
                        onClick={() => setPage(item)}
                        className={`min-w-[32px] h-8 rounded-lg text-xs font-semibold transition-colors ${
                          isCurrent
                            ? 'bg-brand-700 text-white shadow-sm'
                            : 'border border-line bg-surface text-ink hover:bg-surface-subtle'
                        }`}
                      >
                        {item}
                      </button>
                    );
                  })}
                </div>

                {/* Next Button */}
                <button
                  type="button"
                  onClick={() => setPage((p) => Math.min(pagination.totalPages, p + 1))}
                  disabled={pagination.page >= pagination.totalPages}
                  className="inline-flex items-center gap-1 rounded-lg border border-line bg-surface px-2.5 py-1.5 text-xs font-medium text-ink hover:bg-surface-subtle transition-colors disabled:opacity-40 disabled:pointer-events-none"
                  aria-label="Halaman berikutnya"
                >
                  <span className="hidden sm:inline">Berikutnya</span>
                  <ChevronRight className="h-3.5 w-3.5" />
                </button>
              </div>
            </div>
          )}
        </div>
      </main>

      {/* 4. Modal Pratinjau Dokumen PDF */}
      {previewDoc && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-black/60 backdrop-blur-sm animate-fade-in"
          role="dialog"
          aria-modal="true"
          aria-labelledby="modal-preview-title"
        >
          <div className="relative flex flex-col w-full max-w-4xl h-[90vh] rounded-2xl border border-line bg-surface shadow-2xl overflow-hidden">
            {/* Modal Header */}
            <div className="flex items-center justify-between border-b border-line px-5 py-4 bg-surface">
              <div className="min-w-0 pr-4">
                <span className="inline-flex items-center rounded-md border border-brand-200 bg-brand-50 px-2 py-0.5 text-[10px] font-bold text-brand-800 uppercase tracking-wide mb-1">
                  {previewDoc.category}
                </span>
                <h3 id="modal-preview-title" className="text-sm sm:text-base font-bold text-ink truncate">
                  {previewDoc.title}
                </h3>
                <p className="text-xs text-ink-muted font-mono">{previewDoc.document_number}</p>
              </div>

              <div className="flex items-center gap-2 shrink-0">
                <button
                  type="button"
                  onClick={() => handleDownload(previewDoc)}
                  className="inline-flex items-center gap-1.5 rounded-xl bg-brand-700 px-3 py-1.5 text-xs font-semibold text-white hover:bg-brand-800 transition"
                  title="Unduh Berkas Ini"
                >
                  <Download className="h-3.5 w-3.5" />
                  <span className="hidden sm:inline">Unduh</span>
                </button>

                <button
                  type="button"
                  onClick={handleClosePreview}
                  className="p-1.5 rounded-xl text-ink-muted hover:bg-surface-subtle hover:text-ink transition focus:outline-none"
                  aria-label="Tutup pratinjau"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>
            </div>

            {/* Modal Content / PDF Viewer */}
            <div className="flex-1 bg-surface-subtle relative overflow-hidden flex items-center justify-center">
              {previewLoading && (
                <div className="text-center space-y-3">
                  <RefreshCw className="h-8 w-8 text-brand-700 animate-spin mx-auto" />
                  <p className="text-xs font-medium text-ink-muted">Memuat pratinjau dokumen PDF...</p>
                </div>
              )}

              {previewError && !previewLoading && (
                <div className="p-6 text-center max-w-md space-y-3">
                  <div className="inline-flex p-3 rounded-full bg-civic-warningSoft text-civic-warning">
                    <AlertCircle className="h-6 w-6" />
                  </div>
                  <h4 className="text-sm font-bold text-ink">Gagal Membuka Pratinjau PDF</h4>
                  <p className="text-xs text-ink-muted">{previewError}</p>
                  <button
                    type="button"
                    onClick={() => handleDownload(previewDoc)}
                    className="inline-flex items-center gap-2 rounded-xl bg-brand-700 px-4 py-2 text-xs font-semibold text-white hover:bg-brand-800 transition"
                  >
                    <Download className="h-3.5 w-3.5" />
                    <span>Unduh Dokumen Secara Langsung</span>
                  </button>
                </div>
              )}

              {previewBlobUrl && !previewLoading && (
                <iframe
                  src={previewBlobUrl}
                  title={`Pratinjau Dokumen: ${previewDoc.title}`}
                  className="w-full h-full border-0"
                />
              )}
            </div>

            {/* Modal Footer */}
            <div className="flex items-center justify-between border-t border-line px-5 py-3 bg-surface text-xs text-ink-muted">
              <span>Format: Dokumen PDF Resmi LPMQ</span>
              <button
                type="button"
                onClick={handleClosePreview}
                className="rounded-lg border border-line px-3 py-1 font-medium text-ink hover:bg-surface-subtle transition"
              >
                Tutup
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 5. Promosi Aplikasi Qur’an Kemenag (Persis Sesuai Desain Landing Page) */}
      <div className="lpmq-app-footer-gradient text-white">
        <section
          id="aplikasi-quran-kemenag"
          aria-labelledby="quran-app-title"
          className="mx-auto grid max-w-[1400px] grid-cols-1 items-center gap-8 overflow-hidden px-5 py-10 sm:px-8 sm:py-12 md:grid-cols-[minmax(0,1.25fr)_minmax(170px,0.65fr)] lg:grid-cols-[minmax(0,1.2fr)_180px_minmax(280px,0.85fr)] lg:gap-10 lg:px-12 lg:py-14"
        >
          <div className="space-y-4">
            <h2
              id="quran-app-title"
              className="text-2xl font-extrabold leading-tight tracking-tight text-white sm:text-3xl"
            >
              Yuk Download Aplikasi
              <br />
              Qur’an Kemenag Sekarang!
            </h2>
            <p className="max-w-2xl text-sm leading-relaxed text-white/90 sm:text-base">
              Dapatkan kenyamanan dan kemudahan membaca kitab suci Al-Qur’an kapan dan di mana saja. Dengan aplikasi Qur’an Kemenag, siapapun dapat mengecek Surat Tanda Tashih pada mushaf yang beredar di Indonesia.
            </p>
            <div className="flex flex-wrap items-center gap-3 pt-1">
              <a
                href="https://play.google.com/store/apps/details?id=com.quran.kemenag&hl=id&gl=US&pli=1"
                target="_blank"
                rel="noopener noreferrer"
                aria-label="Download Qur’an Kemenag di Google Play"
                className="inline-flex rounded-md focus-visible:ring-offset-brand-900"
              >
                <img src={playstore} alt="Get it on Google Play" className="h-11 w-auto object-contain" />
              </a>
              <a
                href="https://apps.apple.com/us/app/quran-kemenag/id1626953037"
                target="_blank"
                rel="noopener noreferrer"
                aria-label="Download Qur’an Kemenag di App Store"
                className="inline-flex rounded-md focus-visible:ring-offset-brand-900"
              >
                <img src={appstore} alt="Download on the App Store" className="h-11 w-auto object-contain" />
              </a>
            </div>
          </div>

          <div className="flex flex-col items-center gap-3 md:justify-self-end lg:justify-self-center">
            <div className="flex items-center justify-center gap-3">
              <img src={pilihanfitur} alt="" aria-hidden="true" className="h-7 w-7 shrink-0 object-contain" />
              <p className="text-right text-sm font-bold leading-tight text-white">
                Banyak Pilihan
                <br />
                Fitur
              </p>
            </div>
            <div className="rounded-lg bg-white p-2 text-center">
              <p className="mb-2 rounded border border-brand-300 bg-brand-800 px-2 py-1 text-xs font-semibold text-white">
                Scan untuk Download
              </p>
              <img
                src={qrcodeapk}
                alt="QR code untuk mengunduh aplikasi Qur’an Kemenag"
                className="h-32 w-32 object-contain sm:h-36 sm:w-36"
              />
            </div>
          </div>

          <div className="flex justify-center md:col-span-2 lg:col-span-1">
            <img
              src={mockup}
              alt="Tampilan aplikasi Qur’an Kemenag pada ponsel"
              className="h-72 w-full max-w-xs object-contain sm:h-80 md:h-96 md:max-w-sm lg:h-[440px] lg:max-w-none"
            />
          </div>
        </section>
      </div>

      {/* 6. Footer (Persis Sesuai Desain Landing Page) */}
      <footer className="bg-brand-950 text-white">
        <div className="mx-auto grid max-w-[1400px] grid-cols-1 gap-10 px-5 py-10 sm:px-8 md:grid-cols-2 lg:grid-cols-[minmax(0,0.9fr)_minmax(0,1fr)_minmax(0,1.7fr)] lg:gap-8 lg:px-12 lg:py-12">
          <div className="space-y-4">
            <img src={logoTashih} alt="Logo Tashih LPMQ" className="w-32 max-w-full object-contain" />
            <address className="space-y-1 text-xs not-italic leading-relaxed text-white/85">
              <p>Gedung Bayt Al-Qur'an &amp; Museum Istiqlal</p>
              <p>Jalan Raya TMII Pintu I Jakarta Timur 13560</p>
              <p>Telp: (021) 8416468 - 8416466</p>
              <p>Faks: (021) 8416468</p>
              <p>Narahubung Layanan Pentashihan: +628111997125</p>
            </address>
            <div className="flex items-center gap-3 sm:gap-4">
              {socialMediaLinks.map((social) => (
                <a
                  key={social.name}
                  href={social.href}
                  target="_blank"
                  rel="noopener noreferrer"
                  aria-label={social.ariaLabel}
                  className="inline-flex items-center justify-center rounded-md transition-opacity hover:opacity-80 focus-visible:ring-white"
                >
                  <img src={social.icon} alt={social.name} className="h-5 w-auto object-contain sm:h-6" />
                </a>
              ))}
            </div>
          </div>

          <div className="space-y-3">
            <h3 className="text-sm font-bold text-white">Layanan Terkait</h3>
            <ul className="space-y-2 text-xs text-white/80">
              <li>
                <a
                  href="https://lajnah.kemenag.go.id"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1 hover:text-white"
                >
                  <span>Portal Resmi LPMQ</span>
                  <ExternalLink className="h-3 w-3" />
                </a>
              </li>
              <li>
                <a
                  href="https://quran.kemenag.go.id"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1 hover:text-white"
                >
                  <span>Qur'an Kemenag Web</span>
                  <ExternalLink className="h-3 w-3" />
                </a>
              </li>
              <li>
                <a
                  href="https://kemenag.go.id"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1 hover:text-white"
                >
                  <span>Kementerian Agama RI</span>
                  <ExternalLink className="h-3 w-3" />
                </a>
              </li>
            </ul>
          </div>

          <div className="space-y-3">
            <h3 className="text-sm font-bold text-white">Jam Layanan Konsultasi &amp; Loket Fisik</h3>
            <p className="text-xs text-white/80 leading-relaxed">
              Senin - Kamis: 08.30 - 15.30 WIB (Istirahat: 12.00 - 13.00 WIB)
              <br />
              Jumat: 08.30 - 16.00 WIB (Istirahat: 11.30 - 13.30 WIB)
              <br />
              Sabtu, Minggu, dan Hari Libur Nasional: Tutup
            </p>
          </div>
        </div>

        <div className="border-t border-white/20">
          <div className="mx-auto flex max-w-[1400px] flex-col items-center justify-between gap-4 px-5 py-6 text-center text-xs text-white/80 sm:flex-row sm:px-8 sm:text-left lg:px-12">
            <p>Lajnah Pentashihan Mushaf Al-Qur'an &copy; 2026 Kementerian Agama Republik Indonesia.</p>
            <div className="flex flex-wrap items-center justify-center gap-x-4 gap-y-2 sm:justify-start">
              <Link
                to="/informasi/regulasi-penerbit-mushaf"
                className="font-semibold text-white hover:underline"
              >
                Regulasi
              </Link>
              <Link to="/" onClick={(e) => handleNavigate('/', e)} className="hover:text-white">
                Pengaduan
              </Link>
              <Link to="/" onClick={(e) => handleNavigate('/', e)} className="hover:text-white">
                FAQ
              </Link>
              <Link
                to="/login"
                onClick={(e) => handleNavigate('/login', e)}
                className="font-semibold text-white hover:underline"
              >
                Portal Penerbit
              </Link>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default RegulationInfoPage;

