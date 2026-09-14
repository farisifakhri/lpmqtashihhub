import { z } from 'zod';

export const createRegistrationSchema = {
  body: z
    .object({
      publisher_id: z.string().uuid().optional(), // Diisi jika admin membuat atas nama penerbit
      service_type_id: z.string().uuid('ID Layanan tidak valid'),
      title: z.string().min(3, 'Judul mushaf wajib diisi'),
      registration_type: z.enum(['NEW', 'EXTENSION']).default('NEW'),
      previous_registration_id: z.string().uuid('ID Pengajuan sebelumnya tidak valid').optional().nullable(),
      addons: z.array(z.string().uuid('ID Addon tidak valid')).optional(),
      addon_ids: z.array(z.string().uuid('ID Addon tidak valid')).optional(),
    })
    .superRefine((data, ctx) => {
      if (data.registration_type === 'EXTENSION') {
        if (!data.previous_registration_id) {
          ctx.addIssue({
            code: z.ZodIssueCode.custom,
            message: 'Pengajuan perpanjangan (EXTENSION) wajib menyertakan previous_registration_id.',
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

export const transitionStatusSchema = {
  body: z.object({
    from_status: z.string().max(64).optional(),
    to_status: z.enum([
      'DRAFT',
      'READY_FOR_VERIFICATION',
      'IN_VERIFICATION',
      'REVISION_REQUIRED',
      'WAITING_VERIFICATION_APPROVAL',
      'AWAITING_PAYMENT',
      'PAYMENT_VERIFICATION',
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
