import { z } from 'zod';

const statusLabels = {
  DRAFT: 'Draf', READY_FOR_VERIFICATION: 'Menunggu verifikasi', IN_VERIFICATION: 'Sedang diverifikasi',
  REVISION_REQUIRED: 'Perlu perbaikan penerbit', WAITING_VERIFICATION_APPROVAL: 'Menunggu persetujuan Kepala LPMQ',
  AWAITING_PAYMENT: 'Menunggu pembayaran', PAYMENT_VERIFICATION: 'Menunggu verifikasi pembayaran',
  WAITING_DISTRIBUTION: 'Menunggu distribusi', TASHIH_IN_PROGRESS: 'Sedang ditashih',
  READY_FOR_STT: 'Siap untuk penetapan STT', STT_ISSUED: 'STT telah terbit',
  DOCUMENTATION_IN_PROGRESS: 'Sedang didokumentasikan', COMPLETED: 'Selesai', CANCELLED: 'Dibatalkan',
};
export const statusLabel = status => statusLabels[status] || 'Tidak dikenali';
const roleLabels = {
  SUPERADMIN: 'administrator sistem', ADMIN_PENERBIT: 'admin penerbit', VERIFIKATOR: 'verifikator',
  DISTRIBUTOR: 'distributor', PENTASHIH: 'pentashih', DOKUMENTATOR: 'dokumentator', KEPALA_LPMQ: 'Kepala LPMQ',
};
export const roleLabel = role => roleLabels[role] || 'petugas yang berwenang';

const fields = {
  id: 'Referensi data', name: 'Nama', email: 'Email', password: 'Kata sandi', legal_name: 'Nama badan hukum',
  entity_type: 'Jenis badan hukum', title: 'Judul naskah', service_type_id: 'Jenis layanan', publisher_id: 'Penerbit',
  category_id: 'Kategori mushaf', registration_type: 'Jenis pengajuan', previous_registration_id: 'Pengajuan sebelumnya',
  addons: 'Layanan tambahan', addon_ids: 'Layanan tambahan', receipt_file_id: 'Bukti pembayaran', file_id: 'Berkas unggahan',
  team_id: 'Tim pentashihan', assignee_ids: 'Anggota pentashih', stage: 'Tahap pentashihan', result: 'Hasil sidang',
  notes: 'Catatan', document_type: 'Jenis dokumen', type: 'Jenis berkas', days: 'Kalender kerja', date: 'Tanggal',
  is_working_day: 'Penanda hari kerja', source: 'Sumber keputusan', description: 'Keterangan', external_ref: 'Referensi pembayaran',
  to_status: 'Status tujuan', from_status: 'Status awal', version: 'Versi berkas', checksum: 'Checksum berkas',
  file_size: 'Ukuran berkas', mime_type: 'Jenis isi berkas', amount: 'Nominal pembayaran',
};

export function validationMessage(issue) {
  // Preserve deliberately authored schema messages; translate only Zod defaults.
  const fallback = z.defaultErrorMap(issue, { data: undefined, defaultError: '' }).message;
  if (issue.message && issue.message !== fallback) return issue.message;
  const key = [...issue.path].reverse().find(part => typeof part === 'string');
  const label = fields[key] || 'Isian';
  const index = issue.path.find(part => typeof part === 'number');
  const field = index === undefined ? label : `${label} pada baris ${index + 1}`;
  switch (issue.code) {
    case 'invalid_type': return issue.received === 'undefined' || issue.received === 'null'
      ? `${field} wajib diisi.` : `${field} memiliki format yang tidak sesuai. Periksa kembali nilainya.`;
    case 'invalid_enum_value': return `${field} tidak tersedia. Pilih salah satu pilihan yang disediakan.`;
    case 'invalid_string': return issue.validation === 'uuid'
      ? `${field} tidak valid. Pilih ulang data atau unggah kembali berkas melalui aplikasi.`
      : `${field} tidak sesuai format yang diminta. Periksa kembali isian Anda.`;
    case 'too_small': return issue.type === 'array' ? `${field} harus berisi minimal ${issue.minimum} pilihan.`
      : issue.type === 'string' ? `${field} harus berisi minimal ${issue.minimum} karakter.`
      : `${field} harus ${issue.inclusive ? 'minimal' : 'lebih dari'} ${issue.minimum}.`;
    case 'too_big': return issue.type === 'array' ? `${field} boleh berisi maksimal ${issue.maximum} pilihan.`
      : issue.type === 'string' ? `${field} boleh berisi maksimal ${issue.maximum} karakter.`
      : `${field} harus ${issue.inclusive ? 'maksimal' : 'kurang dari'} ${issue.maximum}.`;
    case 'unrecognized_keys': return 'Ada isian tambahan yang tidak dapat diproses. Muat ulang formulir; gunakan data berkas dan nominal yang ditetapkan sistem.';
    default: return `${field} belum sesuai. Periksa kembali formulir Anda.`;
  }
}
