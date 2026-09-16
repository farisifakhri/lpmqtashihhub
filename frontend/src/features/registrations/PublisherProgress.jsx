import React from 'react';
const labels = ['Pengajuan', 'Verifikasi', 'Pembayaran', 'Pentashihan', 'STT', 'Selesai'];
const stages = {
  DRAFT: 0, READY_FOR_VERIFICATION: 1, VERIFICATION_ASSIGNED: 1, IN_VERIFICATION: 1, WAITING_VERIFICATION_APPROVAL: 1, VERIFICATION_APPROVED: 1,
  AWAITING_PAYMENT: 2, PAYMENT_VERIFICATION: 2,
  WAITING_DISTRIBUTOR_RECEIPT: 3, WAITING_DISTRIBUTION: 3, TASHIH_IN_PROGRESS: 3,
  READY_FOR_STT: 4, STT_ISSUED: 4, DOCUMENTATION_IN_PROGRESS: 4, COMPLETED: 5,
};
export function PublisherProgress({ registration }) {
  if (registration.status === 'REVISION_REQUIRED' && !Array.isArray(registration.assignments)) return <p className="text-xs text-amber-800">Perlu perbaikan · lihat catatan pada detail naskah.</p>;
  const stage = registration.status === 'REVISION_REQUIRED' ? (registration.assignments?.length ? 3 : 1) : stages[registration.status];
  if (stage === undefined) return <p className="text-xs text-slate-500">{registration.status === 'CANCELLED' ? 'Pengajuan dibatalkan.' : 'Tahap proses belum tersedia.'}</p>;
  return <div aria-label={`Tahap naskah: ${labels[stage]}${registration.status === 'REVISION_REQUIRED' ? ', perlu perbaikan' : ''}`}>
    <div className="grid grid-cols-6 gap-1.5" aria-hidden="true">{labels.map((label, index) => <div key={label} className={`h-1.5 rounded-full ${index <= stage ? registration.status === 'REVISION_REQUIRED' ? 'bg-amber-500' : 'bg-emerald-600' : 'bg-slate-200'}`} />)}</div>
    <p className="mt-2 text-xs text-slate-500">Tahap {labels[stage]}{registration.status === 'REVISION_REQUIRED' ? ' · perlu perbaikan' : ''} · bukan persentase penyelesaian</p>
  </div>;
}
