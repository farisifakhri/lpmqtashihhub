import { z } from 'zod';

const params = z.object({ id: z.string().uuid() });
export const emptyAction = { params, body: z.object({}).strict() };
export const confirmPaymentSchema = { params, body: z.object({
  receipt_file_id: z.string().uuid(), external_ref: z.string().trim().min(1).max(191).optional(),
}).strict() };
export const assignmentSchema = { params, body: z.object({
  team_id: z.string().min(1).max(191), assignee_ids: z.array(z.string().uuid()).min(1).max(50),
  stage: z.enum(['INITIAL', 'REVISION', 'DUMMY']),
}).strict().refine(data => new Set(data.assignee_ids).size === data.assignee_ids.length, 'Anggota tidak boleh duplikat.') };
export const reviewSchema = { params, body: z.object({
  result: z.enum(['PASSED', 'REVISION_REQUIRED', 'REJECTED']), notes: z.string().trim().min(1).max(10000),
}).strict() };
export const documentSchema = { params, body: z.object({ document_type: z.enum(['BERITA_ACARA_TASHIH', 'SURAT_TANDA_TASHIH']) }).strict() };
const calendarDate = z.string().regex(/^\d{4}-\d{2}-\d{2}$/).refine(value => {
  const date = new Date(`${value}T00:00:00Z`);
  return Number.isFinite(date.getTime()) && date.toISOString().slice(0, 10) === value;
}, 'Tanggal tidak valid.');
export const calendarSchema = { body: z.object({ days: z.array(z.object({
  date: calendarDate, is_working_day: z.boolean(), source: z.string().trim().min(1).max(191), description: z.string().max(191).optional(),
}).strict()).min(1).max(366) }).strict() };
