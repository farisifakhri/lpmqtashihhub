import React from 'react';

// Status permohonan master mushaf (selaras dengan backend):
// DIAJUKAN -> MENUNGGU_TTE -> DITANDATANGANI -> DIKIRIM, atau DITOLAK.
export const MASTER_STATUS_META = {
  DIAJUKAN: {
    label: 'Diajukan',
    publisherLabel: 'Sedang ditinjau LPMQ',
    className: 'border-civic-infoLine bg-civic-infoSoft text-civic-info',
  },
  MENUNGGU_TTE: {
    label: 'Menunggu TTE Kepala',
    publisherLabel: 'Surat persetujuan sedang diproses',
    className: 'border-civic-warningLine bg-civic-warningSoft text-civic-warning',
  },
  DITANDATANGANI: {
    label: 'Sudah Ditandatangani',
    publisherLabel: 'Surat persetujuan sedang diproses',
    className: 'border-civic-warningLine bg-civic-warningSoft text-civic-warning',
  },
  DIKIRIM: {
    label: 'Surat Dikirim',
    publisherLabel: 'Disetujui — surat tersedia',
    className: 'border-civic-successLine bg-civic-successSoft text-civic-success',
  },
  DITOLAK: {
    label: 'Ditolak',
    publisherLabel: 'Tidak disetujui',
    className: 'border-civic-dangerLine bg-civic-dangerSoft text-civic-danger',
  },
};

/** Tahapan yang ditampilkan ke penerbit (urutan alur). */
export const PUBLISHER_STEPS = [
  { key: 'DIAJUKAN', label: 'Diajukan' },
  { key: 'MENUNGGU_TTE', label: 'Ditinjau Admin' },
  { key: 'DITANDATANGANI', label: 'Ditandatangani Kepala' },
  { key: 'DIKIRIM', label: 'Surat Diterima' },
];

export const stepIndex = (status) => PUBLISHER_STEPS.findIndex((step) => step.key === status);

export const MASTER_LETTER_DOC_TYPE = 'SURAT_PERSETUJUAN_MASTER';

export const DEFAULT_LETTER_SUBJECT = "Persetujuan Permohonan Master Mushaf Al-Qur'an";

export const formatDateTime = (value) => (value
  ? new Date(value).toLocaleString('id-ID', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })
  : '-');

export const MasterStatusPill = ({ status, audience = 'admin' }) => {
  const meta = MASTER_STATUS_META[status];
  const label = meta ? (audience === 'publisher' ? meta.publisherLabel : meta.label) : status;
  return (
    <span className={`inline-flex rounded-md border px-2 py-0.5 text-[11px] font-bold ${meta?.className || 'border-line bg-surface-subtle text-ink-muted'}`}>
      {label}
    </span>
  );
};
