import React from 'react';
import { X, ChevronRight } from 'lucide-react';

// Pop-up "Mulai Penugasan": distributor memilih jenis penugasan sebelum masuk ke penetapan penugasan.
// Ketiganya bisa dipilih dan tampil setara, tanpa penanda saran.
export function AssignmentStageDialog({ registration, onClose, onChoose }) {
  const options = [
    { key: 'INITIAL', label: '1. Penugasan Awal', desc: 'Sidang pertama atas naskah yang baru diterima.' },
    {
      key: 'REVISION',
      label: '2. Penugasan Perbaikan',
      desc: 'Sidang atas naskah perbaikan yang dikirim ulang penerbit. Bisa berulang.',
    },
    { key: 'DUMMY', label: '3. Penugasan Dumi', desc: 'Pemeriksaan akhir naskah yang sudah final sebelum cetak.' },
  ];

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
          {options.map(option => (
            <button
              key={option.key}
              type="button"
              onClick={() => onChoose(option.key)}
              className="flex w-full items-center justify-between gap-3 rounded-xl border border-line bg-white px-4 py-3 text-left hover:border-line-strong hover:bg-canvas cursor-pointer"
            >
              <span>
                <span className="block text-sm font-bold text-ink">{option.label}</span>
                <span className="block text-xs text-ink-muted mt-0.5">{option.desc}</span>
              </span>
              <ChevronRight className="w-4 h-4 shrink-0 text-ink-muted" />
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
