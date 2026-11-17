import test from 'node:test';
import assert from 'node:assert/strict';
import {
  submitToTu,
  parafDocument,
  signDocument,
} from '../../src/services/official-document.service.js';
import {
  revokeAssignment,
  assertReadyForSttEligibility,
} from '../../src/services/distribution.service.js';
import { revokePentashihAssignmentSchema } from '../../src/validators/workflow.validator.js';
import { prisma } from '../../src/config/database.js';

test('B20-06: revokeAssignment menolak role ADMIN_INTERNAL (403) dan menolak alasan < 10 karakter', async () => {
  const asgId = 'asg-test-b20-06';
  const adminTu = { id: 'u-tu-1', name: 'Staf TU', roles: ['ADMIN_INTERNAL'] };
  const distributorUser = { id: 'u-dist-1', name: 'Distributor', roles: ['DISTRIBUTOR'] };

  const mockTx = {
    assignment: {
      findUnique: async () => ({
        id: asgId,
        registration_id: 'reg-1',
        status: 'ASSIGNED',
        registration: { id: 'reg-1', status: 'TASHIH_IN_PROGRESS' },
        assignee: { id: 'u-pentashih-1', name: 'Pentashih' },
        juz_items: [{ juz_number: 1 }],
      }),
      update: async ({ data }) => ({ id: asgId, ...data }),
    },
    auditLog: {
      create: async () => ({ id: 'audit-1' }),
    },
  };

  const origTx = prisma.$transaction;
  prisma.$transaction = async (fn) => fn(mockTx);

  try {
    // 1. ADMIN_INTERNAL ditolak dari pencabutan penugasan (403)
    await assert.rejects(
      async () => {
        await revokeAssignment(asgId, { reason: 'Pencabutan oleh staf TU' }, adminTu);
      },
      (err) => {
        assert.equal(err.statusCode, 403);
        assert.match(err.message, /distributor atau administrator sistem/i);
        return true;
      }
    );

    // 2. Skema Zod revokePentashihAssignmentSchema menolak alasan < 10 karakter
    const shortReason = revokePentashihAssignmentSchema.body.safeParse({ reason: 'Sakit 123' }); // 9 karakter
    assert.equal(shortReason.success, false);
    assert.match(shortReason.error.issues[0].message, /minimal 10 karakter/i);

    const validReason = revokePentashihAssignmentSchema.body.safeParse({ reason: 'Cuti dinas luar kota' }); // 20 karakter
    assert.equal(validReason.success, true);

    // 3. Distributor dengan alasan >= 10 karakter berhasil
    const result = await revokeAssignment(asgId, { reason: 'Cuti dinas luar kota' }, distributorUser);
    assert.ok(result);
    assert.equal(result.success, true);
    assert.equal(result.assignment.status, 'REVOKED');
  } finally {
    prisma.$transaction = origTx;
  }
});

test('B20-07: assertReadyForSttEligibility memuat query tanpa duplikasi key dan memvalidasi siklus DUMMY', async () => {
  const regId = 'reg-b20-07';

  let findManyCalled = false;
  let findManyArgs = null;

  const mockTx = {
    assignment: {
      findFirst: async () => ({
        iteration: 2,
        stage: 'DUMMY',
      }),
      findMany: async (args) => {
        findManyCalled = true;
        findManyArgs = args;
        return [
          {
            id: 'asg-1',
            status: 'COMPLETED',
            reviews: [
              { result: 'PASSED', recap_file_id: 'recap-uuid-1', recap_scope: 'SELF' },
            ],
            juz_items: [{ juz_number: 1 }],
          },
        ];
      },
    },
  };

  const res = await assertReadyForSttEligibility(mockTx, regId);
  assert.equal(res.lastIteration, 2);
  assert.equal(findManyCalled, true);
  // Pastikan include memuat reviews dan juz_items secara bersih
  assert.deepEqual(findManyArgs.include, { reviews: true, juz_items: true });
});
