import React, { useState, useEffect, useMemo } from 'react';
import { useAuth } from '@/features/auth/AuthContext';
import { Button } from '@/components/ui/Button';
import { StatusBadge } from '@/components/ui/StatusBadge';
import {
  CheckSquare,
  Users,
  Award,
  Filter,
  RefreshCw,
  AlertCircle,
  Clock,
  BookOpen,
  Send,
  Sliders,
  Sparkles,
  CreditCard,
  PlusCircle,
  Layers,
  Search,
  Building2,
  FileText,
  ShieldCheck,
  CheckCircle2,
} from 'lucide-react';
import { Link } from 'react-router-dom';
import { registrationApi } from '@/api/registration.api';
import { GreetingHeroCard } from '@/components/dashboard/GreetingHeroCard';
import { DailyQuranWidget } from '@/components/dashboard/DailyQuranWidget';

export const UnifiedDashboard = () => {
  const { currentUser } = useAuth();
  const userRoles = currentUser?.roles || (currentUser?.role ? [currentUser.role] : []);
  const isPublisher = userRoles.includes('ADMIN_PENERBIT') || currentUser?.role === 'ADMIN_PENERBIT';
  const isAdmin = userRoles.includes('SUPERADMIN') || currentUser?.role === 'SUPERADMIN';

  // Super Admin dapat melihat perspektif Operasional Internal atau Perspektif Layanan Penerbit
  const [adminViewMode, setAdminViewMode] = useState('OPERATIONAL'); // 'OPERATIONAL' | 'PUBLISHER'
  const [filterMyTasksOnly, setFilterMyTasksOnly] = useState(false);
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [searchQuery, setSearchQuery] = useState('');
  const [registrations, setRegistrations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const fetchRegistrations = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await registrationApi.listRegistrations({
        my_tasks: filterMyTasksOnly ? 'true' : undefined,
      });
      if (res?.data) {
        setRegistrations(res.data);
      }
    } catch (err) {
      setError(err.message || 'Gagal memuat antrean data dari server');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchRegistrations();
  }, [currentUser, filterMyTasksOnly]);

  // Kalkulasi Metrik Internal
  const countVerification = registrations.filter((r) =>
    ['READY_FOR_VERIFICATION', 'IN_VERIFICATION', 'WAITING_VERIFICATION_APPROVAL'].includes(r.status)
  ).length;

  const countTashih = registrations.filter((r) =>
    ['WAITING_DISTRIBUTION', 'TASHIH_IN_PROGRESS'].includes(r.status)
  ).length;

  const countSTT = registrations.filter((r) =>
    ['READY_FOR_STT', 'STT_ISSUED', 'DOCUMENTATION_IN_PROGRESS', 'COMPLETED'].includes(r.status)
  ).length;

  // Kalkulasi Metrik Penerbit / PNBP
  const inProgressCount = registrations.filter((r) =>
    ['READY_FOR_VERIFICATION', 'IN_VERIFICATION', 'WAITING_DISTRIBUTION', 'TASHIH_IN_PROGRESS'].includes(r.status)
  ).length;

  const completedCount = countSTT;

  const totalBilling = registrations.reduce((sum, r) => {
    const fee = r.fee_sla_snapshot?.base_fee || r.service_type?.base_fee || 0;
    return sum + Number(fee);
  }, 0);

  const formatRupiah = (val) =>
    new Intl.NumberFormat('id-ID', {
      style: 'currency',
      currency: 'IDR',
      minimumFractionDigits: 0,
    }).format(val);

  // Quick Actions disesuaikan dengan role
  const quickActions = useMemo(() => {
    if (isPublisher && !isAdmin) {
      return [
        {
          title: 'Ajukan Naskah Baru',
          desc: 'Pendaftaran naskah mushaf perdana ke LPMQ',
          icon: PlusCircle,
          path: '/publisher/new-registration',
          gradient: 'from-emerald-600 to-teal-600',
        },
        {
          title: 'Riwayat Pengajuan',
          desc: 'Pantau tahapan naskah & timeline status',
          icon: Layers,
          path: '/publisher/registrations',
          gradient: 'from-blue-600 to-cyan-600',
        },
        {
          title: 'Billing PNBP',
          desc: 'Informasi kode billing SIMPONI & bukti bayar',
          icon: CreditCard,
          path: '/publisher/billing',
          gradient: 'from-amber-500 to-yellow-600',
        },
        {
          title: 'Arsip Surat Tashih',
          desc: 'Unduh dokumen STT resmi bersertifikat QR',
          icon: Award,
          path: '/publisher/documents',
          gradient: 'from-teal-600 to-primary-700',
        },
      ];
    }

    const items = [
      {
        title: 'Verifikasi Berkas',
        desc: 'Pemeriksaan naskah & legalitas penerbit',
        icon: CheckSquare,
        path: '/internal/verifications',
        gradient: 'from-sky-500 to-blue-600',
        allowed: isAdmin || userRoles.includes('VERIFIKATOR'),
      },
      {
        title: 'Distribusi Sidang',
        desc: 'Penugasan berkas ke SK Tim Pentashih',
        icon: Send,
        path: '/internal/distributions',
        gradient: 'from-emerald-500 to-teal-600',
        allowed: isAdmin || userRoles.includes('DISTRIBUTOR'),
      },
      {
        title: 'Sidang Pentashihan',
        desc: 'Pencatatan koreksi lafaz, rasm, & waqaf',
        icon: BookOpen,
        path: '/internal/tashih',
        gradient: 'from-teal-600 to-emerald-700',
        allowed: isAdmin || userRoles.includes('PENTASHIH'),
      },
      {
        title: 'Penetapan STT',
        desc: 'Berita acara sidang & pengesahan dokumen',
        icon: Award,
        path: '/internal/documents',
        gradient: 'from-amber-500 to-yellow-600',
        allowed: isAdmin || userRoles.includes('DOKUMENTATOR') || userRoles.includes('KEPALA_LPMQ'),
      },
      {
        title: 'Master Data Layanan',
        desc: 'Kelola kategori, jenis tarif, & addon',
        icon: Sliders,
        path: '/internal/settings',
        gradient: 'from-indigo-500 to-purple-600',
        allowed: isAdmin,
      },
    ];

    return items.filter((item) => item.allowed);
  }, [isPublisher, isAdmin, userRoles]);

  // Filter tabel
  const filteredRegistrations = useMemo(() => {
    return registrations.filter((item) => {
      // Filter status
      if (statusFilter === 'VERIFICATION') {
        if (!['READY_FOR_VERIFICATION', 'IN_VERIFICATION', 'WAITING_VERIFICATION_APPROVAL'].includes(item.status)) {
          return false;
        }
      } else if (statusFilter === 'TASHIH') {
        if (!['WAITING_DISTRIBUTION', 'TASHIH_IN_PROGRESS'].includes(item.status)) {
          return false;
        }
      } else if (statusFilter === 'COMPLETED') {
        if (!['READY_FOR_STT', 'STT_ISSUED', 'DOCUMENTATION_IN_PROGRESS', 'COMPLETED'].includes(item.status)) {
          return false;
        }
      }

      // Filter teks pencarian
      if (searchQuery.trim()) {
        const query = searchQuery.toLowerCase();
        const no = (item.registration_no || item.registrationNumber || '').toLowerCase();
        const title = (item.title || item.mushafTitle || '').toLowerCase();
        const pub = (item.publisher?.legal_name || item.publisherName || '').toLowerCase();
        if (!no.includes(query) && !title.includes(query) && !pub.includes(query)) {
          return false;
        }
      }

      return true;
    });
  }, [registrations, statusFilter, searchQuery]);

  // Label nama dan role pengguna untuk Greeting Card
  const greetingUserName = currentUser?.publisherName || currentUser?.name || 'Pengguna Terdaftar';
  const greetingRoleLabel = isPublisher
    ? 'Penerbit Mushaf Terdaftar'
    : isAdmin
    ? 'Super Administrator Sistem LPMQ'
    : `Petugas LPMQ — ${currentUser?.role || 'Staff'}`;
  const greetingExtra = isPublisher
    ? (currentUser?.publisherId ? `ID: ${currentUser.publisherId.slice(0, 8)}` : 'Verifikasi Kemenag')
    : (currentUser?.nip ? `NIP: ${currentUser.nip}` : 'LPMQ Kemenag RI');

  const showOperationalCards = !isPublisher || (isAdmin && adminViewMode === 'OPERATIONAL');

  return (
    <div className="space-y-6">
      {/* 1. Greeting Hero Card (Sesuai Mockup ldksyahid-app) */}
      <GreetingHeroCard
        userName={greetingUserName}
        roleLabel={greetingRoleLabel}
        badgeExtra={greetingExtra}
        subtext={
          isPublisher
            ? 'Layanan Mandiri Pendaftaran, Pemantauan Pentashihan, dan Pengunduhan Dokumen STT Resmi LPMQ Kemenag RI'
            : 'Sistem Terpadu Pentashihan Mushaf Al-Qur\'an, Verifikasi Dokumen, dan Pengesahan Surat Tanda Tashih'
        }
      />

      {/* 2. Daily Hadith & Al-Qur'an Widget (Sesuai Mockup ldksyahid-app) */}
      <DailyQuranWidget />

      {/* 3. Quick Actions Bar (Pintasan Aksi Cepat) */}
      <div className="bg-white rounded-2xl border border-neutral-200/80 p-5 shadow-sm">
        <div className="flex items-center justify-between mb-3.5">
          <h3 className="text-xs sm:text-sm font-bold uppercase tracking-wider text-neutral-700 flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-gold-500" />
            <span>Pintasan Aksi Cepat (Quick Actions)</span>
          </h3>
          <span className="text-[11px] text-neutral-400">
            {isPublisher ? 'Menu layanan penerbit' : 'Sesuai wewenang tugas operasional Anda'}
          </span>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
          {quickActions.map((action, idx) => {
            const Icon = action.icon;
            return (
              <Link
                key={idx}
                to={action.path}
                className="group p-3 rounded-xl border border-neutral-200/70 hover:border-teal-400 hover:bg-teal-50/30 active:scale-[0.98] transition-all flex flex-col justify-between shadow-xs hover:shadow-sm"
              >
                <div className="flex items-center gap-2.5 mb-2">
                  <div className={`w-8 h-8 rounded-lg bg-gradient-to-br ${action.gradient} text-white flex items-center justify-center shadow-xs flex-shrink-0 group-hover:scale-105 transition-transform`}>
                    <Icon className="w-4 h-4" />
                  </div>
                  <div className="text-xs font-bold text-neutral-800 group-hover:text-teal-800 line-clamp-1">
                    {action.title}
                  </div>
                </div>
                <div className="text-[11px] text-neutral-400 group-hover:text-neutral-600 line-clamp-2 leading-snug">
                  {action.desc}
                </div>
              </Link>
            );
          })}
        </div>
      </div>

      {/* 4. Statistics Overview Section (Harmonisasi Warna & Role-Based) */}
      <div>
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-3.5">
          <div className="flex items-center gap-2">
            <Clock className="w-4 h-4 text-teal-600" />
            <h3 className="text-sm font-bold text-neutral-800">
              Ringkasan Data & Beban Kerja Sistem
            </h3>
          </div>

          <div className="flex items-center gap-2">
            {/* Super Admin Perspective Switcher */}
            {isAdmin && (
              <div className="inline-flex items-center p-1 rounded-xl bg-neutral-100 border border-neutral-200 text-xs font-semibold">
                <button
                  type="button"
                  onClick={() => setAdminViewMode('OPERATIONAL')}
                  className={`px-3 py-1 rounded-lg transition-all cursor-pointer ${
                    adminViewMode === 'OPERATIONAL'
                      ? 'bg-white text-teal-800 shadow-xs font-bold'
                      : 'text-neutral-600 hover:text-neutral-900'
                  }`}
                >
                  Alur Sidang Internal
                </button>
                <button
                  type="button"
                  onClick={() => setAdminViewMode('PUBLISHER')}
                  className={`px-3 py-1 rounded-lg transition-all cursor-pointer ${
                    adminViewMode === 'PUBLISHER'
                      ? 'bg-white text-teal-800 shadow-xs font-bold'
                      : 'text-neutral-600 hover:text-neutral-900'
                  }`}
                >
                  Layanan Penerbit & PNBP
                </button>
              </div>
            )}

            <Button
              variant="outline"
              size="sm"
              onClick={fetchRegistrations}
              disabled={loading}
              icon={<RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />}
            >
              Segarkan
            </Button>
          </div>
        </div>

        {/* Grid Kartu Metrik dengan Desain Warna & Sentuhan ldksyahid-app */}
        {showOperationalCards ? (
          /* Kartu Perspektif Operasional Internal */
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {/* Card 1: Verifikasi Berkas */}
            <div className="bg-white rounded-2xl border border-sky-100 p-4 shadow-sm hover:-translate-y-1 hover:shadow-md transition-all duration-200 bg-gradient-to-br from-white to-sky-50/40">
              <div className="flex items-center justify-between">
                <div className="w-11 h-11 rounded-xl bg-sky-100 text-sky-700 flex items-center justify-center">
                  <CheckSquare className="w-5 h-5" />
                </div>
                <span className="text-[11px] font-bold px-2.5 py-0.5 rounded-full bg-sky-100 text-sky-800">
                  Tahap 1
                </span>
              </div>
              <div className="mt-3">
                <div className="text-2xl sm:text-3xl font-extrabold text-neutral-900 tabular-nums">
                  {countVerification}
                </div>
                <div className="text-xs font-semibold text-neutral-700 mt-1">Verifikasi Berkas</div>
                <div className="text-[11px] text-neutral-400 mt-0.5">Pemeriksaan naskah & kelengkapan</div>
              </div>
            </div>

            {/* Card 2: Sidang Pentashihan */}
            <div className="bg-white rounded-2xl border border-teal-100 p-4 shadow-sm hover:-translate-y-1 hover:shadow-md transition-all duration-200 bg-gradient-to-br from-white to-teal-50/40">
              <div className="flex items-center justify-between">
                <div className="w-11 h-11 rounded-xl bg-teal-100 text-teal-700 flex items-center justify-center">
                  <BookOpen className="w-5 h-5" />
                </div>
                <span className="text-[11px] font-bold px-2.5 py-0.5 rounded-full bg-teal-100 text-teal-800">
                  Tahap 2
                </span>
              </div>
              <div className="mt-3">
                <div className="text-2xl sm:text-3xl font-extrabold text-neutral-900 tabular-nums">
                  {countTashih}
                </div>
                <div className="text-xs font-semibold text-neutral-700 mt-1">Sidang Pentashihan</div>
                <div className="text-[11px] text-neutral-400 mt-0.5">Telaah lafaz & rasm usmani</div>
              </div>
            </div>

            {/* Card 3: Penetapan STT */}
            <div className="bg-white rounded-2xl border border-amber-100 p-4 shadow-sm hover:-translate-y-1 hover:shadow-md transition-all duration-200 bg-gradient-to-br from-white to-amber-50/40">
              <div className="flex items-center justify-between">
                <div className="w-11 h-11 rounded-xl bg-amber-100 text-amber-700 flex items-center justify-center">
                  <Award className="w-5 h-5" />
                </div>
                <span className="text-[11px] font-bold px-2.5 py-0.5 rounded-full bg-amber-100 text-amber-800">
                  Tahap 3
                </span>
              </div>
              <div className="mt-3">
                <div className="text-2xl sm:text-3xl font-extrabold text-neutral-900 tabular-nums">
                  {countSTT}
                </div>
                <div className="text-xs font-semibold text-neutral-700 mt-1">Penetapan Dokumen STT</div>
                <div className="text-[11px] text-neutral-400 mt-0.5">Berita acara & tanda tashih sah</div>
              </div>
            </div>

            {/* Card 4: Total Naskah */}
            <div className="bg-white rounded-2xl border border-emerald-100 p-4 shadow-sm hover:-translate-y-1 hover:shadow-md transition-all duration-200 bg-gradient-to-br from-white to-emerald-50/40">
              <div className="flex items-center justify-between">
                <div className="w-11 h-11 rounded-xl bg-emerald-100 text-emerald-700 flex items-center justify-center">
                  <Users className="w-5 h-5" />
                </div>
                <span className="text-[11px] font-bold px-2.5 py-0.5 rounded-full bg-emerald-100 text-emerald-800">
                  Total
                </span>
              </div>
              <div className="mt-3">
                <div className="text-2xl sm:text-3xl font-extrabold text-neutral-900 tabular-nums">
                  {registrations.length}
                </div>
                <div className="text-xs font-semibold text-neutral-700 mt-1">Total Naskah Masuk</div>
                <div className="text-[11px] text-neutral-400 mt-0.5">Seluruh berkas dalam antrean</div>
              </div>
            </div>
          </div>
        ) : (
          /* Kartu Perspektif Layanan Penerbit & PNBP */
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {/* Card 1: Billing PNBP */}
            <div className="bg-white rounded-2xl border border-amber-200/80 p-4 shadow-sm hover:-translate-y-1 hover:shadow-md transition-all duration-200 bg-gradient-to-br from-white to-amber-50/40">
              <div className="flex items-center justify-between">
                <div className="w-11 h-11 rounded-xl bg-amber-100 text-amber-700 flex items-center justify-center">
                  <CreditCard className="w-5 h-5" />
                </div>
                <span className="text-[11px] font-bold px-2.5 py-0.5 rounded-full bg-amber-100 text-amber-800">
                  SIMPONI
                </span>
              </div>
              <div className="mt-3">
                <div className="text-xl sm:text-2xl font-extrabold text-neutral-900 tabular-nums">
                  {formatRupiah(totalBilling)}
                </div>
                <div className="text-xs font-semibold text-neutral-700 mt-1">Billing PNBP Terdaftar</div>
                <div className="text-[11px] text-neutral-400 mt-0.5">Total tarif naskah resmi</div>
              </div>
            </div>

            {/* Card 2: Sedang Diproses */}
            <div className="bg-white rounded-2xl border border-teal-100 p-4 shadow-sm hover:-translate-y-1 hover:shadow-md transition-all duration-200 bg-gradient-to-br from-white to-teal-50/40">
              <div className="flex items-center justify-between">
                <div className="w-11 h-11 rounded-xl bg-teal-100 text-teal-700 flex items-center justify-center">
                  <Clock className="w-5 h-5" />
                </div>
                <span className="text-[11px] font-bold px-2.5 py-0.5 rounded-full bg-teal-100 text-teal-800">
                  Diproses
                </span>
              </div>
              <div className="mt-3">
                <div className="text-2xl sm:text-3xl font-extrabold text-neutral-900 tabular-nums">
                  {inProgressCount}
                </div>
                <div className="text-xs font-semibold text-neutral-700 mt-1">Sedang Ditashih</div>
                <div className="text-[11px] text-neutral-400 mt-0.5">Dalam verifikasi & sidang</div>
              </div>
            </div>

            {/* Card 3: STT Terbit */}
            <div className="bg-white rounded-2xl border border-emerald-100 p-4 shadow-sm hover:-translate-y-1 hover:shadow-md transition-all duration-200 bg-gradient-to-br from-white to-emerald-50/40">
              <div className="flex items-center justify-between">
                <div className="w-11 h-11 rounded-xl bg-emerald-100 text-emerald-700 flex items-center justify-center">
                  <CheckCircle2 className="w-5 h-5" />
                </div>
                <span className="text-[11px] font-bold px-2.5 py-0.5 rounded-full bg-emerald-100 text-emerald-800">
                  Selesai
                </span>
              </div>
              <div className="mt-3">
                <div className="text-2xl sm:text-3xl font-extrabold text-neutral-900 tabular-nums">
                  {completedCount}
                </div>
                <div className="text-xs font-semibold text-neutral-700 mt-1">Surat Tashih Terbit</div>
                <div className="text-[11px] text-neutral-400 mt-0.5">Dokumen sah bersertifikat</div>
              </div>
            </div>

            {/* Card 4: Total Pengajuan */}
            <div className="bg-white rounded-2xl border border-sky-100 p-4 shadow-sm hover:-translate-y-1 hover:shadow-md transition-all duration-200 bg-gradient-to-br from-white to-sky-50/40">
              <div className="flex items-center justify-between">
                <div className="w-11 h-11 rounded-xl bg-sky-100 text-sky-700 flex items-center justify-center">
                  <FileText className="w-5 h-5" />
                </div>
                <span className="text-[11px] font-bold px-2.5 py-0.5 rounded-full bg-sky-100 text-sky-800">
                  Naskah
                </span>
              </div>
              <div className="mt-3">
                <div className="text-2xl sm:text-3xl font-extrabold text-neutral-900 tabular-nums">
                  {registrations.length}
                </div>
                <div className="text-xs font-semibold text-neutral-700 mt-1">Total Pengajuan</div>
                <div className="text-[11px] text-neutral-400 mt-0.5">Semua riwayat pengajuan</div>
              </div>
            </div>
          </div>
        )}
      </div>

      {error && (
        <div className="p-4 rounded-xl bg-rose-50 border border-rose-200 text-status-danger text-sm flex items-start gap-2.5">
          <AlertCircle className="w-5 h-5 flex-shrink-0 mt-0.5" />
          <div>
            <span className="font-semibold">Info Koneksi API: </span>
            {error}
          </div>
        </div>
      )}

      {/* 5. Tabel Antrean & Riwayat Pengajuan Naskah */}
      <div className="bg-white rounded-2xl border border-neutral-200/80 shadow-sm overflow-hidden">
        {/* Header & Filter Controls */}
        <div className="p-4 sm:p-5 border-b border-neutral-200/80 space-y-3">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3">
            <div>
              <h3 className="text-sm font-bold text-neutral-900">
                {isPublisher
                  ? 'Daftar Pengajuan Mushaf Terbaru'
                  : 'Antrean Naskah Pentashihan Masuk'}
              </h3>
              <p className="text-xs text-neutral-500 mt-0.5">
                Sinkronisasi real-time dengan Basis Data LPMQ ({registrations.length} Naskah Terdaftar)
              </p>
            </div>

            {/* Search Input */}
            <div className="relative min-w-[240px]">
              <Search className="w-4 h-4 text-neutral-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Cari nomor, judul, penerbit..."
                className="w-full pl-9 pr-3 py-1.5 text-xs bg-neutral-50 border border-neutral-200 rounded-xl outline-none focus:bg-white focus:ring-2 focus:ring-teal-500 transition-all text-neutral-800"
              />
            </div>
          </div>

          {/* Filter Status Buttons */}
          <div className="flex flex-wrap items-center justify-between gap-2 pt-2 border-t border-neutral-100">
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-xs font-bold text-neutral-500 uppercase tracking-wider mr-1 flex items-center gap-1.5">
                <Filter className="w-3.5 h-3.5" />
                Filter:
              </span>
              <button
                onClick={() => setStatusFilter('ALL')}
                className={`px-3 py-1.5 text-xs font-semibold rounded-xl transition-all cursor-pointer ${
                  statusFilter === 'ALL'
                    ? 'bg-primary-700 text-white shadow-xs'
                    : 'bg-neutral-100 text-neutral-600 hover:bg-neutral-200'
                }`}
              >
                Semua ({registrations.length})
              </button>
              <button
                onClick={() => setStatusFilter('VERIFICATION')}
                className={`px-3 py-1.5 text-xs font-semibold rounded-xl transition-all cursor-pointer ${
                  statusFilter === 'VERIFICATION'
                    ? 'bg-primary-700 text-white shadow-xs'
                    : 'bg-neutral-100 text-neutral-600 hover:bg-neutral-200'
                }`}
              >
                Verifikasi ({countVerification})
              </button>
              <button
                onClick={() => setStatusFilter('TASHIH')}
                className={`px-3 py-1.5 text-xs font-semibold rounded-xl transition-all cursor-pointer ${
                  statusFilter === 'TASHIH'
                    ? 'bg-primary-700 text-white shadow-xs'
                    : 'bg-neutral-100 text-neutral-600 hover:bg-neutral-200'
                }`}
              >
                Sidang Tashih ({countTashih})
              </button>
              <button
                onClick={() => setStatusFilter('COMPLETED')}
                className={`px-3 py-1.5 text-xs font-semibold rounded-xl transition-all cursor-pointer ${
                  statusFilter === 'COMPLETED'
                    ? 'bg-primary-700 text-white shadow-xs'
                    : 'bg-neutral-100 text-neutral-600 hover:bg-neutral-200'
                }`}
              >
                STT Terbit ({countSTT})
              </button>
            </div>

            {!isPublisher && (
              <button
                onClick={() => setFilterMyTasksOnly(!filterMyTasksOnly)}
                className={`px-3 py-1.5 text-xs font-semibold rounded-xl border transition-all cursor-pointer ${
                  filterMyTasksOnly
                    ? 'bg-gold-500 text-white border-gold-600 shadow-xs'
                    : 'bg-white text-neutral-700 border-neutral-300 hover:bg-neutral-50'
                }`}
              >
                {filterMyTasksOnly ? '✓ Tugas Saya Saja' : 'Semua Penugasan'}
              </button>
            )}
          </div>
        </div>

        {/* Tabel Data */}
        {loading ? (
          <div className="py-16 text-center text-neutral-500">
            <RefreshCw className="w-7 h-7 animate-spin mx-auto mb-2 text-primary-700" />
            <p className="text-xs font-medium">Memuat data naskah pentashihan...</p>
          </div>
        ) : filteredRegistrations.length === 0 ? (
          <div className="py-16 text-center text-neutral-500 max-w-sm mx-auto">
            <div className="w-12 h-12 rounded-full bg-neutral-100 text-neutral-400 flex items-center justify-center mx-auto mb-2.5">
              <CheckSquare className="w-6 h-6" />
            </div>
            <p className="text-sm font-bold text-neutral-800">Tidak ada data naskah</p>
            <p className="text-xs text-neutral-500 mt-1">
              {searchQuery
                ? `Tidak ditemukan hasil untuk "${searchQuery}"`
                : 'Belum ada antrean naskah pada kriteria filter ini.'}
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse min-w-[760px]">
              <thead>
                <tr className="bg-neutral-50/80 text-neutral-600 text-[11px] font-bold uppercase tracking-wider border-b border-neutral-200">
                  <th className="py-3 px-6">Nomor & Tanggal</th>
                  <th className="py-3 px-6">Penerbit & Judul Naskah</th>
                  <th className="py-3 px-6">Profil Layanan</th>
                  <th className="py-3 px-6">Status Sistem</th>
                  <th className="py-3 px-6 text-right">Aksi</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-neutral-100 text-sm">
                {filteredRegistrations.map((item) => (
                  <tr key={item.id} className="hover:bg-teal-50/30 transition-colors">
                    <td className="py-3.5 px-6">
                      <span className="font-mono text-xs font-bold text-neutral-900 block">
                        {item.registration_no || item.registrationNumber}
                      </span>
                      <span className="text-[11px] text-neutral-400">
                        {new Date(item.created_at || item.submittedAt).toLocaleDateString('id-ID', {
                          day: 'numeric',
                          month: 'short',
                          year: 'numeric',
                        })}
                      </span>
                    </td>
                    <td className="py-3.5 px-6">
                      <span className="font-semibold text-neutral-900 block line-clamp-1">
                        {item.title || item.mushafTitle}
                      </span>
                      <span className="text-xs text-teal-700 font-medium block">
                        {item.publisher?.legal_name || item.publisherName || 'Penerbit Terdaftar'}
                      </span>
                    </td>
                    <td className="py-3.5 px-6 text-xs text-neutral-600">
                      <span className="font-medium text-neutral-800 block">
                        {item.service_type?.name || item.serviceType || 'Tashih Reguler'}
                      </span>
                      <span className="text-[11px] text-neutral-400">
                        {item.service_type?.category?.name || 'Mushaf Cetak'}
                      </span>
                    </td>
                    <td className="py-3.5 px-6">
                      <StatusBadge status={item.status} />
                    </td>
                    <td className="py-3.5 px-6 text-right">
                      <Button variant="outline" size="sm">
                        Buka Berkas
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};

export default UnifiedDashboard;

