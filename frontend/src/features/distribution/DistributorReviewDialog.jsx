import React, { useState, useEffect, useRef } from 'react';
import { registrationApi } from '@/api/registration.api';
import { tashihApi } from '@/api/tashih.api';
import { Button } from '@/components/ui/Button';
import {
  CheckCircle2,
  Truck,
  AlertTriangle,
  AlertCircle,
  X,
  Send,
  Users,
  FileText,
  Clock,
  ShieldCheck,
  Check,
  Info,
} from 'lucide-react';
import { clsx } from 'clsx';
import { useAuth } from '@/features/auth/AuthContext';

export const DistributorReviewDialog = ({ registrationId, onClose, onSuccess }) => {
  const { currentUser } = useAuth();
  const userRoles = Array.isArray(currentUser?.roles)
    ? currentUser.roles
    : currentUser?.role
    ? [currentUser.role]
    : [];
  const canDecide = userRoles.includes('DISTRIBUTOR') || userRoles.includes('SUPERADMIN') || currentUser?.role === 'DISTRIBUTOR' || currentUser?.role === 'SUPERADMIN';

  const [registration, setRegistration] = useState(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState(null);

  // Form decision state
  const [decision, setDecision] = useState('PASSED'); // 'PASSED' | 'REVISION_REQUIRED'
  const [distributorNotes, setDistributorNotes] = useState('');
  // Pemaraf: keputusan distributor ditahan sampai diparaf (hanya bila sudah ada akun Pemaraf aktif)
  const [parafState, setParafState] = useState({ gate_active: false, pending: null });
  const [pemarafOptions, setPemarafOptions] = useState([]);
  const [pemarafId, setPemarafId] = useState('');
  const [outgoingCourier, setOutgoingCourier] = useState('');
  const [outgoingTrackingNo, setOutgoingTrackingNo] = useState('');
  const [outgoingNotes, setOutgoingNotes] = useState('');

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
          // Kompilasi catatan otomatis dari pentashih (bersihkan tag internal recap)
          const compiled = currentAssignments
            .filter((a) => a.reviews?.some((r) => r.result === 'REVISION_REQUIRED'))
            .map((a) => {
              const corrections = a.juz_items?.filter(item => item.result === 'REVISION_REQUIRED') || [];
              const rawNote = a.reviews?.[0]?.notes || '';
              const cleanNote = rawNote.replace(/\[RECAP_FILE:[a-f0-9\-]+\]/gi, '').trim();
              return corrections.length
                ? corrections.map(item => `[${a.assignee?.name || 'Pentashih'} · Juz ${item.juz_number}]: ${item.notes}`).join('\n')
                : `[${a.assignee?.name || 'Pentashih'}]: ${cleanNote}`;
            })
            .join('\n\n');
          setDistributorNotes(
            compiled
              ? `Hasil sidang pentashihan memerlukan perbaikan naskah sebagai berikut:\n${compiled}`.slice(0, 10000)
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

  useEffect(() => {
    let active = true;
    tashihApi.getDistributionParaf(registrationId)
      .then(async (res) => {
        if (!active || !res?.data) return;
        setParafState(res.data);
        if (res.data.pending?.pemaraf?.id) setPemarafId(res.data.pending.pemaraf.id);
        if (res.data.gate_active) {
          const list = await tashihApi.listPemaraf();
          if (active) setPemarafOptions(list?.data || []);
        }
      })
      .catch(() => {}); // tanpa data paraf, dialog tetap berjalan dengan alur lama
    return () => { active = false; };
  }, [registrationId]);

  const pendingParaf = parafState.pending;
  const canParaf = Boolean(pendingParaf) && (
    userRoles.includes('SUPERADMIN') || (currentUser?.isPemaraf && pendingParaf.pemaraf?.id === currentUser?.id)
  );

  const handleParaf = async () => {
    setSubmitting(true);
    setError(null);
    try {
      await tashihApi.parafDistribution(registrationId);
      onSuccess?.();
    } catch (err) {
      setError(err.message || 'Gagal membubuhkan paraf.');
    } finally {
      setSubmitting(false);
    }
  };

  // Evaluasi kelayakan submit
  const previousRevLetters = React.useMemo(() => {
    return (registration?.official_documents || [])
      .filter((doc) => doc.document_type === 'REVISION_RETURN_LETTER')
      .sort((a, b) => (b.version || 0) - (a.version || 0));
  }, [registration]);

  const currentAssignments = React.useMemo(() => {
    if (!registration?.assignments) return [];
    const maxIter = registration.assignments.reduce((max, a) => Math.max(max, a.iteration || 1), 1);
    return registration.assignments.filter((a) => (a.iteration || 1) === maxIter);
  }, [registration]);

  // B-19b: penugasan yang dilepas (REVOKED) tidak lagi menjadi syarat kelengkapan sidang
  const activeAssignments = currentAssignments.filter((a) => a.status !== 'REVOKED');

  const allCompleted =
    activeAssignments.length > 0 &&
    activeAssignments.every((a) => a.status === 'COMPLETED' && a.reviews?.length > 0);

  const hasRevisionRequested = activeAssignments.some((a) =>
    a.reviews?.some((r) => r.result === 'REVISION_REQUIRED')
  );

  // B-06: Verifikasi dokumen rekap telaah internal
  const hasTeamRecap = activeAssignments.some(
    (a) => Boolean(a.recap_file_id || a.reviews?.[0]?.recap_file_id || a.reviews?.[0]?.notes?.match(/\[RECAP_FILE:([a-f0-9\-]+)\]/i))
  );

  const canPassSTT = allCompleted && !hasRevisionRequested;

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!registration) return;

    if (!distributorNotes.trim() || distributorNotes.trim().length > 10000) {
      setError('Catatan keputusan distributor wajib diisi dan maksimal 10000 karakter.');
      return;
    }
    if (parafState.gate_active && !pemarafId) {
      setError('Pilih Pemaraf yang akan membubuhkan paraf atas keputusan ini.');
      return;
    }

    setSubmitting(true);
    setError(null);

    try {
      await tashihApi.approveDistribution(registrationId, {
        result: decision,
        notes: distributorNotes.trim(),
        pemaraf_id: parafState.gate_active ? pemarafId : undefined,
        outgoing_courier: decision === 'REVISION_REQUIRED' && outgoingCourier.trim() ? outgoingCourier.trim() : undefined,
        outgoing_tracking_no: decision === 'REVISION_REQUIRED' && outgoingTrackingNo.trim() ? outgoingTrackingNo.trim() : undefined,
        outgoing_notes: decision === 'REVISION_REQUIRED' && outgoingNotes.trim() ? outgoingNotes.trim() : undefined,
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
      className="fixed inset-0 z-50 bg-ink/60 backdrop-blur-xs p-4 sm:p-6 flex items-center justify-center overflow-y-auto"
      role="dialog"
      aria-modal="true"
      aria-labelledby="distributor-review-title"
    >
      <div className="w-full max-w-2xl bg-white rounded-2xl shadow-2xl border border-line overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header Modal */}
        <div className="p-5 border-b border-line flex items-center justify-between gap-4 bg-canvas/80">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-brand-700 text-white flex items-center justify-center shadow-xs">
              <ShieldCheck className="w-5 h-5" />
            </div>
            <div>
              <h3 id="distributor-review-title" className="text-base font-bold text-ink">
                Reviu Hasil Sidang Pentashihan (Distributor)
              </h3>
              <p className="text-xs text-ink-muted">
                Kompilasi rekomendasi tim pentashih sebelum penetapan STT atau revisi
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            disabled={submitting}
            className="p-1.5 rounded-lg text-ink-muted hover:text-ink hover:bg-surface-strong/60 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Body Modal */}
        <form onSubmit={handleSubmit} className="p-5 sm:p-6 overflow-y-auto space-y-5 flex-1">
          {error && (
            <div className="p-3.5 rounded-xl bg-civic-dangerSoft border border-civic-dangerLine text-civic-danger text-xs flex items-start gap-2">
              <AlertCircle className="w-4 h-4 shrink-0 mt-0.5 text-civic-danger" />
              <div>{error}</div>
            </div>
          )}

          {loading ? (
            <div className="py-12 text-center text-ink-muted text-xs font-semibold">
              Memuat data telaah tim pentashih...
            </div>
          ) : registration ? (
            <>
              {/* Info Naskah */}
              <div className="p-4 rounded-xl bg-canvas border border-line space-y-1.5">
                <div className="font-mono text-xs font-bold text-brand-800">
                  {registration.registration_no}
                </div>
                <div className="font-bold text-sm text-ink">{registration.title}</div>
                <div className="text-xs text-ink-muted">
                  Penerbit: <strong>{registration.publisher?.legal_name}</strong> •{' '}
                  Layanan: <strong>{registration.service_type?.name}</strong>
                </div>
              </div>

              {/* Peringatan Wewenang Distributor bila pentashih belum selesai centang (Item 6) */}
              {(!allCompleted || !hasTeamRecap) && (
                <div className="p-3 rounded-xl bg-civic-warningSoft border border-civic-warningLine text-civic-warning text-xs flex items-center gap-2">
                  <AlertTriangle className="w-4 h-4 text-civic-warning shrink-0" />
                  <span>
                    Sebagian pentashih belum menyelesaikan centang checklist atau mengunggah rekap. Sebagai Koordinator Distributor, Anda tetap berhak menyimpan keputusan sidang.
                  </span>
                </div>
              )}

              {/* Matriks Hasil Telaah Tiap Pentashih */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <label className="text-xs font-bold text-ink uppercase tracking-wider flex items-center gap-1.5">
                    <Users className="w-3.5 h-3.5 text-ink-muted" />
                    <span>Telaah Anggota Tim Sidang ({currentAssignments.length} Pentashih)</span>
                  </label>
                  <span className="text-xs text-ink-muted">
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
                              ? 'border-brand-100 bg-brand-50/40'
                              : 'border-civic-warningLine bg-civic-warningSoft/40'
                            : 'border-line bg-canvas/50'
                        )}
                      >
                        <div className="flex items-center justify-between gap-2">
                          <div className="flex items-center gap-2">
                            <span className="font-bold text-ink">
                              {a.assignee?.name || 'Pentashih'}
                            </span>
                            <span className="text-xs text-ink-muted font-mono">
                              ({a.stage})
                            </span>
                          </div>

                          <div>
                            {isDone ? (
                              rev.result === 'PASSED' ? (
                                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-brand-100 text-brand-800 font-bold text-xs border border-brand-100">
                                  <CheckCircle2 className="w-3 h-3" /> Lolos Bersih
                                </span>
                              ) : (
                                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-civic-warningSoft text-civic-warning font-bold text-xs border border-civic-warningLine">
                                  <AlertTriangle className="w-3 h-3" /> Perlu Perbaikan
                                </span>
                              )
                            ) : a.status === 'REVOKED' ? (
                              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-surface-strong text-ink-muted font-semibold text-xs line-through">
                                <X className="w-3 h-3" /> Dilepas
                              </span>
                            ) : (
                              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-surface-strong text-ink font-semibold text-xs">
                                <Clock className="w-3 h-3" /> Belum Selesai
                              </span>
                            )}
                          </div>
                        </div>

                        {a.status === 'REVOKED' ? (
                          <div className="text-xs text-ink-muted">
                            Penugasan dilepas{a.revocation_reason ? `: ${a.revocation_reason}` : '.'} Tidak dihitung dalam kelengkapan sidang.
                          </div>
                        ) : rev?.notes ? (
                          <div className="p-2 rounded-lg bg-white border border-line/80 text-xs text-ink italic font-mono whitespace-pre-line">
                            "{((rev?.notes || '').replace(/\[RECAP_FILE:[a-f0-9\-]+\]/gi, '').trim()) || 'Lolos tanpa catatan.'}"
                          </div>
                        ) : (
                          <div className="text-xs text-ink-muted">
                            Menunggu input hasil sidang dari pentashih bersangkutan.
                          </div>
                        )}
                        {Boolean(a.recap_file_id || rev?.notes?.match(/\[RECAP_FILE:([a-f0-9\-]+)\]/i)) && (
                          <div className="pt-1.5 flex items-center gap-2">
                            <a
                              href={`/api/v1/uploads/${a.recap_file_id || rev?.notes?.match(/\[RECAP_FILE:([a-f0-9\-]+)\]/i)?.[1]}`}
                              target="_blank"
                              rel="noreferrer"
                              className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-brand-50 border border-brand-200 text-brand-900 text-xs font-semibold hover:bg-brand-100 transition-colors shadow-2xs"
                            >
                              <FileText className="w-3.5 h-3.5 text-brand-700" />
                              <span>Unduh Berkas Rekapan Internal ({a.assignee?.name || 'Pentashih'})</span>
                            </a>
                            <span className="text-xs text-ink-muted">Kerahasiaan Internal</span>
                          </div>
                        )}
                        {a.juz_items?.length > 0 && <div className="space-y-1.5 pt-2 border-t border-line">{a.juz_items.map(item => <div key={item.id} className="text-xs text-ink"><strong>Juz {item.juz_number}:</strong> {item.result === 'PASSED' ? 'Selesai' : item.result === 'REVISION_REQUIRED' ? 'Perlu perbaikan' : 'Menunggu checklist'}{item.notes ? ` — ${item.notes}` : ''}</div>)}</div>}
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Peringatan jika belum semua selesai */}
              {!allCompleted && (
                <div className="p-3.5 rounded-xl bg-civic-warningSoft border border-civic-warningLine text-civic-warning text-xs flex items-start gap-2.5">
                  <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5 text-civic-warning" />
                  <div>
                    <strong>Sidang Belum Selesai Seluruhnya:</strong> Masih ada anggota tim pentashih yang belum menginputkan hasil telaah. Keputusan distributor baru dapat disimpan setelah semua anggota menyelesaikan telaah.
                  </div>
                </div>
              )}

              {/* Peringatan jika belum ada dokumen rekap internal (B-06) */}
              {allCompleted && !hasTeamRecap && (
                <div className="p-3.5 rounded-xl bg-civic-warningSoft border border-civic-warningLine text-civic-warning text-xs flex items-start gap-2.5">
                  <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5 text-civic-warning" />
                  <div>
                    <strong>Dokumen Rekapan Belum Diunggah:</strong> Seluruh pentashih telah menyelesaikan telaah namun dokumen rekap hasil telaah internal belum diunggah. Sesuai SOP, minimal 1 dokumen rekap kelompok/pentashih wajib diunggah sebelum keputusan distributor dapat disimpan.
                  </div>
                </div>
              )}

              {/* Pembandingan Catatan Sidang LPMQ vs Rekapitulasi Perbaikan Penerbit (B-07 & B-16) */}
              {(previousRevLetters.length > 0 || (registration?.publisher_revision_recaps && registration.publisher_revision_recaps.length > 0)) && (
                <div className="p-4 rounded-xl border border-civic-warningLine bg-civic-warningSoft space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-xs text-ink uppercase tracking-wider flex items-center gap-1.5">
                      <AlertTriangle className="w-3.5 h-3.5 text-civic-warning" />
                      Komparasi Catatan Sidang & Rekapitulasi Perbaikan Penerbit
                    </span>
                    <span className="text-[11px] text-civic-warning font-medium">Bahan Verifikasi Komparatif</span>
                  </div>
                  <div className="space-y-3">
                    {previousRevLetters.map((doc) => {
                      const roundNum = doc.content_snapshot?.revision_round || doc.version || 1;
                      const pubRecap = (registration?.publisher_revision_recaps || []).find((r) => r.round_number === roundNum);
                      return (
                        <div key={doc.id} className="p-3 bg-white rounded-lg border border-civic-warningLine text-xs space-y-2">
                          <div className="flex items-center justify-between font-semibold text-ink border-b border-line pb-1.5">
                            <span>Ronde #{roundNum} • {doc.content_snapshot?.revision_kind === 'NASKAH_DUMI' ? 'Naskah Dumi' : 'Naskah Perbaikan'}</span>
                            <span className="text-[11px] text-ink-muted">{doc.content_snapshot?.distributor_name || 'Distributor'}</span>
                          </div>
                          <div>
                            <span className="text-[11px] text-ink-muted block mb-1 font-semibold">1. Arahan Koreksi Sidang LPMQ:</span>
                            <p className="text-ink font-mono text-[11px] bg-canvas p-2 rounded border border-line whitespace-pre-line">
                              {doc.content_snapshot?.notes || '-'}
                            </p>
                          </div>
                          <div className="pt-1 flex flex-wrap items-center justify-between gap-2 border-t border-line/60">
                            <span className="text-[11px] text-ink-muted font-semibold">2. Dokumen Rekap Perbaikan Penerbit:</span>
                            {pubRecap?.recap_file_id ? (
                              <a
                                href={`/api/v1/uploads/${pubRecap.recap_file_id}`}
                                target="_blank"
                                rel="noreferrer"
                                className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-brand-50 border border-brand-200 text-brand-900 text-xs font-semibold hover:bg-brand-100 transition-colors shadow-2xs"
                              >
                                <FileText className="w-3.5 h-3.5 text-brand-700" />
                                <span>Unduh Rekap Revisi Penerbit (Ronde #{roundNum})</span>
                              </a>
                            ) : (
                              <span className="text-xs text-civic-warning italic">Penerbit belum mengunggah berkas rekapitulasi untuk ronde ini</span>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {pendingParaf && (
                <div className="p-3.5 rounded-xl bg-civic-infoSoft border border-civic-infoLine text-xs text-ink space-y-2">
                  <div className="font-bold flex items-center gap-1.5">
                    <Clock className="w-3.5 h-3.5 text-civic-info" />
                    <span>Menunggu paraf {pendingParaf.pemaraf?.name || 'Pemaraf'}</span>
                  </div>
                  <div>
                    Keputusan {pendingParaf.requested_by?.name || 'distributor'}:{' '}
                    <strong>{pendingParaf.decision?.result === 'PASSED' ? 'Lolos telaah' : 'Kembalikan ke penerbit (perbaikan)'}</strong>
                  </div>
                  <p className="font-mono whitespace-pre-line bg-white border border-line rounded p-2">{pendingParaf.decision?.notes}</p>
                  {canParaf && (
                    <Button
                      type="button"
                      variant="primary"
                      size="sm"
                      onClick={handleParaf}
                      disabled={submitting}
                      className="bg-brand-700 hover:bg-brand-800 text-white font-bold"
                      icon={<Check className="w-3.5 h-3.5" />}
                    >
                      {submitting ? 'Menyimpan...' : 'Bubuhkan Paraf'}
                    </Button>
                  )}
                </div>
              )}

              {/* Keputusan Distributor */}
              {allCompleted && (
                canDecide ? (
                  <div className="space-y-4 pt-2 border-t border-line">
                    <div>
                      <label className="block text-xs font-bold text-ink uppercase tracking-wider mb-2">
                        Keputusan Tindak Lanjut Distributor
                      </label>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        {/* Opsi Lulus (STT jika DUMMY, atau Alihkan ke Tahap DUMMY jika INITIAL/REVISION) - B-16 */}
                        <label
                          className={clsx(
                            'p-3.5 rounded-xl border-2 transition-all flex items-start gap-3',
                            !canPassSTT
                              ? 'opacity-50 border-line bg-canvas cursor-not-allowed'
                              : decision === 'PASSED'
                              ? 'border-brand-700 bg-brand-50/50 cursor-pointer'
                              : 'border-line hover:border-line-strong cursor-pointer'
                          )}
                        >
                          <input
                            type="radio"
                            name="distributorDecision"
                            value="PASSED"
                            disabled={!canPassSTT}
                            checked={decision === 'PASSED'}
                            onChange={(e) => setDecision(e.target.value)}
                            className="mt-0.5 text-brand-700 focus:ring-brand-700"
                          />
                          <div>
                            <div className="font-bold text-xs text-ink">
                              {currentAssignments[0]?.stage === 'DUMMY'
                                ? 'Rekomendasikan Penetapan STT'
                                : 'Loloskan Telaah & Alihkan ke Tahap Dumi'}
                            </div>
                            <div className="text-xs text-ink-muted mt-0.5 leading-snug">
                              {currentAssignments[0]?.stage === 'DUMMY'
                                ? <span>Status beralih ke <code>READY_FOR_STT</code> untuk diterbitkan oleh Kepala LPMQ.</span>
                                : <span>Status beralih ke <code>REVISION_REQUIRED (NASKAH_DUMI)</code> agar penerbit mencetak & mengirimkan master dumi fisik.</span>}
                            </div>
                          </div>
                        </label>

                        {/* Opsi Perbaikan Penerbit */}
                        <label
                          className={clsx(
                            'p-3.5 rounded-xl border-2 transition-all cursor-pointer flex items-start gap-3',
                            decision === 'REVISION_REQUIRED'
                              ? 'border-civic-warning bg-civic-warningSoft/50'
                              : 'border-line hover:border-line-strong'
                          )}
                        >
                          <input
                            type="radio"
                            name="distributorDecision"
                            value="REVISION_REQUIRED"
                            checked={decision === 'REVISION_REQUIRED'}
                            onChange={(e) => setDecision(e.target.value)}
                            className="mt-0.5 text-civic-warning focus:ring-civic-warning"
                          />
                          <div>
                            <div className="font-bold text-xs text-ink">
                              Kembalikan ke Penerbit (Perbaikan)
                            </div>
                            <div className="text-xs text-ink-muted mt-0.5">
                              Status beralih ke <code>REVISION_REQUIRED</code>. Penerbit memperbaiki master dan kirim ulang.
                            </div>
                          </div>
                        </label>
                      </div>

                      {decision === 'REVISION_REQUIRED' && (
                        <div className="mt-3.5 p-3.5 rounded-xl border border-civic-warningLine bg-civic-warningSoft/30 space-y-3">
                          <div className="flex items-center justify-between">
                            <span className="text-xs font-bold text-ink">
                              Ronde Pengembalian: <strong className="font-mono text-civic-warning">Perbaikan Ke-{(registration?.revision_round || 0) + 1}</strong>
                            </span>
                            <span className="text-xs text-brand-800 font-semibold px-2 py-0.5 rounded bg-brand-50 border border-brand-200">
                              Surat Hasil Tashih Otomatis Terbit
                            </span>
                          </div>

                          {/* Resi Keluar Pengembalian Naskah ke Penerbit (B-07) */}
                          <div className="p-3.5 rounded-lg bg-white border border-civic-warningLine/70 space-y-2.5">
                            <div className="flex items-center gap-1.5 font-bold text-xs text-ink">
                              <Truck className="w-3.5 h-3.5 text-brand-800" />
                              <span>Pencatatan Resi Keluar ke Penerbit (Opsional)</span>
                            </div>
                            <p className="text-[11px] text-ink-muted">
                              Catat kurir dan nomor resi pengiriman naskah fisik kembali ke penerbit.
                            </p>
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
                              <div>
                                <label className="block text-[11px] font-semibold text-ink mb-1">Kurir / Ekspedisi</label>
                                <input
                                  type="text"
                                  value={outgoingCourier}
                                  onChange={(e) => setOutgoingCourier(e.target.value)}
                                  placeholder="Contoh: POS Indonesia, JNE, TIKI, Antar Langsung"
                                  className="w-full rounded-lg border border-line p-2 text-xs bg-canvas"
                                />
                              </div>
                              <div>
                                <label className="block text-[11px] font-semibold text-ink mb-1">Nomor Resi Keluar</label>
                                <input
                                  type="text"
                                  value={outgoingTrackingNo}
                                  onChange={(e) => setOutgoingTrackingNo(e.target.value)}
                                  placeholder="Nomor resi bukti kirim"
                                  className="w-full rounded-lg border border-line p-2 text-xs bg-canvas font-mono"
                                />
                              </div>
                            </div>
                          </div>
                        </div>
                      )}

                      {(
                        <div className="mt-3.5">
                          <label htmlFor="pemaraf-select" className="block text-xs font-bold text-ink uppercase tracking-wider mb-1.5">
                            Pemaraf
                          </label>
                          <select
                            id="pemaraf-select"
                            value={pemarafId}
                            onChange={(e) => setPemarafId(e.target.value)}
                            disabled={!parafState.gate_active}
                            className="w-full rounded-xl border border-line-strong p-2.5 text-xs bg-canvas/70 outline-none focus:bg-white focus:ring-2 focus:ring-brand-700/20 focus:border-brand-700"
                          >
                            <option value="">Pilih pemaraf...</option>
                            {pemarafOptions.map((p) => (
                              <option key={p.id} value={p.id}>{p.name}</option>
                            ))}
                          </select>
                          <p className="text-xs text-ink-muted mt-1">
                            {parafState.gate_active
                              ? 'Keputusan baru berlaku setelah pemaraf yang dipilih membubuhkan paraf.'
                              : 'Belum ada akun dengan peran Pemaraf yang aktif, sehingga keputusan langsung berlaku saat disimpan.'}
                          </p>
                        </div>
                      )}

                      {!canPassSTT && (
                        <p className="text-xs text-civic-warning mt-1.5 flex items-center gap-1">
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
                        <label className="block text-xs font-bold text-ink uppercase tracking-wider">
                          Catatan Keputusan Reviu Distributor
                        </label>
                        <span className="text-xs text-ink-muted">Wajib diisi</span>
                      </div>
                      <textarea
                        rows={4}
                        value={distributorNotes}
                        maxLength={10000}
                        onChange={(e) => setDistributorNotes(e.target.value)}
                        placeholder="Tuliskan arahan perbaikan resmi yang akan dicantumkan pada Surat Pengembalian dan Catatan Hasil Tashih..."
                        className="w-full p-3 text-xs bg-canvas/70 border border-line-strong rounded-xl outline-none focus:bg-white focus:ring-2 focus:ring-brand-700/20 focus:border-brand-700 transition-all font-mono leading-relaxed"
                      />
                      <p className="text-xs text-ink-muted mt-1">
                        Catatan ini dicantumkan langsung pada Surat Pengembalian dan Catatan Hasil Tashih resmi LPMQ untuk penerbit.
                      </p>
                    </div>
                  </div>
                ) : (
                  <div className="p-3.5 rounded-xl bg-canvas border border-line text-ink text-xs flex items-center gap-2 mt-2">
                    <ShieldCheck className="w-4 h-4 text-brand-700 shrink-0" />
                    <span>Mode Pratinjau: Seluruh anggota tim pentashih telah menyelesaikan sidang. Pengambilan keputusan reviu merupakan wewenang Koordinator Distributor.</span>
                  </div>
                )
              )}
            </>
          ) : null}

          {/* Footer Actions */}
          <div className="pt-4 border-t border-line flex items-center justify-end gap-2.5">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={onClose}
              disabled={submitting}
            >
              {canDecide ? 'Batal' : 'Tutup'}
            </Button>
            {canDecide && (
              <Button
                type="submit"
                variant="primary"
                size="sm"
                disabled={submitting || !distributorNotes.trim()}
                className="bg-brand-700 hover:bg-brand-800 text-white font-bold"
                icon={<Send className="w-3.5 h-3.5" />}
              >
                {submitting ? 'Menyimpan...' : parafState.gate_active ? 'Kirim ke Pemaraf' : 'Simpan Keputusan Distributor'}
              </Button>
            )}
          </div>
        </form>
      </div>
    </div>
  );
};

export default DistributorReviewDialog;
