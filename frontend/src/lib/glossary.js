/**
 * Glosarium & Formatters Istilah Resmi Layanan Pentashihan Mushaf Al-Qur'an (LPMQ)
 * Acuan: Glosarium Narasi Resmi Kemenag RI, SOP Pentashihan Mushaf Al-Qur'an,
 * dan Dokumen Standar Terminologi Antarmuka Pengguna LPMQ.
 *
 * Modul ini menghilangkan "bahasa sistem" (raw database enum / istilah teknis asing)
 * dari antarmuka pengguna dan memastikan konsistensi istilah di seluruh aplikasi.
 */

// 1. Kamus Dokumen Resmi Kedinasan
export const DOCUMENT_TYPE_LABELS = {
  SURAT_PERMOHONAN: 'Surat Permohonan Tanda Tashih',
  NOTA_DINAS_VERIFIKASI: 'Disposisi / Nota Dinas Verifikasi',
  SURAT_HASIL_VERIFIKASI: 'Surat Hasil Verifikasi Berkas & Naskah',
  SURAT_PEMBERITAHUAN_HASIL_VERIFIKASI: 'Surat Pemberitahuan Hasil Verifikasi',
  BERITA_ACARA_VERIFIKASI: 'Berita Acara Verifikasi Berkas & Rasm',
  BERITA_ACARA_TASHIH: 'Berita Acara Pentashihan',
  SURAT_TANDA_TASHIH: 'Surat Tanda Tashih (STT)',
  REVISION_RETURN_LETTER: 'Surat Pengembalian Naskah Perbaikan',
  DECREE_OF_ASSIGNMENT: 'Surat Penugasan Tim Pentashih',
  SURAT_TUGAS: 'Surat Tugas Verifikasi',
  TANDA_TERIMA_FISIK: 'Tanda Terima Master Fisik',
  BUKTI_PERMOHONAN: 'Tanda Terima Permohonan',
  KWITANSI_PNBP: 'Bukti Setor PNBP SIMPONI',
};

// 2. Kamus Status Dokumen Resmi
export const DOCUMENT_STATUS_LABELS = {
  DRAFT: 'Draf Dokumen',
  PENDING_APPROVAL: 'Menunggu Persetujuan',
  SUBMITTED: 'Diajukan',
  IN_REVIEW: 'Sedang Ditinjau',
  APPROVED: 'Disetujui',
  SIGNING: 'Proses Tanda Tangan',
  SIGNED: 'Ditandatangani',
  ISSUED: 'Resmi Diterbitkan',
  ARCHIVED: 'Diarsipkan',
  SUPERSEDED: 'Digantikan Versi Baru',
  REVOKED: 'Dicabut',
  REJECTED: 'Ditolak',
  VALID: 'Sah & Berlaku',
  EXPIRED: 'Kedaluwarsa',
};

// 3. Kamus Status Permohonan / Naskah
export const REGISTRATION_STATUS_LABELS = {
  DRAFT: 'Draf Permohonan',
  READY_FOR_VERIFICATION: 'Menunggu Penugasan Verifikator',
  VERIFICATION_ASSIGNED: 'Verifikator Ditugaskan',
  IN_VERIFICATION: 'Sedang Diverifikasi',
  REVISION_REQUIRED: 'Perlu Perbaikan Berkas',
  WAITING_VERIFICATION_APPROVAL: 'Menunggu Persetujuan Kepala',
  VERIFICATION_APPROVED: 'Siap Dikirim',
  AWAITING_PAYMENT: 'Menunggu Pembayaran PNBP',
  PAYMENT_VERIFICATION: 'Verifikasi Pembayaran',
  WAITING_DISTRIBUTOR_RECEIPT: 'Menunggu Konfirmasi Distributor',
  PHYSICAL_HANDOVER_CORRECTION_REQUIRED: 'Perlu Koreksi Master Fisik',
  WAITING_DISTRIBUTION: 'Siap Penugasan Tim Sidang',
  TASHIH_IN_PROGRESS: 'Sidang Tashih Berjalan',
  READY_FOR_STT: 'Siap Penetapan STT',
  STT_ISSUED: 'STT Ditetapkan',
  DOCUMENTATION: 'Pemberkasan Dokumentasi',
  DOCUMENTATION_IN_PROGRESS: 'Pemberkasan Dokumentasi',
  COMPLETED: 'Selesai (Surat Terbit)',
  CANCELLED: 'Dibatalkan',
};

// 4. Kamus Status Serah-Terima Fisik (BAST)
export const HANDOVER_STATUS_LABELS = {
  PENDING: 'Menunggu Konfirmasi Serah-Terima',
  CONFIRMED: 'Dikonfirmasi / Selesai',
  RETURNED: 'Perlu Perbaikan Fisik',
  CANCELLED: 'Dibatalkan',
};

// 5. Kamus Jenis Revisi & Siklus Naskah
export const REVISION_KIND_LABELS = {
  NASKAH_PERBAIKAN: 'Naskah Perbaikan',
  NASKAH_DUMI: 'Naskah Dumi (Pra-Cetak)',
};

// 6. Kamus Tahap Sidang Tashih (Stage)
export const STAGE_LABELS = {
  INITIAL: 'Tashih Tahap Awal',
  REVISION: 'Tashih Tahap Perbaikan',
  DUMMY: 'Tashih Tahap Dumi (Pra-Cetak)',
};

// 7. Kamus Cakupan Rekap Koreksi Pentashih
export const RECAP_SCOPE_LABELS = {
  TEAM: 'Mewakili Tim (Kolektif)',
  SELF: 'Perorangan (Mandiri)',
};

// 8. Kamus Ekspedisi / Metode Penyerahan
export const COURIER_LABELS = {
  LOKET_LPMQ: 'Serah Langsung ke Loket LPMQ',
  POS_INDONESIA: 'Pos Indonesia',
  JNE: 'JNE Express',
  TIKI: 'TIKI',
  SICEPAT: 'SiCepat Ekspres',
  JNT: 'J&T Express',
  ANTERAJA: 'Anteraja',
  OTHER: 'Ekspedisi Lainnya',
};

// 9. Kamus Jenis Berkas Unggahan
export const FILE_TYPE_LABELS = {
  COVER: 'Sampul / Cover Naskah',
  SAMPLE_PAGE_1_5: 'Sampel Halaman Naskah (Hal 1–5)',
  FULL_MANUSCRIPT: 'Naskah Lengkap Digital (PDF)',
  SURAT_PERMOHONAN: 'Surat Permohonan Resmi',
  SURAT_TUGAS: 'Surat Tugas / Kuasa',
  AKTA_NOTARIS: 'Akta Notaris & SK Kemenkumham',
  NIB: 'Nomor Induk Berusaha (NIB)',
  NPWP: 'NPWP Perusahaan',
  RECAP_FILE: 'Berkas Rekapitulasi Koreksi Sidang',
  REVISION_RECAP: 'Berkas Rekap Perbaikan Penerbit',
  BUKTI_BAYAR: 'Bukti Setor Bayar PNBP (NTPN)',
  DUMMY_MANUSCRIPT: 'Naskah Dumi Fisik Pra-Cetak',
};

// 10. Kamus Peran Pengguna (Role)
export const ROLE_LABELS = {
  SUPERADMIN: 'Administrator Sistem',
  ADMIN_INTERNAL: 'Helper Admin Loket',
  VERIFIKATOR: 'Verifikator Dokumen',
  VERIFICATOR: 'Verifikator Dokumen',
  DISTRIBUTOR: 'Koordinator Distribusi',
  PENTASHIH: 'Pentashih Naskah',
  TASHIH_MEMBER: 'Pentashih Naskah',
  DOKUMENTATOR: 'Administrator Dokumen',
  DOCUMENTATOR: 'Administrator Dokumen',
  KEPALA_LPMQ: 'Kepala LPMQ',
  HEAD_OF_LPMQ: 'Kepala LPMQ',
  PENERBIT: 'Penerbit Terverifikasi',
  PUBLISHER: 'Penerbit Terverifikasi',
};

// 11. Kamus Status Akun / Pengguna
export const USER_STATUS_LABELS = {
  ACTIVE: 'Aktif',
  INACTIVE: 'Nonaktif',
  SUSPENDED: 'Ditangguhkan',
  PENDING: 'Menunggu Verifikasi',
  VERIFIED: 'Terverifikasi',
  REJECTED: 'Ditolak',
};

// 12. Helper Functions dengan Fallback Manusiawi

/**
 * Format jenis dokumen resmi ke teks bahasa Indonesia yang ramah pengguna.
 */
export function formatDocumentType(type) {
  if (!type) return '-';
  return DOCUMENT_TYPE_LABELS[type] || String(type).replace(/_/g, ' ');
}

/**
 * Format status dokumen ke label bahasa Indonesia.
 */
export function formatDocumentStatus(status) {
  if (!status) return '-';
  return DOCUMENT_STATUS_LABELS[status] || String(status).replace(/_/g, ' ');
}

/**
 * Format status registrasi / naskah ke label bahasa Indonesia resmi.
 */
export function formatRegistrationStatus(status) {
  if (!status) return 'Proses Verifikasi';
  return REGISTRATION_STATUS_LABELS[status] || String(status).replace(/_/g, ' ');
}

/**
 * Format status serah terima fisik (BAST) ke label bahasa Indonesia.
 */
export function formatHandoverStatus(status) {
  if (!status) return '-';
  return HANDOVER_STATUS_LABELS[status] || String(status).replace(/_/g, ' ');
}

/**
 * Format jenis revisi naskah (Perbaikan vs Dumi).
 */
export function formatRevisionKind(kind) {
  if (!kind) return '-';
  return REVISION_KIND_LABELS[kind] || String(kind).replace(/_/g, ' ');
}

/**
 * Format tahapan sidang pentashihan.
 */
export function formatStage(stage) {
  if (!stage) return 'Tashih Awal';
  return STAGE_LABELS[stage] || String(stage).replace(/_/g, ' ');
}

/**
 * Format cakupan rekap koreksi pentashih.
 */
export function formatRecapScope(scope) {
  if (!scope) return 'Mandiri';
  return RECAP_SCOPE_LABELS[scope] || String(scope).replace(/_/g, ' ');
}

/**
 * Format ekspedisi pengiriman ke teks bahasa Indonesia.
 */
export function formatCourier(courier) {
  if (!courier) return '-';
  return COURIER_LABELS[courier] || String(courier).replace(/_/g, ' ');
}

/**
 * Format jenis berkas yang diunggah.
 */
export function formatFileType(type) {
  if (!type) return 'Berkas';
  return FILE_TYPE_LABELS[type] || String(type).replace(/_/g, ' ');
}

/**
 * Format peran pengguna.
 */
export function formatRole(role) {
  if (!role) return 'Petugas';
  return ROLE_LABELS[role] || String(role).replace(/_/g, ' ');
}

/**
 * Format status akun pengguna / verifikasi penerbit.
 */
export function formatUserStatus(status) {
  if (!status) return '-';
  return USER_STATUS_LABELS[status] || String(status).replace(/_/g, ' ');
}
