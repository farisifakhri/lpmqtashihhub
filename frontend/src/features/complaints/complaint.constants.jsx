import React from 'react';

// Selaras dengan backend (validators/complaint.validator.js)
export const COMPLAINT_MAX_FILE_BYTES = 2 * 1024 * 1024;
export const COMPLAINT_MAX_ERROR_ITEMS = 20;
export const COMPLAINT_ACCEPT = '.jpg,.jpeg,.png,.pdf,image/jpeg,image/png,application/pdf';

export const COMPLAINT_TYPE_LABELS = {
  KESALAHAN_CETAK: "Pengaduan Kesalahan Cetak Mushaf Al-Qur'an",
  PELAYANAN: 'Pengaduan Pelayanan Surat Tanda Tashih/Izin Edar',
};

export const COMPLAINT_ROUTES = {
  KESALAHAN_CETAK: '/pengaduan/kesalahan-cetak-mushaf',
  PELAYANAN: '/pengaduan/pelayanan-surat-tanda-tashih',
  LACAK: '/pengaduan/lacak',
};

export const SERVICE_CATEGORIES = [
  { kode: 'BIAYA_PNBP', label: 'Kesalahan penetapan biaya PNBP layanan tashih' },
  { kode: 'KETERLAMBATAN_PENTASHIHAN', label: 'Keterlambatan proses pentashihan master mushaf' },
  { kode: 'LAINNYA', label: 'Pengaduan Lainnya' },
];

export const PRINT_ERROR_TYPES = [
  'Kesalahan huruf',
  'Kesalahan harakat atau tanda baca',
  'Kesalahan tanda waqaf',
  'Kata atau ayat hilang',
  'Kata atau ayat berulang',
  'Urutan halaman/ayat tidak sesuai',
  'Halaman hilang, rusak, atau tidak terbaca',
  'Kesalahan penomoran ayat/surah/juz',
  'Lainnya',
];

export const serviceCategoryLabel = (kode) => SERVICE_CATEGORIES.find((item) => item.kode === kode)?.label || kode || '-';

export const COMPLAINT_STATUS_META = {
  MENUNGGU_VERIFIKASI: { label: 'Menunggu Verifikasi', className: 'border-civic-infoLine bg-civic-infoSoft text-civic-info' },
  DITERIMA: { label: 'Diterima', className: 'border-brand-200 bg-brand-50 text-brand-800' },
  DITOLAK: { label: 'Ditolak', className: 'border-civic-dangerLine bg-civic-dangerSoft text-civic-danger' },
  DALAM_PROSES: { label: 'Dalam Proses', className: 'border-civic-warningLine bg-civic-warningSoft text-civic-warning' },
  MENUNGGU_TINDAK_LANJUT: { label: 'Menunggu Tindak Lanjut', className: 'border-civic-warningLine bg-civic-warningSoft text-civic-warning' },
  SELESAI: { label: 'Selesai', className: 'border-civic-successLine bg-civic-successSoft text-civic-success' },
};

export const COMPLAINT_STATUS_ORDER = Object.keys(COMPLAINT_STATUS_META);

export const ComplaintStatusPill = ({ status }) => {
  const meta = COMPLAINT_STATUS_META[status];
  return (
    <span className={`inline-flex whitespace-nowrap rounded-md border px-2 py-0.5 text-[11px] font-bold ${meta?.className || 'border-line bg-surface-subtle text-ink-muted'}`}>
      {meta?.label || status}
    </span>
  );
};

export const formatDateTime = (value) => (value
  ? new Date(value).toLocaleString('id-ID', { day: '2-digit', month: 'long', year: 'numeric', hour: '2-digit', minute: '2-digit', timeZone: 'Asia/Jakarta' })
  : '-');

// Tanggal tanpa jam (mis. tanggal penyelesaian yang disimpan sebagai DATE)
export const formatDate = (value) => (value
  ? new Date(value).toLocaleDateString('id-ID', { day: '2-digit', month: 'long', year: 'numeric', timeZone: 'UTC' })
  : '-');

export const formatFileSize = (bytes) => (bytes >= 1024 * 1024
  ? `${(bytes / (1024 * 1024)).toFixed(1)} MB`
  : `${Math.max(1, Math.round(bytes / 1024))} KB`);

/** Validasi berkas lampiran di sisi klien (backend tetap memeriksa isi berkas). */
export function validateComplaintFile(file, label) {
  if (!file) return `${label} wajib diunggah.`;
  if (!/\.(jpe?g|png|pdf)$/i.test(file.name || '')) return 'Format berkas harus JPG, JPEG, PNG, atau PDF.';
  if (file.size > COMPLAINT_MAX_FILE_BYTES) return 'Ukuran berkas maksimal 2 MB.';
  if (file.size === 0) return 'Berkas kosong. Pilih berkas lain.';
  return null;
}

export const EMPTY_REPORTER = {
  nama: '',
  jenis_kelamin: '',
  usia: '',
  alamat: '',
  provinsi_kode: '',
  kabupaten_kode: '',
  kecamatan_kode: '',
  kode_pos: '',
  telepon: '',
  email: '',
  pekerjaan: '',
};

/** Validasi identitas pengadu (aturan yang sama ditegakkan ulang oleh backend). */
export function validateReporter(form) {
  const errors = {};
  const value = (key) => String(form[key] ?? '').trim();
  if (!value('nama')) errors.nama = 'Nama pengadu wajib diisi.';
  else if (value('nama').length < 3) errors.nama = 'Nama pengadu minimal 3 karakter.';
  if (!form.jenis_kelamin) errors.jenis_kelamin = 'Jenis kelamin wajib dipilih.';
  const usia = Number(value('usia'));
  if (!value('usia')) errors.usia = 'Usia pengadu wajib diisi.';
  else if (!Number.isInteger(usia) || usia < 10 || usia > 120) errors.usia = 'Usia pengadu harus antara 10 dan 120 tahun.';
  if (!value('alamat')) errors.alamat = 'Alamat pengadu wajib diisi.';
  else if (value('alamat').length < 10) errors.alamat = 'Alamat pengadu minimal 10 karakter.';
  if (!form.provinsi_kode) errors.provinsi_kode = 'Provinsi wajib dipilih.';
  if (!form.kabupaten_kode) errors.kabupaten_kode = 'Kota/kabupaten wajib dipilih.';
  if (!form.kecamatan_kode) errors.kecamatan_kode = 'Kecamatan wajib dipilih.';
  if (!/^\d{5}$/.test(value('kode_pos'))) errors.kode_pos = 'Kode pos harus 5 digit angka.';
  if (!value('telepon')) errors.telepon = 'Nomor telepon wajib diisi.';
  else if (!/^(\+62|62|0)[0-9]{8,14}$/.test(value('telepon'))) errors.telepon = 'Nomor telepon tidak valid (contoh: 081234567890).';
  if (!value('email')) errors.email = 'Email pengadu wajib diisi.';
  else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value('email'))) errors.email = 'Format alamat email tidak valid.';
  if (!value('pekerjaan')) errors.pekerjaan = 'Pekerjaan pengadu wajib diisi.';
  else if (value('pekerjaan').length < 2) errors.pekerjaan = 'Pekerjaan pengadu minimal 2 karakter.';
  return errors;
}

export const requireText = (errors, key, rawValue, label, min) => {
  const value = String(rawValue ?? '').trim();
  if (!value) errors[key] = `${label} wajib diisi.`;
  else if (value.length < min) errors[key] = `${label} minimal ${min} karakter.`;
};
