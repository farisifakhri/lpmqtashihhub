import React, { useState, useEffect } from 'react';
import { X, FileText, CheckCircle2, AlertCircle, Clock, ShieldCheck, UserCheck } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { verificationApi } from '@/api/verification.api';

export const AssignVerificationDialog = ({ registration, onClose, onSuccess }) => {
  const [verifiers, setVerifiers] = useState([]);
  const [selectedVerifierId, setSelectedVerifierId] = useState('');
  const [notaNo, setNotaNo] = useState('');
  const [notes, setNotes] = useState('');
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    let isMounted = true;
    setLoading(true);
    setError(null);

    verificationApi
      .getVerifiers()
      .then((res) => {
        if (!isMounted) return;
        const items = res?.data || [];
        setVerifiers(items);
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
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!registration?.id) return;

    if (!selectedVerifierId) {
      setError('Silakan pilih verifikator yang akan ditugaskan.');
      return;
    }

    if (!notaNo.trim() || notaNo.trim().length < 3) {
      setError('Nomor Nota Dinas wajib diisi (minimal 3 karakter).');
      return;
    }

    setSubmitting(true);
    setError(null);

    try {
      const payload = {
        verifier_id: selectedVerifierId,
        nota_no: notaNo.trim(),
        notes: notes.trim() || undefined,
      };

      const res = await verificationApi.createAssignment(registration.id, payload);
      if (onSuccess) {
        onSuccess(res?.data);
      }
    } catch (err) {
      setError(err.message || 'Gagal menerbitkan Nota Dinas dan membuat penugasan verifikasi.');
    } finally {
      setSubmitting(false);
    }
  };

  const publisher = registration?.publisher || {};
  const physicalMaster = registration?.physical_master_intake || {};
  const todayFormatted = new Date().toLocaleDateString('id-ID', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="assign-verifier-title"
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-fadeIn"
    >
      <div className="bg-white rounded-2xl max-w-xl w-full p-6 space-y-5 shadow-2xl border border-slate-200">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-100 pb-3">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-emerald-100 text-emerald-800">
              <ShieldCheck className="w-5 h-5" />
            </div>
            <div>
              <h3 id="assign-verifier-title" className="text-base font-bold text-slate-900">
                Terbitkan Nota Dinas & Tugaskan Verifikator
              </h3>
              <p className="text-xs text-slate-500">
                Otoritas Kepala LPMQ · Langkah 4 SOP Pentashihan Mushaf
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            disabled={submitting}
            aria-label="Tutup modal penugasan"
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

        {/* Manuscript Context Summary */}
        <div className="p-3.5 bg-slate-50 border border-slate-200 rounded-xl text-xs space-y-2">
          <div className="flex items-center justify-between border-b border-slate-200/60 pb-2">
            <span className="font-mono font-bold text-slate-800 bg-white px-2 py-0.5 rounded border border-slate-200">
              {registration?.registration_no || '-'}
            </span>
            <span className="text-slate-600 font-medium">
              Pemohon: <strong className="text-slate-900">{publisher.legal_name || '-'}</strong>
            </span>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-slate-600">
            <div>
              <span className="text-slate-500 block text-[11px]">Judul Naskah:</span>
              <span className="font-semibold text-slate-900">{registration?.title || '-'}</span>
            </div>
            <div>
              <span className="text-slate-500 block text-[11px]">Master Fisik Loket:</span>
              <span className="font-mono text-emerald-800 font-semibold">
                {physicalMaster.receipt_no || 'Diterima'} ({physicalMaster.volume_count ?? 30} jilid)
              </span>
            </div>
          </div>
        </div>

        {/* Form Fields */}
        <form onSubmit={handleSubmit} className="space-y-4 text-xs">
          {/* Verifier Selection */}
          <div className="space-y-1.5">
            <label htmlFor="verifier-select" className="block font-bold text-slate-800">
              Pilih Verifikator <span className="text-rose-600">*</span>
            </label>
            {loading ? (
              <p className="text-slate-500 italic py-2">Memuat daftar verifikator...</p>
            ) : (
              <select
                id="verifier-select"
                value={selectedVerifierId}
                onChange={(e) => setSelectedVerifierId(e.target.value)}
                disabled={submitting}
                className="w-full px-3 py-2 text-xs rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-emerald-700/20 focus:border-emerald-700 bg-white"
              >
                <option value="">-- Pilih Petugas Verifikator --</option>
                {verifiers.map((v) => (
                  <option key={v.id} value={v.id}>
                    {v.name} {v.nip ? `(NIP: ${v.nip})` : ''} · {v.active_assignments_count} tugas aktif
                  </option>
                ))}
              </select>
            )}
            <p className="text-[11px] text-slate-500">
              Menampilkan staf aktif dengan kewenangan Verifikator beserta beban kerja aktif saat ini.
            </p>
          </div>

          {/* Nota Dinas Number */}
          <div className="space-y-1.5">
            <label htmlFor="nota-no-input" className="block font-bold text-slate-800">
              Nomor Nota Dinas Penugasan <span className="text-rose-600">*</span>
            </label>
            <input
              id="nota-no-input"
              type="text"
              value={notaNo}
              onChange={(e) => setNotaNo(e.target.value)}
              disabled={submitting}
              placeholder="Contoh: ND.01/LPMQ.01/TL.00/09/2026"
              className="w-full px-3 py-2 text-xs rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-emerald-700/20 focus:border-emerald-700 font-mono"
            />
            <p className="text-[11px] text-slate-500">
              Nomor resmi Nota Dinas yang diterbitkan oleh Kepala LPMQ sebagai dasar surat tugas verifikator.
            </p>
          </div>

          {/* Assignment Notes */}
          <div className="space-y-1.5">
            <label htmlFor="notes-input" className="block font-bold text-slate-800">
              Catatan Khusus Penugasan (Opsional)
            </label>
            <textarea
              id="notes-input"
              rows={2}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              disabled={submitting}
              placeholder="Tambahkan arahan atau atensi khusus untuk verifikator..."
              className="w-full p-2.5 text-xs rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-emerald-700/20 focus:border-emerald-700"
            />
          </div>

          {/* SLA & Timeline Info */}
          <div className="p-3 bg-emerald-50/60 border border-emerald-200 rounded-xl grid grid-cols-2 gap-3 text-[11px] text-emerald-950">
            <div className="flex items-center gap-2">
              <Clock className="w-4 h-4 text-emerald-700 shrink-0" />
              <div>
                <span className="text-emerald-800 font-medium block">Tanggal Penugasan:</span>
                <strong className="font-semibold">{todayFormatted}</strong>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <UserCheck className="w-4 h-4 text-emerald-700 shrink-0" />
              <div>
                <span className="text-emerald-800 font-medium block">Tenggat Target SLA:</span>
                <strong className="font-semibold">2 Hari Kerja (SOP)</strong>
              </div>
            </div>
          </div>

          {/* Footer Actions */}
          <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-slate-100">
            <Button
              type="button"
              variant="outline"
              onClick={onClose}
              disabled={submitting}
              className="text-xs"
            >
              Batalkan
            </Button>
            <Button
              type="submit"
              variant="primary"
              disabled={submitting || loading}
              className="text-xs font-bold"
            >
              <FileText className="w-3.5 h-3.5 mr-1.5" />
              {submitting ? 'Menerbitkan...' : 'Terbitkan Nota Dinas & Tugaskan'}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default AssignVerificationDialog;
