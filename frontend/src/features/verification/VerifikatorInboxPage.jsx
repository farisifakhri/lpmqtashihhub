import React, { useState, useEffect, useMemo, useRef } from 'react';
import { useNavigate, Link } from 'react-router-dom';
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
  X,
} from 'lucide-react';
import { clsx } from 'clsx';

export const VerifikatorInboxPage = () => {
  const navigate = useNavigate();
  const { currentUser } = useAuth();
  const userRoles = currentUser?.roles || (currentUser?.role ? [currentUser.role] : []);
  const isHead = userRoles.includes('KEPALA_LPMQ') || currentUser?.role === 'KEPALA_LPMQ';
  const isAdmin = userRoles.includes('SUPERADMIN') || userRoles.includes('ADMIN') || currentUser?.role === 'SUPERADMIN';

  const [assignments, setAssignments] = useState([]);
  const [selectedId, setSelectedId] = useState(null);
  const [pagination, setPagination] = useState({ total: 0, page: 1, limit: 20, totalPages: 1 });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [activeTab, setActiveTab] = useState(isHead ? 'WAITING_APPROVAL' : 'ASSIGNED');
  const [searchQuery, setSearchQuery] = useState('');
  const [startingId, setStartingId] = useState(null);
  const [submittedSearch, setSubmittedSearch] = useState('');
  const requestId = useRef(0);

  const fetchAssignments = async () => {
    const request = ++requestId.current;
    setLoading(true);
    setError(null);
    try {
      const params = {
        page: pagination.page,
        limit: pagination.limit,
      };
      if (activeTab === 'WAITING_APPROVAL') {
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
        if (items.length > 0 && !selectedId) {
          setSelectedId(items[0].id);
        }
      }
    } catch (err) {
      if (request === requestId.current) setError(err.message || 'Gagal memuat daftar penugasan verifikasi.');
    } finally {
      if (request === requestId.current) setLoading(false);
    }
  };

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
                  {/* Segmented Control (Max 3 Options) */}
                  <div className="flex items-center gap-1 p-1 bg-slate-100 rounded-lg text-xs font-semibold">
                    {(isHead || isAdmin) ? (
                      <>
                        <button
                          type="button"
                          onClick={() => { setActiveTab('WAITING_APPROVAL'); setPagination(p => ({ ...p, page: 1 })); }}
                          className={clsx(
                            'flex-1 py-1.5 px-2 rounded-md transition-colors text-center font-bold text-xs',
                            activeTab === 'WAITING_APPROVAL'
                              ? 'bg-white text-emerald-900 shadow-2xs'
                              : 'text-slate-600 hover:text-slate-900'
                          )}
                        >
                          Menunggu Persetujuan
                        </button>
                        <button
                          type="button"
                          onClick={() => { setActiveTab('ALL'); setPagination(p => ({ ...p, page: 1 })); }}
                          className={clsx(
                            'flex-1 py-1.5 px-2 rounded-md transition-colors text-center font-bold text-xs',
                            activeTab === 'ALL'
                              ? 'bg-white text-emerald-900 shadow-2xs'
                              : 'text-slate-600 hover:text-slate-900'
                          )}
                        >
                          Semua Penugasan
                        </button>
                      </>
                    ) : (
                      <>
                        <button
                          type="button"
                          onClick={() => { setActiveTab('ASSIGNED'); setPagination(p => ({ ...p, page: 1 })); }}
                          className={clsx(
                            'flex-1 py-1.5 px-2 rounded-md transition-colors text-center font-bold text-xs',
                            activeTab === 'ASSIGNED'
                              ? 'bg-white text-emerald-900 shadow-2xs'
                              : 'text-slate-600 hover:text-slate-900'
                          )}
                        >
                          Tugas Baru
                        </button>
                        <button
                          type="button"
                          onClick={() => { setActiveTab('IN_PROGRESS'); setPagination(p => ({ ...p, page: 1 })); }}
                          className={clsx(
                            'flex-1 py-1.5 px-2 rounded-md transition-colors text-center font-bold text-xs',
                            activeTab === 'IN_PROGRESS'
                              ? 'bg-white text-emerald-900 shadow-2xs'
                              : 'text-slate-600 hover:text-slate-900'
                          )}
                        >
                          Sedang Diperiksa
                        </button>
                        <button
                          type="button"
                          onClick={() => { setActiveTab('ALL'); setPagination(p => ({ ...p, page: 1 })); }}
                          className={clsx(
                            'flex-1 py-1.5 px-2 rounded-md transition-colors text-center font-bold text-xs',
                            activeTab === 'ALL'
                              ? 'bg-white text-emerald-900 shadow-2xs'
                              : 'text-slate-600 hover:text-slate-900'
                          )}
                        >
                          Semua
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
                            <StatusBadge status={reg.status || item.status} size="sm" />
                          </div>

                          <div>
                            <h4 className="font-bold text-slate-900 text-sm line-clamp-1">
                              {reg.title || 'Naskah Mushaf'}
                            </h4>
                            <p className="text-slate-500 line-clamp-1">{pub.legal_name || '-'}</p>
                          </div>

                          <div className="flex items-center justify-between gap-2 pt-1 border-t border-slate-100 text-[11px] text-slate-500">
                            {item.due_at && (
                              <SlaIndicator dueAt={item.due_at} targetDuration="2 hari" showProgress={false} />
                            )}
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
                    title={
                      selectedAssignment.status === 'ASSIGNED'
                        ? 'Pemeriksaan Berkas & Master Fisik Siap Dimulai'
                        : selectedAssignment.status === 'IN_PROGRESS'
                        ? 'Lanjutkan Lembar Kerja Pemeriksaan Verifikator'
                        : 'Hasil Verifikasi Telah Diserahkan'
                    }
                    description={
                      selectedAssignment.status === 'ASSIGNED'
                        ? 'Nota Dinas telah diterbitkan. Lakukan telaah 4 butir checklist: data registrasi, berkas digital, master fisik A4 per juz, dan format rasm naskah.'
                        : 'Lengkapi lembar catatan koreksi dan susun draf Surat Hasil Telaah serta Berita Acara untuk diajukan ke Kepala LPMQ.'
                    }
                    objectRef={selectedAssignment.registration?.registration_no ? `No. Registrasi: ${selectedAssignment.registration.registration_no}` : undefined}
                    ownerLabel={currentUser?.name}
                    actionLabel={
                      selectedAssignment.status === 'ASSIGNED'
                        ? 'Mulai Pemeriksaan'
                        : 'Lanjutkan Pemeriksaan'
                    }
                    onAction={() => {
                      if (selectedAssignment.status === 'ASSIGNED') {
                        handleStartVerification(selectedAssignment.id);
                      } else {
                        navigate(`/internal/verifications/${selectedAssignment.id}`);
                      }
                    }}
                    actionIcon={<Play className="w-4 h-4 fill-white" />}
                    slaText={selectedAssignment.due_at ? 'SLA Verifikasi: 2 Hari Kerja' : null}
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
                        {selectedAssignment.documents?.[0]?.document_no && (
                          <p>
                            <strong>Dasar Penugasan:</strong>{' '}
                            <span className="font-mono bg-slate-100 px-1.5 py-0.5 rounded border border-slate-200">
                              {selectedAssignment.documents[0].document_no}
                            </span>
                          </p>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              ) : null
            }
          />
        </>
      )}
    </div>
  );
};

export default VerifikatorInboxPage;
