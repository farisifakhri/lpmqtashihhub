import 'dotenv/config';
import test from 'node:test';
import assert from 'node:assert/strict';
import { prisma } from '../../src/config/database.js';
import { parafDistribution } from '../../src/services/distribution.service.js';

// Keputusan distributor yang menunggu paraf tanpa Pemaraf yang ditunjuk (pemaraf_id: null).
const withPendingParaf = async (run) => {
  const original = prisma.$transaction;
  const tx = {
    approvalParaf: { findUnique: async () => ({ id: 'paraf-1', pemaraf_id: null, requested_by_id: 'dist-1', payload: { result: 'PASSED' }, signed_at: null }) },
    // pembuat keputusan sengaja tidak ditemukan: bila otorisasi lolos, layanan berhenti di 409 (bukan 403)
    user: { findUnique: async () => null },
  };
  prisma.$transaction = async (fn) => fn(tx);
  try {
    await run();
  } finally {
    prisma.$transaction = original;
  }
};

test('setiap akun berperan Pemaraf boleh membubuhkan paraf tanpa harus ditunjuk distributor', async () => {
  await withPendingParaf(async () => {
    const pemaraf = { id: 'pemaraf-lain', name: 'Pemaraf B', roles: ['KEPALA_LPMQ'], isPemaraf: true };
    await assert.rejects(parafDistribution('reg-1', pemaraf), (error) => error.statusCode === 409);
  });
});

test('hanya Pemaraf: Super Admin, Kepala LPMQ asli, dan Distributor ditolak', async () => {
  await withPendingParaf(async () => {
    for (const user of [
      { id: 'sa-1', name: 'Super Admin', roles: ['SUPERADMIN'], isPemaraf: false },
      { id: 'kepala-1', name: 'Kepala', roles: ['KEPALA_LPMQ'], isPemaraf: false },
      { id: 'dist-1', name: 'Distributor', roles: ['DISTRIBUTOR'], isPemaraf: false },
    ]) {
      await assert.rejects(parafDistribution('reg-1', user), (error) => error.statusCode === 403, user.name);
    }
  });
});
