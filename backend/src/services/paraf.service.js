import { Prisma } from '@prisma/client';
import { prisma } from '../config/database.js';
import { fail, audit } from './workflow-utils.js';

export const ACTIVE_PEMARAF = { status: 'ACTIVE', roles: { some: { role: { code: 'PEMARAF' } } } };
export const parafKey = (subject_type, subject_id) => ({ subject_type_subject_id: { subject_type, subject_id } });

export const listPemaraf = () => prisma.user.findMany({
  where: ACTIVE_PEMARAF, select: { id: true, name: true, nip: true }, orderBy: { name: 'asc' },
});

// Gerbang paraf hanya berlaku bila sudah ada akun Pemaraf aktif; tanpa itu alur lama tetap berjalan.
export const pemarafGateActive = async (tx) =>
  Boolean(tx.approvalParaf && tx.user?.count) && (await tx.user.count({ where: ACTIVE_PEMARAF })) > 0;

export const findParaf = (tx, type, id) => tx.approvalParaf.findUnique({ where: parafKey(type, id) });

// Paraf yang sudah dibubuhkan. Baris lama (sebelum paraf ganda) hanya punya satu pemaraf_id + signed_at.
export const parafSigners = (paraf) => (Array.isArray(paraf?.signers)
  ? paraf.signers
  : paraf?.signed_at && paraf?.pemaraf_id ? [{ id: paraf.pemaraf_id, signed_at: paraf.signed_at }] : []);

// Ringkasan untuk tampilan: siapa yang sudah memaraf, berapa yang wajib, dan apakah sudah lengkap.
export const parafProgress = (paraf) => {
  const signers = parafSigners(paraf);
  return {
    signers,
    required: paraf?.required_count ?? Math.max(signers.length, 1),
    complete: Boolean(paraf?.signed_at),
    assigned: assignedPemarafIds(paraf),
  };
};

// Pengaju wajib menunjuk tepat 2 Pemaraf aktif yang berbeda. Tanpa akun Pemaraf aktif (gerbang mati) -> null.
export const PEMARAF_REQUIRED = 2;
export async function resolveDesignatedPemaraf(tx, ids) {
  if (!(await pemarafGateActive(tx))) return null;
  const unique = [...new Set(Array.isArray(ids) ? ids : [])];
  if (unique.length !== PEMARAF_REQUIRED) fail(422, `Pilih tepat ${PEMARAF_REQUIRED} Pemaraf aktif yang berbeda sebelum mengajukan.`);
  const found = await tx.user.findMany({ where: { id: { in: unique }, ...ACTIVE_PEMARAF }, select: { id: true, name: true } });
  if (found.length !== PEMARAF_REQUIRED) fail(422, 'Pemaraf yang dipilih harus akun aktif dengan peran Pemaraf.');
  return found;
}

// Membuka (atau membuka ulang) permohonan paraf untuk Pemaraf yang ditunjuk; paraf lama dihapus.
export async function openParafRequest(tx, type, id, pemarafs, { requested_by_id = null, payload, notify } = {}) {
  const data = {
    assigned_ids: pemarafs.map(p => p.id), required_count: pemarafs.length, signers: [], signed_at: null,
    pemaraf_id: null, requested_by_id, head_approved_at: null, head_approved_by_id: null,
    ...(payload !== undefined ? { payload } : {}),
  };
  await tx.approvalParaf.upsert({ where: parafKey(type, id), create: { subject_type: type, subject_id: id, ...data }, update: data });
  if (notify) {
    await tx.notification.createMany({ data: pemarafs.map(p => ({ user_id: p.id, type: 'PARAF_REQUIRED', ...notify })) });
  }
}

// Keputusan distributor yang masih berjalan: menunggu paraf, atau paraf lengkap tapi belum disahkan Kepala.
// Baris lama tanpa penunjukan (assigned_ids null) yang sudah lengkap sudah langsung dijalankan dahulu.
export const OPEN_DISTRIBUTION_PARAF = {
  subject_type: 'DISTRIBUTOR_REVIEW',
  head_approved_at: null,
  OR: [{ signed_at: null }, { assigned_ids: { not: Prisma.DbNull } }],
};

export const assignedPemarafIds = (paraf) => (Array.isArray(paraf?.assigned_ids) ? paraf.assigned_ids : null);

export async function requireParaf(tx, type, id, signingUser = null) {
  if (!(await pemarafGateActive(tx))) return;
  const paraf = await findParaf(tx, type, id);
  const activePemarafCount = await tx.user.count({ where: ACTIVE_PEMARAF });
  const targetRequired = Math.max(activePemarafCount, 1);
  const signers = parafSigners(paraf);
  const isComplete = Boolean(paraf?.signed_at) || signers.length >= targetRequired;

  if (!isComplete) {
    fail(409, `Dokumen ini belum diparaf seluruh Pemaraf (${signers.length}/${targetRequired}). Persetujuan Kepala LPMQ baru dapat dilakukan setelah seluruh Pemaraf membubuhkan paraf.`);
  }

  if (signingUser && signers.some(signer => signer.id === signingUser.id)) {
    fail(403, 'Kepala LPMQ yang menandatangani tidak boleh merupakan Pemaraf yang telah memaraf dokumen ini.');
  }
}

// Satu Pemaraf membubuhkan parafnya. Seluruh Pemaraf aktif (saat ini 2) wajib memaraf dengan urutan bebas,
// masing-masing sekali; signed_at baru terisi saat paraf terakhir masuk sehingga barulah dokumen ke Kepala LPMQ.
export async function addPemarafSignature(tx, type, id, user, req, { create = {} } = {}) {
  if (!user?.isPemaraf) fail(403, 'Hanya akun dengan peran Pemaraf yang dapat membubuhkan paraf.');
  const existing = await findParaf(tx, type, id);
  if (existing?.signed_at) fail(409, 'Paraf seluruh Pemaraf sudah lengkap. Dokumen sedang menunggu proses berikutnya.');
  const assigned = assignedPemarafIds(existing);
  if (assigned && !assigned.includes(user.id)) fail(403, 'Anda tidak ditunjuk sebagai Pemaraf untuk dokumen ini.');
  const signers = parafSigners(existing);
  if (signers.some(signer => signer.id === user.id)) {
    fail(409, 'Anda sudah membubuhkan paraf. Menunggu paraf Pemaraf lainnya.');
  }

  // Hitung ulang target paraf berdasarkan pemaraf yang aktif saat ini
  const activePemarafCount = await tx.user.count({ where: ACTIVE_PEMARAF });
  const currentActiveRequired = Math.max(activePemarafCount, 1);
  const required = existing?.required_count
    ? Math.min(existing.required_count, currentActiveRequired)
    : currentActiveRequired;

  const now = new Date();
  const nextSigners = [...signers, { id: user.id, name: user.name, signed_at: now.toISOString() }];
  const complete = nextSigners.length >= required;
  const data = { signers: nextSigners, required_count: required, pemaraf_id: user.id, signed_at: complete ? now : null };
  const paraf = existing
    ? await tx.approvalParaf.update({ where: { id: existing.id }, data })
    : await tx.approvalParaf.create({ data: { subject_type: type, subject_id: id, ...create, ...data } });
  await audit(tx, user, 'PARAF_APPROVAL', type, id, { pemaraf: user.name, paraf_ke: nextSigners.length, wajib: required }, req);
  return { paraf, complete, signers: nextSigners, required };
}

export async function recordParaf(tx, type, id, user, req) {
  return (await addPemarafSignature(tx, type, id, user, req)).paraf;
}

// Jalur darurat operasional: Kepala LPMQ (sebagai pengesah utama) atau Super Admin dapat memberikan dispensasi paraf bila ada kendala operasional
export async function overrideParafByAdmin(tx, type, id, adminUser, reason, req) {
  const isAuthorized = Boolean(
    adminUser?.roles?.includes('KEPALA_LPMQ') ||
    adminUser?.role === 'KEPALA_LPMQ' ||
    adminUser?.roles?.includes('SUPERADMIN') ||
    adminUser?.role === 'SUPERADMIN'
  );
  if (!isAuthorized || adminUser?.isPemaraf) {
    fail(403, 'Hanya Kepala LPMQ (atau Super Admin) yang berhak memberikan dispensasi paraf darurat.');
  }
  if (!reason || reason.trim().length < 10) {
    fail(400, 'Alasan penimpaan paraf darurat wajib diisi (minimal 10 karakter).');
  }
  const now = new Date();
  const existing = await findParaf(tx, type, id);
  const signers = parafSigners(existing);
  const actorRoleLabel = adminUser?.roles?.includes('KEPALA_LPMQ') ? 'KEPALA LPMQ' : 'SUPERADMIN';
  const nextSigners = [
    ...signers,
    {
      id: adminUser.id,
      name: `[DISPENSASI ${actorRoleLabel}] ${adminUser.name}`,
      signed_at: now.toISOString(),
      reason: reason.trim(),
    },
  ];
  const data = {
    signers: nextSigners,
    required_count: nextSigners.length,
    pemaraf_id: adminUser.id,
    signed_at: now,
  };
  const paraf = existing
    ? await tx.approvalParaf.update({ where: { id: existing.id }, data })
    : await tx.approvalParaf.create({ data: { subject_type: type, subject_id: id, ...data } });
  await audit(tx, adminUser, 'OVERRIDE_PARAF_EMERGENCY', type, id, {
    reason: reason.trim(),
    paraf_sebelumnya: signers.length,
  }, req);
  return { paraf, complete: true, signers: nextSigners, required: nextSigners.length };
}

// Dokumen yang dikembalikan/diubah harus diparaf ulang.
export const clearParaf = async (tx, type, id) => {
  if (tx.approvalParaf) await tx.approvalParaf.deleteMany({ where: { subject_type: type, subject_id: id } });
};
