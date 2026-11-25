import test from 'node:test';
import assert from 'node:assert/strict';
import { withPemaraf, toAccessRole, forbidPemaraf } from '../../src/utils/pemaraf.js';
import { requireParaf, recordParaf, parafProgress, openParafRequest, overrideParafByAdmin } from '../../src/services/paraf.service.js';

// tx tiruan: satu tabel paraf di memori, dengan jumlah akun Pemaraf aktif yang bisa diatur.
const fakeTx = (activePemaraf) => {
  const rows = new Map();
  const key = w => `${w.subject_type_subject_id.subject_type}:${w.subject_type_subject_id.subject_id}`;
  return {
    rows,
    user: { count: async () => activePemaraf },
    auditLog: { create: async () => {} },
    approvalParaf: {
      findUnique: async ({ where }) => rows.get(key(where)) || null,
      create: async ({ data }) => {
        const row = { id: `row-${rows.size + 1}`, ...data };
        rows.set(`${data.subject_type}:${data.subject_id}`, row);
        return row;
      },
      update: async ({ where, data }) => {
        const [k, row] = [...rows.entries()].find(([, r]) => r.id === where.id);
        const next = { ...row, ...data };
        rows.set(k, next);
        return next;
      },
    },
  };
};
const PEMARAF_A = { id: 'p1', name: 'Pemaraf A', isPemaraf: true };
const PEMARAF_B = { id: 'p2', name: 'Pemaraf B', isPemaraf: true };

test('Pemaraf mendapat akses setara Kepala LPMQ tetapi tampil sebagai role Pemaraf sendiri', () => {
  assert.deepEqual(withPemaraf(['PEMARAF']), { isPemaraf: true, roles: ['KEPALA_LPMQ'], identityRoles: ['PEMARAF'] });
  assert.deepEqual(withPemaraf(['DISTRIBUTOR', 'PEMARAF']), { isPemaraf: true, roles: ['DISTRIBUTOR', 'KEPALA_LPMQ'], identityRoles: ['DISTRIBUTOR', 'PEMARAF'] });
  assert.deepEqual(withPemaraf(['KEPALA_LPMQ']), { isPemaraf: false, roles: ['KEPALA_LPMQ'], identityRoles: ['KEPALA_LPMQ'] });
  // Kepala asli yang juga diberi peran Pemaraf tetap bertindak sebagai Kepala bila tanpa activeRole
  assert.deepEqual(withPemaraf(['KEPALA_LPMQ', 'PEMARAF']), { isPemaraf: false, roles: ['KEPALA_LPMQ'], identityRoles: ['KEPALA_LPMQ'] });
  // Namun bila akun multi-role beralih ke peran aktif PEMARAF (X-Active-Role: PEMARAF), maka berhak bertindak sebagai Pemaraf
  assert.deepEqual(withPemaraf(['KEPALA_LPMQ', 'PEMARAF'], 'PEMARAF'), { isPemaraf: true, roles: ['KEPALA_LPMQ', 'KEPALA_LPMQ'], identityRoles: ['KEPALA_LPMQ', 'PEMARAF'] });
  assert.deepEqual(withPemaraf(['SUPERADMIN', 'PEMARAF', 'KEPALA_LPMQ'], 'PEMARAF'), { isPemaraf: true, roles: ['SUPERADMIN', 'KEPALA_LPMQ', 'KEPALA_LPMQ'], identityRoles: ['SUPERADMIN', 'PEMARAF', 'KEPALA_LPMQ'] });
  assert.equal(toAccessRole('PEMARAF', true), 'KEPALA_LPMQ');
  assert.equal(toAccessRole('DISTRIBUTOR', true), 'DISTRIBUTOR');
});

test('Persetujuan Kepala ditolak sampai KEDUA Pemaraf memaraf (urutan bebas, masing-masing sekali)', async () => {
  const tx = fakeTx(2);
  await assert.rejects(requireParaf(tx, 'MASTER_LETTER', 'm1'), e => e.statusCode === 409);

  // Pemaraf B lebih dulu: belum lengkap, Kepala masih ditolak
  await recordParaf(tx, 'MASTER_LETTER', 'm1', PEMARAF_B);
  await assert.rejects(requireParaf(tx, 'MASTER_LETTER', 'm1'), e => e.statusCode === 409);
  // Pemaraf yang sama tidak bisa memaraf dua kali
  await assert.rejects(recordParaf(tx, 'MASTER_LETTER', 'm1', PEMARAF_B), e => e.statusCode === 409 && /sudah membubuhkan/.test(e.message));

  await recordParaf(tx, 'MASTER_LETTER', 'm1', PEMARAF_A);
  await requireParaf(tx, 'MASTER_LETTER', 'm1');
  const progress = parafProgress(await tx.approvalParaf.findUnique({ where: { subject_type_subject_id: { subject_type: 'MASTER_LETTER', subject_id: 'm1' } } }));
  assert.deepEqual(progress.signers.map(s => s.id), ['p2', 'p1']);
  assert.equal(progress.required, 2);
  assert.equal(progress.complete, true);

  // Setelah lengkap, paraf tambahan ditolak
  await assert.rejects(recordParaf(tx, 'MASTER_LETTER', 'm1', { id: 'p3', name: 'Pemaraf C', isPemaraf: true }), e => e.statusCode === 409);
});

test('Hanya akun berperan Pemaraf yang dapat memaraf', async () => {
  await assert.rejects(recordParaf(fakeTx(2), 'MASTER_LETTER', 'm1', { id: 'k1', name: 'Kepala', isPemaraf: false }), e => e.statusCode === 403);
});

test('Baris paraf lama (satu pemaraf, sudah lengkap) tetap dianggap lengkap', () => {
  const legacy = { pemaraf_id: 'p1', signed_at: new Date('2026-11-01') };
  assert.deepEqual(parafProgress(legacy), { signers: [{ id: 'p1', signed_at: legacy.signed_at }], required: 1, complete: true, assigned: null });
});

test('Tanpa akun Pemaraf aktif, alur lama tetap berjalan tanpa paraf', async () => {
  await requireParaf(fakeTx(0), 'MASTER_LETTER', 'm1');
});

test('forbidPemaraf menolak user dengan isPemaraf: true dan meloloskan user lain', () => {
  const pemarafUser = { id: 'p1', isPemaraf: true, roles: ['KEPALA_LPMQ'] };
  const kepalaUser = { id: 'k1', isPemaraf: false, roles: ['KEPALA_LPMQ'] };

  assert.throws(
    () => forbidPemaraf(pemarafUser, 'mengembalikan draf surat'),
    (err) => err.statusCode === 403 && err.message.includes('tidak berwenang')
  );

  assert.doesNotThrow(() => forbidPemaraf(kepalaUser, 'mengembalikan draf surat'));
  assert.doesNotThrow(() => forbidPemaraf({ id: 's1', roles: ['SUPERADMIN'] }, 'mengembalikan draf surat'));
});

test('Penunjukan: hanya 2 Pemaraf yang ditunjuk boleh memaraf, paraf lengkap setelah keduanya', async () => {
  const tx = fakeTx(3);
  tx.approvalParaf.upsert = async ({ create }) => tx.approvalParaf.create({ data: create });
  await openParafRequest(tx, 'VERIFICATION_RESULT', 'a1', [PEMARAF_A, PEMARAF_B]);
  const outsider = { id: 'p3', name: 'Pemaraf C', isPemaraf: true };
  await assert.rejects(recordParaf(tx, 'VERIFICATION_RESULT', 'a1', outsider), e => e.statusCode === 403 && /tidak ditunjuk/.test(e.message));
  await recordParaf(tx, 'VERIFICATION_RESULT', 'a1', PEMARAF_B);
  await assert.rejects(requireParaf(tx, 'VERIFICATION_RESULT', 'a1'), e => e.statusCode === 409);
  const last = await recordParaf(tx, 'VERIFICATION_RESULT', 'a1', PEMARAF_A);
  assert.ok(last.signed_at);
  await requireParaf(tx, 'VERIFICATION_RESULT', 'a1');
});

test('Pemaraf aktif berkurang (misal cuti/dinonaktifkan): kuorum dinamis menyesuaikan tanpa membuat alur macet', async () => {
  // Awalnya ada 2 pemaraf, dokumen diserahkan dengan target 2
  const tx = fakeTx(2);
  await recordParaf(tx, 'MASTER_LETTER', 'm-dyn', PEMARAF_A);

  // Belum lengkap saat masih ada 2 pemaraf
  await assert.rejects(requireParaf(tx, 'MASTER_LETTER', 'm-dyn'), e => e.statusCode === 409);

  // Kemudian 1 pemaraf dinonaktifkan sehingga hanya tersisa 1 pemaraf aktif
  tx.user.count = async () => 1;

  // Dengan 1 pemaraf aktif dan PEMARAF_A sudah memaraf, dokumen kini dianggap lengkap
  await requireParaf(tx, 'MASTER_LETTER', 'm-dyn');
});

test('Super Admin dapat melakukan penimpaan paraf darurat (overrideParafByAdmin) dengan audit log', async () => {
  const tx = fakeTx(2);
  const adminUser = { id: 'sa-1', name: 'Super Admin LPMQ', roles: ['SUPERADMIN'] };

  // Penimpaan tanpa alasan cukup (< 10 karakter) ditolak
  await assert.rejects(
    overrideParafByAdmin(tx, 'MASTER_LETTER', 'm-override', adminUser, 'pendek'),
    e => e.statusCode === 400
  );

  // Bukan superadmin ditolak
  await assert.rejects(
    overrideParafByAdmin(tx, 'MASTER_LETTER', 'm-override', { id: 'u1', roles: ['VERIFIKATOR'] }, 'Alasan darurat karena kendala teknis'),
    e => e.statusCode === 403
  );

  // Super Admin berhasil melakukan penimpaan darurat
  const result = await overrideParafByAdmin(
    tx,
    'MASTER_LETTER',
    'm-override',
    adminUser,
    'Dispensasi darurat: seluruh pemaraf cuti dinas luar kota'
  );
  assert.equal(result.complete, true);
  await requireParaf(tx, 'MASTER_LETTER', 'm-override');
});
