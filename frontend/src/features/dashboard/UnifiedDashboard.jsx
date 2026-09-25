import React, { useState, useEffect, useMemo, useRef } from 'react';
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
  Compass,
  CreditCard,
  PlusCircle,
  Layers,
  Search,
  Building2,
  FileText,
  ShieldCheck,
  CheckCircle2,
  Activity,
  TrendingUp,
  AlertTriangle,
  UserCheck,
  PackageCheck,
} from 'lucide-react';
import { Link } from 'react-router-dom';
import { registrationApi } from '@/api/registration.api';
import { reportApi } from '@/api/report.api';
import { GreetingHeroCard } from '@/components/dashboard/GreetingHeroCard';
import { DailyQuranWidget } from '@/components/dashboard/DailyQuranWidget';
import { QueueOverview, QueueItemMeta, QueuePagination } from '@/components/common/QueueOverview';
import { RegistrationDetailDialog } from '@/components/common/RegistrationDetailDialog';
import { ManualTeamAssignmentDialog } from '@/features/distribution/ManualTeamAssignmentDialog';
import { AssignVerificationDialog } from '@/features/verification/AssignVerificationDialog';

export const UnifiedDashboard = () => {
  const { currentUser } = useAuth();
  const userRoles = currentUser?.roles || (currentUser?.role ? [currentUser.role] : []);
  const isPublisher = userRoles.includes('ADMIN_PENERBIT') || currentUser?.role === 'ADMIN_PENERBIT';
  const isSuperAdmin = userRoles.includes('SUPERADMIN') || currentUser?.role === 'SUPERADMIN';
  const isAdmin = userRoles.includes('HELPER_ADMIN') || currentUser?.role === 'HELPER_ADMIN' || isSuperAdmin;
  const isKepala = userRoles.includes('KEPALA_LPMQ') || currentUser?.role === 'KEPALA_LPMQ';

  // Super Admin dapat melihat perspektif Operasional Internal atau Perspektif Layanan Penerbit
  const [adminViewMode, setAdminViewMode] = useState('OPERATIONAL'); // 'OPERATIONAL' | 'PUBLISHER'
  const [filterMyTasksOnly, setFilterMyTasksOnly] = useState(false);
  const [statusFilter, setStatusFilter] = useState(isPublisher && !isAdmin ? 'ALL' : 'ACTIVE');
  const [searchQuery, setSearchQuery] = useState('');
  const [registrations, setRegistrations] = useState([]);
  const [performanceReport, setPerformanceReport] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [page, setPage] = useState(1);
  const [pagination, setPagination] = useState({ total: 0, page: 1, limit: 20, totalPages: 0 });
  const [counts, setCounts] = useState(null);
  const requestId = useRef(0);
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [detailId, setDetailId] = useState(null);
  const [assignmentId, setAssignmentId] = useState(null);
  const [assignmentSuccess, setAssignmentSuccess] = useState('');
  const [verificationAssignReg, setVerificationAssignReg] = useState(null);
  const canAssignTeam = isAdmin;
  const canAssignVerification = isAdmin;

  useEffect(() => {
    const timer = setTimeout(() => { setDebouncedSearch(searchQuery.trim()); setPage(1); }, 300);
    return () => clearTimeout(timer);
  }, [searchQuery]);

  const changeStatusFilter = value => { setStatusFilter(value); setPage(1); };

  const fetchRegistrations = async () => {
    const request = ++requestId.current;
    setLoading(true);
    setError(null);
    try {
      const res = await registrationApi.listRegistrations({
        my_tasks: filterMyTasksOnly ? 'true' : undefined,
        page,
        limit: 20,
        search: debouncedSearch || undefined,
        segment: ['VERIFICATION', 'TASHIH', 'COMPLETED'].includes(statusFilter) ? statusFilter : undefined,
        queue_only: statusFilter === 'ACTIVE' ? 'true' : undefined,
      });
      if (request !== requestId.current) return;
      if (res?.data) {
        setRegistrations(res.data);
        setPagination(res.pagination || { total: res.data.length, page, limit: 20, totalPages: 1 });
        setCounts(res.summary?.by_status || null);
      }
    } catch (err) {
      if (request === requestId.current) setError(err.message || 'Gagal memuat antrean data dari server');
    } finally {
      if (request === requestId.current) setLoading(false);
    }
  };

  useEffect(() => {
    fetchRegistrations();
    return () => { requestId.current += 1; };
  }, [currentUser, filterMyTasksOnly, page, statusFilter, debouncedSearch]);

  useEffect(() => {
    if (!isPublisher) {
      reportApi
        .getVerificationPerformance()
        .then((res) => {
          if (res?.data) {
            setPerformanceReport(res.data);
          }
        })
        .catch(() => {
          // Metrik non-kritis, diamkan agar tidak mengganggu tabel utama
        });
    }
  }, [currentUser, isPublisher]);

  // Kalkulasi Metrik Internal
  const countStatuses = statuses => counts
    ? statuses.reduce((sum, status) => sum + (counts[status] || 0), 0)
    : registrations.filter(item => statuses.includes(item.status)).length;
  const countVerification = countStatuses(['READY_FOR_VERIFICATION', 'VERIFICATION_ASSIGNED', 'IN_VERIFICATION', 'WAITING_VERIFICATION_APPROVAL', 'VERIFICATION_APPROVED']);

  const countTashih = countStatuses(['WAITING_DISTRIBUTOR_RECEIPT', 'WAITING_DISTRIBUTION', 'TASHIH_IN_PROGRESS']);

  const countSTT = countStatuses(['STT_ISSUED', 'DOCUMENTATION_IN_PROGRESS', 'COMPLETED']);

  // Kalkulasi Metrik Penerbit / PNBP
  const inProgressCount = countStatuses(['READY_FOR_VERIFICATION', 'VERIFICATION_ASSIGNED', 'IN_VERIFICATION', 'WAITING_DISTRIBUTOR_RECEIPT', 'WAITING_DISTRIBUTION', 'TASHIH_IN_PROGRESS']);

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
          desc: 'Inisiasi registrasi dan pengiriman dokumen naskah',
          icon: PlusCircle,
          path: '/publisher/new-registration',
          iconBg: 'bg-gradient-to-br from-brand-700 to-brand-700 text-white shadow-xs',
          cardHover: 'hover:border-brand-700 hover:bg-brand-50/40',
        },
        {
          title: 'Portofolio Pengajuan',
          desc: 'Pantau tahapan proses dan rekam jejak status',
          icon: Layers,
          path: '/publisher/registrations',
          iconBg: 'bg-gradient-to-br from-civic-info to-civic-info text-white shadow-xs',
          cardHover: 'hover:border-civic-infoLine hover:bg-civic-infoSoft/40',
        },
        {
          title: 'Tagihan PNBP',
          desc: 'Kelola kode billing SIMPONI dan bukti pembayaran',
          icon: CreditCard,
          path: '/publisher/billing',
          iconBg: 'bg-gradient-to-br from-civic-warning to-civic-warning text-white shadow-xs',
          cardHover: 'hover:border-civic-warningLine hover:bg-civic-warningSoft/40',
        },
        {
          title: 'Arsip Surat Tashih',
          desc: 'Akses dokumen STT resmi dengan validasi QR',
          icon: Award,
          path: '/publisher/documents',
          iconBg: 'bg-gradient-to-br from-civic-info to-civic-info text-white shadow-xs',
          cardHover: 'hover:border-civic-infoLine hover:bg-civic-infoSoft/40',
        },
      ];
    }

    const items = [
      {
        title: 'Loket Intake Master Fisik',
        desc: 'Penerimaan dan verifikasi master fisik A4 per juz',
        icon: PackageCheck,
        path: '/internal/master-intake',
        iconBg: 'bg-gradient-to-br from-civic-warning to-civic-warning text-white shadow-xs',
        cardHover: 'hover:border-civic-warningLine hover:bg-civic-warningSoft/40',
        allowed: isAdmin || isSuperAdmin || isKepala,
      },
      {
        title: 'Penugasan Tim',
        desc: 'Tetapkan tim pentashih pada naskah yang siap distribusi',
        icon: Users,
        path: '/internal#antrean-tim',
        iconBg: 'bg-brand-700 text-white',
        cardHover: 'hover:border-brand-700 hover:bg-brand-50/40',
        allowed: canAssignTeam,
      },
      {
        title: isKepala ? 'Persetujuan Verifikasi' : 'Verifikasi Berkas',
        desc: isKepala ? 'Nota dinas penugasan & persetujuan draf surat' : 'Pemeriksaan naskah & legalitas penerbit',
        icon: CheckSquare,
        path: '/internal/verifications',
        iconBg: 'bg-gradient-to-br from-civic-info to-civic-info text-white shadow-xs',
        cardHover: 'hover:border-civic-infoLine hover:bg-civic-infoSoft/40',
        allowed: isSuperAdmin || userRoles.includes('VERIFIKATOR') || isKepala,
      },
      {
        title: 'Distribusi Sidang',
        desc: 'Penugasan berkas ke SK Tim Pentashih & serah terima fisik',
        icon: Send,
        path: '/internal/distributions',
        iconBg: 'bg-gradient-to-br from-brand-700 to-brand-700 text-white shadow-xs',
        cardHover: 'hover:border-brand-700 hover:bg-brand-50/40',
        allowed: isSuperAdmin || userRoles.includes('DISTRIBUTOR') || userRoles.includes('VERIFIKATOR') || isKepala,
      },
      {
        title: 'Sidang Pentashihan',
        desc: 'Pencatatan koreksi lafaz, rasm, & waqaf',
        icon: BookOpen,
        path: '/internal/tashih',
        iconBg: 'bg-gradient-to-br from-civic-warning to-civic-warning text-white shadow-xs',
        cardHover: 'hover:border-civic-warningLine hover:bg-civic-warningSoft/40',
        allowed: isSuperAdmin || userRoles.includes('PENTASHIH'),
      },
      {
        title: 'Penetapan STT',
        desc: 'Berita acara sidang & pengesahan dokumen',
        icon: Award,
        path: '/internal/documents',
        iconBg: 'bg-gradient-to-br from-civic-warning to-civic-warning text-white shadow-xs',
        cardHover: 'hover:border-civic-warningLine hover:bg-civic-warningSoft/40',
        allowed: isSuperAdmin || userRoles.includes('DOKUMENTATOR') || userRoles.includes('KEPALA_LPMQ'),
      },
      {
        title: 'Master Data Layanan',
        desc: 'Kelola kategori, tarif, SLA, dan parameter layanan',
        icon: Sliders,
        path: '/internal/settings',
        iconBg: 'bg-gradient-to-br from-ink to-civic-info text-white shadow-xs',
        cardHover: 'hover:border-civic-infoLine hover:bg-civic-infoSoft/40',
        allowed: isSuperAdmin,
      },
      {
        title: 'Identitas dan Akses',
        desc: 'Kelola akun, peran, dan matriks kewenangan',
        icon: Users,
        path: '/internal/users',
        iconBg: 'bg-gradient-to-br from-brand-700 to-brand-800 text-white shadow-xs',
        cardHover: 'hover:border-brand-700 hover:bg-brand-50/40',
        allowed: isSuperAdmin,
      },
    ];

    return items.filter((item) => item.allowed);
  }, [isPublisher, isAdmin, userRoles]);

  // Filtering happens before server pagination, so older tasks remain searchable.
  const filteredRegistrations = registrations;

  // Label nama dan role pengguna untuk Greeting Card
  const greetingUserName = currentUser?.publisherName || currentUser?.name || 'Pengguna Terdaftar';
  const greetingRoleLabel = isPublisher
    ? 'Penerbit Mushaf Terdaftar'
    : isSuperAdmin
    ? 'Super Administrator Sistem LPMQ'
    : (userRoles.includes('HELPER_ADMIN') || currentUser?.role === 'HELPER_ADMIN')
    ? 'Helper Admin LPMQ'
    : `Petugas LPMQ — ${currentUser?.role || 'Staff'}`;
  const greetingExtra = isPublisher
    ? (currentUser?.publisherId ? `ID: ${currentUser.publisherId.slice(0, 8)}` : 'Verifikasi Kemenag')
    : (currentUser?.nip ? `NIP: ${currentUser.nip}` : 'LPMQ Kemenag RI');

  const showOperationalCards = !isPublisher || (isSuperAdmin && adminViewMode === 'OPERATIONAL');

  return (
    <div className="space-y-6">
      {/* 1. Greeting Hero Card */}
      <GreetingHeroCard
        userName={greetingUserName}
        roleLabel={greetingRoleLabel}
        badgeExtra={greetingExtra}
        subtext={
          isPublisher
            ? 'Layanan Mandiri Pendaftaran, Pemantauan Pentashihan, dan Pengunduhan Dokumen STT Resmi LPMQ Kemenag RI'
            : 'Pemantauan terintegrasi untuk verifikasi, distribusi, pentashihan, dan pengesahan Surat Tanda Tashih'
        }
      />

      {/* 2. Daily Hadith & Al-Qur'an Widget */}
      <DailyQuranWidget />

      {/* 3. Role-based operational actions */}
      <div className="bg-white rounded-2xl border border-line/90 shadow-xs p-5 sm:p-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-4 pb-3 border-b border-line">
          <h3 className="text-xs sm:text-sm font-extrabold uppercase tracking-wider text-ink flex items-center gap-2">
            <Compass className="w-4 h-4 text-brand-700" />
            <span>Akses Proses Utama</span>
          </h3>
          <span className="text-[11px] text-ink-muted font-medium">
            {isPublisher ? 'Layanan sesuai profil penerbit' : 'Akses berbasis peran dan kewenangan'}
          </span>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3.5">
          {quickActions.map((action, idx) => {
            const Icon = action.icon;
            return (
              <Link
                key={idx}
                to={action.path}
                className={`group p-3.5 rounded-xl border border-line/80 ${action.cardHover || 'hover:border-brand-700 hover:bg-brand-50/40'} active:scale-[0.98] transition-all duration-200 flex flex-col justify-between shadow-2xs hover:shadow-xs bg-gradient-to-b from-white to-canvas/40`}
              >
                <div className="flex items-center gap-2.5 mb-2.5">
                  <div className={`w-9 h-9 rounded-xl ${action.iconBg} flex items-center justify-center shadow-xs flex-shrink-0 group-hover:scale-105 transition-transform`}>
                    <Icon className="w-4.5 h-4.5" />
                  </div>
                  <div className="text-xs font-bold text-ink group-hover:text-brand-800 line-clamp-1">
                    {action.title}
                  </div>
                </div>
                <div className="text-[11px] text-ink-muted group-hover:text-ink line-clamp-2 leading-relaxed">
                  {action.desc}
                </div>
              </Link>
            );
          })}
        </div>
      </div>

      {/* 4. Statistics Overview Section */}
      <div>
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-3.5">
          <div className="flex items-center gap-2">
            <Clock className="w-4 h-4 text-brand-700" />
            <h3 className="text-sm font-bold text-ink">
              Indikator Operasional
            </h3>
          </div>

          <div className="flex items-center gap-2">
            {/* Super Admin Perspective Switcher */}
            {isSuperAdmin && (
              <div className="inline-flex items-center p-1 rounded-lg bg-surface-subtle border border-line text-xs font-semibold">
                <button
                  type="button"
                  onClick={() => setAdminViewMode('OPERATIONAL')}
                  className={`px-3 py-1 rounded-md transition-all cursor-pointer ${
                    adminViewMode === 'OPERATIONAL'
                      ? 'bg-white text-brand-800 shadow-2xs font-bold'
                      : 'text-ink-muted hover:text-ink'
                  }`}
                >
                  Alur Sidang Internal
                </button>
                <button
                  type="button"
                  onClick={() => setAdminViewMode('PUBLISHER')}
                  className={`px-3 py-1 rounded-md transition-all cursor-pointer ${
                    adminViewMode === 'PUBLISHER'
                      ? 'bg-white text-brand-800 shadow-2xs font-bold'
                      : 'text-ink-muted hover:text-ink'
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
              icon={<RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin text-brand-700' : ''}`} />}
            >
              Segarkan
            </Button>
          </div>
        </div>

        {/* Grid Kartu Metrik dengan Palet Warna Kaya & Elegan */}
        {showOperationalCards ? (
          /* Kartu Perspektif Operasional Internal */
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {/* Card 1: Verifikasi Berkas */}
            <div className="rounded-xl border border-civic-infoLine/90 p-4 shadow-xs hover:shadow-md transition-all bg-gradient-to-br from-civic-infoSoft/80 via-white to-civic-infoSoft/30">
              <div className="flex items-center justify-between">
                <div className="w-10 h-10 rounded-xl bg-civic-info text-white flex items-center justify-center shadow-sm shadow-civic-info/25">
                  <CheckSquare className="w-5 h-5" />
                </div>
                <span className="text-[11px] font-bold px-2.5 py-0.5 rounded-full bg-civic-infoSoft text-civic-info border border-civic-infoLine">
                  Tahap 1
                </span>
              </div>
              <div className="mt-3">
                <div className="text-2xl sm:text-3xl font-black text-civic-info tabular-nums">
                  {countVerification}
                </div>
                <div className="text-xs font-bold text-civic-info mt-1">Verifikasi Berkas</div>
                <div className="text-[11px] text-ink-muted mt-0.5">Pemeriksaan naskah & kelengkapan</div>
              </div>
            </div>

            {/* Card 2: Sidang Pentashihan */}
            <div className="rounded-xl border border-civic-warningLine/90 p-4 shadow-xs hover:shadow-md transition-all bg-gradient-to-br from-civic-warningSoft/80 via-white to-civic-warningSoft/30">
              <div className="flex items-center justify-between">
                <div className="w-10 h-10 rounded-xl bg-civic-warning text-white flex items-center justify-center shadow-sm shadow-civic-warning/25">
                  <BookOpen className="w-5 h-5" />
                </div>
                <span className="text-[11px] font-bold px-2.5 py-0.5 rounded-full bg-civic-warningSoft text-civic-warning border border-civic-warningLine">
                  Tahap 2
                </span>
              </div>
              <div className="mt-3">
                <div className="text-2xl sm:text-3xl font-black text-civic-warning tabular-nums">
                  {countTashih}
                </div>
                <div className="text-xs font-bold text-civic-warning mt-1">Sidang Pentashihan</div>
                <div className="text-[11px] text-ink-muted mt-0.5">Telaah lafaz & rasm usmani</div>
              </div>
            </div>

            {/* Card 3: Penetapan STT */}
            <div className="rounded-xl border border-civic-infoLine/90 p-4 shadow-xs hover:shadow-md transition-all bg-gradient-to-br from-civic-infoSoft/80 via-white to-civic-infoSoft/30">
              <div className="flex items-center justify-between">
                <div className="w-10 h-10 rounded-xl bg-civic-info text-white flex items-center justify-center shadow-sm shadow-civic-info/25">
                  <Award className="w-5 h-5" />
                </div>
                <span className="text-[11px] font-bold px-2.5 py-0.5 rounded-full bg-civic-infoSoft text-civic-info border border-civic-infoLine">
                  Tahap 3
                </span>
              </div>
              <div className="mt-3">
                <div className="text-2xl sm:text-3xl font-black text-civic-info tabular-nums">
                  {countSTT}
                </div>
                <div className="text-xs font-bold text-civic-info mt-1">Penetapan Dokumen STT</div>
                <div className="text-[11px] text-ink-muted mt-0.5">Berita acara & tanda tashih sah</div>
              </div>
            </div>

            {/* Card 4: Total Naskah */}
            <div className="rounded-xl border border-brand-100/90 p-4 shadow-xs hover:shadow-md transition-all bg-gradient-to-br from-brand-50/80 via-white to-brand-50/30">
              <div className="flex items-center justify-between">
                <div className="w-10 h-10 rounded-xl bg-brand-700 text-white flex items-center justify-center shadow-sm shadow-brand-700/25">
                  <Users className="w-5 h-5" />
                </div>
                <span className="text-[11px] font-bold px-2.5 py-0.5 rounded-full bg-brand-100 text-brand-900 border border-brand-100">
                  Total
                </span>
              </div>
              <div className="mt-3">
                <div className="text-2xl sm:text-3xl font-black text-brand-950 tabular-nums">
                  {registrations.length}
                </div>
                <div className="text-xs font-bold text-brand-900 mt-1">Total Naskah Masuk</div>
                <div className="text-[11px] text-ink-muted mt-0.5">Seluruh berkas dalam antrean</div>
              </div>
            </div>
          </div>
        ) : (
          /* Kartu Perspektif Layanan Penerbit & PNBP */
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {/* Card 1: Billing PNBP */}
            <div className="rounded-xl border border-civicGold-700 p-4 shadow-xs hover:shadow-md transition-all bg-gradient-to-br from-civic-warningSoft via-civic-warningSoft/50 to-white">
              <div className="flex items-center justify-between">
                <div className="w-10 h-10 rounded-xl bg-civic-warning text-white flex items-center justify-center shadow-sm shadow-civic-warning/25">
                  <CreditCard className="w-5 h-5" />
                </div>
                <span className="text-[11px] font-bold px-2.5 py-0.5 rounded-full bg-civicGold-100 text-civicGold-700 border border-civicGold-700">
                  SIMPONI
                </span>
              </div>
              <div className="mt-3">
                <div className="text-xl sm:text-2xl font-black text-civic-warning tabular-nums">
                  {formatRupiah(totalBilling)}
                </div>
                <div className="text-xs font-bold text-civic-warning mt-1">Billing PNBP Terdaftar</div>
                <div className="text-[11px] text-ink-muted mt-0.5">Nominal naskah pada halaman ini</div>
              </div>
            </div>

            {/* Card 2: Sedang Diproses */}
            <div className="rounded-xl border border-civic-infoLine/90 p-4 shadow-xs hover:shadow-md transition-all bg-gradient-to-br from-civic-infoSoft/80 via-white to-civic-infoSoft/30">
              <div className="flex items-center justify-between">
                <div className="w-10 h-10 rounded-xl bg-civic-info text-white flex items-center justify-center shadow-sm shadow-civic-info/25">
                  <Clock className="w-5 h-5" />
                </div>
                <span className="text-[11px] font-bold px-2.5 py-0.5 rounded-full bg-civic-infoSoft text-civic-info border border-civic-infoLine">
                  Diproses
                </span>
              </div>
              <div className="mt-3">
                <div className="text-2xl sm:text-3xl font-black text-civic-info tabular-nums">
                  {inProgressCount}
                </div>
                <div className="text-xs font-bold text-civic-info mt-1">Sedang Ditashih</div>
                <div className="text-[11px] text-ink-muted mt-0.5">Dalam verifikasi & sidang</div>
              </div>
            </div>

            {/* Card 3: STT Terbit */}
            <div className="rounded-xl border border-brand-100/90 p-4 shadow-xs hover:shadow-md transition-all bg-gradient-to-br from-brand-50/80 via-white to-brand-50/30">
              <div className="flex items-center justify-between">
                <div className="w-10 h-10 rounded-xl bg-brand-700 text-white flex items-center justify-center shadow-sm shadow-brand-700/25">
                  <CheckCircle2 className="w-5 h-5" />
                </div>
                <span className="text-[11px] font-bold px-2.5 py-0.5 rounded-full bg-brand-100 text-brand-900 border border-brand-100">
                  Selesai
                </span>
              </div>
              <div className="mt-3">
                <div className="text-2xl sm:text-3xl font-black text-brand-950 tabular-nums">
                  {completedCount}
                </div>
                <div className="text-xs font-bold text-brand-900 mt-1">Surat Tashih Terbit</div>
                <div className="text-[11px] text-ink-muted mt-0.5">Dokumen sah bersertifikat</div>
              </div>
            </div>

            {/* Card 4: Total Pengajuan */}
            <div className="rounded-xl border border-civic-infoLine/90 p-4 shadow-xs hover:shadow-md transition-all bg-gradient-to-br from-civic-infoSoft/80 via-white to-civic-infoSoft/30">
              <div className="flex items-center justify-between">
                <div className="w-10 h-10 rounded-xl bg-civic-info text-white flex items-center justify-center shadow-sm shadow-civic-info/25">
                  <FileText className="w-5 h-5" />
                </div>
                <span className="text-[11px] font-bold px-2.5 py-0.5 rounded-full bg-civic-infoSoft text-civic-info border border-civic-infoLine">
                  Naskah
                </span>
              </div>
              <div className="mt-3">
                <div className="text-2xl sm:text-3xl font-black text-civic-info tabular-nums">
                  {registrations.length}
                </div>
                <div className="text-xs font-bold text-civic-info mt-1">Total Pengajuan</div>
                <div className="text-[11px] text-ink-muted mt-0.5">Semua riwayat pengajuan</div>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* 4b. Ringkasan Kinerja & Kepatuhan SLA (VER-I06) */}
      {showOperationalCards && performanceReport && (
        <div className="bg-gradient-to-r from-ink via-ink to-brand-950 rounded-2xl p-5 text-white shadow-md border border-ink/60">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-3 mb-4 border-b border-ink/60">
            <div className="flex items-center gap-2.5">
              <div className="w-7 h-7 rounded-lg bg-brand-700/20 text-brand-700 flex items-center justify-center border border-brand-700/30">
                <Activity className="w-4 h-4" />
              </div>
              <div>
                <h4 className="text-xs sm:text-sm font-bold tracking-wide uppercase text-line-strong">
                  Kinerja Verifikasi & Kepatuhan SLA (SOP v2.2)
                </h4>
                <p className="text-[11px] text-ink-muted">
                  Parameter SLA: telaah berkas maksimal 48 jam • pembayaran PNBP maksimal 7 hari
                </p>
              </div>
            </div>
            <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-brand-700/10 text-brand-100 text-xs font-semibold border border-brand-700/20 self-start sm:self-auto">
              <TrendingUp className="w-3.5 h-3.5" />
              <span>SLA Kepatuhan: {performanceReport.summary?.compliance_rate_percent ?? 100}%</span>
            </div>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
            <div className="bg-white/5 rounded-xl p-3 border border-white/10">
              <div className="text-ink-muted text-[11px] mb-1">Rata-rata Waktu Telaah</div>
              <div className="text-lg font-black text-white">
                {performanceReport.summary?.avg_duration_hours ?? 0}{' '}
                <span className="text-xs font-normal text-ink-muted">jam</span>
              </div>
              <div className="text-[10px] text-brand-700 mt-0.5">SOP Max: 48 jam</div>
            </div>

            <div className="bg-white/5 rounded-xl p-3 border border-white/10">
              <div className="text-ink-muted text-[11px] mb-1">Keputusan Telaah</div>
              <div className="text-lg font-black text-white">
                <span className="text-brand-700">{performanceReport.summary?.total_passed ?? 0}</span>
                <span className="text-ink-muted text-xs font-normal mx-1">/</span>
                <span className="text-civic-warning">{performanceReport.summary?.total_revision ?? 0}</span>
              </div>
              <div className="text-[10px] text-line-strong mt-0.5">Lolos vs Perlu Revisi</div>
            </div>

            <div className="bg-white/5 rounded-xl p-3 border border-white/10">
              <div className="text-ink-muted text-[11px] mb-1">Antrean Overdue SLA</div>
              <div className="text-lg font-black text-white">
                {performanceReport.summary?.total_overdue ?? 0}{' '}
                <span className="text-xs font-normal text-ink-muted">berkas</span>
              </div>
              <div className="text-[10px] text-line-strong mt-0.5">
                {(performanceReport.summary?.total_overdue || 0) > 0 ? (
                  <span className="text-civic-danger font-semibold flex items-center gap-1">
                    <AlertTriangle className="w-2.5 h-2.5" /> Perlu atensi
                  </span>
                ) : (
                  <span className="text-brand-700">Semua sesuai jadwal</span>
                )}
              </div>
            </div>

            <div className="bg-white/5 rounded-xl p-3 border border-white/10">
              <div className="text-ink-muted text-[11px] mb-1">PNBP Terverifikasi</div>
              <div className="text-sm sm:text-base font-black text-civic-warning truncate">
                {formatRupiah(performanceReport.payments?.total_verified_amount ?? 0)}
              </div>
              <div className="text-[10px] text-line-strong mt-0.5">
                {performanceReport.payments?.verified_count ?? 0} transaksi lunas
              </div>
            </div>
          </div>
        </div>
      )}

      {error && (
        <div className="p-4 rounded-xl bg-civic-dangerSoft border border-civic-dangerLine text-civic-danger text-sm flex items-start gap-2.5">
          <AlertCircle className="w-5 h-5 flex-shrink-0 mt-0.5" />
          <div>
            <span className="font-semibold">Gangguan layanan data: </span>
            {error}
          </div>
        </div>
      )}

      {!error && <QueueOverview total={pagination.total} oldest={registrations[0]?.queue_entered_at} fifo={!isPublisher || isSuperAdmin} loading={loading} />}

      {/* 5. Tabel Antrean & Riwayat Pengajuan Naskah */}
      {assignmentSuccess && <p role="status" className="rounded-xl border border-brand-100 bg-brand-50 p-4 text-sm text-brand-800">{assignmentSuccess}</p>}
      <div id="antrean-tim" className="bg-white rounded-2xl border border-line/90 shadow-xs overflow-hidden scroll-mt-6">
        {/* Header & Filter Controls */}
        <div className="p-5 sm:p-6 border-b border-line space-y-4">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3">
            <div>
              <h3 className="text-base font-bold text-ink">
                {isPublisher
                  ? 'Portofolio Pengajuan Terkini'
                  : 'Antrean Kerja Pentashihan'}
              </h3>
              <p className="text-xs text-ink-muted mt-0.5">
                {pagination.total} naskah dalam filter • maksimal 20 per halaman
              </p>
            </div>

            {/* Search Input */}
            <div className="relative w-full md:w-auto md:min-w-[260px]">
              <Search className="w-4 h-4 text-ink-muted absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
              <input
                type="text"
                aria-label="Cari pengajuan naskah"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Cari nomor, judul, penerbit..."
                className="w-full pl-9 pr-3.5 py-2 text-xs bg-canvas/70 border border-line-strong rounded-xl outline-none focus:bg-white focus:ring-2 focus:ring-brand-700/20 focus:border-brand-700 transition-all text-ink"
              />
            </div>
          </div>

          {/* Filter Status Buttons */}
          <div className="flex flex-wrap items-center justify-between gap-2 pt-3 border-t border-line">
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-xs font-bold text-ink-muted uppercase tracking-wider mr-1 flex items-center gap-1.5">
                <Filter className="w-3.5 h-3.5 text-brand-700" />
                Segmentasi:
              </span>
              <button
                onClick={() => changeStatusFilter('ACTIVE')}
                className={`px-3.5 py-1.5 text-xs font-bold rounded-xl transition-all ${statusFilter === 'ACTIVE' ? 'bg-brand-700 text-white' : 'bg-brand-50 text-brand-800 border border-brand-100'}`}
              >Antrean Aktif</button>
              <button
                onClick={() => changeStatusFilter('ALL')}
                className={`px-3.5 py-1.5 text-xs font-bold rounded-xl transition-all cursor-pointer ${
                  statusFilter === 'ALL'
                    ? 'bg-ink text-white shadow-xs'
                    : 'bg-surface-subtle text-ink-muted hover:bg-surface-strong'
                }`}
              >
                Semua & Riwayat
              </button>
              <button
                onClick={() => changeStatusFilter('VERIFICATION')}
                className={`px-3.5 py-1.5 text-xs font-bold rounded-xl transition-all cursor-pointer ${
                  statusFilter === 'VERIFICATION'
                    ? 'bg-civic-info text-white shadow-xs'
                    : 'bg-civic-infoSoft text-civic-info hover:bg-civic-infoSoft border border-civic-infoLine/60'
                }`}
              >
                Verifikasi ({countVerification})
              </button>
              <button
                onClick={() => changeStatusFilter('TASHIH')}
                className={`px-3.5 py-1.5 text-xs font-bold rounded-xl transition-all cursor-pointer ${
                  statusFilter === 'TASHIH'
                    ? 'bg-civic-warning text-white shadow-xs'
                    : 'bg-civic-warningSoft text-civic-warning hover:bg-civic-warningSoft border border-civic-warningLine/60'
                }`}
              >
                Sidang Tashih ({countTashih})
              </button>
              <button
                onClick={() => changeStatusFilter('COMPLETED')}
                className={`px-3.5 py-1.5 text-xs font-bold rounded-xl transition-all cursor-pointer ${
                  statusFilter === 'COMPLETED'
                    ? 'bg-brand-700 text-white shadow-xs'
                    : 'bg-brand-50 text-brand-900 hover:bg-brand-100 border border-brand-100/60'
                }`}
              >
                STT Terbit ({countSTT})
              </button>
            </div>

            {!isPublisher && (
              <button
                onClick={() => { setFilterMyTasksOnly(!filterMyTasksOnly); setPage(1); }}
                className={`px-3.5 py-1.5 text-xs font-bold rounded-xl border transition-all cursor-pointer ${
                  filterMyTasksOnly
                    ? 'bg-gradient-to-r from-civic-warning to-civic-warning text-white border-civic-warning shadow-xs'
                    : 'bg-white text-ink border-line-strong hover:bg-canvas'
                }`}
              >
                {filterMyTasksOnly ? '✓ Penugasan Saya' : 'Seluruh Penugasan'}
              </button>
            )}
          </div>
        </div>

        {/* Tabel Data */}
        {loading ? (
          <div className="py-16 text-center text-ink-muted">
            <RefreshCw className="w-7 h-7 animate-spin mx-auto mb-2 text-brand-700" />
            <p className="text-xs font-semibold">Memuat data naskah pentashihan...</p>
          </div>
        ) : error ? null : filteredRegistrations.length === 0 ? (
          <div className="py-16 text-center text-ink-muted max-w-sm mx-auto">
            <div className="w-12 h-12 rounded-full bg-surface-subtle text-ink-muted flex items-center justify-center mx-auto mb-2.5">
              <CheckSquare className="w-6 h-6" />
            </div>
            <p className="text-sm font-bold text-ink">Tidak ada data naskah</p>
            <p className="text-xs text-ink-muted mt-1">
              {searchQuery
                ? `Tidak ditemukan hasil untuk "${searchQuery}"`
                : 'Belum ada antrean naskah pada kriteria filter ini.'}
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse min-w-[760px]">
              <thead>
                <tr className="bg-canvas/80 text-ink-muted text-[11px] font-bold uppercase tracking-wider border-b border-line">
                  <th className="py-3.5 px-6">Referensi & Tanggal</th>
                  <th className="py-3.5 px-6">Entitas & Naskah</th>
                  <th className="py-3.5 px-6">Profil Layanan</th>
                  <th className="py-3.5 px-6">Status Sistem</th>
                  <th className="py-3.5 px-6 text-right">Aksi</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-line text-sm">
                {filteredRegistrations.map((item) => (
                  <tr key={item.id} className="hover:bg-brand-50/40 transition-colors">
                    <td className="py-4 px-6">
                      <span className="font-mono text-xs font-bold text-ink block">
                        {item.registration_no || item.registrationNumber}
                      </span>
                      <span className="text-[11px] text-ink-muted">
                        {new Date(item.created_at || item.submittedAt).toLocaleDateString('id-ID', {
                           day: 'numeric',
                           month: 'short',
                           year: 'numeric',
                        })}
                      </span>
                    </td>
                    <td className="py-4 px-6">
                      <span className="font-bold text-ink block line-clamp-1">
                        {item.title || item.mushafTitle}
                      </span>
                      <span className="text-xs text-brand-800 font-semibold block">
                        {item.publisher?.legal_name || item.publisherName || 'Penerbit Terdaftar'}
                      </span>
                    </td>
                    <td className="py-4 px-6 text-xs text-ink-muted">
                      <span className="font-semibold text-ink block">
                        {item.service_type?.name || item.serviceType || 'Tashih Reguler'}
                      </span>
                      <span className="text-[11px] text-ink-muted">
                        {item.service_type?.category?.name || 'Mushaf Cetak'}
                      </span>
                    </td>
                    <td className="py-4 px-6">
                      <StatusBadge registration={item} status={item.status} />
                      <div className="mt-2"><QueueItemMeta item={item} /></div>
                    </td>
                    <td className="py-4 px-6 text-right">
                      {canAssignTeam && item.status === 'WAITING_DISTRIBUTION' && (
                        <Button variant="primary" size="sm" className="text-xs mb-2 block ml-auto" onClick={() => setAssignmentId(item.id)}>
                          Tetapkan Tim
                        </Button>
                      )}
                      {canAssignVerification && item.status === 'READY_FOR_VERIFICATION' && (item.physical_master_intake?.status === 'RECEIVED' || item.physical_master?.status === 'RECEIVED') && (
                        <Button
                          variant="primary"
                          size="sm"
                          className="text-xs mb-2 block ml-auto font-bold"
                          onClick={() => setVerificationAssignReg(item)}
                        >
                          <UserCheck className="w-3.5 h-3.5 mr-1" />
                          Tugaskan Verifikator
                        </Button>
                      )}
                      {isAdmin && item.status === 'READY_FOR_VERIFICATION' && (item.physical_master_intake?.status !== 'RECEIVED' && item.physical_master?.status !== 'RECEIVED') && (
                        <Link
                          to={`/internal/master-intake?search=${encodeURIComponent(item.registration_no || item.registrationNumber || '')}`}
                          className="inline-flex items-center text-xs mb-2 ml-auto font-bold bg-civic-warning hover:bg-civic-warning text-white px-2.5 py-1.5 rounded-lg shadow-2xs transition-colors"
                        >
                          <PackageCheck className="w-3.5 h-3.5 mr-1" />
                          Intake Master Fisik
                        </Link>
                      )}
                      <Button variant="outline" size="sm" className="text-xs" onClick={() => setDetailId(item.id)}>
                        Tinjau Detail
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
      {!error && <QueuePagination pagination={pagination} loading={loading} onPageChange={setPage} />}
      {detailId && <RegistrationDetailDialog key={detailId} id={detailId} onClose={() => setDetailId(null)} />}
      {assignmentId && <ManualTeamAssignmentDialog key={assignmentId} id={assignmentId} onClose={() => setAssignmentId(null)} onAssigned={() => { setAssignmentId(null); setAssignmentSuccess('Tim pentashih berhasil ditetapkan. Penugasan dan notifikasi telah dicatat.'); fetchRegistrations(); }} />}
      {verificationAssignReg && (
        <AssignVerificationDialog
          key={verificationAssignReg.id}
          registration={verificationAssignReg}
          onClose={() => setVerificationAssignReg(null)}
          onSuccess={() => {
            setVerificationAssignReg(null);
            setAssignmentSuccess('Verifikator berhasil ditugaskan dan Nota Dinas telah diterbitkan.');
            fetchRegistrations();
          }}
          onConflict={() => {
            setVerificationAssignReg(null);
            fetchRegistrations();
          }}
        />
      )}
    </div>
  );
};

export default UnifiedDashboard;
