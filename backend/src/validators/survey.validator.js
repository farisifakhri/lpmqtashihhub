import { z } from 'zod';

const KIND = z.enum(['IKM', 'IPAK', 'LAINNYA'], { message: 'Jenis harus IKM, IPAK, atau Lainnya.' });
const idParams = { params: z.object({ id: z.string().uuid('ID tidak valid.') }) };

export const unsurIdSchema = idParams;
export const questionIdSchema = idParams;
export const surveyIdSchema = idParams;

export const listUnsurSchema = {
  query: z.object({ kind: KIND.optional(), include_archived: z.enum(['true', 'false']).optional() }),
};

const unsurBody = z.object({
  code: z.string().trim().min(1, 'Kode unsur wajib diisi.').max(30, 'Kode unsur maksimal 30 karakter.'),
  name: z.string().trim().min(3, 'Nama unsur minimal 3 karakter.').max(255, 'Nama unsur maksimal 255 karakter.'),
  kind: KIND.default('IKM'),
  is_archived: z.boolean().optional(),
});

export const createUnsurSchema = { body: unsurBody };
export const updateUnsurSchema = { ...idParams, body: unsurBody.partial() };

const optionBody = z.object({
  label: z.string().trim().min(1, 'Label opsi wajib diisi.').max(150, 'Label opsi maksimal 150 karakter.'),
  value: z.coerce.number().int().min(1, 'Nilai opsi antara 1 dan 4.').max(4, 'Nilai opsi antara 1 dan 4.'),
});

const questionBody = z.object({
  text: z.string().trim().min(5, 'Teks pertanyaan minimal 5 karakter.').max(2000, 'Teks pertanyaan maksimal 2000 karakter.'),
  type: z.enum(['PILIHAN', 'ESAI'], { message: 'Tipe pertanyaan harus Pilihan atau Esai.' }),
  options: z.array(optionBody).max(10, 'Maksimal 10 opsi jawaban.').default([]),
});

export const listQuestionsSchema = {
  query: z.object({ search: z.string().trim().max(191).optional(), type: z.enum(['PILIHAN', 'ESAI']).optional() }),
};
export const createQuestionSchema = { body: questionBody };
export const updateQuestionSchema = { ...idParams, body: questionBody };

const surveyBody = z.object({
  name: z.string().trim().min(3, 'Nama survei minimal 3 karakter.').max(255, 'Nama survei maksimal 255 karakter.'),
  kind: KIND.default('IKM'),
  description: z.string().trim().max(5000, 'Pengantar maksimal 5000 karakter.').optional().nullable(),
  starts_at: z.coerce.date({ message: 'Tanggal mulai tidak valid.' }),
  ends_at: z.coerce.date({ message: 'Tanggal selesai tidak valid.' }),
});

export const listSurveysSchema = {
  query: z.object({ search: z.string().trim().max(191).optional(), status: z.enum(['DRAFT', 'AKTIF', 'NONAKTIF']).optional() }),
};
export const createSurveySchema = {
  body: surveyBody.refine((b) => b.ends_at >= b.starts_at, { message: 'Tanggal selesai tidak boleh sebelum tanggal mulai.', path: ['ends_at'] }),
};
export const updateSurveySchema = { ...idParams, body: surveyBody.partial() };

export const setSurveyItemsSchema = {
  ...idParams,
  body: z.object({
    items: z.array(z.object({
      unsur_id: z.string().uuid('Unsur tidak valid.'),
      question_id: z.string().uuid('Pertanyaan tidak valid.'),
    })).max(200, 'Maksimal 200 pertanyaan per survei.'),
  }),
};

export const listResponsesSchema = {
  ...idParams,
  query: z.object({
    page: z.coerce.number().int().min(1).default(1),
    limit: z.coerce.number().int().min(1).max(100).default(20),
  }),
};
