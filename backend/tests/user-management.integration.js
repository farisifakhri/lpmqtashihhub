import assert from 'node:assert/strict';

export async function runUserManagementTests({ test, prisma, base, loginAs, adminToken, publisherToken }) {
  const call = async (path, token, method = 'GET', body) => {
    const res = await fetch(`${base}${path}`, {
      method,
      headers: {
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
        'Content-Type': 'application/json',
      },
      ...(method !== 'GET' && body !== undefined ? { body: JSON.stringify(body) } : {}),
    });
    const text = await res.text();
    let json = {};
    try {
      json = JSON.parse(text);
    } catch {
      json = { raw: text };
    }
    return { status: res.status, json };
  };

  const expect = async (path, token, method, body, status = 200) => {
    const result = await call(path, token, method, body);
    assert.equal(result.status, status, `Expected ${status} but got ${result.status}: ${JSON.stringify(result.json)}`);
    return result.json;
  };

  console.log('\n--- Manajemen Pengguna & Hak Akses Multi-Role Super Admin ---');

  let createdUserId = null;
  const testEmail = `test.petugas.${Date.now()}@lpmq.kemenag.go.id`;

  try {
    // 1. RBAC Tests: Non-authenticated & Non-admin
    await test('User Management: Akses tanpa token ditolak (401)', async () => {
      const res = await call('/users', null);
      assert.equal(res.status, 401);
    });

    await test('User Management: Akses oleh peran selain SUPERADMIN ditolak (403)', async () => {
      const res = await call('/users', publisherToken);
      assert.equal(res.status, 403);
    });

    // 2. Roles Endpoint
    await test('User Management: SUPERADMIN dapat melihat daftar semua role sistem', async () => {
      const res = await expect('/users/roles', adminToken, 'GET');
      assert.ok(Array.isArray(res.data));
      assert.ok(res.data.length >= 7);
      const codes = res.data.map((r) => r.code);
      assert.ok(codes.includes('SUPERADMIN'));
      assert.ok(codes.includes('VERIFIKATOR'));
      assert.ok(codes.includes('KEPALA_LPMQ'));
    });

    // 3. Create User Validation
    await test('User Management: Validasi penolakan data user tidak lengkap (400)', async () => {
      const res = await call('/users', adminToken, 'POST', {
        name: 'A',
        email: 'invalid-email',
        password: '123',
        roles: [],
      });
      assert.equal(res.status, 400);
    });

    // 4. Create User Success (Multi-Role)
    await test('User Management: SUPERADMIN berhasil membuat user baru dengan multi-role', async () => {
      const res = await expect('/users', adminToken, 'POST', {
        name: 'Ust. Ahmad Fauzan, M.Ag',
        email: testEmail,
        password: 'password123',
        nip: `19850101${Date.now().toString().slice(-10)}`,
        status: 'ACTIVE',
        roles: ['VERIFIKATOR', 'PENTASHIH'],
      }, 201);

      assert.ok(res.data.id);
      assert.equal(res.data.email, testEmail);
      assert.equal(res.data.roles.length, 2);
      assert.ok(res.data.roles.includes('VERIFIKATOR'));
      assert.ok(res.data.roles.includes('PENTASHIH'));
      createdUserId = res.data.id;
    });

    // 5. Duplicate Email
    await test('User Management: Pendaftaran email duplikat ditolak (409)', async () => {
      const res = await call('/users', adminToken, 'POST', {
        name: 'Duplikat Email',
        email: testEmail,
        password: 'password123',
        roles: ['VERIFIKATOR'],
      });
      assert.equal(res.status, 409);
    });

    // 6. List Users & Search
    await test('User Management: SUPERADMIN dapat mencari dan memfilter daftar user', async () => {
      const res = await expect(`/users?search=${encodeURIComponent('Ahmad Fauzan')}`, adminToken, 'GET');
      assert.ok(res.data.items.length >= 1);
      const found = res.data.items.find((u) => u.id === createdUserId);
      assert.ok(found);
      assert.equal(found.email, testEmail);
    });

    // 7. Update User
    await test('User Management: SUPERADMIN berhasil memperbarui data dan menambah role user', async () => {
      const res = await expect(`/users/${createdUserId}`, adminToken, 'PUT', {
        name: 'Dr. H. Ahmad Fauzan, M.Ag',
        roles: ['VERIFIKATOR', 'PENTASHIH', 'DISTRIBUTOR'],
      });
      assert.equal(res.data.name, 'Dr. H. Ahmad Fauzan, M.Ag');
      assert.equal(res.data.roles.length, 3);
      assert.ok(res.data.roles.includes('DISTRIBUTOR'));
    });

    // 8. Grant All Roles
    await test('User Management: SUPERADMIN dapat memberikan seluruh role sistem ke pengguna', async () => {
      const grantRes = await expect(`/users/${createdUserId}/grant-all-roles`, adminToken, 'POST');
      assert.ok(grantRes.data.roles.length >= 7);
      assert.ok(grantRes.data.roles.includes('SUPERADMIN'));
      assert.ok(grantRes.data.roles.includes('VERIFIKATOR'));
      assert.ok(grantRes.data.roles.includes('KEPALA_LPMQ'));
      assert.ok(grantRes.data.roles.includes('DISTRIBUTOR'));
      assert.ok(grantRes.data.roles.includes('PENTASHIH'));
      assert.ok(grantRes.data.roles.includes('DOKUMENTATOR'));
      assert.ok(grantRes.data.roles.includes('ADMIN_PENERBIT'));
    });

    // 9. Delete Self Guard
    await test('User Management: SUPERADMIN dicegah menghapus akun miliknya sendiri (400)', async () => {
      const meRes = await expect('/auth/me', adminToken, 'GET');
      const adminId = meRes.data.id;
      const res = await call(`/users/${adminId}`, adminToken, 'DELETE');
      assert.equal(res.status, 400);
    });

    // 10. Delete User Success
    await test('User Management: SUPERADMIN berhasil menghapus user yang baru dibuat', async () => {
      const res = await expect(`/users/${createdUserId}`, adminToken, 'DELETE');
      assert.equal(res.data.action, 'DELETED');
      createdUserId = null;
    });

    // 11. Create Admin Internal & Super Admin explicitly
    let adminInternalId = null;
    let newSuperadminId = null;
    const adminInternalEmail = `test.admin.internal.${Date.now()}@lpmq.kemenag.go.id`;
    const newSuperadminEmail = `test.superadmin.${Date.now()}@lpmq.kemenag.go.id`;

    try {
      await test('User Management: SUPERADMIN dapat membuat akun ADMIN (Admin Internal) dan mengujinya', async () => {
        const res = await expect('/users', adminToken, 'POST', {
          name: 'Staf Admin Internal Uji',
          email: adminInternalEmail,
          password: 'password123',
          nip: '199001012015011010',
          status: 'ACTIVE',
          roles: ['ADMIN'],
        }, 201);

        assert.ok(res.data.id);
        assert.equal(res.data.email, adminInternalEmail);
        assert.ok(res.data.roles.includes('ADMIN'));
        adminInternalId = res.data.id;

        // Login sebagai Admin Internal
        const login = await loginAs(adminInternalEmail, 'password123');
        assert.ok(login.token);

        // Hak akses: Admin Internal dapat melihat laporan kinerja
        const repRes = await call('/reports/verification-performance', login.token);
        assert.equal(repRes.status, 200);

        // Batas akses: Admin Internal DILARANG mengelola akun pengguna (hanya SUPERADMIN) -> 403
        const usersRes = await call('/users', login.token);
        assert.equal(usersRes.status, 403);
      });

      await test('User Management: SUPERADMIN dapat membuat akun SUPERADMIN baru', async () => {
        const res = await expect('/users', adminToken, 'POST', {
          name: 'Super Admin Kedua Uji',
          email: newSuperadminEmail,
          password: 'password123',
          nip: '198202022007011002',
          status: 'ACTIVE',
          roles: ['SUPERADMIN'],
        }, 201);

        assert.ok(res.data.id);
        assert.equal(res.data.email, newSuperadminEmail);
        assert.ok(res.data.roles.includes('SUPERADMIN'));
        newSuperadminId = res.data.id;

        const login = await loginAs(newSuperadminEmail, 'password123');
        assert.ok(login.token);

        // Super Admin baru dapat mengakses daftar users
        const usersRes = await call('/users', login.token);
        assert.equal(usersRes.status, 200);
      });
    } finally {
      if (adminInternalId) {
        await prisma.userRole.deleteMany({ where: { user_id: adminInternalId } }).catch(() => {});
        await prisma.user.delete({ where: { id: adminInternalId } }).catch(() => {});
      }
      if (newSuperadminId) {
        await prisma.userRole.deleteMany({ where: { user_id: newSuperadminId } }).catch(() => {});
        await prisma.user.delete({ where: { id: newSuperadminId } }).catch(() => {});
      }
    }

  } finally {
    // Cleanup if test failed before delete
    if (createdUserId) {
      await prisma.userRole.deleteMany({ where: { user_id: createdUserId } }).catch(() => {});
      await prisma.publisher.deleteMany({ where: { user_id: createdUserId } }).catch(() => {});
      await prisma.user.delete({ where: { id: createdUserId } }).catch(() => {});
    }
  }
}
