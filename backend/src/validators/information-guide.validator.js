import { z } from 'zod';

const booleanFromQuery = z.preprocess((value) => {
  if (value === undefined || value === '') return undefined;
  if (value === 'true' || value === '1') return true;
  if (value === 'false' || value === '0') return false;
  return value;
}, z.boolean().optional());

const section = z.enum(['GUIDE', 'SOP', 'SIARAN_PERS']);

const guideFields = {
  title: z.string().trim().min(3, 'Judul panduan minimal 3 karakter.').max(255, 'Judul panduan maksimal 255 karakter.'),
  section: section.optional(),
  content_type: z.enum(['DOCUMENT', 'EDITOR']),
  content_html: z.string().max(80_000, 'Konten panduan terlalu panjang.').optional(),
  is_published: z.preprocess((value) => {
    if (value === undefined || value === null || value === '') return undefined;
    if (value === 'true' || value === '1') return true;
    if (value === 'false' || value === '0') return false;
    return value;
  }, z.boolean().optional()),
};

export const createInformationGuideSchema = {
  body: z.object(guideFields).strict(),
};

export const updateInformationGuideSchema = {
  body: z.object({
    title: guideFields.title.optional(),
    section: guideFields.section,
    content_type: guideFields.content_type.optional(),
    content_html: guideFields.content_html,
    is_published: guideFields.is_published,
  }).strict().refine((value) => Object.keys(value).length > 0, 'Minimal satu perubahan harus dikirim.'),
};

export const listInformationGuidesSchema = {
  query: z.object({
    page: z.preprocess((value) => value ? Number.parseInt(value, 10) : 1, z.number().int().positive().default(1)),
    limit: z.preprocess((value) => value ? Number.parseInt(value, 10) : 10, z.number().int().positive().max(100).default(10)),
    search: z.string().trim().max(255).optional(),
    is_published: booleanFromQuery,
    section: section.optional(),
  }),
};

export const informationGuideIdSchema = {
  params: z.object({
    id: z.string().uuid('ID panduan tidak valid.'),
  }),
  query: z.object({
    section: section.optional(),
  }),
};

export const informationGuideImageParamsSchema = {
  params: z.object({
    imageId: z.string().uuid('ID gambar tidak valid.'),
  }),
  query: z.object({
    section: section.optional(),
  }),
};
