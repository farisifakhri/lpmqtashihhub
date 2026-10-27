import React, { useState, useMemo, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useAuth } from '@/features/auth/AuthContext';
import { tashihApi } from '@/api/tashih.api';
import { ReviewForm } from './components/ReviewForm';
import { AssignmentListPanel } from './components/AssignmentListPanel';
import { JuzChecklistForm } from './components/JuzChecklistForm';
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

  // Request ACTIVE assignments from backend if tab is ACTIVE or REVISION, otherwise COMPLETED
  const backendStatus = activeTab === 'COMPLETED' ? 'COMPLETED' : 'ACTIVE';
  const { assignments, hasMore, loading, error, fetchAssignments } = useAssignments(backendStatus, page);
  const [searchQuery, setSearchQuery] = useState('');
  const [successMessage, setSuccessMessage] = useState(null);

  // Review Dialog State
  const [reviewModalOpen, setReviewModalOpen] = useState(false);
  const [selectedAssignment, setSelectedAssignment] = useState(null);
  const [reviewResult, setReviewResult] = useState('PASSED'); // 'PASSED' | 'REVISION_REQUIRED'
  const [reviewNotes, setReviewNotes] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [modalError, setModalError] = useState(null);
  const [recapFileId, setRecapFileId] = useState(null);

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

  const initialActiveAssignments = useMemo(() => {
    return assignments.filter((a) => {
      const isDone = a.status === 'COMPLETED' || (a.reviews && a.reviews.length > 0);
      return !isDone && !isRevisionItem(a);
    });
  }, [assignments]);

  const revisionAssignments = useMemo(() => {
    return assignments.filter((a) => {
      const isDone = a.status === 'COMPLETED' || (a.reviews && a.reviews.length > 0);
      return !isDone && isRevisionItem(a);
    });
  }, [assignments]);

  const completedAssignments = useMemo(() => {
    return assignments.filter((a) => a.status === 'COMPLETED' || (a.reviews && a.reviews.length > 0));
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

  const handleJuzSaved = updated => {
    setSelectedAssignment(previous => {
      if (!previous) return previous;
      const newItems = previous.juz_items?.map(item => item.id === updated.id ? updated : item) || [];
      const allDone = newItems.length > 0 && newItems.every(i => i.result);
      if (allDone) {
        setSuccessMessage(`Seluruh ${newItems.length} juz penugasan selesai diperiksa dan hasil sidang berhasil dicatat.`);
        setReviewModalOpen(false);
        fetchAssignments();
        return null;
      }
      return { ...previous, juz_items: newItems };
    });
    setSuccessMessage(`Checklist juz ${updated.juz_number} berhasil disimpan.`);
    fetchAssignments();
  };

  const openReviewModal = (assignment) => {
    setSelectedAssignment(assignment);
    const existingReview = assignment.reviews?.[0];
    if (existingReview) {
      setReviewResult(existingReview.result || 'PASSED');
      setReviewNotes(existingReview.notes || '');
    } else {
      setReviewResult('PASSED');
      setReviewNotes('');
    }
    setRecapFileId(assignment.recap_file_id || null);
    setModalError(null);
    setReviewModalOpen(true);
  };

  const closeReviewModal = () => {
    if (submitting) return;
    setReviewModalOpen(false);
    setSelectedAssignment(null);
    setRecapFileId(null);
    setModalError(null);
  };

  const handleReviewSubmit = async (e) => {
    e.preventDefault();
    if (!selectedAssignment) return;

    if (!reviewNotes.trim() || reviewNotes.trim().length > 10000) {
      setModalError('Catatan hasil telaah wajib diisi dan maksimal 10000 karakter.');
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
      });

      setSuccessMessage(
        `Hasil telaah untuk naskah ${selectedAssignment.registration?.registration_no} berhasil disimpan.`
      );
      setReviewModalOpen(false);
      setSelectedAssignment(null);
      setRecapFileId(null);
      fetchAssignments();
    } catch (err) {
      if (err.status === 409 || err.message?.includes('sudah disimpan')) {
        setSuccessMessage(
          `Hasil telaah untuk naskah ${selectedAssignment.registration?.registration_no} sudah tercatat.`
        );
        setReviewModalOpen(false);
        setSelectedAssignment(null);
        fetchAssignments();
      } else {
        setModalError(err.message || 'Gagal menyimpan hasil telaah sidang.');
      }
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
      {reviewModalOpen && selectedAssignment?.juz_items?.length ? <JuzChecklistForm
        assignment={selectedAssignment}
        onClose={closeReviewModal}
        onSaved={handleJuzSaved}
      /> : <ReviewForm
        selectedAssignment={reviewModalOpen ? selectedAssignment : null}
        reviewResult={reviewResult}
        setReviewResult={setReviewResult}
        reviewNotes={reviewNotes}
        setReviewNotes={setReviewNotes}
        recapFileId={recapFileId}
        setRecapFileId={setRecapFileId}
        submitting={submitting}
        modalError={modalError}
        closeReviewModal={closeReviewModal}
        handleReviewSubmit={handleReviewSubmit}
        getStageLabel={getStageLabel}
      />}
    </div>
  );
};

export default PentashihWorkspacePage;
