import { z } from 'zod';

const idParams = z.object({ id: z.string().uuid('ID pengajuan tidak valid.') });
export const registrationIdSchema = { params: idParams };
const dateTime = z.string().datetime({ offset: true });

export const declarePhysicalMasterSchema = {
  params: idParams,
  body: z.object({
    format: z.literal('A4'),
    binding_method: z.literal('PER_JUZ'),
    volume_count: z.number().int().min(1).max(100),
    sent_at: dateTime.optional(),
    delivery_method: z.string().trim().min(2).max(191).optional(),
    notes: z.string().trim().max(191).optional(),
  }).strict(),
};

export const receivePhysicalMasterSchema = {
  params: idParams,
  body: z.object({
    decision: z.enum(['RECEIVED', 'RETURNED']),
    receipt_no: z.string().trim().min(3).max(191).optional(),
    condition: z.string().trim().min(2).max(191),
    volume_count: z.number().int().min(1).max(100),
    notes: z.string().trim().max(191).optional(),
  }).strict().superRefine((data, ctx) => {
    if (data.decision === 'RECEIVED' && !data.receipt_no) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, path: ['receipt_no'], message: 'Nomor tanda terima wajib diisi saat master diterima.' });
    }
    if (data.decision === 'RETURNED' && !data.notes) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, path: ['notes'], message: 'Alasan pengembalian master wajib diisi.' });
    }
  }),
};

export const createVerificationAssignmentSchema = {
  params: idParams,
  body: z.object({
    verifier_id: z.string().uuid('ID verifikator tidak valid.'),
    nota_no: z.string().trim().min(3).max(191),
    notes: z.string().trim().max(191).optional(),
  }).strict(),
};

export const verificationInboxSchema = {
  query: z.object({
    status: z.enum(['ASSIGNED', 'IN_PROGRESS', 'COMPLETED']).optional(),
    my_tasks: z.enum(['true', 'false']).optional(),
    search: z.string().trim().max(191).optional(),
    page: z.coerce.number().int().min(1).default(1),
    limit: z.coerce.number().int().min(1).max(100).default(20),
  }),
};

const checklistItem = z.object({
  code: z.enum(['REGISTRATION_DATA', 'DIGITAL_FILES', 'PHYSICAL_MASTER', 'MANUSCRIPT_CONTENT']),
  result: z.enum(['SESUAI', 'TIDAK_SESUAI', 'TIDAK_BERLAKU']),
  notes: z.string().trim().max(1000).optional(),
}).strict().superRefine((item, ctx) => {
  if (item.result === 'TIDAK_SESUAI' && !item.notes) ctx.addIssue({ code: z.ZodIssueCode.custom, path: ['notes'], message: 'Catatan wajib diisi untuk butir yang tidak sesuai.' });
});

export const verificationDraftSchema = {
  params: idParams,
  body: z.object({
    decision: z.enum(['PASSED', 'REVISION_REQUIRED']),
    checklist: z.array(checklistItem).length(4),
    notes: z.string().trim().max(2000).optional(),
    letter_text: z.string().trim().min(20).max(10000),
    attachment_file_ids: z.array(z.string().uuid()).max(5).default([]),
  }).strict().superRefine((data, ctx) => {
    const codes = data.checklist.map(item => item.code);
    if (new Set(codes).size !== 4) ctx.addIssue({ code: z.ZodIssueCode.custom, path: ['checklist'], message: 'Keempat butir checklist harus diisi masing-masing satu kali.' });
    if (data.decision === 'PASSED' && data.checklist.some(item => item.result === 'TIDAK_SESUAI')) ctx.addIssue({ code: z.ZodIssueCode.custom, path: ['decision'], message: 'Hasil lolos memerlukan seluruh butir checklist sesuai atau tidak berlaku.' });
    if (data.decision === 'REVISION_REQUIRED' && !data.checklist.some(item => item.result === 'TIDAK_SESUAI')) ctx.addIssue({ code: z.ZodIssueCode.custom, path: ['decision'], message: 'Perbaikan penerbit memerlukan minimal satu butir tidak sesuai.' });
    if (data.decision === 'REVISION_REQUIRED' && !data.notes) ctx.addIssue({ code: z.ZodIssueCode.custom, path: ['notes'], message: 'Alasan perbaikan penerbit wajib diisi.' });
    if (new Set(data.attachment_file_ids).size !== data.attachment_file_ids.length) ctx.addIssue({ code: z.ZodIssueCode.custom, path: ['attachment_file_ids'], message: 'Lampiran yang sama tidak boleh dipilih dua kali.' });
  }),
};

export const assignmentIdSchema = { params: idParams };

export const saveChecklistSchema = {
  params: idParams,
  body: z.object({
    checklist: z.array(checklistItem).min(1).max(4).optional(),
    decision: z.enum(['PASSED', 'REVISION_REQUIRED']).optional(),
    notes: z.string().trim().max(2000).optional(),
    letter_text: z.string().trim().max(10000).optional(),
    attachment_file_ids: z.array(z.string().uuid()).max(5).default([]),
  }).strict(),
};

export const verificationDraftIdSchema = { params: z.object({ id: z.string().uuid(), documentId: z.string().uuid() }) };
export const verificationAttachmentSchema = { params: z.object({ documentId: z.string().uuid(), fileId: z.string().uuid() }) };
export const documentIdSchema = { params: idParams };
export const returnVerificationSchema = {
  params: idParams,
  body: z.object({
    reason: z.string().trim().min(5, 'Alasan pengembalian draf surat hasil verifikasi minimal 5 karakter.').max(1000),
  }).strict(),
};
export const sendVerificationSchema = {
  params: idParams,
  body: z.object({
    channel: z.enum(['IN_APP', 'EMAIL']).default('IN_APP').optional(),
    notes: z.string().trim().max(1000).optional(),
  }).strict().optional(),
};

