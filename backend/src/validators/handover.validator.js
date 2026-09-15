import { z } from 'zod';

const idParam = z.object({
  id: z.string().uuid({ message: 'ID tidak valid.' }),
});

export const createHandoverSchema = {
  params: idParam,
  body: z.object({
    to_user_id: z.string().uuid({ message: 'ID petugas Distributor penerima wajib berupa UUID yang sah.' }),
    condition: z.string().trim().min(2, { message: 'Kondisi fisik master mushaf minimal 2 karakter.' }).default('BAIK'),
    volume_count: z.coerce.number().int().positive({ message: 'Jumlah jilid master fisik minimal 1 volume.' }).default(30),
    notes: z.string().trim().max(1000, { message: 'Catatan penyerahan maksimal 1000 karakter.' }).optional().or(z.literal('')),
  }),
};

export const receiveHandoverSchema = {
  params: idParam,
  body: z.object({
    condition: z.string().trim().min(2, { message: 'Kondisi fisik master mushaf saat diterima minimal 2 karakter.' }).optional(),
    volume_count: z.coerce.number().int().positive({ message: 'Jumlah jilid fisik minimal 1 volume.' }).optional(),
    tashih_due_at: z.string().datetime({ message: 'Tenggat waktu pentashihan harus berformat tanggal dan waktu ISO 8601 yang sah.' }).optional().or(z.string().regex(/^\d{4}-\d{2}-\d{2}$/, { message: 'Tenggat waktu pentashihan harus berformat YYYY-MM-DD.' })).optional(),
    notes: z.string().trim().max(1000, { message: 'Catatan penerimaan fisik maksimal 1000 karakter.' }).optional().or(z.literal('')),
  }),
};

export const returnHandoverSchema = {
  params: idParam,
  body: z.object({
    reason: z.string().trim().min(5, { message: 'Alasan pengembalian / penolakan master fisik minimal 5 karakter.' }),
  }),
};

export const handoverQuerySchema = {
  query: z.object({
    status: z.enum(['PENDING', 'RECEIVED', 'RETURNED']).optional(),
    stage: z.string().optional(),
    search: z.string().trim().optional(),
    my_tasks: z.coerce.boolean().optional(),
    page: z.coerce.number().int().positive().default(1),
    limit: z.coerce.number().int().positive().max(100).default(20),
  }),
};

