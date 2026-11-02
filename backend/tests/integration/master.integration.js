import assert from 'node:assert/strict';

export async function runMasterTests({ test, prisma, base, loginAs, adminToken, publisherToken }) {
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

  console.log('\n--- Kategori Master CRUD & RBAC (MST-01 & MST-02) ---');

  let createdCatId = null;
  let createdServiceId = null;
  let createdAddonId = null;

  try {
    // 1. RBAC Tests: Non-authenticated & Non-admin
    await test('Master CRUD: Akses tanpa otentikasi ditolak (401)', async () => {
      const res = await call('/master/service-types', null, 'POST', { name: 'Test Tanpa Token' });
      assert.equal(res.status, 401);
    });

    await test('Master CRUD: Akses oleh peran selain SUPERADMIN ditolak (403)', async () => {
      const res = await call('/master/service-types', publisherToken, 'POST', {
        name: 'Mushaf Liar',
        category_id: '11111111-1111-1111-1111-111111111111',
      });
      assert.equal(res.status, 403);
    });

    // 2. Kategori CRUD
    await test('Master CRUD: Validasi penolakan data kategori yang tidak valid (400)', async () => {
      const res = await call('/master/categories', adminToken, 'POST', {
        code: '',
        name: '',
      });
      assert.equal(res.status, 400);
    });

    await test('Master CRUD: SUPERADMIN berhasil menambah kategori baru', async () => {
      const res = await expect('/master/categories', adminToken, 'POST', {
        code: 'CAT-TEST',
        name: 'Kategori Uji Integrasi',
        display_order: 99,
      }, 201);
      assert.equal(res.success, true);
      assert.equal(res.data.code, 'CAT-TEST');
      createdCatId = res.data.id;
    });

    await test('Master CRUD: SUPERADMIN memperbarui nama kategori', async () => {
      const res = await expect(`/master/categories/${createdCatId}`, adminToken, 'PUT', {
        name: 'Kategori Uji Integrasi Diperbarui',
      }, 200);
      assert.equal(res.success, true);
      assert.equal(res.data.name, 'Kategori Uji Integrasi Diperbarui');
    });

    await test('Master CRUD: Mendapatkan detail kategori berdasarkan ID', async () => {
      const res = await expect(`/master/categories/${createdCatId}`, null, 'GET');
      assert.equal(res.success, true);
      assert.equal(res.data.id, createdCatId);
    });

    // 3. Service Type CRUD
    await test('Master CRUD: Validasi penolakan tarif negatif / durasi tidak valid (400)', async () => {
      const res = await call('/master/service-types', adminToken, 'POST', {
        category_id: createdCatId,
        name: 'Layanan Tarif Minus',
        base_fee: -50000,
        duration_initial: 0,
      });
      assert.equal(res.status, 400);
    });

    await test('Master CRUD: SUPERADMIN berhasil menambah jenis layanan baru (dengan mapping field UI)', async () => {
      const res = await expect('/master/service-types', adminToken, 'POST', {
        category_id: createdCatId,
        name: 'Mushaf Interaktif Digital Uji',
        service_kind: 'DIGITAL',
        baseCost: 1500000,
        baseDurationDays: 14,
        revisionDurationDays: 5,
        dummyDurationDays: 2,
      }, 201);
      assert.equal(res.success, true);
      assert.equal(res.data.name, 'Mushaf Interaktif Digital Uji');
      assert.equal(Number(res.data.base_fee), 1500000);
      assert.equal(res.data.duration_initial, 14);
      createdServiceId = res.data.id;
    });

    await test('Master CRUD: Mendapatkan detail layanan pentashihan berdasarkan ID', async () => {
      const res = await expect(`/master/service-types/${createdServiceId}`, null, 'GET');
      assert.equal(res.success, true);
      assert.equal(res.data.id, createdServiceId);
      assert.equal(res.data.category.id, createdCatId);
    });

    await test('Master CRUD: SUPERADMIN memperbarui tarif dan durasi layanan', async () => {
      const res = await expect(`/master/service-types/${createdServiceId}`, adminToken, 'PUT', {
        base_fee: 1750000,
        duration_initial: 20,
      }, 200);
      assert.equal(res.success, true);
      assert.equal(Number(res.data.base_fee), 1750000);
      assert.equal(res.data.duration_initial, 20);
    });

    // 4. Addon CRUD
    await test('Master CRUD: SUPERADMIN berhasil menambah addon layanan baru', async () => {
      const res = await expect('/master/addons', adminToken, 'POST', {
        code: 'ADD-TEST-KOREKSI',
        name: 'Layanan Uji Koreksi Khusus',
        fee: 350000,
      }, 201);
      assert.equal(res.success, true);
      assert.equal(res.data.code, 'ADD-TEST-KOREKSI');
      createdAddonId = res.data.id;
    });

    await test('Master CRUD: SUPERADMIN memperbarui tarif addon', async () => {
      const res = await expect(`/master/addons/${createdAddonId}`, adminToken, 'PUT', {
        fee: 400000,
      }, 200);
      assert.equal(res.success, true);
      assert.equal(Number(res.data.fee), 400000);
    });

    // 5. Soft-Delete Verifications
    await test('Master CRUD: SUPERADMIN menonaktifkan jenis layanan (soft-delete)', async () => {
      const res = await expect(`/master/service-types/${createdServiceId}`, adminToken, 'DELETE');
      assert.equal(res.success, true);
      assert.equal(res.data.status, 'INACTIVE');

      // Pastikan di getServiceTypes default sudah tidak muncul
      const list = await expect('/master/service-types', null, 'GET');
      const found = list.data.find((s) => s.id === createdServiceId);
      assert.equal(found, undefined, 'Layanan yang dinonaktifkan tidak boleh muncul di daftar aktif default');
    });

    await test('Master CRUD: SUPERADMIN menonaktifkan addon (soft-delete)', async () => {
      const res = await expect(`/master/addons/${createdAddonId}`, adminToken, 'DELETE');
      assert.equal(res.success, true);
      assert.equal(res.data.status, 'INACTIVE');
    });

    await test('Master CRUD: SUPERADMIN menonaktifkan kategori setelah layanan di bawahnya inaktif', async () => {
      const res = await expect(`/master/categories/${createdCatId}`, adminToken, 'DELETE');
      assert.equal(res.success, true);
      assert.equal(res.data.status, 'INACTIVE');
    });

  } finally {
    // Bersihkan data uji dari database jika ada
    if (createdServiceId) {
      await prisma.serviceType.deleteMany({ where: { id: createdServiceId } });
    }
    if (createdCatId) {
      await prisma.mushafCategory.deleteMany({ where: { id: createdCatId } });
    }
    if (createdAddonId) {
      await prisma.serviceAddon.deleteMany({ where: { id: createdAddonId } });
    }
  }
}

