import React, { useState, useEffect, useMemo, useRef } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useAuth } from '@/features/auth/AuthContext';
import { handoverApi } from '@/api/handover.api';
import { useDistributionQueues } from './hooks/useDistributionQueues';
import { StatusBadge } from '@/components/ui/StatusBadge';
import { Button } from '@/components/ui/Button';
import { PageHeader } from '@/components/ui/PageHeader';
import { ManualTeamAssignmentDialog } from './ManualTeamAssignmentDialog';
import { DistributorReviewDialog } from './DistributorReviewDialog';
import { TeamAssignmentPanel } from './components/TeamAssignmentPanel';
import { ReviewProgressPanel } from './components/ReviewProgressPanel';
import { HandoverPanel } from './components/HandoverPanel';
import { HandoverDialogs } from './components/HandoverDialogs';
import {
  PackageCheck,
  RefreshCw,
  Clock,
  AlertCircle,
  CheckCircle2,
  AlertTriangle,
  ShieldCheck,
  Users,
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

  const { waitingDistRegistrations, inProgressRegistrations, distLoading, fetchDistributionData } = useDistributionQueues(hubStage);

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
  const isAdmin = isSuperAdmin || userRoles.includes('HELPER_ADMIN');
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

    if (returnReason.trim().length < 5 || returnReason.trim().length > 1000) {
      setReturnModalError('Alasan pengembalian / penolakan master fisik harus 5–1000 karakter.');
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
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md text-xs font-semibold bg-civic-warningSoft text-civic-warning border border-civic-warningLine">
            <Clock className="w-3.5 h-3.5 text-civic-warning" />
            Menunggu Konfirmasi
          </span>
        );
      case 'RECEIVED':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md text-xs font-semibold bg-brand-50 text-brand-800 border border-brand-100">
            <CheckCircle2 className="w-3.5 h-3.5 text-brand-700" />
            Diterima di Meja Pentashihan
          </span>
        );
      case 'RETURNED':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md text-xs font-semibold bg-civic-dangerSoft text-civic-danger border border-civic-dangerLine">
            <AlertTriangle className="w-3.5 h-3.5 text-civic-danger" />
            Dikembalikan (Cacat Fisik)
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md text-xs font-semibold bg-surface-subtle text-ink border border-line">
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
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-md text-xs font-bold bg-brand-50 text-brand-800 border border-brand-100">
              <ShieldCheck className="w-3.5 h-3.5 text-brand-700" />
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
        <div className="p-4 bg-brand-50 border border-brand-100 rounded-xl flex items-center justify-between text-brand-800 text-sm shadow-xs animate-fadeIn">
          <div className="flex items-center gap-2.5">
            <CheckCircle2 className="w-5 h-5 text-brand-700 flex-shrink-0" />
            <span className="font-medium">{successMessage}</span>
          </div>
          <button
            onClick={() => setSuccessMessage(null)}
            className="text-xs text-brand-700 hover:underline font-bold px-2 py-1"
          >
            Tutup
          </button>
        </div>
      )}

      {error && (
        <div className="p-4 bg-civic-dangerSoft border border-civic-dangerLine rounded-xl flex items-center justify-between text-civic-danger text-sm shadow-xs animate-fadeIn">
          <div className="flex items-center gap-2.5">
            <AlertCircle className="w-5 h-5 text-civic-danger flex-shrink-0" />
            <span>{error}</span>
          </div>
          <button
            onClick={() => setError(null)}
            className="text-xs text-civic-danger hover:underline font-bold px-2 py-1"
          >
            Tutup
          </button>
        </div>
      )}

      {/* 3-Stage Workflow Hub Navigation */}
      <div className="flex items-center gap-2 p-1.5 bg-surface-subtle/90 rounded-2xl border border-line overflow-x-auto">
        <button
          type="button"
          onClick={() => {
            setHubStage('HANDOVER');
            setSearchParams({ stage: 'HANDOVER' });
          }}
          className={clsx(
            'flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold transition-all whitespace-nowrap cursor-pointer',
            hubStage === 'HANDOVER'
              ? 'bg-white text-brand-800 shadow-xs'
              : 'text-ink-muted hover:text-ink'
          )}
        >
          <PackageCheck className="w-4 h-4" />
          <span>1. Serah-Terima Fisik dari Verifikator</span>
          <span className="px-2 py-0.5 rounded-full bg-surface-strong text-ink text-[10px]">
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
              ? 'bg-white text-brand-800 shadow-xs'
              : 'text-ink-muted hover:text-ink'
          )}
        >
          <Users className="w-4 h-4" />
          <span>2. Siap Penugasan Tim SK</span>
          <span className="px-2 py-0.5 rounded-full bg-surface-strong text-ink text-[10px]">
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
              ? 'bg-white text-brand-800 shadow-xs'
              : 'text-ink-muted hover:text-ink'
          )}
        >
          <ShieldCheck className="w-4 h-4" />
          <span>3. Monitoring Sidang & Reviu</span>
          <span className="px-2 py-0.5 rounded-full bg-surface-strong text-ink text-[10px]">
            {inProgressRegistrations.length}
          </span>
        </button>
      </div>

      {hubStage === 'HANDOVER' && (
        <HandoverPanel
          pendingCount={pendingCount}
          handovers={handovers}
          error={error}
          pagination={pagination}
          activeTab={activeTab}
          setActiveTab={setActiveTab}
          loading={loading}
          setPagination={setPagination}
          searchQuery={searchQuery}
          setSearchQuery={setSearchQuery}
          submittedSearch={submittedSearch}
          setSubmittedSearch={setSubmittedSearch}
          handleSearchSubmit={handleSearchSubmit}
          handleCopyText={handleCopyText}
          copiedReceipt={copiedReceipt}
          formatDate={formatDate}
          formatDateOnly={formatDateOnly}
          renderHandoverBadge={renderHandoverBadge}
          openDetailModal={openDetailModal}
          canConfirm={canConfirm}
          openReturnModal={openReturnModal}
          openReceiveModal={openReceiveModal}
          isSuperAdmin={isSuperAdmin}
          currentUser={currentUser}
          actionLoading={actionLoading}
        />
      )}


      {hubStage === 'ASSIGNMENT' && (
        <TeamAssignmentPanel
          distLoading={distLoading}
          waitingDistRegistrations={waitingDistRegistrations}
          fetchDistributionData={fetchDistributionData}
          isAdmin={isAdmin}
          isDistributor={isDistributor}
          currentUserId={currentUser?.id}
          setAssignmentModalId={setAssignmentModalId}
        />
      )}

      {hubStage === 'MONITORING' && (
        <ReviewProgressPanel
          distLoading={distLoading}
          inProgressRegistrations={inProgressRegistrations}
          fetchDistributionData={fetchDistributionData}
          setReviewDialogRegId={setReviewDialogRegId}
        />
      )}


      {assignmentModalId && (
        <ManualTeamAssignmentDialog
          id={assignmentModalId}
          onClose={() => setAssignmentModalId(null)}
          onAssigned={() => {
            setAssignmentModalId(null);
            fetchDistributionData();
          }}
        />
      )}

      {reviewDialogRegId && (
        <DistributorReviewDialog
          registrationId={reviewDialogRegId}
          onClose={() => setReviewDialogRegId(null)}
          onSuccess={() => {
            setReviewDialogRegId(null);
            fetchDistributionData();
          }}
        />
      )}

      <HandoverDialogs
        receiveModalOpen={receiveModalOpen}
        selectedHandover={selectedHandover}
        setReceiveModalOpen={setReceiveModalOpen}
        receiveModalError={receiveModalError}
        handleReceiveSubmit={handleReceiveSubmit}
        receiveCondition={receiveCondition}
        setReceiveCondition={setReceiveCondition}
        receiveVolumeCount={receiveVolumeCount}
        setReceiveVolumeCount={setReceiveVolumeCount}
        tashihDueAt={tashihDueAt}
        setTashihDueAt={setTashihDueAt}
        receiveNotes={receiveNotes}
        setReceiveNotes={setReceiveNotes}
        actionLoading={actionLoading}
        returnModalOpen={returnModalOpen}
        setReturnModalOpen={setReturnModalOpen}
        returnModalError={returnModalError}
        handleReturnSubmit={handleReturnSubmit}
        returnReason={returnReason}
        setReturnReason={setReturnReason}
        detailModalOpen={detailModalOpen}
        detailHandover={detailHandover}
        setDetailModalOpen={setDetailModalOpen}
        formatDate={formatDate}
        formatDateOnly={formatDateOnly}
        renderHandoverBadge={renderHandoverBadge}
      />
    </div>
  );
};

export default DistributorHandoverInboxPage;

