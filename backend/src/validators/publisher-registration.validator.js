import { z } from 'zod';

export const PUBLISHER_TYPES = ['PERUSAHAAN', 'YAYASAN', 'LEMBAGA_PEMERINTAH'];
export const PUBLISHER_REGISTRATION_STATUSES = ['DIAJUKAN', 'PERLU_PERBAIKAN', 'DISETUJUI', 'DITOLAK'];
export const PUBLISHER_REGISTRATION_DOC_TYPES = [
  'SURAT_PENDAFTARAN',
  'AKTA_NOTARIS',
  'PROFIL',
  'NPWP',
  'NIB',
  'KTP_PENANGGUNG_JAWAB',
];

export const publisherTypeSchema = z.enum(PUBLISHER_TYPES, {
  errorMap: () => ({ message: 'Jenis penerbit harus salah satu dari: PERUSAHAAN, YAYASAN, LEMBAGA_PEMERINTAH' }),
});

export const publisherRegistrationStatusSchema = z.enum(PUBLISHER_REGISTRATION_STATUSES, {
  errorMap: () => ({ message: 'Status pendaftaran tidak valid' }),
});

export const publisherRegistrationDocumentTypeSchema = z.enum(PUBLISHER_REGISTRATION_DOC_TYPES, {
  errorMap: () => ({ message: 'Tipe dokumen pendaftaran tidak valid' }),
});

/**
 * Menghitung nilai kolom pembantu indeks unik parsial untuk MySQL.
 * Nilai menjadi NULL jika status pendaftaran adalah DITOLAK.
 */
export function computeActiveIdentifiers(status, npwp, nib) {
  const isRejected = status === 'DITOLAK';
  const cleanNpwp = npwp ? String(npwp).trim() : null;
  const cleanNib = nib && String(nib).trim() ? String(nib).trim() : null;

  return {
    active_npwp: isRejected ? null : cleanNpwp,
    active_nib: isRejected ? null : cleanNib,
  };
}

export const createPublisherRegistrationSchema = {
  body: z.object({
    nama_penerbit: z.string().trim().min(3, 'Nama penerbit minimal 3 karakter').max(150, 'Nama penerbit maksimal 150 karakter'),
    jenis_penerbit: publisherTypeSchema,
    alamat_lengkap: z.string().trim().min(10, 'Alamat lengkap minimal 10 karakter').max(500, 'Alamat lengkap maksimal 500 karakter'),
    nama_penanggung_jawab: z.string().trim().min(3, 'Nama penanggung jawab minimal 3 karakter').max(100, 'Nama penanggung jawab maksimal 100 karakter'),
    telepon_penanggung_jawab: z.string().trim().min(9, 'Nomor telepon minimal 9 digit').max(20, 'Nomor telepon maksimal 20 karakter'),
    email: z.string().trim().toLowerCase().email('Format email tidak valid'),
    password: z.string()
      .min(8, 'Kata sandi minimal 8 karakter')
      .regex(/[A-Z]/, 'Kata sandi harus mengandung minimal satu huruf kapital')
      .regex(/[0-9]/, 'Kata sandi harus mengandung minimal satu angka'),
    npwp: z.string().trim().min(15, 'NPWP minimal 15 digit').max(20, 'NPWP maksimal 20 karakter'),
    nib: z.string().trim().min(13, 'NIB minimal 13 karakter').max(20, 'NIB maksimal 20 karakter').optional().nullable(),
  }),
};

export const checkPublisherRegistrationStatusSchema = {
  body: z
    .object({
      kode_pendaftaran: z.string().trim().optional(),
      email: z.string().trim().optional(),
      identifier: z.string().trim().optional(),
    })
    .refine(
      (data) => Boolean((data.identifier && data.identifier.length > 0) || (data.kode_pendaftaran && data.kode_pendaftaran.length > 0) || (data.email && data.email.length > 0)),
      {
        message: 'Masukkan kode pendaftaran resmi atau alamat email yang didaftarkan.',
        path: ['identifier'],
      }
    ),
};

export const decisionPublisherRegistrationSchema = {
  body: z.object({
    keputusan: z.enum(['SETUJUI', 'PERLU_PERBAIKAN', 'TOLAK'], {
      errorMap: () => ({ message: 'Keputusan harus salah satu dari: SETUJUI, PERLU_PERBAIKAN, TOLAK' }),
    }),
    alasan: z.string().trim().max(1000, 'Alasan maksimal 1000 karakter').optional().nullable(),
    versi: z.number().int().positive('Parameter versi harus bilangan bulat positif'),
  }).refine(data => {
    if (data.keputusan !== 'SETUJUI' && (!data.alasan || data.alasan.trim() === '')) {
      return false;
    }
    return true;
  }, {
    message: 'Alasan wajib diisi jika keputusan adalah PERLU_PERBAIKAN atau TOLAK',
    path: ['alasan'],
  }),
};

export const adminEditRegistrationSchema = {
  body: z.object({
    name: z.string().trim().min(3, 'Nama penerbit minimal 3 karakter').max(255).optional(),
    publisher_type: z.enum(['SWASTA', 'INSTANSI_PEMERINTAH', 'YAYASAN_LEMBAGA', 'PERORANGAN']).optional(),
    address: z.string().trim().max(500).optional(),
    pic_name: z.string().trim().max(255).optional(),
    pic_phone: z.string().trim().max(50).optional(),
    email: z.string().trim().email('Format email tidak valid').max(255).optional(),
    npwp: z.string().trim().max(50).optional(),
    nib: z.string().trim().max(50).optional().nullable(),
    reason: z.string().trim().min(10, 'Alasan perubahan data wajib diisi minimal 10 karakter'),
  }),
};

