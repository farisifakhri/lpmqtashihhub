import { z } from 'zod';

// Daftar master mushaf Al-Qur'an LPMQ yang dapat dimohon masyarakat.
// `kode` disimpan pada data permohonan; `label` ikut disalin agar riwayat tetap terbaca bila daftar berubah.
export const MASTER_MUSHAF_TYPES = [
  { kode: 'YASIN_TAHLIL', label: 'Yasin dan Tahlil' },
  { kode: 'PANDUAN_BELAJAR_ISYARAT', label: "Panduan Belajar Membaca Mushaf Al-Qur'an Isyarat" },
  { kode: 'JUZ_AMMA_ISYARAT_KITABAH', label: 'Juz Amma Isyarat Metode Kitabah' },
  { kode: 'MUSHAF_30_JUZ_USMAN_TOHA', label: 'Mushaf 30 Juz Khat Usman Toha' },
  { kode: 'MUSHAF_30_JUZ_ISEP_MISBAH_TAJWID', label: 'Mushaf 30 Juz Khat Isep Misbah Tajwid Warna' },
  { kode: 'MUSHAF_TERJEMAH_ISEP_MISBAH', label: 'Mushaf Terjemah Khat Isep Misbah' },
  { kode: 'MUSHAF_30_JUZ_ISEP_MISBAH', label: 'Mushaf 30 Juz Khat Isep Misbah' },
  { kode: 'MUSHAF_BRAILLE_TERJEMAH', label: "Mushaf Al-Qur'an dalam Huruf Arab Braille dan Terjemahnya" },
  { kode: 'JUZ_AMMA_ISYARAT_TILAWAH', label: 'Juz Amma Isyarat Metode Tilawah' },
  { kode: 'PEDOMAN_ISYARAT_PDSRW', label: "Pedoman Membaca Mushaf Al-Qur'an Isyarat bagi PDSRW" },
  { kode: 'MUSHAF_ISYARAT_30_JUZ_KITABAH', label: "Mushaf Al-Qur'an Isyarat 30 Juz Metode Kitabah" },
  { kode: 'PEDOMAN_BRAILLE', label: "Pedoman Membaca dan Menulis Al-Qur'an Braille" },
  { kode: 'MUSHAF_ISYARAT_30_JUZ_TILAWAH', label: "Mushaf Al-Qur'an Isyarat 30 Juz Metode Tilawah" },
];

// Alur: DIAJUKAN (penerbit) -> MENUNGGU_TTE (admin mengajukan surat ke Kepala) -> DITANDATANGANI (Kepala, TTE)
// -> DIKIRIM (admin mengirim surat ke penerbit). Admin dapat menolak selama masih DIAJUKAN.
export const MASTER_REQUEST_STATUSES = ['DIAJUKAN', 'MENUNGGU_TTE', 'DITANDATANGANI', 'DIKIRIM', 'DITOLAK'];

export const DEFAULT_LETTER_SUBJECT = "Persetujuan Permohonan Master Mushaf Al-Qur'an";

// Batas ukuran tiap berkas PDF sesuai formulir (500 KB)
export const MASTER_REQUEST_MAX_FILE_BYTES = 500 * 1024;

const text = (label, min, max) => z
  .string({ error: `${label} wajib diisi.` })
  .trim()
  .min(min, min <= 1 ? `${label} wajib diisi.` : `${label} minimal ${min} karakter.`)
  .max(max, `${label} maksimal ${max} karakter.`);

export const createMasterRequestSchema = {
  body: z.object({
    nama_pemohon: text('Nama pemohon', 3, 255),
    alamat: text('Alamat pemohon', 10, 1000),
    provinsi_kode: z.string({ error: 'Provinsi wajib dipilih.' }).trim().regex(/^\d{2}$/, 'Provinsi wajib dipilih.'),
    kabupaten_kode: z.string({ error: 'Kota/kabupaten wajib dipilih.' }).trim().regex(/^\d{2}\.\d{2}$/, 'Kota/kabupaten wajib dipilih.'),
    kecamatan_kode: z.string({ error: 'Kecamatan wajib dipilih.' }).trim().regex(/^\d{2}\.\d{2}\.\d{2}$/, 'Kecamatan wajib dipilih.'),
    kode_pos: z.string({ error: 'Kode pos wajib diisi.' }).trim().regex(/^\d{5}$/, 'Kode pos harus 5 digit angka.'),
    telepon: z.string({ error: 'Nomor telepon wajib diisi.' }).trim()
      .regex(/^(\+62|62|0)[0-9]{8,14}$/, 'Nomor telepon tidak valid (contoh: 081234567890).'),
    email: z.string({ error: 'Email wajib diisi.' }).trim().toLowerCase()
      .email('Format alamat email tidak valid.').max(255, 'Email maksimal 255 karakter.'),
    lembaga: text('Lembaga pemohon', 3, 255),
    jenis_mushaf: z.string({ error: "Jenis mushaf Al-Qur'an wajib dipilih." })
      .refine((value) => MASTER_MUSHAF_TYPES.some((type) => type.kode === value), "Jenis mushaf Al-Qur'an wajib dipilih."),
    penggunaan: text("Penggunaan master mushaf Al-Qur'an", 10, 2000),
    pernyataan: z.union([z.literal('true'), z.literal(true)], { error: 'Anda wajib menyetujui pernyataan sebelum mengirim permohonan.' }).transform(() => true),
  }),
};

export const listMasterRequestsSchema = {
  query: z.object({
    page: z.coerce.number().int().min(1).default(1),
    limit: z.coerce.number().int().min(1).max(100).default(10),
    status: z.enum(MASTER_REQUEST_STATUSES).optional(),
    search: z.string().trim().max(100).optional(),
  }),
};

export const rejectMasterRequestSchema = {
  body: z.object({
    alasan: text('Alasan penolakan', 5, 2000),
  }),
};

// Surat persetujuan yang disusun admin lalu diajukan ke Kepala LPMQ untuk TTE
export const masterLetterSchema = {
  body: z.object({
    perihal: z.string().trim().max(255, 'Perihal maksimal 255 karakter.').optional().nullable()
      .transform((value) => value || DEFAULT_LETTER_SUBJECT),
    isi: text('Isi surat', 20, 5000),
  }),
};
