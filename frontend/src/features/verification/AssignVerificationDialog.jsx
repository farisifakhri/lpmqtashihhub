import React, { useState, useEffect, useContext } from 'react';
import { X, FileText, CheckCircle2, AlertCircle, Clock, ShieldCheck, UserCheck } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { verificationApi } from '@/api/verification.api';
import { AuthContext } from '@/features/auth/AuthContext';

export const AssignVerificationDialog = ({ registration, onClose, onSuccess, onConflict }) => {
  const authContext = useContext(AuthContext);
  const currentUser = authContext?.currentUser;
  const isSuperAdmin = currentUser ? (currentUser.role === 'SUPERADMIN' || currentUser.roles?.includes('SUPERADMIN')) : true;

  const suggestedVerifierId =
    registration?.core_verifier_id ||
    registration?.core_team?.verifier?.id ||
    registration?.core_team_verifier_id ||
    '';
  const [verifiers, setVerifiers] = useState([]);
  const [verifierSearch, setVerifierSearch] = useState('');
  const [selectedVerifierId, setSelectedVerifierId] = useState(suggestedVerifierId);
  const [notaNo, setNotaNo] = useState('');
  const [notes, setNotes] = useState('');
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState(null);
  const [notaError, setNotaError] = useState(false);

  const loadVerifiers = () => {
    setLoading(true);
    setError(null);

    verificationApi
      .listActiveVerifiers({ status: 'ACTIVE' })
      .then((res) => {
        const items = Array.isArray(res) ? res : (res?.data || []);
        setVerifiers(items);
        if (suggestedVerifierId && items.some((item) => item.id === suggestedVerifierId)) {
          setSelectedVerifierId((prev) => prev || suggestedVerifierId);
        }
      })
      .catch((err) => {
        setError(err.message || 'Gagal memuat direktori verifikator.');
      })
      .finally(() => {
        setLoading(false);
      });
  };

  useEffect(() => {
    let isMounted = true;
    setLoading(true);
    setError(null);

    verificationApi
      .listActiveVerifiers({ status: 'ACTIVE' })
      .then((res) => {
        if (!isMounted) return;
        const items = Array.isArray(res) ? res : (res?.data || []);
        setVerifiers(items);
        if (suggestedVerifierId && items.some((item) => item.id === suggestedVerifierId)) {
          setSelectedVerifierId((prev) => prev || suggestedVerifierId);
        }
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

  const selectedVerifier = verifiers.find((v) => v.id === selectedVerifierId) || null;

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!registration?.id) return;

    if (!selectedVerifierId) {
      setError('Silakan pilih verifikator yang akan ditugaskan.');
      return;
    }

    if (!notaNo.trim() || notaNo.trim().length < 3) {
      setError('Nomor Disposisi wajib diisi (minimal 3 karakter).');
      return;
    }

    setSubmitting(true);
    setError(null);
    setNotaError(false);

    try {
      const isOverriding = Boolean(isSuperAdmin && registration?.core_team_number && selectedVerifierId && selectedVerifierId !== suggestedVerifierId);
      const payload = {
        verifier_id: selectedVerifierId,
        nota_no: notaNo.trim(),
        notes: notes.trim() || undefined,
        ...(isOverriding ? { override_core_team: true } : {}),
      };

      const res = await verificationApi.createAssignment(registration.id, payload);
      if (onSuccess) {
        onSuccess(res?.data);
      }
    } catch (err) {
      const message = err.message || 'Gagal menerbitkan Disposisi dan membuat penugasan verifikasi.';
      const isDuplicateNota = (err.status === 409 || err.statusCode === 409) && /nomor (?:nota dinas|disposisi)/i.test(message);
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
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-ink/60 backdrop-blur-xs animate-fadeIn"
    >
      <div className="bg-white rounded-2xl max-w-xl w-full p-6 space-y-5 shadow-2xl border border-line max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-line pb-3">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-brand-100 text-brand-800">
              <ShieldCheck className="w-5 h-5" />
            </div>
            <div>
              <h3 id="assign-verifier-title" className="text-base font-bold text-ink">
                Terbitkan Disposisi & Tugaskan Verifikator
              </h3>
              <p className="text-xs text-ink-muted">
                Helper Admin · Penugasan Verifikator
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            disabled={submitting}
            aria-label="Tutup modal penugasan"
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

        {/* Manuscript Context Summary */}
        <div className="p-3.5 bg-canvas border border-line rounded-xl text-xs space-y-2">
          <div className="flex items-center justify-between border-b border-line/60 pb-2">
            <span className="font-mono font-bold text-ink bg-white px-2 py-0.5 rounded border border-line">
              {registration?.registration_no || '-'}
            </span>
            <span className="text-ink-muted font-medium">
              Pemohon: <strong className="text-ink">{publisher.legal_name || '-'}</strong>
            </span>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-ink-muted">
            <div>
              <span className="text-ink-muted block text-xs">Judul Naskah:</span>
              <span className="font-semibold text-ink">{registration?.title || '-'}</span>
            </div>
            <div>
              <span className="text-ink-muted block text-xs">Master Fisik Loket:</span>
              <span className="font-mono text-brand-800 font-semibold">
                {physicalMaster.receipt_no || 'Diterima'} ({physicalMaster.volume_count ?? 30} jilid)
              </span>
            </div>
          </div>
        </div>

        {/* Form Fields */}
        <form onSubmit={handleSubmit} className="space-y-4 text-xs">
          {/* Core team recommendation notice if available */}
          {registration?.core_team_number && (
            <div className="rounded-xl bg-brand-50 border border-brand-100 p-3 text-brand-900 flex items-start gap-2.5">
              <CheckCircle2 className="w-4 h-4 text-brand-700 shrink-0 mt-0.5" />
              <div className="space-y-1 w-full">
                <div className="flex items-center justify-between gap-2">
                  <p className="font-bold text-xs">Rekomendasi Tim Inti {registration.core_team_number}</p>
                  {isSuperAdmin && (
                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-civicGold-100 text-civicGold-700 border border-civicGold-700/30">
                      <ShieldCheck className="w-3 h-3 text-civicGold-700" />
                      Hak Override Super Admin Aktif
                    </span>
                  )}
                </div>
                <p className="text-[11px] text-brand-800">
                  {selectedVerifier?.name ? `Petugas terpilih otomatis: ${selectedVerifier.name}. ` : ''}
                  {isSuperAdmin
                    ? 'Sebagai Super Admin, Anda berwenang mengganti atau memilih verifikator lain dari daftar bila petugas Tim Inti berhalangan.'
                    : 'Sesuai regulasi rotasi Tim Inti LPMQ, verifikator telah ditetapkan secara otomatis untuk naskah ini.'}
                </p>
              </div>
            </div>
          )}

          {/* Super Admin Override Alert */}
          {isSuperAdmin && registration?.core_team_number && selectedVerifierId && selectedVerifierId !== suggestedVerifierId && (
            <div className="p-3 rounded-xl bg-civic-warningSoft border border-civic-warningLine text-civic-warning text-xs flex items-start gap-2">
              <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
              <div>
                <p className="font-semibold">Dispensasi / Intervensi Super Admin</p>
                <p className="text-[11px] mt-0.5 text-civic-warning">
                  Verifikator untuk naskah Tim Inti {registration.core_team_number} akan dialihkan ke <strong>{selectedVerifier?.name || 'petugas terpilih'}</strong>.
                </p>
              </div>
            </div>
          )}

          {/* Verifier Selection with Search */}
          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <label htmlFor="verifier-select" className="block font-bold text-ink">
                Pilih Verifikator <span className="text-civic-danger">*</span>
              </label>
              {verifiers.length > 3 && (
                <span className="text-xs text-ink-muted">
                  {filteredVerifiers.length} dari {verifiers.length} petugas
                </span>
              )}
            </div>

            {loading ? (
              <p className="text-ink-muted italic py-2">Memuat daftar verifikator...</p>
            ) : verifiers.length === 0 ? (
              <div className="p-3 bg-civic-warningSoft border border-civic-warningLine rounded-xl text-xs text-civic-warning flex items-center justify-between">
                <span>Belum ada data verifikator aktif ditemukan di sistem.</span>
                <button
                  type="button"
                  onClick={loadVerifiers}
                  className="font-bold underline ml-2 cursor-pointer"
                >
                  Muat Ulang
                </button>
              </div>
            ) : (
              <div className="space-y-1.5">
                {verifiers.length > 3 && (
                  <input
                    type="text"
                    value={verifierSearch}
                    onChange={(e) => setVerifierSearch(e.target.value)}
                    placeholder="Ketik untuk memfilter nama / NIP verifikator..."
                    aria-label="Filter verifikator"
                    className="w-full px-2.5 py-1.5 text-xs rounded-lg border border-line focus:outline-none focus:ring-1 focus:ring-brand-700"
                  />
                )}
                <select
                  id="verifier-select"
                  role="combobox"
                  value={selectedVerifierId}
                  onChange={(e) => setSelectedVerifierId(e.target.value)}
                  disabled={submitting || (Boolean(registration?.core_team_number) && !isSuperAdmin)}
                  className="w-full px-3 py-2 text-xs rounded-xl border border-line-strong focus:outline-none focus:ring-2 focus:ring-brand-700/20 focus:border-brand-700 bg-white disabled:bg-surface disabled:text-ink-muted"
                >
                  <option value="">-- Pilih Petugas Verifikator --</option>
                  {filteredVerifiers.map((v) => {
                    const taskCount = v.active_assignment_count ?? v.active_assignments_count ?? 0;
                    const dueInfo = v.oldest_active_due_at
                      ? ` · tenggat terdekat ${new Date(v.oldest_active_due_at).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' })}`
                      : '';
                    const teamPrefix = v.core_team_number ? `[Tim Inti ${v.core_team_number}] ` : '';
                    return (
                      <option key={v.id} value={v.id}>
                        {teamPrefix}{v.name} {v.nip ? `(NIP: ${v.nip})` : ''} · {taskCount} tugas aktif{dueInfo}
                      </option>
                    );
                  })}
                </select>
              </div>
            )}
            <p className="text-xs text-ink-muted">
              {Boolean(registration?.core_team_number) && !isSuperAdmin
                ? 'Pilihan dikunci sesuai penetapan rotasi Tim Inti. Hubungi Super Admin jika diperlukan dispensasi pengalihan petugas.'
                : 'Menampilkan staf aktif dengan kewenangan Verifikator beserta beban kerja aktif saat ini.'}
            </p>
          </div>

          {/* Nota Dinas Number */}
          <div className="space-y-1.5">
            <label htmlFor="nota-no-input" className="block font-bold text-ink">
              Nomor Disposisi Penugasan <span className="text-civic-danger">*</span>
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
              className={`w-full px-3 py-2 text-xs rounded-xl border focus:outline-none focus:ring-2 font-mono ${notaError ? 'border-civic-danger focus:ring-civic-danger/20 focus:border-civic-danger' : 'border-line-strong focus:ring-brand-700/20 focus:border-brand-700'}`}
            />
            {notaError && <p id="nota-no-error" className="text-xs font-semibold text-civic-danger">Nomor ini sudah digunakan. Masukkan nomor Disposisi yang berbeda.</p>}
            <p className="text-xs text-ink-muted">
              Masukkan nomor Disposisi resmi sebagai dasar penugasan verifikator oleh Helper Admin.
            </p>
          </div>

          {/* Assignment Notes */}
          <div className="space-y-1.5">
            <label htmlFor="notes-input" className="block font-bold text-ink">
              Catatan Khusus Penugasan (Opsional)
            </label>
            <textarea
              id="notes-input"
              rows={2}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              disabled={submitting}
              placeholder="Tambahkan arahan atau atensi khusus untuk verifikator..."
              className="w-full p-2.5 text-xs rounded-xl border border-line-strong focus:outline-none focus:ring-2 focus:ring-brand-700/20 focus:border-brand-700"
            />
          </div>

          {/* Confirmation Summary (P0-08) */}
          <div className="p-3.5 bg-canvas border border-line rounded-xl space-y-2 text-xs">
            <div className="font-bold text-ink border-b border-line/60 pb-1.5 flex items-center justify-between">
              <span>Ringkasan Konfirmasi Penugasan</span>
              <span className="text-xs font-normal text-ink-muted">Mulai: saat dikonfirmasi</span>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-4 gap-y-1.5 text-ink-muted">
              <div>
                <span className="text-ink-muted text-xs block">Registrasi:</span>
                <span className="font-mono font-semibold text-ink">{registration?.registration_no || '-'}</span>
              </div>
              <div>
                <span className="text-ink-muted text-xs block">Penerbit:</span>
                <span className="font-semibold text-ink truncate block">{publisher.legal_name || '-'}</span>
              </div>
              <div>
                <span className="text-ink-muted text-xs block">Verifikator:</span>
                <span className="font-semibold text-ink">{selectedVerifier?.name || '(Belum dipilih)'}</span>
              </div>
              <div>
                <span className="text-ink-muted text-xs block">Nomor Disposisi:</span>
                <span className="font-mono font-semibold text-ink">{notaNo.trim() || '(Belum diisi)'}</span>
              </div>
            </div>
            <div className="pt-2 border-t border-line/60 flex items-center justify-between text-xs text-brand-900">
              <span className="flex items-center gap-1.5">
                <Clock className="w-3.5 h-3.5 text-brand-700 shrink-0" />
                <span>Tanggal: <strong>{todayFormatted}</strong></span>
              </span>
              <span className="flex items-center gap-1.5">
                <UserCheck className="w-3.5 h-3.5 text-brand-700 shrink-0" />
                <span>Tenggat Target: <strong>2 Hari Kerja (Asia/Jakarta)</strong></span>
              </span>
            </div>
          </div>

          {/* Footer Actions */}
          <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-line">
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
              {submitting ? 'Menerbitkan...' : 'Terbitkan Disposisi & Tugaskan'}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default AssignVerificationDialog;
