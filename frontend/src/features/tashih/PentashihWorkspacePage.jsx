import React, { useState, useEffect, useMemo, useRef } from 'react';
import { useAuth } from '@/features/auth/AuthContext';
import { tashihApi } from '@/api/tashih.api';
import { PageHeader } from '@/components/ui/PageHeader';
import { Button } from '@/components/ui/Button';
import { StatusBadge } from '@/components/ui/StatusBadge';
import {
  BookOpen,
  CheckCircle2,
  AlertTriangle,
  Clock,
  Search,
  RefreshCw,
  FileText,
  Building2,
  Calendar,
  Layers,
  ShieldCheck,
  AlertCircle,
  X,
  ExternalLink,
  ChevronRight,
  Send,
  Download,
  Info,
} from 'lucide-react';
import { clsx } from 'clsx';

export const PentashihWorkspacePage = () => {
  const { currentUser } = useAuth();
  const [activeTab, setActiveTab] = useState('ACTIVE'); // 'ACTIVE' | 'COMPLETED'
  const [assignments, setAssignments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [successMessage, setSuccessMessage] = useState(null);

  // Review Dialog State
  const [reviewModalOpen, setReviewModalOpen] = useState(false);
  const [selectedAssignment, setSelectedAssignment] = useState(null);
  const [reviewResult, setReviewResult] = useState('PASSED'); // 'PASSED' | 'REVISION_REQUIRED'
  const [reviewNotes, setReviewNotes] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [modalError, setModalError] = useState(null);

  const fetchAssignments = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await tashihApi.getMyAssignments();
      if (res?.data) {
        setAssignments(res.data);
      }
    } catch (err) {
      setError(err.message || 'Gagal memuat tugas sidang pentashihan.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAssignments();
  }, []);

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

    if (!reviewNotes.trim()) {
      setModalError('Catatan hasil telaah wajib diisi.');
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
      closeReviewModal();
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
        icon={<BookOpen className="w-6 h-6 text-emerald-700" />}
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
        <div className="p-4 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs flex items-center justify-between">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-600 flex-shrink-0" />
            <span>{successMessage}</span>
          </div>
          <button
            onClick={() => setSuccessMessage(null)}
            className="text-emerald-700 hover:text-emerald-900 font-bold"
          >
            Tutup
          </button>
        </div>
      )}

      {/* 2. Kartu Statistik Ringkas */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="rounded-xl border border-amber-200/90 p-4 bg-gradient-to-br from-amber-50/80 via-white to-orange-50/30 shadow-xs">
          <div className="flex items-center justify-between">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-amber-500 to-orange-600 text-white flex items-center justify-center shadow-xs">
              <Clock className="w-4.5 h-4.5" />
            </div>
            <span className="text-[11px] font-bold px-2.5 py-0.5 rounded-full bg-amber-100 text-amber-900 border border-amber-300">
              Perlu Ditelaah
            </span>
          </div>
          <div className="mt-3">
            <div className="text-2xl font-black text-amber-950 tabular-nums">{activeCount}</div>
            <div className="text-xs font-bold text-amber-900 mt-0.5">Tugas Sidang Aktif</div>
            <div className="text-[11px] text-slate-500">Naskah master menunggu telaah</div>
          </div>
        </div>

        <div className="rounded-xl border border-emerald-200/90 p-4 bg-gradient-to-br from-emerald-50/80 via-white to-teal-50/30 shadow-xs">
          <div className="flex items-center justify-between">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-emerald-600 to-teal-700 text-white flex items-center justify-center shadow-xs">
              <CheckCircle2 className="w-4.5 h-4.5" />
            </div>
            <span className="text-[11px] font-bold px-2.5 py-0.5 rounded-full bg-emerald-100 text-emerald-900 border border-emerald-300">
              Selesai
            </span>
          </div>
          <div className="mt-3">
            <div className="text-2xl font-black text-emerald-950 tabular-nums">{completedCount}</div>
            <div className="text-xs font-bold text-emerald-900 mt-0.5">Riwayat Selesai</div>
            <div className="text-[11px] text-slate-500">Hasil telaah telah dikirim ke distributor</div>
          </div>
        </div>

        <div className="rounded-xl border border-sky-200/90 p-4 bg-gradient-to-br from-sky-50/80 via-white to-blue-50/30 shadow-xs">
          <div className="flex items-center justify-between">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-sky-500 to-blue-600 text-white flex items-center justify-center shadow-xs">
              <ShieldCheck className="w-4.5 h-4.5" />
            </div>
            <span className="text-[11px] font-bold px-2.5 py-0.5 rounded-full bg-sky-100 text-sky-900 border border-sky-300">
              Kewenangan
            </span>
          </div>
          <div className="mt-3">
            <div className="text-sm font-black text-sky-950">{currentUser?.name || 'Pentashih'}</div>
            <div className="text-xs font-bold text-sky-900 mt-0.5">Anggota Tim Pentashih LPMQ</div>
            <div className="text-[11px] text-slate-500">Penugasan berbasis SK aktif Kepala LPMQ</div>
          </div>
        </div>
      </div>

      {/* 3. Panel Daftar Penugasan Sidang */}
      <div className="bg-white rounded-2xl border border-slate-200/90 shadow-xs overflow-hidden">
        {/* Tab & Filter Bar */}
        <div className="p-5 sm:p-6 border-b border-slate-100 space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
            {/* Tabs */}
            <div className="inline-flex items-center p-1 rounded-xl bg-slate-100 border border-slate-200 text-xs font-semibold">
              <button
                type="button"
                onClick={() => setActiveTab('ACTIVE')}
                className={clsx(
                  'px-3.5 py-1.5 rounded-lg transition-all flex items-center gap-1.5 cursor-pointer',
                  activeTab === 'ACTIVE'
                    ? 'bg-white text-emerald-900 font-bold shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                )}
              >
                <span>Tugas Sidang Aktif</span>
                <span className="px-1.5 py-0.2 rounded-full bg-amber-100 text-amber-900 text-[10px] font-bold">
                  {activeCount}
                </span>
              </button>
              <button
                type="button"
                onClick={() => setActiveTab('COMPLETED')}
                className={clsx(
                  'px-3.5 py-1.5 rounded-lg transition-all flex items-center gap-1.5 cursor-pointer',
                  activeTab === 'COMPLETED'
                    ? 'bg-white text-emerald-900 font-bold shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                )}
              >
                <span>Riwayat Selesai</span>
                <span className="px-1.5 py-0.2 rounded-full bg-slate-200 text-slate-700 text-[10px]">
                  {completedCount}
                </span>
              </button>
            </div>

            {/* Search Input */}
            <div className="relative w-full sm:w-auto sm:min-w-[280px]">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Cari nomor naskah, judul, atau penerbit..."
                className="w-full pl-9 pr-3.5 py-2 text-xs bg-slate-50/70 border border-slate-300 rounded-xl outline-none focus:bg-white focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-700 transition-all text-slate-800"
              />
            </div>
          </div>
        </div>

        {/* Konten Daftar Tugas */}
        {loading ? (
          <div className="py-16 text-center text-slate-500">
            <RefreshCw className="w-7 h-7 animate-spin mx-auto mb-2 text-emerald-700" />
            <p className="text-xs font-semibold">Memuat daftar tugas sidang pentashihan...</p>
          </div>
        ) : error ? (
          <div className="p-8 text-center text-rose-600 text-xs">
            <AlertCircle className="w-8 h-8 mx-auto mb-2 text-rose-500" />
            <p className="font-bold">{error}</p>
          </div>
        ) : filteredAssignments.length === 0 ? (
          <div className="py-16 text-center text-slate-500 max-w-sm mx-auto">
            <div className="w-12 h-12 rounded-full bg-slate-100 text-slate-400 flex items-center justify-center mx-auto mb-2.5">
              <BookOpen className="w-6 h-6" />
            </div>
            <p className="text-sm font-bold text-slate-800">
              {activeTab === 'ACTIVE'
                ? 'Tidak ada tugas sidang aktif'
                : 'Belum ada riwayat sidang selesai'}
            </p>
            <p className="text-xs text-slate-500 mt-1">
              {searchQuery
                ? `Tidak ada hasil untuk pencarian "${searchQuery}"`
                : activeTab === 'ACTIVE'
                ? 'Seluruh naskah yang ditugaskan kepada Anda telah selesai ditelaah.'
                : 'Hasil telaah sidang yang Anda selesaikan akan tercatat di sini.'}
            </p>
          </div>
        ) : (
          <div className="divide-y divide-slate-100">
            {filteredAssignments.map((assignment) => {
              const reg = assignment.registration;
              const hasReview = assignment.reviews && assignment.reviews.length > 0;
              const review = hasReview ? assignment.reviews[0] : null;
              const isOverdue =
                assignment.status === 'OVERDUE' ||
                (!hasReview && assignment.due_at && new Date(assignment.due_at) < new Date());

              return (
                <div
                  key={assignment.id}
                  className="p-5 sm:p-6 hover:bg-slate-50/60 transition-colors flex flex-col md:flex-row md:items-center justify-between gap-4"
                >
                  <div className="space-y-2 flex-1 min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="font-mono text-xs font-bold text-emerald-800 bg-emerald-50 px-2 py-0.5 rounded-md border border-emerald-200">
                        {reg?.registration_no || 'REG-LPMQ'}
                      </span>
                      <span className="inline-flex items-center text-[11px] font-semibold px-2 py-0.5 rounded-md bg-slate-100 text-slate-700 border border-slate-200">
                        {getStageLabel(assignment.stage)} • Iterasi #{assignment.iteration}
                      </span>
                      {assignment.team && (
                        <span className="text-[11px] text-slate-500 font-medium">
                          {assignment.team.name}
                        </span>
                      )}
                      {isOverdue && !hasReview && (
                        <span className="inline-flex items-center gap-1 text-[11px] font-bold px-2 py-0.5 rounded-md bg-rose-100 text-rose-800 border border-rose-200">
                          <AlertTriangle className="w-3 h-3" /> Overdue SLA
                        </span>
                      )}
                    </div>

                    <div>
                      <h4 className="text-base font-bold text-slate-900 line-clamp-1">
                        {reg?.title || 'Judul Naskah Master Mushaf'}
                      </h4>
                      <p className="text-xs text-slate-500 flex flex-wrap items-center gap-2 mt-0.5">
                        <span className="font-semibold text-slate-700">
                          {reg?.publisher?.legal_name || 'Penerbit'}
                        </span>
                        <span>•</span>
                        <span>{reg?.service_type?.name || 'Layanan Mushaf'}</span>
                      </p>
                    </div>

                    {/* Meta Tenggat & Telaah */}
                    <div className="flex flex-wrap items-center gap-4 text-xs text-slate-500 pt-1">
                      <div className="flex items-center gap-1.5">
                        <Calendar className="w-3.5 h-3.5 text-slate-400" />
                        <span>
                          Ditugaskan:{' '}
                          {new Date(assignment.created_at).toLocaleDateString('id-ID', {
                            day: 'numeric',
                            month: 'short',
                            year: 'numeric',
                          })}
                        </span>
                      </div>
                      {assignment.due_at && (
                        <div
                          className={clsx(
                            'flex items-center gap-1.5 font-medium',
                            isOverdue && !hasReview ? 'text-rose-700 font-bold' : 'text-slate-600'
                          )}
                        >
                          <Clock className="w-3.5 h-3.5" />
                          <span>
                            Tenggat SLA:{' '}
                            {new Date(assignment.due_at).toLocaleDateString('id-ID', {
                              day: 'numeric',
                              month: 'short',
                              year: 'numeric',
                            })}
                          </span>
                        </div>
                      )}
                    </div>

                    {/* Ringkasan Telaah jika sudah selesai */}
                    {review && (
                      <div className="mt-3 p-3 rounded-xl bg-slate-50 border border-slate-200 text-xs space-y-1.5">
                        <div className="flex items-center gap-2">
                          <span className="font-bold text-slate-700">Rekomendasi Anda:</span>
                          {review.result === 'PASSED' ? (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 font-bold border border-emerald-200 text-[11px]">
                              <CheckCircle2 className="w-3 h-3" /> Lolos Tanpa Catatan (Bersih)
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-amber-100 text-amber-900 font-bold border border-amber-200 text-[11px]">
                              <AlertTriangle className="w-3 h-3" /> Perlu Perbaikan Naskah
                            </span>
                          )}
                          <span className="text-slate-400 text-[11px] ml-auto">
                            {new Date(review.completed_at).toLocaleDateString('id-ID', {
                              day: 'numeric',
                              month: 'short',
                              year: 'numeric',
                              hour: '2-digit',
                              minute: '2-digit',
                            })}{' '}
                            WIB
                          </span>
                        </div>
                        {review.notes && (
                          <p className="text-slate-600 italic line-clamp-2">
                            "{review.notes}"
                          </p>
                        )}
                      </div>
                    )}
                  </div>

                  {/* Tombol Aksi */}
                  <div className="flex md:flex-col items-center md:items-end justify-end gap-2 shrink-0">
                    {!hasReview ? (
                      <Button
                        variant="primary"
                        size="sm"
                        onClick={() => openReviewModal(assignment)}
                        className="font-bold text-xs bg-emerald-700 hover:bg-emerald-800 text-white"
                        icon={<BookOpen className="w-4 h-4" />}
                      >
                        Buka Lembar Telaah
                      </Button>
                    ) : (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => openReviewModal(assignment)}
                        className="text-xs text-slate-700"
                        icon={<FileText className="w-3.5 h-3.5" />}
                      >
                        Lihat Hasil Telaah
                      </Button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* 4. Modal Formulir Telaah Sidang Pentashihan */}
      {reviewModalOpen && selectedAssignment && (
        <div
          className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs p-4 sm:p-6 flex items-center justify-center overflow-y-auto"
          role="dialog"
          aria-modal="true"
          aria-labelledby="review-modal-title"
        >
          <div className="w-full max-w-2xl bg-white rounded-2xl shadow-2xl border border-slate-200 overflow-hidden flex flex-col max-h-[90vh]">
            {/* Modal Header */}
            <div className="p-5 border-b border-slate-200 flex items-center justify-between gap-4 bg-slate-50/80">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl bg-emerald-700 text-white flex items-center justify-center shadow-xs">
                  <BookOpen className="w-5 h-5" />
                </div>
                <div>
                  <h3 id="review-modal-title" className="text-base font-bold text-slate-900">
                    Lembar Telaah Sidang Pentashihan
                  </h3>
                  <p className="text-xs text-slate-500">
                    {selectedAssignment.registration?.registration_no} •{' '}
                    {getStageLabel(selectedAssignment.stage)}
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={closeReviewModal}
                disabled={submitting}
                className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-200/60 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Body Form */}
            <form onSubmit={handleReviewSubmit} className="p-5 sm:p-6 overflow-y-auto space-y-5 flex-1">
              {modalError && (
                <div className="p-3.5 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-xs flex items-start gap-2">
                  <AlertCircle className="w-4 h-4 shrink-0 mt-0.5 text-rose-600" />
                  <div>{modalError}</div>
                </div>
              )}

              {/* Rincian Naskah */}
              <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 space-y-2">
                <div className="font-bold text-sm text-slate-900">
                  {selectedAssignment.registration?.title}
                </div>
                <div className="text-xs text-slate-600 flex flex-wrap gap-y-1 gap-x-3">
                  <span>Penerbit: <strong>{selectedAssignment.registration?.publisher?.legal_name}</strong></span>
                  <span>•</span>
                  <span>Layanan: <strong>{selectedAssignment.registration?.service_type?.name}</strong></span>
                </div>
              </div>

              {/* Berkas Digital Master Mushaf */}
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-2">
                  Berkas Master Mushaf Digital
                </label>
                {selectedAssignment.registration?.manuscript_files?.length ? (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    {selectedAssignment.registration.manuscript_files.map((file) => (
                      <a
                        key={file.id}
                        href={`/api/v1/uploads/${file.file_id}`}
                        target="_blank"
                        rel="noreferrer"
                        className="p-2.5 rounded-lg border border-slate-200 bg-white hover:border-emerald-500 hover:bg-emerald-50/30 transition-all flex items-center justify-between text-xs group"
                      >
                        <div className="flex items-center gap-2 truncate">
                          <FileText className="w-4 h-4 text-emerald-700 shrink-0" />
                          <span className="font-medium text-slate-800 group-hover:text-emerald-800 truncate">
                            {file.file_type || 'Berkas Naskah'}
                          </span>
                        </div>
                        <Download className="w-3.5 h-3.5 text-slate-400 group-hover:text-emerald-700 shrink-0 ml-1" />
                      </a>
                    ))}
                  </div>
                ) : (
                  <div className="p-3 rounded-lg bg-amber-50 border border-amber-200 text-amber-800 text-xs">
                    Berkas digital belum diunggah atau naskah diperiksa melalui master fisik cetak A4.
                  </div>
                )}
              </div>

              {/* Pilihan Rekomendasi / Keputusan Sidang */}
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-2">
                  Rekomendasi Hasil Sidang
                </label>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <label
                    className={clsx(
                      'p-3.5 rounded-xl border-2 transition-all cursor-pointer flex items-start gap-3',
                      reviewResult === 'PASSED'
                        ? 'border-emerald-600 bg-emerald-50/50'
                        : 'border-slate-200 hover:border-slate-300'
                    )}
                  >
                    <input
                      type="radio"
                      name="reviewResult"
                      value="PASSED"
                      checked={reviewResult === 'PASSED'}
                      onChange={(e) => setReviewResult(e.target.value)}
                      disabled={selectedAssignment.status === 'COMPLETED'}
                      className="mt-0.5 text-emerald-600 focus:ring-emerald-500"
                    />
                    <div>
                      <div className="font-bold text-xs text-slate-900">Lolos Tanpa Catatan (Bersih)</div>
                      <div className="text-[11px] text-slate-500 mt-0.5">
                        Teks Al-Qur'an bersih, rasm usmani dan harakat telah sesuai standar.
                      </div>
                    </div>
                  </label>

                  <label
                    className={clsx(
                      'p-3.5 rounded-xl border-2 transition-all cursor-pointer flex items-start gap-3',
                      reviewResult === 'REVISION_REQUIRED'
                        ? 'border-amber-500 bg-amber-50/50'
                        : 'border-slate-200 hover:border-slate-300'
                    )}
                  >
                    <input
                      type="radio"
                      name="reviewResult"
                      value="REVISION_REQUIRED"
                      checked={reviewResult === 'REVISION_REQUIRED'}
                      onChange={(e) => setReviewResult(e.target.value)}
                      disabled={selectedAssignment.status === 'COMPLETED'}
                      className="mt-0.5 text-amber-600 focus:ring-amber-500"
                    />
                    <div>
                      <div className="font-bold text-xs text-slate-900">Perlu Perbaikan Naskah</div>
                      <div className="text-[11px] text-slate-500 mt-0.5">
                        Terdapat kesalahan rasm, harakat, ayat, atau waqaf yang wajib diperbaiki penerbit.
                      </div>
                    </div>
                  </label>
                </div>
              </div>

              {/* Catatan Koreksi Lafazh & Rasm */}
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider">
                    Catatan Koreksi & Telaah Lafazh / Rasm
                  </label>
                  <span className="text-[11px] text-slate-400">Wajib diisi</span>
                </div>
                <textarea
                  rows={5}
                  value={reviewNotes}
                  onChange={(e) => setReviewNotes(e.target.value)}
                  disabled={selectedAssignment.status === 'COMPLETED'}
                  placeholder="Contoh format telaah:&#10;[Juz 1, Hal 15, QS. Al-Baqarah: 25] - Lafazh '...' kurang harakat fathah.&#10;[Juz 2, Hal 32, QS. Al-Baqarah: 142] - Tanda waqaf lazim tertukar dengan waqaf jaiz.&#10;Jika bersih tanpa koreksi: Naskah telah ditashih dan sesuai standar Mushaf Indonesia."
                  className="w-full p-3 text-xs bg-slate-50/70 border border-slate-300 rounded-xl outline-none focus:bg-white focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-700 transition-all font-mono leading-relaxed"
                />
                <p className="text-[11px] text-slate-500 mt-1 flex items-center gap-1">
                  <Info className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                  <span>
                    Catatan ini akan dikompilasi oleh koordinator Distributor untuk keputusan lanjut STT atau surat perbaikan ke penerbit.
                  </span>
                </p>
              </div>

              {/* Modal Actions */}
              <div className="pt-4 border-t border-slate-200 flex items-center justify-end gap-2.5">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={closeReviewModal}
                  disabled={submitting}
                >
                  {selectedAssignment.status === 'COMPLETED' ? 'Tutup' : 'Batal'}
                </Button>
                {selectedAssignment.status !== 'COMPLETED' && (
                  <Button
                    type="submit"
                    variant="primary"
                    size="sm"
                    disabled={submitting || !reviewNotes.trim()}
                    className="bg-emerald-700 hover:bg-emerald-800 text-white font-bold"
                    icon={<Send className="w-3.5 h-3.5" />}
                  >
                    {submitting ? 'Menyimpan...' : 'Kirim Hasil Telaah'}
                  </Button>
                )}
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default PentashihWorkspacePage;
