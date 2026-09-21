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
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-fadeIn"
    >
      <div className="bg-white rounded-2xl max-w-xl w-full p-6 space-y-5 shadow-2xl border border-slate-200 max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-100 pb-3">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-indigo-100 text-indigo-800">
              <RefreshCw className="w-5 h-5" />
            </div>
            <div>
              <h3 id="reassign-verifier-title" className="text-base font-bold text-slate-900">
                Tugaskan Ulang (Reassign) Verifikator
              </h3>
              <p className="text-xs text-slate-500">
                Otoritas Kepala LPMQ · Pengalihan Tugas & Nota Dinas Baru
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            disabled={submitting}
            aria-label="Tutup modal pengalihan"
            className="text-slate-400 hover:text-slate-600 p-1.5 rounded-lg hover:bg-slate-100 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Error Alert */}
        {error && (
          <div role="alert" className="p-3 bg-rose-50 border border-rose-200 rounded-xl flex items-start gap-2.5 text-xs text-rose-800">
            <AlertCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
            <span>{error}</span>
          </div>
        )}

        {/* Current Assignment Context Summary */}
        <div className="p-3.5 bg-slate-50 border border-slate-200 rounded-xl text-xs space-y-2">
          <div className="flex items-center justify-between border-b border-slate-200/60 pb-2">
            <span className="font-mono font-bold text-slate-800 bg-white px-2 py-0.5 rounded border border-slate-200">
              {reg.registration_no || '-'}
            </span>
            <span className="text-slate-500">
              Nota Dinas Lama: <strong className="text-slate-800">{oldNotaNo}</strong>
            </span>
          </div>
          <div className="space-y-1">
            <div className="font-semibold text-slate-900">{reg.title || 'Naskah Mushaf'}</div>
            <div className="text-slate-500">
              Verifikator saat ini: <strong className="text-slate-800">{currentVerifierName}</strong>
            </div>
          </div>
        </div>

        {/* Notice Box */}
        <div className="p-3 bg-blue-50 border border-blue-200 rounded-xl flex items-start gap-2.5 text-xs text-blue-900">
          <AlertTriangle className="w-4 h-4 text-blue-700 shrink-0 mt-0.5" />
          <div>
            <strong>Ketentuan Alur Reassignment:</strong>
            <p className="mt-0.5 text-blue-800">
              Penugasan lama akan dicabut secara audit (<code>REVOKED</code>). Verifikator pengganti akan menerima penugasan baru dengan Nota Dinas baru dan target SLA 2 hari kerja dihitung dari hari ini.
            </p>
          </div>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Verifier Selection */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <label className="block text-xs font-bold text-slate-700">
                Pilih Verifikator Pengganti <span className="text-rose-600">*</span>
              </label>
              <span className="text-[11px] text-slate-500">
                {verifiers.length} verifikator tersedia
              </span>
            </div>

            <input
              type="text"
              value={verifierSearch}
              onChange={(e) => setVerifierSearch(e.target.value)}
              placeholder="Cari nama atau NIP verifikator..."
              className="w-full text-xs p-2.5 rounded-lg border border-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-700/20 focus:border-indigo-700"
            />

            {loading ? (
              <div className="p-4 text-center text-xs text-slate-500">
                Memuat daftar verifikator...
              </div>
            ) : filteredVerifiers.length === 0 ? (
              <div className="p-4 text-center text-xs text-slate-500 bg-slate-50 rounded-lg border border-slate-200">
                Tidak ada verifikator lain yang cocok.
              </div>
            ) : (
              <div className="max-h-40 overflow-y-auto space-y-1.5 border border-slate-200 rounded-xl p-2 bg-slate-50/50">
                {filteredVerifiers.map((v) => {
                  const isSelected = selectedVerifierId === v.id;
                  return (
                    <div
                      key={v.id}
                      onClick={() => setSelectedVerifierId(v.id)}
                      className={`p-2.5 rounded-lg border cursor-pointer transition-all text-xs flex items-center justify-between ${
                        isSelected
                          ? 'border-indigo-600 bg-indigo-50/60 ring-1 ring-indigo-600'
                          : 'border-slate-200 bg-white hover:border-slate-300'
                      }`}
                    >
                      <div>
                        <div className="font-bold text-slate-900">{v.name}</div>
                        <div className="text-[11px] text-slate-500">NIP: {v.nip || '-'}</div>
                      </div>
                      <div className="text-right">
                        <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold bg-slate-100 text-slate-700">
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
            <label htmlFor="new-nota-no" className="block text-xs font-bold text-slate-700 mb-1.5">
              Nomor Nota Dinas Baru <span className="text-rose-600">*</span>
            </label>
            <input
              id="new-nota-no"
              type="text"
              required
              value={notaNo}
              onChange={(e) => setNotaNo(e.target.value)}
              placeholder="Contoh: ND-2026/09/REV-001"
              className="w-full text-xs p-2.5 rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-600 font-mono"
            />
          </div>

          {/* Reassignment Reason */}
          <div>
            <label htmlFor="reassign-reason" className="block text-xs font-bold text-slate-700 mb-1.5">
              Alasan Pengalihan Tugas <span className="text-rose-600">*</span>
            </label>
            <textarea
              id="reassign-reason"
              rows={2}
              required
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="Jelaskan alasan resmi pengalihan tugas (contoh: Pemerataan beban kerja, verifikator sebelumnya berhalangan, dsb)..."
              className="w-full text-xs p-2.5 rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-600 resize-none"
            />
          </div>

          {/* Optional Notes */}
          <div>
            <label htmlFor="reassign-notes" className="block text-xs font-bold text-slate-700 mb-1.5">
              Catatan untuk Verifikator Pengganti (Opsional)
            </label>
            <input
              id="reassign-notes"
              type="text"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Contoh: Perhatikan catatan juz 1-5"
              className="w-full text-xs p-2.5 rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-600"
            />
          </div>

          {/* Actions */}
          <div className="flex items-center justify-end gap-2.5 pt-2 border-t border-slate-100">
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
              className="bg-indigo-700 hover:bg-indigo-800 text-white"
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

