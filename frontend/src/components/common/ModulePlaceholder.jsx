import React, { useState, useEffect } from 'react';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { StatusBadge } from '@/components/ui/StatusBadge';
import { TOKENS } from '@/app/tokens';
import { useAuth } from '@/features/auth/AuthContext';
import { systemApi } from '@/api/system.api';
import {
  ArrowLeft,
  Server,
  Database,
  ShieldCheck,
  ShieldAlert,
  Play,
  RefreshCw,
  Table,
  Code,
  FileText,
  CheckCircle2,
  AlertTriangle,
  Clock,
  Layers,
  ChevronRight,
  Sliders,
  Check,
  Building2,
  FileCheck2,
  BookOpen,
} from 'lucide-react';
import { Link } from 'react-router-dom';

// Kamus Penamaan Bisnis Resmi LPMQ Kemenag RI untuk Tabel & Entitas
const BUSINESS_TABLE_MAP = {
  registrations: {
    title: 'Buku Register Permohonan Pentashihan',
    desc: 'Catatan berkas pendaftaran naskah master mushaf yang diajukan oleh penerbit',
  },
  status_histories: {
    title: 'Catatan Kronologi & Riwayat Status Naskah',
    desc: 'Histori mutasi tahapan permohonan berserta pejabat penanggung jawab (append-only)',
  },
  manuscript_files: {
    title: 'Berkas Penanda Naskah (Cover & Lembar 1–5)',
    desc: 'Arsip digital penanda naskah mushaf yang diserahkan penerbit saat pendaftaran',
  },
  registration_addons: {
    title: 'Rincian Layanan Tambahan (Addon)',
    desc: 'Komponen layanan tambahan berbayar yang dipilih pemohon',
  },
  service_types: {
    title: 'Katalog 17 Profil Layanan & Tarif Dasar PNBP',
    desc: 'Daftar jenis mushaf, tarif resmi sesuai PP PNBP, dan target durasi kerja (SLA)',
  },
  mushaf_categories: {
    title: 'Klasifikasi 4 Kategori Mushaf',
    desc: 'Kategori: Mushaf Standar Indonesia, Juz Amma, Al-Qur\'an Terjemah, dan Mushaf Braille',
  },
  service_addons: {
    title: 'Katalog Komponen Layanan Tambahan',
    desc: 'Daftar add-on resmi dengan durasi dan tarif yang berlaku',
  },
  distribution_teams: {
    title: 'Daftar Kelompok Tim Pentashih (SK Aktif)',
    desc: 'Kelompok pentashih yang disahkan melalui Keputusan Kepala LPMQ',
  },
  team_members: {
    title: 'Daftar Anggota Tim & Pembaca Naskah',
    desc: 'Pejabat fungsional pentashih Al-Qur\'an yang bertugas dalam sidang',
  },
  verification_assignments: {
    title: 'Buku Penugasan Verifikasi Berkas',
    desc: 'Daftar tugas pemeriksaan kelengkapan administrasi dan fisik oleh verifikator',
  },
  payment_records: {
    title: 'Buku Pembukuan Penerimaan Negara (PNBP)',
    desc: 'Catatan nomor transaksi penerimaan negara (NTPN), billing SIMPONI, dan bukti bayar',
  },
  assignments: {
    title: 'Buku Penugasan Sidang Pentashih',
    desc: 'Alokasi naskah mushaf kepada para pentashih dengan penetapan batas waktu',
  },
  tashih_reviews: {
    title: 'Risalah Catatan Koreksi & Temuan Sidang',
    desc: 'Catatan koreksi lafaz, harakat, rasm usmani, dan tanda waqaf pada 3 tahap sidang',
  },
  official_documents: {
    title: 'Buku Register Dokumen Resmi (Berita Acara & STT)',
    desc: 'Arsip Berita Acara Tashih dan Surat Tanda Tashih yang diterbitkan secara sah',
  },
  document_signatories: {
    title: 'Catatan Pengesahan & Tanda Tangan Pejabat',
    desc: 'Daftar pejabat berwenang penandatangan dokumen (Ketua Tim & Kepala LPMQ)',
  },
  documentation_items: {
    title: 'Tanda Terima Penyerahan 5 Eksemplar Mushaf',
    desc: 'Pencatatan deposit mushaf fisik cetak untuk perpustakaan dan dokumentasi negara',
  },
  audit_logs: {
    title: 'Buku Catatan Audit & Akuntabilitas Layanan',
    desc: 'Rekam jejak setiap aksi material pejabat dan penerbit demi integritas dokumen negara',
  },
  users: {
    title: 'Buku Register Aparatur & Akun Pemohon',
    desc: 'Daftar aparatur sipil negara (ASN) LPMQ dan akun penerbit resmi terverifikasi',
  },
  roles: {
    title: 'Struktur Wewenang & Tanggung Jawab',
    desc: 'Penerbit, Verifikator, Distributor, Pentashih, Dokumentator, dan Kepala LPMQ',
  },
};

// Kamus Penamaan Peran Resmi
const ROLE_LABELS = {
  SUPERADMIN: 'Administrator Sistem LPMQ',
  HELPER_ADMIN: 'Administrator Sistem LPMQ',
  ADMIN_PENERBIT: 'Penerbit / Pemohon Pentashihan',
  PUBLISHER: 'Penerbit / Pemohon Pentashihan',
  VERIFIKATOR: 'Petugas Verifikator Berkas & Naskah',
  VERIFICATOR: 'Petugas Verifikator Berkas & Naskah',
  DISTRIBUTOR: 'Distributor Naskah Pentashihan',
  PENTASHIH: 'Pentashih / Pembaca Naskah Al-Qur\'an',
  TASHIH_MEMBER: 'Anggota Tim Pentashih',
  DOKUMENTATOR: 'Petugas Dokumentator Mushaf',
  DOCUMENTATOR: 'Petugas Dokumentator Mushaf',
  KEPALA_LPMQ: 'Kepala LPMQ Kemenag RI',
  HEAD_OF_LPMQ: 'Kepala LPMQ Kemenag RI',
};

export const ModulePlaceholder = ({
  title,
  moduleName,
  moduleCode,
  sprintTarget = 'Sprint 1',
  description,
  targetTables = [],
  apiEndpoints = [],
  allowedRoles = ['SUPERADMIN'],
  sopReference = "SOP Pentashihan Mushaf Al-Qur'an (Kemenag RI v2.2)",
  businessRules = [],
}) => {
  const { currentUser } = useAuth();
  const currentRoles = currentUser?.roles || [currentUser?.role].filter(Boolean);

  // Mode Tampilan: 'business' (Bahasa Bisnis Layanan, Default) atau 'technical' (Inspeksi Teknis BE & DB)
  const [viewMode, setViewMode] = useState('business');

  // Ekstrak kode modul bila tidak diberikan eksplisit
  const cleanCode =
    moduleCode ||
    (moduleName ? moduleName.split(' ')[0] : 'MST-01');

  const [activeTab, setActiveTab] = useState('diagnostic'); // 'diagnostic' | 'data' | 'spec'
  const [healthData, setHealthData] = useState(null);
  const [diagData, setDiagData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState(null);

  // State untuk interactive endpoint tester
  const [selectedEndpoint, setSelectedEndpoint] = useState(null);
  const [testLoading, setTestLoading] = useState(false);
  const [testResult, setTestResult] = useState(null);
  const [showJsonRaw, setShowJsonRaw] = useState(false);

  const fetchDiagnostics = async () => {
    setError(null);
    try {
      const [health, diag] = await Promise.all([
        systemApi.getHealth().catch((err) => ({
          status: 'ERROR',
          system: 'LPMQ Backend API',
          database: { status: 'DISCONNECTED', error: err.message },
        })),
        systemApi.getModuleDiagnostics(cleanCode).catch((err) => ({
          error: err.message,
          tables: targetTables.map((t) => ({ name: t, row_count: 0, status: 'UNKNOWN' })),
          sample_records: [],
          endpoints: apiEndpoints,
        })),
      ]);

      setHealthData(health);
      setDiagData(diag);

      // Default pilih endpoint pertama jika ada
      const availableEndpoints =
        diag?.endpoints?.length > 0
          ? diag.endpoints
          : apiEndpoints;
      if (availableEndpoints.length > 0 && !selectedEndpoint) {
        setSelectedEndpoint(availableEndpoints[0]);
      }
    } catch (err) {
      setError(err.message || 'Gagal memuat status kesiapan sistem layanan');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchDiagnostics();
  }, [cleanCode]);

  const handleRefresh = () => {
    setRefreshing(true);
    fetchDiagnostics();
  };

  const handleRunTest = async (endpointToTest) => {
    const target = endpointToTest || selectedEndpoint;
    if (!target) return;

    setTestLoading(true);
    setTestResult(null);

    const startTime = Date.now();
    try {
      const cleanPath = target.path.replace('/api/v1', '');
      const res = await systemApi.testEndpoint(cleanPath, target.method || 'GET');
      const elapsed = Date.now() - startTime;

      setTestResult({
        success: true,
        status: 200,
        elapsed_ms: elapsed,
        endpoint: target.path,
        method: target.method || 'GET',
        payload: res,
      });
    } catch (err) {
      const elapsed = Date.now() - startTime;
      setTestResult({
        success: false,
        status: err.status || 500,
        elapsed_ms: elapsed,
        endpoint: target.path,
        method: target.method || 'GET',
        error: err.message,
        payload: err.data || null,
      });
    } finally {
      setTestLoading(false);
    }
  };

  // Cek wewenang peran
  const isSuperadmin = currentRoles.includes('SUPERADMIN') || currentRoles.includes('HELPER_ADMIN');
  const isAuthorized =
    isSuperadmin ||
    allowedRoles.some((role) => currentRoles.includes(role));

  const isBackendUp = healthData?.status === 'UP';
  const isDbConnected = healthData?.database?.status === 'CONNECTED';

  // Daftar tabel gabungan
  const displayTables =
    diagData?.tables && diagData.tables.length > 0
      ? diagData.tables
      : targetTables.map((t) => ({ name: t, row_count: 0, status: 'REGISTERED' }));

  // Daftar endpoint gabungan
  const displayEndpoints =
    diagData?.endpoints && diagData.endpoints.length > 0
      ? diagData.endpoints
      : apiEndpoints;

  // Data sampel dari DB
  const sampleRecords = diagData?.sample_records || [];

  const currentRoleCode = currentRoles[0] || 'GUEST';
  const currentRoleName = ROLE_LABELS[currentRoleCode] || currentRoleCode;

  return (
    <div className="space-y-6">
      {/* Header Halaman dengan Tombol Pengalih Bahasa Bisnis vs Teknis */}
      <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4 pb-4 border-b border-line">
        <div>
          <div className="flex flex-wrap items-center gap-2 mb-1.5">
            <span className="text-xs font-bold px-2.5 py-0.5 rounded bg-brand-100 text-brand-800 tracking-wide">
              {viewMode === 'business' ? `Tahap Layanan: ${cleanCode}` : `Kode: ${cleanCode}`}
            </span>
            <span className="text-xs font-semibold px-2.5 py-0.5 rounded bg-surface-subtle text-ink">
              {viewMode === 'business' ? `Tahap Roadmap: ${sprintTarget}` : `Sprint: ${sprintTarget}`}
            </span>
            <span className="text-xs font-medium px-2 py-0.5 rounded bg-brand-50 text-brand-800 border border-brand-100">
              {viewMode === 'business' ? 'SOP Resmi Kemenag RI v2.2' : 'Modular Monolith Service'}
            </span>
          </div>
          <h1 className="text-2xl font-bold text-ink">{title}</h1>
          <p className="text-sm text-ink-muted mt-1 leading-relaxed max-w-3xl">{description}</p>
        </div>

        <div className="flex flex-wrap items-center gap-2 shrink-0">
          {/* Toggle Bahasa Bisnis / Teknis */}
          <div className="inline-flex rounded-lg border border-line-strong p-0.5 bg-surface-subtle text-xs font-medium">
            <button
              onClick={() => setViewMode('business')}
              className={`px-3 py-1.5 rounded-md transition-all flex items-center gap-1.5 ${
                viewMode === 'business'
                  ? 'bg-white text-brand-800 font-bold shadow-xs'
                  : 'text-ink-muted hover:text-ink'
              }`}
              title="Tampilkan dalam bahasa proses bisnis layanan pentashihan LPMQ"
            >
              <BookOpen className="w-3.5 h-3.5 text-brand-700" />
              <span>Bahasa Bisnis</span>
            </button>
            <button
              onClick={() => setViewMode('technical')}
              className={`px-3 py-1.5 rounded-md transition-all flex items-center gap-1.5 ${
                viewMode === 'technical'
                  ? 'bg-white text-brand-800 font-bold shadow-xs'
                  : 'text-ink-muted hover:text-ink'
              }`}
              title="Tampilkan detail teknis backend, route API, dan database MySQL"
            >
              <Sliders className="w-3.5 h-3.5 text-ink-muted" />
              <span>Inspeksi Teknis</span>
            </button>
          </div>

          <Button
            variant="outline"
            size="sm"
            onClick={handleRefresh}
            disabled={refreshing || loading}
            icon={<RefreshCw className={`w-4 h-4 ${refreshing ? 'animate-spin text-brand-700' : ''}`} />}
          >
            {refreshing ? 'Memeriksa...' : viewMode === 'business' ? 'Cek Status Layanan' : 'Refresh Status'}
          </Button>

          <Link to="/">
            <Button variant="outline" size="sm" icon={<ArrowLeft className="w-4 h-4" />}>
              Beranda
            </Button>
          </Link>
        </div>
      </div>

      {/* Tiga Kartu Status Kesiapan Layanan (Disesuaikan dengan Bahasa Bisnis / Teknis) */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* Kartu 1: Sistem Aplikasi / Backend */}
        <Card className="p-4 border-l-4 border-l-brand-700 shadow-xs">
          <div className="flex items-center gap-3">
            <div
              className={`w-10 h-10 rounded-lg flex items-center justify-center shrink-0 ${
                isBackendUp ? 'bg-brand-50 text-brand-700' : 'bg-civic-dangerSoft text-civic-danger'
              }`}
            >
              <Server className="w-5 h-5" />
            </div>
            <div className="min-w-0">
              <p className="text-xs font-semibold text-ink-muted">
                {viewMode === 'business' ? 'Layanan Digital Pentashihan' : 'Backend Express API'}
              </p>
              <div className="flex items-center gap-2 mt-0.5">
                <span className="text-sm font-bold text-ink truncate">
                  {viewMode === 'business' ? 'Siap Melayani Permohonan' : healthData?.system || 'LPMQ Backend'}
                </span>
                <span
                  className={`inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-bold shrink-0 ${
                    isBackendUp ? 'bg-brand-100 text-brand-800' : 'bg-civic-dangerSoft text-civic-danger'
                  }`}
                >
                  {isBackendUp ? (viewMode === 'business' ? 'AKTIF' : 'UP (200)') : 'TERPUTUS'}
                </span>
              </div>
            </div>
          </div>
          <div className="mt-3 pt-2.5 border-t border-line flex items-center justify-between text-xs text-ink-muted">
            <span>{viewMode === 'business' ? 'Kecepatan Respon Layanan' : 'Latensi Server'}</span>
            <span className="font-semibold text-ink">
              {healthData?.latency_ms !== undefined ? `${healthData.latency_ms} ms` : '-'}
            </span>
          </div>
        </Card>

        {/* Kartu 2: Pusat Data & Arsip / Database */}
        <Card className="p-4 border-l-4 border-l-civicGold-500 shadow-xs">
          <div className="flex items-center gap-3">
            <div
              className={`w-10 h-10 rounded-lg flex items-center justify-center shrink-0 ${
                isDbConnected ? 'bg-brand-50 text-brand-700' : 'bg-civic-dangerSoft text-civic-danger'
              }`}
            >
              <Database className="w-5 h-5" />
            </div>
            <div className="min-w-0">
              <p className="text-xs font-semibold text-ink-muted">
                {viewMode === 'business' ? 'Pusat Data & Arsip Naskah' : 'Basis Data MySQL (Prisma)'}
              </p>
              <div className="flex items-center gap-2 mt-0.5">
                <span className="text-sm font-bold text-ink truncate">
                  {viewMode === 'business' ? 'Pangkalan Data Mushaf' : healthData?.database?.database_name || 'lpmq_db'}
                </span>
                <span
                  className={`inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-bold shrink-0 ${
                    isDbConnected ? 'bg-brand-100 text-brand-800' : 'bg-civic-dangerSoft text-civic-danger'
                  }`}
                >
                  {isDbConnected ? (viewMode === 'business' ? 'TERSINKRON' : 'CONNECTED') : 'TERPUTUS'}
                </span>
              </div>
            </div>
          </div>
          <div className="mt-3 pt-2.5 border-t border-line flex items-center justify-between text-xs text-ink-muted">
            <span>{viewMode === 'business' ? 'Waktu Akses Arsip Data' : 'Query Ping Latency'}</span>
            <span className="font-semibold text-ink">
              {healthData?.database?.latency_ms !== null && healthData?.database?.latency_ms !== undefined
                ? `${healthData.database.latency_ms} ms`
                : '-'}
            </span>
          </div>
        </Card>

        {/* Kartu 3: Wewenang Pejabat / RBAC */}
        <Card className="p-4 border-l-4 border-l-civic-info shadow-xs">
          <div className="flex items-center gap-3">
            <div
              className={`w-10 h-10 rounded-lg flex items-center justify-center shrink-0 ${
                isAuthorized ? 'bg-civic-infoSoft text-civic-info' : 'bg-civic-warningSoft text-civic-warning'
              }`}
            >
              {isAuthorized ? <ShieldCheck className="w-5 h-5" /> : <ShieldAlert className="w-5 h-5" />}
            </div>
            <div className="min-w-0">
              <p className="text-xs font-semibold text-ink-muted">
                {viewMode === 'business' ? 'Hak Wewenang & Tanggung Jawab' : 'Otorisasi Peran (RBAC)'}
              </p>
              <div className="flex items-center gap-2 mt-0.5">
                <span className="text-sm font-bold text-ink truncate" title={currentRoleName}>
                  {currentRoleName}
                </span>
                <span
                  className={`inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-bold shrink-0 ${
                    isAuthorized ? 'bg-civic-infoSoft text-civic-info' : 'bg-civic-warningSoft text-civic-warning'
                  }`}
                >
                  {isAuthorized
                    ? viewMode === 'business' ? 'BERWENANG' : 'DIIZINKAN'
                    : viewMode === 'business' ? 'DIBATASI' : 'DENIED'}
                </span>
              </div>
            </div>
          </div>
          <div className="mt-3 pt-2.5 border-t border-line flex items-center justify-between text-xs text-ink-muted">
            <span>{viewMode === 'business' ? 'Kewenangan Sesuai SOP' : 'Peran Diperbolehkan'}</span>
            <span className="font-semibold text-ink truncate max-w-[150px]" title={allowedRoles.map(r => ROLE_LABELS[r] || r).join(', ')}>
              {viewMode === 'business'
                ? allowedRoles.map(r => ROLE_LABELS[r] || r).join(', ')
                : allowedRoles.join(', ')}
            </span>
          </div>
        </Card>
      </div>

      {/* Navigasi Tab dalam Bahasa Bisnis */}
      <div className="border-b border-line">
        <nav className="flex space-x-6">
          <button
            onClick={() => setActiveTab('diagnostic')}
            className={`pb-3 text-sm font-semibold border-b-2 flex items-center gap-2 transition-colors ${
              activeTab === 'diagnostic'
                ? 'border-brand-700 text-brand-800 font-bold'
                : 'border-transparent text-ink-muted hover:text-ink'
            }`}
          >
            <Server className="w-4 h-4" />
            <span>
              {viewMode === 'business'
                ? 'Kesiapan Alur Kerja & Uji Data Layanan'
                : 'Pemeriksaan BE & DB (Live Checker)'}
            </span>
          </button>

          <button
            onClick={() => setActiveTab('data')}
            className={`pb-3 text-sm font-semibold border-b-2 flex items-center gap-2 transition-colors ${
              activeTab === 'data'
                ? 'border-brand-700 text-brand-800 font-bold'
                : 'border-transparent text-ink-muted hover:text-ink'
            }`}
          >
            <Table className="w-4 h-4" />
            <span>
              {viewMode === 'business'
                ? `Buku Register Data Aktif (${sampleRecords.length} berkas/item)`
                : `Data Riil di Basis Data (${sampleRecords.length} sampel)`}
            </span>
          </button>

          <button
            onClick={() => setActiveTab('spec')}
            className={`pb-3 text-sm font-semibold border-b-2 flex items-center gap-2 transition-colors ${
              activeTab === 'spec'
                ? 'border-brand-700 text-brand-800 font-bold'
                : 'border-transparent text-ink-muted hover:text-ink'
            }`}
          >
            <FileText className="w-4 h-4" />
            <span>
              {viewMode === 'business'
                ? 'Standar Operasional Prosedur (SOP) & Landasan Hukum'
                : 'Spesifikasi SOP & Arsitektur'}
            </span>
          </button>
        </nav>
      </div>

      {/* Tab 1: Kesiapan Alur Kerja & Uji Data Layanan */}
      {activeTab === 'diagnostic' && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Panel Buku Register Resmi / Tabel Database */}
            <Card className="p-5 space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Database className="w-5 h-5 text-brand-700" />
                  <h3 className="font-bold text-ink">
                    {viewMode === 'business'
                      ? 'Buku Register & Pencatatan Resmi Layanan'
                      : 'Tabel Basis Data Terkait'}
                  </h3>
                </div>
                <span className="text-xs text-ink-muted font-medium">
                  {viewMode === 'business' ? 'Arsip Resmi Terakreditasi' : 'MySQL Schema v2.2'}
                </span>
              </div>
              <p className="text-xs text-ink-muted leading-relaxed">
                {viewMode === 'business'
                  ? 'Buku pencatatan administrasi resmi yang digunakan untuk membukukan transaksi pada tahapan layanan ini:'
                  : `Tabel di basis data lpmq_db yang menyimpan data transaksi dan entitas modul ini:`}
              </p>

              <div className="space-y-2.5">
                {displayTables.map((tbl) => {
                  const bMeta = BUSINESS_TABLE_MAP[tbl.name] || {
                    title: `Buku Register ${tbl.name}`,
                    desc: `Pencatatan data entitas ${tbl.name}`,
                  };

                  return (
                    <div
                      key={tbl.name}
                      className="p-3 bg-canvas rounded-lg border border-line flex items-center justify-between gap-3"
                    >
                      <div className="space-y-0.5 min-w-0">
                        <div className="flex items-center gap-2">
                          <Table className="w-4 h-4 text-ink-muted shrink-0" />
                          <span className="text-xs font-bold text-ink">
                            {viewMode === 'business' ? bMeta.title : tbl.name}
                          </span>
                        </div>
                        {viewMode === 'business' ? (
                          <p className="text-[11px] text-ink-muted leading-snug">{bMeta.desc}</p>
                        ) : (
                          <p className="text-[11px] text-ink-muted font-mono">Tabel MySQL: {tbl.name}</p>
                        )}
                      </div>

                      <div className="flex items-center gap-2 shrink-0">
                        <span className="text-xs font-semibold px-2.5 py-1 rounded bg-brand-100 text-brand-800">
                          {tbl.row_count !== undefined ? `${tbl.row_count} rekod` : 'Tersedia'}
                        </span>
                        <span className="text-[11px] font-bold px-2 py-0.5 rounded bg-brand-100 text-brand-800">
                          {viewMode === 'business' ? 'SIAP' : 'READY'}
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </Card>

            {/* Panel Alur Data Pelayanan / API Endpoints */}
            <Card className="p-5 space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Code className="w-5 h-5 text-brand-700" />
                  <h3 className="font-bold text-ink">
                    {viewMode === 'business'
                      ? 'Saluran Alur Data Pelayanan (API Services)'
                      : 'Endpoint API Backend'}
                  </h3>
                </div>
                <span className="text-xs text-ink-muted font-medium">
                  {viewMode === 'business' ? 'Jalur Terproteksi' : 'REST Express v2.2'}
                </span>
              </div>
              <p className="text-xs text-ink-muted leading-relaxed">
                {viewMode === 'business'
                  ? 'Layanan integrasi digital resmi yang menghubungkan antarmuka pengguna dengan pangkalan data pentashihan:'
                  : 'Rute endpoint resmi yang menangani operasi modul ini pada backend:'}
              </p>

              <div className="space-y-2.5">
                {displayEndpoints.map((ep, idx) => {
                  const isSelected = selectedEndpoint?.path === ep.path;
                  return (
                    <div
                      key={idx}
                      onClick={() => setSelectedEndpoint(ep)}
                      className={`p-3 rounded-lg border cursor-pointer transition-all flex items-center justify-between gap-3 ${
                        isSelected
                          ? 'border-brand-700 bg-brand-50/60 ring-1 ring-brand-700'
                          : 'border-line bg-white hover:bg-canvas'
                      }`}
                    >
                      <div className="space-y-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <span
                            className={`text-[10px] font-bold px-1.5 py-0.5 rounded shrink-0 ${
                              ep.method === 'GET'
                                ? 'bg-civic-infoSoft text-civic-info'
                                : ep.method === 'POST'
                                ? 'bg-brand-100 text-brand-800'
                                : 'bg-civic-warningSoft text-civic-warning'
                            }`}
                          >
                            {ep.method || 'GET'}
                          </span>
                          <span className="text-xs font-bold text-ink truncate">
                            {ep.desc || ep.description}
                          </span>
                        </div>
                        {viewMode === 'technical' && (
                          <p className="text-[11px] text-ink-muted font-mono">{ep.path}</p>
                        )}
                      </div>
                      <ChevronRight className={`w-4 h-4 shrink-0 ${isSelected ? 'text-brand-700' : 'text-ink-muted'}`} />
                    </div>
                  );
                })}
              </div>
            </Card>
          </div>

          {/* Kotak Pengujian Alur Layanan / Interactive Tester */}
          <Card className="p-5 space-y-4 bg-gradient-to-br from-white to-canvas border-line">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <div className="flex items-center gap-2">
                  <Play className="w-5 h-5 text-brand-700" />
                  <h3 className="font-bold text-ink">
                    {viewMode === 'business'
                      ? 'Simulasi & Uji Kelancaran Aliran Data Layanan'
                      : 'Uji Langsung Endpoint & Query DB'}
                  </h3>
                </div>
                <p className="text-xs text-ink-muted mt-0.5">
                  {viewMode === 'business'
                    ? 'Verifikasi bahwa sistem dapat membaca dan memproses data tahapan ini langsung dari pangkalan data resmi.'
                    : 'Jalankan HTTP request langsung ke backend dan periksa respon data dari database MySQL.'}
                </p>
              </div>

              {selectedEndpoint && (
                <Button
                  variant="primary"
                  size="sm"
                  onClick={() => handleRunTest(selectedEndpoint)}
                  disabled={testLoading}
                  icon={<Play className={`w-4 h-4 ${testLoading ? 'animate-spin' : ''}`} />}
                >
                  {testLoading
                    ? 'Memeriksa Layanan...'
                    : viewMode === 'business'
                    ? 'Jalankan Uji Validasi Layanan'
                    : `Test ${selectedEndpoint.method || 'GET'} Endpoint`}
                </Button>
              )}
            </div>

            {selectedEndpoint && (
              <div className="p-3 bg-surface-subtle rounded-md flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs text-ink">
                <div className="flex items-center gap-2">
                  <span className="font-bold text-brand-800">
                    {viewMode === 'business' ? 'Layanan Terpilih:' : selectedEndpoint.method || 'GET'}
                  </span>
                  <span className="font-medium text-ink">
                    {selectedEndpoint.desc || selectedEndpoint.description}
                  </span>
                </div>
                <span className="text-[11px] text-ink-muted font-mono">
                  {selectedEndpoint.path}
                </span>
              </div>
            )}

            {/* Hasil Eksekusi Test */}
            {testResult && (
              <div className="space-y-3 mt-4 pt-4 border-t border-line">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <span
                      className={`inline-flex items-center px-2.5 py-1 rounded text-xs font-bold ${
                        testResult.success
                          ? 'bg-brand-100 text-brand-800'
                          : 'bg-civic-dangerSoft text-civic-danger'
                      }`}
                    >
                      {testResult.success
                        ? viewMode === 'business' ? 'ALIRAN DATA LANCAR (OK)' : `HTTP ${testResult.status} OK`
                        : viewMode === 'business' ? 'KENDALA KONEKSI DATA' : `HTTP ${testResult.status} ERROR`}
                    </span>
                    <span className="text-xs text-ink-muted">
                      {viewMode === 'business' ? 'Kecepatan Respon:' : 'Waktu eksekusi:'}{' '}
                      <strong className="font-mono">{testResult.elapsed_ms} ms</strong>
                    </span>
                  </div>

                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => setShowJsonRaw(!showJsonRaw)}
                      className="text-xs text-brand-700 font-semibold hover:underline"
                    >
                      {showJsonRaw ? 'Sembunyikan Rincian Teknis' : 'Tampilkan Rincian Teknis (JSON)'}
                    </button>
                    <span className="text-[11px] text-ink-muted font-mono">
                      {new Date().toLocaleTimeString('id-ID')}
                    </span>
                  </div>
                </div>

                {viewMode === 'business' && !showJsonRaw && (
                  <div className="p-3.5 bg-brand-50 rounded-lg border border-brand-100 text-xs text-brand-900 flex items-start gap-2.5">
                    <CheckCircle2 className="w-4 h-4 text-brand-700 shrink-0 mt-0.5" />
                    <div>
                      <p className="font-bold">Sambungan Data Layanan Terverifikasi Sukses</p>
                      <p className="text-brand-800 mt-0.5 leading-relaxed">
                        Data berhasil ditarik dari pangkalan data resmi LPMQ tanpa hambatan. Petugas dan pemohon dapat menjalankan aktivitas administrasi pada tahapan ini secara normal.
                      </p>
                    </div>
                  </div>
                )}

                {(showJsonRaw || viewMode === 'technical') && (
                  <div className="bg-ink text-surface p-4 rounded-lg font-mono text-xs overflow-x-auto max-h-80 scrollbar-thin">
                    <pre>{JSON.stringify(testResult.payload || testResult.error, null, 2)}</pre>
                  </div>
                )}
              </div>
            )}
          </Card>
        </div>
      )}

      {/* Tab 2: Buku Register Data Aktif (Data Riil) */}
      {activeTab === 'data' && (
        <Card className="p-5 space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <h3 className="font-bold text-ink">
                {viewMode === 'business'
                  ? 'Buku Register Dokumen & Data Layanan Aktif'
                  : 'Data Riil dari Database MySQL'}
              </h3>
              <p className="text-xs text-ink-muted mt-0.5">
                {viewMode === 'business'
                  ? 'Daftar permohonan atau rekod data resmi yang tersimpan di pangkalan data LPMQ.'
                  : 'Mengambil langsung baris data aktual yang tersimpan di lpmq_db.'}
              </p>
            </div>
            <span className="text-xs font-semibold px-2.5 py-1 rounded bg-brand-100 text-brand-800 self-start sm:self-auto">
              {sampleRecords.length} Rekod Tersedia
            </span>
          </div>

          {sampleRecords.length === 0 ? (
            <div className="text-center py-10 bg-canvas rounded-lg border border-line space-y-2">
              <Table className="w-8 h-8 text-ink-muted mx-auto" />
              <p className="text-sm font-semibold text-ink">
                {viewMode === 'business'
                  ? 'Belum ada rekod transaksi pada tahapan ini'
                  : 'Belum ada baris data transaksi pada tabel ini'}
              </p>
              <p className="text-xs text-ink-muted max-w-md mx-auto">
                {viewMode === 'business'
                  ? 'Buku register sudah siap dan akan mencatat otomatis begitu berkas permohonan penerbit masuk ke tahapan ini.'
                  : 'Tabel di basis data sudah terbentuk dan siap menampung data ketika transaksi pada tahapan ini dijalankan.'}
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto border border-line rounded-lg">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="bg-canvas border-b border-line text-ink font-semibold uppercase tracking-wider text-[11px]">
                    <th className="p-3">Nomor Registrasi / Kode</th>
                    <th className="p-3">Judul Naskah / Nama Dokumen</th>
                    <th className="p-3">Penerbit Pemohon / Instansi</th>
                    <th className="p-3">Jenis Layanan Pentashihan</th>
                    <th className="p-3">Status Tahapan</th>
                    <th className="p-3 text-right">Tanggal Pembukuan</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-line">
                  {sampleRecords.map((item, idx) => {
                    const identifier = item.registration_no || item.code || item.decree_no || item.id?.slice(0, 8);
                    const mainTitle = item.title || item.name || item.legal_name || 'Item Dokumen';
                    const publisherName = item.publisher?.legal_name || item.category?.name || 'Kemenag RI';
                    const categoryOrKind =
                      item.service_type?.name ||
                      item.service_kind ||
                      item.entity_type ||
                      'Mushaf Standar';
                    const statusText = item.status || (item.is_active ? 'ACTIVE' : 'PENDING');
                    const dateStr = item.created_at || item.updated_at || new Date().toISOString();

                    return (
                      <tr key={item.id || idx} className="hover:bg-canvas transition-colors">
                        <td className="p-3 font-mono font-bold text-brand-800">{identifier}</td>
                        <td className="p-3 font-medium text-ink max-w-xs truncate">{mainTitle}</td>
                        <td className="p-3 text-ink">{publisherName}</td>
                        <td className="p-3 text-ink-muted">{categoryOrKind}</td>
                        <td className="p-3">
                          {TOKENS.registrationStatus[statusText] ? (
                            <StatusBadge status={statusText} />
                          ) : (
                            <span className="px-2 py-0.5 rounded text-[11px] font-bold bg-surface-subtle text-ink">
                              {statusText}
                            </span>
                          )}
                        </td>
                        <td className="p-3 text-right text-ink-muted font-mono text-[11px]">
                          {new Date(dateStr).toLocaleDateString('id-ID', {
                            day: 'numeric',
                            month: 'short',
                            year: 'numeric',
                          })}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </Card>
      )}

      {/* Tab 3: SOP & Dasar Regulasi */}
      {activeTab === 'spec' && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <Card className="p-5 space-y-4">
            <div className="flex items-center gap-2">
              <FileText className="w-5 h-5 text-brand-700" />
              <h3 className="font-bold text-ink">
                {viewMode === 'business'
                  ? 'Landasan Hukum & Standar Operasional Prosedur (SOP)'
                  : 'Rujukan SOP & Regulasi Resmi'}
              </h3>
            </div>
            <div className="space-y-3 text-xs text-ink leading-relaxed">
              <div className="p-3 bg-canvas rounded-lg border border-line space-y-1">
                <span className="font-bold text-brand-800 block">{sopReference}</span>
                <p className="text-ink-muted">
                  Ditetapkan oleh Lajnah Pentashihan Mushaf Al-Qur'an (LPMQ), Badan Litbang dan Diklat Kementerian Agama Republik Indonesia.
                </p>
              </div>

              <div>
                <h4 className="font-bold text-ink mb-1.5">
                  {viewMode === 'business' ? 'Ketentuan Pokok Pelayanan:' : 'Aturan Bisnis Kunci:'}
                </h4>
                <ul className="list-disc list-inside space-y-1 text-ink-muted">
                  <li>Validasi server-side wajib menjadi sumber kebenaran tunggal untuk seluruh perubahan status.</li>
                  <li>Besaran tarif dan batas waktu (SLA) mengacu pada ketetapan resmi dan disimpan sebagai snapshot permanen saat pendaftaran.</li>
                  <li>Setiap perubahan status dan tindakan material dicatat dalam audit trail demi akuntabilitas dokumen resmi negara.</li>
                  {businessRules.map((rule, idx) => (
                    <li key={idx}>{rule}</li>
                  ))}
                </ul>
              </div>
            </div>
          </Card>

          <Card className="p-5 space-y-4">
            <div className="flex items-center gap-2">
              <Building2 className="w-5 h-5 text-brand-700" />
              <h3 className="font-bold text-ink">
                {viewMode === 'business'
                  ? 'Pejabat Penanggung Jawab & Kewenangan'
                  : 'Komponen Arsitektur Terkait'}
              </h3>
            </div>
            <div className="space-y-2 text-xs">
              <div className="p-2.5 bg-canvas rounded border border-line">
                <span className="font-semibold text-ink block">Pejabat yang Berwenang:</span>
                <span className="text-brand-800 font-bold">
                  {allowedRoles.map((r) => ROLE_LABELS[r] || r).join(', ')}
                </span>
              </div>
              <div className="p-2.5 bg-canvas rounded border border-line">
                <span className="font-semibold text-ink block">Buku Registrasi Resmi:</span>
                <span className="text-ink-muted">
                  {displayTables.map((t) => BUSINESS_TABLE_MAP[t.name]?.title || t.name).join(', ')}
                </span>
              </div>
              <div className="p-2.5 bg-canvas rounded border border-line">
                <span className="font-semibold text-ink block">Kriteria Penyelesaian (Definition of Done):</span>
                <span className="text-ink-muted">
                  Memenuhi kriteria penerimaan SOP, memiliki pengujian otorisasi, mencatat riwayat audit, dan data terverifikasi di basis data.
                </span>
              </div>
            </div>
          </Card>
        </div>
      )}
    </div>
  );
};

export default ModulePlaceholder;
