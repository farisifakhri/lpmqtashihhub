import { z } from 'zod';

export const REGULATION_CATEGORIES = [
  'Ketentuan Pentashihan',
  'Peraturan Menteri Agama RI',
  'Peraturan Pemerintah Republik Indonesia',
  'Siaran Pers LPMQ',
  'SK Kepala Badan Litbang dan Diklat Kementerian Agama RI',
  'SK Kepala Lajnah Pentashihan Mushaf Al-Qur\'an',
  'Surat Edaran Kepala Lajnah Pentashihan Mushaf Al-Qur\'an',
];

export const regulationCategorySchema = z.enum(REGULATION_CATEGORIES, {
  errorMap: () => ({ message: 'Kategori dokumen harus salah satu dari 7 kategori resmi yang telah ditentukan.' }),
});

export const createRegulationSchema = {
  body: z.object({
    title: z.string({ required_error: 'Judul dokumen wajib diisi.' })
      .trim()
      .min(3, 'Judul dokumen minimal 3 karakter.')
      .max(255, 'Judul dokumen maksimal 255 karakter.'),
    category: regulationCategorySchema,
    document_number: z.string({ required_error: 'Nomor dokumen wajib diisi.' })
      .trim()
      .min(1, 'Nomor dokumen tidak boleh kosong.')
      .max(100, 'Nomor dokumen maksimal 100 karakter.'),
    is_published: z.preprocess((val) => {
      if (val === undefined || val === null || val === '') return true;
      if (typeof val === 'string') return val === 'true' || val === '1';
      return Boolean(val);
    }, z.boolean()).optional(),
  }),
};

export const updateRegulationSchema = {
  body: z.object({
    title: z.string().trim().min(3, 'Judul dokumen minimal 3 karakter.').max(255, 'Judul dokumen maksimal 255 karakter.').optional(),
    category: regulationCategorySchema.optional(),
    document_number: z.string().trim().min(1, 'Nomor dokumen tidak boleh kosong.').max(100, 'Nomor dokumen maksimal 100 karakter.').optional(),
    is_published: z.preprocess((val) => {
      if (val === undefined || val === null || val === '') return undefined;
      if (typeof val === 'string') return val === 'true' || val === '1';
      return Boolean(val);
    }, z.boolean().optional()),
  }),
};

export const listRegulationQuerySchema = {
  query: z.object({
    page: z.preprocess((val) => (val ? parseInt(val, 10) : 1), z.number().int().positive().default(1)),
    limit: z.preprocess((val) => (val ? parseInt(val, 10) : 10), z.number().int().positive().default(10)),
    category: z.string().trim().optional(),
    search: z.string().trim().optional(),
  }),
};

