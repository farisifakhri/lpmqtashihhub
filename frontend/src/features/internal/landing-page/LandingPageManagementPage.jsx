import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  FileText,
  Plus,
  Search,
  Filter,
  Eye,
  Edit2,
  Trash2,
  Upload,
  CheckCircle2,
  AlertCircle,
  RefreshCw,
  X,
  ChevronLeft,
  ChevronRight,
  Download,
  PanelsTopLeft,
  Layers,
  ChevronDown,
  FileCheck,
  AlertTriangle,
  Clock,
  Sparkles,
} from 'lucide-react';
import { regulationApi } from '@/api/regulation.api';
import { useAuth } from '@/features/auth/AuthContext';
import { InformationGuideManagement } from './InformationGuideManagement';
import { ServiceDocumentManagement } from './ServiceDocumentManagement';

const CATEGORIES = [
  'Ketentuan Pentashihan',
  'Peraturan Menteri Agama RI',
  'Peraturan Pemerintah Republik Indonesia',
  'Siaran Pers LPMQ',
  'SK Kepala Badan Litbang dan Diklat Kementerian Agama RI',
  'SK Kepala Lajnah Pentashihan Mushaf Al-Qur\'an',
  'Surat Edaran Kepala Lajnah Pentashihan Mushaf Al-Qur\'an',
];

const MAIN_NAV_ITEMS = [
  { id: 'informasi', label: 'Informasi' },
  { id: 'permohonan-master', label: 'Permohonan Master' },
  { id: 'pengaduan', label: 'Pengaduan' },
  { id: 'faq', label: 'FAQ' },
];

const INFORMATION_SUBMENUS = [
  {
    id: 'regulasi',
    label: "Regulasi Penerbit Mushaf Al-Qur'an",
    description: 'Kelola dokumen regulasi resmi yang ditampilkan pada landing page publik.',
  },
  {
    id: 'panduan',
    label: 'Panduan Permohonan Surat Tanda Tashih/Izin Edar',
    description: 'Panduan permohonan Surat Tanda Tashih/Izin Edar akan dikelola di bagian ini.',
  },
  {
    id: 'sop',
    label: 'SOP Pelayanan Surat Tanda Tashih',
    description: 'SOP pelayanan Surat Tanda Tashih Izin Edar akan dikelola di bagian ini.',
  },
  {
    id: 'direktori',
    label: "Direktori Penerbit Mushaf Al-Qur'an",
    description: 'Direktori penerbit Mushaf Al-Qur’an akan dikelola di bagian ini.',
  },
  {
    id: 'survei',
    label: 'Survei IKM dan IPAK Pelayanan Surat Tanda Tashih',
    description: 'Informasi survei IKM dan IPAK pelayanan akan dikelola di bagian ini.',
  },
  {
    id: 'siaran-pers',
    label: 'Siaran Pers',
    description: 'Siaran pers LPMQ akan dikelola di bagian ini.',
  },
  {
    id: 'unduh-dokumen',
    label: 'Unduh Dokumen Seputar Pelayanan Surat Tanda Tashih/Izin Edar',
    description: 'Dokumen seputar pelayanan untuk diunduh akan dikelola di bagian ini.',
  },
];

const COMPLAINT_SUBMENUS = [
  { id: 'saluran-pengaduan', label: 'Saluran Pengaduan Masyarakat' },
  { id: 'cek-status-laporan', label: 'Cek Status Laporan Naskah' },
  { id: 'kontak-bantuan', label: 'Kontak Pusat Bantuan LPMQ' },
];

export const LandingPageManagementPage = () => {
  const { currentUser } = useAuth();

  const [activeMainMenu, setActiveMainMenu] = useState('informasi');
  const [activeInformationSubmenu, setActiveInformationSubmenu] = useState('regulasi');
  const [activeComplaintSubmenu, setActiveComplaintSubmenu] = useState('saluran-pengaduan');

  // Data states
  const [regulations, setRegulations] = useState([]);
  const [summary, setSummary] = useState({ totalAll: 0, totalPublished: 0, totalUnpublished: 0, categories: [] });
  const [pagination, setPagination] = useState({ page: 1, limit: 10, total: 0, totalPages: 1 });
  const [loading, setLoading] = useState(true);
  const [summaryLoading, setSummaryLoading] = useState(true);
  const [error, setError] = useState(null);

  // Filters & controls
  const [selectedCategory, setSelectedCategory] = useState('Semua Kategori');
  const [selectedPublished, setSelectedPublished] = useState('ALL');
  const [searchInput, setSearchInput] = useState('');
  const [activeSearch, setActiveSearch] = useState('');
  const [limit, setLimit] = useState(10);
  const [page, setPage] = useState(1);

  // Notification Toast state
  const [toast, setToast] = useState(null);

  // Modal States
  // 1. Create Modal
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [createForm, setCreateForm] = useState({
    title: '',
    category: CATEGORIES[0],
    document_number: '',
    is_published: true,
    file: null,
  });
  const [createSubmitting, setCreateSubmitting] = useState(false);
  const [createError, setCreateError] = useState(null);

  // 2. Edit Modal
  const [editTarget, setEditTarget] = useState(null);
  const [editForm, setEditForm] = useState({
    title: '',
    category: '',
    document_number: '',
    is_published: true,
    file: null,
  });
  const [editSubmitting, setEditSubmitting] = useState(false);
  const [editError, setEditError] = useState(null);

  // 3. Delete Modal
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [deleteSubmitting, setDeleteSubmitting] = useState(false);

  // 4. Preview Modal
  const [previewDoc, setPreviewDoc] = useState(null);
  const [previewBlobUrl, setPreviewBlobUrl] = useState(null);
  const [previewLoading, setPreviewLoading] = useState(false);
  const [previewError, setPreviewError] = useState(null);

  // Toast Helper
  const showToast = (message, type = 'success') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 4000);
  };

  // Fetch Summary
  const fetchSummary = useCallback(async () => {
    setSummaryLoading(true);
    try {
      const res = await regulationApi.getAdminSummary();
      if (res && res.success) {
        setSummary(res.data);
      }
    } catch (err) {
      console.warn('Gagal memuat ringkasan:', err.message);
    } finally {
      setSummaryLoading(false);
    }
  }, []);

  // Fetch Regulations List
  const fetchRegulations = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await regulationApi.listAdmin({
        page,
        limit,
        category: selectedCategory,
        search: activeSearch,
        is_published: selectedPublished,
      });

      if (res && res.success) {
        setRegulations(res.data || []);
        if (res.pagination) {
          setPagination(res.pagination);
        }
      } else {
        setRegulations([]);
      }
    } catch (err) {
      console.error('Gagal mengambil daftar regulasi admin:', err);
      setError(err.message || 'Gagal memuat daftar regulasi. Pastikan koneksi server tersedia.');
      setRegulations([]);
    } finally {
      setLoading(false);
    }
  }, [page, limit, selectedCategory, activeSearch, selectedPublished]);

  useEffect(() => {
    if (activeMainMenu === 'informasi' && activeInformationSubmenu === 'regulasi') {
      fetchRegulations();
      fetchSummary();
    }
  }, [activeMainMenu, activeInformationSubmenu, fetchRegulations, fetchSummary]);

  // Handle Search Debounce
  useEffect(() => {
    const timer = setTimeout(() => {
      setActiveSearch(searchInput);
      setPage(1);
    }, 350);
    return () => clearTimeout(timer);
  }, [searchInput]);

  // Modal Open Handlers
  const handleOpenCreate = () => {
    setCreateForm({
      title: '',
      category: CATEGORIES[0],
      document_number: '',
      is_published: true,
      file: null,
    });
    setCreateError(null);
    setIsCreateOpen(true);
  };

  const handleOpenEdit = (doc) => {
    setEditTarget(doc);
    setEditForm({
      title: doc.title,
      category: doc.category,
      document_number: doc.document_number,
      is_published: Boolean(doc.is_published),
      file: null,
    });
    setEditError(null);
  };

  const handleOpenDelete = (doc) => {
    setDeleteTarget(doc);
  };

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
      setPreviewError(err.message || 'Gagal memuat pratinjau berkas.');
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

  // Form Submit Handlers
  const handleCreateSubmit = async (e) => {
    e.preventDefault();
    setCreateError(null);

    if (!createForm.title.trim()) {
      setCreateError('Judul dokumen wajib diisi.');
      return;
    }
    if (!createForm.category) {
      setCreateError('Kategori dokumen wajib dipilih.');
      return;
    }
    if (!createForm.document_number.trim()) {
      setCreateError('Nomor regulasi wajib diisi.');
      return;
    }
    if (!createForm.file) {
      setCreateError('Berkas dokumen PDF wajib diunggah.');
      return;
    }

    setCreateSubmitting(true);
    try {
      const formData = new FormData();
      formData.append('title', createForm.title.trim());
      formData.append('category', createForm.category);
      formData.append('document_number', createForm.document_number.trim());
      formData.append('is_published', createForm.is_published ? 'true' : 'false');
      formData.append('file', createForm.file);

      const res = await regulationApi.createRegulation(formData);
      if (res && res.success) {
        setIsCreateOpen(false);
        showToast('Dokumen regulasi berhasil ditambahkan dan disimpan ke sistem.');
        fetchRegulations();
        fetchSummary();
      }
    } catch (err) {
      console.error('Gagal menambahkan regulasi:', err);
      setCreateError(err.message || 'Gagal menyimpan dokumen. Silakan periksa format berkas dan coba kembali.');
    } finally {
      setCreateSubmitting(false);
    }
  };

  const handleEditSubmit = async (e) => {
    e.preventDefault();
    if (!editTarget) return;
    setEditError(null);

    if (!editForm.title.trim()) {
      setEditError('Judul dokumen tidak boleh kosong.');
      return;
    }
    if (!editForm.document_number.trim()) {
      setEditError('Nomor regulasi tidak boleh kosong.');
      return;
    }

    setEditSubmitting(true);
    try {
      const formData = new FormData();
      formData.append('title', editForm.title.trim());
      formData.append('category', editForm.category);
      formData.append('document_number', editForm.document_number.trim());
      formData.append('is_published', editForm.is_published ? 'true' : 'false');
      if (editForm.file) {
        formData.append('file', editForm.file);
      }

      const res = await regulationApi.updateRegulation(editTarget.id, formData);
      if (res && res.success) {
        setEditTarget(null);
        showToast('Dokumen regulasi berhasil diperbarui.');
        fetchRegulations();
        fetchSummary();
      }
    } catch (err) {
      console.error('Gagal memperbarui regulasi:', err);
      setEditError(err.message || 'Gagal menyimpan perubahan dokumen.');
    } finally {
      setEditSubmitting(false);
    }
  };

  const handleDeleteConfirm = async () => {
    if (!deleteTarget) return;
    setDeleteSubmitting(true);
    try {
      await regulationApi.deleteRegulation(deleteTarget.id);
      setDeleteTarget(null);
      showToast('Dokumen regulasi berhasil dihapus.');
      fetchRegulations();
      fetchSummary();
    } catch (err) {
      console.error('Gagal menghapus dokumen:', err);
      showToast(err.message || 'Gagal menghapus dokumen regulasi.', 'error');
    } finally {
      setDeleteSubmitting(false);
    }
  };

  const handleDownload = async (doc) => {
    try {
      const fileName = doc.file_name || `${doc.title}.pdf`;
      await regulationApi.downloadRegulation(doc.id, fileName);
    } catch (err) {
      showToast('Gagal mengunduh dokumen.', 'error');
    }
  };

  const startRecord = (pagination.page - 1) * pagination.limit + 1;
  const endRecord = Math.min(pagination.page * pagination.limit, pagination.total);

  return (
    <div className="space-y-6 pb-12 font-sans text-ink">
      {/* Toast Notification */}
      {toast && (
        <div
          className={`fixed bottom-6 right-6 z-50 flex items-center gap-3 rounded-2xl px-4 py-3 shadow-2xl border transition-all animate-bounce ${
            toast.type === 'error'
              ? 'bg-civic-dangerSoft text-civic-danger border-civic-dangerLine'
              : 'bg-brand-50 text-brand-900 border-brand-200'
          }`}
        >
          {toast.type === 'error' ? (
            <AlertCircle className="h-5 w-5 shrink-0" />
          ) : (
            <CheckCircle2 className="h-5 w-5 text-brand-700 shrink-0" />
          )}
          <span className="text-xs font-semibold">{toast.message}</span>
        </div>
      )}

      {/* Header Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-line pb-5">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="inline-flex items-center gap-1.5 rounded-lg border border-brand-200 bg-brand-50 px-2.5 py-0.5 text-[11px] font-bold text-brand-800">
              <PanelsTopLeft className="h-3.5 w-3.5" />
              <span>Tata Kelola Sistem</span>
            </span>
          </div>
          <h1 className="text-xl sm:text-2xl font-extrabold text-ink tracking-tight">
            Kelola Landing Page
          </h1>
          <p className="text-xs sm:text-sm text-ink-muted mt-0.5">
            Manajemen konten publikasi landing page dan dokumen regulasi resmi LPMQ Tashih Hub
          </p>
        </div>
      </div>

      <nav aria-label="Navigasi menu landing page" className="border-b border-line">
        <div className="flex items-center gap-2 overflow-x-auto pb-px">
          {MAIN_NAV_ITEMS.map((item) => (
            <button
              key={item.id}
              type="button"
              onClick={() => setActiveMainMenu(item.id)}
              aria-current={activeMainMenu === item.id ? 'page' : undefined}
              className={`px-4 py-3 text-xs font-bold border-b-2 transition whitespace-nowrap ${
                activeMainMenu === item.id
                  ? 'border-brand-700 text-brand-700'
                  : 'border-transparent text-ink-muted hover:text-ink'
              }`}
            >
              {item.label}
            </button>
          ))}
        </div>
      </nav>

      {activeMainMenu === 'informasi' && (
        <nav aria-label="Submenu Informasi" className="border-b border-line">
          <div className="flex items-center gap-2 overflow-x-auto pb-px">
            {INFORMATION_SUBMENUS.map((item) => (
              <button
                key={item.id}
                type="button"
                onClick={() => setActiveInformationSubmenu(item.id)}
                aria-current={activeInformationSubmenu === item.id ? 'page' : undefined}
                className={`px-3 py-2.5 text-xs whitespace-nowrap border-b-2 transition ${
                  activeInformationSubmenu === item.id
                    ? 'border-brand-700 font-bold text-brand-700'
                    : 'border-transparent font-medium text-ink-muted hover:text-ink'
                }`}
              >
                {item.label}
              </button>
            ))}
          </div>
        </nav>
      )}

      {activeMainMenu === 'pengaduan' && (
        <nav aria-label="Submenu Pengaduan" className="border-b border-line">
          <div className="flex items-center gap-2 overflow-x-auto pb-px">
            {COMPLAINT_SUBMENUS.map((item) => (
              <button
                key={item.id}
                type="button"
                onClick={() => setActiveComplaintSubmenu(item.id)}
                aria-current={activeComplaintSubmenu === item.id ? 'page' : undefined}
                className={`px-3 py-2.5 text-xs whitespace-nowrap border-b-2 transition ${
                  activeComplaintSubmenu === item.id
                    ? 'border-brand-700 font-bold text-brand-700'
                    : 'border-transparent font-medium text-ink-muted hover:text-ink'
                }`}
              >
                {item.label}
              </button>
            ))}
          </div>
        </nav>
      )}

      {activeMainMenu !== 'informasi' || !['regulasi', 'panduan', 'sop', 'siaran-pers', 'unduh-dokumen'].includes(activeInformationSubmenu) ? (
        <div className="rounded-2xl border border-line bg-surface p-8 sm:p-12 text-center space-y-3">
          <div className="inline-flex p-3 rounded-full bg-surface-subtle text-ink-muted">
            <Sparkles className="h-6 w-6" />
          </div>
          <span className="inline-flex rounded-md border border-line bg-surface-subtle px-2 py-1 text-[10px] font-semibold text-ink-muted">
            Segera Hadir
          </span>
          <h2 className="text-base font-bold text-ink">
            {activeMainMenu === 'informasi'
              ? INFORMATION_SUBMENUS.find((item) => item.id === activeInformationSubmenu)?.label
              : activeMainMenu === 'pengaduan'
                ? COMPLAINT_SUBMENUS.find((item) => item.id === activeComplaintSubmenu)?.label
                : MAIN_NAV_ITEMS.find((item) => item.id === activeMainMenu)?.label}
          </h2>
          <p className="text-xs text-ink-muted max-w-md mx-auto">
            {activeMainMenu === 'informasi'
              ? INFORMATION_SUBMENUS.find((item) => item.id === activeInformationSubmenu)?.description
              : 'Pengelolaan konten untuk bagian ini akan tersedia pada pembaruan berikutnya.'}
          </p>
        </div>
      ) : null}

      {activeMainMenu === 'informasi' && activeInformationSubmenu === 'panduan' && (
        <InformationGuideManagement />
      )}

      {activeMainMenu === 'informasi' && activeInformationSubmenu === 'sop' && (
        <InformationGuideManagement section="SOP" />
      )}

      {activeMainMenu === 'informasi' && activeInformationSubmenu === 'siaran-pers' && (
        <InformationGuideManagement section="SIARAN_PERS" />
      )}

      {activeMainMenu === 'informasi' && activeInformationSubmenu === 'unduh-dokumen' && (
        <ServiceDocumentManagement />
      )}

      {activeMainMenu === 'informasi' && activeInformationSubmenu === 'regulasi' && (
        <div className="space-y-6">
          {/* Summary Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {/* Total Dokumen */}
            <div className="rounded-2xl border border-line bg-surface p-4 shadow-sm flex items-center justify-between">
              <div>
                <p className="text-xs font-semibold text-ink-muted">Total Regulasi</p>
                <h3 className="text-2xl font-black text-ink mt-1">
                  {summaryLoading ? '...' : summary.totalAll}
                </h3>
                <p className="text-[11px] text-ink-muted mt-0.5">Semua dokumen terdaftar</p>
              </div>
              <div className="p-3 rounded-2xl bg-brand-50 text-brand-700 border border-brand-200">
                <FileText className="h-6 w-6" />
              </div>
            </div>

            {/* Dipublikasikan */}
            <div className="rounded-2xl border border-line bg-surface p-4 shadow-sm flex items-center justify-between">
              <div>
                <p className="text-xs font-semibold text-ink-muted">Dipublikasikan</p>
                <h3 className="text-2xl font-black text-brand-700 mt-1">
                  {summaryLoading ? '...' : summary.totalPublished}
                </h3>
                <p className="text-[11px] text-brand-800 mt-0.5">Tampil di portal publik</p>
              </div>
              <div className="p-3 rounded-2xl bg-civic-successSoft text-civic-success border border-civic-successLine">
                <FileCheck className="h-6 w-6" />
              </div>
            </div>

            {/* Draf / Belum Publikasi */}
            <div className="rounded-2xl border border-line bg-surface p-4 shadow-sm flex items-center justify-between">
              <div>
                <p className="text-xs font-semibold text-ink-muted">Draf / Tersimpan</p>
                <h3 className="text-2xl font-black text-ink-muted mt-1">
                  {summaryLoading ? '...' : summary.totalUnpublished}
                </h3>
                <p className="text-[11px] text-ink-muted mt-0.5">Belum ditampilkan publik</p>
              </div>
              <div className="p-3 rounded-2xl bg-surface-subtle text-ink-muted border border-line">
                <Clock className="h-6 w-6" />
              </div>
            </div>

            {/* Kategori Terdaftar */}
            <div className="rounded-2xl border border-line bg-surface p-4 shadow-sm flex items-center justify-between">
              <div>
                <p className="text-xs font-semibold text-ink-muted">Kategori Resmi</p>
                <h3 className="text-2xl font-black text-ink mt-1">7 Kategori</h3>
                <p className="text-[11px] text-ink-muted mt-0.5">Ketetapan standar LPMQ</p>
              </div>
              <div className="p-3 rounded-2xl bg-surface-subtle text-brand-700 border border-line">
                <Layers className="h-6 w-6" />
              </div>
            </div>
          </div>

          {/* Filter & Search Bar */}
          <div className="rounded-2xl border border-line bg-surface p-4 shadow-sm">
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-12 gap-3 items-end">
              {/* Search */}
              <div className="lg:col-span-4 relative">
                <label htmlFor="admin-search-input" className="block text-xs font-semibold text-ink-muted mb-1">
                  Cari Dokumen
                </label>
                <div className="relative">
                  <input
                    id="admin-search-input"
                    type="text"
                    value={searchInput}
                    onChange={(e) => setSearchInput(e.target.value)}
                    placeholder="Cari berdasarkan judul atau nomor regulasi..."
                    className="w-full rounded-xl border border-line bg-surface py-2 pl-9 pr-8 text-xs font-medium text-ink placeholder:text-ink-muted/60 focus:border-brand-600 focus:outline-none focus:ring-1 focus:ring-brand-600"
                  />
                  <Search className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-ink-muted" />
                  {searchInput && (
                    <button
                      type="button"
                      onClick={() => setSearchInput('')}
                      className="absolute right-2.5 top-1/2 -translate-y-1/2 p-0.5 rounded-full text-ink-muted hover:text-ink"
                    >
                      <X className="h-3 w-3" />
                    </button>
                  )}
                </div>
              </div>

              {/* Kategori Filter */}
              <div className="lg:col-span-3 relative">
                <label htmlFor="admin-category-filter" className="block text-xs font-semibold text-ink-muted mb-1">
                  Filter Kategori
                </label>
                <div className="relative">
                  <select
                    id="admin-category-filter"
                    value={selectedCategory}
                    onChange={(e) => {
                      setSelectedCategory(e.target.value);
                      setPage(1);
                    }}
                    className="w-full appearance-none rounded-xl border border-line bg-surface py-2 pl-3 pr-8 text-xs font-medium text-ink focus:border-brand-600 focus:outline-none focus:ring-1 focus:ring-brand-600"
                  >
                    <option value="Semua Kategori">Semua Kategori</option>
                    {CATEGORIES.map((c) => (
                      <option key={c} value={c}>
                        {c}
                      </option>
                    ))}
                  </select>
                  <ChevronDown className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-ink-muted" />
                </div>
              </div>

              {/* Status Publikasi */}
              <div className="lg:col-span-2 relative">
                <label htmlFor="admin-status-filter" className="block text-xs font-semibold text-ink-muted mb-1">
                  Status Publikasi
                </label>
                <div className="relative">
                  <select
                    id="admin-status-filter"
                    value={selectedPublished}
                    onChange={(e) => {
                      setSelectedPublished(e.target.value);
                      setPage(1);
                    }}
                    className="w-full appearance-none rounded-xl border border-line bg-surface py-2 pl-3 pr-8 text-xs font-medium text-ink focus:border-brand-600 focus:outline-none focus:ring-1 focus:ring-brand-600"
                  >
                    <option value="ALL">Semua Status</option>
                    <option value="true">Dipublikasikan</option>
                    <option value="false">Draf / Belum Publikasi</option>
                  </select>
                  <ChevronDown className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-ink-muted" />
                </div>
              </div>

              <button
                type="button"
                onClick={handleOpenCreate}
                className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-brand-700 px-4 py-2.5 text-xs font-semibold text-white shadow-sm hover:bg-brand-800 transition focus:outline-none sm:w-auto sm:justify-self-end lg:col-span-3"
              >
                <Plus className="h-4 w-4" />
                <span>Tambah Dokumen</span>
              </button>
            </div>
          </div>

          {/* Table Data */}
          <div className="rounded-2xl border border-line bg-surface shadow-sm overflow-hidden">
            {error && !loading && (
              <div className="p-8 text-center space-y-3">
                <AlertCircle className="h-6 w-6 text-civic-danger mx-auto" />
                <p className="text-xs font-semibold text-ink">{error}</p>
                <button
                  type="button"
                  onClick={fetchRegulations}
                  className="rounded-xl bg-brand-700 px-4 py-2 text-xs font-semibold text-white hover:bg-brand-800"
                >
                  Muat Ulang
                </button>
              </div>
            )}

            {loading && (
              <div className="p-6 space-y-3">
                {[1, 2, 3, 4, 5].map((i) => (
                  <div key={i} className="h-12 w-full rounded-xl bg-surface-subtle animate-pulse" />
                ))}
              </div>
            )}

            {!loading && !error && regulations.length === 0 && (
              <div className="py-14 text-center space-y-2">
                <FileText className="h-8 w-8 text-ink-muted mx-auto" />
                <h4 className="text-sm font-bold text-ink">Belum Ada Dokumen Regulasi</h4>
                <p className="text-xs text-ink-muted max-w-sm mx-auto">
                  Belum ada dokumen yang sesuai dengan kriteria filter. Tambahkan dokumen baru atau sesuaikan filter Anda.
                </p>
                <button
                  type="button"
                  onClick={handleOpenCreate}
                  className="mt-2 inline-flex items-center gap-1.5 rounded-xl bg-brand-700 px-4 py-2 text-xs font-semibold text-white hover:bg-brand-800"
                >
                  <Plus className="h-4 w-4" />
                  <span>Tambah Dokumen Pertama</span>
                </button>
              </div>
            )}

            {!loading && !error && regulations.length > 0 && (
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="border-b border-line bg-surface-subtle text-xs font-bold text-ink-muted uppercase tracking-wider">
                      <th scope="col" className="py-3 px-4 text-center w-12">
                        No
                      </th>
                      <th scope="col" className="py-3 px-4 min-w-[280px]">
                        Judul Dokumen &amp; Berkas
                      </th>
                      <th scope="col" className="py-3 px-4 min-w-[200px]">
                        Kategori
                      </th>
                      <th scope="col" className="py-3 px-4 min-w-[170px]">
                        Nomor Dokumen
                      </th>
                      <th scope="col" className="py-3 px-4 text-center w-36">
                        Status
                      </th>
                      <th scope="col" className="py-3 px-4 min-w-[130px]">
                        Tanggal Dibuat
                      </th>
                      <th scope="col" className="py-3 px-4 text-center w-36">
                        Aksi
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-line text-xs">
                    {regulations.map((doc, idx) => {
                      const rowNum = (pagination.page - 1) * pagination.limit + idx + 1;
                      const isPublished = Boolean(doc.is_published);
                      const formattedDate = doc.created_at
                        ? new Date(doc.created_at).toLocaleDateString('id-ID', {
                            day: 'numeric',
                            month: 'short',
                            year: 'numeric',
                          })
                        : '-';

                      return (
                        <tr key={doc.id} className="hover:bg-surface-subtle/70 transition-colors">
                          <td className="py-3.5 px-4 text-center text-ink-muted font-semibold">
                            {rowNum}
                          </td>
                          <td className="py-3.5 px-4">
                            <div className="font-semibold text-ink leading-relaxed">{doc.title}</div>
                          </td>
                          <td className="py-3.5 px-4">
                            <span className="inline-flex rounded-lg border border-brand-200 bg-brand-50 px-2 py-0.5 text-[11px] font-semibold text-brand-800">
                              {doc.category}
                            </span>
                          </td>
                          <td className="py-3.5 px-4">
                            <span className="inline-flex max-w-full whitespace-normal break-words rounded-lg border border-brand-200 bg-brand-50 px-2 py-0.5 font-mono text-[11px] font-semibold leading-relaxed text-brand-800">
                              {doc.document_number}
                            </span>
                          </td>
                          <td className="py-3.5 px-4 text-center">
                            {isPublished ? (
                              <span className="inline-flex items-center gap-1 rounded-full border border-civic-successLine bg-civic-successSoft px-2.5 py-0.5 text-[11px] font-semibold text-civic-success">
                                <span className="w-1.5 h-1.5 rounded-full bg-civic-success" />
                                <span>Publik</span>
                              </span>
                            ) : (
                              <span className="inline-flex items-center gap-1 rounded-full border border-line bg-surface-subtle px-2.5 py-0.5 text-[11px] font-semibold text-ink-muted">
                                <span className="w-1.5 h-1.5 rounded-full bg-ink-muted" />
                                <span>Draf</span>
                              </span>
                            )}
                          </td>
                          <td className="py-3.5 px-4 text-ink-muted whitespace-nowrap">
                            {formattedDate}
                          </td>
                          <td className="py-3.5 px-4 text-center">
                            <div className="flex items-center justify-center gap-1.5">
                              {/* Lihat Preview */}
                              <button
                                type="button"
                                onClick={() => handleOpenPreview(doc)}
                                className="p-1.5 rounded-lg border border-line bg-surface text-ink hover:text-brand-700 hover:bg-surface-subtle transition"
                                title="Lihat Pratinjau Dokumen"
                              >
                                <Eye className="h-3.5 w-3.5" />
                              </button>

                              {/* Edit */}
                              <button
                                type="button"
                                onClick={() => handleOpenEdit(doc)}
                                className="p-1.5 rounded-lg border border-line bg-surface text-ink hover:text-brand-700 hover:bg-surface-subtle transition"
                                title="Edit Dokumen"
                              >
                                <Edit2 className="h-3.5 w-3.5" />
                              </button>

                              {/* Hapus */}
                              <button
                                type="button"
                                onClick={() => handleOpenDelete(doc)}
                                className="p-1.5 rounded-lg border border-line bg-surface text-civic-danger hover:bg-civic-dangerSoft transition"
                                title="Hapus Dokumen"
                              >
                                <Trash2 className="h-3.5 w-3.5" />
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

                <div className="flex items-center gap-1.5">
                  <button
                    type="button"
                    onClick={() => setPage((p) => Math.max(1, p - 1))}
                    disabled={pagination.page <= 1}
                    className="inline-flex items-center gap-1 rounded-lg border border-line bg-surface px-2.5 py-1 text-xs font-medium text-ink hover:bg-surface-subtle disabled:opacity-40"
                  >
                    <ChevronLeft className="h-3.5 w-3.5" />
                    <span>Sebelumnya</span>
                  </button>

                  <span className="text-xs font-semibold px-2 text-ink">
                    Hal. {pagination.page} / {pagination.totalPages || 1}
                  </span>

                  <button
                    type="button"
                    onClick={() => setPage((p) => Math.min(pagination.totalPages, p + 1))}
                    disabled={pagination.page >= pagination.totalPages}
                    className="inline-flex items-center gap-1 rounded-lg border border-line bg-surface px-2.5 py-1 text-xs font-medium text-ink hover:bg-surface-subtle disabled:opacity-40"
                  >
                    <span>Berikutnya</span>
                    <ChevronRight className="h-3.5 w-3.5" />
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* MODAL 1: Tambah Dokumen Regulasi */}
      {isCreateOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fade-in"
          role="dialog"
          aria-modal="true"
        >
          <div className="relative w-full max-w-lg rounded-2xl border border-line bg-surface p-6 shadow-2xl overflow-y-auto max-h-[92vh]">
            <div className="flex items-center justify-between border-b border-line pb-4 mb-4">
              <div className="flex items-center gap-2">
                <div className="p-2 rounded-xl bg-brand-50 text-brand-700 border border-brand-200">
                  <Upload className="h-5 w-5" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-ink">Tambah Dokumen Regulasi</h3>
                  <p className="text-xs text-ink-muted">Unggah berkas PDF dan lengkapi data metadata regulasi</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsCreateOpen(false)}
                className="p-1 rounded-lg text-ink-muted hover:bg-surface-subtle"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {createError && (
              <div className="mb-4 flex items-center gap-2 rounded-xl border border-civic-dangerLine bg-civic-dangerSoft p-3 text-xs font-medium text-civic-danger">
                <AlertCircle className="h-4 w-4 shrink-0" />
                <span>{createError}</span>
              </div>
            )}

            <form onSubmit={handleCreateSubmit} className="space-y-4 text-xs">
              {/* Berkas PDF */}
              <div>
                <label className="block font-semibold text-ink mb-1">
                  Berkas Dokumen PDF <span className="text-civic-danger">*</span>
                </label>
                <div className="rounded-xl border-2 border-dashed border-line p-4 text-center hover:border-brand-600 transition bg-surface-subtle">
                  <input
                    type="file"
                    id="create-file-input"
                    accept=".pdf,application/pdf"
                    onChange={(e) => {
                      const file = e.target.files?.[0];
                      if (file) {
                        if (file.type !== 'application/pdf' && !file.name.toLowerCase().endsWith('.pdf')) {
                          setCreateError('Hanya berkas berformat PDF resmi yang diperbolehkan.');
                          return;
                        }
                        if (file.size > 15 * 1024 * 1024) {
                          setCreateError('Ukuran berkas PDF melebihi batas 15 MB.');
                          return;
                        }
                        setCreateForm((prev) => ({ ...prev, file }));
                        setCreateError(null);
                      }
                    }}
                    className="sr-only"
                  />
                  <label htmlFor="create-file-input" className="cursor-pointer block">
                    <FileText className="h-8 w-8 text-brand-700 mx-auto mb-1.5" />
                    {createForm.file ? (
                      <div>
                        <p className="font-bold text-ink truncate max-w-xs mx-auto">{createForm.file.name}</p>
                        <p className="text-[11px] text-ink-muted">
                          {(createForm.file.size / 1024).toFixed(0)} KB - Klik untuk ganti berkas
                        </p>
                      </div>
                    ) : (
                      <div>
                        <p className="font-semibold text-brand-700 hover:underline">
                          Pilih berkas PDF dari komputer
                        </p>
                        <p className="text-[11px] text-ink-muted mt-0.5">Maksimal ukuran 15 MB</p>
                      </div>
                    )}
                  </label>
                </div>
              </div>

              {/* Judul Dokumen */}
              <div>
                <label htmlFor="create-title" className="block font-semibold text-ink mb-1">
                  Judul Dokumen <span className="text-civic-danger">*</span>
                </label>
                <input
                  id="create-title"
                  type="text"
                  required
                  value={createForm.title}
                  onChange={(e) => setCreateForm((prev) => ({ ...prev, title: e.target.value }))}
                  placeholder="Contoh: Keputusan Menteri Agama tentang Petunjuk Pentashihan Mushaf"
                  className="w-full rounded-xl border border-line bg-surface px-3 py-2 text-xs font-medium text-ink focus:border-brand-600 focus:outline-none focus:ring-1 focus:ring-brand-600"
                />
              </div>

              {/* Kategori Dokumen */}
              <div>
                <label htmlFor="create-category" className="block font-semibold text-ink mb-1">
                  Kategori Dokumen <span className="text-civic-danger">*</span>
                </label>
                <div className="relative">
                  <select
                    id="create-category"
                    value={createForm.category}
                    onChange={(e) => setCreateForm((prev) => ({ ...prev, category: e.target.value }))}
                    className="w-full appearance-none rounded-xl border border-line bg-surface px-3 py-2 pr-8 text-xs font-medium text-ink focus:border-brand-600 focus:outline-none focus:ring-1 focus:ring-brand-600"
                  >
                    {CATEGORIES.map((c) => (
                      <option key={c} value={c}>
                        {c}
                      </option>
                    ))}
                  </select>
                  <ChevronDown className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-ink-muted" />
                </div>
              </div>

              {/* Nomor Dokumen */}
              <div>
                <label htmlFor="create-number" className="block font-semibold text-ink mb-1">
                  Nomor Regulasi / Dokumen <span className="text-civic-danger">*</span>
                </label>
                <input
                  id="create-number"
                  type="text"
                  required
                  value={createForm.document_number}
                  onChange={(e) => setCreateForm((prev) => ({ ...prev, document_number: e.target.value }))}
                  placeholder="Contoh: KMA No. 44 Tahun 2024 atau SOP-LPMQ-01/2023"
                  className="w-full rounded-xl border border-line bg-surface px-3 py-2 text-xs font-medium text-ink focus:border-brand-600 focus:outline-none focus:ring-1 focus:ring-brand-600"
                />
              </div>

              {/* Status Publikasi */}
              <div className="pt-1">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={createForm.is_published}
                    onChange={(e) => setCreateForm((prev) => ({ ...prev, is_published: e.target.checked }))}
                    className="h-4 w-4 rounded border-line text-brand-700 focus:ring-brand-600"
                  />
                  <span className="font-semibold text-ink">Publikasikan langsung ke halaman landing page</span>
                </label>
                <p className="text-[11px] text-ink-muted pl-6">
                  Jika tidak dicentang, dokumen disimpan sebagai Draf dan tidak terlihat oleh publik.
                </p>
              </div>

              {/* Tombol Aksi */}
              <div className="flex items-center justify-end gap-2 pt-4 border-t border-line">
                <button
                  type="button"
                  onClick={() => setIsCreateOpen(false)}
                  className="rounded-xl border border-line px-4 py-2 font-semibold text-ink hover:bg-surface-subtle"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={createSubmitting}
                  className="inline-flex items-center gap-1.5 rounded-xl bg-brand-700 px-5 py-2 font-semibold text-white hover:bg-brand-800 disabled:opacity-50"
                >
                  {createSubmitting ? (
                    <>
                      <RefreshCw className="h-3.5 w-3.5 animate-spin" />
                      <span>Menyimpan...</span>
                    </>
                  ) : (
                    <span>Simpan Dokumen</span>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 2: Edit Dokumen Regulasi */}
      {editTarget && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fade-in"
          role="dialog"
          aria-modal="true"
        >
          <div className="relative w-full max-w-lg rounded-2xl border border-line bg-surface p-6 shadow-2xl overflow-y-auto max-h-[92vh]">
            <div className="flex items-center justify-between border-b border-line pb-4 mb-4">
              <div className="flex items-center gap-2">
                <div className="p-2 rounded-xl bg-brand-50 text-brand-700 border border-brand-200">
                  <Edit2 className="h-5 w-5" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-ink">Edit Dokumen Regulasi</h3>
                  <p className="text-xs text-ink-muted">Perbarui data metadata atau ganti berkas dokumen</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setEditTarget(null)}
                className="p-1 rounded-lg text-ink-muted hover:bg-surface-subtle"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {editError && (
              <div className="mb-4 flex items-center gap-2 rounded-xl border border-civic-dangerLine bg-civic-dangerSoft p-3 text-xs font-medium text-civic-danger">
                <AlertCircle className="h-4 w-4 shrink-0" />
                <span>{editError}</span>
              </div>
            )}

            <form onSubmit={handleEditSubmit} className="space-y-4 text-xs">
              {/* Judul Dokumen */}
              <div>
                <label htmlFor="edit-title" className="block font-semibold text-ink mb-1">
                  Judul Dokumen <span className="text-civic-danger">*</span>
                </label>
                <input
                  id="edit-title"
                  type="text"
                  required
                  value={editForm.title}
                  onChange={(e) => setEditForm((prev) => ({ ...prev, title: e.target.value }))}
                  className="w-full rounded-xl border border-line bg-surface px-3 py-2 text-xs font-medium text-ink focus:border-brand-600 focus:outline-none focus:ring-1 focus:ring-brand-600"
                />
              </div>

              {/* Kategori Dokumen */}
              <div>
                <label htmlFor="edit-category" className="block font-semibold text-ink mb-1">
                  Kategori Dokumen <span className="text-civic-danger">*</span>
                </label>
                <div className="relative">
                  <select
                    id="edit-category"
                    value={editForm.category}
                    onChange={(e) => setEditForm((prev) => ({ ...prev, category: e.target.value }))}
                    className="w-full appearance-none rounded-xl border border-line bg-surface px-3 py-2 pr-8 text-xs font-medium text-ink focus:border-brand-600 focus:outline-none focus:ring-1 focus:ring-brand-600"
                  >
                    {CATEGORIES.map((c) => (
                      <option key={c} value={c}>
                        {c}
                      </option>
                    ))}
                  </select>
                  <ChevronDown className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-ink-muted" />
                </div>
              </div>

              {/* Nomor Dokumen */}
              <div>
                <label htmlFor="edit-number" className="block font-semibold text-ink mb-1">
                  Nomor Regulasi / Dokumen <span className="text-civic-danger">*</span>
                </label>
                <input
                  id="edit-number"
                  type="text"
                  required
                  value={editForm.document_number}
                  onChange={(e) => setEditForm((prev) => ({ ...prev, document_number: e.target.value }))}
                  className="w-full rounded-xl border border-line bg-surface px-3 py-2 text-xs font-medium text-ink focus:border-brand-600 focus:outline-none focus:ring-1 focus:ring-brand-600"
                />
              </div>

              {/* Ganti Berkas PDF (Opsional) */}
              <div>
                <label className="block font-semibold text-ink mb-1">
                  Ganti Berkas PDF (Opsional)
                </label>
                <div className="rounded-xl border border-line bg-surface-subtle p-3">
                  <div className="text-[11px] text-ink-muted mb-2 font-mono">
                    Berkas saat ini: <span className="font-semibold text-ink">{editTarget.file_name}</span>
                  </div>
                  <input
                    type="file"
                    id="edit-file-input"
                    accept=".pdf,application/pdf"
                    onChange={(e) => {
                      const file = e.target.files?.[0];
                      if (file) {
                        if (file.type !== 'application/pdf' && !file.name.toLowerCase().endsWith('.pdf')) {
                          setEditError('Hanya berkas berformat PDF resmi yang diperbolehkan.');
                          return;
                        }
                        if (file.size > 15 * 1024 * 1024) {
                          setEditError('Ukuran berkas PDF melebihi batas 15 MB.');
                          return;
                        }
                        setEditForm((prev) => ({ ...prev, file }));
                        setEditError(null);
                      }
                    }}
                    className="sr-only"
                  />
                  <label
                    htmlFor="edit-file-input"
                    className="inline-flex items-center gap-2 rounded-lg border border-line bg-surface px-3 py-1.5 text-xs font-semibold text-ink hover:bg-surface-subtle cursor-pointer"
                  >
                    <Upload className="h-3.5 w-3.5" />
                    <span>{editForm.file ? `Dipilih: ${editForm.file.name}` : 'Pilih Berkas Baru'}</span>
                  </label>
                </div>
              </div>

              {/* Status Publikasi */}
              <div>
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={editForm.is_published}
                    onChange={(e) => setEditForm((prev) => ({ ...prev, is_published: e.target.checked }))}
                    className="h-4 w-4 rounded border-line text-brand-700 focus:ring-brand-600"
                  />
                  <span className="font-semibold text-ink">Publikasikan ke halaman informasi regulasi</span>
                </label>
              </div>

              {/* Tombol Aksi */}
              <div className="flex items-center justify-end gap-2 pt-4 border-t border-line">
                <button
                  type="button"
                  onClick={() => setEditTarget(null)}
                  className="rounded-xl border border-line px-4 py-2 font-semibold text-ink hover:bg-surface-subtle"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={editSubmitting}
                  className="inline-flex items-center gap-1.5 rounded-xl bg-brand-700 px-5 py-2 font-semibold text-white hover:bg-brand-800 disabled:opacity-50"
                >
                  {editSubmitting ? (
                    <>
                      <RefreshCw className="h-3.5 w-3.5 animate-spin" />
                      <span>Menyimpan...</span>
                    </>
                  ) : (
                    <span>Simpan Perubahan</span>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 3: Konfirmasi Hapus Dokumen */}
      {deleteTarget && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fade-in"
          role="dialog"
          aria-modal="true"
        >
          <div className="relative w-full max-w-md rounded-2xl border border-line bg-surface p-6 shadow-2xl text-center space-y-4">
            <div className="mx-auto inline-flex p-3 rounded-full bg-civic-dangerSoft text-civic-danger border border-civic-dangerLine">
              <AlertTriangle className="h-7 w-7" />
            </div>

            <div>
              <h3 className="text-base font-bold text-ink">Hapus Dokumen Regulasi?</h3>
              <p className="text-xs text-ink-muted mt-1">
                Tindakan ini akan menghapus dokumen dan fisik berkas dari server secara permanen.
              </p>
            </div>

            <div className="rounded-xl border border-line bg-surface-subtle p-3 text-left text-xs">
              <p className="font-semibold text-ink">{deleteTarget.title}</p>
              <p className="text-[11px] text-ink-muted font-mono mt-0.5">{deleteTarget.document_number}</p>
            </div>

            <div className="flex items-center justify-center gap-2 pt-2">
              <button
                type="button"
                onClick={() => setDeleteTarget(null)}
                className="rounded-xl border border-line px-4 py-2 text-xs font-semibold text-ink hover:bg-surface-subtle"
              >
                Batal
              </button>
              <button
                type="button"
                onClick={handleDeleteConfirm}
                disabled={deleteSubmitting}
                className="inline-flex items-center gap-1.5 rounded-xl bg-civic-danger px-5 py-2 text-xs font-semibold text-white hover:bg-civic-danger/90 disabled:opacity-50"
              >
                {deleteSubmitting ? (
                  <>
                    <RefreshCw className="h-3.5 w-3.5 animate-spin" />
                    <span>Menghapus...</span>
                  </>
                ) : (
                  <span>Hapus Permanen</span>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL 4: Preview Dokumen PDF */}
      {previewDoc && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-black/60 backdrop-blur-sm animate-fade-in"
          role="dialog"
          aria-modal="true"
        >
          <div className="relative flex flex-col w-full max-w-4xl h-[90vh] rounded-2xl border border-line bg-surface shadow-2xl overflow-hidden">
            <div className="flex items-center justify-between border-b border-line px-5 py-4 bg-surface">
              <div className="min-w-0 pr-4">
                <span className="inline-flex items-center rounded-md border border-brand-200 bg-brand-50 px-2 py-0.5 text-[10px] font-bold text-brand-800 uppercase tracking-wide mb-1">
                  {previewDoc.category}
                </span>
                <h3 className="text-sm sm:text-base font-bold text-ink truncate">
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
                >
                  <X className="h-5 w-5" />
                </button>
              </div>
            </div>

            <div className="flex-1 bg-surface-subtle relative overflow-hidden flex items-center justify-center">
              {previewLoading && (
                <div className="text-center space-y-3">
                  <RefreshCw className="h-8 w-8 text-brand-700 animate-spin mx-auto" />
                  <p className="text-xs font-medium text-ink-muted">Memuat pratinjau PDF...</p>
                </div>
              )}

              {previewError && !previewLoading && (
                <div className="p-6 text-center max-w-md space-y-3">
                  <AlertCircle className="h-8 w-8 text-civic-warning mx-auto" />
                  <h4 className="text-sm font-bold text-ink">Gagal Membuka Pratinjau</h4>
                  <p className="text-xs text-ink-muted">{previewError}</p>
                  <button
                    type="button"
                    onClick={() => handleDownload(previewDoc)}
                    className="inline-flex items-center gap-2 rounded-xl bg-brand-700 px-4 py-2 text-xs font-semibold text-white hover:bg-brand-800 transition"
                  >
                    <Download className="h-3.5 w-3.5" />
                    <span>Unduh Langsung</span>
                  </button>
                </div>
              )}

              {previewBlobUrl && !previewLoading && (
                <iframe
                  src={previewBlobUrl}
                  title={`Pratinjau: ${previewDoc.title}`}
                  className="w-full h-full border-0"
                />
              )}
            </div>

            <div className="flex items-center justify-between border-t border-line px-5 py-3 bg-surface text-xs text-ink-muted">
              <span>Status: {previewDoc.is_published ? 'Dipublikasikan (Publik)' : 'Draf (Internal)'}</span>
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
    </div>
  );
};

export default LandingPageManagementPage;
