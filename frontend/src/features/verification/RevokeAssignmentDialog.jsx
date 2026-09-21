import React, { useState } from 'react';
import { X, AlertTriangle, AlertCircle, ShieldAlert } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { verificationApi } from '@/api/verification.api';

export const RevokeAssignmentDialog = ({ assignment, onClose, onSuccess }) => {
  const [reason, setReason] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState(null);

  const reg = assignment?.registration || {};
  const verifierName = assignment?.verifier?.name || 'Verifikator';
  const notaDoc = assignment?.documents?.find?.(d => d.document_type === 'NOTA_DINAS_VERIFIKASI') || assignment?.documents?.[0];
  const notaNo = notaDoc?.document_no || assignment?.nota_no || '-';

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!assignment?.id) return;

    if (!reason.trim() || reason.trim().length < 5) {
      setError('Alasan pencabutan penugasan wajib diisi (minimal 5 karakter).');
      return;
    }

    setSubmitting(true);
    setError(null);

    try {
      const res = await verificationApi.revokeAssignment(assignment.id, {
        reason: reason.trim(),
      });
      if (onSuccess) {
        onSuccess(res?.data);
      }
    } catch (err) {
      setError(err.message || 'Gagal mencabut penugasan verifikasi.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="revoke-assignment-title"
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-fadeIn"
    >
      <div className="bg-white rounded-2xl max-w-lg w-full p-6 space-y-5 shadow-2xl border border-slate-200 max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-100 pb-3">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-rose-100 text-rose-800">
              <ShieldAlert className="w-5 h-5" />
            </div>
            <div>
              <h3 id="revoke-assignment-title" className="text-base font-bold text-slate-900">
                Cabut Penugasan Verifikasi
              </h3>
              <p className="text-xs text-slate-500">
                Otoritas Kepala LPMQ · Pembatalan Surat Tugas
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            disabled={submitting}
            aria-label="Tutup modal pencabutan"
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

        {/* Assignment Context Summary */}
        <div className="p-3.5 bg-slate-50 border border-slate-200 rounded-xl text-xs space-y-2">
          <div className="flex items-center justify-between border-b border-slate-200/60 pb-2">
            <span className="font-mono font-bold text-slate-800 bg-white px-2 py-0.5 rounded border border-slate-200">
              {reg.registration_no || '-'}
            </span>
            <span className="text-slate-500">
              Nota Dinas: <strong className="text-slate-800">{notaNo}</strong>
            </span>
          </div>
          <div className="space-y-1">
            <div className="font-semibold text-slate-900">{reg.title || 'Naskah Mushaf'}</div>
            <div className="text-slate-500">
              Verifikator saat ini: <strong className="text-slate-800">{verifierName}</strong>
            </div>
          </div>
        </div>

        {/* Warning Policy Box */}
        <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl flex items-start gap-2.5 text-xs text-amber-900">
          <AlertTriangle className="w-4 h-4 text-amber-700 shrink-0 mt-0.5" />
          <div>
            <strong>Peringatan Audit & Workflow:</strong>
            <p className="mt-0.5 text-amber-800">
              Penugasan verifikator akan dicabut (status <code>REVOKED</code>). Berkas pendaftaran akan dikembalikan ke status <em>Siap Ditugaskan</em> agar dapat ditugaskan kembali kepada verifikator lain.
            </p>
          </div>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label htmlFor="revoke-reason" className="block text-xs font-bold text-slate-700 mb-1.5">
              Alasan Pencabutan Penugasan <span className="text-rose-600">*</span>
            </label>
            <textarea
              id="revoke-reason"
              rows={3}
              required
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="Jelaskan alasan resmi pencabutan penugasan (contoh: Verifikator sedang cuti dinas luar, rotasi berkas naskah, dll)..."
              className="w-full text-xs p-3 rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-rose-500/20 focus:border-rose-600 resize-none"
            />
          </div>

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
              variant="destructive"
              size="sm"
              disabled={submitting}
              className="bg-rose-700 hover:bg-rose-800 text-white"
            >
              {submitting ? 'Mencabut...' : 'Cabut Penugasan'}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default RevokeAssignmentDialog;

