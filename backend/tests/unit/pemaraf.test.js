import test from 'node:test';
import assert from 'node:assert/strict';
import { withPemaraf } from '../../src/utils/pemaraf.js';
import { requireParaf, recordParaf } from '../../src/services/paraf.service.js';

// tx tiruan: satu tabel paraf di memori, dengan jumlah akun Pemaraf aktif yang bisa diatur.
const fakeTx = (activePemaraf) => {
  const rows = new Map();
  const id = w => `${w.subject_type_subject_id.subject_type}:${w.subject_type_subject_id.subject_id}`;
  return {
    user: { count: async () => activePemaraf },
    auditLog: { create: async () => {} },
    approvalParaf: {
      findUnique: async ({ where }) => rows.get(id(where)) || null,
      upsert: async ({ where, create, update }) => {
        const row = { ...(rows.get(id(where)) || create), ...update };
        rows.set(id(where), row);
        return row;
      },
    },
  };
};

test('Pemaraf mendapat akses setara Kepala LPMQ tetapi ditandai sebagai pemaraf', () => {
  assert.deepEqual(withPemaraf(['PEMARAF']), { isPemaraf: true, roles: ['KEPALA_LPMQ'] });
  assert.deepEqual(withPemaraf(['KEPALA_LPMQ']), { isPemaraf: false, roles: ['KEPALA_LPMQ'] });
  // Kepala asli yang juga diberi peran Pemaraf tetap bertindak sebagai Kepala
  assert.deepEqual(withPemaraf(['KEPALA_LPMQ', 'PEMARAF']), { isPemaraf: false, roles: ['KEPALA_LPMQ'] });
});

test('Persetujuan Kepala ditolak sebelum paraf, dan lolos setelah Pemaraf membubuhkan paraf', async () => {
  const tx = fakeTx(1);
  await assert.rejects(requireParaf(tx, 'MASTER_LETTER', 'm1'), e => e.statusCode === 409);
  await recordParaf(tx, 'MASTER_LETTER', 'm1', { id: 'p1', name: 'Pemaraf' });
  await requireParaf(tx, 'MASTER_LETTER', 'm1');
  await assert.rejects(recordParaf(tx, 'MASTER_LETTER', 'm1', { id: 'p1', name: 'Pemaraf' }), e => e.statusCode === 409);
});

test('Tanpa akun Pemaraf aktif, alur lama tetap berjalan tanpa paraf', async () => {
  await requireParaf(fakeTx(0), 'MASTER_LETTER', 'm1');
});
