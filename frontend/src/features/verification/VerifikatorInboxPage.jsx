import React, { useState, useEffect, useMemo, useRef } from 'react';
import { useNavigate, useSearchParams, Link } from 'react-router-dom';
import { useAuth } from '@/features/auth/AuthContext';
import { verificationApi } from '@/api/verification.api';
import { PageHeader } from '@/components/ui/PageHeader';
import { StatusBadge } from '@/components/ui/StatusBadge';
import { SlaIndicator } from '@/components/ui/SlaIndicator';
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
  FileSearch,
  Sparkles,
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
  const isAdmin = userRoles.includes('SUPERADMIN') || userRoles.includes('ADMIN_INTERNAL') || currentUser?.role === 'SUPERADMIN' || currentUser?.role === 'ADMIN_INTERNAL';
  const isAssignmentAdmin = isAdmin;

  const normalizeTab = (tab) => {
    if (tab === 'NEED_APPROVAL') return 'WAITING_APPROVAL';
    return tab;
  };

  const defaultTab = isAssignmentAdmin ? 'NEED_ASSIGNMENT' : ((isHead || isAdmin) ? 'WAITING_APPROVAL' : 'ASSIGNED');
  const rawUrlTab = searchParams.get('tab');
  const normalizedUrlTab = normalizeTab(rawUrlTab);
  const initialTab = (!isAssignmentAdmin && normalizedUrlTab === 'NEED_ASSIGNMENT') ? defaultTab : (normalizedUrlTab || defaultTab);

  const [assignments, setAssignments] = useState([]);
  const [selectedId, setSelectedId] = useState(null);
  const [pagination, setPagination] = useState({ total: 0, page: 1, limit: 20, totalPages: 1 });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [activeTab, setActiveTab] = useState(initialTab);
  const [assignmentSubView, setAssignmentSubView] = useState('UNASSIGNED');
  const [searchQuery, setSearchQuery] = useState('');
  const [startingId, setStartingId] = useState(null);
  const [submittedSearch, setSubmittedSearch] = useState('');
  const [assignDialogOpen, setAssignDialogOpen] = useState(false);
  const [targetRegistrationForAssign, setTargetRegistrationForAssign] = useState(null);
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
        if (assignmentSubView === 'UNASSIGNED') {
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
              setSelectedId((prev) => (prev && normalized.some((n) => n.id === prev) ? prev : normalized[0].id));
            } else {
              setSelectedId(null);
            }
          }
          return;
        } else {
          // assignmentSubView === 'ASSIGNED': Tampilkan penugasan yang sudah dibuat admin
          const assignParams = {
            page: pagination.page,
            limit: pagination.limit,
          };
          if (submittedSearch) {
            assignParams.search = submittedSearch;
          }
          const res = await verificationApi.listAssignments(assignParams);
          if (request !== requestId.current) return;
          if (res?.data) {
            const items = res.data.items || [];
            setAssignments(items);
            if (res.data.pagination) {
              setPagination(res.data.pagination);
            }
            if (items.length > 0) {
              setSelectedId((prev) => (prev && items.some((n) => n.id === prev) ? prev : items[0].id));
            } else {
              setSelectedId(null);
            }
          }
          return;
        }
      }

      const params = {
        page: pagination.page,
        limit: pagination.limit,
      };
      if (activeTab === 'BAST_READY') {
        params.handover_ready = true;
      } else if (activeTab === 'WAITING_APPROVAL' || activeTab === 'NEED_APPROVAL') {
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
          setSelectedId((prev) => (prev && items.some((n) => n.id === prev) ? prev : items[0].id));
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
    const rawTab = searchParams.get('tab');
    const tabFromUrl = normalizeTab(rawTab);
    const targetTab = tabFromUrl || defaultTab;
    if (targetTab && targetTab !== activeTab) {
      setActiveTab(targetTab);
      setPagination((p) => ({ ...p, page: 1 }));
      setSelectedId(null);
    }
  }, [searchParams, defaultTab]);

  useEffect(() => {
    fetchAssignments();
    return () => { requestId.current += 1; };
  }, [activeTab, pagination.page, submittedSearch, assignmentSubView]);

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

  const getHeaderInfo = () => {
    if (activeTab === 'NEED_ASSIGNMENT') {
      return {
        label: 'Penugasan Verifikator',
        title: 'Penugasan Verifikator Berkas',
        subtitle: 'Helper Admin menugaskan verifikator tim inti dan mencatat Disposisi setelah master fisik diterima di loket.',
      };
    }
    if (activeTab === 'ASSIGNED' || activeTab === 'IN_PROGRESS') {
      return {
        label: 'Pemeriksaan Berkas',
        title: isAssignmentAdmin ? 'Antrean Penugasan Verifikasi Berkas' : 'Antrean Verifikasi Berkas',
        subtitle: isAssignmentAdmin
          ? 'Pemeriksaan administratif kelengkapan, rasm Usmani standar, tanda waqaf, dan pedoman Kementerian Agama.'
          : 'Daftar naskah mushaf yang ditugaskan Helper Admin untuk diperiksa verifikator.',
      };
    }
    if (activeTab === 'WAITING_APPROVAL' || activeTab === 'NEED_APPROVAL') {
      return {
        label: isHead ? 'Persetujuan Verifikasi' : 'Hasil Verifikasi',
        title: isHead ? 'Persetujuan Hasil Verifikasi oleh Kepala LPMQ' : 'Penelaahan Hasil Verifikasi Berkas',
        subtitle: isHead ? 'Telaah dan pengesahan surat hasil verifikasi berkas oleh Kepala LPMQ.' : 'Daftar draf berita acara pemeriksaan berkas untuk ditelaah dan diteruskan pengesahannya.',
      };
    }
    if (activeTab === 'WAITING_SIGNATURE') {
      return {
        label: 'Konfirmasi Internal',
        title: 'Konfirmasi Penandatanganan Dokumen',
        subtitle: 'Draf telah disetujui, konfirmasi Berita Acara dan Surat Pemberitahuan sedang berlangsung.',
      };
    }
    if (activeTab === 'READY_TO_SEND') {
      return {
        label: 'Siap Kirim',
        title: 'Dokumen Siap Dikirim ke Penerbit',
        subtitle: 'Seluruh konfirmasi internal lengkap dan surat hasil siap dikirimkan kepada pemohon penerbit.',
      };
    }
    if (activeTab === 'BAST_READY') {
      return {
        label: 'Siap Serah Terima',
        title: 'Siap Serah Terima Fisik Master (BAST)',
        subtitle: 'Pembayaran PNBP telah sah, terbitkan Berita Acara Serah Terima master fisik naskah mushaf.',
      };
    }
    return {
      label: isAssignmentAdmin ? 'Penugasan Verifikator' : (isHead ? 'Persetujuan Verifikasi' : 'Antrean Verifikasi'),
      title: isAssignmentAdmin ? 'Penugasan Verifikator oleh Helper Admin' : (isHead ? 'Persetujuan Hasil Verifikasi' : 'Antrean Verifikasi Berkas'),
      subtitle: isAssignmentAdmin
        ? 'Helper Admin menugaskan verifikator tim inti dan mencatat Disposisi setelah master fisik diterima.'
        : isHead ? 'Telaah dan pengesahan surat hasil verifikasi oleh Kepala LPMQ.' : 'Daftar naskah mushaf yang ditugaskan Helper Admin untuk diperiksa verifikator.',
    };
  };

  const headerInfo = getHeaderInfo();

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-16">
      {/* Formal Institutional Header */}
      <PageHeader
        breadcrumbs={[
          { label: 'Aplikasi Internal', path: '/internal' },
          { label: headerInfo.label },
        ]}
        title={headerInfo.title}
        subtitle={headerInfo.subtitle}
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
            <div className="bg-brand-50 border border-brand-100 rounded-xl p-4 flex items-center justify-between gap-3 text-xs text-brand-900 shadow-2xs">
              <div className="flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-brand-700 shrink-0" />
                <span className="font-semibold">
                  {typeof successMessage === 'string' ? successMessage : successMessage.text}
                </span>
                {typeof successMessage === 'object' && successMessage.assignmentId && (
                  <Link
                    to={`/internal/verifications/${successMessage.assignmentId}`}
                    className="ml-2 font-bold text-brand-800 underline hover:text-brand-950"
                  >
                    Buka Detail Penugasan &rarr;
                  </Link>
                )}
              </div>
              <button
                type="button"
                onClick={() => setSuccessMessage(null)}
                className="text-brand-fg hover:text-brand-900 p-1 rounded-md cursor-pointer"
                aria-label="Tutup pesan sukses"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
          )}

          {/* Navigation Tab Bar (Segmented Controls) */}
          <div className="bg-white rounded-2xl border border-line p-3 shadow-2xs space-y-3">
            <div className="flex items-center gap-1.5 p-1 bg-surface-subtle rounded-xl text-xs font-semibold overflow-x-auto">
              {(isHead || isAssignmentAdmin) ? (
                <>
                  {isAssignmentAdmin && (
                    <button
                      type="button"
                      onClick={() => handleTabChange('NEED_ASSIGNMENT')}
                      className={clsx(
                        'py-2 px-3.5 rounded-lg transition-all font-bold text-xs whitespace-nowrap cursor-pointer flex items-center gap-1.5',
                        activeTab === 'NEED_ASSIGNMENT'
                          ? 'bg-white text-brand-900 shadow-2xs font-extrabold'
                          : 'text-ink-muted hover:text-ink'
                      )}
                    >
                      <UserCheck className="w-3.5 h-3.5" />
                      Perlu Penugasan
                    </button>
                  )}
                  <button
                    type="button"
                    onClick={() => handleTabChange('ASSIGNED')}
                    className={clsx(
                      'py-2 px-3.5 rounded-lg transition-all font-bold text-xs whitespace-nowrap cursor-pointer flex items-center gap-1.5',
                      (activeTab === 'ASSIGNED' || activeTab === 'IN_PROGRESS')
                        ? 'bg-white text-brand-900 shadow-2xs font-extrabold'
                        : 'text-ink-muted hover:text-ink'
                    )}
                  >
                    <ClipboardCheck className="w-3.5 h-3.5" />
                    Pemeriksaan Berkas
                  </button>
                  <button
                    type="button"
                    onClick={() => handleTabChange('WAITING_APPROVAL')}
                    className={clsx(
                      'py-2 px-3.5 rounded-lg transition-all font-bold text-xs whitespace-nowrap cursor-pointer flex items-center gap-1.5',
                      activeTab === 'WAITING_APPROVAL'
                        ? 'bg-white text-brand-900 shadow-2xs font-extrabold'
                        : 'text-ink-muted hover:text-ink'
                    )}
                  >
                    <FileSearch className="w-3.5 h-3.5" />
                    Menunggu Persetujuan
                  </button>
                  <button
                    type="button"
                    onClick={() => handleTabChange('WAITING_SIGNATURE')}
                    className={clsx(
                      'py-2 px-3.5 rounded-lg transition-all font-bold text-xs whitespace-nowrap cursor-pointer flex items-center gap-1.5',
                      activeTab === 'WAITING_SIGNATURE'
                        ? 'bg-white text-brand-900 shadow-2xs font-extrabold'
                        : 'text-ink-muted hover:text-ink'
                    )}
                  >
                    <ShieldCheck className="w-3.5 h-3.5" />
                    Konfirmasi Internal
                  </button>
                  <button
                    type="button"
                    onClick={() => handleTabChange('COMPLETED')}
                    className={clsx(
                      'py-2 px-3.5 rounded-lg transition-all font-bold text-xs whitespace-nowrap cursor-pointer flex items-center gap-1.5',
                      activeTab === 'COMPLETED'
                        ? 'bg-white text-brand-900 shadow-2xs font-extrabold'
                        : 'text-ink-muted hover:text-ink'
                    )}
                  >
                    <Layers className="w-3.5 h-3.5" />
                    Riwayat
                  </button>
                </>
              ) : (
                <>
                  <button
                    type="button"
                    onClick={() => handleTabChange('ASSIGNED')}
                    className={clsx(
                      'py-2 px-3.5 rounded-lg transition-all font-bold text-xs whitespace-nowrap cursor-pointer',
                      activeTab === 'ASSIGNED' ? 'bg-white text-brand-900 shadow-2xs font-extrabold' : 'text-ink-muted hover:text-ink'
                    )}
                  >
                    Tugas Baru
                  </button>
                  <button
                    type="button"
                    onClick={() => handleTabChange('IN_PROGRESS')}
                    className={clsx(
                      'py-2 px-3.5 rounded-lg transition-all font-bold text-xs whitespace-nowrap cursor-pointer',
                      activeTab === 'IN_PROGRESS' ? 'bg-white text-brand-900 shadow-2xs font-extrabold' : 'text-ink-muted hover:text-ink'
                    )}
                  >
                    Sedang Diperiksa
                  </button>
                  <button
                    type="button"
                    onClick={() => handleTabChange('WAITING_APPROVAL')}
                    className={clsx(
                      'py-2 px-3.5 rounded-lg transition-all font-bold text-xs whitespace-nowrap cursor-pointer',
                      activeTab === 'WAITING_APPROVAL' ? 'bg-white text-brand-900 shadow-2xs font-extrabold' : 'text-ink-muted hover:text-ink'
                    )}
                  >
                    Menunggu Persetujuan
                  </button>
                  <button
                    type="button"
                    onClick={() => handleTabChange('READY_TO_SEND')}
                    className={clsx(
                      'py-2 px-3.5 rounded-lg transition-all font-bold text-xs whitespace-nowrap cursor-pointer',
                      activeTab === 'READY_TO_SEND' ? 'bg-white text-brand-900 shadow-2xs font-extrabold' : 'text-ink-muted hover:text-ink'
                    )}
                  >
                    Siap Dikirim
                  </button>
                  <button
                    type="button"
                    onClick={() => handleTabChange('BAST_READY')}
                    className={clsx(
                      'py-2 px-3.5 rounded-lg transition-all font-bold text-xs whitespace-nowrap cursor-pointer',
                      activeTab === 'BAST_READY' ? 'bg-white text-brand-900 shadow-2xs font-extrabold' : 'text-ink-muted hover:text-ink'
                    )}
                  >
                    Siap BAST
                  </button>
                </>
              )}
            </div>

            {/* Search Form */}
            <form onSubmit={handleSearchSubmit} className="flex items-center gap-2">
              <div className="relative flex-1">
                <Search className="w-3.5 h-3.5 text-ink-muted absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                <input
                  type="text"
                  aria-label="Cari penugasan verifikasi"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Cari reg no, judul, penerbit..."
                  className="w-full text-xs pl-8 pr-3 py-2 rounded-xl border border-line focus:outline-none focus:ring-2 focus:ring-brand-700/20 focus:border-brand-700 bg-white dark:bg-canvas"
                />
              </div>
              <Button type="submit" variant="outline" size="sm" className="text-xs px-4">
                Cari
              </Button>
            </form>
          </div>

          {/* Volume dan Antrean Berdasarkan Waktu Masuk */}
          <QueueOverview
            total={pagination.total}
            oldest={assignments[0]?.queue_entered_at || assignments[0]?.assigned_at}
            fifo={activeTab !== 'COMPLETED'}
            loading={loading}
          />

          {/* Content Area - Konsep 2 Dedicated Workspace */}
          {loading ? (
            <div className="py-16 text-center space-y-3 bg-white dark:bg-canvas rounded-2xl border border-line p-8 shadow-2xs">
              <RefreshCw className="w-7 h-7 animate-spin text-brand-800 mx-auto" />
              <p className="text-xs text-ink-muted font-medium">Memuat antrean tugas...</p>
            </div>
          ) : assignments.length === 0 && activeTab !== 'NEED_ASSIGNMENT' ? (
            <EmptyState
              title="Tidak Ada Penugasan Ditemukan"
              description="Tidak ada berkas yang memerlukan pemeriksaan pada tab filter ini."
            />
          ) : activeTab === 'NEED_ASSIGNMENT' ? (
            /* ============================================================== */
            /* 1. TAMPILAN FOKUS TUNGGAL: PENUGASAN VERIFIKATOR (LANGKAH 3)   */
            /* ============================================================== */
            <div className="space-y-5">
              {/* Sub-view toggle: Belum Ditugaskan vs Sudah Ditugaskan */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white dark:bg-canvas p-3 rounded-2xl border border-line shadow-2xs">
                <div className="flex items-center gap-1.5 p-1 bg-surface-subtle rounded-xl text-xs font-semibold">
                  <button
                    type="button"
                    onClick={() => {
                      setAssignmentSubView('UNASSIGNED');
                      setPagination((p) => ({ ...p, page: 1 }));
                    }}
                    className={clsx(
                      'py-1.5 px-3.5 rounded-lg transition-all font-bold text-xs cursor-pointer flex items-center gap-1.5',
                      assignmentSubView === 'UNASSIGNED'
                        ? 'bg-white text-brand-900 shadow-2xs font-extrabold'
                        : 'text-ink-muted hover:text-ink'
                    )}
                  >
                    <Clock className="w-3.5 h-3.5 text-brand-700" />
                    <span>Belum Ditugaskan</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setAssignmentSubView('ASSIGNED');
                      setPagination((p) => ({ ...p, page: 1 }));
                    }}
                    className={clsx(
                      'py-1.5 px-3.5 rounded-lg transition-all font-bold text-xs cursor-pointer flex items-center gap-1.5',
                      assignmentSubView === 'ASSIGNED'
                        ? 'bg-white text-brand-900 shadow-2xs font-extrabold'
                        : 'text-ink-muted hover:text-ink'
                    )}
                  >
                    <CheckCircle2 className="w-3.5 h-3.5 text-civic-success" />
                    <span>Sudah Ditugaskan / Riwayat Penugasan</span>
                  </button>
                </div>
                <p className="text-xs text-ink-muted px-2">
                  {assignmentSubView === 'UNASSIGNED'
                    ? 'Naskah yang master fisiknya telah diterima di loket dan siap diterbitkan Disposisi.'
                    : 'Naskah yang telah diterbitkan Disposisi dan ditugaskan ke Verifikator tim inti.'}
                </p>
              </div>

              {/* Tampilan 1: Belum Ditugaskan (Menunggu Disposisi) */}
              {assignmentSubView === 'UNASSIGNED' ? (
                assignments.length === 0 ? (
                  <div className="py-12 px-6 text-center space-y-4 bg-white dark:bg-canvas rounded-2xl border border-line p-8 shadow-2xs max-w-xl mx-auto">
                    <div className="w-12 h-12 rounded-full bg-brand-50 text-brand-700 flex items-center justify-center mx-auto">
                      <CheckCircle2 className="w-6 h-6" />
                    </div>
                    <div className="space-y-1">
                      <h3 className="text-base font-bold text-ink">Semua Naskah Telah Ditugaskan</h3>
                      <p className="text-xs text-ink-muted leading-relaxed">
                        Seluruh naskah yang master fisiknya telah diterima di loket sudah selesai diterbitkan Disposisinya. Anda dapat memantau penugasan yang telah dibuat pada tab &ldquo;Sudah Ditugaskan&rdquo;.
                      </p>
                    </div>
                    <div className="flex flex-wrap items-center justify-center gap-2.5 pt-2">
                      <Button
                        variant="primary"
                        size="sm"
                        onClick={() => {
                          setAssignmentSubView('ASSIGNED');
                          setPagination((p) => ({ ...p, page: 1 }));
                        }}
                        className="text-xs"
                      >
                        <UserCheck className="w-4 h-4 mr-1.5" />
                        Lihat Naskah Sudah Ditugaskan
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleTabChange('ASSIGNED')}
                        className="text-xs"
                      >
                        <ClipboardCheck className="w-4 h-4 mr-1.5" />
                        Buka Pemeriksaan Berkas
                      </Button>
                    </div>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
                    {assignments.map((item) => {
                      const reg = item.registration || {};
                      const pub = reg.publisher || {};
                      const physicalMaster = reg.physical_master || reg.physical_master_intake || {};
                      const isCurrent = selectedId === item.id;

                      return (
                        <div
                          key={item.id}
                          className={clsx(
                            'bg-white dark:bg-canvas rounded-2xl border p-5 shadow-2xs space-y-4 flex flex-col justify-between transition-all duration-200',
                            isCurrent
                              ? 'border-brand-700 ring-2 ring-brand-700/20 bg-brand-50/20'
                              : 'border-line hover:border-line-strong hover:shadow-md'
                          )}
                        >
                          {/* Top Badges */}
                          <div className="space-y-3">
                            <div className="flex items-center justify-between gap-2 flex-wrap">
                              <span className="font-mono font-bold text-ink bg-surface-subtle px-2 py-0.5 rounded border border-line text-xs">
                                {reg.registration_no || '-'}
                              </span>
                              <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-semibold bg-brand-100 text-brand-800 border border-brand-100">
                                Siap ditugaskan
                              </span>
                            </div>

                            {/* Title & Publisher */}
                            <div>
                              <h3 className="font-extrabold text-ink text-base line-clamp-2 leading-snug">
                                {reg.title || 'Naskah Mushaf Al-Qur\'an'}
                              </h3>
                              <p className="text-xs text-ink-muted flex items-center gap-1.5 mt-1">
                                <Building2 className="w-3.5 h-3.5 text-brand-800 shrink-0" />
                                <span className="truncate">{pub.legal_name || '-'}</span>
                              </p>
                            </div>

                            {/* Physical Master Context */}
                            <div className="bg-canvas dark:bg-surface-subtle p-3 rounded-xl border border-line/60 text-xs space-y-1.5 text-ink-muted">
                              <div className="flex items-center justify-between">
                                <span className="font-mono text-ink">
                                  TT: <strong>{physicalMaster.receipt_no || '-'}</strong>
                                </span>
                                <span className="font-semibold text-ink">
                                  {physicalMaster.volume_count ?? 30} jilid
                                </span>
                              </div>
                              <div className="flex items-center justify-between text-ink-muted text-[11px] border-t border-line/50 pt-1.5">
                                <span>
                                  Diterima: {physicalMaster.received_at ? new Date(physicalMaster.received_at).toLocaleDateString('id-ID', { day: 'numeric', month: 'short' }) : '-'}
                                </span>
                                <span className="flex items-center gap-1 text-brand-800 font-medium">
                                  <Clock className="w-3 h-3" />
                                  Menunggu: {formatWaitingTime(physicalMaster.received_at || item.assigned_at)}
                                </span>
                              </div>
                            </div>

                            {/* Assignment Prompt Box */}
                            <div className="p-3 bg-surface-subtle dark:bg-canvas rounded-xl border border-line space-y-1">
                              <h4 className="font-bold text-xs text-ink flex items-center gap-1.5">
                                <Sparkles className="w-3.5 h-3.5 text-brand-800" />
                                Naskah Siap Ditugaskan ke Verifikator
                              </h4>
                              <p className="text-[11px] text-ink-muted leading-relaxed">
                                Master fisik telah diterima oleh loket. Terbitkan Disposisi dan tetapkan Verifikator untuk memulai pemeriksaan naskah (Langkah 4 SOP).
                              </p>
                            </div>
                          </div>

                          {/* Action Button */}
                          <div className="pt-2 border-t border-line">
                            <Button
                              variant="primary"
                              size="sm"
                              className="w-full justify-center text-xs font-bold py-2 shadow-2xs"
                              onClick={() => {
                                setSelectedId(item.id);
                                setTargetRegistrationForAssign(reg);
                                setAssignDialogOpen(true);
                              }}
                            >
                              <UserCheck className="w-4 h-4 mr-1.5" />
                              Tugaskan Verifikator
                            </Button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )
              ) : (
                /* Tampilan 2: Sudah Ditugaskan / Riwayat Penugasan */
                assignments.length === 0 ? (
                  <div className="py-12 px-6 text-center space-y-3 bg-white dark:bg-canvas rounded-2xl border border-line p-8 shadow-2xs max-w-xl mx-auto">
                    <div className="w-12 h-12 rounded-full bg-surface-subtle text-ink-muted flex items-center justify-center mx-auto">
                      <UserCheck className="w-6 h-6" />
                    </div>
                    <div className="space-y-1">
                      <h3 className="text-base font-bold text-ink">Belum Ada Riwayat Penugasan</h3>
                      <p className="text-xs text-ink-muted leading-relaxed">
                        Belum ada penugasan verifikator yang diterbitkan. Pilih tab &ldquo;Belum Ditugaskan&rdquo; untuk menugaskan naskah yang siap diperiksa.
                      </p>
                    </div>
                    <Button
                      variant="primary"
                      size="sm"
                      onClick={() => {
                        setAssignmentSubView('UNASSIGNED');
                        setPagination((p) => ({ ...p, page: 1 }));
                      }}
                      className="text-xs mt-2"
                    >
                      <Clock className="w-4 h-4 mr-1.5" />
                      Buka Antrean Belum Ditugaskan
                    </Button>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
                    {assignments.map((item) => {
                      const reg = item.registration || {};
                      const pub = reg.publisher || {};
                      const verifier = item.verifier || {};
                      const notaDoc = item.documents?.find?.((d) => d.document_type === 'NOTA_DINAS_VERIFIKASI') || item.documents?.[0];
                      const status = item.status;

                      return (
                        <div
                          key={item.id}
                          className="bg-white dark:bg-canvas rounded-2xl border border-line p-5 shadow-2xs space-y-4 flex flex-col justify-between hover:border-line-strong hover:shadow-md transition-all duration-200"
                        >
                          <div className="space-y-3">
                            {/* Badges */}
                            <div className="flex items-center justify-between gap-2 flex-wrap">
                              <span className="font-mono font-bold text-ink bg-surface-subtle px-2 py-0.5 rounded border border-line text-xs">
                                {reg.registration_no || '-'}
                              </span>
                              <span className={clsx(
                                'inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-semibold border',
                                status === 'ASSIGNED'
                                  ? 'bg-brand-50 text-brand-800 border-brand-200'
                                  : status === 'IN_PROGRESS'
                                  ? 'bg-civic-warningSoft text-civic-warning border-civic-warningLine'
                                  : 'bg-brand-50 text-brand-800 border-brand-200'
                              )}>
                                {status === 'ASSIGNED' ? 'Ditugaskan (Baru)' : status === 'IN_PROGRESS' ? 'Sedang Diperiksa' : status || 'Aktif'}
                              </span>
                            </div>

                            {/* Title & Publisher */}
                            <div>
                              <h3 className="font-extrabold text-ink text-base line-clamp-2 leading-snug">
                                {reg.title || 'Naskah Mushaf Al-Qur\'an'}
                              </h3>
                              <p className="text-xs text-ink-muted flex items-center gap-1.5 mt-1">
                                <Building2 className="w-3.5 h-3.5 text-brand-800 shrink-0" />
                                <span className="truncate">{pub.legal_name || '-'}</span>
                              </p>
                            </div>

                            {/* Verifier Card */}
                            <div className="bg-brand-50/40 dark:bg-surface-subtle p-3 rounded-xl border border-brand-100 text-xs space-y-1">
                              <span className="text-[11px] text-ink-muted block">Petugas Verifikator Ditugaskan:</span>
                              <div className="flex items-center justify-between">
                                <span className="font-bold text-ink flex items-center gap-1.5">
                                  <UserCheck className="w-3.5 h-3.5 text-brand-700" />
                                  {verifier.name || 'Verifikator Terpilih'}
                                </span>
                              </div>
                              {verifier.nip && (
                                <span className="text-[11px] text-ink-muted font-mono block">NIP: {verifier.nip}</span>
                              )}
                            </div>

                            {/* Disposisi & Tanggal */}
                            <div className="bg-canvas dark:bg-surface-subtle p-3 rounded-xl border border-line/60 text-xs space-y-1.5 text-ink-muted">
                              <div className="flex items-center justify-between">
                                <span className="text-[11px] text-ink-muted">Disposisi:</span>
                                <span className="font-mono font-bold text-ink">
                                  {notaDoc?.document_no || 'Tercatat'}
                                </span>
                              </div>
                              <div className="flex items-center justify-between text-[11px] border-t border-line/50 pt-1.5">
                                <span>
                                  Ditugaskan: {item.assigned_at ? new Date(item.assigned_at).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' }) : '-'}
                                </span>
                                {item.due_at && (
                                  <span className="text-brand-800 font-medium">
                                    SLA: {new Date(item.due_at).toLocaleDateString('id-ID', { day: 'numeric', month: 'short' })}
                                  </span>
                                )}
                              </div>
                            </div>
                          </div>

                          {/* Action Buttons */}
                          <div className="pt-2 border-t border-line flex items-center gap-2">
                            <Button
                              variant="primary"
                              size="sm"
                              className="flex-1 justify-center text-xs font-bold py-2 shadow-2xs"
                              onClick={() => navigate(`/internal/verifications/${item.id}`)}
                            >
                              <ClipboardCheck className="w-4 h-4 mr-1.5" />
                              Buka Pemeriksaan
                            </Button>
                            {isAssignmentAdmin && (
                              <Button
                                variant="outline"
                                size="sm"
                                className="text-xs px-2.5"
                                title="Ganti Verifikator"
                                onClick={() => {
                                  setReassigningAssignment(item);
                                  setReassignDialogOpen(true);
                                }}
                              >
                                Ganti
                              </Button>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )
              )}
            </div>
          ) : (
            /* ============================================================== */
            /* 2. TAMPILAN FOKUS TUNGGAL: VERIFIKASI & PERSETUJUAN (CARD GRID) */
            /* Memenuhi Nabil Feedback #8: Card masuk ke detail saat diklik   */
            /* ============================================================== */
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
              {assignments.map((item) => {
                const reg = item.registration || {};
                const pub = reg.publisher || {};
                const notaDoc = item.documents?.find?.((d) => d.document_type === 'NOTA_DINAS_VERIFIKASI') || item.documents?.[0];
                const status = item.status;
                const isReturned = status === 'IN_PROGRESS' && Boolean(item.return_reason);
                const isAssigned = status === 'ASSIGNED';
                const isWaitingApproval = status === 'WAITING_APPROVAL';
                const isReadyToSend = status === 'READY_TO_SEND';

                const handleCardAction = () => {
                  if (isAssigned) {
                    handleStartVerification(item.id);
                  } else {
                    navigate(`/internal/verifications/${item.id}`);
                  }
                };

                return (
                  <div
                    key={item.id}
                    onClick={handleCardAction}
                    className="bg-white dark:bg-canvas rounded-2xl border border-line p-5 shadow-2xs space-y-4 flex flex-col justify-between hover:border-brand-700/60 hover:shadow-md transition-all duration-200 cursor-pointer group"
                  >
                    <div className="space-y-3">
                      {/* Top Badges */}
                      <div className="flex items-center justify-between gap-2 flex-wrap">
                        <span className="font-mono font-bold text-ink bg-surface-subtle px-2 py-0.5 rounded border border-line text-xs">
                          {reg.registration_no || '-'}
                        </span>
                        <div className="flex items-center gap-1.5">
                          <StatusBadge status={reg.status || item.status} size="sm" />
                          {item.due_at && (
                            <SlaIndicator dueAt={item.due_at} targetDuration="2 hari" showProgress={false} />
                          )}
                        </div>
                      </div>

                      {/* Title & Publisher */}
                      <div>
                        <h3 className="font-extrabold text-ink text-base line-clamp-2 leading-snug group-hover:text-brand-900 transition-colors">
                          {reg.title || 'Naskah Mushaf'}
                        </h3>
                        <p className="text-xs text-ink-muted flex items-center gap-1.5 mt-1">
                          <Building2 className="w-3.5 h-3.5 text-brand-800 shrink-0" />
                          <span className="truncate">{pub.legal_name || '-'}</span>
                        </p>
                      </div>

                      {/* Disposisi Document Info */}
                      {notaDoc?.document_no && (
                        <div className="flex items-center justify-between text-xs bg-canvas dark:bg-surface-subtle p-2.5 rounded-xl border border-line/60">
                          <span className="text-ink-muted">Disposisi:</span>
                          <span className="font-mono font-bold text-ink">
                            {notaDoc.document_no}
                          </span>
                        </div>
                      )}

                      {/* State Specific Alert Banners */}
                      {isReturned && (
                        <div className="p-3 bg-civic-warningSoft border border-civic-warningLine rounded-xl text-xs space-y-1">
                          <div className="font-bold text-civic-warning flex items-center gap-1.5">
                            <AlertTriangle className="w-4 h-4 shrink-0" />
                            Draf Dikembalikan oleh Kepala LPMQ
                          </div>
                          <p className="text-ink-muted text-[11px] italic">
                            {item.return_reason || 'Perbaiki catatan checklist lembar 3.'}
                          </p>
                        </div>
                      )}

                      {isWaitingApproval && (
                        <div className="p-3 bg-surface-subtle dark:bg-canvas rounded-xl border border-line text-xs space-y-1">
                          <div className="font-bold text-ink flex items-center gap-1.5">
                            <Clock className="w-3.5 h-3.5 text-brand-800" />
                            Draft Sedang Diperiksa Kepala LPMQ
                          </div>
                          <p className="text-[11px] text-ink-muted">
                            Tidak ada tindakan yang diperlukan dari Verifikator saat ini. Draf sedang dalam proses penelaahan oleh Kepala LPMQ.
                          </p>
                        </div>
                      )}

                      {isReadyToSend && (
                        <div className="p-3 bg-brand-50 border border-brand-100 rounded-xl text-xs space-y-1 text-brand-900">
                          <div className="font-bold flex items-center gap-1.5">
                            <CheckCircle2 className="w-4 h-4 text-brand-700" />
                            Dokumen Siap Dikirim kepada Penerbit
                          </div>
                          <p className="text-[11px] text-brand-800">
                            Seluruh konfirmasi internal lengkap. Surat hasil telaah siap dikirimkan kepada pemohon penerbit.
                          </p>
                        </div>
                      )}
                    </div>

                    {/* Footer Action Button */}
                    <div className="pt-2 border-t border-line">
                      {isAssigned ? (
                        <Button
                          variant="primary"
                          size="sm"
                          disabled={startingId === item.id}
                          className="w-full justify-center text-xs font-bold"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleStartVerification(item.id);
                          }}
                        >
                          <Play className="w-3.5 h-3.5 fill-white mr-1.5" />
                          Mulai Pemeriksaan
                        </Button>
                      ) : isReturned ? (
                        <Button
                          variant="outline"
                          size="sm"
                          className="w-full justify-center text-xs font-bold text-civic-warning border-civic-warningLine hover:bg-civic-warningSoft"
                          onClick={(e) => {
                            e.stopPropagation();
                            navigate(`/internal/verifications/${item.id}`);
                          }}
                        >
                          <RefreshCw className="w-3.5 h-3.5 mr-1.5" />
                          Revisi Pemeriksaan
                        </Button>
                      ) : isWaitingApproval ? (
                        <Button
                          variant="outline"
                          size="sm"
                          className="w-full justify-center text-xs font-medium"
                          onClick={(e) => {
                            e.stopPropagation();
                            navigate(`/internal/verifications/${item.id}`);
                          }}
                        >
                          <FileText className="w-3.5 h-3.5 mr-1.5" />
                          Lihat Detail Draf
                        </Button>
                      ) : isReadyToSend ? (
                        <Button
                          variant="primary"
                          size="sm"
                          className="w-full justify-center text-xs font-bold"
                          onClick={(e) => {
                            e.stopPropagation();
                            navigate(`/internal/verifications/${item.id}`);
                          }}
                        >
                          <ArrowRight className="w-3.5 h-3.5 mr-1.5" />
                          Kirim Dokumen ke Penerbit
                        </Button>
                      ) : (
                        <Button
                          variant="outline"
                          size="sm"
                          className="w-full justify-center text-xs font-bold group-hover:bg-brand-50 group-hover:text-brand-900 group-hover:border-brand-200"
                          onClick={(e) => {
                            e.stopPropagation();
                            navigate(`/internal/verifications/${item.id}`);
                          }}
                        >
                          <ArrowRight className="w-3.5 h-3.5 mr-1.5" />
                          Lanjutkan Pemeriksaan
                        </Button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </>
      )}

      {/* Penugasan Verifikator oleh Helper Admin */}
      {isAssignmentAdmin && assignDialogOpen && (targetRegistrationForAssign || selectedAssignment) && (
        <AssignVerificationDialog
          registration={targetRegistrationForAssign || selectedAssignment?.registration || selectedAssignment}
          onClose={() => {
            setAssignDialogOpen(false);
            setTargetRegistrationForAssign(null);
          }}
          onConflict={() => {
            fetchAssignments();
          }}
          onSuccess={(newAssignment) => {
            setAssignDialogOpen(false);
            const assignedRegId = targetRegistrationForAssign?.id || selectedAssignment?.id;
            setTargetRegistrationForAssign(null);
            const docNo = newAssignment?.nota_dinas?.document_no || newAssignment?.documents?.[0]?.document_no || '';
            const createdAssignmentId = newAssignment?.assignment?.id || newAssignment?.id;
            setSuccessMessage({
              text: `Berhasil menugaskan Verifikator${docNo ? ` dengan Disposisi ${docNo}` : ''}.`,
              assignmentId: createdAssignmentId,
            });
            if (assignedRegId) {
              setAssignments((prev) => prev.filter((a) => a.id !== assignedRegId));
            }
            fetchAssignments();
          }}
        />
      )}

      {/* Revoke Assignment Dialog */}
      {isAssignmentAdmin && revokeDialogOpen && selectedAssignment && (
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
      {isAssignmentAdmin && reassignDialogOpen && selectedAssignment && (
        <ReassignVerificationDialog
          assignment={selectedAssignment}
          onClose={() => setReassignDialogOpen(false)}
          onSuccess={(res) => {
            setReassignDialogOpen(false);
            const docNo = res?.nota_dinas?.document_no || '';
            setSuccessMessage({
              text: `Penugasan berhasil dialihkan${docNo ? ` dengan Disposisi ${docNo}` : ''}.`,
            });
            fetchAssignments();
          }}
        />
      )}
    </div>
  );
};

export default VerifikatorInboxPage;
