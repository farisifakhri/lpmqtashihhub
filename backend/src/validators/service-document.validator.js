import { z } from 'zod';

export const SERVICE_DOCUMENT_CATEGORIES = [
  'Panduan Memohon Surat Tanda Tashih',
  'Pedoman Pentashihan Mushaf Al-Qur’an',
  'Produk LPMQ',
  'Permohonan Master Mushaf Al-Qur’an',
  'Mushaf Standar Indonesia',
  'Mushaf Isyarat',
];

const categorySchema = z.enum(SERVICE_DOCUMENT_CATEGORIES);

function parsePage(value, fallback) {
  if (value === undefined || value === '') return fallback;
  const parsed = Number.parseInt(value, 10);
  return Number.isNaN(parsed) ? value : parsed;
}

function parsePublished(value) {
  if (value === undefined || value === '' || value === 'ALL') return undefined;
  if (value === 'true' || value === '1' || value === true) return true;
  if (value === 'false' || value === '0' || value === false) return false;
  return value;
}

export const createServiceDocumentSchema = {
  body: z.object({
    title: z.string().trim().min(3, 'Judul dokumen minimal 3 karakter.').max(255),
    category: categorySchema,
    is_published: z.preprocess(parsePublished, z.boolean().optional()),
  }),
};

export const updateServiceDocumentSchema = {
  body: z.object({
    title: z.string().trim().min(3, 'Judul dokumen minimal 3 karakter.').max(255).optional(),
    category: categorySchema.optional(),
    is_published: z.preprocess(parsePublished, z.boolean().optional()),
  }).refine((value) => Object.keys(value).length > 0, 'Isi setidaknya satu data yang akan diperbarui.'),
};

export const listServiceDocumentsSchema = {
  query: z.object({
    page: z.preprocess((value) => parsePage(value, 1), z.number().int().positive()),
    limit: z.preprocess((value) => parsePage(value, 10), z.number().int().positive().max(100)),
    category: categorySchema.optional(),
    is_published: z.preprocess(parsePublished, z.boolean().optional()),
  }),
};

export const serviceDocumentIdSchema = {
  params: z.object({ id: z.string().uuid() }),
};
