import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { useAuth } from '@/features/auth/AuthContext';
import { verificationApi } from '@/api/verification.api';
import { PageHeader } from '@/components/ui/PageHeader';
import { Button } from '@/components/ui/Button';
import { SearchField } from '@/components/ui/SearchField';
import { ConfirmationSummaryDialog } from '@/components/common/ConfirmationSummaryDialog';
import { EmptyState } from '@/components/ui/EmptyState';
import { Skeleton } from '@/components/ui/Skeleton';
import {
  PenTool,
  FileCheck,
  CheckCircle2,
  Clock,
  AlertCircle,
  Eye,
  Download,
  ExternalLink,
  ShieldCheck,
  Filter,
  Users,
  CheckSquare,
  FileText,
  Building2,
  RefreshCw,
  X,
} from 'lucide-react';

export const SignatureCenterPage = () => {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const { currentUser } = useAuth();

  const isHead = currentUser?.roles?.includes('KEPALA_LPMQ');
  const isVerifier = currentUser?.roles?.includes('VERIFIKATOR');

  const tabParam = searchParams.get('tab') || 'NEED_MY_SIGN';
  const [activeTab, setActiveTab] = useState(tabParam);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterDocType, setFilterDocType] = useState('ALL');

  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [error, setError] = useState(null);
  const [successMessage, setSuccessMessage] = useState(null);

  // Data lists
  const [assignments, setAssignments] = useState([]);
  const [selectedDocIds, setSelectedDocIds] = useState([]);

  // Dialogs state
  const [signDialogDoc, setSignDialogDoc] = useState(null);
  const [batchSignOpen, setBatchSignOpen] = useState(false);
  const [previewDoc, setPreviewDoc] = useState(null);

  // Sync activeTab with URL search params
  useEffect(() => {
    if (tabParam !== activeTab) {
      setActiveTab(tabParam);
    }
  }, [tabParam]);

  const handleTabChange = (tab) => {
    setActiveTab(tab);
    setSearchParams({ tab });
    setSelectedDocIds([]);
  };

  const fetchAssignments = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      // Load assignments to extract documents requiring signatures
      const [resWaitingSig, resReady, resCompleted] = await Promise.all([
        verificationApi.listAssignments({ status: 'WAITING_SIGNATURE', limit: 50 }).catch(() => ({ data: { items: [] } })),
        verificationApi.listAssignments({ status: 'READY_TO_SEND', limit: 50 }).catch(() => ({ data: { items: [] } })),
        verificationApi.listAssignments({ status: 'COMPLETED', limit: 50 }).catch(() => ({ data: { items: [] } })),
      ]);

      const allItems = [
        ...(resWaitingSig?.data?.items || []),
        ...(resReady?.data?.items || []),
        ...(resCompleted?.data?.items || []),
      ];

      // Remove duplicate assignments by ID
      const uniqueMap = new Map();
      allItems.forEach((item) => {
        if (item?.id && !uniqueMap.has(item.id)) {
          uniqueMap.set(item.id, item);
        }
      });

      setAssignments(Array.from(uniqueMap.values()));
    } catch (err) {
      setError(err.message || 'Gagal memuat antrean dokumen tanda tangan.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchAssignments();
  }, [fetchAssignments]);

  // Transform assignments into a flat list of signable documents
  const allDocuments = useMemo(() => {
    const list = [];

    assignments.forEach((assignment) => {
      const reg = assignment.registration || {};
      const publisher = reg.publisher || {};
      const isAssignedToMe = isVerifier && assignment.verifier_id === currentUser?.id;

      // Process real signable verification documents from assignment
      if (Array.isArray(assignment.documents) && assignment.documents.length > 0) {
        const signableDocs = assignment.documents.filter((doc) =>
          ['SURAT_HASIL_VERIFIKASI', 'SURAT_PEMBERITAHUAN_HASIL_VERIFIKASI', 'BERITA_ACARA_VERIFIKASI'].includes(doc.document_type)
        );

        signableDocs.forEach((doc) => {
          const docStatus = doc.status || assignment.status;
          const isCompleted = ['READY_TO_SEND', 'COMPLETED'].includes(assignment.status) || docStatus === 'SIGNED';

          // Signatories mapping
          let signatories = [];
          if (Array.isArray(doc.signatories) && doc.signatories.length > 0) {
            signatories = doc.signatories.map((s) => ({
              id: s.id,
              sign_order: s.sign_order,
              role_label: s.name_position_snapshot?.includes('Kepala')
                ? 'Kepala LPMQ'
                : (doc.document_type === 'BERITA_ACARA_VERIFIKASI' && s.sign_order === 1 ? 'Verifikator Berkas & Naskah' : 'Kepala LPMQ'),
              name: s.signer?.name || s.name_position_snapshot || 'Petugas LPMQ',
              status: s.status,
              signer_id: s.signer_user_id || s.signer?.id,
            }));
          } else {
            // Default / fallback signatories structure
            signatories = [
              {
                role_label: 'Verifikator Berkas & Naskah',
                name: assignment.verifier?.name || 'Verifikator',
                status: isCompleted ? 'SIGNED' : 'PENDING',
              },
              {
                role_label: 'Kepala LPMQ',
                name: 'Dr. H. Abdul Aziz Sidqi, M.Ag.',
                status: isCompleted ? 'SIGNED' : 'PENDING',
              },
            ];
          }

          // Evaluate whether current user can sign this document
          let canUserSign = false;
          if (['APPROVED', 'SIGNING', 'WAITING_SIGNATURE'].includes(docStatus)) {
            if (Array.isArray(doc.signatories) && doc.signatories.length > 0) {
              const mySig = doc.signatories.find(
                (s) => s.signer_user_id === currentUser?.id || s.signer?.id === currentUser?.id
              );
              if (mySig && mySig.status === 'PENDING') {
                const pendingPrior = doc.signatories.some(
                  (s) => s.sign_order < mySig.sign_order && s.status !== 'SIGNED'
                );
                canUserSign = !pendingPrior;
              }
            } else {
              // Fallback for mock/test data without full signatories relation
              canUserSign =
                (isHead && ['APPROVED', 'SIGNING', 'WAITING_SIGNATURE'].includes(docStatus)) ||
                (isAssignedToMe && ['APPROVED', 'SIGNING', 'WAITING_SIGNATURE'].includes(docStatus));
            }
          }

          list.push({
            id: doc.id,
            document_no: doc.document_no || `DOC-${doc.id.slice(0, 8).toUpperCase()}`,
            document_type: doc.document_type || 'SURAT_HASIL_VERIFIKASI',
            version: doc.version || 1,
            status: docStatus,
            created_at: doc.created_at || assignment.assigned_at,
            assignment_id: assignment.id,
            assignment_status: assignment.status,
            registration_id: reg.id,
            registration_no: reg.registration_no,
            manuscript_title: reg.title,
            publisher_name: publisher.legal_name || 'Penerbit Terdaftar',
            isAssignedToMe,
            canUserSign,
            signatories,
          });
        });
      }
    });

    return list;
  }, [assignments, isHead, isVerifier, currentUser]);

  // Filter documents by active tab and search
  const filteredDocuments = useMemo(() => {
    return allDocuments.filter((doc) => {
      // Tab categorization
      if (activeTab === 'NEED_MY_SIGN') {
        // Document needs current user's signature
        if (!doc.canUserSign || doc.status === 'SIGNED') {
          return false;
        }
      } else if (activeTab === 'WAITING_OTHERS') {
        // In signing process, but waiting for other signatories
        if (doc.assignment_status !== 'WAITING_SIGNATURE' || doc.canUserSign || doc.status === 'SIGNED') {
          return false;
        }
      } else if (activeTab === 'SIGNED') {
        // Fully signed / issued
        if (doc.status !== 'SIGNED' && !['READY_TO_SEND', 'COMPLETED'].includes(doc.assignment_status)) {
          return false;
        }
      }

      // Filter by Doc Type
      if (filterDocType !== 'ALL' && doc.document_type !== filterDocType) {
        return false;
      }

      // Search Query
      if (searchQuery.trim()) {
        const query = searchQuery.toLowerCase();
        const matchNo = doc.document_no?.toLowerCase().includes(query);
        const matchReg = doc.registration_no?.toLowerCase().includes(query);
        const matchTitle = doc.manuscript_title?.toLowerCase().includes(query);
        const matchPub = doc.publisher_name?.toLowerCase().includes(query);
        return matchNo || matchReg || matchTitle || matchPub;
      }

      return true;
    });
  }, [allDocuments, activeTab, filterDocType, searchQuery]);

  // Statistics counts
  const stats = useMemo(() => {
    const needSign = allDocuments.filter((d) => d.canUserSign && d.status !== 'SIGNED').length;
    const waitingOthers = allDocuments.filter((d) => d.assignment_status === 'WAITING_SIGNATURE' && !d.canUserSign && d.status !== 'SIGNED').length;
    const signedCount = allDocuments.filter((d) => d.status === 'SIGNED' || ['READY_TO_SEND', 'COMPLETED'].includes(d.assignment_status)).length;
    return { needSign, waitingOthers, signedCount };
  }, [allDocuments]);

  // Checkbox handlers for batch signing
  const handleToggleSelectDoc = (docId) => {
    setSelectedDocIds((prev) =>
      prev.includes(docId) ? prev.filter((id) => id !== docId) : [...prev, docId]
    );
  };

  const handleSelectAll = () => {
    if (selectedDocIds.length === filteredDocuments.length) {
      setSelectedDocIds([]);
    } else {
      setSelectedDocIds(filteredDocuments.map((d) => d.id));
    }
  };

  // Sign single document handler
  const handleConfirmSignSingle = async () => {
    if (!signDialogDoc) return;
    setActionLoading(true);
    setError(null);
    try {
      await verificationApi.signDocument(signDialogDoc.id);
      setSuccessMessage(`Dokumen ${signDialogDoc.document_no} berhasil ditandatangani secara digital.`);
      setSignDialogDoc(null);
      await fetchAssignments();
    } catch (err) {
      setError(err.message || 'Gagal menandatangani dokumen.');
    } finally {
      setActionLoading(false);
    }
  };

  // Batch sign handler
  const handleConfirmBatchSign = async () => {
    if (selectedDocIds.length === 0) return;
    setActionLoading(true);
    setError(null);
    try {
      let successCount = 0;
      for (const id of selectedDocIds) {
        try {
          await verificationApi.signDocument(id);
          successCount++;
        } catch {
          // continue with remaining
        }
      }
      setSuccessMessage(`${successCount} dokumen berhasil ditandatangani secara elektronik.`);
      setBatchSignOpen(false);
      setSelectedDocIds([]);
      await fetchAssignments();
    } catch (err) {
      setError(err.message || 'Sebagian dokumen gagal ditandatangani.');
    } finally {
      setActionLoading(false);
    }
  };

  return (
    <div className="max-w-7xl mx-auto space-y-6 pb-20">
      {/* Top Header */}
      <PageHeader
        title="Pusat Tanda Tangan & Pengesahan Digital"
        subtitle="Kelola penandatanganan elektronik resmi Surat Pemberitahuan, Berita Acara, dan Dokumen Hasil Verifikasi LPMQ."
        breadcrumbs={[
          { label: 'Aplikasi Internal', href: '/internal' },
          { label: 'Pusat Tanda Tangan' },
        ]}
        actions={
          <div className="flex items-center gap-2">
            <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-brand-50 text-brand-900 border border-brand-100 text-xs font-bold">
              <ShieldCheck className="w-4 h-4 text-brand-700" />
              Sertifikasi BSrE / E-Sign
            </span>
            <Button
              variant="outline"
              onClick={fetchAssignments}
              disabled={loading}
              className="text-xs px-3 py-1.5"
              aria-label="Segarkan data"
            >
              <RefreshCw className={`w-3.5 h-3.5 mr-1 ${loading ? 'animate-spin' : ''}`} />
              Segarkan
            </Button>
          </div>
        }
      />

      {/* Global Alerts */}
      {successMessage && (
        <div className="p-3.5 bg-brand-50 border border-brand-100 rounded-xl flex items-center justify-between text-brand-900 text-xs shadow-2xs animate-fadeIn">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-brand-700 shrink-0" />
            <span className="font-semibold">{successMessage}</span>
          </div>
          <button
            onClick={() => setSuccessMessage(null)}
            className="text-xs text-brand-800 hover:underline font-bold px-2 py-0.5"
          >
            Tutup
          </button>
        </div>
      )}

      {error && (
        <div className="p-3.5 bg-civic-dangerSoft border border-civic-dangerLine rounded-xl flex items-center justify-between text-civic-danger text-xs shadow-2xs animate-fadeIn">
          <div className="flex items-center gap-2">
            <AlertCircle className="w-4 h-4 text-civic-danger shrink-0" />
            <span className="font-semibold">{error}</span>
          </div>
          <button
            onClick={() => setError(null)}
            className="text-xs text-civic-danger hover:underline font-bold px-2 py-0.5"
          >
            Tutup
          </button>
        </div>
      )}

      {/* Statistics Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div
          onClick={() => handleTabChange('NEED_MY_SIGN')}
          className={`p-4 rounded-xl border transition-all cursor-pointer ${
            activeTab === 'NEED_MY_SIGN'
              ? 'bg-brand-50/70 border-brand-100 ring-2 ring-brand-700/20'
              : 'bg-white border-line hover:border-line-strong'
          }`}
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-ink-muted">Perlu Tanda Tangan Anda</span>
            <div className="p-2 rounded-lg bg-brand-100 text-brand-800">
              <PenTool className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3 flex items-baseline gap-2">
            <span className="text-2xl font-black text-ink">{stats.needSign}</span>
            <span className="text-xs text-ink-muted">dokumen aktif</span>
          </div>
          <p className="text-[11px] text-brand-700 mt-1 font-medium">Menunggu aksi tanda tangan Anda</p>
        </div>

        <div
          onClick={() => handleTabChange('WAITING_OTHERS')}
          className={`p-4 rounded-xl border transition-all cursor-pointer ${
            activeTab === 'WAITING_OTHERS'
              ? 'bg-civic-warningSoft/70 border-civic-warningLine ring-2 ring-civic-warning/20'
              : 'bg-white border-line hover:border-line-strong'
          }`}
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-ink-muted">Menunggu Penandatangan Lain</span>
            <div className="p-2 rounded-lg bg-civic-warningSoft text-civic-warning">
              <Clock className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3 flex items-baseline gap-2">
            <span className="text-2xl font-black text-ink">{stats.waitingOthers}</span>
            <span className="text-xs text-ink-muted">dokumen</span>
          </div>
          <p className="text-[11px] text-civic-warning mt-1 font-medium">Dalam alur urutan multi-sign</p>
        </div>

        <div
          onClick={() => handleTabChange('SIGNED')}
          className={`p-4 rounded-xl border transition-all cursor-pointer ${
            activeTab === 'SIGNED'
              ? 'bg-civic-infoSoft/70 border-civic-infoLine ring-2 ring-civic-info/20'
              : 'bg-white border-line hover:border-line-strong'
          }`}
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-ink-muted">Selesai Ditandatangani</span>
            <div className="p-2 rounded-lg bg-civic-infoSoft text-civic-info">
              <CheckCircle2 className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3 flex items-baseline gap-2">
            <span className="text-2xl font-black text-ink">{stats.signedCount}</span>
            <span className="text-xs text-ink-muted">arsip resmi</span>
          </div>
          <p className="text-[11px] text-civic-info mt-1 font-medium">Siap kirim & tersimpan dalam log audit</p>
        </div>
      </div>

      {/* Main Workspace Card */}
      <div className="bg-white rounded-xl border border-line shadow-2xs overflow-hidden">
        {/* Navigation Tabs Header */}
        <div className="border-b border-line bg-canvas/80 px-4 pt-3 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-2 overflow-x-auto">
            <button
              type="button"
              onClick={() => handleTabChange('NEED_MY_SIGN')}
              className={`pb-3 px-3 text-xs font-bold border-b-2 transition-all flex items-center gap-1.5 whitespace-nowrap ${
                activeTab === 'NEED_MY_SIGN'
                  ? 'border-brand-800 text-brand-950 font-black'
                  : 'border-transparent text-ink-muted hover:text-ink'
              }`}
            >
              <PenTool className="w-3.5 h-3.5" />
              <span>Perlu Tanda Tangan Anda</span>
              {stats.needSign > 0 && (
                <span className="ml-1 px-1.5 py-0.5 rounded-full bg-brand-100 text-brand-800 text-[10px] font-mono font-bold">
                  {stats.needSign}
                </span>
              )}
            </button>

            <button
              type="button"
              onClick={() => handleTabChange('WAITING_OTHERS')}
              className={`pb-3 px-3 text-xs font-bold border-b-2 transition-all flex items-center gap-1.5 whitespace-nowrap ${
                activeTab === 'WAITING_OTHERS'
                  ? 'border-brand-800 text-brand-950 font-black'
                  : 'border-transparent text-ink-muted hover:text-ink'
              }`}
            >
              <Clock className="w-3.5 h-3.5" />
              <span>Menunggu Penandatangan Lain</span>
              {stats.waitingOthers > 0 && (
                <span className="ml-1 px-1.5 py-0.5 rounded-full bg-civic-warningSoft text-civic-warning text-[10px] font-mono font-bold">
                  {stats.waitingOthers}
                </span>
              )}
            </button>

            <button
              type="button"
              onClick={() => handleTabChange('SIGNED')}
              className={`pb-3 px-3 text-xs font-bold border-b-2 transition-all flex items-center gap-1.5 whitespace-nowrap ${
                activeTab === 'SIGNED'
                  ? 'border-brand-800 text-brand-950 font-black'
                  : 'border-transparent text-ink-muted hover:text-ink'
              }`}
            >
              <CheckCircle2 className="w-3.5 h-3.5" />
              <span>Selesai Ditandatangani</span>
              <span className="ml-1 px-1.5 py-0.5 rounded-full bg-surface-strong text-ink text-[10px] font-mono font-bold">
                {stats.signedCount}
              </span>
            </button>
          </div>

          {/* Batch Action Bar if items selected */}
          {activeTab === 'NEED_MY_SIGN' && selectedDocIds.length > 0 && (
            <div className="pb-2.5 flex items-center gap-2">
              <span className="text-xs font-bold text-ink">
                {selectedDocIds.length} dokumen terpilih
              </span>
              <Button
                variant="primary"
                onClick={() => setBatchSignOpen(true)}
                disabled={actionLoading}
                className="text-xs px-3 py-1.5 font-bold"
              >
                <PenTool className="w-3.5 h-3.5 mr-1" />
                Tanda Tangani Terpilih ({selectedDocIds.length})
              </Button>
            </div>
          )}
        </div>

        {/* Filter and Search Bar */}
        <div className="p-4 bg-white border-b border-line flex flex-col sm:flex-row items-center justify-between gap-3">
          <div className="w-full sm:w-80">
            <SearchField
              value={searchQuery}
              onChange={setSearchQuery}
              placeholder="Cari nomor surat, naskah, atau penerbit..."
            />
          </div>

          <div className="flex items-center gap-2 w-full sm:w-auto justify-end">
            <div className="flex items-center gap-1.5 text-xs text-ink-muted">
              <Filter className="w-3.5 h-3.5 text-ink-muted" />
              <span>Tipe Dokumen:</span>
            </div>
            <select
              value={filterDocType}
              onChange={(e) => setFilterDocType(e.target.value)}
              className="text-xs px-2.5 py-1.5 rounded-lg border border-line-strong focus:outline-none focus:ring-2 focus:ring-brand-700/20 font-medium"
            >
              <option value="ALL">Semua Jenis Dokumen</option>
              <option value="SURAT_HASIL_VERIFIKASI">Surat Hasil Verifikasi</option>
              <option value="BERITA_ACARA_VERIFIKASI">Berita Acara Verifikasi</option>
              <option value="NOTA_DINAS_VERIFIKASI">Nota Dinas Penugasan</option>
            </select>
          </div>
        </div>

        {/* Content Area */}
        <div className="p-4">
          {loading ? (
            <div className="space-y-3">
              <Skeleton className="h-20 w-full rounded-xl" />
              <Skeleton className="h-20 w-full rounded-xl" />
              <Skeleton className="h-20 w-full rounded-xl" />
            </div>
          ) : filteredDocuments.length === 0 ? (
            <EmptyState
              title={
                activeTab === 'NEED_MY_SIGN'
                  ? 'Tidak Ada Dokumen Menunggu Tanda Tangan Anda'
                  : activeTab === 'WAITING_OTHERS'
                  ? 'Tidak Ada Dokumen Menunggu Pihak Lain'
                  : 'Belum Ada Arsip Dokumen Ditandatangani'
              }
              description={
                activeTab === 'NEED_MY_SIGN'
                  ? 'Seluruh dokumen verifikasi naskah telah Anda tandatangani atau belum ada draf yang disetujui.'
                  : 'Semua antrean dokumen tanda tangan berada pada status terbaru.'
              }
              action={
                <Button
                  variant="outline"
                  onClick={fetchAssignments}
                  className="text-xs mt-2"
                >
                  <RefreshCw className="w-3.5 h-3.5 mr-1" />
                  Periksa Kembali
                </Button>
              }
            />
          ) : (
            <div className="space-y-3">
              {/* Select All Checkbox for active Tab */}
              {activeTab === 'NEED_MY_SIGN' && filteredDocuments.length > 0 && (
                <div className="px-2 py-1.5 bg-canvas rounded-lg flex items-center justify-between text-xs text-ink-muted border border-line">
                  <label className="flex items-center gap-2 cursor-pointer select-none">
                    <input
                      type="checkbox"
                      checked={selectedDocIds.length === filteredDocuments.length && filteredDocuments.length > 0}
                      onChange={handleSelectAll}
                      className="rounded border-line-strong text-brand-800 focus:ring-brand-700"
                    />
                    <span className="font-semibold">Pilih Semua ({filteredDocuments.length} Dokumen)</span>
                  </label>
                  <span className="text-[11px] text-ink-muted">
                    Gunakan centang untuk penandatanganan massal
                  </span>
                </div>
              )}

              {/* Document List */}
              {filteredDocuments.map((doc) => (
                <div
                  key={doc.id}
                  className="p-4 rounded-xl border border-line bg-white hover:border-brand-100 transition-all shadow-2xs flex flex-col lg:flex-row lg:items-center justify-between gap-4"
                >
                  {/* Document Info Column */}
                  <div className="flex items-start gap-3.5 flex-1 min-w-0">
                    {activeTab === 'NEED_MY_SIGN' && (
                      <input
                        type="checkbox"
                        checked={selectedDocIds.includes(doc.id)}
                        onChange={() => handleToggleSelectDoc(doc.id)}
                        className="mt-1 rounded border-line-strong text-brand-800 focus:ring-brand-700"
                        aria-label={`Pilih dokumen ${doc.document_no}`}
                      />
                    )}

                    <div className="p-2.5 rounded-xl bg-surface-subtle text-brand-900 shrink-0 mt-0.5">
                      <FileCheck className="w-5 h-5" />
                    </div>

                    <div className="space-y-1.5 min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="text-xs font-black text-ink font-mono">
                          {doc.document_no}
                        </span>
                        <span className="px-2 py-0.5 rounded-md text-[10px] font-bold bg-surface-subtle text-ink border border-line">
                          {doc.document_type === 'BERITA_ACARA_VERIFIKASI'
                            ? 'Berita Acara Verifikasi'
                            : 'Surat Hasil Verifikasi'}
                        </span>
                        {doc.status === 'SIGNED' ? (
                          <span className="px-2 py-0.5 rounded-md text-[10px] font-bold bg-brand-100 text-brand-900 border border-brand-100">
                            Lengkap Ditandatangani
                          </span>
                        ) : (
                          <span className="px-2 py-0.5 rounded-md text-[10px] font-bold bg-civic-warningSoft text-civic-warning border border-civic-warningLine">
                            Menunggu Tanda Tangan
                          </span>
                        )}
                      </div>

                      <div className="text-xs text-ink">
                        <strong className="font-semibold text-ink">“{doc.manuscript_title}”</strong>
                        <span className="text-ink-muted mx-1.5">·</span>
                        <span className="text-ink-muted">{doc.publisher_name}</span>
                        <span className="text-ink-muted mx-1.5">·</span>
                        <span className="font-mono text-[11px] text-ink-muted">#{doc.registration_no}</span>
                      </div>

                      {/* Signatories progress chips */}
                      <div className="flex flex-wrap items-center gap-2 pt-1">
                        <span className="text-[11px] text-ink-muted font-medium">Penandatangan:</span>
                        {doc.signatories?.map((sig, idx) => (
                          <span
                            key={idx}
                            className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-semibold border ${
                              sig.status === 'SIGNED'
                                ? 'bg-brand-50 text-brand-900 border-brand-100'
                                : 'bg-surface-subtle text-ink-muted border-line'
                            }`}
                          >
                            {sig.status === 'SIGNED' ? (
                              <CheckCircle2 className="w-3 h-3 text-brand-700 shrink-0" />
                            ) : (
                              <Clock className="w-3 h-3 text-ink-muted shrink-0" />
                            )}
                            <span>{sig.role_label}: {sig.status === 'SIGNED' ? 'Sudah' : 'Menunggu'}</span>
                          </span>
                        ))}
                      </div>
                    </div>
                  </div>

                  {/* Actions Column */}
                  <div className="flex items-center gap-2 shrink-0 pt-2 lg:pt-0 border-t lg:border-t-0 border-line">
                    <Button
                      variant="outline"
                      onClick={() => setPreviewDoc(doc)}
                      className="text-xs px-3 py-1.5"
                    >
                      <Eye className="w-3.5 h-3.5 mr-1 text-ink-muted" />
                      Pratinjau
                    </Button>

                    <Link
                      to={`/internal/verifications/${doc.assignment_id}`}
                      className="inline-flex items-center gap-1 text-xs px-3 py-1.5 rounded-lg border border-line hover:border-line-strong text-ink font-semibold hover:bg-canvas"
                    >
                      <span>Lembar Kerja</span>
                      <ExternalLink className="w-3 h-3 text-ink-muted" />
                    </Link>

                    {doc.canUserSign && doc.status !== 'SIGNED' && (
                      <Button
                        variant="primary"
                        onClick={() => setSignDialogDoc(doc)}
                        disabled={actionLoading}
                        className="text-xs px-3.5 py-1.5 font-bold"
                      >
                        <PenTool className="w-3.5 h-3.5 mr-1" />
                        Tanda Tangani
                      </Button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Confirmation Summary Dialog for Single Sign */}
      {signDialogDoc && (
        <ConfirmationSummaryDialog
          isOpen={Boolean(signDialogDoc)}
          onClose={() => setSignDialogDoc(null)}
          onConfirm={handleConfirmSignSingle}
          title="Tanda Tangani Dokumen Resmi"
          description="Pastikan draf naskah dan dokumen telah sesuai sebelum melakukan pembubuhan tanda tangan elektronik resmi."
          objectName={`${signDialogDoc.document_type === 'BERITA_ACARA_VERIFIKASI' ? 'Berita Acara' : 'Surat Pemberitahuan'}: ${signDialogDoc.document_no}`}
          nextActor="Penandatangan Selanjutnya / Penerbit"
          statusChange="SIGNING -> SIGNED"
          irreversibleConsequence="Tanda tangan elektronik ini memiliki kekuatan hukum sah Kementerian Agama RI. Dokumen yang telah ditandatangani tidak dapat ditarik kembali tanpa penerbitan surat pembatalan resmi."
          summaryItems={[
            { label: 'Nomor Dokumen', value: signDialogDoc.document_no },
            { label: 'Naskah Mushaf', value: signDialogDoc.manuscript_title },
            { label: 'Penerbit Pemohon', value: signDialogDoc.publisher_name },
            { label: 'Nomor Registrasi', value: signDialogDoc.registration_no },
          ]}
          confirmLabel="Tanda Tangani Secara Digital"
          confirmVariant="primary"
          loading={actionLoading}
        />
      )}

      {/* Confirmation Summary Dialog for Batch Sign */}
      {batchSignOpen && (
        <ConfirmationSummaryDialog
          isOpen={batchSignOpen}
          onClose={() => setBatchSignOpen(false)}
          onConfirm={handleConfirmBatchSign}
          title={`Tanda Tangani ${selectedDocIds.length} Dokumen Terpilih`}
          description="Anda akan membubuhkan tanda tangan elektronik resmi pada seluruh dokumen yang dipilih secara sekaligus."
          objectName={`${selectedDocIds.length} Dokumen Hasil Verifikasi`}
          nextActor="Tahap Selanjutnya / Penerbit"
          statusChange="SIGNING -> SIGNED (Massal)"
          irreversibleConsequence="Setiap pembubuhan tanda tangan bersifat mengikat secara hukum. Pastikan seluruh dokumen telah ditelaah."
          confirmLabel={`Tanda Tangani Semua (${selectedDocIds.length})`}
          confirmVariant="primary"
          loading={actionLoading}
        />
      )}

      {/* Document Preview Modal */}
      {previewDoc && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-ink/60 backdrop-blur-xs animate-fadeIn">
          <div className="bg-white rounded-xl max-w-2xl w-full p-6 space-y-4 shadow-xl border border-line">
            <div className="flex items-center justify-between border-b border-line pb-3">
              <div className="flex items-center gap-2 text-brand-950 font-bold text-sm">
                <FileCheck className="w-5 h-5 text-brand-700" />
                Pratinjau Dokumen Resmi
              </div>
              <button
                onClick={() => setPreviewDoc(null)}
                className="text-ink-muted hover:text-ink-muted p-1 rounded-lg"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-4 bg-canvas border border-line rounded-xl space-y-2 text-xs">
              <div className="flex justify-between">
                <span className="text-ink-muted">Nomor Dokumen:</span>
                <strong className="font-mono text-ink">{previewDoc.document_no}</strong>
              </div>
              <div className="flex justify-between">
                <span className="text-ink-muted">Naskah:</span>
                <strong className="text-ink">{previewDoc.manuscript_title}</strong>
              </div>
              <div className="flex justify-between">
                <span className="text-ink-muted">Penerbit:</span>
                <strong className="text-ink">{previewDoc.publisher_name}</strong>
              </div>
              <div className="flex justify-between">
                <span className="text-ink-muted">Status Pengesahan:</span>
                <span className="font-bold text-brand-800">{previewDoc.status}</span>
              </div>
            </div>

            <div className="p-4 bg-white border border-line rounded-xl space-y-2 text-xs leading-relaxed text-ink max-h-64 overflow-y-auto">
              <h5 className="font-bold text-ink border-b pb-1">
                KEMENTERIAN AGAMA REPUBLIK INDONESIA
                <br />
                LAJNAH PENTASHIHAN MUSHAF AL-QUR&apos;AN
              </h5>
              <p>
                Berdasarkan hasil pemeriksaan administrasi berkas dan master fisik mushaf atas pengajuan pendaftaran Nomor {previewDoc.registration_no} dari pemohon {previewDoc.publisher_name} untuk naskah &ldquo;{previewDoc.manuscript_title}&rdquo;, dokumen ini telah disusun dan diverifikasi sesuai ketentuan SOP Pentashihan Mushaf Al-Qur&apos;an.
              </p>
              <p>
                Dokumen ini memiliki kekuatan hukum resmi dan ditandatangani secara elektronik bersertifikat BSrE BSSN.
              </p>
            </div>

            <div className="flex items-center justify-end gap-2 pt-2 border-t border-line">
              <Button
                variant="outline"
                onClick={() => setPreviewDoc(null)}
                className="text-xs"
              >
                Tutup Pratinjau
              </Button>
              {previewDoc.canUserSign && previewDoc.status !== 'SIGNED' && (
                <Button
                  variant="primary"
                  onClick={() => {
                    const target = previewDoc;
                    setPreviewDoc(null);
                    setSignDialogDoc(target);
                  }}
                  className="text-xs font-bold"
                >
                  <PenTool className="w-3.5 h-3.5 mr-1" />
                  Lanjutkan Tanda Tangan
                </Button>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default SignatureCenterPage;
