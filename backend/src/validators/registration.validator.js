import { z } from 'zod';

export const createRegistrationSchema = {
  body: z
    .object({
      publisher_id: z.string().uuid().optional(), // Diisi jika admin membuat atas nama penerbit
      service_type_id: z.string().uuid('ID Layanan tidak valid').optional(),
      title: z.string().min(3, 'Judul mushaf wajib diisi').optional(),
      manuscripts: z.array(z.object({ title: z.string().min(3, 'Judul naskah minimal 3 karakter') })).optional(),
      registration_type: z.enum(['NEW', 'EXTENSION', 'FOREIGN_MANUSCRIPT']).default('NEW'),
      registration_category: z.enum(['NEW', 'EXTENSION', 'FOREIGN_MANUSCRIPT']).optional(),
      foreign_metadata: z.record(z.any()).optional().nullable(),
      mushaf_details: z.record(z.any()).optional().nullable(),
      cover_file_id: z.string().uuid().optional().nullable(),
      surat_permohonan_file_id: z.string().uuid().optional().nullable(),
      surat_pernyataan_perubahan_file_id: z.string().uuid().optional().nullable(),
      apk_file_id: z.string().uuid().optional().nullable(),
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
    type: z.enum(['COVER', 'SAMPLE_PAGE_1_5', 'DUMMY', 'MASTER_COMPLETED']),
    file_id: z.string().uuid('Gunakan ID hasil endpoint unggah berkas.'),
  }).strict(),
};
