import React from 'react';
import { Button } from '@/components/ui/Button';
import { StatusBadge } from '@/components/ui/StatusBadge';
import { Clock, CheckCircle2, ShieldCheck, Search, RefreshCw, AlertCircle, BookOpen, FileText, Calendar, AlertTriangle } from 'lucide-react';
import { clsx } from 'clsx';

export const AssignmentListPanel = ({
  activeCount, completedCount, currentUser, page, activeTab, setActiveTab,
  setPage, searchQuery, setSearchQuery, loading, error, filteredAssignments,
  getStageLabel, openReviewModal, hasMore,
}) => (
  <>
      {/* 2. Kartu Statistik Ringkas */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="rounded-xl border border-civic-warningLine/90 p-4 bg-gradient-to-br from-civic-warningSoft/80 via-white to-civic-warningSoft/30 shadow-xs">
          <div className="flex items-center justify-between">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-civic-warning to-civic-warning text-white flex items-center justify-center shadow-xs">
              <Clock className="w-4.5 h-4.5" />
            </div>
            <span className="text-[11px] font-bold px-2.5 py-0.5 rounded-full bg-civic-warningSoft text-civic-warning border border-civic-warningLine">
              Perlu Ditelaah
            </span>
          </div>
          <div className="mt-3">
            <div className="text-2xl font-black text-civic-warning tabular-nums">{activeCount}</div>
            <div className="text-xs font-bold text-civic-warning mt-0.5">Tugas Sidang Aktif</div>
            <div className="text-[11px] text-ink-muted">Pada halaman {page}</div>
          </div>
        </div>

        <div className="rounded-xl border border-brand-100/90 p-4 bg-gradient-to-br from-brand-50/80 via-white to-brand-50/30 shadow-xs">
          <div className="flex items-center justify-between">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-brand-700 to-brand-700 text-white flex items-center justify-center shadow-xs">
              <CheckCircle2 className="w-4.5 h-4.5" />
            </div>
            <span className="text-[11px] font-bold px-2.5 py-0.5 rounded-full bg-brand-100 text-brand-900 border border-brand-100">
              Selesai
            </span>
          </div>
          <div className="mt-3">
            <div className="text-2xl font-black text-brand-950 tabular-nums">{completedCount}</div>
            <div className="text-xs font-bold text-brand-900 mt-0.5">Riwayat Selesai</div>
            <div className="text-[11px] text-ink-muted">Pada halaman {page}</div>
          </div>
        </div>

        <div className="rounded-xl border border-civic-infoLine/90 p-4 bg-gradient-to-br from-civic-infoSoft/80 via-white to-civic-infoSoft/30 shadow-xs">
          <div className="flex items-center justify-between">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-civic-info to-civic-info text-white flex items-center justify-center shadow-xs">
              <ShieldCheck className="w-4.5 h-4.5" />
            </div>
            <span className="text-[11px] font-bold px-2.5 py-0.5 rounded-full bg-civic-infoSoft text-civic-info border border-civic-infoLine">
              Kewenangan
            </span>
          </div>
          <div className="mt-3">
            <div className="text-sm font-black text-civic-info">{currentUser?.name || 'Pentashih'}</div>
            <div className="text-xs font-bold text-civic-info mt-0.5">Anggota Tim Pentashih LPMQ</div>
            <div className="text-[11px] text-ink-muted">Penugasan berbasis SK aktif Kepala LPMQ</div>
          </div>
        </div>
      </div>

      {/* 3. Panel Daftar Penugasan Sidang */}
      <div className="bg-white rounded-2xl border border-line/90 shadow-xs overflow-hidden">
        {/* Tab & Filter Bar */}
        <div className="p-5 sm:p-6 border-b border-line space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
            {/* Tabs */}
            <div className="inline-flex items-center p-1 rounded-xl bg-surface-subtle border border-line text-xs font-semibold">
              <button
                type="button"
                onClick={() => { setActiveTab('ACTIVE'); setPage(1); }}
                className={clsx(
                  'px-3.5 py-1.5 rounded-lg transition-all flex items-center gap-1.5 cursor-pointer',
                  activeTab === 'ACTIVE'
                    ? 'bg-white text-brand-900 font-bold shadow-xs'
                    : 'text-ink-muted hover:text-ink'
                )}
              >
                <span>Tugas Sidang Aktif</span>
                <span className="px-1.5 py-0.2 rounded-full bg-civic-warningSoft text-civic-warning text-[10px] font-bold">
                  {activeCount}
                </span>
              </button>
              <button
                type="button"
                onClick={() => { setActiveTab('COMPLETED'); setPage(1); }}
                className={clsx(
                  'px-3.5 py-1.5 rounded-lg transition-all flex items-center gap-1.5 cursor-pointer',
                  activeTab === 'COMPLETED'
                    ? 'bg-white text-brand-900 font-bold shadow-xs'
                    : 'text-ink-muted hover:text-ink'
                )}
              >
                <span>Riwayat Selesai</span>
                <span className="px-1.5 py-0.2 rounded-full bg-surface-strong text-ink text-[10px]">
                  {completedCount}
                </span>
              </button>
            </div>

            {/* Search Input */}
            <div className="relative w-full sm:w-auto sm:min-w-[280px]">
              <Search className="w-4 h-4 text-ink-muted absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Cari nomor, judul, atau penerbit pada halaman ini..."
                className="w-full pl-9 pr-3.5 py-2 text-xs bg-canvas/70 border border-line-strong rounded-xl outline-none focus:bg-white focus:ring-2 focus:ring-brand-700/20 focus:border-brand-700 transition-all text-ink"
              />
            </div>
          </div>
        </div>

        {/* Konten Daftar Tugas */}
        {loading ? (
          <div className="py-16 text-center text-ink-muted">
            <RefreshCw className="w-7 h-7 animate-spin mx-auto mb-2 text-brand-700" />
            <p className="text-xs font-semibold">Memuat daftar tugas sidang pentashihan...</p>
          </div>
        ) : error ? (
          <div className="p-8 text-center text-civic-danger text-xs">
            <AlertCircle className="w-8 h-8 mx-auto mb-2 text-civic-danger" />
            <p className="font-bold">{error}</p>
          </div>
        ) : filteredAssignments.length === 0 ? (
          <div className="py-16 text-center text-ink-muted max-w-sm mx-auto">
            <div className="w-12 h-12 rounded-full bg-surface-subtle text-ink-muted flex items-center justify-center mx-auto mb-2.5">
              <BookOpen className="w-6 h-6" />
            </div>
            <p className="text-sm font-bold text-ink">
              {activeTab === 'ACTIVE'
                ? 'Tidak ada tugas sidang aktif'
                : 'Belum ada riwayat sidang selesai'}
            </p>
            <p className="text-xs text-ink-muted mt-1">
              {searchQuery
                ? `Tidak ada hasil untuk pencarian "${searchQuery}"`
                : activeTab === 'ACTIVE'
                ? 'Seluruh naskah yang ditugaskan kepada Anda telah selesai ditelaah.'
                : 'Hasil telaah sidang yang Anda selesaikan akan tercatat di sini.'}
            </p>
          </div>
        ) : (
          <div className="divide-y divide-line">
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
                  className="p-5 sm:p-6 hover:bg-canvas/60 transition-colors flex flex-col md:flex-row md:items-center justify-between gap-4"
                >
                  <div className="space-y-2 flex-1 min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="font-mono text-xs font-bold text-brand-800 bg-brand-50 px-2 py-0.5 rounded-md border border-brand-100">
                        {reg?.registration_no || 'REG-LPMQ'}
                      </span>
                      <span className="inline-flex items-center text-[11px] font-semibold px-2 py-0.5 rounded-md bg-surface-subtle text-ink border border-line">
                        {getStageLabel(assignment.stage)} • Iterasi #{assignment.iteration}
                      </span>
                      {assignment.team && (
                        <span className="text-[11px] text-ink-muted font-medium">
                          {assignment.team.name}
                        </span>
                      )}
                      {isOverdue && !hasReview && (
                        <span className="inline-flex items-center gap-1 text-[11px] font-bold px-2 py-0.5 rounded-md bg-civic-dangerSoft text-civic-danger border border-civic-dangerLine">
                          <AlertTriangle className="w-3 h-3" /> Overdue SLA
                        </span>
                      )}
                    </div>

                    <div>
                      <h4 className="text-base font-bold text-ink line-clamp-1">
                        {reg?.title || 'Judul Naskah Master Mushaf'}
                      </h4>
                      <p className="text-xs text-ink-muted flex flex-wrap items-center gap-2 mt-0.5">
                        <span className="font-semibold text-ink">
                          {reg?.publisher?.legal_name || 'Penerbit'}
                        </span>
                        <span>•</span>
                        <span>{reg?.service_type?.name || 'Layanan Mushaf'}</span>
                      </p>
                    </div>

                    {/* Meta Tenggat & Telaah */}
                    <div className="flex flex-wrap items-center gap-4 text-xs text-ink-muted pt-1">
                      <div className="flex items-center gap-1.5">
                        <Calendar className="w-3.5 h-3.5 text-ink-muted" />
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
                            isOverdue && !hasReview ? 'text-civic-danger font-bold' : 'text-ink-muted'
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
                      <div className="mt-3 p-3 rounded-xl bg-canvas border border-line text-xs space-y-1.5">
                        <div className="flex items-center gap-2">
                          <span className="font-bold text-ink">Rekomendasi Anda:</span>
                          {review.result === 'PASSED' ? (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-brand-100 text-brand-800 font-bold border border-brand-100 text-[11px]">
                              <CheckCircle2 className="w-3 h-3" /> Lolos Tanpa Catatan (Bersih)
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-civic-warningSoft text-civic-warning font-bold border border-civic-warningLine text-[11px]">
                              <AlertTriangle className="w-3 h-3" /> Perlu Perbaikan Naskah
                            </span>
                          )}
                          <span className="text-ink-muted text-[11px] ml-auto">
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
                          <p className="text-ink-muted italic line-clamp-2">
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
                        className="font-bold text-xs bg-brand-700 hover:bg-brand-800 text-white"
                        icon={<BookOpen className="w-4 h-4" />}
                      >
                        Buka Lembar Telaah
                      </Button>
                    ) : (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => openReviewModal(assignment)}
                        className="text-xs text-ink"
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

      <nav aria-label="Halaman daftar tugas" className="flex justify-end items-center gap-3 text-xs">
        <Button variant="outline" size="sm" disabled={loading || page === 1} onClick={() => setPage(page - 1)}>Sebelumnya</Button>
        <span>Halaman {page}</span>
        <Button variant="outline" size="sm" disabled={loading || !hasMore} onClick={() => setPage(page + 1)}>Berikutnya</Button>
      </nav>

  </>
);
