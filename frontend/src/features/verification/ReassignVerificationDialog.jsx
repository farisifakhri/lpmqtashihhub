import React, { useState, useEffect } from 'react';
import { X, UserCheck, AlertCircle, AlertTriangle, ShieldCheck, Clock, RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { verificationApi } from '@/api/verification.api';

export const ReassignVerificationDialog = ({ assignment, onClose, onSuccess }) => {
  const [verifiers, setVerifiers] = useState([]);
  const [verifierSearch, setVerifierSearch] = useState('');
  const [selectedVerifierId, setSelectedVerifierId] = useState('');
  const [notaNo, setNotaNo] = useState('');
  const [reason, setReason] = useState('');
  const [notes, setNotes] = useState('');
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState(null);

  const reg = assignment?.registration || {};
  const currentVerifierId = assignment?.verifier_id || assignment?.verifier?.id;
  const currentVerifierName = assignment?.verifier?.name || 'Verifikator';
  const oldNotaDoc = assignment?.documents?.find?.(d => d.document_type === 'NOTA_DINAS_VERIFIKASI') || assignment?.documents?.[0];
  const oldNotaNo = oldNotaDoc?.document_no || assignment?.nota_no || '-';

  useEffect(() => {
    let isMounted = true;
    setLoading(true);
    setError(null);

    verificationApi
      .listActiveVerifiers({ status: 'ACTIVE' })
      .then((res) => {
        if (!isMounted) return;
        const items = res?.data || [];
        // Exclude current verifier from the reassignment candidate list
        const eligible = items.filter((v) => v.id !== currentVerifierId);
        setVerifiers(eligible);
      })
      .catch((err) => {
        if (!isMounted) return;
        setError(err.message || 'Gagal memuat direktori verifikator.');
      })
      .finally(() => {
        if (isMounted) setLoading(false);
      });

    return () => {
      isMounted = false;
    };
  }, [currentVerifierId]);

  const filteredVerifiers = verifiers.filter((v) => {
    if (!verifierSearch.trim()) return true;
    const term = verifierSearch.toLowerCase();
    return (
      v.name?.toLowerCase().includes(term) ||
      (v.nip && String(v.nip).includes(term))
    );
  });

  const selectedVerifier = verifiers.find((v) => v.id === selectedVerifierId) || null;

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!assignment?.id) return;

    if (!selectedVerifierId) {
      setError('Silakan pilih verifikator pengganti.');
      return;
    }

    if (!notaNo.trim() || notaNo.trim().length < 3) {
      setError('Nomor Nota Dinas baru wajib diisi (minimal 3 karakter).');
      return;
    }

    if (!reason.trim() || reason.trim().length < 5) {
      setError('Alasan pengalihan penugasan wajib diisi (minimal 5 karakter).');
      return;
    }

    setSubmitting(true);
    setError(null);

    try {
      const payload = {
        verifier_id: selectedVerifierId,
        nota_no: notaNo.trim(),
        reason: reason.trim(),
        notes: notes.trim() || undefined,
      };

      const res = await verificationApi.reassignAssignment(assignment.id, payload);
      if (onSuccess) {
        onSuccess(res?.data);
      }
    } catch (err) {
      setError(err.message || 'Gagal mengalihkan penugasan verifikasi.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="reassign-verifier-title"
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-ink/60 backdrop-blur-xs animate-fadeIn"
    >
      <div className="bg-white rounded-2xl max-w-xl w-full p-6 space-y-5 shadow-2xl border border-line max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-line pb-3">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-civic-infoSoft text-civic-info">
              <RefreshCw className="w-5 h-5" />
            </div>
            <div>
              <h3 id="reassign-verifier-title" className="text-base font-bold text-ink">
                Tugaskan Ulang (Reassign) Verifikator
              </h3>
              <p className="text-xs text-ink-muted">
                Otoritas Kepala LPMQ · Pengalihan Tugas & Nota Dinas Baru
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            disabled={submitting}
            aria-label="Tutup modal pengalihan"
            className="text-ink-muted hover:text-ink-muted p-1.5 rounded-lg hover:bg-surface-subtle transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Error Alert */}
        {error && (
          <div role="alert" className="p-3 bg-civic-dangerSoft border border-civic-dangerLine rounded-xl flex items-start gap-2.5 text-xs text-civic-danger">
            <AlertCircle className="w-4 h-4 text-civic-danger shrink-0 mt-0.5" />
            <span>{error}</span>
          </div>
        )}

        {/* Current Assignment Context Summary */}
        <div className="p-3.5 bg-canvas border border-line rounded-xl text-xs space-y-2">
          <div className="flex items-center justify-between border-b border-line/60 pb-2">
            <span className="font-mono font-bold text-ink bg-white px-2 py-0.5 rounded border border-line">
              {reg.registration_no || '-'}
            </span>
            <span className="text-ink-muted">
              Nota Dinas Lama: <strong className="text-ink">{oldNotaNo}</strong>
            </span>
          </div>
          <div className="space-y-1">
            <div className="font-semibold text-ink">{reg.title || 'Naskah Mushaf'}</div>
            <div className="text-ink-muted">
              Verifikator saat ini: <strong className="text-ink">{currentVerifierName}</strong>
            </div>
          </div>
        </div>

        {/* Notice Box */}
        <div className="p-3 bg-civic-infoSoft border border-civic-infoLine rounded-xl flex items-start gap-2.5 text-xs text-civic-info">
          <AlertTriangle className="w-4 h-4 text-civic-info shrink-0 mt-0.5" />
          <div>
            <strong>Ketentuan Alur Reassignment:</strong>
            <p className="mt-0.5 text-civic-info">
              Penugasan lama akan dicabut secara audit (<code>REVOKED</code>). Verifikator pengganti akan menerima penugasan baru dengan Nota Dinas baru dan target SLA 2 hari kerja dihitung dari hari ini.
            </p>
          </div>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Verifier Selection */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <label className="block text-xs font-bold text-ink">
                Pilih Verifikator Pengganti <span className="text-civic-danger">*</span>
              </label>
              <span className="text-[11px] text-ink-muted">
                {verifiers.length} verifikator tersedia
              </span>
            </div>

            <input
              type="text"
              value={verifierSearch}
              onChange={(e) => setVerifierSearch(e.target.value)}
              placeholder="Cari nama atau NIP verifikator..."
              className="w-full text-xs p-2.5 rounded-lg border border-line focus:outline-none focus:ring-2 focus:ring-civic-info/20 focus:border-civic-info"
            />

            {loading ? (
              <div className="p-4 text-center text-xs text-ink-muted">
                Memuat daftar verifikator...
              </div>
            ) : filteredVerifiers.length === 0 ? (
              <div className="p-4 text-center text-xs text-ink-muted bg-canvas rounded-lg border border-line">
                Tidak ada verifikator lain yang cocok.
              </div>
            ) : (
              <div className="max-h-40 overflow-y-auto space-y-1.5 border border-line rounded-xl p-2 bg-canvas/50">
                {filteredVerifiers.map((v) => {
                  const isSelected = selectedVerifierId === v.id;
                  return (
                    <div
                      key={v.id}
                      onClick={() => setSelectedVerifierId(v.id)}
                      className={`p-2.5 rounded-lg border cursor-pointer transition-all text-xs flex items-center justify-between ${
                        isSelected
                          ? 'border-civic-info bg-civic-infoSoft/60 ring-1 ring-civic-info'
                          : 'border-line bg-white hover:border-line-strong'
                      }`}
                    >
                      <div>
                        <div className="font-bold text-ink">{v.name}</div>
                        <div className="text-[11px] text-ink-muted">NIP: {v.nip || '-'}</div>
                      </div>
                      <div className="text-right">
                        <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold bg-surface-subtle text-ink">
                          {v.active_assignment_count || 0} tugas aktif
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* New Nota Dinas Number */}
          <div>
            <label htmlFor="new-nota-no" className="block text-xs font-bold text-ink mb-1.5">
              Nomor Nota Dinas Baru <span className="text-civic-danger">*</span>
            </label>
            <input
              id="new-nota-no"
              type="text"
              required
              value={notaNo}
              onChange={(e) => setNotaNo(e.target.value)}
              placeholder="Contoh: ND-2026/09/REV-001"
              className="w-full text-xs p-2.5 rounded-lg border border-line-strong focus:outline-none focus:ring-2 focus:ring-civic-info/20 focus:border-civic-info font-mono"
            />
          </div>

          {/* Reassignment Reason */}
          <div>
            <label htmlFor="reassign-reason" className="block text-xs font-bold text-ink mb-1.5">
              Alasan Pengalihan Tugas <span className="text-civic-danger">*</span>
            </label>
            <textarea
              id="reassign-reason"
              rows={2}
              required
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="Jelaskan alasan resmi pengalihan tugas (contoh: Pemerataan beban kerja, verifikator sebelumnya berhalangan, dsb)..."
              className="w-full text-xs p-2.5 rounded-lg border border-line-strong focus:outline-none focus:ring-2 focus:ring-civic-info/20 focus:border-civic-info resize-none"
            />
          </div>

          {/* Optional Notes */}
          <div>
            <label htmlFor="reassign-notes" className="block text-xs font-bold text-ink mb-1.5">
              Catatan untuk Verifikator Pengganti (Opsional)
            </label>
            <input
              id="reassign-notes"
              type="text"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Contoh: Perhatikan catatan juz 1-5"
              className="w-full text-xs p-2.5 rounded-lg border border-line-strong focus:outline-none focus:ring-2 focus:ring-civic-info/20 focus:border-civic-info"
            />
          </div>

          {/* Actions */}
          <div className="flex items-center justify-end gap-2.5 pt-2 border-t border-line">
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
              size="sm"
              disabled={submitting || !selectedVerifierId || !notaNo.trim() || reason.trim().length < 5}
              className="bg-civic-info hover:bg-civic-info text-white"
            >
              {submitting ? 'Mengalihkan...' : 'Terbitkan & Tugaskan Ulang'}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default ReassignVerificationDialog;

