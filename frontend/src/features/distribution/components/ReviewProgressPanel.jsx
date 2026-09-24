import React from 'react';
import { ShieldCheck, RefreshCw, BookOpen, CheckCircle2, Clock, Check, AlertTriangle } from 'lucide-react';
import { clsx } from 'clsx';
import { Button } from '@/components/ui/Button';
import { getReviewProgress } from '../distribution-view-model';

export const ReviewProgressPanel = ({ distLoading, inProgressRegistrations, fetchDistributionData, setReviewDialogRegId }) => (
        <div className="bg-white rounded-2xl border border-slate-200/90 shadow-xs overflow-hidden">
          <div className="p-5 sm:p-6 border-b border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
                <ShieldCheck className="w-5 h-5 text-teal-700" />
                Monitoring Sidang & Reviu Hasil Pentashihan (Langkah 2 & 3 SOP)
              </h3>
              <p className="text-xs text-slate-500 mt-0.5">
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
            <div className="py-16 text-center text-slate-500">
              <RefreshCw className="w-7 h-7 animate-spin mx-auto mb-2 text-teal-700" />
              <p className="text-xs font-semibold">Memuat progres sidang pentashihan...</p>
            </div>
          ) : inProgressRegistrations.length === 0 ? (
            <div className="py-16 text-center text-slate-500 max-w-sm mx-auto">
              <div className="w-12 h-12 rounded-full bg-slate-100 text-slate-400 flex items-center justify-center mx-auto mb-2.5">
                <BookOpen className="w-6 h-6" />
              </div>
              <p className="text-sm font-bold text-slate-800">Tidak ada sidang aktif saat ini</p>
              <p className="text-xs text-slate-500 mt-1">
                Naskah yang telah ditetapkan tim pentashihnya akan dimonitor progresnya di sini.
              </p>
            </div>
          ) : (
            <div className="divide-y divide-slate-100">
              {inProgressRegistrations.map((reg) => {
                const { iteration: maxIter, currentAssignments, totalMembers, completedMembers, isReadyToReview } = getReviewProgress(reg);

                return (
                  <div
                    key={reg.id}
                    className="p-5 sm:p-6 hover:bg-slate-50/60 transition-colors flex flex-col md:flex-row md:items-center justify-between gap-4"
                  >
                    <div className="space-y-2 flex-1 min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="font-mono text-xs font-bold text-emerald-800 bg-emerald-50 px-2 py-0.5 rounded-md border border-emerald-200">
                          {reg.registration_no}
                        </span>
                        <span className="text-[11px] font-semibold px-2 py-0.5 rounded-md bg-slate-100 text-slate-700 border border-slate-200">
                          Iterasi #{maxIter}
                        </span>
                        {isReadyToReview ? (
                          <span className="inline-flex items-center gap-1 text-[11px] font-bold px-2 py-0.5 rounded-md bg-teal-100 text-teal-900 border border-teal-300">
                            <CheckCircle2 className="w-3 h-3" /> Seluruh Pentashih Selesai ({completedMembers}/{totalMembers})
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 text-[11px] font-medium px-2 py-0.5 rounded-md bg-amber-50 text-amber-900 border border-amber-200">
                            <Clock className="w-3 h-3" /> Sidang Berjalan: {completedMembers} dari {totalMembers} Selesai
                          </span>
                        )}
                      </div>

                      <div>
                        <h4 className="text-base font-bold text-slate-900 line-clamp-1">
                          {reg.title}
                        </h4>
                        <p className="text-xs text-slate-500 mt-0.5">
                          <span className="font-semibold text-slate-700">
                            {reg.publisher?.legal_name || 'Penerbit'}
                          </span>
                          {' • '}
                          <span>{reg.service_type?.name}</span>
                        </p>
                      </div>

                      {/* Anggota Pentashih Badges */}
                      <div className="flex flex-wrap items-center gap-2 pt-1">
                        <span className="text-[11px] font-semibold text-slate-500">Anggota Sidang:</span>
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
                                    ? 'bg-emerald-50 text-emerald-800 border border-emerald-200 font-semibold'
                                    : 'bg-amber-50 text-amber-900 border border-amber-200 font-semibold'
                                  : 'bg-slate-100 text-slate-600 border border-slate-200'
                              )}
                            >
                              {isDone ? (
                                rev.result === 'PASSED' ? (
                                  <Check className="w-3 h-3 text-emerald-700" />
                                ) : (
                                  <AlertTriangle className="w-3 h-3 text-amber-700" />
                                )
                              ) : (
                                <Clock className="w-3 h-3 text-slate-400" />
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
                            ? 'bg-teal-700 hover:bg-teal-800 text-white shadow-xs'
                            : 'bg-slate-800 hover:bg-slate-900 text-white'
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
