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
  };
};

export async function requireParaf(tx, type, id) {
  if (!(await pemarafGateActive(tx))) return;
  const paraf = await findParaf(tx, type, id);
  if (!paraf?.signed_at) fail(409, 'Dokumen ini belum diparaf seluruh Pemaraf. Persetujuan Kepala LPMQ baru dapat dilakukan setelah kedua Pemaraf membubuhkan paraf.');
}

// Satu Pemaraf membubuhkan parafnya. Seluruh Pemaraf aktif (saat ini 2) wajib memaraf dengan urutan bebas,
// masing-masing sekali; signed_at baru terisi saat paraf terakhir masuk sehingga barulah dokumen ke Kepala LPMQ.
export async function addPemarafSignature(tx, type, id, user, req, { create = {} } = {}) {
  if (!user?.isPemaraf) fail(403, 'Hanya akun dengan peran Pemaraf yang dapat membubuhkan paraf.');
  const existing = await findParaf(tx, type, id);
  if (existing?.signed_at) fail(409, 'Paraf seluruh Pemaraf sudah lengkap. Dokumen sedang menunggu proses berikutnya.');
  const signers = parafSigners(existing);
  if (signers.some(signer => signer.id === user.id)) {
    fail(409, 'Anda sudah membubuhkan paraf. Menunggu paraf Pemaraf lainnya.');
  }

  const required = existing?.required_count ?? Math.max(await tx.user.count({ where: ACTIVE_PEMARAF }), 1);
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

// Dokumen yang dikembalikan/diubah harus diparaf ulang.
export const clearParaf = async (tx, type, id) => {
  if (tx.approvalParaf) await tx.approvalParaf.deleteMany({ where: { subject_type: type, subject_id: id } });
};
