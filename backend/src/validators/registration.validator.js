import { z } from 'zod';

export const createRegistrationSchema = {
  body: z.object({
    publisher_id: z.string().uuid().optional(), // Diisi jika admin membuat atas nama penerbit
    service_type_id: z.string().uuid('ID Layanan tidak valid'),
    title: z.string().min(3, 'Judul mushaf wajib diisi'),
    registration_type: z.enum(['NEW', 'EXTENSION']).default('NEW'),
    previous_registration_id: z.string().uuid().optional().nullable(),
    addons: z.array(z.string().uuid()).optional().default([]),
  }),
};

export const transitionStatusSchema = {
  body: z.object({
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
