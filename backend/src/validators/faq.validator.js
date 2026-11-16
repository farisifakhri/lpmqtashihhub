import { z } from 'zod';

export const FAQ_CATEGORIES = [
  'LAYANAN_TASHIH_ONLINE',
  'MUSHAF_STANDAR_INDONESIA',
  'REGULASI',
];

const category = z.enum(FAQ_CATEGORIES);
const question = z.string().trim().min(3, 'Pertanyaan minimal 3 karakter.').max(255, 'Pertanyaan maksimal 255 karakter.');
const answer = z.string().trim().min(1, 'Jawaban wajib diisi.').max(10_000, 'Jawaban maksimal 10.000 karakter.');
const published = z.preprocess((value) => {
  if (value === 'true' || value === '1') return true;
  if (value === 'false' || value === '0') return false;
  return value;
}, z.boolean());

export const listFaqsSchema = {
  query: z.object({
    page: z.preprocess((value) => value ? Number.parseInt(value, 10) : 1, z.number().int().positive().default(1)),
    limit: z.preprocess((value) => value ? Number.parseInt(value, 10) : 10, z.number().int().positive().max(100).default(10)),
    search: z.string().trim().max(255).optional(),
    category: category.optional(),
    is_published: z.preprocess((value) => {
      if (value === undefined || value === '' || value === 'ALL') return undefined;
      if (value === 'true' || value === '1') return true;
      if (value === 'false' || value === '0') return false;
      return value;
    }, z.boolean().optional()),
  }),
};

export const createFaqSchema = {
  body: z.object({
    category,
    question,
    answer,
    is_published: published.optional().default(false),
  }).strict(),
};

export const updateFaqSchema = {
  body: z.object({
    category: category.optional(),
    question: question.optional(),
    answer: answer.optional(),
    is_published: published.optional(),
  }).strict().refine((value) => Object.keys(value).length > 0, 'Minimal satu perubahan harus dikirim.'),
};

export const faqIdSchema = {
  params: z.object({
    id: z.string().uuid('ID FAQ tidak valid.'),
  }),
};
