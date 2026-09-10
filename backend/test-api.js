import assert from 'node:assert/strict';
import app from './src/app.js';
import { prisma } from './src/config/database.js';
import bcrypt from 'bcryptjs';

const PORT = 5005;
const BASE_URL = `http://localhost:${PORT}/api/v1`;

let totalTests = 0;
let passedTests = 0;
let failedTests = 0;

async function test(name, fn) {
  totalTests++;
  try {
    await fn();
    passedTests++;
    console.log(`  ✅ PASS: ${name}`);
  } catch (err) {
    failedTests++;
    console.error(`  ❌ FAIL: ${name}`);
    console.error(`     Error: ${err.message}`);
  }
}

async function runTests() {
  console.log('🧪 Memulai Test Suite Backend LPMQ (Assertions, Negative & Security Checks)...');

  const server = app.listen(PORT, async () => {
    try {
      // Helper login
      async function loginAs(email, password = 'password123') {
        const res = await fetch(`${BASE_URL}/auth/login`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ email, password }),
        });
        const json = await res.json();
        return { status: res.status, json, token: json.data?.token };
      }

      console.log('\n--- Kategori A: Health Check & Konfigurasi Keamanan ---');
      await test('Health check sistem mengembalikan UP dan DB CONNECTED', async () => {
        const res = await fetch(`${BASE_URL}/health`);
        assert.strictEqual(res.status, 200, 'HTTP status harus 200');
        const json = await res.json();
        assert.strictEqual(json.status, 'UP');
        assert.strictEqual(json.database.status, 'CONNECTED');
      });

      await test('Negative: Akses endpoint terproteksi tanpa token ditolak (401)', async () => {
        const res = await fetch(`${BASE_URL}/registrations`);
        assert.strictEqual(res.status, 401);
        const json = await res.json();
        assert.strictEqual(json.success, false);
      });

      await test('Negative: Akses dengan token palsu/rusak ditolak (401)', async () => {
        const res = await fetch(`${BASE_URL}/registrations`, {
          headers: { Authorization: 'Bearer token_palsu_random_123' },
        });
        assert.strictEqual(res.status, 401);
      });

      console.log('\n--- Kategori B: Master Data ---');
      let serviceTypesList = [];
      await test('Master Categories mengembalikan tepat 4 kategori mushaf', async () => {
        const res = await fetch(`${BASE_URL}/master/categories`);
        assert.strictEqual(res.status, 200);
        const json = await res.json();
        assert.strictEqual(json.success, true);
        assert.strictEqual(json.data.length, 4);
      });

      await test('Master Service Types mengembalikan 17 layanan standar', async () => {
        const res = await fetch(`${BASE_URL}/master/service-types`);
        assert.strictEqual(res.status, 200);
        const json = await res.json();
        assert.strictEqual(json.success, true);
        assert.strictEqual(json.data.length, 17);
        serviceTypesList = json.data;
      });

      console.log('\n--- Kategori C: Autentikasi & Multi-Role ---');
      let adminToken = '';
      let verifikatorToken = '';
      let publisherToken = '';
      let dokumentatorToken = '';
      let publisherUser = null;

      await test('Login SUPERADMIN berhasil dan memperoleh token', async () => {
        const { status, json, token } = await loginAs('admin@lpmq.kemenag.go.id');
        assert.strictEqual(status, 200);
        assert.ok(token, 'Token harus ada');
        assert.ok(json.data.user.roles.includes('SUPERADMIN'));
        adminToken = token;
      });

      await test('Login VERIFIKATOR berhasil', async () => {
        const { status, token } = await loginAs('verifikator@lpmq.kemenag.go.id');
        assert.strictEqual(status, 200);
        verifikatorToken = token;
      });

      await test('Login DOKUMENTATOR berhasil', async () => {
        const { status, token } = await loginAs('dokumentator@lpmq.kemenag.go.id');
        assert.strictEqual(status, 200);
        dokumentatorToken = token;
      });

      await test('Login ADMIN_PENERBIT berhasil dan membawa publisherId', async () => {
        const { status, json, token } = await loginAs('penerbit@mushafnusantara.com');
        assert.strictEqual(status, 200);
        assert.ok(json.data.user.publisherId, 'publisherId harus tersedia');
        publisherToken = token;
        publisherUser = json.data.user;
      });

      await test('Negative: Login dengan password salah ditolak (401)', async () => {
        const { status, json } = await loginAs('admin@lpmq.kemenag.go.id', 'passwordSalahTotal');
        assert.strictEqual(status, 401);
        assert.strictEqual(json.success, false);
      });

      console.log('\n--- Kategori D: Proteksi Endpoint Diagnostik (Isolasi Data) ---');
      await test('Negative: Penerbit dilarang mengakses /system/tables (403 Forbidden)', async () => {
        const res = await fetch(`${BASE_URL}/system/tables`, {
          headers: { Authorization: `Bearer ${publisherToken}` },
        });
        assert.strictEqual(res.status, 403, 'Penerbit tidak boleh melihat /tables');
      });

      await test('Negative: Penerbit dilarang mengakses /system/diagnostics/:module (403 Forbidden)', async () => {
        const res = await fetch(`${BASE_URL}/system/diagnostics/REG-02`, {
          headers: { Authorization: `Bearer ${publisherToken}` },
        });
        assert.strictEqual(res.status, 403, 'Penerbit tidak boleh melihat sampel pengajuan penerbit lain');
      });

      await test('SUPERADMIN diizinkan mengakses /system/diagnostics/MST-01', async () => {
        const res = await fetch(`${BASE_URL}/system/diagnostics/MST-01`, {
          headers: { Authorization: `Bearer ${adminToken}` },
        });
        assert.strictEqual(res.status, 200);
        const json = await res.json();
        assert.strictEqual(json.success, true);
        assert.strictEqual(json.module_code, 'MST-01');
      });

      console.log('\n--- Kategori E: Validasi Bisnis Pembuatan Draf Pengajuan ---');
      let validRegId = '';
      const selectedService = serviceTypesList[0];

      await test('Penerbit membuat draf pengajuan baru (NEW) yang valid', async () => {
        const res = await fetch(`${BASE_URL}/registrations`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${publisherToken}`,
          },
          body: JSON.stringify({
            service_type_id: selectedService.id,
            title: 'Mushaf Al-Qur\'an Standar Indonesia Uji Coba Sprint 0',
            registration_type: 'NEW',
          }),
        });
        assert.strictEqual(res.status, 201);
        const json = await res.json();
        assert.strictEqual(json.success, true);
        assert.ok(json.data.id);
        assert.ok(json.data.registration_no.startsWith('REG-'));
        assert.strictEqual(json.data.status, 'DRAFT');
        validRegId = json.data.id;
      });

      await test('Negative: Tipe NEW dilarang menyertakan previous_registration_id (400)', async () => {
        const res = await fetch(`${BASE_URL}/registrations`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${publisherToken}`,
          },
          body: JSON.stringify({
            service_type_id: selectedService.id,
            title: 'Mushaf Cacat Validasi',
            registration_type: 'NEW',
            previous_registration_id: 'a0000000-0000-0000-0000-000000000001',
          }),
        });
        assert.strictEqual(res.status, 400);
      });

      await test('Negative: Tipe EXTENSION tanpa previous_registration_id ditolak (400)', async () => {
        const res = await fetch(`${BASE_URL}/registrations`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${publisherToken}`,
          },
          body: JSON.stringify({
            service_type_id: selectedService.id,
            title: 'Mushaf Perpanjangan Tanpa Rujukan',
            registration_type: 'EXTENSION',
          }),
        });
        assert.strictEqual(res.status, 400);
      });

      await test('Negative: Pembuatan draf dengan addon ID tidak valid ditolak (400)', async () => {
        const res = await fetch(`${BASE_URL}/registrations`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${publisherToken}`,
          },
          body: JSON.stringify({
            service_type_id: selectedService.id,
            title: 'Mushaf Addon Fiktif',
            registration_type: 'NEW',
            addons: ['00000000-0000-0000-0000-000000000099'],
          }),
        });
        assert.strictEqual(res.status, 400);
      });

      console.log('\n--- Kategori F: Akses Lintas Penerbit (Tenant Isolation) ---');
      // Buat user penerbit kedua untuk uji isolasi
      const mockPublisherB = await prisma.publisher.upsert({
        where: { id: 'pub-test-tenant-b' },
        update: {},
        create: {
          id: 'pub-test-tenant-b',
          legal_name: 'PT Percetakan Antar Pulau (Tenant B)',
          entity_type: 'PT',
          verification_status: 'VERIFIED',
        },
      });

      const mockUserBPassword = await bcrypt.hash('password123', 10);
      const mockUserB = await prisma.user.upsert({
        where: { email: 'penerbit.b@tenanttest.com' },
        update: {},
        create: {
          name: 'Penerbit B',
          email: 'penerbit.b@tenanttest.com',
          password_hash: mockUserBPassword,
          status: 'ACTIVE',
        },
      });

      const publisherRole = await prisma.role.findUnique({ where: { code: 'ADMIN_PENERBIT' } });
      await prisma.userRole.upsert({
        where: { user_id_role_id: { user_id: mockUserB.id, role_id: publisherRole.id } },
        update: {},
        create: { user_id: mockUserB.id, role_id: publisherRole.id },
      });

      await prisma.publisher.update({
        where: { id: mockPublisherB.id },
        data: { user_id: mockUserB.id },
      });

      const { token: publisherBToken } = await loginAs('penerbit.b@tenanttest.com');

      await test('Negative: Penerbit B dilarang melihat detail pengajuan milik Penerbit A (403)', async () => {
        const res = await fetch(`${BASE_URL}/registrations/${validRegId}`, {
          headers: { Authorization: `Bearer ${publisherBToken}` },
        });
        assert.strictEqual(res.status, 403);
      });

      await test('Negative: Penerbit B dilarang men-submit pengajuan milik Penerbit A (403)', async () => {
        const res = await fetch(`${BASE_URL}/registrations/${validRegId}/submit`, {
          method: 'POST',
          headers: { Authorization: `Bearer ${publisherBToken}` },
        });
        assert.strictEqual(res.status, 403);
      });

      console.log('\n--- Kategori G: Workflow Submit & Snapshot Tarif/SLA ---');
      await test('Penerbit sah berhasil men-submit pengajuan (READY_FOR_VERIFICATION)', async () => {
        const res = await fetch(`${BASE_URL}/registrations/${validRegId}/submit`, {
          method: 'POST',
          headers: { Authorization: `Bearer ${publisherToken}` },
        });
        assert.strictEqual(res.status, 200);
        const json = await res.json();
        assert.strictEqual(json.success, true);
        assert.strictEqual(json.data.status, 'READY_FOR_VERIFICATION');
        assert.ok(json.data.fee_sla_snapshot);
      });

      await test('Negative: Re-submit pengajuan yang sudah disubmit ditolak (400)', async () => {
        const res = await fetch(`${BASE_URL}/registrations/${validRegId}/submit`, {
          method: 'POST',
          headers: { Authorization: `Bearer ${publisherToken}` },
        });
        assert.strictEqual(res.status, 400);
      });

      console.log('\n--- Kategori H: TRANSITION_POLICY & Otorisasi Transisi Status ---');
      await test('Negative: DOKUMENTATOR dilarang memverifikasi naskah (403 Forbidden)', async () => {
        const res = await fetch(`${BASE_URL}/registrations/${validRegId}/status`, {
          method: 'PATCH',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${dokumentatorToken}`,
          },
          body: JSON.stringify({
            to_status: 'IN_VERIFICATION',
            notes: 'Mencoba verifikasi ilegal sebagai dokumentator',
          }),
        });
        assert.strictEqual(res.status, 403, 'Role DOKUMENTATOR harus ditolak saat verifikasi');
      });

      await test('Negative: Transisi status melompati tahap (READY_FOR_VERIFICATION -> STT_ISSUED) ditolak (400)', async () => {
        const res = await fetch(`${BASE_URL}/registrations/${validRegId}/status`, {
          method: 'PATCH',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${adminToken}`,
          },
          body: JSON.stringify({
            to_status: 'STT_ISSUED',
            notes: 'Mencoba loncat status',
          }),
        });
        assert.strictEqual(res.status, 400);
      });

      await test('Positive: VERIFIKATOR sah memindahkan status ke IN_VERIFICATION', async () => {
        const res = await fetch(`${BASE_URL}/registrations/${validRegId}/status`, {
          method: 'PATCH',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${verifikatorToken}`,
          },
          body: JSON.stringify({
            to_status: 'IN_VERIFICATION',
            notes: 'Verifikasi dokumen naskah dimulai',
          }),
        });
        assert.strictEqual(res.status, 200);
        const json = await res.json();
        assert.strictEqual(json.data.status, 'IN_VERIFICATION');
      });

      console.log('\n--- Kategori I: Eliminasi Race Condition Transisi Bersamaan ---');
      await test('Race Condition: Dua transisi paralel bersamaan terproteksi atomic lock (satu 200, satu 409)', async () => {
        // Kedua request berusaha memindahkan status yang sama (IN_VERIFICATION) secara simultan
        const req1 = fetch(`${BASE_URL}/registrations/${validRegId}/status`, {
          method: 'PATCH',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${verifikatorToken}`,
          },
          body: JSON.stringify({ to_status: 'WAITING_VERIFICATION_APPROVAL', notes: 'Selesai verifikasi - A' }),
        });

        const req2 = fetch(`${BASE_URL}/registrations/${validRegId}/status`, {
          method: 'PATCH',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${verifikatorToken}`,
          },
          body: JSON.stringify({ to_status: 'REVISION_REQUIRED', notes: 'Minta revisi - B' }),
        });

        const [res1, res2] = await Promise.all([req1, req2]);
        const statuses = [res1.status, res2.status].sort();

        // Harus ada 1 yang berhasil (200) dan 1 yang tertolak karena status sudah berubah (409 Conflict)
        assert.deepStrictEqual(statuses, [200, 409], 'Salah satu transisi harus 200 dan pasangannya harus 409');
      });

      console.log('\n--- Kategori J: Berkas Naskah & Verifikasi Publik QR ---');
      await test('Unggah metadata berkas naskah mushaf (COVER) berhasil', async () => {
        const res = await fetch(`${BASE_URL}/registrations/${validRegId}/manuscripts`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${publisherToken}`,
          },
          body: JSON.stringify({
            type: 'COVER',
            file_id: 'storage/uploads/mushaf_cover_sample.pdf',
            version: 1,
            mime_type: 'application/pdf',
          }),
        });
        assert.strictEqual(res.status, 201);
      });

      await test('Ambil daftar berkas naskah pengajuan', async () => {
        const res = await fetch(`${BASE_URL}/registrations/${validRegId}/manuscripts`, {
          headers: { Authorization: `Bearer ${publisherToken}` },
        });
        assert.strictEqual(res.status, 200);
        const json = await res.json();
        assert.strictEqual(json.data.length, 1);
        assert.strictEqual(json.data[0].type, 'COVER');
      });

      await test('Negative: Verifikasi publik dengan token QR tidak valid menghasilkan 404', async () => {
        const res = await fetch(`${BASE_URL}/public/verify-document/token-qr-fiktif-99999`);
        assert.strictEqual(res.status, 404);
      });

      console.log('\n========================================');
      console.log(`Ringkasan Pengujian: Total ${totalTests} | Lolos: ${passedTests} | Gagal: ${failedTests}`);
      console.log('========================================');

      if (failedTests > 0) {
        console.error(`\n❌ TEST GAGAL: Ditemukan ${failedTests} assertion yang tidak memenuhi syarat!`);
        process.exitCode = 1;
      } else {
        console.log('\n✨ SEMUA TEST INTEGRATION, SECURITY & WORKFLOW BERHASIL 100%! ✨\n');
        process.exitCode = 0;
      }
    } catch (err) {
      console.error('Fatal test runner error:', err);
      process.exitCode = 1;
    } finally {
      server.close();
      await prisma.$disconnect();
      setTimeout(() => process.exit(process.exitCode || 0), 500);
    }
  });
}

runTests();
