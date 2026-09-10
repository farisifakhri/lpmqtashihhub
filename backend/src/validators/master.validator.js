import { z } from 'zod';

export const createCategorySchema = {
  body: z.object({
    code: z.string().min(1, 'Kode kategori wajib diisi'),
    name: z.string().min(2, 'Nama kategori wajib diisi'),
    display_order: z.number().int().default(0),
  }),
};

export const createServiceTypeSchema = {
  body: z.object({
    category_id: z.string().uuid('ID Kategori tidak valid'),
    name: z.string().min(3, 'Nama layanan wajib diisi'),
    service_kind: z.string().default('CETAK'),
    base_fee: z.number().nonnegative('Tarif tidak boleh negatif'),
    duration_initial: z.number().int().positive('Durasi awal harus lebih dari 0'),
    duration_revision: z.number().int().positive('Durasi revisi harus lebih dari 0'),
    duration_dummy: z.number().int().positive('Durasi dumi/perpanjangan harus lebih dari 0'),
  }),
};
