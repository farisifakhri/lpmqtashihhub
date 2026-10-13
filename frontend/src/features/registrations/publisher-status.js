export const ACTION_STATUSES = ['DRAFT', 'REVISION_REQUIRED', 'AWAITING_PAYMENT'];
export const publisherAction = registration => {
  if (registration.status === 'DRAFT') return { label: 'Lengkapi berkas', description: 'Periksa sampel naskah dan kelengkapan sebelum mengirim permohonan.', path: `/publisher/registrations/${registration.id}` };
  if (registration.status === 'REVISION_REQUIRED') {
    const isPhysical = registration.revision_source === 'PHYSICAL_MASTER' || registration.physical_master_intake?.status === 'RETURNED';
    if (isPhysical) {
      return { label: 'Lihat catatan naskah fisik', description: 'Perbaiki jilid master fisik sesuai catatan Admin Internal dan serahkan ulang ke LPMQ.', path: `/publisher/registrations/${registration.id}` };
    }
    return { label: 'Unggah perbaikan & kirim fisik', description: 'Baca surat perbaikan, unggah naskah terbaru bila ada, kirimkan naskah fisik, lalu ajukan ulang.', path: `/publisher/registrations/${registration.id}` };
  }
  if (registration.status === 'AWAITING_PAYMENT') return { label: 'Cek tagihan & bukti bayar', description: 'Periksa kode billing dan kirim bukti pembayaran jika tagihan tersedia.', path: `/publisher/billing?registration_id=${registration.id}` };
  return null;
};
export const dateLabel = value => value ? new Date(value).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric', timeZone: 'Asia/Jakarta' }) : 'Belum tersedia';
export const downloadAvailable = document => document.status === 'ISSUED' && document.file_id && (!document.valid_until || new Date(document.valid_until) >= new Date());
