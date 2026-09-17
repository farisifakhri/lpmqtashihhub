import React, { useState, useEffect } from 'react';
import {
  X,
  FileText,
  CheckCircle2,
  AlertCircle,
  Clock,
  ShieldCheck,
  UserCheck,
  Calendar,
  Building2,
  Check,
  Send,
} from 'lucide-react';
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
  const selectedVerifier = verifiers.find((v) => v.id === selectedVerifierId);

  // Kalkulasi estimasi SLA 2 hari kerja kedepan
  const calculateEstimatedDue = () => {
    const d = new Date();
    let daysAdded = 0;
    while (daysAdded < 2) {
      d.setDate(d.getDate() + 1);
      const day = d.getDay();
      if (day !== 0 && day !== 6) daysAdded++;
    }
    return d.toLocaleDateString('id-ID', {
      weekday: 'long',
      day: 'numeric',
      month: 'long',
      year: 'numeric',
    });
  };

  const estimatedDueText = calculateEstimatedDue();

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="assign-verifier-title"
      className="fixed inset-0 z-50 flex justify-end bg-ink/50 backdrop-blur-xs animate-fadeIn"
    >
      <div className="bg-surface w-full max-w-2xl h-full shadow-2xl border-l border-line flex flex-col justify-between overflow-y-auto animate-slideLeft">
        {/* Header Drawer */}
        <div className="p-5 sm:p-6 border-b border-line bg-surface sticky top-0 z-10 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-brand-50 text-brand-800 border border-brand-100">
              <ShieldCheck className="w-5 h-5" />
            </div>
            <div>
              <h3 id="assign-verifier-title" className="text-base font-bold text-ink">
                Terbitkan Nota Dinas & Tugaskan Verifikator
              </h3>
              <p className="text-xs text-ink-muted mt-0.5">
                Kewenangan Kepala LPMQ untuk menugaskan pemeriksaan berkas dan rasm mushaf.
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-lg text-ink-muted hover:text-ink hover:bg-surface-subtle"
            aria-label="Tutup penugasan"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-5 sm:p-6 space-y-5 flex-1">
          {error && (
            <div className="p-3 rounded-lg bg-rose-50 border border-rose-200 text-rose-700 text-xs flex items-start gap-2">
              <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
              <span>{error}</span>
            </div>
          )}

          {/* 1. Ringkasan Kesiapan Naskah */}
          <div className="rounded-xl border border-line bg-surface-subtle p-4 space-y-2.5 text-xs">
            <div className="flex items-center justify-between">
              <span className="font-extrabold text-brand-800 uppercase tracking-wider">
                Kesiapan Pengajuan
              </span>
              <span className="font-mono font-bold text-ink">{registration?.registration_no}</span>
            </div>
            <div className="space-y-1">
              <h4 className="font-bold text-ink text-sm">{registration?.title}</h4>
              <p className="text-ink-muted">{publisher?.legal_name || 'Penerbit Terdaftar'}</p>
            </div>

            <div className="grid grid-cols-2 gap-2 pt-2 border-t border-line/60">
              <div>
                <span className="text-ink-muted">Master Fisik:</span>
                <p className="font-semibold text-emerald-800 flex items-center gap-1 mt-0.5">
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  <span>Diterima Loket ({physicalMaster.receipt_no || 'Tercatat'})</span>
                </p>
              </div>
              <div>
                <span className="text-ink-muted">Format & Volume:</span>
                <p className="font-semibold text-ink mt-0.5">
                  Format {physicalMaster.format || 'A4'} • {physicalMaster.volume_count || 30} Jilid
                </p>
              </div>
            </div>
          </div>

          {/* 2. SLA Dua Hari Kerja */}
          <div className="p-3.5 rounded-xl border border-line bg-brand-50/60 text-xs text-brand-950 flex items-start gap-2.5">
            <Clock className="w-4 h-4 text-brand-700 shrink-0 mt-0.5" />
            <div>
              <span className="font-bold">Target SLA Pemeriksaan: </span>
              <span>2 (dua) hari kerja sejak Nota Dinas diterbitkan.</span>
              <p className="text-[11px] text-brand-800 font-semibold mt-1">
                Estimasi Batas Waktu: {estimatedDueText}
              </p>
            </div>
          </div>

          {/* 3. Pemilihan Verifikator dengan Kapasitas Beban */}
          <div className="space-y-2">
            <label htmlFor="verifier-select" className="block text-xs font-bold text-ink">
              Pilih Verifikator Penanggung Jawab <span className="text-rose-600">*</span>
            </label>
            {loading ? (
              <div className="p-3 text-xs text-ink-muted bg-surface-subtle rounded-lg animate-pulse">
                Memuat daftar verifikator...
              </div>
            ) : (
              <div className="space-y-3">
                <select
                  id="verifier-select"
                  value={selectedVerifierId}
                  onChange={(e) => setSelectedVerifierId(e.target.value)}
                  className="w-full px-3.5 py-2.5 text-xs bg-surface border border-line rounded-lg text-ink focus:ring-2 focus:ring-emerald-700 outline-none cursor-pointer"
                >
                  <option value="">-- Pilih Verifikator yang Ditugaskan --</option>
                  {verifiers.map((v) => (
                    <option key={v.id} value={v.id}>
                      {v.name} ({v.active_assignments_count || 0} Tugas Aktif)
                    </option>
                  ))}
                </select>

                {selectedVerifier && (
                  <div className="p-3 rounded-lg border border-brand-200 bg-brand-50/60 text-xs flex items-center justify-between">
                    <div>
                      <p className="font-bold text-brand-950">Petugas Terpilih: {selectedVerifier.name}</p>
                      <p className="text-[11px] text-brand-800">NIP: {selectedVerifier.nip || '-'}</p>
                    </div>
                    <span className="text-[11px] px-2 py-0.5 rounded font-semibold bg-surface border border-line text-ink">
                      {selectedVerifier.active_assignments_count || 0} Tugas Aktif Saat Ini
                    </span>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* 4. Nomor Nota Dinas & Catatan */}
          <div className="space-y-3">
            <div>
              <label htmlFor="nota-input" className="block text-xs font-bold text-ink mb-1">
                Nomor Nota Dinas Penugasan <span className="text-rose-600">*</span>
              </label>
              <input
                id="nota-input"
                type="text"
                value={notaNo}
                onChange={(e) => setNotaNo(e.target.value)}
                placeholder="Contoh: ND.01/LPMQ.01/HM.01/09/2026"
                className="w-full px-3.5 py-2.5 text-xs font-mono bg-surface border border-line rounded-lg text-ink focus:ring-2 focus:ring-emerald-700 outline-none"
              />
            </div>

            <div>
              <label htmlFor="notes-input" className="block text-xs font-bold text-ink mb-1">
                Instruksi Khusus / Catatan (Opsional)
              </label>
              <textarea
                id="notes-input"
                rows={2}
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Tambahkan arahan atau atensi khusus untuk verifikator..."
                className="w-full px-3.5 py-2 text-xs bg-surface border border-line rounded-lg text-ink focus:ring-2 focus:ring-emerald-700 outline-none"
              />
            </div>
          </div>

          {/* 5. Live Preview Nota Dinas */}
          {selectedVerifier && notaNo && (
            <div className="rounded-xl border border-line bg-surface p-4 space-y-2 text-xs">
              <div className="flex items-center gap-1.5 text-brand-800 font-bold uppercase tracking-wider text-[11px]">
                <FileText className="w-3.5 h-3.5" />
                <span>Pratinjau Nota Dinas Penugasan</span>
              </div>
              <div className="font-mono text-[11px] bg-surface-subtle p-3 rounded-lg border border-line/60 space-y-1 text-ink">
                <p><strong>Nomor:</strong> {notaNo}</p>
                <p><strong>Perihal:</strong> Penugasan Verifikasi Naskah Mushaf</p>
                <p><strong>Ditugaskan Kepada:</strong> {selectedVerifier.name} (NIP {selectedVerifier.nip || '-'})</p>
                <p><strong>Batas Waktu:</strong> 2 Hari Kerja ({estimatedDueText})</p>
              </div>
            </div>
          )}

          {/* Action Footer */}
          <div className="pt-4 border-t border-line flex items-center justify-end gap-2.5">
            <Button
              type="button"
              variant="outline"
              size="md"
              onClick={onClose}
              disabled={submitting}
              className="text-xs"
            >
              Batalkan
            </Button>

            <Button
              type="submit"
              variant="primary"
              size="md"
              disabled={submitting || loading}
              className="text-xs"
            >
              {submitting ? 'Memproses Penugasan...' : 'Terbitkan Nota Dinas & Tugaskan'}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default AssignVerificationDialog;
