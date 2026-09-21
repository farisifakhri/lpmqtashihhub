import React, { useState, useEffect, useMemo, useRef } from 'react';
import { useNavigate, useSearchParams, Link } from 'react-router-dom';
import { useAuth } from '@/features/auth/AuthContext';
import { verificationApi } from '@/api/verification.api';
import { PageHeader } from '@/components/ui/PageHeader';
import { StatusBadge } from '@/components/ui/StatusBadge';
import { SlaIndicator } from '@/components/ui/SlaIndicator';
import { StatusSummary } from '@/components/ui/StatusSummary';
import { PrimaryTaskCard } from '@/components/ui/PrimaryTaskCard';
import { MasterDetailLayout } from '@/components/layout/MasterDetailLayout';
import { EmptyState } from '@/components/ui/EmptyState';
import { ErrorState } from '@/components/ui/ErrorState';
import { Button } from '@/components/ui/Button';
import { QueueOverview } from '@/components/common/QueueOverview';
import { AssignVerificationDialog } from './AssignVerificationDialog';
import { RevokeAssignmentDialog } from './RevokeAssignmentDialog';
import { ReassignVerificationDialog } from './ReassignVerificationDialog';
import {
  ClipboardCheck,
  Search,
  RefreshCw,
  Clock,
  FileText,
  Building2,
  PackageCheck,
  ArrowRight,
  Play,
  CheckCircle2,
  AlertTriangle,
  Calendar,
  Layers,
  ShieldCheck,
  Check,
  ChevronRight,
  UserCheck,
  X,
} from 'lucide-react';
import { clsx } from 'clsx';

function formatWaitingTime(dateString) {
  if (!dateString) return null;
  const diffMs = Date.now() - new Date(dateString).getTime();
  if (diffMs < 0) return 'Baru saja';
  const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
  if (diffHours < 1) return '< 1 jam';
  if (diffHours < 24) return `${diffHours} jam`;
  const diffDays = Math.floor(diffHours / 24);
  return `${diffDays} hari`;
}

export const VerifikatorInboxPage = () => {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const { currentUser } = useAuth();
  const userRoles = currentUser?.roles || (currentUser?.role ? [currentUser.role] : []);
  const isHead = userRoles.includes('KEPALA_LPMQ') || currentUser?.role === 'KEPALA_LPMQ';
  const isVerifier = userRoles.includes('VERIFIKATOR') || currentUser?.role === 'VERIFIKATOR';
  const isAdmin = userRoles.includes('SUPERADMIN') || userRoles.includes('ADMIN') || currentUser?.role === 'SUPERADMIN';

  const normalizeTab = (tab) => {
    if (tab === 'NEED_APPROVAL') return 'WAITING_APPROVAL';
    return tab;
  };

  const defaultTab = isHead ? 'NEED_ASSIGNMENT' : (isAdmin ? 'WAITING_APPROVAL' : 'ASSIGNED');
  const rawUrlTab = searchParams.get('tab');
  const normalizedUrlTab = normalizeTab(rawUrlTab);
  const initialTab = (!isHead && normalizedUrlTab === 'NEED_ASSIGNMENT') ? defaultTab : (normalizedUrlTab || defaultTab);

  const [assignments, setAssignments] = useState([]);
  const [selectedId, setSelectedId] = useState(null);
  const [pagination, setPagination] = useState({ total: 0, page: 1, limit: 20, totalPages: 1 });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [activeTab, setActiveTab] = useState(initialTab);
  const [searchQuery, setSearchQuery] = useState('');
  const [startingId, setStartingId] = useState(null);
  const [submittedSearch, setSubmittedSearch] = useState('');
  const [assignDialogOpen, setAssignDialogOpen] = useState(false);
  const [revokeDialogOpen, setRevokeDialogOpen] = useState(false);
  const [reassignDialogOpen, setReassignDialogOpen] = useState(false);
  const [successMessage, setSuccessMessage] = useState(null);
  const requestId = useRef(0);

  const fetchAssignments = async () => {
    const request = ++requestId.current;
    setLoading(true);
    setError(null);
    try {
      if (activeTab === 'NEED_ASSIGNMENT') {
        const params = {
          page: pagination.page,
          limit: pagination.limit,
        };
        if (submittedSearch) {
          params.search = submittedSearch;
        }

        const res = await verificationApi.listUnassignedRegistrations(params);
        if (request !== requestId.current) return;
        if (res?.data) {
          const items = res.data.items || [];
          const normalized = items.map((reg) => ({
            id: reg.id,
            isUnassigned: true,
            registration: reg,
            status: 'READY_FOR_VERIFICATION',
            assigned_at: reg.stage_entered_at || reg.created_at,
            due_at: null,
            documents: [],
          }));
          setAssignments(normalized);
          if (res.data.pagination) {
            setPagination(res.data.pagination);
          }
          if (normalized.length > 0) {
            setSelectedId((prev) => (prev && normalized.some(n => n.id === prev) ? prev : normalized[0].id));
          } else {
            setSelectedId(null);
          }
        }
        return;
      }

      const params = {
        page: pagination.page,
        limit: pagination.limit,
      };
      if (activeTab === 'WAITING_APPROVAL' || activeTab === 'NEED_APPROVAL') {
        params.registration_status = 'WAITING_VERIFICATION_APPROVAL';
      } else if (activeTab !== 'ALL') {
        params.status = activeTab;
      }
      if (submittedSearch) {
        params.search = submittedSearch;
      }

      const res = await verificationApi.listAssignments(params);
      if (request !== requestId.current) return;
      if (res?.data) {
        const items = res.data.items || [];
        setAssignments(items);
        if (res.data.pagination) {
          setPagination(res.data.pagination);
        }
        if (items.length > 0) {
          setSelectedId((prev) => (prev && items.some(n => n.id === prev) ? prev : items[0].id));
        } else {
          setSelectedId(null);
        }
      }
    } catch (err) {
      if (request === requestId.current) setError(err.message || 'Gagal memuat daftar penugasan verifikasi.');
    } finally {
      if (request === requestId.current) setLoading(false);
    }
  };

  const handleTabChange = (tab) => {
    const targetTab = normalizeTab(tab);
    setActiveTab(targetTab);
    setPagination((p) => ({ ...p, page: 1 }));
    setSelectedId(null);
    setSearchParams({ tab: targetTab });
  };

  useEffect(() => {
    const tabFromUrl = normalizeTab(searchParams.get('tab'));
    if (tabFromUrl && tabFromUrl !== activeTab) {
      setActiveTab(tabFromUrl);
      setPagination((p) => ({ ...p, page: 1 }));
      setSelectedId(null);
    }
  }, [searchParams]);

  useEffect(() => {
    fetchAssignments();
    return () => { requestId.current += 1; };
  }, [activeTab, pagination.page, submittedSearch]);

  const handleSearchSubmit = (e) => {
    e.preventDefault();
    if (pagination.page === 1 && submittedSearch === searchQuery.trim()) fetchAssignments();
    setSubmittedSearch(searchQuery.trim());
    setPagination((prev) => ({ ...prev, page: 1 }));
  };

  const handleStartVerification = async (assignmentId) => {
    setStartingId(assignmentId);
    try {
      await verificationApi.startVerification(assignmentId);
      navigate(`/internal/verifications/${assignmentId}`);
    } catch (err) {
      setError(err.message || 'Gagal memulai pemeriksaan.');
      setStartingId(null);
    }
  };

  // Selected assignment object
  const selectedAssignment = useMemo(() => {
    return assignments.find((a) => a.id === selectedId) || assignments[0] || null;
  }, [assignments, selectedId]);

  const taskCardInfo = useMemo(() => {
    if (!selectedAssignment) return null;
    const status = selectedAssignment.status;
    const returnReason = selectedAssignment.return_reason;

    if (selectedAssignment.isUnassigned) {
      if (!isHead) return null;
      return {
        title: 'Naskah Siap Ditugaskan ke Verifikator',
        description: 'Master fisik telah diterima oleh loket. Terbitkan Nota Dinas dan tetapkan Verifikator untuk memulai pemeriksaan naskah (Langkah 4 SOP).',
        actionLabel: 'Tugaskan Verifikator',
        actionIcon: <UserCheck className="w-4 h-4" />,
        isAssign: true,
      };
    }

    if (status === 'ASSIGNED') {
      const isAssignedToUser = !selectedAssignment.verifier_id || selectedAssignment.verifier_id === currentUser?.id || selectedAssignment.verifier?.id === currentUser?.id;
      if (!isVerifier || !isAssignedToUser) {
        return {
          title: 'Menunggu Verifikator Memulai Pemeriksaan',
          description: 'Nota Dinas telah diterbitkan. Menunggu verifikator yang ditugaskan untuk memulai pemeriksaan lembar kerja.',
          actionLabel: 'Lihat Detail Penugasan',
          actionIcon: <FileText className="w-4 h-4" />,
          isStart: false,
        };
      }
      return {
        title: 'Pemeriksaan Berkas & Master Fisik Siap Dimulai',
        description: 'Nota Dinas telah diterbitkan. Lakukan telaah 4 butir checklist: data registrasi, berkas digital, master fisik A4 per juz, dan format rasm naskah.',
        actionLabel: 'Mulai Pemeriksaan',
        actionIcon: <Play className="w-4 h-4 fill-white" />,
        isStart: true,
      };
    }

    if (status === 'IN_PROGRESS') {
      if (returnReason) {
        return {
          title: 'Draf Dikembalikan oleh Kepala LPMQ',
          description: `Catatan perbaikan: "${returnReason}". Silakan periksa kembali berkas/catatan dan ajukan draf revisi.`,
          actionLabel: 'Revisi Pemeriksaan',
          actionIcon: <RefreshCw className="w-4 h-4" />,
          isStart: false,
        };
      }
      return {
        title: 'Lanjutkan Lembar Kerja Pemeriksaan Verifikator',
        description: 'Lengkapi lembar catatan koreksi dan susun draf Surat Hasil Telaah serta Berita Acara untuk diajukan ke Kepala LPMQ.',
        actionLabel: 'Lanjutkan Pemeriksaan',
        actionIcon: <Play className="w-4 h-4 fill-white" />,
        isStart: false,
      };
    }

    if (status === 'WAITING_APPROVAL') {
      return {
        title: 'Draft Sedang Diperiksa Kepala LPMQ',
        description: 'Draf hasil verifikasi telah diajukan. Saat ini sedang dalam proses penelaahan oleh Kepala LPMQ. Tidak ada tindakan yang diperlukan dari Verifikator saat ini.',
        actionLabel: 'Lihat Detail Draf',
        actionIcon: <FileText className="w-4 h-4" />,
        isStart: false,
      };
    }

    if (status === 'WAITING_SIGNATURE') {
      return {
        title: 'Menunggu Penandatanganan Dokumen',
        description: 'Draf telah disetujui Kepala LPMQ. Proses penandatanganan digital Berita Acara dan Surat Pemberitahuan sedang berlangsung.',
        actionLabel: 'Buka Lembar Penandatanganan',
        actionIcon: <ShieldCheck className="w-4 h-4" />,
        isStart: false,
      };
    }

    if (status === 'READY_TO_SEND') {
      return {
        title: 'Dokumen Siap Dikirim kepada Penerbit',
        description: 'Seluruh tanda tangan digital telah lengkap. Dokumen siap dikirimkan kepada pemohon penerbit via email resmi.',
        actionLabel: 'Kirim Dokumen ke Penerbit',
        actionIcon: <ArrowRight className="w-4 h-4" />,
        isStart: false,
      };
    }

    return {
      title: 'Verifikasi Selesai & Surat Telah Dikirimkan',
      description: 'Pemeriksaan naskah telah selesai dan surat hasil verifikasi telah diterbitkan ke pemohon.',
      actionLabel: 'Lihat Arsip Verifikasi',
      actionIcon: <FileText className="w-4 h-4" />,
      isStart: false,
    };
  }, [selectedAssignment, isHead]);

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-16">
      {/* Formal Institutional Header */}
      <PageHeader
        breadcrumbs={[
          { label: 'Aplikasi Internal', path: '/internal' },
          { label: isHead ? 'Persetujuan Verifikasi' : 'Antrean Verifikasi' },
        ]}
        title={isHead ? 'Persetujuan Hasil Verifikasi & Penugasan' : 'Antrean Penugasan Verifikasi Berkas'}
        subtitle={
          isHead
            ? 'Daftar pengajuan naskah mushaf untuk penerbitan Nota Dinas penugasan dan persetujuan draf surat hasil telaah (Langkah 4 SOP).'
            : 'Daftar naskah mushaf yang ditugaskan oleh Kepala LPMQ melalui Nota Dinas resmi. Pemeriksaan mencakup validasi data pendaftaran, berkas digital, dan master fisik A4.'
        }
        actions={
          <Button
            variant="outline"
            size="sm"
            onClick={fetchAssignments}
            disabled={loading}
            className="text-xs"
          >
            <RefreshCw className={clsx('w-3.5 h-3.5 mr-1.5', loading && 'animate-spin')} />
            Segarkan Data
          </Button>
        }
      />

      {error ? (
        <ErrorState
          title="Kendala Antrean Verifikasi"
          message={error}
          onRetry={fetchAssignments}
          retrying={loading}
        />
      ) : (
        <>
          {/* Success Notification Banner */}
          {successMessage && (
            <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-4 flex items-center justify-between gap-3 text-xs text-emerald-900 shadow-2xs">
              <div className="flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-700 shrink-0" />
                <span className="font-semibold">
                  {typeof successMessage === 'string' ? successMessage : successMessage.text}
                </span>
                {typeof successMessage === 'object' && successMessage.assignmentId && (
                  <Link
                    to={`/internal/verifications/${successMessage.assignmentId}`}
                    className="ml-2 font-bold text-emerald-800 underline hover:text-emerald-950"
                  >
                    Buka Detail Penugasan &rarr;
                  </Link>
                )}
              </div>
              <button
                type="button"
                onClick={() => setSuccessMessage(null)}
                className="text-emerald-700 hover:text-emerald-900 p-1 rounded-md"
                aria-label="Tutup pesan sukses"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
          )}


          {/* FIFO and Volume Queue Metadata Bar */}
          <QueueOverview
            total={pagination.total}
            oldest={assignments[0]?.queue_entered_at || assignments[0]?.assigned_at}
            fifo={activeTab !== 'COMPLETED'}
            loading={loading}
          />

          {/* Master Detail Workspace */}
          <MasterDetailLayout
            hasSelection={Boolean(selectedAssignment)}
            onClearSelection={() => setSelectedId(null)}
            masterWidth="lg:w-5/12"
            detailWidth="lg:w-7/12"
            masterContent={
              <div className="space-y-3">
                {/* Controlled Filter & Search Box */}
                <div className="bg-white rounded-xl border border-slate-200 p-3.5 shadow-2xs space-y-3">
                  {/* Segmented Control */}
                  <div className="flex items-center gap-1 p-1 bg-slate-100 rounded-lg text-xs font-semibold overflow-x-auto">
                    {isHead ? (
                      <>
                        <button
                          type="button"
                          onClick={() => handleTabChange('NEED_ASSIGNMENT')}
                          className={clsx(
                            'flex-1 py-1.5 px-2 rounded-md transition-colors text-center font-bold text-xs whitespace-nowrap',
                            activeTab === 'NEED_ASSIGNMENT'
                              ? 'bg-white text-emerald-900 shadow-2xs'
                              : 'text-slate-600 hover:text-slate-900'
                          )}
                        >
                          Perlu Penugasan
                        </button>
                        <button
                          type="button"
                          onClick={() => handleTabChange('WAITING_APPROVAL')}
                          className={clsx(
                            'flex-1 py-1.5 px-2 rounded-md transition-colors text-center font-bold text-xs whitespace-nowrap',
                            activeTab === 'WAITING_APPROVAL'
                              ? 'bg-white text-emerald-900 shadow-2xs'
                              : 'text-slate-600 hover:text-slate-900'
                          )}
                        >
                          Menunggu Persetujuan
                        </button>
                        <button
                          type="button"
                          onClick={() => handleTabChange('WAITING_SIGNATURE')}
                          className={clsx(
                            'flex-1 py-1.5 px-2 rounded-md transition-colors text-center font-bold text-xs whitespace-nowrap',
                            activeTab === 'WAITING_SIGNATURE'
                              ? 'bg-white text-emerald-900 shadow-2xs'
                              : 'text-slate-600 hover:text-slate-900'
                          )}
                        >
                          Tanda Tangan
                        </button>
                        <button
                          type="button"
                          onClick={() => handleTabChange('COMPLETED')}
                          className={clsx(
                            'flex-1 py-1.5 px-2 rounded-md transition-colors text-center font-bold text-xs whitespace-nowrap',
                            activeTab === 'COMPLETED'
                              ? 'bg-white text-emerald-900 shadow-2xs'
                              : 'text-slate-600 hover:text-slate-900'
                          )}
                        >
                          Riwayat
                        </button>
                      </>
                    ) : isAdmin ? (
                      <>
                        <button
                          type="button"
                          onClick={() => handleTabChange('WAITING_APPROVAL')}
                          className={clsx(
                            'flex-1 py-1.5 px-2 rounded-md transition-colors text-center font-bold text-xs whitespace-nowrap',
                            activeTab === 'WAITING_APPROVAL'
                              ? 'bg-white text-emerald-900 shadow-2xs'
                              : 'text-slate-600 hover:text-slate-900'
                          )}
                        >
                          Menunggu Persetujuan
                        </button>
                        <button
                          type="button"
                          onClick={() => handleTabChange('WAITING_SIGNATURE')}
                          className={clsx(
                            'flex-1 py-1.5 px-2 rounded-md transition-colors text-center font-bold text-xs whitespace-nowrap',
                            activeTab === 'WAITING_SIGNATURE'
                              ? 'bg-white text-emerald-900 shadow-2xs'
                              : 'text-slate-600 hover:text-slate-900'
                          )}
                        >
                          Tanda Tangan
                        </button>
                        <button
                          type="button"
                          onClick={() => handleTabChange('COMPLETED')}
                          className={clsx(
                            'flex-1 py-1.5 px-2 rounded-md transition-colors text-center font-bold text-xs whitespace-nowrap',
                            activeTab === 'COMPLETED'
                              ? 'bg-white text-emerald-900 shadow-2xs'
                              : 'text-slate-600 hover:text-slate-900'
                          )}
                        >
                          Riwayat
                        </button>
                      </>
                    ) : (
                      <>
                        <button
                          type="button"
                          onClick={() => handleTabChange('ASSIGNED')}
                          className={clsx(
                            'flex-1 py-1.5 px-2 rounded-md transition-colors text-center font-bold text-xs whitespace-nowrap',
                            activeTab === 'ASSIGNED'
                              ? 'bg-white text-emerald-900 shadow-2xs'
                              : 'text-slate-600 hover:text-slate-900'
                          )}
                        >
                          Tugas Baru
                        </button>
                        <button
                          type="button"
                          onClick={() => handleTabChange('IN_PROGRESS')}
                          className={clsx(
                            'flex-1 py-1.5 px-2 rounded-md transition-colors text-center font-bold text-xs whitespace-nowrap',
                            activeTab === 'IN_PROGRESS'
                              ? 'bg-white text-emerald-900 shadow-2xs'
                              : 'text-slate-600 hover:text-slate-900'
                          )}
                        >
                          Sedang Diperiksa
                        </button>
                        <button
                          type="button"
                          onClick={() => handleTabChange('WAITING_APPROVAL')}
                          className={clsx(
                            'flex-1 py-1.5 px-2 rounded-md transition-colors text-center font-bold text-xs whitespace-nowrap',
                            activeTab === 'WAITING_APPROVAL'
                              ? 'bg-white text-emerald-900 shadow-2xs'
                              : 'text-slate-600 hover:text-slate-900'
                          )}
                        >
                          Menunggu Pihak Lain
                        </button>
                        <button
                          type="button"
                          onClick={() => handleTabChange('READY_TO_SEND')}
                          className={clsx(
                            'flex-1 py-1.5 px-2 rounded-md transition-colors text-center font-bold text-xs whitespace-nowrap',
                            activeTab === 'READY_TO_SEND'
                              ? 'bg-white text-emerald-900 shadow-2xs'
                              : 'text-slate-600 hover:text-slate-900'
                          )}
                        >
                          Siap Dikirim
                        </button>
                      </>
                    )}
                  </div>

                  {/* Search Form */}
                  <form onSubmit={handleSearchSubmit} className="flex items-center gap-2">
                    <div className="relative flex-1">
                      <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                      <input
                        type="text"
                        aria-label="Cari penugasan verifikasi"
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        placeholder="Cari reg no, judul, penerbit..."
                        className="w-full text-xs pl-8 pr-3 py-2 rounded-lg border border-slate-200 focus:outline-none focus:ring-2 focus:ring-emerald-700/20 focus:border-emerald-700"
                      />
                    </div>
                    <Button type="submit" variant="outline" size="sm" className="text-xs px-3">
                      Cari
                    </Button>
                  </form>
                </div>

                {/* Queue List Cards */}
                {loading ? (
                  <div className="py-12 text-center space-y-2 bg-white rounded-xl border border-slate-200 p-6">
                    <RefreshCw className="w-6 h-6 animate-spin text-emerald-800 mx-auto" />
                    <p className="text-xs text-slate-500 font-medium">Memuat antrean tugas...</p>
                  </div>
                ) : assignments.length === 0 ? (
                  <EmptyState
                    title="Tidak Ada Penugasan Ditemukan"
                    description="Tidak ada berkas yang memerlukan pemeriksaan pada tab filter ini."
                  />
                ) : (
                  <div className="space-y-2">
                    {assignments.map((item) => {
                      const reg = item.registration || {};
                      const isSelected = selectedAssignment?.id === item.id;
                      const pub = reg.publisher || {};

                      return (
                        <div
                          key={item.id}
                          onClick={() => setSelectedId(item.id)}
                          className={clsx(
                            'p-4 rounded-xl border cursor-pointer transition-all duration-150 text-xs space-y-2',
                            isSelected
                              ? 'border-emerald-700 bg-emerald-50/40 shadow-xs ring-1 ring-emerald-700'
                              : 'border-slate-200 bg-white hover:border-slate-300 hover:bg-slate-50/50 shadow-2xs'
                          )}
                        >
                          <div className="flex items-center justify-between gap-2">
                            <span className="font-mono font-bold text-slate-900 bg-slate-100 px-2 py-0.5 rounded border border-slate-200">
                              {reg.registration_no || '-'}
                            </span>
                            {item.isUnassigned ? (
                              <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-semibold bg-emerald-100 text-emerald-800 border border-emerald-200">
                                Siap ditugaskan
                              </span>
                            ) : (
                              <StatusBadge status={reg.status || item.status} size="sm" />
                            )}
                          </div>

                          <div>
                            <h4 className="font-bold text-slate-900 text-sm line-clamp-1">
                              {reg.title || 'Naskah Mushaf'}
                            </h4>
                            <p className="text-slate-500 line-clamp-1">{pub.legal_name || '-'}</p>
                          </div>

                          {item.isUnassigned ? (
                            <div className="bg-slate-50 p-2 rounded-lg border border-slate-200/60 text-[11px] space-y-1 text-slate-600">
                              <div className="flex items-center justify-between">
                                <span className="font-mono text-slate-700">
                                  TT: <strong>{reg.physical_master?.receipt_no || reg.physical_master_intake?.receipt_no || '-'}</strong>
                                </span>
                                <span>{(reg.physical_master?.volume_count ?? reg.physical_master_intake?.volume_count ?? 30)} jilid</span>
                              </div>
                              <div className="flex items-center justify-between text-slate-500 text-[10px]">
                                <span>
                                  Diterima: {(reg.physical_master?.received_at || reg.physical_master_intake?.received_at) ? new Date(reg.physical_master?.received_at || reg.physical_master_intake?.received_at).toLocaleDateString('id-ID', { day: 'numeric', month: 'short' }) : '-'}
                                </span>
                                <span>
                                  Menunggu: {formatWaitingTime(reg.physical_master?.received_at || reg.physical_master_intake?.received_at || item.assigned_at)}
                                </span>
                              </div>
                            </div>
                          ) : null}

                          <div className="flex items-center justify-between gap-2 pt-1 border-t border-slate-100 text-[11px] text-slate-500">
                            {item.due_at ? (
                              <SlaIndicator dueAt={item.due_at} targetDuration="2 hari" showProgress={false} />
                            ) : item.isUnassigned ? (
                              <span className="text-emerald-700 font-semibold flex items-center gap-1">
                                <Clock className="w-3 h-3" />
                                Siap Ditugaskan
                              </span>
                            ) : null}
                            <ChevronRight className={clsx('w-3.5 h-3.5 text-slate-400 transition-transform', isSelected && 'rotate-90 text-emerald-800')} />
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            }
            detailContent={
              selectedAssignment ? (
                <div className="space-y-4">
                  {/* Task Action Card */}
                  <PrimaryTaskCard
                    title={taskCardInfo?.title || 'Tugas Verifikasi'}
                    description={taskCardInfo?.description || 'Rincian tugas verifikasi naskah.'}
                    objectRef={selectedAssignment.registration?.registration_no ? `No. Registrasi: ${selectedAssignment.registration.registration_no}` : undefined}
                    ownerLabel={selectedAssignment.isUnassigned ? 'Belum Ditugaskan' : (selectedAssignment.verifier?.name || currentUser?.name)}
                    actionLabel={taskCardInfo?.actionLabel || 'Buka Pemeriksaan'}
                    onAction={() => {
                      if (taskCardInfo?.isAssign) {
                        setAssignDialogOpen(true);
                      } else if (taskCardInfo?.isStart) {
                        handleStartVerification(selectedAssignment.id);
                      } else {
                        navigate(`/internal/verifications/${selectedAssignment.id}`);
                      }
                    }}
                    actionIcon={taskCardInfo?.actionIcon || <Play className="w-4 h-4 fill-white" />}
                    slaText={selectedAssignment.due_at ? 'SLA Verifikasi: 2 Hari Kerja' : (selectedAssignment.isUnassigned ? 'Perlu Penugasan' : null)}
                  />

                  {/* Status & Consequence Summary */}
                  <StatusSummary
                    status={selectedAssignment.registration?.status || selectedAssignment.status}
                    slaText={selectedAssignment.due_at ? 'Target SLA 48 Jam' : null}
                  />

                  {/* Key Metadata Grid */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {/* Publisher & Registration Info */}
                    <div className="rounded-xl border border-slate-200 bg-white p-4 space-y-2 text-xs shadow-2xs">
                      <h4 className="font-bold text-slate-900 border-b border-slate-100 pb-1.5 flex items-center gap-1.5">
                        <Building2 className="w-4 h-4 text-emerald-800" />
                        Identitas Pemohon
                      </h4>
                      <div className="space-y-1 text-slate-600">
                        <p><strong>Pemohon:</strong> {selectedAssignment.registration?.publisher?.legal_name ? `${selectedAssignment.registration.publisher.legal_name} (Terdaftar)` : '-'}</p>
                        <p><strong>Naskah:</strong> “{selectedAssignment.registration?.title || '-'}”</p>
                        <p><strong>Tanggal Masuk:</strong> {new Date(selectedAssignment.assigned_at || Date.now()).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' })}</p>
                      </div>
                    </div>

                    {/* Master Physical Intake Status */}
                    <div className="rounded-xl border border-slate-200 bg-white p-4 space-y-2 text-xs shadow-2xs">
                      <h4 className="font-bold text-slate-900 border-b border-slate-100 pb-1.5 flex items-center gap-1.5">
                        <PackageCheck className="w-4 h-4 text-emerald-800" />
                        Penerimaan Master Fisik Loket
                      </h4>
                      <div className="space-y-1 text-slate-600">
                        <p>
                          <strong>Status:</strong>{' '}
                          {selectedAssignment.registration?.physical_master_intake?.status === 'RECEIVED' ? (
                            <span className="text-emerald-800 font-bold">Sudah Diterima Loket</span>
                          ) : (
                            <span className="text-amber-800 font-bold">Menunggu Penerimaan Loket</span>
                          )}
                        </p>
                        {selectedAssignment.registration?.physical_master_intake?.receipt_no && (
                          <p>
                            <strong>No. Tanda Terima:</strong>{' '}
                            <span className="font-mono bg-slate-100 px-1.5 py-0.5 rounded border border-slate-200">
                              {selectedAssignment.registration?.physical_master_intake?.receipt_no}
                            </span>
                          </p>
                        )}
                        {selectedAssignment.isUnassigned && (
                          <p>
                            <strong>Status Penugasan:</strong>{' '}
                            <span className="text-slate-500 italic">
                              Belum Ada (Menunggu Nota Dinas)
                            </span>
                          </p>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Informasi Penugasan & SLA Panel */}
                  {!selectedAssignment.isUnassigned && (() => {
                    const notaDoc = selectedAssignment.documents?.find?.((d) => d.document_type === 'NOTA_DINAS_VERIFIKASI') || selectedAssignment.documents?.[0];
                    const isRevoked = selectedAssignment.status === 'REVOKED';
                    const canReassignOrRevoke = (isHead || isAdmin) && ['ASSIGNED', 'IN_PROGRESS'].includes(selectedAssignment.status);

                    return (
                      <div className="rounded-xl border border-slate-200 bg-white p-4 space-y-3 text-xs shadow-2xs">
                        <div className="flex items-center justify-between border-b border-slate-100 pb-2">
                          <h4 className="font-bold text-slate-900 flex items-center gap-1.5">
                            <ShieldCheck className="w-4 h-4 text-emerald-800" />
                            Informasi Penugasan & SLA Verifikasi
                          </h4>
                          {isRevoked ? (
                            <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-bold bg-rose-100 text-rose-800 border border-rose-200">
                              Penugasan Dicabut (Revoked)
                            </span>
                          ) : null}
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-slate-600">
                          <div>
                            <span className="text-slate-400 block text-[11px]">Verifikator Ditugaskan:</span>
                            <span className="font-semibold text-slate-900">{selectedAssignment.verifier?.name || currentUser?.name || '-'}</span>
                          </div>
                          <div>
                            <span className="text-slate-400 block text-[11px]">Nomor Nota Dinas:</span>
                            <span className="font-mono font-semibold text-slate-900">{notaDoc?.document_no || '-'}</span>
                          </div>
                          <div>
                            <span className="text-slate-400 block text-[11px]">Waktu Penugasan:</span>
                            <span>{selectedAssignment.assigned_at ? new Date(selectedAssignment.assigned_at).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' }) : '-'}</span>
                          </div>
                          <div>
                            <span className="text-slate-400 block text-[11px]">Target Selesai (SLA):</span>
                            <span>{selectedAssignment.due_at ? new Date(selectedAssignment.due_at).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' }) : '2 Hari Kerja'}</span>
                          </div>
                        </div>

                        {isRevoked && selectedAssignment.revocation_reason && (
                          <div className="p-2.5 bg-rose-50 border border-rose-200 rounded-lg text-rose-800 text-[11px]">
                            <strong>Alasan Pencabutan:</strong> {selectedAssignment.revocation_reason}
                          </div>
                        )}

                        {['WAITING_APPROVAL', 'WAITING_SIGNATURE', 'READY_TO_SEND'].includes(selectedAssignment.status) && (
                          <div className="p-2.5 bg-emerald-50 border border-emerald-200 rounded-lg text-emerald-900 text-[11px] flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                            <span>
                              Pemeriksaan verifikator telah diajukan. Tanggung jawab saat ini:{' '}
                              <strong>
                                {selectedAssignment.status === 'WAITING_APPROVAL' ? 'Kepala LPMQ (Persetujuan Draf)' : (selectedAssignment.status === 'WAITING_SIGNATURE' ? 'Tim Penandatangan' : 'Pengiriman Resmi')}
                              </strong>
                            </span>
                            <span className="font-bold text-emerald-800 bg-white px-2 py-0.5 rounded border border-emerald-200 self-start sm:self-auto">
                              SLA Verifikator Selesai
                            </span>
                          </div>
                        )}

                        {canReassignOrRevoke && (
                          <div className="pt-2 border-t border-slate-100 flex items-center justify-end gap-2">
                            <Button
                              type="button"
                              variant="outline"
                              size="sm"
                              onClick={() => setReassignDialogOpen(true)}
                              className="text-indigo-700 border-indigo-200 hover:bg-indigo-50 text-xs"
                            >
                              <RefreshCw className="w-3.5 h-3.5 mr-1" />
                              Tugaskan Ulang (Reassign)
                            </Button>
                            <Button
                              type="button"
                              variant="outline"
                              size="sm"
                              onClick={() => setRevokeDialogOpen(true)}
                              className="text-rose-700 border-rose-200 hover:bg-rose-50 text-xs"
                            >
                              <X className="w-3.5 h-3.5 mr-1" />
                              Cabut Penugasan (Revoke)
                            </Button>
                          </div>
                        )}
                      </div>
                    );
                  })()}
                </div>
              ) : null
            }
          />
        </>
      )}

      {/* Assign Verification Dialog (Langkah 4 SOP: Kepala LPMQ) */}
      {isHead && assignDialogOpen && selectedAssignment && (
        <AssignVerificationDialog
          registration={selectedAssignment.registration || selectedAssignment}
          onClose={() => setAssignDialogOpen(false)}
          onConflict={() => {
            fetchAssignments();
          }}
          onSuccess={(newAssignment) => {
            setAssignDialogOpen(false);
            const docNo = newAssignment?.nota_dinas?.document_no || newAssignment?.documents?.[0]?.document_no || '';
            const createdAssignmentId = newAssignment?.assignment?.id || newAssignment?.id;
            setSuccessMessage({
              text: `Berhasil menugaskan Verifikator${docNo ? ` dengan Nota Dinas ${docNo}` : ''}.`,
              assignmentId: createdAssignmentId,
            });
            setAssignments((prev) => prev.filter((a) => a.id !== selectedAssignment.id));
            fetchAssignments();
          }}
        />
      )}

      {/* Revoke Assignment Dialog */}
      {(isHead || isAdmin) && revokeDialogOpen && selectedAssignment && (
        <RevokeAssignmentDialog
          assignment={selectedAssignment}
          onClose={() => setRevokeDialogOpen(false)}
          onSuccess={() => {
            setRevokeDialogOpen(false);
            setSuccessMessage({
              text: 'Penugasan verifikasi berhasil dicabut. Pengajuan dikembalikan ke antrean penugasan.',
            });
            fetchAssignments();
          }}
        />
      )}

      {/* Reassign Verification Dialog */}
      {(isHead || isAdmin) && reassignDialogOpen && selectedAssignment && (
        <ReassignVerificationDialog
          assignment={selectedAssignment}
          onClose={() => setReassignDialogOpen(false)}
          onSuccess={(res) => {
            setReassignDialogOpen(false);
            const docNo = res?.nota_dinas?.document_no || '';
            setSuccessMessage({
              text: `Penugasan berhasil dialihkan${docNo ? ` dengan Nota Dinas ${docNo}` : ''}.`,
            });
            fetchAssignments();
          }}
        />
      )}
    </div>
  );
};

export default VerifikatorInboxPage;
