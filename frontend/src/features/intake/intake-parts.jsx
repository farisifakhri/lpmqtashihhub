import React, { useState } from 'react';
import { clsx } from 'clsx';
import { Check, Copy, Truck, Store, CalendarDays, Hash } from 'lucide-react';
import { COURIER_LABELS } from '@/lib/glossary';

export const isLoket = (courier) => !courier || courier === 'LOKET_LPMQ';
export const courierLabel = (courier) => COURIER_LABELS[courier] || courier || 'Belum dipilih';

export const formatDate = (value, month = 'long') =>
  value ? new Date(value).toLocaleDateString('id-ID', { day: 'numeric', month, year: 'numeric' }) : '-';

/** Tombol salin kecil dengan umpan balik "tersalin" yang terbaca screen reader. */
export const CopyButton = ({ text, label }) => {
  const [copied, setCopied] = useState(false);
  if (!text) return null;
  return (
    <button
      type="button"
      onClick={() => {
        navigator.clipboard?.writeText(text);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
      }}
      aria-label={copied ? `${label} tersalin` : `Salin ${label}`}
      title={`Salin ${label}`}
      className="inline-flex h-7 w-7 items-center justify-center rounded-md text-ink-muted hover:bg-surface-subtle hover:text-brand-800 focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-700"
    >
      {copied ? <Check className="h-3.5 w-3.5 text-civic-success" /> : <Copy className="h-3.5 w-3.5" />}
    </button>
  );
};

/**
 * Progres alur intake: Diajukan → Dikirim Penerbit → Diterima LPMQ → Diteruskan.
 * Langkah aktif ditandai aria-current agar terbaca sebagai posisi saat ini.
 */
export const IntakeProgress = ({ steps }) => {
  const current = steps.findIndex((step) => !step.done);
  return (
    <ol className="grid grid-cols-2 gap-3 sm:grid-cols-4" aria-label="Progres penerimaan master fisik">
      {steps.map((step, index) => {
        const state = step.done ? 'done' : index === current ? 'current' : 'todo';
        return (
          <li
            key={step.label}
            aria-current={state === 'current' ? 'step' : undefined}
            className="flex items-start gap-2.5"
          >
            <span
              className={clsx(
                'mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full border text-xs font-bold',
                state === 'done' && 'border-brand-700 bg-brand-700 text-white',
                state === 'current' && 'border-brand-700 bg-white text-brand-800 ring-4 ring-brand-700/10',
                state === 'todo' && 'border-line-strong bg-white text-ink-muted'
              )}
            >
              {state === 'done' ? <Check className="h-3.5 w-3.5" aria-hidden="true" /> : index + 1}
            </span>
            <span className="min-w-0">
              <span className={clsx('block text-xs font-bold', state === 'todo' ? 'text-ink-muted' : 'text-ink')}>
                {step.label}
                <span className="sr-only">{state === 'done' ? ' (selesai)' : state === 'current' ? ' (saat ini)' : ''}</span>
              </span>
              <span className="block truncate text-xs text-ink-muted">{step.hint}</span>
            </span>
          </li>
        );
      })}
    </ol>
  );
};

/** Ringkasan pengiriman dari penerbit: kurir/loket, nomor resi, tanggal kirim. */
export const ShipmentDetails = ({ reg }) => {
  const loket = isLoket(reg.dispatch_courier);
  const Icon = loket ? Store : Truck;
  return (
    <dl className="divide-y divide-line rounded-lg border border-line bg-canvas/60">
      <div className="flex items-center justify-between gap-3 px-3.5 py-2.5">
        <dt className="flex items-center gap-2 text-xs text-ink-muted">
          <Icon className="h-3.5 w-3.5" aria-hidden="true" /> Metode kirim
        </dt>
        <dd className="text-right text-xs font-semibold text-ink">{courierLabel(reg.dispatch_courier)}</dd>
      </div>
      <div className="flex items-center justify-between gap-3 px-3.5 py-2.5">
        <dt className="flex items-center gap-2 text-xs text-ink-muted">
          <Hash className="h-3.5 w-3.5" aria-hidden="true" /> {loket ? 'Keterangan' : 'Nomor resi'}
        </dt>
        <dd className="flex items-center gap-1 text-right font-mono text-xs font-bold text-ink">
          {reg.dispatch_tracking_no || (loket ? 'Diantar langsung (tanpa resi)' : '-')}
          <CopyButton text={reg.dispatch_tracking_no} label="nomor resi" />
        </dd>
      </div>
      <div className="flex items-center justify-between gap-3 px-3.5 py-2.5">
        <dt className="flex items-center gap-2 text-xs text-ink-muted">
          <CalendarDays className="h-3.5 w-3.5" aria-hidden="true" /> Tanggal kirim
        </dt>
        <dd className="text-right text-xs font-semibold text-ink">{formatDate(reg.dispatch_date)}</dd>
      </div>
    </dl>
  );
};
