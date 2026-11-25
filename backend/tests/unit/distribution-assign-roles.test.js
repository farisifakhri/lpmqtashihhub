import test from 'node:test';
import assert from 'node:assert/strict';
import { createAssignments } from '../../src/services/distribution.service.js';
import { prisma } from '../../src/config/database.js';

// Lolos cek peran = berhenti di 409 pembayaran (mock pembayaran sengaja belum lunas); ditolak = 403.
const attempt = async (reg, user) => {
  const originalTx = prisma.$transaction;
  prisma.$transaction = async (callback) => callback({
    $queryRaw: async () => [],
    registration: { findUnique: async () => reg },
    paymentRecord: { findFirst: async () => null },
  });
  try {
    await createAssignments(reg.id, { stage: 'INITIAL', juz_assignments: [] }, user);
    return 'ok';
  } catch (error) {
    return error.statusCode;
  } finally {
    prisma.$transaction = originalTx;
  }
};

const distributor = { id: 'dist-1', roles: ['DISTRIBUTOR'] };
const otherDistributor = { id: 'dist-2', roles: ['DISTRIBUTOR'] };
const superadmin = { id: 'sa-1', roles: ['SUPERADMIN'] };
const admin = { id: 'adm-1', roles: ['ADMIN_INTERNAL'] };

test('Sidang Kembali: Distributor boleh menambah penugasan naskah tanpa tim inti yang sedang ditashih', async () => {
  const reg = { id: 'reg-1', status: 'TASHIH_IN_PROGRESS', core_team_number: null, core_distributor_id: null };
  assert.equal(await attempt(reg, distributor), 409);
  assert.equal(await attempt(reg, admin), 409);
});

test('Penugasan awal naskah tanpa tim inti tetap hanya oleh Admin', async () => {
  const reg = { id: 'reg-2', status: 'WAITING_DISTRIBUTION', core_team_number: null, core_distributor_id: null };
  assert.equal(await attempt(reg, distributor), 403);
  assert.equal(await attempt(reg, admin), 409);
});

test('Naskah tim inti: hanya distributor tim intinya (kebijakan rotasi tim inti)', async () => {
  const reg = { id: 'reg-3', status: 'TASHIH_IN_PROGRESS', core_team_number: 1, core_distributor_id: 'dist-1' };
  assert.equal(await attempt(reg, distributor), 409);
  assert.equal(await attempt(reg, otherDistributor), 403);
  assert.equal(await attempt(reg, superadmin), 403);
  assert.equal(await attempt(reg, admin), 403);
});
