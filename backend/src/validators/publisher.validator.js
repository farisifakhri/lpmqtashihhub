import { z } from 'zod';

export const updatePublisherProfileSchema = {
  body: z.object({
    legal_name: z.string().min(3).optional(),
    entity_type: z.enum(['PT', 'CV', 'YAYASAN', 'PERORANGAN', 'LAINNYA']).optional(),
    address: z.string().optional(),
    phone: z.string().optional(),
  }),
};

export const verifyPublisherSchema = {
  body: z.object({
    verification_status: z.enum(['VERIFIED', 'REJECTED'], {
      errorMap: () => ({ message: 'Status verifikasi harus VERIFIED atau REJECTED' }),
    }),
    notes: z.string().optional(),
  }),
};
