import test from 'node:test';
import assert from 'node:assert/strict';
import { prisma } from '../src/config/database.js';
import { recordReview, approveDistribution } from '../src/services/distribution.service.js';
import { reviewSchema } from '../src/validators/workflow.validator.js';

function createMockTx(overrides = {}) {
  const mockTx = {
    $queryRaw: async () => [],
    registration: {
      findUnique: async () => ({ id: 'reg-1', status: 'TASHIH_IN_PROGRESS', publisher_id: 'pub-1' }),
      updateMany: async () => ({ count: 1 }),
      update: async ({ data }) => ({ id: 'reg-1', ...data }),
      ...overrides.registration,
    },
    assignment: {
      findUnique: async () => null,
      findFirst: async () => null,
      findMany: async () => [],
      update: async ({ data }) => ({ id: 'assign-1', ...data }),
      ...overrides.assignment,
    },
    tashihReview: {
      create: async ({ data }) => ({ id: 'rev-1', ...data }),
      ...overrides.tashihReview,
    },
    statusHistory: {
      create: async ({ data }) => ({ id: 'hist-1', ...data }),
      ...overrides.statusHistory,
    },
    auditLog: {
      create: async () => ({ id: 'audit-1' }),
      ...overrides.auditLog,
    },
    notification: {
      create: async ({ data }) => ({ id: 'notif-1', ...data }),
      ...overrides.notification,
    },
    user: {
      findMany: async () => [],
      ...overrides.user,
    },
    publisher: {
      findUnique: async () => ({ id: 'pub-1', user_id: 'pub-user-1' }),
      ...overrides.publisher,
    },
  };
  return mockTx;
}

test('reviewSchema validates review result and notes correctly', () => {
  assert.equal(reviewSchema.body.safeParse({ result: 'PASSED', notes: 'Lafaz dan tanda baca sesuai mushaf standar' }).success, true);
  assert.equal(reviewSchema.body.safeParse({ result: 'REVISION_REQUIRED', notes: 'Perbaiki ayat 15 surat Al-Baqarah' }).success, true);
  // Invalid result
  assert.equal(reviewSchema.body.safeParse({ result: 'INVALID_STATUS', notes: 'Catatan' }).success, false);
});

test('recordReview enforces PENTASHIH role and task ownership', async () => {
  const originalTx = prisma.$transaction;

  try {
    prisma.$transaction = async (cb) => {
      return cb(createMockTx({}));
    };

    // 1. Non-PENTASHIH is rejected with 403
    await assert.rejects(
      recordReview('assign-1', { result: 'PASSED', notes: 'OK' }, { id: 'u1', roles: ['VERIFIKATOR'] }),
      (err) => err.statusCode === 403
    );

    // 2. Pentashih trying to record review on someone else's assignment is rejected with 403
    prisma.$transaction = async (cb) => {
      return cb(createMockTx({
        assignment: {
          findUnique: async ({ where }) => ({
            id: where.id,
            registration_id: 'reg-1',
            assignee_id: 'other-user',
            status: 'ASSIGNED',
            reviews: [],
          }),
        },
      }));
    };

    await assert.rejects(
      recordReview('assign-1', { result: 'PASSED', notes: 'OK' }, { id: 'my-user', roles: ['PENTASHIH'] }),
      (err) => err.statusCode === 403 && err.message.includes('bukan tanggung jawab Anda')
    );

    // 3. Pentashih trying to overwrite already COMPLETED assignment is rejected with 409
    prisma.$transaction = async (cb) => {
      return cb(createMockTx({
        assignment: {
          findUnique: async ({ where }) => ({
            id: where.id,
            registration_id: 'reg-1',
            assignee_id: 'my-user',
            status: 'COMPLETED',
            reviews: [{ id: 'rev-1', result: 'PASSED' }],
          }),
        },
      }));
    };

    await assert.rejects(
      recordReview('assign-1', { result: 'PASSED', notes: 'OK' }, { id: 'my-user', roles: ['PENTASHIH'] }),
      (err) => err.statusCode === 409 && err.message.includes('tidak dapat ditimpa')
    );
  } finally {
    prisma.$transaction = originalTx;
  }
});

test('recordReview successfully stores review and transitions assignment status to COMPLETED', async () => {
  const originalTx = prisma.$transaction;
  let createdReview = null;
  let updatedAssignment = null;
  let auditCreated = null;

  try {
    prisma.$transaction = async (cb) => {
      return cb(createMockTx({
        assignment: {
          findUnique: async ({ where }) => ({
            id: where.id,
            registration_id: 'reg-1',
            assignee_id: 'pentashih-1',
            status: 'ASSIGNED',
            reviews: [],
          }),
          update: async ({ where, data }) => {
            updatedAssignment = { id: where.id, ...data };
            return updatedAssignment;
          },
        },
        tashihReview: {
          create: async ({ data }) => {
            createdReview = { id: 'rev-100', ...data };
            return createdReview;
          },
        },
        auditLog: {
          create: async ({ data }) => {
            auditCreated = data;
            return { id: 'audit-1', ...data };
          },
        },
      }));
    };

    const res = await recordReview(
      'assign-1',
      { result: 'PASSED', notes: 'Semua rasm usmani telah sesuai kriteria.' },
      { id: 'pentashih-1', roles: ['PENTASHIH'] }
    );

    assert.equal(res.id, 'rev-100');
    assert.equal(res.result, 'PASSED');
    assert.equal(updatedAssignment.status, 'COMPLETED');
    assert.equal(auditCreated.action, 'TASHIH_REVIEW');
  } finally {
    prisma.$transaction = originalTx;
  }
});

test('approveDistribution enforces DISTRIBUTOR role and completeness of all pentashih reviews', async () => {
  const originalTx = prisma.$transaction;

  try {
    prisma.$transaction = async (cb) => {
      return cb(createMockTx({}));
    };

    // 1. ADMIN or PENTASHIH is rejected with 403
    await assert.rejects(
      approveDistribution('reg-1', { result: 'PASSED', notes: 'OK' }, { id: 'u1', roles: ['ADMIN'] }),
      (err) => err.statusCode === 403
    );
    await assert.rejects(
      approveDistribution('reg-1', { result: 'PASSED', notes: 'OK' }, { id: 'u2', roles: ['PENTASHIH'] }),
      (err) => err.statusCode === 403
    );

    // 2. Rejects if not all team pentashih have completed reviews (409)
    prisma.$transaction = async (cb) => {
      return cb(createMockTx({
        assignment: {
          findFirst: async () => ({ iteration: 1 }),
          findMany: async () => [
            { id: 'a1', status: 'COMPLETED', reviews: [{ id: 'r1', result: 'PASSED' }] },
            { id: 'a2', status: 'ASSIGNED', reviews: [] }, // Still ongoing
          ],
        },
      }));
    };

    await assert.rejects(
      approveDistribution('reg-1', { result: 'PASSED', notes: 'Lulus' }, { id: 'dist-1', roles: ['DISTRIBUTOR'] }),
      (err) => err.statusCode === 409 && err.message.includes('masih ada penugasan yang belum selesai')
    );

    // 3. Rejects PASSED decision if any pentashih flagged REVISION_REQUIRED (409)
    prisma.$transaction = async (cb) => {
      return cb(createMockTx({
        assignment: {
          findFirst: async () => ({ iteration: 1 }),
          findMany: async () => [
            { id: 'a1', status: 'COMPLETED', reviews: [{ id: 'r1', result: 'PASSED' }] },
            { id: 'a2', status: 'COMPLETED', reviews: [{ id: 'r2', result: 'REVISION_REQUIRED' }] },
          ],
        },
      }));
    };

    await assert.rejects(
      approveDistribution('reg-1', { result: 'PASSED', notes: 'Lulus' }, { id: 'dist-1', roles: ['DISTRIBUTOR'] }),
      (err) => err.statusCode === 409 && err.message.includes('masih ada hasil sidang yang tidak lulus')
    );
  } finally {
    prisma.$transaction = originalTx;
  }
});

test('approveDistribution transitions to READY_FOR_STT on PASSED and notifies signatories', async () => {
  const originalTx = prisma.$transaction;
  let statusHistory = null;
  let notifications = [];

  try {
    prisma.$transaction = async (cb) => {
      return cb(createMockTx({
        assignment: {
          findFirst: async () => ({ iteration: 1 }),
          findMany: async () => [
            { id: 'a1', status: 'COMPLETED', reviews: [{ id: 'r1', result: 'PASSED' }] },
            { id: 'a2', status: 'COMPLETED', reviews: [{ id: 'r2', result: 'PASSED' }] },
          ],
        },
        statusHistory: {
          create: async ({ data }) => {
            statusHistory = data;
            return { id: 'hist-1', ...data };
          },
        },
        user: {
          findMany: async () => [
            { id: 'kepala-1', name: 'Kepala LPMQ' },
            { id: 'dok-1', name: 'Dokumentator' },
          ],
        },
        notification: {
          create: async ({ data }) => {
            notifications.push(data);
            return { id: 'notif-1', ...data };
          },
        },
      }));
    };

    const res = await approveDistribution(
      'reg-1',
      { result: 'PASSED', notes: 'Seluruh pentashih menyetujui mushaf tanpa koreksi' },
      { id: 'dist-1', roles: ['DISTRIBUTOR'] }
    );

    assert.equal(statusHistory.to_status, 'READY_FOR_STT');
    assert.equal(notifications.length, 2);
    assert.equal(notifications[0].type, 'READY_FOR_STT');
  } finally {
    prisma.$transaction = originalTx;
  }
});

test('approveDistribution transitions to REVISION_REQUIRED and notifies publisher users', async () => {
  const originalTx = prisma.$transaction;
  let statusHistory = null;
  let notifications = [];

  try {
    prisma.$transaction = async (cb) => {
      return cb(createMockTx({
        assignment: {
          findFirst: async () => ({ iteration: 1 }),
          findMany: async () => [
            { id: 'a1', status: 'COMPLETED', reviews: [{ id: 'r1', result: 'REVISION_REQUIRED' }] },
          ],
        },
        statusHistory: {
          create: async ({ data }) => {
            statusHistory = data;
            return { id: 'hist-1', ...data };
          },
        },
        user: {
          findMany: async () => [
            { id: 'pub-user-1', name: 'Penerbit Admin', publisher_id: 'pub-1' },
          ],
        },
        notification: {
          create: async ({ data }) => {
            notifications.push(data);
            return { id: 'notif-1', ...data };
          },
        },
      }));
    };

    const res = await approveDistribution(
      'reg-1',
      { result: 'REVISION_REQUIRED', notes: 'Perbaiki harakat surat Al-Fatihah' },
      { id: 'dist-1', roles: ['DISTRIBUTOR'] }
    );

    assert.equal(statusHistory.to_status, 'REVISION_REQUIRED');
    assert.equal(notifications.length, 1);
    assert.equal(notifications[0].type, 'REVISION_REQUIRED');
    assert.equal(notifications[0].user_id, 'pub-user-1');
  } finally {
    prisma.$transaction = originalTx;
  }
});

