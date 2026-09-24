import React, { useState, useEffect } from 'react';
import { X, FileText, CheckCircle2, AlertCircle, Clock, ShieldCheck, UserCheck } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { verificationApi } from '@/api/verification.api';

export const AssignVerificationDialog = ({ registration, onClose, onSuccess, onConflict }) => {
  const fixedVerifierId = registration?.core_verifier_id;
  const [verifiers, setVerifiers] = useState([]);
  const [verifierSearch, setVerifierSearch] = useState('');
  const [selectedVerifierId, setSelectedVerifierId] = useState('');
  const [notaNo, setNotaNo] = useState('');
  const [notes, setNotes] = useState('');
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState(null);
  const [notaError, setNotaError] = useState(false);

  useEffect(() => {
    let isMounted = true;
    setLoading(true);
    setError(null);

    verificationApi
      .listActiveVerifiers({ status: 'ACTIVE' })
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

  const filteredVerifiers = verifiers.filter((v) => {
    if (!verifierSearch.trim()) return true;
    const term = verifierSearch.toLowerCase();
    return (
      v.name?.toLowerCase().includes(term) ||
      (v.nip && String(v.nip).includes(term))
    );
  });

  const selectedVerifier = verifiers.find((v) => v.id === (fixedVerifierId || selectedVerifierId)) || null;

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!registration?.id) return;

    if (!fixedVerifierId && !selectedVerifierId) {
      setError('Silakan pilih verifikator yang akan ditugaskan.');
      return;
    }

    if (!notaNo.trim() || notaNo.trim().length < 3) {
      setError('Nomor Nota Dinas wajib diisi (minimal 3 karakter).');
      return;
    }

    setSubmitting(true);
    setError(null);
    setNotaError(false);

    try {
      const payload = {
        ...(fixedVerifierId ? {} : { verifier_id: selectedVerifierId }),
        nota_no: notaNo.trim(),
        notes: notes.trim() || undefined,
      };

      const res = await verificationApi.createAssignment(registration.id, payload);
      if (onSuccess) {
        onSuccess(res?.data);
      }
    } catch (err) {
      const message = err.message || 'Gagal menerbitkan Nota Dinas dan membuat penugasan verifikasi.';
      const isDuplicateNota = (err.status === 409 || err.statusCode === 409) && /nomor nota dinas/i.test(message);
      const isAssignmentConflict = (err.status === 409 || err.statusCode === 409) && /pengajuan sudah ditugaskan|sudah memiliki verifikator aktif|status pengajuan telah berubah/i.test(message);
      if (isDuplicateNota) {
        setNotaError(true);
        setError(message);
      } else if (isAssignmentConflict) {
        setError('Pengajuan sudah ditugaskan oleh pengguna lain. Muat ulang antrean untuk melihat penugasan terbaru.');
        if (onConflict) {
          onConflict();
        }
      } else {
        setError(message);
      }
    } finally {
      setSubmitting(false);
    }
  };

  const publisher = registration?.publisher || {};
  const physicalMaster = registration?.physical_master || registration?.physical_master_intake || {};
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
      <div className="bg-white rounded-2xl max-w-xl w-full p-6 space-y-5 shadow-2xl border border-slate-200 max-h-[90vh] overflow-y-auto">
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
                Admin Internal · Penugasan Verifikator
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
          {/* Verifier Selection with Search */}
          {fixedVerifierId ? <p className="rounded-lg bg-emerald-50 p-3 text-emerald-900">Tim inti {registration.core_team_number}: verifikator {selectedVerifier?.name || 'sesuai snapshot pengajuan'}.</p> : <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <label htmlFor="verifier-select" className="block font-bold text-slate-800">
                Pilih Verifikator <span className="text-rose-600">*</span>
              </label>
              {verifiers.length > 3 && (
                <span className="text-[11px] text-slate-500">
                  {filteredVerifiers.length} dari {verifiers.length} petugas
                </span>
              )}
            </div>

            {loading ? (
              <p className="text-slate-500 italic py-2">Memuat daftar verifikator...</p>
            ) : (
              <div className="space-y-1.5">
                {verifiers.length > 3 && (
                  <input
                    type="text"
                    value={verifierSearch}
                    onChange={(e) => setVerifierSearch(e.target.value)}
                    placeholder="Ketik untuk memfilter nama / NIP verifikator..."
                    aria-label="Filter verifikator"
                    className="w-full px-2.5 py-1.5 text-xs rounded-lg border border-slate-200 focus:outline-none focus:ring-1 focus:ring-emerald-600"
                  />
                )}
                <select
                  id="verifier-select"
                  role="combobox"
                  value={selectedVerifierId}
                  onChange={(e) => setSelectedVerifierId(e.target.value)}
                  disabled={submitting}
                  className="w-full px-3 py-2 text-xs rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-emerald-700/20 focus:border-emerald-700 bg-white"
                >
                  <option value="">-- Pilih Petugas Verifikator --</option>
                  {filteredVerifiers.map((v) => {
                    const taskCount = v.active_assignment_count ?? v.active_assignments_count ?? 0;
                    const dueInfo = v.oldest_active_due_at
                      ? ` · tenggat terdekat ${new Date(v.oldest_active_due_at).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' })}`
                      : '';
                    return (
                      <option key={v.id} value={v.id}>
                        {v.name} {v.nip ? `(NIP: ${v.nip})` : ''} · {taskCount} tugas aktif{dueInfo}
                      </option>
                    );
                  })}
                </select>
              </div>
            )}
            <p className="text-[11px] text-slate-500">
              Menampilkan staf aktif dengan kewenangan Verifikator beserta beban kerja aktif saat ini.
            </p>
          </div>}

          {/* Nota Dinas Number */}
          <div className="space-y-1.5">
            <label htmlFor="nota-no-input" className="block font-bold text-slate-800">
              Nomor Nota Dinas Penugasan <span className="text-rose-600">*</span>
            </label>
            <input
              id="nota-no-input"
              type="text"
              value={notaNo}
              onChange={(e) => { setNotaNo(e.target.value); if (notaError) { setNotaError(false); setError(null); } }}
              disabled={submitting}
              aria-invalid={notaError}
              aria-describedby={notaError ? 'nota-no-error' : undefined}
              placeholder="Contoh: ND.01/LPMQ.01/TL.00/09/2026"
              className={`w-full px-3 py-2 text-xs rounded-xl border focus:outline-none focus:ring-2 font-mono ${notaError ? 'border-rose-500 focus:ring-rose-500/20 focus:border-rose-600' : 'border-slate-300 focus:ring-emerald-700/20 focus:border-emerald-700'}`}
            />
            {notaError && <p id="nota-no-error" className="text-[11px] font-semibold text-rose-700">Nomor ini sudah digunakan. Masukkan nomor Nota Dinas yang berbeda.</p>}
            <p className="text-[11px] text-slate-500">
              Masukkan nomor Nota Dinas resmi sebagai dasar penugasan verifikator oleh Admin Internal.
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

          {/* Confirmation Summary (P0-08) */}
          <div className="p-3.5 bg-slate-50 border border-slate-200 rounded-xl space-y-2 text-xs">
            <div className="font-bold text-slate-800 border-b border-slate-200/60 pb-1.5 flex items-center justify-between">
              <span>Ringkasan Konfirmasi Penugasan</span>
              <span className="text-[11px] font-normal text-slate-500">Mulai: saat dikonfirmasi</span>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-4 gap-y-1.5 text-slate-600">
              <div>
                <span className="text-slate-500 text-[11px] block">Registrasi:</span>
                <span className="font-mono font-semibold text-slate-900">{registration?.registration_no || '-'}</span>
              </div>
              <div>
                <span className="text-slate-500 text-[11px] block">Penerbit:</span>
                <span className="font-semibold text-slate-900 truncate block">{publisher.legal_name || '-'}</span>
              </div>
              <div>
                <span className="text-slate-500 text-[11px] block">Verifikator:</span>
                <span className="font-semibold text-slate-900">{selectedVerifier?.name || '(Belum dipilih)'}</span>
              </div>
              <div>
                <span className="text-slate-500 text-[11px] block">Nomor Nota Dinas:</span>
                <span className="font-mono font-semibold text-slate-900">{notaNo.trim() || '(Belum diisi)'}</span>
              </div>
            </div>
            <div className="pt-2 border-t border-slate-200/60 flex items-center justify-between text-[11px] text-emerald-900">
              <span className="flex items-center gap-1.5">
                <Clock className="w-3.5 h-3.5 text-emerald-700 shrink-0" />
                <span>Tanggal: <strong>{todayFormatted}</strong></span>
              </span>
              <span className="flex items-center gap-1.5">
                <UserCheck className="w-3.5 h-3.5 text-emerald-700 shrink-0" />
                <span>Tenggat Target: <strong>2 Hari Kerja (Asia/Jakarta)</strong></span>
              </span>
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
