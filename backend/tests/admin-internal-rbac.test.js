import test from 'node:test';
import assert from 'node:assert/strict';
import { requireAdminInternal, requireManualTeamAssignment } from '../src/middlewares/admin-internal.middleware.js';
import { authorize } from '../src/middlewares/rbac.middleware.js';
import { prisma } from '../src/config/database.js';
import {
  listUsers,
  getUserDetail,
  createUser,
  updateUser,
  deleteUser,
  requestPasswordResetForUser,
} from '../src/services/user-management.service.js';
import { emailProvider } from '../src/services/email-provider.service.js';
import { whatsAppProvider } from '../src/services/whatsapp-provider.service.js';

function mockGuard(guard, user) {
  let next = false;
  let status = null;
  let body = null;
  const req = { user };
  const res = {
    status(code) {
      status = code;
      return this;
    },
    json(data) {
      body = data;
      return this;
    },
  };
  guard(req, res, () => {
    next = true;
  });
  return { next, status, body };
}

test('T-F02: Middleware requireAdminInternal hanya mengizinkan ADMIN_INTERNAL dan SUPERADMIN', () => {
  for (const role of ['ADMIN_INTERNAL', 'SUPERADMIN']) {
    const res = mockGuard(requireAdminInternal, { roles: [role] });
    assert.equal(res.next, true, `Role ${role} harus diizinkan`);
  }

  for (const role of ['VERIFIKATOR', 'DISTRIBUTOR', 'PENTASHIH', 'DOKUMENTATOR', 'PENERBIT', 'KEPALA_LPMQ']) {
    const res = mockGuard(requireAdminInternal, { roles: [role] });
    assert.equal(res.status, 403, `Role ${role} harus ditolak`);
    assert.equal(res.next, false);
  }
});

test('T-F02: Route guard user management mengizinkan SUPERADMIN dan ADMIN_INTERNAL, tolak peran operasional', () => {
  const userManagementGuard = authorize('SUPERADMIN', 'ADMIN_INTERNAL');

  assert.equal(mockGuard(userManagementGuard, { roles: ['SUPERADMIN'] }).next, true);
  assert.equal(mockGuard(userManagementGuard, { roles: ['ADMIN_INTERNAL'] }).next, true);

  for (const role of ['VERIFIKATOR', 'DISTRIBUTOR', 'PENTASHIH', 'DOKUMENTATOR', 'PENERBIT', 'KEPALA_LPMQ']) {
    const res = mockGuard(userManagementGuard, { roles: [role] });
    assert.equal(res.status, 403, `Role ${role} tidak boleh mengakses user management`);
    assert.equal(res.next, false);
  }
});

test('T-F02: Endpoint grant-all-roles tetap tertutup ketat hanya untuk SUPERADMIN', () => {
  const superadminOnlyGuard = authorize('SUPERADMIN');

  assert.equal(mockGuard(superadminOnlyGuard, { roles: ['SUPERADMIN'] }).next, true);
  assert.equal(mockGuard(superadminOnlyGuard, { roles: ['ADMIN_INTERNAL'] }).status, 403);
  assert.equal(mockGuard(superadminOnlyGuard, { roles: ['ADMIN_INTERNAL'] }).next, false);
});

test('T-F02: Wewenang operasional DISTRIBUTOR tetap utuh dan terpisah dari ADMIN_INTERNAL', () => {
  // Guard khusus tim internal
  for (const role of ['ADMIN_INTERNAL', 'SUPERADMIN']) {
    assert.equal(mockGuard(requireManualTeamAssignment, { roles: [role] }).next, true);
  }
  // Distributor tidak ditolak dari peran operasionalnya
  const distributorGuard = authorize('DISTRIBUTOR');
  assert.equal(mockGuard(distributorGuard, { roles: ['DISTRIBUTOR'] }).next, true);
  assert.equal(mockGuard(distributorGuard, { roles: ['ADMIN_INTERNAL'] }).status, 403);
});

test('T-F02: Proteksi Hirarki Role (Anti-Privilege Escalation)', async () => {
  const adminActor = {
    id: 'admin-internal-uuid-1',
    name: 'Ketua Pentashih',
    roles: ['ADMIN_INTERNAL'],
  };

  // 1. ADMIN_INTERNAL tidak boleh membuat akun dengan role SUPERADMIN / KEPALA_LPMQ / ADMIN_INTERNAL
  await assert.rejects(
    async () => {
      await createUser({
        name: 'Attempted Superadmin',
        email: 'attacker@kemenag.go.id',
        password: 'password123',
        roles: ['SUPERADMIN'],
      }, adminActor);
    },
    (err) => {
      assert.equal(err.statusCode, 403);
      assert.ok(err.message.includes('Admin Internal hanya berwenang'));
      return true;
    }
  );

  // 2. ADMIN_INTERNAL tidak boleh mereset password akun SUPERADMIN / KEPALA_LPMQ / sesama ADMIN_INTERNAL
  // Mock target user privileged di database
  const originalFindUnique = prisma.user.findUnique;
  prisma.user.findUnique = async ({ where }) => {
    if (where.id === 'superadmin-target-id') {
      return {
        id: 'superadmin-target-id',
        name: 'Kepala Super Admin',
        email: 'superadmin@kemenag.go.id',
        roles: [{ role: { code: 'SUPERADMIN' } }],
      };
    }
    if (where.id === 'kepala-lpmq-target-id') {
      return {
        id: 'kepala-lpmq-target-id',
        name: 'Kepala LPMQ RI',
        email: 'kepala@kemenag.go.id',
        roles: [{ role: { code: 'KEPALA_LPMQ' } }],
      };
    }
    if (where.id === 'staf-pentashih-id') {
      return {
        id: 'staf-pentashih-id',
        name: 'Ahmad Pentashih',
        email: 'ahmad.pentashih@kemenag.go.id',
        whatsapp_number: '+6281234567890',
        roles: [{ role: { code: 'PENTASHIH' } }],
      };
    }
    return null;
  };

  try {
    // Coba reset password SUPERADMIN oleh ADMIN_INTERNAL -> Wajib 403
    await assert.rejects(
      async () => {
        await requestPasswordResetForUser('superadmin-target-id', adminActor);
      },
      (err) => {
        assert.equal(err.statusCode, 403);
        assert.ok(err.message.includes('Admin Internal tidak memiliki izin'));
        return true;
      }
    );

    // Coba reset password KEPALA_LPMQ oleh ADMIN_INTERNAL -> Wajib 403
    await assert.rejects(
      async () => {
        await requestPasswordResetForUser('kepala-lpmq-target-id', adminActor);
      },
      (err) => {
        assert.equal(err.statusCode, 403);
        assert.ok(err.message.includes('Admin Internal tidak memiliki izin'));
        return true;
      }
    );

    // Mock token deletion & creation
    prisma.passwordResetToken.deleteMany = async () => ({ count: 1 });
    prisma.passwordResetToken.create = async ({ data }) => ({ id: 'token-123', ...data });
    prisma.auditLog.create = async () => ({ id: 'audit-1' });

    // 3. ADMIN_INTERNAL berhasil memicu reset password untuk staf teknis (PENTASHIH)
    const resetResult = await requestPasswordResetForUser('staf-pentashih-id', adminActor);

    assert.ok(resetResult);
    assert.equal(resetResult.user_id, 'staf-pentashih-id');
    assert.equal(resetResult.email, 'ahmad.pentashih@kemenag.go.id');
    assert.ok(resetResult.reset_url.includes('/reset-password?token='));
    assert.equal(resetResult.sent_to_email, true);
    assert.equal(resetResult.sent_to_whatsapp, true);
  } finally {
    prisma.user.findUnique = originalFindUnique;
  }
});

