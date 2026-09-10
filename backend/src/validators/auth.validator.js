import { z } from 'zod';

export const loginSchema = {
  body: z.object({
    email: z.string().email('Format email tidak valid'),
    password: z.string().min(6, 'Password minimal 6 karakter'),
  }),
};

export const registerPublisherSchema = {
  body: z.object({
    name: z.string().min(3, 'Nama penanggung jawab minimal 3 karakter'),
    email: z.string().email('Format email tidak valid'),
    password: z.string().min(8, 'Password minimal 8 karakter'),
    legal_name: z.string().min(3, 'Nama badan hukum/perusahaan wajib diisi'),
    entity_type: z.enum(['PT', 'CV', 'YAYASAN', 'PERORANGAN', 'LAINNYA'], {
      errorMap: () => ({ message: 'Jenis badan hukum tidak valid' }),
    }),
    address: z.string().optional(),
    phone: z.string().optional(),
  }),
};
