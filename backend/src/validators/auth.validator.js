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
    entity_type: z.enum(['PT', 'CV', 'YAYASAN', 'LEMBAGA_PEMERINTAH', 'LAINNYA'], {
      errorMap: () => ({ message: 'Jenis badan hukum tidak valid' }),
    }),
    address: z.string().optional(),
    phone: z.string().optional(),
  }),
};

export const forgotPasswordSchema = {
  body: z.object({
    email: z.string().trim().toLowerCase().email('Format email tidak valid').optional(),
    phone: z.string().trim().min(8, 'Nomor WhatsApp tidak valid').max(30).optional(),
    method: z.enum(['email', 'whatsapp']).default('email'),
  }).superRefine((data, ctx) => {
    if (data.method === 'email' && !data.email) {
      ctx.addIssue({ code: 'custom', path: ['email'], message: 'Email wajib diisi.' });
    }
    if (data.method === 'whatsapp' && !data.phone) {
      ctx.addIssue({ code: 'custom', path: ['phone'], message: 'Nomor WhatsApp wajib diisi.' });
    }
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

