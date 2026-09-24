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
            <div className="text-[11px] text-slate-500">Pada halaman {page}</div>
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
            <div className="text-[11px] text-slate-500">Pada halaman {page}</div>
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
                onClick={() => { setActiveTab('ACTIVE'); setPage(1); }}
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
                onClick={() => { setActiveTab('COMPLETED'); setPage(1); }}
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
                placeholder="Cari nomor, judul, atau penerbit pada halaman ini..."
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

      <nav aria-label="Halaman daftar tugas" className="flex justify-end items-center gap-3 text-xs">
        <Button variant="outline" size="sm" disabled={loading || page === 1} onClick={() => setPage(page - 1)}>Sebelumnya</Button>
        <span>Halaman {page}</span>
        <Button variant="outline" size="sm" disabled={loading || !hasMore} onClick={() => setPage(page + 1)}>Berikutnya</Button>
      </nav>

  </>
);
