import test from 'node:test';
import assert from 'node:assert/strict';
import { sendPublisherReminder } from '../src/services/distribution.service.js';
import { prisma } from '../src/config/database.js';

test('B-08: sendPublisherReminder fails if registration is not in REVISION_REQUIRED status', async () => {
  const originalTx = prisma.$transaction;
  try {
    prisma.$transaction = async (callback) => {
      const mockTx = {
        registration: {
          findUnique: async () => ({
            id: 'reg-b08-not-rev',
            status: 'READY_FOR_VERIFICATION',
            core_distributor_id: 'dist-user-1',
            publisher: { user_id: 'pub-user-1' },
          }),
        },
      };
      return callback(mockTx);
    };

    const user = { id: 'dist-user-1', name: 'Distributor 1', roles: ['DISTRIBUTOR'] };
    await assert.rejects(
      async () => {
        await sendPublisherReminder('reg-b08-not-rev', user);
      },
      (err) => {
        assert.equal(err.statusCode, 409);
        assert.match(err.message, /Pengingat perbaikan hanya dapat dikirimkan saat pengajuan berstatus "REVISION_REQUIRED"/);
        return true;
      }
    );
  } finally {
    prisma.$transaction = originalTx;
  }
});

test('B-08: sendPublisherReminder enforces DISTRIBUTOR or ADMIN_INTERNAL permission', async () => {
  const originalTx = prisma.$transaction;
  try {
    prisma.$transaction = async (callback) => {
      const mockTx = {
        registration: {
          findUnique: async () => ({
            id: 'reg-b08-perm',
            status: 'REVISION_REQUIRED',
            core_distributor_id: 'dist-user-1',
            publisher: { user_id: 'pub-user-1' },
          }),
        },
      };
      return callback(mockTx);
    };

    const unauthorizedUser = { id: 'other-user', name: 'Regular Pentashih', roles: ['PENTASHIH'] };
    await assert.rejects(
      async () => {
        await sendPublisherReminder('reg-b08-perm', unauthorizedUser);
      },
      (err) => {
        assert.equal(err.statusCode, 403);
        assert.match(err.message, /Hanya petugas Distributor atau Admin Internal yang berwenang/);
        return true;
      }
    );
  } finally {
    prisma.$transaction = originalTx;
  }
});

test('B-08: sendPublisherReminder creates in-app notification, updates metadata, and records audit', async () => {
  const originalTx = prisma.$transaction;
  let createdNotif = null;
  let updatedMeta = null;
  let createdAudit = null;

  try {
    const eightDaysAgo = new Date(Date.now() - 8 * 24 * 60 * 60 * 1000);
    prisma.$transaction = async (callback) => {
      const mockTx = {
        registration: {
          findUnique: async () => ({
            id: 'reg-b08-success',
            registration_no: 'REG-2026-B08-01',
            status: 'REVISION_REQUIRED',
            stage_entered_at: eightDaysAgo,
            core_distributor_id: 'dist-user-1',
            foreign_metadata: { reminder_count: 1 },
            publisher: { legal_name: 'PT Quran Barokah', user_id: 'pub-acc-1' },
          }),
          update: async ({ data }) => {
            updatedMeta = data.foreign_metadata;
            return { id: 'reg-b08-success', foreign_metadata: updatedMeta };
          },
        },
        officialDocument: {
          findFirst: async () => ({
            content_snapshot: { revision_round: 2, revision_kind: 'NASKAH_PERBAIKAN' },
          }),
        },
        notification: {
          create: async ({ data }) => {
            createdNotif = data;
            return { id: 'notif-b08-1', ...data };
          },
        },
        auditLog: {
          create: async ({ data }) => {
            createdAudit = data;
            return { id: 'audit-b08-1', ...data };
          },
        },
      };
      return callback(mockTx);
    };

    const user = { id: 'dist-user-1', name: 'Distributor Resmi', roles: ['DISTRIBUTOR'] };
    const res = await sendPublisherReminder('reg-b08-success', user);

    assert.ok(res.success);
    assert.equal(res.waiting_days, 8);
    assert.equal(res.reminder_count, 2);

    assert.ok(createdNotif);
    assert.equal(createdNotif.user_id, 'pub-acc-1');
    assert.equal(createdNotif.type, 'REVISION_REMINDER');
    assert.equal(createdNotif.payload.waiting_days, 8);
    assert.equal(createdNotif.payload.revision_round, 2);

    assert.ok(updatedMeta);
    assert.equal(updatedMeta.reminder_count, 2);
    assert.ok(updatedMeta.last_reminder_at);

    assert.ok(createdAudit);
    assert.equal(createdAudit.action, 'SEND_PUBLISHER_REMINDER');
  } finally {
    prisma.$transaction = originalTx;
  }
});

