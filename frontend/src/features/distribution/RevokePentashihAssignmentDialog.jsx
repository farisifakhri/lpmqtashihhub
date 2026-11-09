import React, { useState } from 'react';
import { X, AlertTriangle, AlertCircle, ShieldAlert } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { tashihApi } from '@/api/tashih.api';

export const RevokePentashihAssignmentDialog = ({ assignment, registration, onClose, onSuccess }) => {
  const [reason, setReason] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState(null);

  const reg = registration || assignment?.registration || {};
  const pentashihName = assignment?.assignee?.name || 'Pentashih';
  const juzList = (assignment?.juz_items || []).map(j => j.juz_number).sort((a, b) => a - b);
  const juzLabel = juzList.length > 0 ? `Juz ${juzList.join(', ')}` : (assignment?.team?.name || 'Seluruh Juz');

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!assignment?.id) return;

    if (!reason.trim() || reason.trim().length < 5) {
      setError('Alasan pelepasan penugasan wajib diisi (minimal 5 karakter).');
      return;
    }

    setSubmitting(true);
    setError(null);

    try {
      const res = await tashihApi.revokeAssignment(assignment.id, {
        reason: reason.trim(),
      });
      if (onSuccess) {
        onSuccess(res?.data || res);
      }
    } catch (err) {
      setError(err.message || 'Gagal mencabut penugasan pentashih.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="revoke-pentashih-title"
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-ink/60 backdrop-blur-xs animate-fadeIn"
    >
      <div className="bg-white rounded-2xl max-w-lg w-full p-6 space-y-5 shadow-2xl border border-line max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-line pb-3">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-civic-dangerSoft text-civic-danger">
              <ShieldAlert className="w-5 h-5" />
            </div>
            <div>
              <h3 id="revoke-pentashih-title" className="text-base font-bold text-ink">
                Pelepasan Penugasan Pentashih
              </h3>
              <p className="text-xs text-ink-muted">
                Pencabutan tugas karena cuti, sakit, atau halangan dinas
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            disabled={submitting}
            aria-label="Tutup modal pencabutan"
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

        {/* Assignment Context Summary */}
        <div className="p-3.5 bg-canvas border border-line rounded-xl text-xs space-y-2">
          <div className="flex items-center justify-between border-b border-line/60 pb-2">
            <span className="font-mono font-bold text-ink bg-white px-2 py-0.5 rounded border border-line">
              {reg.registration_no || '-'}
            </span>
            <span className="text-ink-muted">
              Lingkup: <strong className="text-ink">{juzLabel}</strong>
            </span>
          </div>
          <div className="space-y-1">
            <div className="font-semibold text-ink line-clamp-1">{reg.title || 'Naskah Mushaf'}</div>
            <div className="text-ink-muted">
              Pentashih yang dilepas: <strong className="text-ink">{pentashihName}</strong>
            </div>
          </div>
        </div>

        {/* Warning Policy Box */}
        <div className="p-3 bg-civic-warningSoft border border-civic-warningLine rounded-xl flex items-start gap-2.5 text-xs text-civic-warning">
          <AlertTriangle className="w-4 h-4 text-civic-warning shrink-0 mt-0.5" />
          <div>
            <strong>Peringatan Integritas Cakupan Juz:</strong>
            <p className="mt-0.5 text-civic-warning">
              Penugasan pentashih ini akan berstatus <code>REVOKED</code>. Putusan sidang distributor tidak dapat disahkan sebelum ada pentashih pengganti yang menyelesaikan telaah untuk juz yang dilepas.
            </p>
          </div>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label htmlFor="revoke-reason" className="block text-xs font-bold text-ink mb-1.5">
              Alasan Pelepasan / Cuti Dinas <span className="text-civic-danger">*</span>
            </label>
            <textarea
              id="revoke-reason"
              rows={3}
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="Contoh: Pentashih mengambil cuti dinas / sakit rawat inap sehingga tugas dialihkan ke anggota pengganti..."
              className="w-full text-xs rounded-xl border border-line p-3 focus:outline-none focus:ring-2 focus:ring-brand-700/20 focus:border-brand-700 transition-colors"
              disabled={submitting}
              required
            />
            <div className="flex justify-between items-center mt-1 text-xs text-ink-muted">
              <span>Minimal 5 karakter</span>
              <span>{reason.trim().length} karakter</span>
            </div>
          </div>

          {/* Action Buttons */}
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
              variant="danger"
              size="sm"
              disabled={submitting || reason.trim().length < 5}
            >
              {submitting ? 'Melepaskan...' : 'Lepas Penugasan'}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default RevokePentashihAssignmentDialog;
