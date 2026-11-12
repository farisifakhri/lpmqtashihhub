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

export async function requireParaf(tx, type, id) {
  if (!(await pemarafGateActive(tx))) return;
  const paraf = await findParaf(tx, type, id);
  if (!paraf?.signed_at) fail(409, 'Dokumen ini belum diparaf. Persetujuan Kepala LPMQ baru dapat dilakukan setelah Pemaraf membubuhkan paraf.');
}

export async function recordParaf(tx, type, id, user, req) {
  const existing = await findParaf(tx, type, id);
  if (existing?.signed_at) fail(409, 'Paraf sudah dibubuhkan. Dokumen sedang menunggu persetujuan Kepala LPMQ.');
  const data = { pemaraf_id: user.id, signed_at: new Date() };
  const paraf = await tx.approvalParaf.upsert({
    where: parafKey(type, id), create: { subject_type: type, subject_id: id, ...data }, update: data,
  });
  await audit(tx, user, 'PARAF_APPROVAL', type, id, { pemaraf: user.name }, req);
  return paraf;
}

// Dokumen yang dikembalikan/diubah harus diparaf ulang.
export const clearParaf = async (tx, type, id) => {
  if (tx.approvalParaf) await tx.approvalParaf.deleteMany({ where: { subject_type: type, subject_id: id } });
};
