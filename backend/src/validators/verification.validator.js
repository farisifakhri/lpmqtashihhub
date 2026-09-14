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
