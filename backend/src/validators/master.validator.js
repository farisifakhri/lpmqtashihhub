import { z } from 'zod';

export const idParamSchema = {
  params: z.object({
    id: z.string().uuid('ID tidak valid atau bukan format UUID'),
  }),
};

export const createCategorySchema = {
  body: z.object({
    code: z.string().min(1, 'Kode kategori wajib diisi').max(20, 'Kode kategori maksimal 20 karakter'),
    name: z.string().min(2, 'Nama kategori wajib diisi').max(100, 'Nama kategori maksimal 100 karakter'),
    display_order: z.coerce.number().int().default(0),
    status: z.enum(['ACTIVE', 'INACTIVE']).default('ACTIVE'),
  }),
};

export const updateCategorySchema = {
  params: z.object({
    id: z.string().uuid('ID Kategori tidak valid'),
  }),
  body: z.object({
    code: z.string().min(1, 'Kode kategori wajib diisi').max(20).optional(),
    name: z.string().min(2, 'Nama kategori wajib diisi').max(100).optional(),
    display_order: z.coerce.number().int().optional(),
    status: z.enum(['ACTIVE', 'INACTIVE']).optional(),
  }),
};

export const createServiceTypeSchema = {
  body: z
    .object({
      category_id: z.string().uuid('ID Kategori tidak valid').optional(),
      category: z.string().optional(),
      name: z.string().min(3, 'Nama layanan minimal 3 karakter').max(150, 'Nama layanan maksimal 150 karakter'),
      service_kind: z.enum(['CETAK', 'DIGITAL', 'AUDIO_VISUAL', 'BRAILLE']).default('CETAK'),
      base_fee: z.coerce.number().nonnegative('Tarif tidak boleh negatif').optional(),
      baseCost: z.coerce.number().nonnegative('Tarif tidak boleh negatif').optional(),
      fee_unit: z.string().default('PER_STT'),
      unitLabel: z.string().optional(),
      duration_initial: z.coerce.number().int().positive('Durasi awal harus lebih dari 0').optional(),
      baseDurationDays: z.coerce.number().int().positive('Durasi awal harus lebih dari 0').optional(),
      duration_revision: z.coerce.number().int().positive('Durasi revisi harus lebih dari 0').optional(),
      revisionDurationDays: z.coerce.number().int().positive('Durasi revisi harus lebih dari 0').optional(),
      duration_dummy: z.coerce.number().int().positive('Durasi dumi/perpanjangan harus lebih dari 0').optional(),
      dummyDurationDays: z.coerce.number().int().positive('Durasi dumi/perpanjangan harus lebih dari 0').optional(),
      status: z.enum(['ACTIVE', 'INACTIVE']).default('ACTIVE'),
    })
    .superRefine((data, ctx) => {
      if (!data.category_id && !data.category) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: 'Kategori layanan wajib ditentukan (category_id atau category).',
          path: ['category_id'],
        });
      }
    }),
};

export const updateServiceTypeSchema = {
  params: z.object({
    id: z.string().uuid('ID Layanan tidak valid'),
  }),
  body: z.object({
    category_id: z.string().uuid('ID Kategori tidak valid').optional(),
    category: z.string().optional(),
    name: z.string().min(3, 'Nama layanan minimal 3 karakter').max(150).optional(),
    service_kind: z.enum(['CETAK', 'DIGITAL', 'AUDIO_VISUAL', 'BRAILLE']).optional(),
    base_fee: z.coerce.number().nonnegative('Tarif tidak boleh negatif').optional(),
    baseCost: z.coerce.number().nonnegative('Tarif tidak boleh negatif').optional(),
    fee_unit: z.string().optional(),
    unitLabel: z.string().optional(),
    duration_initial: z.coerce.number().int().positive('Durasi awal harus lebih dari 0').optional(),
    baseDurationDays: z.coerce.number().int().positive('Durasi awal harus lebih dari 0').optional(),
    duration_revision: z.coerce.number().int().positive('Durasi revisi harus lebih dari 0').optional(),
    revisionDurationDays: z.coerce.number().int().positive('Durasi revisi harus lebih dari 0').optional(),
    duration_dummy: z.coerce.number().int().positive('Durasi dumi/perpanjangan harus lebih dari 0').optional(),
    dummyDurationDays: z.coerce.number().int().positive('Durasi dumi/perpanjangan harus lebih dari 0').optional(),
    status: z.enum(['ACTIVE', 'INACTIVE']).optional(),
  }),
};

export const createAddonSchema = {
  body: z.object({
    code: z.string().min(2, 'Kode addon minimal 2 karakter').max(50, 'Kode addon maksimal 50 karakter'),
    name: z.string().min(3, 'Nama addon minimal 3 karakter').max(150, 'Nama addon maksimal 150 karakter'),
    fee: z.coerce.number().nonnegative('Tarif addon tidak boleh negatif').default(0),
    status: z.enum(['ACTIVE', 'INACTIVE']).default('ACTIVE'),
  }),
};

export const updateAddonSchema = {
  params: z.object({
    id: z.string().uuid('ID Addon tidak valid'),
  }),
  body: z.object({
    code: z.string().min(2).max(50).optional(),
    name: z.string().min(3).max(150).optional(),
    fee: z.coerce.number().nonnegative('Tarif addon tidak boleh negatif').optional(),
    status: z.enum(['ACTIVE', 'INACTIVE']).optional(),
  }),
};
