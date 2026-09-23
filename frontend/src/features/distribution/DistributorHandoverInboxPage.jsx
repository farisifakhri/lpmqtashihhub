import React, { useState, useEffect, useMemo, useRef } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { useAuth } from '@/features/auth/AuthContext';
import { handoverApi } from '@/api/handover.api';
import { registrationApi } from '@/api/registration.api';
import { StatusBadge } from '@/components/ui/StatusBadge';
import { Button } from '@/components/ui/Button';
import { PageHeader } from '@/components/ui/PageHeader';
import { QueueOverview, QueueItemMeta } from '@/components/common/QueueOverview';
import { ManualTeamAssignmentDialog } from './ManualTeamAssignmentDialog';
import { DistributorReviewDialog } from './DistributorReviewDialog';
import {
  PackageCheck,
  Search,
  RefreshCw,
  Clock,
  AlertCircle,
  CheckCircle2,
  AlertTriangle,
  FileText,
  Copy,
  Check,
  Building2,
  Calendar,
  X,
  Eye,
  Layers,
  ShieldCheck,
  ArrowRight,
  Inbox,
  RotateCcw,
  CheckSquare,
  Users,
  BookOpen,
} from 'lucide-react';
import { clsx } from 'clsx';

export const DistributorHandoverInboxPage = () => {
  const { currentUser } = useAuth();
  const [searchParams, setSearchParams] = useSearchParams();
  const urlTab = searchParams.get('tab') || searchParams.get('stage');
  const [hubStage, setHubStage] = useState(
    urlTab === 'MONITORING_SIDANG' || urlTab === 'MONITORING'
      ? 'MONITORING'
      : urlTab === 'PENUGASAN_TIM' || urlTab === 'ASSIGNMENT'
      ? 'ASSIGNMENT'
      : 'HANDOVER'
  );

  const [waitingDistRegistrations, setWaitingDistRegistrations] = useState([]);
  const [inProgressRegistrations, setInProgressRegistrations] = useState([]);
  const [distLoading, setDistLoading] = useState(false);

  const [assignmentModalId, setAssignmentModalId] = useState(null);
  const [reviewDialogRegId, setReviewDialogRegId] = useState(null);

  const [handovers, setHandovers] = useState([]);
  const [pagination, setPagination] = useState({ total: 0, page: 1, limit: 20, totalPages: 1 });
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [error, setError] = useState(null);
  const [successMessage, setSuccessMessage] = useState(null);

  const [activeTab, setActiveTab] = useState('PENDING'); // 'PENDING' | 'RECEIVED' | 'RETURNED' | 'ALL'
  const [searchQuery, setSearchQuery] = useState('');
  const [copiedReceipt, setCopiedReceipt] = useState(null);
  const [submittedSearch, setSubmittedSearch] = useState('');
  const requestId = useRef(0);

  // Modal Konfirmasi Penerimaan Fisik
  const [receiveModalOpen, setReceiveModalOpen] = useState(false);
  const [selectedHandover, setSelectedHandover] = useState(null);
  const [receiveCondition, setReceiveCondition] = useState('BAIK');
  const [receiveVolumeCount, setReceiveVolumeCount] = useState(30);
  const [tashihDueAt, setTashihDueAt] = useState('');
  const [receiveNotes, setReceiveNotes] = useState('');
  const [receiveModalError, setReceiveModalError] = useState(null);

  // Modal Pengembalian / Penolakan Fisik Cacat
  const [returnModalOpen, setReturnModalOpen] = useState(false);
  const [returnReason, setReturnReason] = useState('');
  const [returnModalError, setReturnModalError] = useState(null);

  // Modal Detail Handover
  const [detailModalOpen, setDetailModalOpen] = useState(false);
  const [detailHandover, setDetailHandover] = useState(null);

  const userRoles = Array.isArray(currentUser?.roles)
    ? currentUser.roles
    : currentUser?.role
    ? [currentUser.role]
    : [];
  const isDistributor = userRoles.includes('DISTRIBUTOR') || currentUser?.role === 'DISTRIBUTOR';
  const isSuperAdmin = userRoles.includes('SUPERADMIN') || currentUser?.role === 'SUPERADMIN';
  const isAdmin = isSuperAdmin || userRoles.includes('ADMIN');
  const canConfirm = isDistributor || isSuperAdmin;

  const fetchHandovers = async () => {
    const request = ++requestId.current;
    setLoading(true);
    setError(null);
    try {
      const params = {
        page: pagination.page,
        limit: pagination.limit,
      };
      if (activeTab !== 'ALL') {
        params.status = activeTab;
      }
      if (submittedSearch) {
        params.search = submittedSearch;
      }

      const res = await handoverApi.listHandovers(params);
      if (request !== requestId.current) return;
      if (res?.data) {
        setHandovers(res.data.items || []);
        if (res.data.pagination) {
          setPagination(res.data.pagination);
        }
      }
    } catch (err) {
      if (request === requestId.current) setError(err.message || 'Gagal memuat antrean serah-terima fisik master mushaf.');
    } finally {
      if (request === requestId.current) setLoading(false);
    }
  };

  useEffect(() => {
    fetchHandovers();
    return () => { requestId.current += 1; };
  }, [activeTab, pagination.page, submittedSearch]);

  const fetchDistributionData = async () => {
    setDistLoading(true);
    try {
      const [waitingRes, progressRes] = await Promise.all([
        registrationApi.listRegistrations({ status: 'WAITING_DISTRIBUTION' }),
        registrationApi.listRegistrations({ status: 'TASHIH_IN_PROGRESS' }),
      ]);
      if (waitingRes?.data) setWaitingDistRegistrations(waitingRes.data);
      if (progressRes?.data) setInProgressRegistrations(progressRes.data);
    } catch (err) {
      console.error('Error fetching distribution data:', err);
    } finally {
      setDistLoading(false);
    }
  };

  useEffect(() => {
    fetchDistributionData();
  }, [hubStage]);

  const handleSearchSubmit = (e) => {
    e.preventDefault();
    if (pagination.page === 1 && submittedSearch === searchQuery.trim()) fetchHandovers();
    setSubmittedSearch(searchQuery.trim());
    setPagination((prev) => ({ ...prev, page: 1 }));
  };

  const handleCopyText = (text, key) => {
    if (!text) return;
    navigator.clipboard?.writeText(text);
    setCopiedReceipt(key);
    setTimeout(() => setCopiedReceipt(null), 2000);
  };

  const formatDate = (dateString) => {
    if (!dateString) return '-';
    return new Date(dateString).toLocaleDateString('id-ID', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const formatDateOnly = (dateString) => {
    if (!dateString) return '-';
    return new Date(dateString).toLocaleDateString('id-ID', {
      day: 'numeric',
      month: 'long',
      year: 'numeric',
    });
  };

  // Setup Default Due Date (30 hari dari hari ini)
  const getDefaultDueDate = () => {
    const d = new Date();
    d.setDate(d.getDate() + 30);
    return d.toISOString().split('T')[0];
  };

  const openReceiveModal = (item) => {
    setSelectedHandover(item);
    setReceiveCondition(item.condition || 'BAIK');
    setReceiveVolumeCount(item.volume_count || 30);
    setTashihDueAt(getDefaultDueDate());
    setReceiveNotes('');
    setReceiveModalError(null);
    setReceiveModalOpen(true);
  };

  const handleReceiveSubmit = async (e) => {
    e.preventDefault();
    if (!selectedHandover) return;

    setActionLoading(true);
    setReceiveModalError(null);
    try {
      if (!tashihDueAt) {
        setReceiveModalError('Tenggat waktu pentashihan (tashih_due_at) wajib ditetapkan oleh Distributor.');
        setActionLoading(false);
        return;
      }
      const isoDueAt = new Date(tashihDueAt).toISOString();
      const payload = {
        condition: receiveCondition.trim() || 'BAIK',
        volume_count: Number(receiveVolumeCount) || 30,
        tashih_due_at: isoDueAt,
        notes: receiveNotes.trim() || undefined,
      };

      await handoverApi.receiveHandover(selectedHandover.id, payload);
      setSuccessMessage(
        `Master fisik ${selectedHandover.receipt_no} resmi diterima. Naskah berpindah status ke 'Menunggu Distribusi' (WAITING_DISTRIBUTION).`
      );
      setReceiveModalOpen(false);
      await fetchHandovers();
    } catch (err) {
      setReceiveModalError(err.message || 'Gagal mengonfirmasi penerimaan master fisik.');
    } finally {
      setActionLoading(false);
    }
  };

  const openReturnModal = (item) => {
    setSelectedHandover(item);
    setReturnReason('');
    setReturnModalError(null);
    setReturnModalOpen(true);
  };

  const handleReturnSubmit = async (e) => {
    e.preventDefault();
    if (!selectedHandover) return;

    if (!returnReason.trim() || returnReason.trim().length < 5) {
      setReturnModalError('Alasan pengembalian / penolakan master fisik minimal 5 karakter.');
      return;
    }

    setActionLoading(true);
    setReturnModalError(null);
    try {
      await handoverApi.returnHandover(selectedHandover.id, {
        reason: returnReason.trim(),
      });
      setSuccessMessage(
        `Master fisik ${selectedHandover.receipt_no} berhasil dikembalikan ke Verifikator. Registrasi kini berstatus 'Perlu Perbaikan' (REVISION_REQUIRED).`
      );
      setReturnModalOpen(false);
      await fetchHandovers();
    } catch (err) {
      setReturnModalError(err.message || 'Gagal mengembalikan master fisik.');
    } finally {
      setActionLoading(false);
    }
  };

  const openDetailModal = (item) => {
    setDetailHandover(item);
    setDetailModalOpen(true);
  };

  // Helper Badge status Handover
  const renderHandoverBadge = (status) => {
    switch (status) {
      case 'PENDING':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md text-xs font-semibold bg-amber-50 text-amber-800 border border-amber-300">
            <Clock className="w-3.5 h-3.5 text-amber-600" />
            Menunggu Konfirmasi
          </span>
        );
      case 'RECEIVED':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md text-xs font-semibold bg-emerald-50 text-emerald-800 border border-emerald-300">
            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
            Diterima di Meja Pentashihan
          </span>
        );
      case 'RETURNED':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md text-xs font-semibold bg-rose-50 text-rose-800 border border-rose-300">
            <AlertTriangle className="w-3.5 h-3.5 text-rose-600" />
            Dikembalikan (Cacat Fisik)
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md text-xs font-semibold bg-slate-100 text-slate-700 border border-slate-200">
            {status}
          </span>
        );
    }
  };

  // Stats Counters
  const pendingCount = useMemo(() => {
    return handovers.filter((h) => h.status === 'PENDING').length;
  }, [handovers]);

  return (
    <div className="max-w-7xl mx-auto space-y-6 pb-20">
      {/* Top Header & Breadcrumb */}
      <PageHeader
        title="Antrean Serah-Terima Master Fisik"
        subtitle="Pemeriksaan dan penerimaan master mushaf cetak A4 (per juz) dari Verifikator di loket pentashihan (Langkah 7 & 8 SOP)"
        breadcrumbs={[
          { label: 'Portal Petugas', href: '/internal' },
          { label: 'Distribusi Sidang' },
          { label: 'Serah-Terima Master Fisik' },
        ]}
        actions={
          <div className="flex items-center gap-2">
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-md text-xs font-bold bg-emerald-50 text-emerald-800 border border-emerald-200">
              <ShieldCheck className="w-3.5 h-3.5 text-emerald-700" />
              SOP v2.2 &bull; Langkah 8
            </span>
            <Button
              variant="outline"
              size="sm"
              onClick={fetchHandovers}
              disabled={loading}
              className="text-xs"
            >
              <RefreshCw className={`w-3.5 h-3.5 mr-1.5 ${loading ? 'animate-spin' : ''}`} />
              Segarkan
            </Button>
          </div>
        }
      />

      {/* Alert Notices */}
      {successMessage && (
        <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-xl flex items-center justify-between text-emerald-800 text-sm shadow-xs animate-fadeIn">
          <div className="flex items-center gap-2.5">
            <CheckCircle2 className="w-5 h-5 text-emerald-600 flex-shrink-0" />
            <span className="font-medium">{successMessage}</span>
          </div>
          <button
            onClick={() => setSuccessMessage(null)}
            className="text-xs text-emerald-700 hover:underline font-bold px-2 py-1"
          >
            Tutup
          </button>
        </div>
      )}

      {error && (
        <div className="p-4 bg-rose-50 border border-rose-200 rounded-xl flex items-center justify-between text-rose-800 text-sm shadow-xs animate-fadeIn">
          <div className="flex items-center gap-2.5">
            <AlertCircle className="w-5 h-5 text-rose-600 flex-shrink-0" />
            <span>{error}</span>
          </div>
          <button
            onClick={() => setError(null)}
            className="text-xs text-rose-700 hover:underline font-bold px-2 py-1"
          >
            Tutup
          </button>
        </div>
      )}

      {/* 3-Stage Workflow Hub Navigation */}
      <div className="flex items-center gap-2 p-1.5 bg-slate-100/90 rounded-2xl border border-slate-200 overflow-x-auto">
        <button
          type="button"
          onClick={() => {
            setHubStage('HANDOVER');
            setSearchParams({ stage: 'HANDOVER' });
          }}
          className={clsx(
            'flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold transition-all whitespace-nowrap cursor-pointer',
            hubStage === 'HANDOVER'
              ? 'bg-white text-emerald-800 shadow-xs'
              : 'text-slate-600 hover:text-slate-900'
          )}
        >
          <PackageCheck className="w-4 h-4" />
          <span>1. Serah-Terima Fisik dari Verifikator</span>
          <span className="px-2 py-0.5 rounded-full bg-slate-200 text-slate-700 text-[10px]">
            {pendingCount}
          </span>
        </button>

        <button
          type="button"
          onClick={() => {
            setHubStage('ASSIGNMENT');
            setSearchParams({ stage: 'ASSIGNMENT' });
          }}
          className={clsx(
            'flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold transition-all whitespace-nowrap cursor-pointer',
            hubStage === 'ASSIGNMENT'
              ? 'bg-white text-emerald-800 shadow-xs'
              : 'text-slate-600 hover:text-slate-900'
          )}
        >
          <Users className="w-4 h-4" />
          <span>2. Siap Penugasan Tim SK</span>
          <span className="px-2 py-0.5 rounded-full bg-slate-200 text-slate-700 text-[10px]">
            {waitingDistRegistrations.length}
          </span>
        </button>

        <button
          type="button"
          onClick={() => {
            setHubStage('MONITORING');
            setSearchParams({ stage: 'MONITORING' });
          }}
          className={clsx(
            'flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold transition-all whitespace-nowrap cursor-pointer',
            hubStage === 'MONITORING'
              ? 'bg-white text-emerald-800 shadow-xs'
              : 'text-slate-600 hover:text-slate-900'
          )}
        >
          <ShieldCheck className="w-4 h-4" />
          <span>3. Monitoring Sidang & Reviu</span>
          <span className="px-2 py-0.5 rounded-full bg-slate-200 text-slate-700 text-[10px]">
            {inProgressRegistrations.length}
          </span>
        </button>
      </div>

      {hubStage === 'HANDOVER' && (
        <>
          {/* Summary Stat Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="p-4 rounded-2xl bg-white border border-slate-200 shadow-2xs space-y-1">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-amber-700">Perlu Konfirmasi Loket</span>
            <span className="p-2 rounded-xl bg-amber-50 text-amber-700">
              <Clock className="w-4 h-4" />
            </span>
          </div>
          <p className="text-2xl font-black text-slate-900">{pendingCount}</p>
          <p className="text-[11px] text-slate-500">Jumlah pada halaman ini</p>
        </div>

        <div className="p-4 rounded-2xl bg-white border border-slate-200 shadow-2xs space-y-1">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-emerald-700">Telah Diterima & Disahkan</span>
            <span className="p-2 rounded-xl bg-emerald-50 text-emerald-700">
              <CheckSquare className="w-4 h-4" />
            </span>
          </div>
          <p className="text-2xl font-black text-slate-900">
            {handovers.filter((h) => h.status === 'RECEIVED').length}
          </p>
          <p className="text-[11px] text-slate-500">Jumlah pada halaman ini</p>
        </div>

        <div className="p-4 rounded-2xl bg-white border border-slate-200 shadow-2xs space-y-1">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-rose-700">Dikembalikan / Cacat</span>
            <span className="p-2 rounded-xl bg-rose-50 text-rose-700">
              <RotateCcw className="w-4 h-4" />
            </span>
          </div>
          <p className="text-2xl font-black text-slate-900">
            {handovers.filter((h) => h.status === 'RETURNED').length}
          </p>
          <p className="text-[11px] text-slate-500">Jumlah pada halaman ini</p>
        </div>
      </div>

      {!error && <QueueOverview total={pagination.total} oldest={handovers[0]?.queue_entered_at || handovers[0]?.created_at} fifo={!['RECEIVED', 'RETURNED'].includes(activeTab)} loading={loading} />}

      {/* Filter Tabs & Search Bar */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-2xs p-4 space-y-4">
        <div className="flex flex-col md:flex-row items-center justify-between gap-3">
          {/* Tabs */}
          <div className="flex items-center gap-1.5 p-1 bg-slate-100/80 rounded-xl overflow-x-auto w-full md:w-auto">
            <button
              onClick={() => {
                setActiveTab('PENDING');
                setPagination((prev) => ({ ...prev, page: 1 }));
              }}
              className={`px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all whitespace-nowrap ${
                activeTab === 'PENDING'
                  ? 'bg-white text-emerald-800 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Menunggu Konfirmasi
            </button>
            <button
              onClick={() => {
                setActiveTab('RECEIVED');
                setPagination((prev) => ({ ...prev, page: 1 }));
              }}
              className={`px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all whitespace-nowrap ${
                activeTab === 'RECEIVED'
                  ? 'bg-white text-emerald-800 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Telah Diterima
            </button>
            <button
              onClick={() => {
                setActiveTab('RETURNED');
                setPagination((prev) => ({ ...prev, page: 1 }));
              }}
              className={`px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all whitespace-nowrap ${
                activeTab === 'RETURNED'
                  ? 'bg-white text-emerald-800 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Dikembalikan
            </button>
            <button
              onClick={() => {
                setActiveTab('ALL');
                setPagination((prev) => ({ ...prev, page: 1 }));
              }}
              className={`px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all whitespace-nowrap ${
                activeTab === 'ALL'
                  ? 'bg-white text-emerald-800 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Semua Riwayat
            </button>
          </div>

          {/* Search Form */}
          <form onSubmit={handleSearchSubmit} className="w-full md:w-80 relative">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              aria-label="Cari serah-terima naskah"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Cari BAST, no reg, judul..."
              className="w-full text-xs pl-9 pr-8 py-2 rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-emerald-600/20 focus:border-emerald-600"
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => {
                  setSearchQuery('');
                  setSubmittedSearch('');
                  setPagination(prev => ({ ...prev, page: 1 }));
                }}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 p-0.5"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </form>
        </div>
      </div>

      {/* Main List Table / Cards */}
      {loading ? (
        <div className="py-20 text-center bg-white rounded-2xl border border-slate-200 space-y-3">
          <div className="w-9 h-9 border-4 border-emerald-600 border-t-transparent rounded-full animate-spin mx-auto" />
          <p className="text-xs font-medium text-slate-600">Memuat berkas serah-terima fisik...</p>
        </div>
      ) : error ? null : handovers.length === 0 ? (
        <div className="py-20 text-center bg-white rounded-2xl border border-slate-200 space-y-3">
          <Inbox className="w-12 h-12 text-slate-300 mx-auto" />
          <h3 className="text-sm font-bold text-slate-800">Tidak Ada Serah-Terima Fisik</h3>
          <p className="text-xs text-slate-500 max-w-md mx-auto">
            {activeTab === 'PENDING'
              ? 'Tidak ada master fisik yang sedang menunggu konfirmasi penerimaan loket saat ini.'
              : `Belum ada data serah-terima dengan status ${activeTab}.`}
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {!loading && !error && handovers.map((item) => {
            const reg = item.registration || {};
            const pub = reg.publisher || {};
            const fromUser = item.from_user || {};
            const toUser = item.to_user || {};
            const isPending = item.status === 'PENDING';
            const isReceived = item.status === 'RECEIVED';
            const isReturned = item.status === 'RETURNED';
            const isTargetOfficer = isSuperAdmin || (item.to_user_id || toUser.id) === currentUser?.id;

            return (
              <div
                key={item.id}
                className="bg-white rounded-2xl border border-slate-200 shadow-2xs hover:shadow-xs transition-shadow p-5 space-y-4"
              >
                {/* Header Row: BAST No + Status */}
                <QueueItemMeta item={item} />
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 pb-3">
                  <div className="flex flex-wrap items-center gap-2">
                    <div className="flex items-center gap-1.5 bg-slate-50 border border-slate-200 px-2.5 py-1 rounded-lg">
                      <span className="text-[11px] font-mono text-slate-500">BAST:</span>
                      <span className="font-mono text-xs font-bold text-slate-900">{item.receipt_no}</span>
                      <button
                        onClick={() => handleCopyText(item.receipt_no, item.id)}
                        className="text-slate-400 hover:text-emerald-700 transition-colors ml-1"
                        title="Salin No. BAST"
                      >
                        {copiedReceipt === item.id ? (
                          <Check className="w-3.5 h-3.5 text-emerald-600" />
                        ) : (
                          <Copy className="w-3.5 h-3.5" />
                        )}
                      </button>
                    </div>

                    <span className="font-mono text-[11px] font-semibold text-emerald-800 bg-emerald-50 px-2.5 py-1 rounded-lg border border-emerald-200">
                      {reg.registration_no || '-'}
                    </span>
                  </div>

                  <div className="flex items-center gap-2">
                    <span className="text-[11px] text-slate-500">
                      Diserahkan: {formatDate(item.handed_over_at)}
                    </span>
                    {renderHandoverBadge(item.status)}
                  </div>
                </div>

                {/* Details Grid */}
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4 text-xs">
                  {/* Col 1: Title & Publisher */}
                  <div className="space-y-1">
                    <p className="text-slate-400 font-medium">Naskah Mushaf</p>
                    <p className="font-bold text-slate-900 text-sm">{reg.title || 'Naskah Mushaf'}</p>
                    <p className="text-slate-600 flex items-center gap-1">
                      <Building2 className="w-3 h-3 text-slate-400" />
                      {pub.legal_name || 'Penerbit Pemohon'}
                    </p>
                  </div>

                  {/* Col 2: Physical Details */}
                  <div className="space-y-1">
                    <p className="text-slate-400 font-medium">Kondisi & Kelengkapan Fisik</p>
                    <p className="font-bold text-slate-900 text-xs">
                      {item.volume_count} Jilid &bull; Ukuran A4 (Per Juz)
                    </p>
                    <p className="text-slate-600">
                      Kondisi: <span className="font-semibold text-slate-800">{item.condition || 'BAIK'}</span>
                    </p>
                  </div>

                  {/* Col 3: Actors (From Verifier to Distributor) */}
                  <div className="space-y-1">
                    <p className="text-slate-400 font-medium">Petugas Serah-Terima</p>
                    <p className="text-slate-700">
                      Dari:{' '}
                      <span className="font-bold text-slate-900">
                        {fromUser.name || 'Verifikator'}
                      </span>
                    </p>
                    <p className="text-slate-700">
                      Kepada:{' '}
                      <span className="font-bold text-slate-900">
                        {toUser.name || 'Distributor'}
                      </span>
                    </p>
                  </div>

                  {/* Col 4: Due Date & Status Notes */}
                  <div className="space-y-1">
                    <p className="text-slate-400 font-medium">Tenggat & Jadwal Sidang</p>
                    {item.tashih_due_at ? (
                      <div>
                        <p className="font-bold text-emerald-800 flex items-center gap-1">
                          <Calendar className="w-3.5 h-3.5 text-emerald-600" />
                          {formatDateOnly(item.tashih_due_at)}
                        </p>
                        <p className="text-[11px] text-slate-500">Target Sidang Tashih</p>
                      </div>
                    ) : isPending ? (
                      <p className="text-amber-700 font-medium italic">
                        Menunggu penetapan tenggat oleh Distributor
                      </p>
                    ) : (
                      <p className="text-slate-400 italic">-</p>
                    )}
                  </div>
                </div>

                {/* Notes if available */}
                {item.notes && (
                  <div className="p-3 bg-slate-50 rounded-xl border border-slate-200/70 text-xs text-slate-700 leading-relaxed">
                    <span className="font-bold text-slate-900 mr-1.5">Catatan BAST:</span>
                    <span className="whitespace-pre-line">{item.notes}</span>
                  </div>
                )}

                {/* Action Bar */}
                <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-3 border-t border-slate-100">
                  <div className="text-[11px] text-slate-500">
                    Tahap: <span className="font-semibold text-slate-700">{item.stage}</span>
                    {item.received_at && (
                      <span className="ml-2">
                        &bull; Diterima: <span className="font-medium">{formatDate(item.received_at)}</span>
                      </span>
                    )}
                  </div>

                  <div className="flex items-center gap-2 w-full sm:w-auto justify-end">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => openDetailModal(item)}
                      className="text-xs text-slate-700"
                    >
                      <Eye className="w-3.5 h-3.5 mr-1" />
                      Detail BAST
                    </Button>

                    {isPending && canConfirm && (
                      isTargetOfficer ? (
                        <>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => openReturnModal(item)}
                            disabled={actionLoading}
                            className="text-xs text-rose-700 border-rose-300 hover:bg-rose-50 font-semibold"
                          >
                            <AlertTriangle className="w-3.5 h-3.5 mr-1" />
                            Tolak / Kembalikan Fisik
                          </Button>

                          <Button
                            variant="primary"
                            size="sm"
                            onClick={() => openReceiveModal(item)}
                            disabled={actionLoading}
                            className="text-xs bg-[#146C43] hover:bg-[#0E5139] text-white font-bold px-4 py-2"
                          >
                            <CheckCircle2 className="w-3.5 h-3.5 mr-1" />
                            Konfirmasi Diterima (Langkah 8)
                          </Button>
                        </>
                      ) : (
                        <span className="text-xs text-slate-500 italic bg-slate-100 px-3 py-1.5 rounded-lg border border-slate-200">
                          Menunggu Petugas: {toUser.name || 'Distributor Tujuan'}
                        </span>
                      )
                    )}

                    {isReceived && (
                      <span className="text-xs font-semibold text-emerald-800 bg-emerald-50 px-3 py-1.5 rounded-lg border border-emerald-200 inline-flex items-center gap-1.5">
                        <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                        Siap Distribusi Tim Sidang
                      </span>
                    )}

                    {isReturned && (
                      <span className="text-xs font-semibold text-rose-800 bg-rose-50 px-3 py-1.5 rounded-lg border border-rose-200 inline-flex items-center gap-1.5">
                        <RotateCcw className="w-3.5 h-3.5 text-rose-600" />
                        Naskah Dikembalikan (Revisi)
                      </span>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Pagination Controls */}
      {pagination.totalPages > 1 && (
        <div className="flex items-center justify-between border-t border-slate-200 pt-4 text-xs text-slate-600">
          <span>
            Halaman {pagination.page} dari {pagination.totalPages} ({pagination.total} data)
          </span>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              disabled={pagination.page <= 1 || loading}
              onClick={() => setPagination((prev) => ({ ...prev, page: prev.page - 1 }))}
              className="text-xs"
            >
              Sebelumnya
            </Button>
            <Button
              variant="outline"
              size="sm"
              disabled={pagination.page >= pagination.totalPages || loading}
              onClick={() => setPagination((prev) => ({ ...prev, page: prev.page + 1 }))}
              className="text-xs"
            >
              Berikutnya
            </Button>
          </div>
        </div>
      )}
        </>
      )}

      {hubStage === 'ASSIGNMENT' && (
        <div className="bg-white rounded-2xl border border-slate-200/90 shadow-xs overflow-hidden">
          <div className="p-5 sm:p-6 border-b border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
                <Users className="w-5 h-5 text-emerald-700" />
                Naskah Siap Penugasan Tim Pentashih (Langkah 1 SOP)
              </h3>
              <p className="text-xs text-slate-500 mt-0.5">
                Naskah yang telah lolos verifikasi, lunas PNBP, dan fisik master telah diterima loket distributor.
              </p>
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={fetchDistributionData}
              disabled={distLoading}
              icon={<RefreshCw className={`w-3.5 h-3.5 ${distLoading ? 'animate-spin' : ''}`} />}
            >
              Segarkan
            </Button>
          </div>

          {distLoading ? (
            <div className="py-16 text-center text-slate-500">
              <RefreshCw className="w-7 h-7 animate-spin mx-auto mb-2 text-emerald-700" />
              <p className="text-xs font-semibold">Memuat naskah siap distribusi...</p>
            </div>
          ) : waitingDistRegistrations.length === 0 ? (
            <div className="py-16 text-center text-slate-500 max-w-sm mx-auto">
              <div className="w-12 h-12 rounded-full bg-slate-100 text-slate-400 flex items-center justify-center mx-auto mb-2.5">
                <Users className="w-6 h-6" />
              </div>
              <p className="text-sm font-bold text-slate-800">Tidak ada naskah yang menunggu penugasan</p>
              <p className="text-xs text-slate-500 mt-1">
                Seluruh naskah yang telah diterima fisiknya sudah ditetapkan SK Tim Pentashihnya.
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse min-w-[700px]">
                <thead>
                  <tr className="bg-slate-50/80 text-slate-600 text-[11px] font-bold uppercase tracking-wider border-b border-slate-200">
                    <th className="py-3 px-6">Nomor & Tanggal</th>
                    <th className="py-3 px-6">Judul Naskah & Penerbit</th>
                    <th className="py-3 px-6">Layanan</th>
                    <th className="py-3 px-6">Kesiapan Berkas</th>
                    <th className="py-3 px-6 text-right">Aksi</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-xs">
                  {waitingDistRegistrations.map((reg) => (
                    <tr key={reg.id} className="hover:bg-slate-50/60 transition-colors">
                      <td className="py-4 px-6">
                        <span className="font-mono font-bold text-slate-900 block">
                          {reg.registration_no}
                        </span>
                        <span className="text-[11px] text-slate-400">
                          {new Date(reg.created_at).toLocaleDateString('id-ID', {
                            day: 'numeric',
                            month: 'short',
                            year: 'numeric',
                          })}
                        </span>
                      </td>
                      <td className="py-4 px-6">
                        <span className="font-bold text-slate-900 block line-clamp-1">
                          {reg.title}
                        </span>
                        <span className="text-emerald-800 font-semibold text-[11px]">
                          {reg.publisher?.legal_name || 'Penerbit'}
                        </span>
                      </td>
                      <td className="py-4 px-6">
                        <span className="font-medium text-slate-800 block">
                          {reg.service_type?.name}
                        </span>
                        <span className="text-[11px] text-slate-400">
                          {reg.service_type?.category?.name || 'Mushaf Cetak'}
                        </span>
                      </td>
                      <td className="py-4 px-6">
                        <div className="space-y-1">
                          <span className="inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-md bg-emerald-100 text-emerald-800 border border-emerald-200">
                            <CheckCircle2 className="w-3 h-3" /> PNBP Lunas
                          </span>
                          <span className="inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-md bg-blue-100 text-blue-800 border border-blue-200 block w-fit">
                            <PackageCheck className="w-3 h-3" /> Fisik Diterima
                          </span>
                        </div>
                      </td>
                      <td className="py-4 px-6 text-right">
                        {isAdmin ? (
                          <Button
                            variant="primary"
                            size="sm"
                            onClick={() => setAssignmentModalId(reg.id)}
                            className="text-xs bg-emerald-700 hover:bg-emerald-800 text-white font-bold"
                            icon={<Users className="w-3.5 h-3.5" />}
                          >
                            Tetapkan Tim Sidang
                          </Button>
                        ) : (
                          <span className="inline-flex items-center gap-1 text-[11px] text-slate-500 font-medium bg-slate-100 px-2.5 py-1 rounded-lg">
                            <Clock className="w-3.5 h-3.5" /> Menunggu penetapan oleh Admin
                          </span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {hubStage === 'MONITORING' && (
        <div className="bg-white rounded-2xl border border-slate-200/90 shadow-xs overflow-hidden">
          <div className="p-5 sm:p-6 border-b border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
                <ShieldCheck className="w-5 h-5 text-teal-700" />
                Monitoring Sidang & Reviu Hasil Pentashihan (Langkah 2 & 3 SOP)
              </h3>
              <p className="text-xs text-slate-500 mt-0.5">
                Pantau progres telaah anggota sidang. Distributor mereviu kompilasi hasil pentashihan untuk penetapan STT atau revisi naskah.
              </p>
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={fetchDistributionData}
              disabled={distLoading}
              icon={<RefreshCw className={`w-3.5 h-3.5 ${distLoading ? 'animate-spin' : ''}`} />}
            >
              Segarkan
            </Button>
          </div>

          {distLoading ? (
            <div className="py-16 text-center text-slate-500">
              <RefreshCw className="w-7 h-7 animate-spin mx-auto mb-2 text-teal-700" />
              <p className="text-xs font-semibold">Memuat progres sidang pentashihan...</p>
            </div>
          ) : inProgressRegistrations.length === 0 ? (
            <div className="py-16 text-center text-slate-500 max-w-sm mx-auto">
              <div className="w-12 h-12 rounded-full bg-slate-100 text-slate-400 flex items-center justify-center mx-auto mb-2.5">
                <BookOpen className="w-6 h-6" />
              </div>
              <p className="text-sm font-bold text-slate-800">Tidak ada sidang aktif saat ini</p>
              <p className="text-xs text-slate-500 mt-1">
                Naskah yang telah ditetapkan tim pentashihnya akan dimonitor progresnya di sini.
              </p>
            </div>
          ) : (
            <div className="divide-y divide-slate-100">
              {inProgressRegistrations.map((reg) => {
                const assignments = reg.assignments || [];
                const maxIter = assignments.reduce((max, a) => Math.max(max, a.iteration || 1), 1);
                const currentAssignments = assignments.filter((a) => (a.iteration || 1) === maxIter);
                const totalMembers = currentAssignments.length;
                const completedMembers = currentAssignments.filter(
                  (a) => a.status === 'COMPLETED' && a.reviews?.length > 0
                ).length;
                const isReadyToReview = totalMembers > 0 && completedMembers === totalMembers;

                return (
                  <div
                    key={reg.id}
                    className="p-5 sm:p-6 hover:bg-slate-50/60 transition-colors flex flex-col md:flex-row md:items-center justify-between gap-4"
                  >
                    <div className="space-y-2 flex-1 min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="font-mono text-xs font-bold text-emerald-800 bg-emerald-50 px-2 py-0.5 rounded-md border border-emerald-200">
                          {reg.registration_no}
                        </span>
                        <span className="text-[11px] font-semibold px-2 py-0.5 rounded-md bg-slate-100 text-slate-700 border border-slate-200">
                          Iterasi #{maxIter}
                        </span>
                        {isReadyToReview ? (
                          <span className="inline-flex items-center gap-1 text-[11px] font-bold px-2 py-0.5 rounded-md bg-teal-100 text-teal-900 border border-teal-300">
                            <CheckCircle2 className="w-3 h-3" /> Seluruh Pentashih Selesai ({completedMembers}/{totalMembers})
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 text-[11px] font-medium px-2 py-0.5 rounded-md bg-amber-50 text-amber-900 border border-amber-200">
                            <Clock className="w-3 h-3" /> Sidang Berjalan: {completedMembers} dari {totalMembers} Selesai
                          </span>
                        )}
                      </div>

                      <div>
                        <h4 className="text-base font-bold text-slate-900 line-clamp-1">
                          {reg.title}
                        </h4>
                        <p className="text-xs text-slate-500 mt-0.5">
                          <span className="font-semibold text-slate-700">
                            {reg.publisher?.legal_name || 'Penerbit'}
                          </span>
                          {' • '}
                          <span>{reg.service_type?.name}</span>
                        </p>
                      </div>

                      {/* Anggota Pentashih Badges */}
                      <div className="flex flex-wrap items-center gap-2 pt-1">
                        <span className="text-[11px] font-semibold text-slate-500">Anggota Sidang:</span>
                        {currentAssignments.map((a) => {
                          const rev = a.reviews?.[0];
                          const isDone = a.status === 'COMPLETED' && rev;
                          return (
                            <span
                              key={a.id}
                              className={clsx(
                                'inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[11px]',
                                isDone
                                  ? rev.result === 'PASSED'
                                    ? 'bg-emerald-50 text-emerald-800 border border-emerald-200 font-semibold'
                                    : 'bg-amber-50 text-amber-900 border border-amber-200 font-semibold'
                                  : 'bg-slate-100 text-slate-600 border border-slate-200'
                              )}
                            >
                              {isDone ? (
                                rev.result === 'PASSED' ? (
                                  <Check className="w-3 h-3 text-emerald-700" />
                                ) : (
                                  <AlertTriangle className="w-3 h-3 text-amber-700" />
                                )
                              ) : (
                                <Clock className="w-3 h-3 text-slate-400" />
                              )}
                              <span>{a.assignee?.name || 'Pentashih'}</span>
                            </span>
                          );
                        })}
                      </div>
                    </div>

                    <div className="flex items-center justify-end gap-2 shrink-0">
                      <Button
                        variant="primary"
                        size="sm"
                        onClick={() => setReviewDialogRegId(reg.id)}
                        className={clsx(
                          'text-xs font-bold',
                          isReadyToReview
                            ? 'bg-teal-700 hover:bg-teal-800 text-white shadow-xs'
                            : 'bg-slate-800 hover:bg-slate-900 text-white'
                        )}
                        icon={<ShieldCheck className="w-4 h-4" />}
                      >
                        {isReadyToReview ? 'Reviu Hasil Sidang (Langkah 3)' : 'Lihat Hasil Anggota'}
                      </Button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* Modal Konfirmasi Penerimaan Master Fisik (Langkah 8 SOP) */}
      {receiveModalOpen && selectedHandover && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-fadeIn">
          <div className="bg-white rounded-2xl max-w-lg w-full p-6 space-y-4 shadow-2xl border border-slate-200">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2 text-emerald-800 font-bold text-base">
                <CheckCircle2 className="w-5 h-5 text-emerald-600" />
                Konfirmasi Penerimaan Master Fisik (Langkah 8 SOP)
              </div>
              <button
                onClick={() => setReceiveModalOpen(false)}
                className="text-slate-400 hover:text-slate-600 p-1 rounded-lg"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-3 bg-emerald-50/70 border border-emerald-200 rounded-xl space-y-1 text-xs text-emerald-900">
              <p className="font-bold">Naskah: {selectedHandover.registration?.title}</p>
              <p>Nomor Registrasi: {selectedHandover.registration?.registration_no}</p>
              <p>No. BAST: {selectedHandover.receipt_no}</p>
            </div>

            {receiveModalError && (
              <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-xs text-rose-700 flex items-center gap-2">
                <AlertCircle className="w-4 h-4 text-rose-600 flex-shrink-0" />
                <span>{receiveModalError}</span>
              </div>
            )}

            <form onSubmit={handleReceiveSubmit} className="space-y-4 text-xs">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-slate-800 mb-1">
                    Kondisi Fisik Master <span className="text-rose-600">*</span>
                  </label>
                  <select
                    value={receiveCondition}
                    onChange={(e) => setReceiveCondition(e.target.value)}
                    className="w-full p-2.5 rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-emerald-600/20 focus:border-emerald-600 font-medium"
                    required
                  >
                    <option value="BAIK">BAIK (Rapi & Lengkap)</option>
                    <option value="LENGKAP">LENGKAP (30 Juz A4)</option>
                    <option value="CUKUP">CUKUP (Dapat Disidangkan)</option>
                  </select>
                </div>

                <div>
                  <label className="block font-bold text-slate-800 mb-1">
                    Jumlah Jilid Fisik <span className="text-rose-600">*</span>
                  </label>
                  <input
                    type="number"
                    min="1"
                    max="60"
                    value={receiveVolumeCount}
                    onChange={(e) => setReceiveVolumeCount(e.target.value)}
                    className="w-full p-2.5 rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-emerald-600/20 focus:border-emerald-600 font-medium"
                    required
                  />
                </div>
              </div>

              <div>
                <label className="block font-bold text-slate-800 mb-1">
                  Tenggat Waktu Pentashihan (Tashih Due At) <span className="text-rose-600">*</span>
                </label>
                <input
                  type="date"
                  value={tashihDueAt}
                  onChange={(e) => setTashihDueAt(e.target.value)}
                  className="w-full p-2.5 rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-emerald-600/20 focus:border-emerald-600 font-semibold text-slate-900"
                  required
                />
                <span className="text-[11px] text-slate-500 mt-1 block">
                  Standar target pentashihan tim sidang adalah 30 hari kalender sejak master fisik diterima resmi di loket.
                </span>
              </div>

              <div>
                <label className="block font-bold text-slate-800 mb-1">
                  Catatan Penerimaan Loket (Opsional)
                </label>
                <textarea
                  value={receiveNotes}
                  onChange={(e) => setReceiveNotes(e.target.value)}
                  placeholder="Catatan kondisi jilid atau penanda naskah saat diterima di loket..."
                  rows={3}
                  className="w-full p-2.5 rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-emerald-600/20 focus:border-emerald-600"
                />
              </div>

              <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-slate-100">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setReceiveModalOpen(false)}
                  disabled={actionLoading}
                  className="text-xs"
                >
                  Batal
                </Button>
                <Button
                  type="submit"
                  disabled={actionLoading}
                  className="text-xs bg-[#146C43] hover:bg-[#0E5139] text-white font-bold px-5 py-2.5"
                >
                  {actionLoading ? 'Memproses...' : 'Sahkan Penerimaan & Lanjut Distribusi'}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal Penolakan / Pengembalian Fisik Cacat */}
      {returnModalOpen && selectedHandover && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-fadeIn">
          <div className="bg-white rounded-2xl max-w-lg w-full p-6 space-y-4 shadow-2xl border border-slate-200">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2 text-rose-700 font-bold text-base">
                <AlertTriangle className="w-5 h-5 text-rose-600" />
                Kembalikan Master Fisik (Cacat Fisik)
              </div>
              <button
                onClick={() => setReturnModalOpen(false)}
                className="text-slate-400 hover:text-slate-600 p-1 rounded-lg"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <p className="text-xs text-slate-600 leading-relaxed">
              Master fisik yang dikembalikan akan memindahkan status pengajuan naskah kembali ke{' '}
              <span className="font-bold text-amber-700">Perlu Perbaikan Fisik (PHYSICAL_HANDOVER_CORRECTION_REQUIRED)</span>. Pembayaran PNBP yang telah diverifikasi tetap sah (tanpa tagihan ulang) dan penerbit hanya perlu memperbaiki master fisik.
            </p>

            {returnModalError && (
              <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-xs text-rose-700 flex items-center gap-2">
                <AlertCircle className="w-4 h-4 text-rose-600 flex-shrink-0" />
                <span>{returnModalError}</span>
              </div>
            )}

            <form onSubmit={handleReturnSubmit} className="space-y-4 text-xs">
              <div>
                <label className="block font-bold text-slate-800 mb-1">
                  Alasan Pengembalian / Kerusakan Fisik <span className="text-rose-600">*</span>
                </label>
                <textarea
                  value={returnReason}
                  onChange={(e) => setReturnReason(e.target.value)}
                  placeholder="Contoh: Jilid 14 halaman 12 robek dan buram, tidak memenuhi syarat naskah cetak A4..."
                  rows={4}
                  className="w-full p-2.5 rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-rose-500/20 focus:border-rose-500"
                  required
                />
                <span className="text-[11px] text-slate-400">Minimal 5 karakter.</span>
              </div>

              <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-slate-100">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setReturnModalOpen(false)}
                  disabled={actionLoading}
                  className="text-xs"
                >
                  Batal
                </Button>
                <Button
                  type="submit"
                  disabled={actionLoading || returnReason.trim().length < 5}
                  className="text-xs bg-rose-600 hover:bg-rose-700 text-white font-bold px-5 py-2.5"
                >
                  {actionLoading ? 'Mengembalikan...' : 'Kembalikan Master Fisik'}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal Detail BAST */}
      {detailModalOpen && detailHandover && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-fadeIn">
          <div className="bg-white rounded-2xl max-w-xl w-full p-6 space-y-4 shadow-2xl border border-slate-200">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2 text-slate-900 font-bold text-base">
                <FileText className="w-5 h-5 text-emerald-700" />
                Detail Berita Acara Serah Terima (BAST) Fisik
              </div>
              <button
                onClick={() => setDetailModalOpen(false)}
                className="text-slate-400 hover:text-slate-600 p-1 rounded-lg"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-3 text-xs">
              <div className="grid grid-cols-2 gap-3 p-3 bg-slate-50 rounded-xl border border-slate-200/70">
                <div>
                  <span className="text-slate-400 block font-medium">Nomor BAST:</span>
                  <span className="font-mono font-bold text-slate-900 text-sm">
                    {detailHandover.receipt_no}
                  </span>
                </div>
                <div>
                  <span className="text-slate-400 block font-medium">Status Serah-Terima:</span>
                  <div className="mt-1">{renderHandoverBadge(detailHandover.status)}</div>
                </div>
                <div>
                  <span className="text-slate-400 block font-medium">Nomor Registrasi:</span>
                  <span className="font-mono font-semibold text-emerald-800">
                    {detailHandover.registration?.registration_no}
                  </span>
                </div>
                <div>
                  <span className="text-slate-400 block font-medium">Judul Naskah:</span>
                  <span className="font-bold text-slate-900">{detailHandover.registration?.title}</span>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="p-3 border border-slate-200 rounded-xl space-y-1">
                  <p className="font-bold text-slate-800">Pihak Pertama (Menyerahkan)</p>
                  <p className="text-slate-600">Nama: {detailHandover.from_user?.name || '-'}</p>
                  <p className="text-slate-600">NIP: {detailHandover.from_user?.nip || '-'}</p>
                  <p className="text-slate-500">Waktu: {formatDate(detailHandover.handed_over_at)}</p>
                </div>

                <div className="p-3 border border-slate-200 rounded-xl space-y-1">
                  <p className="font-bold text-slate-800">Pihak Kedua (Menerima)</p>
                  <p className="text-slate-600">Nama: {detailHandover.to_user?.name || '-'}</p>
                  <p className="text-slate-600">NIP: {detailHandover.to_user?.nip || '-'}</p>
                  <p className="text-slate-500">
                    Waktu Terima: {detailHandover.received_at ? formatDate(detailHandover.received_at) : '-'}
                  </p>
                </div>
              </div>

              <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl space-y-1">
                <p className="font-bold text-slate-800">Kondisi & Kelengkapan</p>
                <p className="text-slate-700">
                  Jumlah: <span className="font-semibold">{detailHandover.volume_count} Jilid A4 (Per Juz)</span>
                </p>
                <p className="text-slate-700">
                  Kondisi: <span className="font-semibold">{detailHandover.condition || 'BAIK'}</span>
                </p>
                {detailHandover.tashih_due_at && (
                  <p className="text-emerald-800 font-bold">
                    Tenggat Pentashihan: {formatDateOnly(detailHandover.tashih_due_at)}
                  </p>
                )}
                {detailHandover.notes && (
                  <p className="text-slate-600 pt-1 border-t border-slate-200 whitespace-pre-line">
                    Catatan: {detailHandover.notes}
                  </p>
                )}
              </div>
            </div>

            <div className="flex justify-end pt-3 border-t border-slate-100">
              <Button
                variant="outline"
                onClick={() => setDetailModalOpen(false)}
                className="text-xs"
              >
                Tutup
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default DistributorHandoverInboxPage;

