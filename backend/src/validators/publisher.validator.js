import { z } from 'zod';

export const updatePublisherProfileSchema = {
  body: z.object({
    legal_name: z.string().min(3).optional(),
    entity_type: z.enum(['PT', 'CV', 'YAYASAN', 'LEMBAGA_PEMERINTAH', 'LAINNYA']).optional(),
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

export const adminEditPublisherSchema = {
  body: z.object({
    legal_name: z.string().trim().min(3, 'Nama badan hukum minimal 3 karakter').max(255).optional(),
    entity_type: z.enum(['PT', 'CV', 'YAYASAN', 'LEMBAGA_PEMERINTAH', 'PERORANGAN', 'LAINNYA']).optional(),
    address: z.string().trim().max(500).optional(),
    phone: z.string().trim().max(50).optional(),
    npwp: z.string().trim().max(50).optional(),
    nib: z.string().trim().max(50).optional().nullable(),
    reason: z.string().trim().min(10, 'Alasan perubahan data wajib diisi minimal 10 karakter'),
  }),
};

// Direktori penerbit (Super Admin): filter huruf awal, provinsi, atau kata kunci; limit dibatasi 100.
export const publisherDirectorySchema = {
  query: z.object({
    letter: z.string().trim().toUpperCase().regex(/^([A-Z]|#)$/, 'Huruf awal tidak valid').optional(),
    province: z.string().trim().max(60).optional(),
    search: z.string().trim().max(100).optional(),
    page: z.coerce.number().int().min(1).default(1),
    limit: z.coerce.number().int().min(1).max(100).default(20),
  }),
};
