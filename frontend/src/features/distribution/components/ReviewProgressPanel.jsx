import React from 'react';
import { ShieldCheck, RefreshCw, BookOpen, CheckCircle2, Clock, Check, AlertTriangle } from 'lucide-react';
import { clsx } from 'clsx';
import { Button } from '@/components/ui/Button';
import { getReviewProgress } from '../distribution-view-model';

export const ReviewProgressPanel = ({ distLoading, inProgressRegistrations, fetchDistributionData, setReviewDialogRegId }) => (
        <div className="bg-white rounded-2xl border border-line/90 shadow-xs overflow-hidden">
          <div className="p-5 sm:p-6 border-b border-line flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <h3 className="text-base font-bold text-ink flex items-center gap-2">
                <ShieldCheck className="w-5 h-5 text-brand-700" />
                Monitoring Sidang & Reviu Hasil Pentashihan (Langkah 2 & 3 SOP)
              </h3>
              <p className="text-xs text-ink-muted mt-0.5">
                Pantau progres telaah anggota sidang. Distributor mereviu kompilasi hasil pentashihan untuk penetapan STT atau revisi naskah.
              </p>
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={fetchDistributionData}
              disabled={distLoading}
              icon={<RefreshCw className={`w-3.5 h-3.5 ${distLoading ? 'animate-spin' : ''}`} />}
            >
              Segarkan
            </Button>
          </div>

          {distLoading ? (
            <div className="py-16 text-center text-ink-muted">
              <RefreshCw className="w-7 h-7 animate-spin mx-auto mb-2 text-brand-700" />
              <p className="text-xs font-semibold">Memuat progres sidang pentashihan...</p>
            </div>
          ) : inProgressRegistrations.length === 0 ? (
            <div className="py-16 text-center text-ink-muted max-w-sm mx-auto">
              <div className="w-12 h-12 rounded-full bg-surface-subtle text-ink-muted flex items-center justify-center mx-auto mb-2.5">
                <BookOpen className="w-6 h-6" />
              </div>
              <p className="text-sm font-bold text-ink">Tidak ada sidang aktif saat ini</p>
              <p className="text-xs text-ink-muted mt-1">
                Naskah yang telah ditetapkan tim pentashihnya akan dimonitor progresnya di sini.
              </p>
            </div>
          ) : (
            <div className="divide-y divide-line">
              {inProgressRegistrations.map((reg) => {
                const { iteration: maxIter, currentAssignments, totalMembers, completedMembers, isReadyToReview } = getReviewProgress(reg);

                return (
                  <div
                    key={reg.id}
                    className="p-5 sm:p-6 hover:bg-canvas/60 transition-colors flex flex-col md:flex-row md:items-center justify-between gap-4"
                  >
                    <div className="space-y-2 flex-1 min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="font-mono text-xs font-bold text-brand-800 bg-brand-50 px-2 py-0.5 rounded-md border border-brand-100">
                          {reg.registration_no}
                        </span>
                        <span className="text-[11px] font-semibold px-2 py-0.5 rounded-md bg-surface-subtle text-ink border border-line">
                          Iterasi #{maxIter}
                        </span>
                        {isReadyToReview ? (
                          <span className="inline-flex items-center gap-1 text-[11px] font-bold px-2 py-0.5 rounded-md bg-brand-100 text-brand-900 border border-brand-100">
                            <CheckCircle2 className="w-3 h-3" /> Seluruh Pentashih Selesai ({completedMembers}/{totalMembers})
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 text-[11px] font-medium px-2 py-0.5 rounded-md bg-civic-warningSoft text-civic-warning border border-civic-warningLine">
                            <Clock className="w-3 h-3" /> Sidang Berjalan: {completedMembers} dari {totalMembers} Selesai
                          </span>
                        )}
                      </div>

                      <div>
                        <h4 className="text-base font-bold text-ink line-clamp-1">
                          {reg.title}
                        </h4>
                        <p className="text-xs text-ink-muted mt-0.5">
                          <span className="font-semibold text-ink">
                            {reg.publisher?.legal_name || 'Penerbit'}
                          </span>
                          {' • '}
                          <span>{reg.service_type?.name}</span>
                        </p>
                      </div>

                      {/* Anggota Pentashih Badges */}
                      <div className="flex flex-wrap items-center gap-2 pt-1">
                        <span className="text-[11px] font-semibold text-ink-muted">Anggota Sidang:</span>
                        {currentAssignments.map((a) => {
                          const rev = a.reviews?.[0];
                          const isDone = a.status === 'COMPLETED' && rev;
                          return (
                            <span
                              key={a.id}
                              className={clsx(
                                'inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[11px]',
                                isDone
                                  ? rev.result === 'PASSED'
                                    ? 'bg-brand-50 text-brand-800 border border-brand-100 font-semibold'
                                    : 'bg-civic-warningSoft text-civic-warning border border-civic-warningLine font-semibold'
                                  : 'bg-surface-subtle text-ink-muted border border-line'
                              )}
                            >
                              {isDone ? (
                                rev.result === 'PASSED' ? (
                                  <Check className="w-3 h-3 text-brand-700" />
                                ) : (
                                  <AlertTriangle className="w-3 h-3 text-civic-warning" />
                                )
                              ) : (
                                <Clock className="w-3 h-3 text-ink-muted" />
                              )}
                              <span>{a.assignee?.name || 'Pentashih'}</span>
                            </span>
                          );
                        })}
                      </div>
                    </div>

                    <div className="flex items-center justify-end gap-2 shrink-0">
                      <Button
                        variant="primary"
                        size="sm"
                        onClick={() => setReviewDialogRegId(reg.id)}
                        className={clsx(
                          'text-xs font-bold',
                          isReadyToReview
                            ? 'bg-brand-700 hover:bg-brand-800 text-white shadow-xs'
                            : 'bg-ink hover:bg-ink text-white'
                        )}
                        icon={<ShieldCheck className="w-4 h-4" />}
                      >
                        {isReadyToReview ? 'Reviu Hasil Sidang (Langkah 3)' : 'Lihat Hasil Anggota'}
                      </Button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
);
