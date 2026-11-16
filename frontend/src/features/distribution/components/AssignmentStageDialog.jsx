import React, { useEffect, useState } from 'react';
import { X, ChevronRight, Lock } from 'lucide-react';
import { clsx } from 'clsx';
import { registrationApi } from '@/api/registration.api';

const OPTIONS = [
  { key: 'INITIAL', label: '1. Penugasan Awal', desc: 'Sidang pertama atas naskah yang baru diterima.' },
  { key: 'REVISION', label: '2. Penugasan Perbaikan', desc: 'Sidang atas naskah perbaikan yang dikirim ulang penerbit. Bisa berulang.' },
  { key: 'DUMMY', label: '3. Penugasan Dumi', desc: 'Pemeriksaan akhir naskah yang sudah final sebelum cetak.' },
];

// Pop-up "Mulai Penugasan": distributor memilih jenis penugasan sebelum masuk ke penetapan penugasan.
// Pilihan yang belum sesuai tahap (mis. Perbaikan sebelum penerbit mengirim naskah perbaikan) dikunci;
// aturannya ditentukan server, yang juga menolak pilihan terkunci.
export function AssignmentStageDialog({ registration, onClose, onChoose }) {
  const [stages, setStages] = useState(null);
  const [error, setError] = useState('');

  useEffect(() => {
    let active = true;
    registrationApi.getAssignmentStages(registration.id)
      .then(res => { if (active) setStages(res.data || []); })
      .catch(err => { if (active) setError(err.message || 'Gagal memuat jenis penugasan.'); });
    return () => { active = false; };
  }, [registration.id]);

  return (
    <div
      className="fixed inset-0 z-50 bg-ink/60 backdrop-blur-xs p-4 flex items-center justify-center"
      role="dialog"
      aria-modal="true"
      aria-labelledby="assignment-stage-title"
    >
      <div className="w-full max-w-md bg-white rounded-2xl shadow-2xl border border-line overflow-hidden">
        <div className="p-5 border-b border-line flex items-start justify-between gap-4">
          <div className="min-w-0">
            <h3 id="assignment-stage-title" className="text-base font-bold text-ink">Mulai Penugasan</h3>
            <p className="text-xs text-ink-muted mt-0.5 truncate">
              <span className="font-mono font-bold text-brand-800">{registration.registration_no}</span> · {registration.title}
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Tutup pilihan penugasan"
            className="p-1.5 rounded-lg text-ink-muted hover:text-ink hover:bg-surface-strong/60 cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>
        <div className="p-5 space-y-2">
          <p className="text-xs font-bold uppercase tracking-wider text-ink">Pilih Jenis Penugasan</p>
          {error && <p role="alert" className="rounded-lg bg-civic-dangerSoft p-3 text-xs text-civic-danger">{error}</p>}
          {!stages && !error && <p role="status" className="py-4 text-center text-xs text-ink-muted">Memeriksa tahap penugasan...</p>}
          {stages && OPTIONS.map(option => {
            const state = stages.find(item => item.key === option.key);
            const allowed = Boolean(state?.allowed);
            return (
              <button
                key={option.key}
                type="button"
                disabled={!allowed}
                onClick={() => onChoose(option.key)}
                className={clsx(
                  'flex w-full items-center justify-between gap-3 rounded-xl border px-4 py-3 text-left',
                  allowed ? 'border-line bg-white hover:border-line-strong hover:bg-canvas cursor-pointer' : 'border-line bg-surface-subtle cursor-not-allowed'
                )}
              >
                <span>
                  <span className={clsx('block text-sm font-bold', allowed ? 'text-ink' : 'text-ink-muted')}>{option.label}</span>
                  <span className="block text-xs text-ink-muted mt-0.5">{option.desc}</span>
                </span>
                {allowed ? <ChevronRight className="w-4 h-4 shrink-0 text-ink-muted" /> : <Lock className="w-4 h-4 shrink-0 text-ink-muted" aria-hidden="true" />}
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}
