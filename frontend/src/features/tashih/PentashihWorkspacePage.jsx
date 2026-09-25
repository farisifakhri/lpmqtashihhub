import React, { useState, useMemo } from 'react';
import { useAuth } from '@/features/auth/AuthContext';
import { tashihApi } from '@/api/tashih.api';
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
  const [activeTab, setActiveTab] = useState('ACTIVE'); // 'ACTIVE' | 'COMPLETED'
  const [page, setPage] = useState(1);
  const { assignments, hasMore, loading, error, fetchAssignments } = useAssignments(activeTab, page);
  const [searchQuery, setSearchQuery] = useState('');
  const [successMessage, setSuccessMessage] = useState(null);

  // Review Dialog State
  const [reviewModalOpen, setReviewModalOpen] = useState(false);
  const [selectedAssignment, setSelectedAssignment] = useState(null);
  const [reviewResult, setReviewResult] = useState('PASSED'); // 'PASSED' | 'REVISION_REQUIRED'
  const [reviewNotes, setReviewNotes] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [modalError, setModalError] = useState(null);

  const filteredAssignments = useMemo(() => {
    return assignments.filter((item) => {
      const isDone = item.status === 'COMPLETED' || (item.reviews && item.reviews.length > 0);
      const matchesTab = activeTab === 'ACTIVE' ? !isDone : isDone;

      if (!matchesTab) return false;

      if (!searchQuery.trim()) return true;
      const q = searchQuery.toLowerCase();
      const regNo = item.registration?.registration_no?.toLowerCase() || '';
      const title = item.registration?.title?.toLowerCase() || '';
      const publisher = item.registration?.publisher?.legal_name?.toLowerCase() || '';
      return regNo.includes(q) || title.includes(q) || publisher.includes(q);
    });
  }, [assignments, activeTab, searchQuery]);

  const activeCount = useMemo(() => {
    return assignments.filter(
      (a) => a.status !== 'COMPLETED' && (!a.reviews || a.reviews.length === 0)
    ).length;
  }, [assignments]);

  const completedCount = useMemo(() => {
    return assignments.filter(
      (a) => a.status === 'COMPLETED' || (a.reviews && a.reviews.length > 0)
    ).length;
  }, [assignments]);

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
    setModalError(null);
    setReviewModalOpen(true);
  };

  const closeReviewModal = () => {
    if (submitting) return;
    setReviewModalOpen(false);
    setSelectedAssignment(null);
    setModalError(null);
  };

  const handleReviewSubmit = async (e) => {
    e.preventDefault();
    if (!selectedAssignment) return;

    if (!reviewNotes.trim() || reviewNotes.trim().length > 10000) {
      setModalError('Catatan hasil telaah wajib diisi dan maksimal 10000 karakter.');
      return;
    }

    setSubmitting(true);
    setModalError(null);

    try {
      await tashihApi.recordReview(selectedAssignment.id, {
        result: reviewResult,
        notes: reviewNotes.trim(),
      });

      setSuccessMessage(
        `Hasil telaah untuk naskah ${selectedAssignment.registration?.registration_no} berhasil disimpan.`
      );
      setReviewModalOpen(false);
      setSelectedAssignment(null);
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
        title="Ruang Sidang Pentashihan Mushaf"
        subtitle="Pencatatan telaah rasm usmani, harakat, dabt, waqaf, dan tanda baca per naskah master sesuai SOP Sidang Reguler LPMQ"
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
            className="text-brand-700 hover:text-brand-900 font-bold"
          >
            Tutup
          </button>
        </div>
      )}

      <AssignmentListPanel
        activeCount={activeCount}
        completedCount={completedCount}
        currentUser={currentUser}
        page={page}
        activeTab={activeTab}
        setActiveTab={setActiveTab}
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
