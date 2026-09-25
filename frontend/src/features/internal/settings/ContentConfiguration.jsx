import React, { useState, useEffect, useRef } from 'react';
import { useAuth } from '@/features/auth/AuthContext';
import { masterApi } from '@/api/master.api';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import {
  Plus,
  Pencil,
  Trash2,
  X,
  Search,
  FileText,
  Clock,
  Coins,
  Star,
  AlertTriangle,
  ChevronDown,
  ArrowUpDown,
  Save,
  Package,
  Loader2,
  RefreshCw,
  CheckCircle2,
} from 'lucide-react';

// ── Mock Data (dari contoh JSON user) ────────────────────────────────────────
const INITIAL_CONTENT_DATA = [
  {
    id: 'mushaf-30juz-std',
    name: 'Mushaf Al-Qur\'an 30 Juz',
    category: 'Mushaf Cetak',
    description: 'Full verification of 30 Juz standard Mushaf text, rasm Usmani, harakat, dabt, and waqf signs.',
    baseCost: 1000000,
    costPerUnit: 3500,
    unitLabel: 'per surat tanda tashih',
    defaultUnitCount: 1,
    baseDurationDays: 15,
    durationPer100UnitsDays: 2,
    revisionDurationDays: 7,
    dummyDurationDays: 3,
    isPopular: true,
    requirementsNote: 'Requires 3 printed dummy manuscripts and softcopy PDF file in vectors.',
    sortOrder: 0,
    updatedAt: '2026-08-11T13:14:23.992Z',
  },
  {
    id: 'content-1786457793933',
    name: 'Al-Qur\'an Audio',
    category: 'Mushaf Cetak',
    description: '',
    baseCost: 1000000,
    costPerUnit: 0,
    unitLabel: 'per surat tanda tashih',
    defaultUnitCount: 1,
    baseDurationDays: 15,
    durationPer100UnitsDays: 0,
    revisionDurationDays: 7,
    dummyDurationDays: 3,
    isPopular: false,
    requirementsNote: '',
    sortOrder: 1,
    updatedAt: '2026-08-12T00:44:52.649Z',
  },
  {
    id: 'content-1786495592626',
    name: 'Al Qur\'an Audio dan Visual',
    category: 'Mushaf Cetak',
    description: '',
    baseCost: 2000000,
    costPerUnit: 0,
    unitLabel: 'per surat tanda tashih',
    defaultUnitCount: 1,
    baseDurationDays: 30,
    durationPer100UnitsDays: 0,
    revisionDurationDays: 15,
    dummyDurationDays: 7,
    isPopular: false,
    requirementsNote: '',
    sortOrder: 1,
    updatedAt: '2026-08-12T00:47:02.830Z',
  },
  {
    id: 'content-1786495631932',
    name: 'Mushaf Al-Qur\'an dan Tafsirnya',
    category: 'Mushaf Cetak',
    description: '',
    baseCost: 2000000,
    costPerUnit: 0,
    unitLabel: 'per surat tanda tashih',
    defaultUnitCount: 1,
    baseDurationDays: 30,
    durationPer100UnitsDays: 0,
    revisionDurationDays: 15,
    dummyDurationDays: 7,
    isPopular: false,
    requirementsNote: '',
    sortOrder: 1,
    updatedAt: '2026-08-12T00:47:32.166Z',
  },
  {
    id: 'content-1786495511376',
    name: 'Buku/media yang memuat bagian juz Al-Qur\'an/surah-surah Al-Qur\'an/Ayat-ayat Al-Qur\'an',
    category: 'Mushaf Cetak',
    description: '',
    baseCost: 500000,
    costPerUnit: 0,
    unitLabel: 'per surat tanda tashih',
    defaultUnitCount: 1,
    baseDurationDays: 7,
    durationPer100UnitsDays: 0,
    revisionDurationDays: 5,
    dummyDurationDays: 4,
    isPopular: false,
    requirementsNote: '',
    sortOrder: 2,
    updatedAt: '2026-08-12T00:46:07.568Z',
  },
  {
    id: 'content-1786454305615',
    name: 'Konten tambahan: Terjemah',
    category: 'Mushaf Cetak',
    description: '',
    baseCost: 500000,
    costPerUnit: 0,
    unitLabel: 'per surat tanda tashih',
    defaultUnitCount: 1,
    baseDurationDays: 7,
    durationPer100UnitsDays: 0,
    revisionDurationDays: 5,
    dummyDurationDays: 4,
    isPopular: false,
    requirementsNote: '',
    sortOrder: 3,
    updatedAt: '2026-08-12T00:41:59.002Z',
  },
  {
    id: 'content-1786454348699',
    name: 'Konten tambahan: Tajwid warna',
    category: 'Mushaf Cetak',
    description: '',
    baseCost: 500000,
    costPerUnit: 0,
    unitLabel: 'per surat tanda tashih',
    defaultUnitCount: 1,
    baseDurationDays: 7,
    durationPer100UnitsDays: 0,
    revisionDurationDays: 5,
    dummyDurationDays: 4,
    isPopular: false,
    requirementsNote: '',
    sortOrder: 4,
    updatedAt: '2026-08-11T13:22:46.857Z',
  },
  {
    id: 'content-1786454357111',
    name: 'Konten tambahan: Kode tajwid',
    category: 'Mushaf Cetak',
    description: '',
    baseCost: 500000,
    costPerUnit: 0,
    unitLabel: 'per surat tanda tashih',
    defaultUnitCount: 1,
    baseDurationDays: 7,
    durationPer100UnitsDays: 0,
    revisionDurationDays: 5,
    dummyDurationDays: 4,
    isPopular: false,
    requirementsNote: '',
    sortOrder: 5,
    updatedAt: '2026-08-11T13:22:58.260Z',
  },
  {
    id: 'content-1786454374991',
    name: 'Konten tambahan: Transliterasi',
    category: 'Mushaf Cetak',
    description: '',
    baseCost: 500000,
    costPerUnit: 0,
    unitLabel: 'per surat tanda tashih',
    defaultUnitCount: 1,
    baseDurationDays: 7,
    durationPer100UnitsDays: 0,
    revisionDurationDays: 5,
    dummyDurationDays: 4,
    isPopular: false,
    requirementsNote: '',
    sortOrder: 6,
    updatedAt: '2026-08-11T13:23:05.031Z',
  },
  {
    id: 'content-1786495130499',
    name: 'Konten tambahan: Waqaf Ibtida\'',
    category: 'Mushaf Cetak',
    description: '',
    baseCost: 500000,
    costPerUnit: 0,
    unitLabel: 'per surat tanda tashih',
    defaultUnitCount: 1,
    baseDurationDays: 7,
    durationPer100UnitsDays: 0,
    revisionDurationDays: 5,
    dummyDurationDays: 4,
    isPopular: false,
    requirementsNote: '',
    sortOrder: 7,
    updatedAt: '2026-08-12T00:39:28.500Z',
  },
  {
    id: 'content-1786495230714',
    name: 'Konten tambahan: Ragam Qira\'at',
    category: 'Mushaf Cetak',
    description: '',
    baseCost: 500000,
    costPerUnit: 0,
    unitLabel: 'per surat tanda tashih',
    defaultUnitCount: 1,
    baseDurationDays: 7,
    durationPer100UnitsDays: 0,
    revisionDurationDays: 5,
    dummyDurationDays: 4,
    isPopular: false,
    requirementsNote: '',
    sortOrder: 8,
    updatedAt: '2026-08-12T00:40:49.108Z',
  },
  {
    id: 'content-1786495676765',
    name: 'Mushaf Al-Qur\'an Braille',
    category: 'Mushaf Cetak',
    description: '',
    baseCost: 0,
    costPerUnit: 0,
    unitLabel: 'per surat tanda tashih',
    defaultUnitCount: 1,
    baseDurationDays: 60,
    durationPer100UnitsDays: 0,
    revisionDurationDays: 30,
    dummyDurationDays: 15,
    isPopular: false,
    requirementsNote: '',
    sortOrder: 8,
    updatedAt: '2026-08-12T00:48:23.838Z',
  },
  {
    id: 'content-1786495713426',
    name: 'Mushaf Al-Qur\'an Isyarat',
    category: 'Mushaf Cetak',
    description: '',
    baseCost: 0,
    costPerUnit: 0,
    unitLabel: 'per surat tanda tashih',
    defaultUnitCount: 1,
    baseDurationDays: 60,
    durationPer100UnitsDays: 0,
    revisionDurationDays: 30,
    dummyDurationDays: 15,
    isPopular: false,
    requirementsNote: '',
    sortOrder: 8,
    updatedAt: '2026-08-12T00:48:54.294Z',
  },
];

const CATEGORY_OPTIONS = [
  'Mushaf Cetak',
  'Mushaf Digital',
  'Audio / Visual',
  'Aksesibilitas',
];

const EMPTY_FORM = {
  name: '',
  category: 'Mushaf Cetak',
  description: '',
  baseCost: 0,
  costPerUnit: 0,
  unitLabel: 'per surat tanda tashih',
  defaultUnitCount: 1,
  baseDurationDays: 0,
  durationPer100UnitsDays: 0,
  revisionDurationDays: 0,
  dummyDurationDays: 0,
  isPopular: false,
  requirementsNote: '',
  sortOrder: 0,
};

// ── Utilitas ──────────────────────────────────────────────────────────────────
const formatCurrency = (amount) =>
  new Intl.NumberFormat('id-ID', {
    style: 'currency',
    currency: 'IDR',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount);

const formatDate = (iso) => {
  if (!iso) return '-';
  const d = new Date(iso);
  return d.toLocaleDateString('id-ID', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
};

const generateId = () => `content-${Date.now()}`;

// ── Komponen Utama ────────────────────────────────────────────────────────────
export const ContentConfiguration = () => {
  const { currentUser } = useAuth();
  const [contentItems, setContentItems] = useState([]);
  const [categoriesList, setCategoriesList] = useState([]);
  const [loading, setLoading] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [apiError, setApiError] = useState('');
  const [apiSuccess, setApiSuccess] = useState('');

  const [searchQuery, setSearchQuery] = useState('');
  const [filterCategory, setFilterCategory] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingItem, setEditingItem] = useState(null);
  const [formData, setFormData] = useState({ ...EMPTY_FORM });
  const [deleteConfirm, setDeleteConfirm] = useState(null);
  const [sortConfig, setSortConfig] = useState({ key: 'sortOrder', direction: 'asc' });
  const [formErrors, setFormErrors] = useState({});
  const modalRef = useRef(null);

  // ── Fetch live data from backend master API ───────────────────────────
  const loadData = async () => {
    setLoading(true);
    setApiError('');
    try {
      const [catRes, stRes] = await Promise.all([
        masterApi.getCategories(),
        masterApi.getServiceTypes(),
      ]);

      if (catRes?.data) {
        setCategoriesList(catRes.data);
      }

      if (Array.isArray(stRes?.data)) {
        const mapped = stRes.data.map((st, idx) => ({
          id: st.id,
          name: st.name,
          category: st.category?.name || 'Mushaf Cetak',
          category_id: st.category_id,
          service_kind: st.service_kind,
          description: '',
          baseCost: Number(st.base_fee) || 0,
          costPerUnit: 0,
          unitLabel: st.fee_unit === 'PER_STT' ? 'per surat tanda tashih' : (st.fee_unit || 'per surat tanda tashih'),
          defaultUnitCount: 1,
          baseDurationDays: st.duration_initial || 15,
          durationPer100UnitsDays: 0,
          revisionDurationDays: st.duration_revision || 7,
          dummyDurationDays: st.duration_dummy || 3,
          isPopular: idx === 0,
          requirementsNote: '',
          sortOrder: idx,
          updatedAt: st.updated_at || st.created_at,
          status: st.status,
        }));
        setContentItems(mapped);
      }
    } catch (err) {
      setApiError(err?.message || 'Data layanan belum dapat dimuat.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const availableCategoryOptions = categoriesList.length > 0
    ? categoriesList.map((c) => c.name)
    : CATEGORY_OPTIONS;

  // Tutup modal saat klik di luar
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (modalRef.current && !modalRef.current.contains(e.target)) {
        handleCloseModal();
      }
    };
    if (isModalOpen || deleteConfirm) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [isModalOpen, deleteConfirm]);

  // Escape key menutup modal
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape') {
        handleCloseModal();
        setDeleteConfirm(null);
      }
    };
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, []);

  // ── Filter & Sort ─────────────────────────────────────────────────────
  const filteredItems = contentItems
    .filter((item) => {
      const matchesSearch =
        !searchQuery ||
        item.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        item.category.toLowerCase().includes(searchQuery.toLowerCase());
      const matchesCategory = !filterCategory || item.category === filterCategory;
      return matchesSearch && matchesCategory;
    })
    .sort((a, b) => {
      const { key, direction } = sortConfig;
      let aVal = a[key];
      let bVal = b[key];
      if (typeof aVal === 'string') aVal = aVal.toLowerCase();
      if (typeof bVal === 'string') bVal = bVal.toLowerCase();
      if (aVal < bVal) return direction === 'asc' ? -1 : 1;
      if (aVal > bVal) return direction === 'asc' ? 1 : -1;
      return 0;
    });

  const handleSort = (key) => {
    setSortConfig((prev) => ({
      key,
      direction: prev.key === key && prev.direction === 'asc' ? 'desc' : 'asc',
    }));
  };

  // ── Modal handlers ────────────────────────────────────────────────────
  const handleOpenCreate = () => {
    setEditingItem(null);
    setFormData({ ...EMPTY_FORM, sortOrder: contentItems.length });
    setFormErrors({});
    setIsModalOpen(true);
  };

  const handleOpenEdit = (item) => {
    setEditingItem(item);
    setFormData({ ...item });
    setFormErrors({});
    setIsModalOpen(true);
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
    setEditingItem(null);
    setFormData({ ...EMPTY_FORM });
    setFormErrors({});
  };

  // ── Validasi form ─────────────────────────────────────────────────────
  const validateForm = () => {
    const errors = {};
    if (!formData.name.trim()) errors.name = 'Nama konten wajib diisi';
    if (!formData.category) errors.category = 'Kategori wajib dipilih';
    if (formData.baseDurationDays < 0) errors.baseDurationDays = 'Durasi tidak boleh negatif';
    if (formData.baseCost < 0) errors.baseCost = 'Biaya tidak boleh negatif';
    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  // ── Simpan (Tambah / Edit) ────────────────────────────────────────────
  const handleSave = async () => {
    if (!validateForm()) return;
    setIsSubmitting(true);
    setApiError('');

    try {
      if (editingItem) {
        // Edit via masterApi
        const payload = {
          name: formData.name,
          category: formData.category,
          baseCost: Number(formData.baseCost),
          unitLabel: formData.unitLabel,
          baseDurationDays: Number(formData.baseDurationDays),
          revisionDurationDays: Number(formData.revisionDurationDays),
          dummyDurationDays: Number(formData.dummyDurationDays),
        };

        await masterApi.updateServiceType(editingItem.id, payload);
        setApiSuccess('Konten layanan berhasil diperbarui di database!');
        await loadData();
      } else {
        // Buat baru via masterApi
        const payload = {
          name: formData.name,
          category: formData.category,
          baseCost: Number(formData.baseCost),
          unitLabel: formData.unitLabel,
          baseDurationDays: Number(formData.baseDurationDays),
          revisionDurationDays: Number(formData.revisionDurationDays),
          dummyDurationDays: Number(formData.dummyDurationDays),
        };

        await masterApi.createServiceType(payload);
        setApiSuccess('Konten layanan baru berhasil disimpan ke database!');
        await loadData();
      }
      handleCloseModal();
      setTimeout(() => setApiSuccess(''), 4000);
    } catch (err) {
      setApiError(err?.message || 'Terjadi kesalahan saat menyimpan data.');
    } finally {
      setIsSubmitting(false);
    }
  };

  // ── Hapus ─────────────────────────────────────────────────────────────
  const handleDelete = async (id) => {
    setIsSubmitting(true);
    setApiError('');
    try {
      await masterApi.deleteServiceType(id);
      await loadData();
      setApiSuccess('Konten layanan berhasil dinonaktifkan.');
      setDeleteConfirm(null);
      setTimeout(() => setApiSuccess(''), 4000);
    } catch (err) {
      setApiError(err?.message || 'Konten layanan belum dapat dinonaktifkan.');
    } finally {
      setIsSubmitting(false);
    }
  };

  // ── Form change handler ───────────────────────────────────────────────
  const handleChange = (field, value) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
    if (formErrors[field]) {
      setFormErrors((prev) => {
        const next = { ...prev };
        delete next[field];
        return next;
      });
    }
  };

  // ── Statistik ringkasan ───────────────────────────────────────────────
  const stats = {
    total: contentItems.length,
    popular: contentItems.filter((i) => i.isPopular).length,
    categories: [...new Set(contentItems.map((i) => i.category))].length,
    freeServices: contentItems.filter((i) => i.baseCost === 0 && i.costPerUnit === 0).length,
  };

  // ── Render ────────────────────────────────────────────────────────────
  return (
    <div className="space-y-6">
      {/* ── Header ──────────────────────────────────────────────────── */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="text-xs font-semibold px-2 py-0.5 rounded bg-brand-100 text-brand-700">
              Role: {currentUser?.role || currentUser?.roles?.[0] || 'SUPERADMIN'}
            </span>
            <span className="text-xs text-ink-muted">
              Master Data & Konfigurasi
            </span>
          </div>
          <h1 className="text-2xl font-bold text-ink mt-1">
            Konfigurasi Konten Layanan Tashih
          </h1>
          <p className="text-sm text-ink-muted">
            Kelola jenis konten layanan pentashihan, biaya PNBP, satuan, dan durasi hari kerja.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            icon={<RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />}
            onClick={loadData}
            disabled={loading}
          >
            Muat Ulang
          </Button>
          <Button
            variant="primary"
            icon={<Plus className="w-4 h-4" />}
            onClick={handleOpenCreate}
          >
            Tambah Konten Baru
          </Button>
        </div>
      </div>

      {/* ── Notifikasi Status API ───────────────────────────────────── */}
      {apiSuccess && (
        <div className="p-3.5 bg-brand-50 border border-brand-100 rounded-lg flex items-center gap-3 text-brand-800 text-sm animate-in fade-in">
          <CheckCircle2 className="w-5 h-5 text-brand-700 flex-shrink-0" />
          <span>{apiSuccess}</span>
        </div>
      )}
      {apiError && (
        <div className="p-3.5 bg-civic-dangerSoft border border-civic-dangerLine rounded-lg flex items-center gap-3 text-civic-danger text-sm animate-in fade-in">
          <AlertTriangle className="w-5 h-5 text-civic-danger flex-shrink-0" />
          <span>{apiError}</span>
        </div>
      )}

      {/* ── Ringkasan Statistik ─────────────────────────────────────── */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card className="p-4">
          <div className="flex items-center justify-between text-ink-muted text-xs font-medium">
            <span>Total Konten</span>
            <Package className="w-4 h-4 text-brand-700" />
          </div>
          <div className="text-2xl font-bold text-ink mt-2">{stats.total}</div>
          <p className="text-[11px] text-ink-muted mt-1">Jenis layanan terdaftar</p>
        </Card>
        <Card className="p-4">
          <div className="flex items-center justify-between text-ink-muted text-xs font-medium">
            <span>Layanan Populer</span>
            <Star className="w-4 h-4 text-civicGold-700" />
          </div>
          <div className="text-2xl font-bold text-ink mt-2">{stats.popular}</div>
          <p className="text-[11px] text-ink-muted mt-1">Ditandai sebagai unggulan</p>
        </Card>
        <Card className="p-4">
          <div className="flex items-center justify-between text-ink-muted text-xs font-medium">
            <span>Kategori</span>
            <FileText className="w-4 h-4 text-civic-info" />
          </div>
          <div className="text-2xl font-bold text-ink mt-2">{stats.categories}</div>
          <p className="text-[11px] text-ink-muted mt-1">Kelompok jenis mushaf</p>
        </Card>
        <Card className="p-4">
          <div className="flex items-center justify-between text-ink-muted text-xs font-medium">
            <span>Bebas Tarif</span>
            <Coins className="w-4 h-4 text-brand-700" />
          </div>
          <div className="text-2xl font-bold text-ink mt-2">{stats.freeServices}</div>
          <p className="text-[11px] text-ink-muted mt-1">Tanpa biaya PNBP</p>
        </Card>
      </div>

      {/* ── Filter & Search Bar ─────────────────────────────────────── */}
      <Card>
        <div className="flex flex-col sm:flex-row sm:items-center gap-3 mb-4">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-ink-muted" />
            <input
              type="text"
              placeholder="Cari nama konten atau kategori..."
              className="w-full pl-10 pr-4 py-2.5 text-sm border border-line rounded-md focus:outline-none focus:ring-2 focus:ring-brand-700 focus:border-brand-700 bg-white transition-colors"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
          <div className="relative">
            <select
              className="appearance-none pl-4 pr-10 py-2.5 text-sm border border-line rounded-md focus:outline-none focus:ring-2 focus:ring-brand-700 focus:border-brand-700 bg-white cursor-pointer min-w-[180px] transition-colors"
              value={filterCategory}
              onChange={(e) => setFilterCategory(e.target.value)}
            >
              <option value="">Semua Kategori</option>
              {availableCategoryOptions.map((cat) => (
                <option key={cat} value={cat}>
                  {cat}
                </option>
              ))}
            </select>
            <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-ink-muted pointer-events-none" />
          </div>
        </div>

        {/* ── Tabel Daftar Konten ─────────────────────────────────────── */}
        <div className="overflow-x-auto -mx-6">
          <table className="w-full text-left border-collapse min-w-[900px]">
            <thead>
              <tr className="bg-brand-100 text-brand-700 text-xs font-semibold uppercase tracking-wider">
                <th className="py-3 px-6 w-8">#</th>
                <th
                  className="py-3 px-6 cursor-pointer hover:text-brand-800 select-none"
                  onClick={() => handleSort('name')}
                >
                  <span className="inline-flex items-center gap-1">
                    Nama Konten
                    <ArrowUpDown className="w-3 h-3" />
                  </span>
                </th>
                <th
                  className="py-3 px-6 cursor-pointer hover:text-brand-800 select-none"
                  onClick={() => handleSort('category')}
                >
                  <span className="inline-flex items-center gap-1">
                    Kategori
                    <ArrowUpDown className="w-3 h-3" />
                  </span>
                </th>
                <th
                  className="py-3 px-6 text-right cursor-pointer hover:text-brand-800 select-none"
                  onClick={() => handleSort('baseCost')}
                >
                  <span className="inline-flex items-center gap-1 justify-end">
                    Biaya Dasar
                    <ArrowUpDown className="w-3 h-3" />
                  </span>
                </th>
                <th className="py-3 px-6 text-center">Durasi (Hari Kerja)</th>
                <th className="py-3 px-6 text-center">Status</th>
                <th className="py-3 px-6 text-center">Terakhir Diubah</th>
                <th className="py-3 px-6 text-right">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-line text-sm">
              {filteredItems.length === 0 ? (
                <tr>
                  <td colSpan={8} className="py-12 text-center text-ink-muted">
                    <div className="flex flex-col items-center gap-2">
                      <FileText className="w-8 h-8 text-line-strong" />
                      <p className="font-medium">Tidak ada konten ditemukan</p>
                      <p className="text-xs">Coba ubah kata kunci pencarian atau filter kategori.</p>
                    </div>
                  </td>
                </tr>
              ) : (
                filteredItems.map((item, index) => (
                  <tr
                    key={item.id}
                    className="hover:bg-canvas transition-colors group"
                  >
                    <td className="py-4 px-6 text-xs text-ink-muted font-mono">
                      {index + 1}
                    </td>
                    <td className="py-4 px-6">
                      <div className="flex items-start gap-2">
                        <div className="min-w-0">
                          <span className="font-semibold text-ink block text-sm leading-tight">
                            {item.name}
                          </span>
                          {item.description && (
                            <span className="text-xs text-ink-muted block mt-0.5 line-clamp-1">
                              {item.description}
                            </span>
                          )}
                          <span className="text-[11px] text-ink-muted block mt-0.5 font-mono">
                            {item.unitLabel} · {item.defaultUnitCount} unit default
                          </span>
                        </div>
                      </div>
                    </td>
                    <td className="py-4 px-6">
                      <Badge variant="default">{item.category}</Badge>
                    </td>
                    <td className="py-4 px-6 text-right">
                      <span className="font-bold text-ink block">
                        {item.baseCost === 0 ? (
                          <span className="text-brand-700">Gratis</span>
                        ) : (
                          formatCurrency(item.baseCost)
                        )}
                      </span>
                      {item.costPerUnit > 0 && (
                        <span className="text-[11px] text-ink-muted block mt-0.5">
                          + {formatCurrency(item.costPerUnit)} / unit
                        </span>
                      )}
                    </td>
                    <td className="py-4 px-6 text-center">
                      <div className="flex flex-col items-center gap-0.5">
                        <span className="inline-flex items-center gap-1 text-xs font-medium text-ink">
                          <Clock className="w-3 h-3 text-brand-700" />
                          {item.baseDurationDays} hari
                        </span>
                        <span className="text-[10px] text-ink-muted">
                          Revisi: {item.revisionDurationDays}d · Dumi: {item.dummyDurationDays}d
                        </span>
                        {item.durationPer100UnitsDays > 0 && (
                          <span className="text-[10px] text-ink-muted">
                            +{item.durationPer100UnitsDays}d / 100 unit
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="py-4 px-6 text-center">
                      {item.isPopular ? (
                        <Badge variant="gold" icon={<Star className="w-3 h-3" />}>
                          Populer
                        </Badge>
                      ) : (
                        <span className="text-xs text-ink-muted">—</span>
                      )}
                    </td>
                    <td className="py-4 px-6 text-center">
                      <span className="text-xs text-ink-muted">{formatDate(item.updatedAt)}</span>
                    </td>
                    <td className="py-4 px-6 text-right">
                      <div className="flex items-center justify-end gap-1 opacity-100 sm:opacity-0 sm:group-hover:opacity-100 sm:group-focus-within:opacity-100 transition-opacity">
                        <button
                          onClick={() => handleOpenEdit(item)}
                          className="p-2 rounded-md hover:bg-brand-100 text-ink-muted hover:text-brand-700 transition-colors"
                          title="Edit konten"
                        >
                          <Pencil className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => setDeleteConfirm(item)}
                          className="p-2 rounded-md hover:bg-civic-dangerSoft text-ink-muted hover:text-civic-danger transition-colors"
                          title="Nonaktifkan konten"
                          aria-label={`Nonaktifkan ${item.name}`}
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Jumlah hasil */}
        <div className="flex items-center justify-between mt-4 pt-3 border-t border-line">
          <p className="text-xs text-ink-muted">
            Menampilkan {filteredItems.length} dari {contentItems.length} konten layanan
          </p>
        </div>
      </Card>

      {/* ══════════════════════════════════════════════════════════════════
          Modal Form Tambah / Edit Konten
         ══════════════════════════════════════════════════════════════════ */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-black/40 z-50 flex items-start justify-center pt-10 pb-10 overflow-y-auto">
          <div
            ref={modalRef}
            className="bg-white rounded-xl shadow-2xl w-full max-w-2xl mx-4 animate-in fade-in slide-in-from-top-4"
          >
            {/* Modal Header */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-line">
              <div>
                <h2 className="text-lg font-bold text-ink">
                  {editingItem ? 'Edit Konten Layanan' : 'Tambah Konten Layanan Baru'}
                </h2>
                <p className="text-xs text-ink-muted mt-0.5">
                  {editingItem
                    ? `Mengubah: ${editingItem.name}`
                    : 'Isi formulir di bawah untuk menambahkan jenis layanan tashih baru.'}
                </p>
              </div>
              <button
                onClick={handleCloseModal}
                className="p-2 rounded-md hover:bg-surface-subtle text-ink-muted transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Body */}
            <div className="px-6 py-5 space-y-5 max-h-[65vh] overflow-y-auto">
              {/* Nama & Kategori */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-ink mb-1.5">
                    Nama Konten <span className="text-civic-danger">*</span>
                  </label>
                  <input
                    type="text"
                    value={formData.name}
                    onChange={(e) => handleChange('name', e.target.value)}
                    className={`w-full px-3 py-2.5 text-sm border rounded-md focus:outline-none focus:ring-2 focus:ring-brand-700 transition-colors ${
                      formErrors.name
                        ? 'border-civic-dangerLine bg-civic-dangerSoft'
                        : 'border-line bg-white'
                    }`}
                    placeholder="Contoh: Mushaf Al-Qur'an 30 Juz"
                  />
                  {formErrors.name && (
                    <p className="text-[11px] text-civic-danger mt-1">{formErrors.name}</p>
                  )}
                </div>
                <div>
                  <label className="block text-xs font-semibold text-ink mb-1.5">
                    Kategori <span className="text-civic-danger">*</span>
                  </label>
                  <div className="relative">
                    <select
                      value={formData.category}
                      onChange={(e) => handleChange('category', e.target.value)}
                      className={`appearance-none w-full px-3 pr-10 py-2.5 text-sm border rounded-md focus:outline-none focus:ring-2 focus:ring-brand-700 cursor-pointer transition-colors ${
                        formErrors.category
                          ? 'border-civic-dangerLine bg-civic-dangerSoft'
                          : 'border-line bg-white'
                      }`}
                    >
                      {availableCategoryOptions.map((cat) => (
                        <option key={cat} value={cat}>
                          {cat}
                        </option>
                      ))}
                    </select>
                    <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-ink-muted pointer-events-none" />
                  </div>
                  {formErrors.category && (
                    <p className="text-[11px] text-civic-danger mt-1">{formErrors.category}</p>
                  )}
                </div>
              </div>

              {/* Deskripsi */}
              <div>
                <label className="block text-xs font-semibold text-ink mb-1.5">
                  Deskripsi
                </label>
                <textarea
                  rows={3}
                  value={formData.description}
                  onChange={(e) => handleChange('description', e.target.value)}
                  className="w-full px-3 py-2.5 text-sm border border-line rounded-md focus:outline-none focus:ring-2 focus:ring-brand-700 bg-white resize-none transition-colors"
                  placeholder="Deskripsi singkat mengenai jenis layanan ini (opsional)"
                />
              </div>

              {/* ── Biaya PNBP ─────────────────────────────────────────── */}
              <div>
                <h3 className="text-xs font-bold text-ink uppercase tracking-wider mb-3 flex items-center gap-1.5">
                  <Coins className="w-3.5 h-3.5 text-civicGold-700" />
                  Biaya PNBP
                </h3>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  <div>
                    <label className="block text-xs font-medium text-ink-muted mb-1.5">
                      Biaya Dasar (Rp)
                    </label>
                    <input
                      type="number"
                      min="0"
                      value={formData.baseCost}
                      onChange={(e) =>
                        handleChange('baseCost', parseInt(e.target.value, 10) || 0)
                      }
                      className={`w-full px-3 py-2.5 text-sm border rounded-md focus:outline-none focus:ring-2 focus:ring-brand-700 bg-white transition-colors ${
                        formErrors.baseCost ? 'border-civic-dangerLine bg-civic-dangerSoft' : 'border-line'
                      }`}
                    />
                    {formErrors.baseCost && (
                      <p className="text-[11px] text-civic-danger mt-1">{formErrors.baseCost}</p>
                    )}
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-ink-muted mb-1.5">
                      Biaya per Unit (Rp)
                    </label>
                    <input
                      type="number"
                      min="0"
                      value={formData.costPerUnit}
                      onChange={(e) =>
                        handleChange('costPerUnit', parseInt(e.target.value, 10) || 0)
                      }
                      className="w-full px-3 py-2.5 text-sm border border-line rounded-md focus:outline-none focus:ring-2 focus:ring-brand-700 bg-white transition-colors"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-ink-muted mb-1.5">
                      Satuan Label
                    </label>
                    <input
                      type="text"
                      value={formData.unitLabel}
                      onChange={(e) => handleChange('unitLabel', e.target.value)}
                      className="w-full px-3 py-2.5 text-sm border border-line rounded-md focus:outline-none focus:ring-2 focus:ring-brand-700 bg-white transition-colors"
                      placeholder="per surat tanda tashih"
                    />
                  </div>
                </div>
              </div>

              {/* ── Durasi Hari Kerja ──────────────────────────────────── */}
              <div>
                <h3 className="text-xs font-bold text-ink uppercase tracking-wider mb-3 flex items-center gap-1.5">
                  <Clock className="w-3.5 h-3.5 text-brand-700" />
                  Durasi Hari Kerja
                </h3>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                  <div>
                    <label className="block text-xs font-medium text-ink-muted mb-1.5">
                      Durasi Dasar
                    </label>
                    <div className="relative">
                      <input
                        type="number"
                        min="0"
                        value={formData.baseDurationDays}
                        onChange={(e) =>
                          handleChange('baseDurationDays', parseInt(e.target.value, 10) || 0)
                        }
                        className={`w-full px-3 py-2.5 text-sm border rounded-md focus:outline-none focus:ring-2 focus:ring-brand-700 bg-white pr-12 transition-colors ${
                          formErrors.baseDurationDays
                            ? 'border-civic-dangerLine bg-civic-dangerSoft'
                            : 'border-line'
                        }`}
                      />
                      <span className="absolute right-3 top-1/2 -translate-y-1/2 text-[11px] text-ink-muted">
                        hari
                      </span>
                    </div>
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-ink-muted mb-1.5">
                      Durasi Revisi
                    </label>
                    <div className="relative">
                      <input
                        type="number"
                        min="0"
                        value={formData.revisionDurationDays}
                        onChange={(e) =>
                          handleChange('revisionDurationDays', parseInt(e.target.value, 10) || 0)
                        }
                        className="w-full px-3 py-2.5 text-sm border border-line rounded-md focus:outline-none focus:ring-2 focus:ring-brand-700 bg-white pr-12 transition-colors"
                      />
                      <span className="absolute right-3 top-1/2 -translate-y-1/2 text-[11px] text-ink-muted">
                        hari
                      </span>
                    </div>
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-ink-muted mb-1.5">
                      Durasi Dumi
                    </label>
                    <div className="relative">
                      <input
                        type="number"
                        min="0"
                        value={formData.dummyDurationDays}
                        onChange={(e) =>
                          handleChange('dummyDurationDays', parseInt(e.target.value, 10) || 0)
                        }
                        className="w-full px-3 py-2.5 text-sm border border-line rounded-md focus:outline-none focus:ring-2 focus:ring-brand-700 bg-white pr-12 transition-colors"
                      />
                      <span className="absolute right-3 top-1/2 -translate-y-1/2 text-[11px] text-ink-muted">
                        hari
                      </span>
                    </div>
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-ink-muted mb-1.5">
                      Per 100 Unit
                    </label>
                    <div className="relative">
                      <input
                        type="number"
                        min="0"
                        value={formData.durationPer100UnitsDays}
                        onChange={(e) =>
                          handleChange('durationPer100UnitsDays', parseInt(e.target.value, 10) || 0)
                        }
                        className="w-full px-3 py-2.5 text-sm border border-line rounded-md focus:outline-none focus:ring-2 focus:ring-brand-700 bg-white pr-12 transition-colors"
                      />
                      <span className="absolute right-3 top-1/2 -translate-y-1/2 text-[11px] text-ink-muted">
                        hari
                      </span>
                    </div>
                  </div>
                </div>
              </div>

              {/* ── Pengaturan Tambahan ─────────────────────────────────── */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-medium text-ink-muted mb-1.5">
                    Jumlah Unit Default
                  </label>
                  <input
                    type="number"
                    min="1"
                    value={formData.defaultUnitCount}
                    onChange={(e) =>
                      handleChange('defaultUnitCount', parseInt(e.target.value, 10) || 1)
                    }
                    className="w-full px-3 py-2.5 text-sm border border-line rounded-md focus:outline-none focus:ring-2 focus:ring-brand-700 bg-white transition-colors"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-ink-muted mb-1.5">
                    Urutan Tampil (Sort Order)
                  </label>
                  <input
                    type="number"
                    min="0"
                    value={formData.sortOrder}
                    onChange={(e) =>
                      handleChange('sortOrder', parseInt(e.target.value, 10) || 0)
                    }
                    className="w-full px-3 py-2.5 text-sm border border-line rounded-md focus:outline-none focus:ring-2 focus:ring-brand-700 bg-white transition-colors"
                  />
                </div>
              </div>

              {/* Catatan Persyaratan */}
              <div>
                <label className="block text-xs font-semibold text-ink mb-1.5">
                  Catatan Persyaratan
                </label>
                <textarea
                  rows={2}
                  value={formData.requirementsNote}
                  onChange={(e) => handleChange('requirementsNote', e.target.value)}
                  className="w-full px-3 py-2.5 text-sm border border-line rounded-md focus:outline-none focus:ring-2 focus:ring-brand-700 bg-white resize-none transition-colors"
                  placeholder="Dokumen atau syarat khusus untuk layanan ini (opsional)"
                />
              </div>

              {/* Toggle Populer */}
              <div className="flex items-center gap-3 p-3 bg-canvas rounded-lg border border-line">
                <button
                  type="button"
                  onClick={() => handleChange('isPopular', !formData.isPopular)}
                  className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-brand-700 focus:ring-offset-2 ${
                    formData.isPopular ? 'bg-brand-700' : 'bg-line-strong'
                  }`}
                >
                  <span
                    className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform shadow-sm ${
                      formData.isPopular ? 'translate-x-6' : 'translate-x-1'
                    }`}
                  />
                </button>
                <div>
                  <span className="text-sm font-medium text-ink">
                    Tandai sebagai Layanan Populer
                  </span>
                  <p className="text-[11px] text-ink-muted">
                    Layanan ini akan ditampilkan dengan badge "Populer" di formulir pendaftaran.
                  </p>
                </div>
              </div>
            </div>

            {/* Modal Footer */}
            <div className="flex items-center justify-end gap-3 px-6 py-4 border-t border-line bg-canvas rounded-b-xl">
              <Button variant="ghost" onClick={handleCloseModal}>
                Batal
              </Button>
              <Button
                variant="primary"
                icon={isSubmitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                onClick={handleSave}
                disabled={isSubmitting}
              >
                {isSubmitting ? 'Menyimpan...' : (editingItem ? 'Simpan Perubahan' : 'Tambah Konten')}
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* ══════════════════════════════════════════════════════════════════
          Dialog Konfirmasi Hapus
         ══════════════════════════════════════════════════════════════════ */}
      {deleteConfirm && (
        <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center">
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-md mx-4 p-6 space-y-4">
            <div className="flex items-start gap-3">
              <div className="w-10 h-10 rounded-full bg-civic-dangerSoft flex items-center justify-center flex-shrink-0">
                <AlertTriangle className="w-5 h-5 text-civic-danger" />
              </div>
              <div>
                <h3 className="text-base font-bold text-ink">
                  Nonaktifkan Konten Layanan
                </h3>
                <p className="text-sm text-ink-muted mt-1">
                  Anda yakin ingin menghapus{' '}
                  <span className="font-semibold text-ink">
                    "{deleteConfirm.name}"
                  </span>
                  ? Layanan akan dinonaktifkan dan tidak muncul pada pilihan pengajuan baru.
                </p>
              </div>
            </div>
            {apiError && <p role="alert" className="rounded-lg bg-civic-dangerSoft p-3 text-sm text-civic-danger">{apiError}</p>}
            <div className="flex items-center justify-end gap-3 pt-2">
              <Button variant="ghost" onClick={() => setDeleteConfirm(null)} disabled={isSubmitting}>
                Batal
              </Button>
              <Button
                variant="danger"
                icon={<Trash2 className="w-4 h-4" />}
                onClick={() => handleDelete(deleteConfirm.id)}
                disabled={isSubmitting}
              >
                {isSubmitting ? 'Memproses...' : 'Nonaktifkan Konten'}
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
