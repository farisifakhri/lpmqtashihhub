import { z } from 'zod';

// Sistem Pengaduan LPMQ: (1) kesalahan cetak mushaf Al-Qur'an, (2) pelayanan Surat Tanda Tashih/Izin Edar.
export const COMPLAINT_TYPES = ['KESALAHAN_CETAK', 'PELAYANAN'];

export const COMPLAINT_TYPE_LABELS = {
  KESALAHAN_CETAK: "Pengaduan Kesalahan Cetak Mushaf Al-Qur'an",
  PELAYANAN: 'Pengaduan Pelayanan Surat Tanda Tashih/Izin Edar',
};

export const COMPLAINT_STATUSES = [
  'MENUNGGU_VERIFIKASI',
  'DITERIMA',
  'DITOLAK',
  'DALAM_PROSES',
  'MENUNGGU_TINDAK_LANJUT',
  'SELESAI',
];

export const COMPLAINT_STATUS_LABELS = {
  MENUNGGU_VERIFIKASI: 'Menunggu Verifikasi',
  DITERIMA: 'Diterima',
  DITOLAK: 'Ditolak',
  DALAM_PROSES: 'Dalam Proses',
  MENUNGGU_TINDAK_LANJUT: 'Menunggu Tindak Lanjut',
  SELESAI: 'Selesai',
};

export const COMPLAINT_SERVICE_CATEGORIES = [
  { kode: 'BIAYA_PNBP', label: 'Kesalahan penetapan biaya PNBP layanan tashih' },
  { kode: 'KETERLAMBATAN_PENTASHIHAN', label: 'Keterlambatan proses pentashihan master mushaf' },
  { kode: 'LAINNYA', label: 'Pengaduan Lainnya' },
];

// Jenis kesalahan cetak yang dapat dipilih pengadu (label disimpan apa adanya)
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

export const COMPLAINT_MAX_FILE_BYTES = 2 * 1024 * 1024; // 2 MB per berkas
export const COMPLAINT_MAX_ERROR_ITEMS = 20;

const text = (label, min, max) => z
  .string({ error: `${label} wajib diisi.` })
  .trim()
  .min(min, min <= 1 ? `${label} wajib diisi.` : `${label} minimal ${min} karakter.`)
  .max(max, `${label} maksimal ${max} karakter.`);

const captchaFields = {
  captcha_token: z.string({ error: 'Verifikasi keamanan wajib diisi.' }).trim().min(10, 'Verifikasi keamanan wajib diisi.').max(2000),
  captcha_jawaban: z.string({ error: 'Kode verifikasi wajib diisi.' }).trim().min(1, 'Kode verifikasi wajib diisi.').max(12, 'Kode verifikasi tidak valid.'),
  // Honeypot anti-bot: kolom tersembunyi yang harus tetap kosong
  website: z.string().max(0, 'Pengaduan tidak dapat diproses.').optional().default(''),
};

export const reporterFields = {
  nama: text('Nama pengadu', 3, 255),
  jenis_kelamin: z.enum(['LAKI_LAKI', 'PEREMPUAN'], { error: 'Jenis kelamin wajib dipilih.' }),
  usia: z.coerce.number({ error: 'Usia pengadu wajib diisi.' })
    .int('Usia pengadu harus berupa bilangan bulat.')
    .min(10, 'Usia pengadu minimal 10 tahun.')
    .max(120, 'Usia pengadu tidak valid.'),
  alamat: text('Alamat pengadu', 10, 1000),
  provinsi_kode: z.string({ error: 'Provinsi wajib dipilih.' }).trim().regex(/^\d{2}$/, 'Provinsi wajib dipilih.'),
  kabupaten_kode: z.string({ error: 'Kota/kabupaten wajib dipilih.' }).trim().regex(/^\d{2}\.\d{2}$/, 'Kota/kabupaten wajib dipilih.'),
  kecamatan_kode: z.string({ error: 'Kecamatan wajib dipilih.' }).trim().regex(/^\d{2}\.\d{2}\.\d{2}$/, 'Kecamatan wajib dipilih.'),
  kode_pos: z.string({ error: 'Kode pos wajib diisi.' }).trim().regex(/^\d{5}$/, 'Kode pos harus 5 digit angka.'),
  telepon: z.string({ error: 'Nomor telepon wajib diisi.' }).trim()
    .regex(/^(\+62|62|0)[0-9]{8,14}$/, 'Nomor telepon tidak valid (contoh: 081234567890).'),
  email: z.string({ error: 'Email wajib diisi.' }).trim().toLowerCase()
    .email('Format alamat email tidak valid.').max(255, 'Email maksimal 255 karakter.'),
  pekerjaan: text('Pekerjaan pengadu', 2, 120),
};

const errorItemSchema = z.object({
  surah_ayat: text('Surah dan ayat', 2, 255),
  jenis_kesalahan: z.string({ error: 'Jenis kesalahan wajib dipilih.' })
    .refine((value) => PRINT_ERROR_TYPES.includes(value), 'Jenis kesalahan wajib dipilih.'),
  deskripsi: text('Deskripsi kesalahan', 10, 3000),
});

// `kesalahan` dikirim sebagai string JSON di dalam multipart/form-data
const errorItemsField = z.preprocess(
  (value) => {
    if (typeof value !== 'string') return value;
    try { return JSON.parse(value); } catch { return value; }
  },
  z.array(errorItemSchema, { error: 'Informasi kesalahan cetak wajib diisi.' })
    .min(1, 'Minimal satu informasi kesalahan cetak wajib diisi.')
    .max(COMPLAINT_MAX_ERROR_ITEMS, `Maksimal ${COMPLAINT_MAX_ERROR_ITEMS} informasi kesalahan dalam satu pengaduan.`),
);

export const createPrintErrorComplaintSchema = {
  body: z.object({
    ...reporterFields,
    nama_penerbit: text('Nama penerbit mushaf', 2, 255),
    nama_mushaf: text('Nama mushaf', 2, 255),
    nomor_surat_tashih: text('Nomor Surat Tanda Tashih', 3, 120),
    kesalahan: errorItemsField,
    ...captchaFields,
  }),
};

export const createServiceComplaintSchema = {
  body: z.object({
    ...reporterFields,
    nomor_pendaftaran: text('Nomor pendaftaran mushaf', 3, 120),
    penerbit_pendaftar: text('Penerbit pendaftar mushaf', 2, 255),
    jenis_pengaduan: z.enum(COMPLAINT_SERVICE_CATEGORIES.map((item) => item.kode), { error: 'Jenis pengaduan wajib dipilih.' }),
    deskripsi: text('Deskripsi pengaduan', 10, 5000),
    ...captchaFields,
  }),
};

export const trackComplaintSchema = {
  body: z.object({
    kode: z.string({ error: 'Kode pengaduan wajib diisi.' }).trim().toUpperCase()
      .min(5, 'Kode pengaduan wajib diisi.').max(40, 'Kode pengaduan tidak valid.'),
  }),
};

export const listComplaintsSchema = {
  query: z.object({
    type: z.enum(COMPLAINT_TYPES, { error: 'Jenis pengaduan tidak valid.' }),
    page: z.coerce.number().int().min(1).default(1),
    limit: z.coerce.number().int().min(1).max(100).default(10),
    status: z.enum(COMPLAINT_STATUSES).optional(),
    search: z.string().trim().max(100).optional(),
  }),
};

export const acceptComplaintSchema = {
  body: z.object({
    catatan: z.string().trim().max(2000, 'Catatan maksimal 2000 karakter.').optional().default(''),
  }),
};

export const rejectComplaintSchema = {
  body: z.object({
    alasan: text('Alasan penolakan', 10, 2000),
  }),
};

// Perubahan status selama penanganan (Selesai hanya melalui laporan akhir)
export const updateComplaintStatusSchema = {
  body: z.object({
    status: z.enum(['DALAM_PROSES', 'MENUNGGU_TINDAK_LANJUT'], { error: 'Status tujuan tidak valid.' }),
    keterangan: text('Keterangan perubahan status', 5, 2000),
  }),
};

export const finalReportSchema = {
  body: z.object({
    hasil: text('Hasil penanganan', 5, 255),
    keterangan: text('Keterangan atau penjelasan', 10, 5000),
    tanggal_selesai: z.string({ error: 'Tanggal penyelesaian wajib diisi.' }).trim()
      .regex(/^\d{4}-\d{2}-\d{2}$/, 'Tanggal penyelesaian wajib diisi (format YYYY-MM-DD).'),
  }),
};
