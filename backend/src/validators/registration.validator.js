import { z } from 'zod';

export const manuscriptMetadataSchema = z
  .object({
    penulis_nama: z.string().trim().max(255).optional().nullable(),
    penerjemah_nama: z.string().trim().max(255).optional().nullable(),
    tahun_terbit: z.union([z.number().int().min(1900).max(2100), z.string().trim().regex(/^\d{4}$/)]).optional().nullable(),
    edisi: z.string().trim().max(100).optional().nullable(),
    jumlah_halaman: z.union([z.number().int().min(1).max(10000), z.string().regex(/^\d+$/)]).optional().nullable(),
    audio_durasi_menit: z.union([z.number().int().min(1).max(50000), z.string().regex(/^\d+$/)]).optional().nullable(),
    font_arab: z.string().trim().max(100).optional().nullable(),
    deskripsi: z.string().trim().max(2000).optional().nullable(),
    penanggung_jawab_produk: z.string().trim().max(255).optional().nullable(),
    penanggung_jawab_email: z.string().trim().email().optional().nullable(),
    nomor_pendaftaran_lama: z.string().trim().max(100).optional().nullable(),
    nama_percetakan: z.string().trim().max(255).optional().nullable(),
    jenis_mushaf: z.string().trim().max(100).optional().nullable(),
  })
  .strict('Metadata naskah mengandung properti yang tidak diizinkan');

export const manuscriptVariantSchema = z.object({
  ukuran: z.string().trim().min(1, 'Ukuran varian wajib diisi').max(50, 'Ukuran varian maksimal 50 karakter'),
  oplah: z.number().int('Oplah harus berupa bilangan bulat').min(1, 'Oplah minimal 1 eksemplar').max(10_000_000, 'Oplah maksimal 10.000.000'),
});

export const manuscriptInputSchema = z.object({
  seq_number: z.number().int().min(1).max(20).optional(),
  title: z.string().trim().min(3, 'Judul naskah minimal 3 karakter').max(255, 'Judul naskah maksimal 255 karakter'),
  items: z.array(z.string().trim().min(1, 'ID item jenis naskah tidak boleh kosong')).min(1, 'Minimal satu item jenis naskah harus dipilih').optional(),
  variants: z.array(manuscriptVariantSchema).max(10, 'Maksimal 10 varian per naskah').optional().default([]),
  metadata: manuscriptMetadataSchema.optional().nullable(),
  sample_file_id: z.string().uuid('ID berkas contoh naskah tidak valid').optional().nullable(),
});

export const safeRecordSchema = z
  .record(z.any())
  .refine((obj) => !obj || Object.keys(obj).length <= 50, {
    message: 'Jumlah properti metadata maksimal 50.',
  })
  .refine(
    (obj) => {
      if (!obj) return true;
      for (const [k, v] of Object.entries(obj)) {
        if (typeof k !== 'string' || k.length > 100) return false;
        if (typeof v === 'string' && v.length > 5000) return false;
      }
      return true;
    },
    { message: 'Ukuran properti atau nilai metadata melebihi batas aman.' }
  );

export const createRegistrationSchema = {
  body: z
    .object({
      publisher_id: z.string().uuid().optional(), // Diisi jika admin membuat atas nama penerbit
      service_type_id: z.string().uuid('ID Layanan tidak valid').optional(),
      title: z.string().trim().min(3, 'Judul mushaf minimal 3 karakter').optional(),
      manuscripts: z.array(manuscriptInputSchema).max(20, 'Maksimal 20 naskah per pendaftaran').optional(),
      registration_type: z.enum(['NEW', 'EXTENSION', 'FOREIGN_MANUSCRIPT']).default('NEW'),
      registration_category: z.enum(['NEW', 'EXTENSION', 'FOREIGN_MANUSCRIPT']).optional(),
      foreign_metadata: safeRecordSchema.optional().nullable(),
      mushaf_details: safeRecordSchema.optional().nullable(),
      cover_file_id: z.string().uuid().optional().nullable(),
      surat_permohonan_file_id: z.string().uuid().optional().nullable(),
      contoh_halaman_file_id: z.string().uuid().optional().nullable(),
      surat_pernyataan_perubahan_file_id: z.string().uuid().optional().nullable(),
      apk_file_id: z.string().uuid().optional().nullable(),
      apk_url: z.string().url('URL aplikasi mushaf digital harus valid (cth: https://...)').refine(
        (val) => { try { const u = new URL(val); return u.protocol === 'https:'; } catch { return false; } },
        { message: 'URL aplikasi mushaf digital harus menggunakan protokol HTTPS (bukan http://, javascript:, atau data:).' }
      ).optional().nullable(),
      bukti_tashih_file_id: z.string().uuid().optional().nullable(),
      surat_rekomendasi_file_id: z.string().uuid().optional().nullable(),
      statement_accepted: z.boolean().optional(),
      previous_registration_id: z.string().uuid('ID Pengajuan sebelumnya tidak valid').optional().nullable(),
      addons: z.array(z.string().uuid('ID Addon tidak valid')).optional(),
      addon_ids: z.array(z.string().uuid('ID Addon tidak valid')).optional(),
    })
    .superRefine((data, ctx) => {
      if (!data.title && (!data.manuscripts || data.manuscripts.length === 0)) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: 'Judul naskah mushaf wajib diisi.',
          path: ['title'],
        });
      }
      if (data.manuscripts && data.manuscripts.length > 20) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: 'Maksimal 20 naskah dalam satu pengajuan.',
          path: ['manuscripts'],
        });
      }
      const pjName = data.mushaf_details?.penanggung_jawab_produk || data.manuscripts?.[0]?.metadata?.penanggung_jawab_produk;
      if (typeof pjName !== 'string' || !pjName.trim()) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: 'Nama penanggung jawab produk/mushaf wajib diisi.',
          path: ['mushaf_details', 'penanggung_jawab_produk'],
        });
      }
      const pjEmail = data.mushaf_details?.penanggung_jawab_email || data.manuscripts?.[0]?.metadata?.penanggung_jawab_email;
      if (pjEmail && typeof pjEmail === 'string') {
        const emailTrimmed = pjEmail.trim();
        if (emailTrimmed && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(emailTrimmed)) {
          ctx.addIssue({
            code: z.ZodIssueCode.custom,
            message: 'Format email penanggung jawab tidak valid.',
            path: ['mushaf_details', 'penanggung_jawab_email'],
          });
        }
      }
      if (data.registration_type === 'EXTENSION') {
        const hasLegacyNo = data.foreign_metadata?.nomor_pendaftaran_lama || data.mushaf_details?.nomor_pendaftaran_lama;
        if (!data.previous_registration_id && !hasLegacyNo) {
          ctx.addIssue({
            code: z.ZodIssueCode.custom,
            message: 'Pengajuan perpanjangan (EXTENSION) wajib menyertakan previous_registration_id atau nomor pendaftaran lama.',
            path: ['previous_registration_id'],
          });
        }
      } else if (data.registration_type === 'NEW') {
        if (data.previous_registration_id) {
          ctx.addIssue({
            code: z.ZodIssueCode.custom,
            message: 'Pengajuan baru (NEW) tidak boleh menyertakan previous_registration_id.',
            path: ['previous_registration_id'],
          });
        }
      }
    }),
};

export const dispatchPhysicalSchema = {
  body: z.object({
    courier: z.string().optional(),
    tracking_no: z.string().optional(),
    dispatch_date: z.string().optional(),
    notes: z.string().optional(),
  }),
};

export const transitionStatusSchema = {
  body: z.object({
    from_status: z.string().max(64).optional(),
    to_status: z.enum([
      'DRAFT',
      'READY_FOR_VERIFICATION',
      'VERIFICATION_ASSIGNED',
      'IN_VERIFICATION',
      'REVISION_REQUIRED',
      'WAITING_VERIFICATION_APPROVAL',
      'VERIFICATION_APPROVED',
      'AWAITING_PAYMENT',
      'PAYMENT_VERIFICATION',
      'WAITING_DISTRIBUTOR_RECEIPT',
      'WAITING_DISTRIBUTION',
      'TASHIH_IN_PROGRESS',
      'READY_FOR_STT',
      'STT_ISSUED',
      'DOCUMENTATION_IN_PROGRESS',
      'COMPLETED',
      'CANCELLED',
    ]),
    notes: z.string().optional(),
  }),
};

export const createManuscriptFileSchema = {
  body: z.object({
    type: z.enum(['COVER', 'SAMPLE_PAGE_1_5', 'SAMPLE_PAGE', 'DUMMY', 'MASTER_COMPLETED']).transform((val) => val === 'SAMPLE_PAGE' ? 'SAMPLE_PAGE_1_5' : val),
    file_id: z.string().uuid('Gunakan ID hasil endpoint unggah berkas.'),
    manuscript_id: z.string().uuid('ID naskah tidak valid.').optional().nullable(),
  }).strict(),
};

export const registrationIdParamSchema = {
  params: z.object({
    id: z.string().uuid('ID permohonan tidak valid.'),
  }),
};
