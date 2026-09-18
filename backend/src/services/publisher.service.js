import { prisma } from '../config/database.js';
import { logAudit } from './audit.service.js';

export const getProfile = async (publisherId) => {
  const publisher = await prisma.publisher.findUnique({
    where: { id: publisherId },
    include: {
      user: {
        select: { id: true, name: true, email: true },
      },
      documents: {
        orderBy: { created_at: 'desc' },
      },
    },
  });

  if (!publisher) {
    const error = new Error('Data penerbit tidak ditemukan.');
    error.statusCode = 404;
    throw error;
  }

  return publisher;
};

export const updateProfile = async (publisherId, data, req) => {
  const existing = await prisma.publisher.findUnique({
    where: { id: publisherId },
  });

  if (!existing) {
    const error = new Error('Data penerbit tidak ditemukan.');
    error.statusCode = 404;
    throw error;
  }

  // Proteksi Kunci Profil: Penerbit tidak diizinkan mengubah profil kecuali sudah diizinkan petinggi (Kepala LPMQ / Superadmin)
  const isPetinggi = req.user?.roles?.some((r) => ['SUPERADMIN', 'KEPALA_LPMQ'].includes(r));
  if (!isPetinggi && !existing.profile_edit_allowed) {
    const error = new Error(
      'Akses ditolak. Profil penerbit terkunci. Anda tidak memiliki izin untuk mengubah data profil kecuali sudah diberikan izin oleh Kepala LPMQ atau Administrator.'
    );
    error.statusCode = 403;
    throw error;
  }

  const updated = await prisma.publisher.update({
    where: { id: publisherId },
    data,
  });

  await logAudit({
    actorId: req.user.id,
    action: 'UPDATE_PUBLISHER_PROFILE',
    subjectType: 'Publisher',
    subjectId: publisherId,
    beforeJson: existing,
    afterJson: updated,
    req,
  });

  return updated;
};

export const permitPublisherProfileEdit = async (publisherId, { allowed = true, notes = '' }, req) => {
  const existing = await prisma.publisher.findUnique({
    where: { id: publisherId },
  });

  if (!existing) {
    const error = new Error('Data penerbit tidak ditemukan.');
    error.statusCode = 404;
    throw error;
  }

  const updated = await prisma.publisher.update({
    where: { id: publisherId },
    data: {
      profile_edit_allowed: Boolean(allowed),
      profile_edit_granted_by: req.user.id,
      profile_edit_granted_at: new Date(),
      profile_edit_notes: notes || null,
    },
  });

  await logAudit({
    actorId: req.user.id,
    action: allowed ? 'PERMIT_PUBLISHER_PROFILE_EDIT' : 'REVOKE_PUBLISHER_PROFILE_EDIT',
    subjectType: 'Publisher',
    subjectId: publisherId,
    beforeJson: existing,
    afterJson: updated,
    req,
  });

  return updated;
};

export const listPublishers = async ({ status, search, page = 1, limit = 10 }) => {
  const where = {};
  if (status) {
    where.verification_status = status;
  }
  if (search) {
    where.OR = [
      { legal_name: { contains: search } },
      { user: { name: { contains: search } } },
      { user: { email: { contains: search } } },
    ];
  }

  const skip = (Number(page) - 1) * Number(limit);
  const take = Number(limit);

  const [total, items] = await Promise.all([
    prisma.publisher.count({ where }),
    prisma.publisher.findMany({
      where,
      skip,
      take,
      include: {
        user: { select: { id: true, name: true, email: true } },
        documents: true,
      },
      orderBy: { created_at: 'desc' },
    }),
  ]);

  return {
    items,
    pagination: {
      total,
      page: Number(page),
      limit: Number(limit),
      totalPages: Math.ceil(total / take),
    },
  };
};

export const verifyPublisher = async (publisherId, { verification_status, notes }, req) => {
  const existing = await prisma.publisher.findUnique({
    where: { id: publisherId },
  });

  if (!existing) {
    const error = new Error('Penerbit tidak ditemukan.');
    error.statusCode = 404;
    throw error;
  }

  const updated = await prisma.publisher.update({
    where: { id: publisherId },
    data: { verification_status },
  });

  await logAudit({
    actorId: req.user.id,
    action: 'VERIFY_PUBLISHER',
    subjectType: 'Publisher',
    subjectId: publisherId,
    beforeJson: existing,
    afterJson: { ...updated, notes },
    req,
  });

  return updated;
};

export default {
  getProfile,
  updateProfile,
  listPublishers,
  verifyPublisher,
};
