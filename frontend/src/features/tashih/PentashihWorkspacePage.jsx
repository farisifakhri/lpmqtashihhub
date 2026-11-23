import React, { useState, useMemo, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useAuth } from '@/features/auth/AuthContext';
import { tashihApi } from '@/api/tashih.api';
import { invalidateQueueCounts } from '@/api/queue.api';
import { ReviewForm } from './components/ReviewForm';
import { AssignmentListPanel } from './components/AssignmentListPanel';
import { useAssignments } from './hooks/useAssignments';
import { PageHeader } from '@/components/ui/PageHeader';
import { Button } from '@/components/ui/Button';
import {
  BookOpen,
  CheckCircle2,
  RefreshCw,
} from 'lucide-react';

export const PentashihWorkspacePage = () => {
  const { currentUser } = useAuth();
  const [searchParams, setSearchParams] = useSearchParams();
  const rawUrlTab = searchParams.get('tab');
  const initialTab = rawUrlTab === 'REVISION' ? 'REVISION' : (rawUrlTab === 'COMPLETED' ? 'COMPLETED' : 'ACTIVE');
  const [activeTab, setActiveTab] = useState(initialTab);
  const [page, setPage] = useState(1);

  useEffect(() => {
    const tabFromUrl = searchParams.get('tab');
    if (tabFromUrl === 'REVISION' && activeTab !== 'REVISION') {
      setActiveTab('REVISION');
      setPage(1);
    } else if (tabFromUrl === 'COMPLETED' && activeTab !== 'COMPLETED') {
      setActiveTab('COMPLETED');
      setPage(1);
    } else if (!tabFromUrl && activeTab !== 'ACTIVE') {
      setActiveTab('ACTIVE');
      setPage(1);
    }
  }, [searchParams]);

  // Muat seluruh penugasan agar seluruh tab badge & statistik mencerminkan jumlah akurat secara bersamaan
  const { assignments, hasMore, loading, error, fetchAssignments } = useAssignments(undefined, page);
  const [searchQuery, setSearchQuery] = useState('');
  const [successMessage, setSuccessMessage] = useState(null);

  // Review Dialog State
  const [reviewModalOpen, setReviewModalOpen] = useState(false);
  const [selectedAssignment, setSelectedAssignment] = useState(null);
  const [reviewResult, setReviewResult] = useState('PASSED'); // 'PASSED' | 'REVISION_REQUIRED'
  const [reviewNotes, setReviewNotes] = useState('');
  const [juzItems, setJuzItems] = useState([]);
  const [submitting, setSubmitting] = useState(false);
  const [modalError, setModalError] = useState(null);
  const [recapFileId, setRecapFileId] = useState(null);
  const [recapScope, setRecapScope] = useState('TEAM');

  const isRevisionItem = (item) => {
    const regStage = item.registration?.stage || '';
    const itemStage = item.stage || '';
    const itemStatus = item.status || '';
    const hasRevisionDocs = Array.isArray(item.registration?.official_documents) && item.registration.official_documents.length > 0;
    return (
      itemStage === 'REVISION' ||
      itemStage === 'DUMMY' ||
      itemStatus === 'REVISION' ||
      regStage.includes('REVISION') ||
      regStage.includes('DUMMY') ||
      hasRevisionDocs
    );
  };

  const isAssignmentDone = (a) => (
    a.status === 'COMPLETED' && (
      (Array.isArray(a.reviews) && a.reviews.length > 0) ||
      a.registration?.status !== 'TASHIH_IN_PROGRESS'
    )
  );

  const initialActiveAssignments = useMemo(() => {
    return assignments.filter((a) => {
      return !isAssignmentDone(a) && !isRevisionItem(a);
    });
  }, [assignments]);

  const revisionAssignments = useMemo(() => {
    return assignments.filter((a) => {
      return !isAssignmentDone(a) && isRevisionItem(a);
    });
  }, [assignments]);

  const completedAssignments = useMemo(() => {
    return assignments.filter((a) => isAssignmentDone(a));
  }, [assignments]);

  const filteredAssignments = useMemo(() => {
    let source = initialActiveAssignments;
    if (activeTab === 'REVISION') {
      source = revisionAssignments;
    } else if (activeTab === 'COMPLETED') {
      source = completedAssignments;
    }

    if (!searchQuery.trim()) return source;
    const q = searchQuery.toLowerCase();
    return source.filter((item) => {
      const regNo = item.registration?.registration_no?.toLowerCase() || '';
      const title = item.registration?.title?.toLowerCase() || '';
      const publisher = item.registration?.publisher?.legal_name?.toLowerCase() || '';
      return regNo.includes(q) || title.includes(q) || publisher.includes(q);
    });
  }, [initialActiveAssignments, revisionAssignments, completedAssignments, activeTab, searchQuery]);

  const initialCount = initialActiveAssignments.length;
  const revisionCount = revisionAssignments.length;
  const activeCount = initialCount + revisionCount;
  const completedCount = completedAssignments.length;

  const handleTabChange = (tab) => {
    setActiveTab(tab);
    setPage(1);
    if (tab === 'ACTIVE') {
      setSearchParams({});
    } else {
      setSearchParams({ tab });
    }
  };

  const openReviewModal = (assignment) => {
    setSelectedAssignment(assignment);
    const existingReview = assignment.reviews?.[0];
    if (existingReview) {
      setReviewResult(existingReview.result || 'PASSED');
      setReviewNotes(existingReview.notes || '');
      setRecapScope(existingReview.recap_scope || (assignment.team_id || assignment.team ? 'TEAM' : 'SELF'));
    } else {
      setReviewResult('PASSED');
      setReviewNotes('');
      setRecapScope(assignment.team_id || assignment.team ? 'TEAM' : 'SELF');
    }
    if (assignment.juz_items?.length) {
      setJuzItems(
        assignment.juz_items.map((j) => ({
          id: j.id,
          juz_number: j.juz_number,
          result: j.result || existingReview?.result || 'PASSED',
          notes: j.notes || '',
        }))
      );
    } else {
      setJuzItems([]);
    }

    const teamRecapFileId = assignment.registration?.assignments
      ?.filter((a) => a.team_id && a.team_id === assignment.team_id && a.iteration === assignment.iteration)
      ?.flatMap((a) => a.reviews || [])
      ?.find((r) => r.recap_scope === 'TEAM' && r.recap_file_id)?.recap_file_id;

    setRecapFileId(existingReview?.recap_file_id || assignment.recap_file_id || teamRecapFileId || null);
    setModalError(null);
    setReviewModalOpen(true);
  };

  const closeReviewModal = () => {
    if (submitting) return;
    setReviewModalOpen(false);
    setSelectedAssignment(null);
    setJuzItems([]);
    setRecapFileId(null);
    setModalError(null);
  };

  const handleReviewSubmit = async (e) => {
    e.preventDefault();
    if (!selectedAssignment) return;

    if (reviewNotes.trim().length > 10000) {
      setModalError('Catatan hasil telaah maksimal 10000 karakter.');
      return;
    }

    if (!recapFileId) {
      setModalError('Berkas rekapan hasil telaah internal wajib diunggah sebelum menyimpan hasil sidang.');
      return;
    }

    setSubmitting(true);
    setModalError(null);

    try {
      await tashihApi.recordReview(selectedAssignment.id, {
        result: reviewResult,
        notes: reviewNotes.trim(),
        recap_file_id: recapFileId || undefined,
        recap_scope: recapScope,
        juz_items: juzItems?.length
          ? juzItems.map((j) => ({
              id: j.id,
              juz_number: j.juz_number,
              result: j.result,
              notes: j.notes?.trim() || null,
            }))
          : undefined,
      });
      invalidateQueueCounts();

      setSuccessMessage(
        `Hasil telaah untuk naskah ${selectedAssignment.registration?.registration_no} berhasil disimpan.`
      );
      setReviewModalOpen(false);
      setSelectedAssignment(null);
      setRecapFileId(null);
      fetchAssignments();
    } catch (err) {
      setModalError(err.message || 'Gagal menyimpan hasil telaah sidang.');
    } finally {
      setSubmitting(false);
    }
  };

  const getStageLabel = (stage) => {
    switch (stage) {
      case 'INITIAL':
        return 'Tahap Awal';
      case 'REVISION':
        return 'Tahap Perbaikan';
      case 'DUMMY':
        return 'Tahap Naskah Dumi';
      default:
        return stage || 'Sidang';
    }
  };

  return (
    <div className="space-y-6">
      {/* 1. Header Halaman */}
      <PageHeader
        title={
          activeTab === 'REVISION'
            ? 'Ruang Sidang Pentashihan Mushaf (Revisi & Dumi)'
            : (activeTab === 'COMPLETED' ? 'Ruang Sidang Pentashihan Mushaf (Riwayat Selesai)' : 'Ruang Sidang Pentashihan Mushaf (Awal)')
        }
        subtitle={
          activeTab === 'REVISION'
            ? 'Pemeriksaan perbaikan naskah sesuai catatan sidang dan telaah contoh cetak (dumi) dari penerbit'
            : (activeTab === 'COMPLETED' ? 'Daftar penugasan sidang pentashihan mushaf yang telah selesai diputuskan' : 'Checklist koreksi lafazh dan harakat per juz untuk naskah yang ditugaskan Distributor')
        }
        icon={<BookOpen className="w-6 h-6 text-brand-700" />}
        action={
          <Button
            variant="outline"
            size="sm"
            onClick={fetchAssignments}
            disabled={loading}
            icon={<RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />}
          >
            Segarkan
          </Button>
        }
      />

      {/* Pesan Sukses */}
      {successMessage && (
        <div className="p-4 rounded-xl bg-brand-50 border border-brand-100 text-brand-800 text-xs flex items-center justify-between">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-brand-700 flex-shrink-0" />
            <span>{successMessage}</span>
          </div>
          <button
            onClick={() => setSuccessMessage(null)}
            className="text-brand-fg hover:text-brand-900 font-bold"
          >
            Tutup
          </button>
        </div>
      )}

      <AssignmentListPanel
        activeCount={activeCount}
        initialCount={initialCount}
        revisionCount={revisionCount}
        completedCount={completedCount}
        currentUser={currentUser}
        page={page}
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        onTabChange={handleTabChange}
        setPage={setPage}
        searchQuery={searchQuery}
        setSearchQuery={setSearchQuery}
        loading={loading}
        error={error}
        filteredAssignments={filteredAssignments}
        getStageLabel={getStageLabel}
        openReviewModal={openReviewModal}
        hasMore={hasMore}
      />
      {/* 4. Modal Formulir Telaah Sidang Pentashihan */}
      <ReviewForm
        selectedAssignment={reviewModalOpen ? selectedAssignment : null}
        reviewResult={reviewResult}
        setReviewResult={setReviewResult}
        reviewNotes={reviewNotes}
        setReviewNotes={setReviewNotes}
        juzItems={juzItems}
        setJuzItems={setJuzItems}
        recapFileId={recapFileId}
        setRecapFileId={setRecapFileId}
        recapScope={recapScope}
        setRecapScope={setRecapScope}
        submitting={submitting}
        modalError={modalError}
        closeReviewModal={closeReviewModal}
        handleReviewSubmit={handleReviewSubmit}
        getStageLabel={getStageLabel}
      />
    </div>
  );
};

export default PentashihWorkspacePage;
