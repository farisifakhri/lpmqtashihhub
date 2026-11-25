import React, { useState } from 'react';
import {
  Award, BadgeCheck, Check, CheckCircle2, ClipboardCheck, FileSignature, Gavel, Loader2, Minus, Stamp, X, XCircle,
} from 'lucide-react';
import { parafApi } from '@/api/paraf.api';
import { invalidateQueueCounts } from '@/api/queue.api';
import { useAuth } from '@/features/auth/AuthContext';
import { Modal } from '@/components/ui/Modal';

// Dipakai bersama Antrean Paraf dan tab "Menunggu Persetujuan" Verifikasi: kotak pilih per baris,
// card "checkout" kanan bawah, dan dialog paraf massal.

// pill = kotak status; chip/chipOn = tombol segmentasi (pola sama dengan dashboard).
export const PARAF_TYPES = {
  VERIFICATION_RESULT: {
    label: 'Hasil Verifikasi', status: 'Menunggu paraf hasil verifikasi', icon: ClipboardCheck,
    pill: 'bg-civic-infoSoft text-civic-info border-civic-infoLine',
    chip: 'bg-civic-infoSoft text-civic-info border border-civic-infoLine/60', chipOn: 'bg-civic-info text-white shadow-xs',
  },
  DISTRIBUTOR_REVIEW: {
    label: 'Keputusan Sidang', status: 'Menunggu paraf keputusan sidang', icon: Gavel,
    pill: 'bg-civic-warningSoft text-civic-warning border-civic-warningLine',
    chip: 'bg-civic-warningSoft text-civic-warning border border-civic-warningLine/60', chipOn: 'bg-civic-warning text-white shadow-xs',
  },
  STT: {
    label: 'Draf STT', status: 'Menunggu paraf draf STT', icon: Award,
    pill: 'bg-brand-50 text-brand-800 border-brand-100',
    chip: 'bg-brand-50 text-brand-900 border border-brand-100/60', chipOn: 'bg-brand-700 text-white shadow-xs',
  },
  MASTER_LETTER: {
    label: 'Surat Master', status: 'Menunggu paraf surat master', icon: FileSignature,
    pill: 'bg-surface-subtle text-ink border-line-strong',
    chip: 'bg-surface-subtle text-ink-muted border border-line', chipOn: 'bg-ink text-canvas shadow-xs',
  },
};

/** Kunci unik item paraf ({ type, action_id }). */
export const parafKey = (item) => `${item.type}:${item.action_id}`;

/**
 * Kotak pilih bergaya tombol di samping "Tinjau Detail". Nonaktif bila dokumen bukan giliran paraf Anda.
 * `partial` = sebagian terpilih (dipakai kotak "pilih semua").
 */
export const ParafSelectBox = ({ checked, onChange, label, disabled = false, disabledReason, partial = false, size = 'md' }) => (
  <label title={disabled ? disabledReason : undefined}
    className={`flex shrink-0 items-center justify-center border-2 transition-all has-[:focus-visible]:ring-4 has-[:focus-visible]:ring-brand-fill/25 ${
      size === 'sm' ? 'h-6 w-6 rounded-lg' : 'h-9 w-9 rounded-xl'} ${
      disabled ? 'cursor-not-allowed border-dashed border-line bg-surface-subtle text-transparent opacity-60'
        : checked || partial ? 'cursor-pointer border-brand-fill bg-brand-fill text-white shadow-sm'
          : 'cursor-pointer border-line-strong bg-surface text-transparent hover:border-brand-fill hover:text-brand-fill/40'}`}>
    <input type="checkbox" checked={checked} onChange={onChange} disabled={disabled} className="sr-only" aria-label={label}
      ref={(el) => { if (el) el.indeterminate = partial && !checked; }} />
    {partial && !checked
      ? <Minus className={size === 'sm' ? 'h-3 w-3' : 'h-4 w-4'} strokeWidth={3} aria-hidden="true" />
      : <Check className={size === 'sm' ? 'h-3 w-3' : 'h-4 w-4'} strokeWidth={3} aria-hidden="true" />}
  </label>
);

/**
 * Card checkout kanan bawah + dialog paraf massal. Paraf dijalankan berurutan lewat endpoint asal tiap alur
 * sehingga galat satu dokumen tidak menggagalkan yang lain.
 * @param {object[]} props.selectedItems Item terpilih ({ type, action_id, reference, title })
 * @param {() => void} props.onClear Kosongkan pilihan
 * @param {(failedKeys: string[]) => void} props.onFinished Dipanggil setelah selesai; yang gagal tetap dipilih
 */
// Teks per mode: Pemaraf membubuhkan paraf, Kepala LPMQ mengesahkan.
const MODE_TEXT = {
  paraf: { ready: 'Siap diparaf', cta: 'Paraf Semua yang Dipilih', title: 'Paraf', confirm: 'Bubuhkan Paraf', running: 'Memaraf…', done: 'Paraf tercatat.', result: 'Hasil Paraf', okWord: 'diparaf',
    note: (name) => `Paraf dibubuhkan atas nama ${name} dan tercatat di jejak audit. Pastikan setiap dokumen sudah Anda telaah.` },
  approve: { ready: 'Siap disahkan', cta: 'Sahkan Semua yang Dipilih', title: 'Sahkan', confirm: 'Sahkan Sekarang', running: 'Mengesahkan…', done: 'Disahkan; nomor surat & billing terbit otomatis.', result: 'Hasil Pengesahan', okWord: 'disahkan',
    note: (name) => `Dokumen disahkan atas nama ${name}. Nomor surat resmi dan kode billing diterbitkan otomatis; tindakan tercatat di jejak audit.` },
};

export const ParafCheckout = ({ selectedItems, onClear, onFinished, mode = 'paraf' }) => {
  const { currentUser } = useAuth();
  const text = MODE_TEXT[mode] || MODE_TEXT.paraf;
  const [open, setOpen] = useState(false);
  // Salinan dokumen yang diparaf; tetap utuh walau antrean dimuat ulang setelah paraf.
  const [batch, setBatch] = useState([]);
  // key -> 'pending' | 'done' | pesan galat
  const [results, setResults] = useState({});
  const [running, setRunning] = useState(false);

  const start = () => {
    setBatch(selectedItems);
    setResults({});
    setOpen(true);
  };

  const run = async () => {
    setRunning(true);
    const next = {};
    for (const item of batch) {
      const key = parafKey(item);
      setResults((r) => ({ ...r, [key]: 'pending' }));
      try {
        await parafApi.paraf(item);
        next[key] = 'done';
      } catch (err) {
        next[key] = err?.message || 'Gagal memaraf.';
      }
      setResults((r) => ({ ...r, [key]: next[key] }));
    }
    setRunning(false);
    invalidateQueueCounts();
    onFinished?.(Object.keys(next).filter((key) => next[key] !== 'done'));
  };

  const doneCount = Object.values(results).filter((r) => r === 'done').length;
  const failedCount = Object.values(results).filter((r) => r !== 'done' && r !== 'pending').length;
  const finished = !running && Object.keys(results).length > 0;
  const summary = Object.entries(PARAF_TYPES)
    .map(([type, t]) => { const n = selectedItems.filter((i) => i.type === type).length; return n ? `${n} ${t.label}` : null; })
    .filter(Boolean).join(' · ');

  return (
    <>
      {selectedItems.length > 0 && !open && (
        <aside aria-label="Paraf dokumen terpilih"
          className="sticky bottom-6 z-30 ml-auto w-full max-w-sm overflow-hidden rounded-2xl border border-brand-fill/25 bg-surface-elevated shadow-2xl ring-1 ring-black/5">
          <div className="flex items-center gap-3 bg-gradient-to-r from-brand-fill to-brand-fill-hover px-4 py-3 text-white">
            <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-white/15 text-base font-black ring-1 ring-white/25">{selectedItems.length}</span>
            <div className="min-w-0">
              <p className="text-sm font-bold">{text.ready}</p>
              <p className="text-[11px] text-white/75">{summary}</p>
            </div>
            <button type="button" onClick={onClear} aria-label="Kosongkan pilihan"
              className="ml-auto rounded-lg p-1.5 text-white/80 hover:bg-white/10 hover:text-white">
              <X className="h-4 w-4" aria-hidden="true" />
            </button>
          </div>
          <ul className="max-h-40 space-y-1.5 overflow-y-auto px-4 py-3">
            {selectedItems.slice(0, 4).map((item) => (
              <li key={parafKey(item)} className="flex items-center gap-2 text-xs">
                <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-brand-fill" aria-hidden="true" />
                <span className="font-mono font-semibold text-ink">{item.reference}</span>
                <span className="truncate text-ink-muted">{item.title}</span>
              </li>
            ))}
            {selectedItems.length > 4 && <li className="pl-3.5 text-xs font-semibold text-ink-muted">+{selectedItems.length - 4} dokumen lainnya</li>}
          </ul>
          <div className="border-t border-line p-3">
            <button type="button" onClick={start}
              className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-brand-fill px-4 py-3 text-sm font-bold text-white shadow-sm transition hover:bg-brand-fill-hover focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-fill motion-safe:active:scale-[0.98]">
              <Stamp className="h-4 w-4" aria-hidden="true" /> {text.cta} ({selectedItems.length})
            </button>
          </div>
        </aside>
      )}

      <Modal isOpen={open} onClose={() => !running && setOpen(false)} size="lg"
        title={finished ? text.result : `${text.title} ${batch.length} Dokumen`}
        description={finished
          ? `${doneCount} berhasil ${text.okWord}${failedCount ? `, ${failedCount} gagal` : ''}.`
          : text.note(currentUser?.name || 'Anda')}
        closeOnOverlayClick={!running} closeOnEscape={!running} showCloseButton={!running}>
        <ul className="max-h-80 space-y-2 overflow-y-auto">
          {batch.map((item) => {
            const key = parafKey(item);
            const result = results[key];
            return (
              <li key={key} className="flex items-start gap-3 rounded-xl border border-line p-3">
                <span className="mt-0.5" aria-hidden="true">
                  {result === 'pending' ? <Loader2 className="h-4 w-4 text-brand-fill motion-safe:animate-spin" />
                    : result === 'done' ? <CheckCircle2 className="h-4 w-4 text-civic-success" />
                      : result ? <XCircle className="h-4 w-4 text-civic-danger" />
                        : <BadgeCheck className="h-4 w-4 text-ink-muted" />}
                </span>
                <div className="min-w-0 flex-1 text-sm">
                  <p className="font-semibold text-ink">{item.reference} <span className="font-normal text-ink-muted">· {PARAF_TYPES[item.type]?.label}</span></p>
                  {item.title && <p className="truncate text-xs text-ink-muted">{item.title}</p>}
                  {result && result !== 'pending' && result !== 'done' && <p className="mt-1 text-xs font-medium text-civic-danger">{result}</p>}
                  {result === 'done' && <p className="mt-1 text-xs text-civic-success">{text.done}</p>}
                </div>
              </li>
            );
          })}
        </ul>
        <div className="mt-5 flex justify-end gap-2 border-t border-line pt-4">
          {finished ? (
            <button type="button" onClick={() => setOpen(false)}
              className="inline-flex items-center gap-2 rounded-xl bg-brand-fill px-4 py-2.5 text-sm font-bold text-white hover:bg-brand-fill-hover">
              <Check className="h-4 w-4" aria-hidden="true" /> Selesai
            </button>
          ) : (
            <>
              <button type="button" onClick={() => setOpen(false)} disabled={running}
                className="inline-flex items-center gap-1 rounded-xl border border-line px-4 py-2.5 text-sm font-semibold text-ink hover:bg-surface-subtle disabled:opacity-50">
                <X className="h-4 w-4" aria-hidden="true" /> Batal
              </button>
              <button type="button" onClick={run} disabled={running || !batch.length}
                className="inline-flex items-center gap-2 rounded-xl bg-brand-fill px-4 py-2.5 text-sm font-bold text-white hover:bg-brand-fill-hover disabled:opacity-60">
                {running ? <Loader2 className="h-4 w-4 motion-safe:animate-spin" aria-hidden="true" /> : <Stamp className="h-4 w-4" aria-hidden="true" />}
                {running ? text.running : `${text.confirm} (${batch.length})`}
              </button>
            </>
          )}
        </div>
      </Modal>
    </>
  );
};
