import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile, readdir } from 'node:fs/promises';
import path from 'node:path';
import { assertManuscriptAccess } from '../src/services/file-access.service.js';
import { ownedFile } from '../src/services/storage.service.js';
import { createRegistrationSchema } from '../src/validators/registration.validator.js';

test('T-F07: Audit Raw Queries - Tidak ada queryRawUnsafe atau executeRawUnsafe pada backend/src', async () => {
  async function scanDirectory(dir) {
    const entries = await readdir(dir, { withFileTypes: true });
    const files = [];
    for (const entry of entries) {
      const fullPath = path.join(dir, entry.name);
      if (entry.isDirectory()) {
        files.push(...(await scanDirectory(fullPath)));
      } else if (entry.name.endsWith('.js')) {
        files.push(fullPath);
      }
    }
    return files;
  }

  const srcFiles = await scanDirectory(path.resolve('src'));
  const violations = [];

  for (const file of srcFiles) {
    const content = await readFile(file, 'utf8');
    if (content.includes('$queryRawUnsafe')) {
      violations.push({ file, type: '$queryRawUnsafe' });
    }
    if (content.includes('$executeRawUnsafe')) {
      violations.push({ file, type: '$executeRawUnsafe' });
    }
  }

  assert.equal(
    violations.length,
    0,
    `Ditemukan pemanggilan query mentah tidak aman pada backend/src: ${JSON.stringify(violations)}`
  );
});

test('T-F07: Security Configuration - Header Helmet, Cache Control & CORS di app.js', async () => {
  const appFile = await readFile(path.resolve('src/app.js'), 'utf8');

  // Pastikan helmet() dipanggil
  assert.ok(appFile.includes('helmet()'), 'app.js wajib menggunakan middleware helmet()');

  // Pastikan cache control no-store diterapkan untuk mencegah kebocoran sesi antar-tenant
  assert.ok(appFile.includes('no-store'), 'app.js wajib mengatur Cache-Control: no-store');

  // Pastikan ETag dimatikan
  assert.ok(appFile.includes("app.set('etag', false)"), 'app.js wajib mematikan ETag');

  // Pastikan CORS memeriksa ALLOWED_ORIGINS
  assert.ok(appFile.includes('ENV.ALLOWED_ORIGINS'), 'app.js wajib membatasi origin CORS');
});

test('T-F07: JWT Protection - Mencegah penggunaan kunci rahasia lemah di non-development', async () => {
  const envFile = await readFile(path.resolve('src/config/env.js'), 'utf8');

  // Memastikan pemeriksaan panjang minimal 32 karakter dan daftar fallback dilarang
  assert.ok(envFile.includes('INSECURE_JWT_SECRETS'), 'env.js wajib mendefinisikan daftar kunci rahasia tidak aman');
  assert.ok(envFile.includes('rawJwtSecret.length < 32'), 'env.js wajib memeriksa panjang minimal kunci JWT 32 karakter');
});

test('T-F07: IDOR Protection - assertManuscriptAccess dan ownedFile menolak akses lintas tenant', async () => {
  // 1. ownedFile menolak berkas milik pengguna lain
  const mockDb = {
    storedFile: {
      findUnique: async () => ({ id: 'file-123', owner_id: 'user-actual-owner' }),
    },
  };

  await assert.rejects(
    async () => {
      await ownedFile(mockDb, 'file-123', { id: 'user-attacker', roles: ['PENERBIT'] });
    },
    (err) => {
      assert.equal(err.statusCode, 403);
      assert.ok(err.message.includes('Berkas tidak tersedia untuk akun Anda'));
      return true;
    }
  );

  // 2. assertManuscriptAccess menolak penerbit lain mengakses naskah
  const mockReg = {
    id: 'reg-001',
    publisher_id: 'publisher-legit',
    status: 'IN_VERIFICATION',
  };

  await assert.rejects(
    async () => {
      await assertManuscriptAccess(mockReg, {
        id: 'user-attacker',
        publisherId: 'publisher-attacker',
        roles: ['PENERBIT'],
      });
    },
    (err) => {
      assert.equal(err.statusCode, 403);
      assert.equal(err.message, 'Akses berkas ditolak.');
      return true;
    }
  );
});

test('T-F07: XSS & Protocol Injection - Validator URL aplikasi hanya mengizinkan HTTPS', () => {
  const schema = createRegistrationSchema.body;

  // URL dengan protokol aman https:// harus lolos
  const validData = schema.safeParse({
    service_type_id: '00000000-0000-0000-0000-000000000001',
    title: 'Mushaf Digital Test',
    apk_url: 'https://play.google.com/store/apps/details?id=com.mushaf',
    mushaf_details: { penanggung_jawab_produk: 'Ahmad Subagio' },
    statement_accepted: true,
  });
  assert.ok(validData.success, `URL HTTPS harus valid: ${JSON.stringify(validData.error?.errors)}`);

  // URL dengan protokol berbahaya javascript: atau data: harus ditolak
  const xssData1 = schema.safeParse({
    service_type_id: '00000000-0000-0000-0000-000000000001',
    title: 'Mushaf Digital Test',
    apk_url: 'javascript:alert(1)',
    mushaf_details: { penanggung_jawab_produk: 'Ahmad Subagio' },
    statement_accepted: true,
  });
  assert.equal(xssData1.success, false, 'Protokol javascript: wajib ditolak');

  const xssData2 = schema.safeParse({
    service_type_id: '00000000-0000-0000-0000-000000000001',
    title: 'Mushaf Digital Test',
    apk_url: 'http://insecure-site.com/app.apk',
    mushaf_details: { penanggung_jawab_produk: 'Ahmad Subagio' },
    statement_accepted: true,
  });
  assert.equal(xssData2.success, false, 'Protokol http:// tanpa enkripsi wajib ditolak');
});
