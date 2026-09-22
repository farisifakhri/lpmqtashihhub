import React, { useState, useEffect, useRef } from 'react';
import { registrationApi } from '@/api/registration.api';
import { tashihApi } from '@/api/tashih.api';
import { Button } from '@/components/ui/Button';
import {
  CheckCircle2,
  AlertTriangle,
  AlertCircle,
  X,
  Send,
  Users,
  FileText,
  Clock,
  ShieldCheck,
  Check,
} from 'lucide-react';
import { clsx } from 'clsx';

export const DistributorReviewDialog = ({ registrationId, onClose, onSuccess }) => {
  const [registration, setRegistration] = useState(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState(null);

  // Form decision state
  const [decision, setDecision] = useState('PASSED'); // 'PASSED' | 'REVISION_REQUIRED'
  const [distributorNotes, setDistributorNotes] = useState('');

  useEffect(() => {
    let active = true;
    setLoading(true);
    registrationApi
      .getDetail(registrationId)
      .then((res) => {
        if (!active) return;
        const reg = res.data;
        setRegistration(reg);

        // Cari iterasi terakhir
        const assignments = reg.assignments || [];
        const maxIter = assignments.reduce((max, a) => Math.max(max, a.iteration || 1), 1);
        const currentAssignments = assignments.filter((a) => (a.iteration || 1) === maxIter);

        // Jika ada pentashih yang minta revisi, default ke REVISION_REQUIRED
        const hasRevision = currentAssignments.some((a) =>
          a.reviews?.some((r) => r.result === 'REVISION_REQUIRED')
        );

        if (hasRevision) {
          setDecision('REVISION_REQUIRED');
          // Kompilasi catatan otomatis dari pentashih
          const compiled = currentAssignments
            .filter((a) => a.reviews?.some((r) => r.result === 'REVISION_REQUIRED'))
            .map((a) => `[${a.assignee?.name || 'Pentashih'}]: ${a.reviews?.[0]?.notes || ''}`)
            .join('\n\n');
          setDistributorNotes(
            compiled
              ? `Hasil sidang pentashihan memerlukan perbaikan naskah sebagai berikut:\n${compiled}`
              : 'Hasil sidang pentashihan memerlukan perbaikan naskah oleh penerbit.'
          );
        } else {
          setDecision('PASSED');
          setDistributorNotes(
            'Seluruh anggota tim pentashih telah menelaah naskah dan menyatakan lulus tanpa catatan koreksi. Direkomendasikan untuk penetapan Surat Tanda Tashih (STT).'
          );
        }
      })
      .catch((err) => {
        if (active) setError(err.message || 'Gagal memuat rincian naskah sidang.');
      })
      .finally(() => {
        if (active) setLoading(false);
      });

    return () => {
      active = false;
    };
  }, [registrationId]);

  // Evaluasi kelayakan submit
  const currentAssignments = React.useMemo(() => {
    if (!registration?.assignments) return [];
    const maxIter = registration.assignments.reduce((max, a) => Math.max(max, a.iteration || 1), 1);
    return registration.assignments.filter((a) => (a.iteration || 1) === maxIter);
  }, [registration]);

  const allCompleted =
    currentAssignments.length > 0 &&
    currentAssignments.every((a) => a.status === 'COMPLETED' && a.reviews?.length > 0);

  const hasRevisionRequested = currentAssignments.some((a) =>
    a.reviews?.some((r) => r.result === 'REVISION_REQUIRED')
  );

  const canPassSTT = allCompleted && !hasRevisionRequested;

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!registration || !allCompleted) return;

    if (!distributorNotes.trim()) {
      setError('Catatan keputusan distributor wajib diisi.');
      return;
    }

    setSubmitting(true);
    setError(null);

    try {
      await tashihApi.approveDistribution(registrationId, {
        result: decision,
        notes: distributorNotes.trim(),
      });

      onSuccess?.();
    } catch (err) {
      setError(err.message || 'Gagal menyimpan keputusan reviu distributor.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs p-4 sm:p-6 flex items-center justify-center overflow-y-auto"
      role="dialog"
      aria-modal="true"
      aria-labelledby="distributor-review-title"
    >
      <div className="w-full max-w-2xl bg-white rounded-2xl shadow-2xl border border-slate-200 overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header Modal */}
        <div className="p-5 border-b border-slate-200 flex items-center justify-between gap-4 bg-slate-50/80">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-teal-700 text-white flex items-center justify-center shadow-xs">
              <ShieldCheck className="w-5 h-5" />
            </div>
            <div>
              <h3 id="distributor-review-title" className="text-base font-bold text-slate-900">
                Reviu Hasil Sidang Pentashihan (Distributor)
              </h3>
              <p className="text-xs text-slate-500">
                Kompilasi rekomendasi tim pentashih sebelum penetapan STT atau revisi
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            disabled={submitting}
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-200/60 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Body Modal */}
        <form onSubmit={handleSubmit} className="p-5 sm:p-6 overflow-y-auto space-y-5 flex-1">
          {error && (
            <div className="p-3.5 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-xs flex items-start gap-2">
              <AlertCircle className="w-4 h-4 shrink-0 mt-0.5 text-rose-600" />
              <div>{error}</div>
            </div>
          )}

          {loading ? (
            <div className="py-12 text-center text-slate-500 text-xs font-semibold">
              Memuat data telaah tim pentashih...
            </div>
          ) : registration ? (
            <>
              {/* Info Naskah */}
              <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 space-y-1.5">
                <div className="font-mono text-xs font-bold text-emerald-800">
                  {registration.registration_no}
                </div>
                <div className="font-bold text-sm text-slate-900">{registration.title}</div>
                <div className="text-xs text-slate-600">
                  Penerbit: <strong>{registration.publisher?.legal_name}</strong> •{' '}
                  Layanan: <strong>{registration.service_type?.name}</strong>
                </div>
              </div>

              {/* Matriks Hasil Telaah Tiap Pentashih */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <label className="text-xs font-bold text-slate-700 uppercase tracking-wider flex items-center gap-1.5">
                    <Users className="w-3.5 h-3.5 text-slate-500" />
                    <span>Telaah Anggota Tim Sidang ({currentAssignments.length} Pentashih)</span>
                  </label>
                  <span className="text-[11px] text-slate-500">
                    Iterasi #{currentAssignments[0]?.iteration || 1}
                  </span>
                </div>

                <div className="space-y-2.5">
                  {currentAssignments.map((a) => {
                    const rev = a.reviews?.[0];
                    const isDone = a.status === 'COMPLETED' && rev;

                    return (
                      <div
                        key={a.id}
                        className={clsx(
                          'p-3 rounded-xl border text-xs space-y-1.5 transition-all',
                          isDone
                            ? rev.result === 'PASSED'
                              ? 'border-emerald-200 bg-emerald-50/40'
                              : 'border-amber-200 bg-amber-50/40'
                            : 'border-slate-200 bg-slate-50/50'
                        )}
                      >
                        <div className="flex items-center justify-between gap-2">
                          <div className="flex items-center gap-2">
                            <span className="font-bold text-slate-900">
                              {a.assignee?.name || 'Pentashih'}
                            </span>
                            <span className="text-[10px] text-slate-500 font-mono">
                              ({a.stage})
                            </span>
                          </div>

                          <div>
                            {isDone ? (
                              rev.result === 'PASSED' ? (
                                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 font-bold text-[10px] border border-emerald-200">
                                  <CheckCircle2 className="w-3 h-3" /> Lolos Bersih
                                </span>
                              ) : (
                                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-amber-100 text-amber-900 font-bold text-[10px] border border-amber-200">
                                  <AlertTriangle className="w-3 h-3" /> Perlu Perbaikan
                                </span>
                              )
                            ) : (
                              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-slate-200 text-slate-700 font-semibold text-[10px]">
                                <Clock className="w-3 h-3" /> Belum Selesai
                              </span>
                            )}
                          </div>
                        </div>

                        {rev?.notes ? (
                          <div className="p-2 rounded-lg bg-white border border-slate-200/80 text-[11px] text-slate-700 italic font-mono whitespace-pre-line">
                            "{rev.notes}"
                          </div>
                        ) : (
                          <div className="text-[11px] text-slate-400">
                            Menunggu input hasil sidang dari pentashih bersangkutan.
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Peringatan jika belum semua selesai */}
              {!allCompleted && (
                <div className="p-3.5 rounded-xl bg-amber-50 border border-amber-200 text-amber-900 text-xs flex items-start gap-2.5">
                  <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5 text-amber-600" />
                  <div>
                    <strong>Sidang Belum Selesai Seluruhnya:</strong> Masih ada anggota tim pentashih yang belum menginputkan hasil telaah. Keputusan distributor baru dapat disimpan setelah semua anggota menyelesaikan telaah.
                  </div>
                </div>
              )}

              {/* Keputusan Distributor */}
              {allCompleted && (
                <div className="space-y-4 pt-2 border-t border-slate-100">
                  <div>
                    <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-2">
                      Keputusan Tindak Lanjut Distributor
                    </label>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      {/* Opsi Lanjut STT */}
                      <label
                        className={clsx(
                          'p-3.5 rounded-xl border-2 transition-all flex items-start gap-3',
                          !canPassSTT
                            ? 'opacity-50 border-slate-200 bg-slate-50 cursor-not-allowed'
                            : decision === 'PASSED'
                            ? 'border-emerald-600 bg-emerald-50/50 cursor-pointer'
                            : 'border-slate-200 hover:border-slate-300 cursor-pointer'
                        )}
                      >
                        <input
                          type="radio"
                          name="distributorDecision"
                          value="PASSED"
                          disabled={!canPassSTT}
                          checked={decision === 'PASSED'}
                          onChange={(e) => setDecision(e.target.value)}
                          className="mt-0.5 text-emerald-600 focus:ring-emerald-500"
                        />
                        <div>
                          <div className="font-bold text-xs text-slate-900">
                            Rekomendasikan Penetapan STT
                          </div>
                          <div className="text-[11px] text-slate-500 mt-0.5">
                            Status beralih ke <code>READY_FOR_STT</code> untuk diterbitkan oleh Kepala LPMQ.
                          </div>
                        </div>
                      </label>

                      {/* Opsi Perbaikan Penerbit */}
                      <label
                        className={clsx(
                          'p-3.5 rounded-xl border-2 transition-all cursor-pointer flex items-start gap-3',
                          decision === 'REVISION_REQUIRED'
                            ? 'border-amber-500 bg-amber-50/50'
                            : 'border-slate-200 hover:border-slate-300'
                        )}
                      >
                        <input
                          type="radio"
                          name="distributorDecision"
                          value="REVISION_REQUIRED"
                          checked={decision === 'REVISION_REQUIRED'}
                          onChange={(e) => setDecision(e.target.value)}
                          className="mt-0.5 text-amber-600 focus:ring-amber-500"
                        />
                        <div>
                          <div className="font-bold text-xs text-slate-900">
                            Kembalikan ke Penerbit (Perbaikan)
                          </div>
                          <div className="text-[11px] text-slate-500 mt-0.5">
                            Status beralih ke <code>REVISION_REQUIRED</code>. Penerbit memperbaiki master dan kirim ulang.
                          </div>
                        </div>
                      </label>
                    </div>

                    {!canPassSTT && (
                      <p className="text-[11px] text-amber-700 mt-1.5 flex items-center gap-1">
                        <Info className="w-3.5 h-3.5 shrink-0" />
                        <span>
                          Rekomendasi STT terkunci karena ada pentashih yang memberikan catatan perbaikan.
                        </span>
                      </p>
                    )}
                  </div>

                  {/* Catatan Keputusan / Surat Revisi */}
                  <div>
                    <div className="flex items-center justify-between mb-1.5">
                      <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider">
                        Catatan Keputusan Reviu Distributor
                      </label>
                      <span className="text-[11px] text-slate-400">Wajib diisi</span>
                    </div>
                    <textarea
                      rows={4}
                      value={distributorNotes}
                      onChange={(e) => setDistributorNotes(e.target.value)}
                      placeholder="Tuliskan alasan keputusan atau rekap arahan perbaikan untuk penerbit..."
                      className="w-full p-3 text-xs bg-slate-50/70 border border-slate-300 rounded-xl outline-none focus:bg-white focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-700 transition-all font-mono leading-relaxed"
                    />
                  </div>
                </div>
              )}
            </>
          ) : null}

          {/* Footer Actions */}
          <div className="pt-4 border-t border-slate-200 flex items-center justify-end gap-2.5">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={onClose}
              disabled={submitting}
            >
              Batal
            </Button>
            <Button
              type="submit"
              variant="primary"
              size="sm"
              disabled={submitting || !allCompleted || !distributorNotes.trim()}
              className="bg-teal-700 hover:bg-teal-800 text-white font-bold"
              icon={<Send className="w-3.5 h-3.5" />}
            >
              {submitting ? 'Menyimpan...' : 'Simpan Keputusan Distributor'}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default DistributorReviewDialog;
