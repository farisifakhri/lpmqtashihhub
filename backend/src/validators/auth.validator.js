import { z } from 'zod';

export const loginSchema = {
  body: z.object({
    email: z.string().trim().toLowerCase().email('Format email tidak valid'),
    password: z.string().min(1, 'Password wajib diisi'),
  }),
};

export const registerPublisherSchema = {
  body: z.object({
    name: z.string().min(3, 'Nama penanggung jawab minimal 3 karakter'),
    email: z.string().trim().toLowerCase().email('Format email tidak valid'),
    password: z.string()
      .min(8, 'Kata sandi minimal 8 karakter')
      .regex(/[A-Z]/, 'Kata sandi harus mengandung minimal satu huruf kapital')
      .regex(/[0-9]/, 'Kata sandi harus mengandung minimal satu angka'),
    legal_name: z.string().min(3, 'Nama badan hukum/perusahaan wajib diisi'),
    entity_type: z.enum(['PT', 'CV', 'YAYASAN', 'PERORANGAN', 'LAINNYA'], {
      errorMap: () => ({ message: 'Jenis badan hukum tidak valid' }),
    }),
    address: z.string().optional(),
    phone: z.string().optional(),
  }),
};

export const forgotPasswordSchema = {
  body: z.object({
    email: z.string().trim().toLowerCase().email('Format email tidak valid'),
  }),
};

export const resetPasswordSchema = {
  body: z.object({
    token: z.string().min(1, 'Token reset kata sandi wajib disertakan'),
    new_password: z.string()
      .min(8, 'Kata sandi baru minimal 8 karakter')
      .regex(/[A-Z]/, 'Kata sandi baru harus mengandung minimal satu huruf kapital')
      .regex(/[0-9]/, 'Kata sandi baru harus mengandung minimal satu angka'),
  }),
};

export const changePasswordSchema = {
  body: z.object({
    current_password: z.string().min(1, 'Kata sandi saat ini wajib diisi'),
    new_password: z.string()
      .min(8, 'Kata sandi baru minimal 8 karakter')
      .regex(/[A-Z]/, 'Kata sandi baru harus mengandung minimal satu huruf kapital')
      .regex(/[0-9]/, 'Kata sandi baru harus mengandung minimal satu angka'),
  }),
};

