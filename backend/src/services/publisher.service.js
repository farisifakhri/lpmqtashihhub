import { prisma } from '../config/database.js';
import { logAudit } from './audit.service.js';
import { forbidPemaraf } from '../utils/pemaraf.js';
import { getPublisherCertificatePdf } from './publisher-registration.service.js';
import { detectProvince, PROVINCE_NAMES, UNKNOWN_PROVINCE } from '../utils/province.js';

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
  forbidPemaraf(req?.user, 'mengatur izin perubahan profil penerbit');

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

export const adminUpdatePublisher = async (publisherId, data, req) => {
  const existing = await prisma.publisher.findUnique({
    where: { id: publisherId },
  });

  if (!existing) {
    const error = new Error('Data penerbit tidak ditemukan.');
    error.statusCode = 404;
    throw error;
  }

  const { reason, legal_name, entity_type, address, phone, npwp, nib } = data;

  // Cek keunikan NPWP jika diubah
  if (npwp && npwp !== existing.npwp) {
    const conflict = await prisma.publisher.findFirst({
      where: {
        npwp,
        id: { not: publisherId },
      },
    });
    if (conflict) {
      const error = new Error('NPWP ini sudah digunakan oleh penerbit lain yang terdaftar.');
      error.statusCode = 409;
      throw error;
    }
  }

  // Cek keunikan NIB jika diubah
  if (nib && nib !== existing.nib) {
    const conflictNib = await prisma.publisher.findFirst({
      where: {
        nib,
        id: { not: publisherId },
      },
    });
    if (conflictNib) {
      const error = new Error('NIB ini sudah digunakan oleh penerbit lain yang terdaftar.');
      error.statusCode = 409;
      throw error;
    }
  }

  const updateData = {};
  if (legal_name !== undefined) updateData.legal_name = legal_name;
  if (entity_type !== undefined) updateData.entity_type = entity_type;
  if (address !== undefined) updateData.address = address;
  if (phone !== undefined) updateData.phone = phone;
  if (npwp !== undefined) updateData.npwp = npwp;
  if (nib !== undefined) updateData.nib = nib;

  const updated = await prisma.publisher.update({
    where: { id: publisherId },
    data: updateData,
  });

  await logAudit({
    actorId: req.user.id,
    action: 'ADMIN_EDIT_PUBLISHER',
    subjectType: 'Publisher',
    subjectId: publisherId,
    details: { reason },
    beforeJson: existing,
    afterJson: updated,
    req,
  });

  return updated;
};

export const getMyCertificatePdf = async ({ publisherId, userId, user }) => {
  const reg = await prisma.publisherRegistration.findFirst({
    where: {
      OR: [
        ...(publisherId ? [{ publisher_id: publisherId }] : []),
        ...(userId ? [{ user_id: userId }] : []),
      ],
      status: 'DISETUJUI',
    },
    orderBy: { decided_at: 'desc' },
  });

  if (!reg) {
    const error = new Error('Sertifikat penerbit belum tersedia atau pendaftaran belum disetujui.');
    error.statusCode = 404;
    throw error;
  }

  return getPublisherCertificatePdf(reg.id, user);
};

// ---------------------------------------------------------------------------
// Direktori Penerbit Mushaf Al-Qur'an (Super Admin): penerbit terverifikasi, dikelompokkan per huruf & provinsi.
// shortcut: seluruh penerbit terverifikasi dimuat lalu disaring di memori (ratusan baris), karena provinsi
// diturunkan dari teks alamat; pindah ke kolom provinsi + query DB bila penerbit mencapai ribuan.
const DIRECTORY_MAX_ROWS = 5000;
const LEGAL_PREFIX = /^(?:pt|cv|ud|yayasan|koperasi|perum|penerbit)\.?\s+/i;

export const directoryLetter = (name) => {
  const first = String(name || '').trim().replace(LEGAL_PREFIX, '').charAt(0).toUpperCase();
  return /[A-Z]/.test(first) ? first : '#';
};

const toDirectoryRow = (publisher) => {
  const submission = publisher.registration_submission;
  return {
    id: publisher.id,
    name: publisher.legal_name,
    entity_type: publisher.entity_type,
    address: publisher.address || submission?.address || '',
    province: detectProvince(publisher.address || submission?.address),
    pic_name: submission?.pic_name || publisher.user?.name || '',
    phone: publisher.phone || submission?.pic_phone || '',
    email: publisher.user?.email || submission?.email || '',
    nomor_induk_penerbit: publisher.nomor_induk_penerbit || '',
    npwp: publisher.npwp || '',
    nib: publisher.nib || '',
    verified_at: submission?.decided_at || publisher.created_at,
    letter: directoryLetter(publisher.legal_name),
  };
};

export const getPublisherDirectory = async ({ letter, province, search, page = 1, limit = 20 } = {}) => {
  const publishers = await prisma.publisher.findMany({
    where: { verification_status: 'VERIFIED' },
    select: {
      id: true, legal_name: true, entity_type: true, address: true, phone: true,
      nomor_induk_penerbit: true, npwp: true, nib: true, created_at: true,
      user: { select: { name: true, email: true } },
      registration_submission: { select: { address: true, pic_name: true, pic_phone: true, email: true, decided_at: true } },
    },
    take: DIRECTORY_MAX_ROWS,
  });

  const all = publishers
    .map(toDirectoryRow)
    .sort((a, b) => a.name.replace(LEGAL_PREFIX, '').localeCompare(b.name.replace(LEGAL_PREFIX, ''), 'id', { sensitivity: 'base' }));

  const letters = {};
  const provinceCounts = {};
  for (const row of all) {
    letters[row.letter] = (letters[row.letter] || 0) + 1;
    provinceCounts[row.province] = (provinceCounts[row.province] || 0) + 1;
  }

  const keyword = search?.toLowerCase();
  const filtered = all.filter((row) =>
    (!letter || row.letter === letter)
    && (!province || row.province === province)
    && (!keyword || [row.name, row.address, row.pic_name, row.email, row.phone, row.nomor_induk_penerbit]
      .some((value) => value.toLowerCase().includes(keyword))));

  const start = (page - 1) * limit;
  return {
    items: filtered.slice(start, start + limit).map(({ letter: _letter, ...row }, index) => ({ no: start + index + 1, ...row })),
    pagination: { total: filtered.length, page, limit, totalPages: Math.max(1, Math.ceil(filtered.length / limit)) },
    summary: {
      total: all.length,
      letters,
      // semua provinsi tetap tercantum (termasuk yang 0) agar admin melihat sebaran lengkap
      provinces: [...PROVINCE_NAMES, UNKNOWN_PROVINCE]
        .map((name) => ({ name, count: provinceCounts[name] || 0 })),
    },
  };
};

// Versi publik (halaman Informasi): sama dengan direktori lama di situs LPMQ, tanpa NPWP/NIB.
export const getPublicPublisherDirectory = async (params) => {
  const result = await getPublisherDirectory(params);
  return { ...result, items: result.items.map(({ npwp: _npwp, nib: _nib, ...row }) => row) };
};

export default {
  getProfile,
  getMyCertificatePdf,
  updateProfile,
  listPublishers,
  getPublisherDirectory,
  verifyPublisher,
  adminUpdatePublisher,
};
