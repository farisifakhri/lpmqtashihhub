import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { CheckCircle2, ChevronDown, Clock, FileCheck2, MapPin, PenTool, Send, Stamp, Truck, UserCheck, Wallet } from 'lucide-react';
import { StatusBadge } from '@/components/ui/StatusBadge';

const formatDateTime = (value) => (value
  ? new Date(value).toLocaleString('id-ID', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })
  : null);
const formatDate = (value) => (value
  ? new Date(value).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' })
  : '-');

const resultDocOf = (item) => (item.documents || []).find((d) => ['SURAT_HASIL_VERIFIKASI', 'SURAT_PEMBERITAHUAN_HASIL_VERIFIKASI'].includes(d.document_type));
const minutesDocOf = (item) => (item.documents || []).find((d) => d.document_type === 'BERITA_ACARA_VERIFIKASI');

/** Jejak surat hasil verifikasi: dari pengajuan Verifikator sampai posisi berkas saat ini. */
export const trackSteps = (item) => {
  const doc = resultDocOf(item);
  const reg = item.registration || {};
  const signers = item.paraf?.signers || [];
  const payment = reg.payment_records?.[0];
  const handover = reg.physical_handovers?.[0];
  const steps = [
    {
      key: 'submit', icon: UserCheck, label: 'Diajukan Verifikator', actor: item.verifier?.name,
      at: item.review_submitted_at || doc?.created_at, state: 'done',
    },
    {
      key: 'paraf', icon: Stamp, label: 'Paraf Pemaraf',
      actor: signers.length ? signers.map((s) => `${s.name} (${formatDate(s.signed_at)})`).join(' · ') : 'Tanpa paraf (alur sebelum Pemaraf)',
      at: signers.length ? signers[signers.length - 1].signed_at : null, state: 'done',
    },
    {
      key: 'approve', icon: PenTool, label: 'Disahkan Kepala LPMQ', actor: doc?.approved_by?.name,
      at: doc?.approved_at, note: doc?.document_no ? `No. ${doc.document_no}` : null, state: doc?.approved_at ? 'done' : 'current',
    },
    {
      key: 'send', icon: Send, label: 'Dikirim ke Penerbit',
      actor: doc?.sent_at ? reg.publisher?.legal_name : 'Menunggu Verifikator mengirim', at: doc?.sent_at,
      state: doc?.sent_at ? 'done' : 'current',
    },
    // Tagihan PNBP hanya ada untuk hasil lolos; surat perbaikan tidak punya tahap bayar/BAST.
    ...(payment ? [
      {
        key: 'pay', icon: Wallet, label: 'Pembayaran PNBP',
        actor: payment.status === 'VERIFIED' ? 'Lunas, diverifikasi Verifikator'
          : payment.status === 'PAID' ? 'Bukti bayar menunggu verifikasi' : 'Menunggu pembayaran penerbit',
        at: payment.verified_at || payment.paid_at,
        state: payment.status === 'VERIFIED' ? 'done' : doc?.sent_at ? 'current' : 'todo',
      },
      {
        key: 'bast', icon: Truck, label: 'Serah Terima ke Distributor',
        actor: !handover ? (payment.status === 'VERIFIED' ? 'Siap BAST, menunggu Verifikator menyerahkan' : null)
          : handover.status === 'RECEIVED' ? `Diterima ${handover.to_user?.name || 'Distributor'}`
            : handover.status === 'RETURNED' ? 'Dikembalikan distributor, perlu BAST pengganti'
              : `Menunggu diterima ${handover.to_user?.name || 'Distributor'}`,
        note: handover?.receipt_no || null,
        at: handover?.received_at || handover?.handed_over_at,
        state: handover?.status === 'RECEIVED' ? 'done' : payment.status === 'VERIFIED' ? 'current' : 'todo',
      },
    ] : []),
  ];
  // Posisi saat ini aktif hanya bila semua tahap sebelumnya selesai.
  const allDone = steps.every((s) => s.state === 'done');
  return [...steps, {
    key: 'now', icon: MapPin, label: 'Posisi Berkas Saat Ini', status: reg.status,
    at: reg.stage_entered_at, note: reg.stage_entered_at ? `sejak ${formatDate(reg.stage_entered_at)}` : null,
    state: allDone ? 'current' : 'todo',
  }];
};

const GRID_COLS = { 5: 'md:grid-cols-5', 7: 'md:grid-cols-7' };

const STEP_STYLE = {
  done: { dot: 'bg-civic-success text-white', line: 'bg-civic-success', label: 'text-ink' },
  current: { dot: 'bg-civic-warningSoft text-civic-warning ring-2 ring-civic-warning', line: 'bg-line', label: 'text-civic-warning' },
  todo: { dot: 'border-2 border-line-strong bg-surface text-ink-muted', line: 'bg-line', label: 'text-ink-muted' },
};

const TrackTimeline = ({ item }) => {
  const steps = trackSteps(item);
  return (
    <ol className={`grid gap-4 ${GRID_COLS[steps.length] || 'md:grid-cols-5'}`} aria-label={`Lacak berkas ${item.registration?.registration_no || ''}`}>
      {steps.map((step, i) => {
        const style = STEP_STYLE[step.state];
        const Icon = step.icon;
        return (
          <li key={step.key} className="relative flex gap-3 md:flex-col md:gap-2">
            {i < steps.length - 1 && (
              <span aria-hidden="true" className={`absolute left-4 top-9 h-[calc(100%-1rem)] w-0.5 md:left-9 md:top-4 md:h-0.5 md:w-[calc(100%-1.5rem)] ${style.line}`} />
            )}
            <span className={`relative z-10 flex h-8 w-8 shrink-0 items-center justify-center rounded-full ${style.dot}`} aria-hidden="true">
              {step.state === 'done' ? <CheckCircle2 className="h-4 w-4" /> : <Icon className="h-4 w-4" />}
            </span>
            <div className="min-w-0 text-xs">
              <p className={`font-bold ${style.label}`}>{step.label}</p>
              {step.status && <div className="mt-1"><StatusBadge status={step.status} size="sm" /></div>}
              {step.actor && <p className="mt-0.5 text-ink">{step.actor}</p>}
              {step.note && <p className="mt-0.5 font-mono text-[11px] text-ink-muted">{step.note}</p>}
              <p className="mt-0.5 text-ink-muted">{formatDateTime(step.at) || (step.state === 'done' ? '' : 'Belum')}</p>
              <span className="sr-only">{step.state === 'done' ? '(selesai)' : step.state === 'current' ? '(sedang berjalan)' : '(belum)'}</span>
            </div>
          </li>
        );
      })}
    </ol>
  );
};

const FILTERS = [
  { key: 'ALL', label: 'Semua' },
  { key: 'READY_TO_SEND', label: 'Disahkan, Belum Dikirim' },
  { key: 'COMPLETED', label: 'Sudah Dikirim' },
];

/**
 * Riwayat (Kepala/Pemaraf/Admin): surat hasil verifikasi yang sudah disahkan, dengan posisi berkas saat ini
 * dan jejak bertanggal per tahap (tombol "Lacak").
 */
export const VerificationHistoryTable = ({ assignments }) => {
  const [filter, setFilter] = useState('ALL');
  const [openId, setOpenId] = useState(null);
  const count = (key) => (key === 'ALL' ? assignments.length : assignments.filter((a) => a.status === key).length);
  const rows = filter === 'ALL' ? assignments : assignments.filter((a) => a.status === filter);

  return (
    <section className="overflow-hidden rounded-2xl border border-line bg-surface shadow-sm">
      <div className="flex flex-wrap items-center gap-2 border-b border-line px-5 py-3.5 sm:px-6" role="group" aria-label="Saring riwayat">
        <span className="mr-1 flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-ink-muted">
          <FileCheck2 className="h-3.5 w-3.5 text-brand-fill" aria-hidden="true" /> Lacak Berkas:
        </span>
        {FILTERS.map((f) => (
          <button key={f.key} type="button" aria-pressed={filter === f.key} onClick={() => setFilter(f.key)}
            className={`rounded-xl px-3.5 py-1.5 text-xs font-bold transition-all focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-fill ${
              filter === f.key ? 'bg-brand-fill text-white shadow-xs' : 'border border-brand-100 bg-brand-50 text-brand-fg hover:bg-brand-100'}`}>
            {f.label} ({count(f.key)})
          </button>
        ))}
      </div>
      <div className="overflow-x-auto">
        <table className="w-full min-w-[900px] border-collapse text-left">
          <caption className="sr-only">Riwayat surat hasil verifikasi yang sudah disahkan</caption>
          <thead>
            <tr className="border-b border-line bg-canvas/80 text-xs font-bold uppercase tracking-wider text-ink-muted">
              <th scope="col" className="px-6 py-3.5">Referensi &amp; Tanggal</th>
              <th scope="col" className="px-6 py-3.5">Entitas &amp; Naskah</th>
              <th scope="col" className="px-6 py-3.5">Nomor Surat</th>
              <th scope="col" className="px-6 py-3.5">Posisi Berkas Saat Ini</th>
              <th scope="col" className="px-6 py-3.5 text-right">Aksi</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-line text-sm">
            {!rows.length && (
              <tr><td colSpan={5} className="py-14 text-center text-xs text-ink-muted">Tidak ada surat pada filter ini.</td></tr>
            )}
            {rows.map((item) => {
              const reg = item.registration || {};
              const doc = resultDocOf(item);
              const minutes = minutesDocOf(item);
              const open = openId === item.id;
              return (
                <React.Fragment key={item.id}>
                  <tr className={open ? 'bg-brand-50/50' : 'hover:bg-brand-50/40'}>
                    <td className="px-6 py-4 align-top">
                      <span className="block font-mono text-xs font-bold text-ink">{reg.registration_no || '-'}</span>
                      <span className="text-xs text-ink-muted">Disahkan {formatDate(doc?.approved_at)}</span>
                    </td>
                    <td className="max-w-[240px] px-6 py-4 align-top">
                      <span className="line-clamp-2 block font-bold text-ink">{reg.title || 'Naskah Mushaf'}</span>
                      <span className="block text-xs font-semibold text-brand-fg">{reg.publisher?.legal_name || 'Penerbit Terdaftar'}</span>
                    </td>
                    <td className="px-6 py-4 align-top text-xs">
                      <span className="block font-mono font-semibold text-ink">{doc?.document_no || '-'}</span>
                      {minutes?.document_no && <span className="block font-mono text-ink-muted">BA: {minutes.document_no}</span>}
                    </td>
                    <td className="px-6 py-4 align-top">
                      <StatusBadge status={reg.status} size="sm" />
                      <p className="mt-1.5 flex items-center gap-1 text-xs text-ink-muted">
                        {item.status === 'READY_TO_SEND'
                          ? <><Clock className="h-3.5 w-3.5" aria-hidden="true" /> Belum dikirim ke penerbit</>
                          : <><Send className="h-3.5 w-3.5" aria-hidden="true" /> Dikirim {formatDate(doc?.sent_at)}</>}
                      </p>
                      {reg.physical_handovers?.[0] && (
                        <p className="mt-0.5 flex items-center gap-1 text-xs text-ink-muted">
                          <Truck className="h-3.5 w-3.5" aria-hidden="true" /> BAST ke {reg.physical_handovers[0].to_user?.name || 'Distributor'}
                        </p>
                      )}
                    </td>
                    <td className="px-6 py-4 align-top">
                      <div className="flex items-center justify-end gap-2">
                        <button type="button" onClick={() => setOpenId(open ? null : item.id)} aria-expanded={open}
                          aria-controls={`lacak-${item.id}`}
                          className={`inline-flex items-center gap-1 rounded-lg px-3 py-1.5 text-xs font-bold transition focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-fill ${
                            open ? 'bg-brand-fill text-white' : 'border border-brand-100 bg-brand-50 text-brand-fg hover:bg-brand-100'}`}>
                          <MapPin className="h-3.5 w-3.5" aria-hidden="true" /> Lacak
                          <ChevronDown className={`h-3.5 w-3.5 motion-safe:transition-transform ${open ? 'rotate-180' : ''}`} aria-hidden="true" />
                        </button>
                        <Link to={`/internal/verifications/${item.id}`}
                          className="rounded-lg border border-line-strong bg-surface px-3 py-1.5 text-center text-xs font-semibold leading-tight text-ink shadow-2xs hover:bg-canvas focus-visible:outline focus-visible:outline-2 focus-visible:outline-brand-fill">
                          Tinjau<br />Detail
                        </Link>
                      </div>
                    </td>
                  </tr>
                  {open && (
                    <tr id={`lacak-${item.id}`} className="bg-brand-50/30">
                      <td colSpan={5} className="px-6 py-5">
                        <TrackTimeline item={item} />
                      </td>
                    </tr>
                  )}
                </React.Fragment>
              );
            })}
          </tbody>
        </table>
      </div>
    </section>
  );
};

export default VerificationHistoryTable;
