import { z } from 'zod';

const idParam = z.object({
  id: z.string().uuid('ID pengguna tidak valid.'),
});
const whatsappNumber = z.string().trim().regex(/^\+[1-9]\d{7,14}$/, 'Nomor WhatsApp harus format internasional, misalnya +6281234567890.').nullable();

export const userIdParamSchema = {
  params: idParam,
};

export const VALID_ROLES = [
  'SUPERADMIN',
  'HELPER_ADMIN',
  'ADMIN_PENERBIT',
  'VERIFIKATOR',
  'DISTRIBUTOR',
  'PENTASHIH',
  'DOKUMENTATOR',
  'KEPALA_LPMQ',
];

export const listUsersQuerySchema = {
  query: z.object({
    search: z.string().trim().max(100).optional(),
    role: z.enum(VALID_ROLES).optional(),
    status: z.enum(['ACTIVE', 'INACTIVE', 'SUSPENDED']).optional(),
    page: z.coerce.number().int().min(1).default(1),
    limit: z.coerce.number().int().min(1).max(100).default(20),
  }),
};

export const createUserSchema = {
  body: z.object({
    name: z.string().trim().min(2, 'Nama minimal 2 karakter.').max(191),
    email: z.string().trim().email('Format email tidak valid.').max(191),
    whatsapp_number: whatsappNumber.optional(),
    password: z.string().min(6, 'Password minimal 6 karakter.').max(100),
    nip: z.string().trim().max(50).nullable().optional(),
    status: z.enum(['ACTIVE', 'INACTIVE', 'SUSPENDED']).default('ACTIVE'),
    roles: z.array(z.enum(VALID_ROLES)).min(1, 'Minimal satu role harus dipilih.'),
    publisher: z.object({
      legal_name: z.string().trim().min(3).max(191),
      entity_type: z.string().trim().max(50).default('PT'),
      address: z.string().trim().max(255).optional(),
      phone: z.string().trim().max(50).optional(),
    }).optional(),
  }).strict(),
};

export const updateUserSchema = {
  params: idParam,
  body: z.object({
    name: z.string().trim().min(2, 'Nama minimal 2 karakter.').max(191).optional(),
    email: z.string().trim().email('Format email tidak valid.').max(191).optional(),
    whatsapp_number: whatsappNumber.optional(),
    password: z.string().min(6, 'Password minimal 6 karakter.').max(100).optional(),
    nip: z.string().trim().max(50).nullable().optional(),
    status: z.enum(['ACTIVE', 'INACTIVE', 'SUSPENDED']).optional(),
    roles: z.array(z.enum(VALID_ROLES)).min(1, 'Minimal satu role harus dipilih.').optional(),
    publisher: z.object({
      legal_name: z.string().trim().min(3).max(191),
      entity_type: z.string().trim().max(50).default('PT'),
      address: z.string().trim().max(255).optional(),
      phone: z.string().trim().max(50).optional(),
    }).optional(),
  }).strict(),
};

