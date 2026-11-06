import { z } from 'zod';

const KIND = z.enum(['IKM', 'IPAK', 'LAINNYA'], { message: 'Jenis harus IKM, IPAK, atau Lainnya.' });
const idParams = { params: z.object({ id: z.string().uuid('ID tidak valid.') }) };

// Hapus paksa: ?force=true menghapus sekalian data yang menguncinya (lihat service).
const forceQuery = { query: z.object({ force: z.enum(['true', 'false']).optional() }) };
export const unsurIdSchema = { ...idParams, ...forceQuery };
export const reorderSchema = {
  body: z.object({ ids: z.array(z.string().uuid('ID tidak valid.')).min(1, 'Daftar urutan kosong.').max(500) }),
};
export const questionIdSchema = { ...idParams, ...forceQuery };
export const surveyIdSchema = { ...idParams, ...forceQuery };

export const listUnsurSchema = {
  query: z.object({ kind: KIND.optional(), include_archived: z.enum(['true', 'false']).optional() }),
};

const unsurBody = z.object({
  // Kode dan jenis tidak lagi diisi di form; kode hanya dipakai unsur baku (A–I), jenis default IKM di database.
  code: z.preprocess((v) => (v === '' ? null : v), z.string().trim().max(30, 'Kode unsur maksimal 30 karakter.').nullable().optional()),
  name: z.string().trim().min(3, 'Nama unsur minimal 3 karakter.').max(255, 'Nama unsur maksimal 255 karakter.'),
  kind: KIND.optional(),
  definition: z.string().trim().max(2000, 'Definisi maksimal 2000 karakter.').optional().nullable(),
  is_archived: z.boolean().optional(),
  // Opsional: unsur khusus survei ini; kosong = unsur umum.
  survey_id: z.preprocess((x) => (x === '' ? null : x), z.string().uuid('Survei tidak valid.').nullable().optional()),
});

export const createUnsurSchema = { body: unsurBody };
// Tanpa default agar pembaruan sebagian (mis. arsipkan) tidak mengubah jenis unsur.
export const updateUnsurSchema = { ...idParams, body: unsurBody.partial() };

const optionBody = z.object({
  label: z.string().trim().min(1, 'Label opsi wajib diisi.').max(150, 'Label opsi maksimal 150 karakter.'),
  value: z.coerce.number().int().min(1, 'Nilai opsi antara 1 dan 4.').max(4, 'Nilai opsi antara 1 dan 4.'),
});

const questionBody = z.object({
  text: z.string().trim().min(5, 'Teks pertanyaan minimal 5 karakter.').max(2000, 'Teks pertanyaan maksimal 2000 karakter.'),
  type: z.enum(['PILIHAN', 'ESAI'], { message: 'Tipe pertanyaan harus Pilihan atau Esai.' }),
  unsur_id: z.string({ message: 'Pilih unsur untuk pertanyaan ini.' }).uuid('Pilih unsur untuk pertanyaan ini.'),
  // Opsional: langsung masukkan pertanyaan ke susunan survei ini.
  survey_id: z.preprocess((x) => (x === '' ? null : x), z.string().uuid('Survei tidak valid.').nullable().optional()),
  options: z.array(optionBody).max(10, 'Maksimal 10 opsi jawaban.').default([]),
});

export const listQuestionsSchema = {
  query: z.object({ search: z.string().trim().max(191).optional(), type: z.enum(['PILIHAN', 'ESAI']).optional(), unsur_id: z.string().uuid().optional() }),
};
export const createQuestionSchema = { body: questionBody };
export const updateQuestionSchema = { ...idParams, body: questionBody };

const STATUS = z.enum(['DRAFT', 'AKTIF', 'NONAKTIF'], { message: 'Status harus Pending, Aktif, atau Expired.' });
const optionalDate = (label) => z.preprocess((v) => (v === '' ? null : v), z.coerce.date({ message: `${label} tidak valid.` }).nullable().optional());

// Seperti sistem lama, survei cukup punya nama (topik) dan status; jenis, periode, dan pengantar opsional.
const surveyBody = z.object({
  name: z.string().trim().min(3, 'Nama survei minimal 3 karakter.').max(255, 'Nama survei maksimal 255 karakter.'),
  status: STATUS.default('DRAFT'),
  kind: KIND.default('IKM'),
  description: z.string().trim().max(5000, 'Pengantar maksimal 5000 karakter.').optional().nullable(),
  starts_at: optionalDate('Tanggal mulai'),
  ends_at: optionalDate('Tanggal selesai'),
});

const periodOrder = (b) => !b.starts_at || !b.ends_at || b.ends_at >= b.starts_at;
const periodMessage = { message: 'Tanggal selesai tidak boleh sebelum tanggal mulai.', path: ['ends_at'] };

export const listSurveysSchema = {
  query: z.object({ search: z.string().trim().max(191).optional(), status: STATUS.optional() }),
};
export const createSurveySchema = { body: surveyBody.refine(periodOrder, periodMessage) };
export const updateSurveySchema = {
  ...idParams,
  // Tanpa default agar pembaruan sebagian tidak menimpa status/jenis yang sudah ada.
  body: surveyBody.extend({ status: STATUS.optional(), kind: KIND.optional() }).partial().refine(periodOrder, periodMessage),
};

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
