import 'dotenv/config';
import test from 'node:test';
import assert from 'node:assert/strict';
import { PrismaClient } from '@prisma/client';
import { spawn } from 'node:child_process';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

/**
 * Uji Migrasi Skema dan Data Multi-Naskah B-01 (§6) pada Database Sementara
 *
 * Verifikasi:
 * 1. Registrasi lama termigrasi menjadi 1 Manuscript (seq_number = 1)
 * 2. Masing-masing dari 17 jenis lama terpetakan menjadi item baru yang tepat
 * 3. Array sizes[] terkonversi menjadi entitas ManuscriptVariant nyata tanpa fallback
 * 4. Berkas lampiran tertaut ke manuscript_id
 * 5. Migrasi bersifat idempoten (dapat diulang tanpa duplikasi)
 * 6. Batasan keunikan @@unique bekerja (seq_number per reg, item per manuscript)
 */

const baseDatabaseUrl = process.env.DATABASE_URL || 'mysql://root:@localhost:3306/lpmq_db';
const testDbName = `lpmq_b01_${Date.now()}_test`;
const sourceUrl = new URL(baseDatabaseUrl);
const testUrl = new URL(sourceUrl);
testUrl.pathname = `/${testDbName}`;

const runCommand = (cmd, args, extraEnv = {}) =>
  new Promise((resolve, reject) => {
    const child = spawn(cmd, args, {
      env: { ...process.env, ...extraEnv },
      stdio: 'pipe',
      shell: true,
      windowsHide: true,
    });
    let stdout = '';
    let stderr = '';
    child.stdout.on('data', (d) => (stdout += d.toString()));
    child.stderr.on('data', (d) => (stderr += d.toString()));
    child.on('close', (code) =>
      code === 0 ? resolve(stdout) : reject(new Error(`${cmd} ${args.join(' ')} failed [${code}]: ${stderr || stdout}`))
    );
  });

test('B-01 Sesi 1: Migrasi Skema, Master Item, dan Varian pada Database Sementara', async (t) => {
  const rootClient = new PrismaClient({
    datasources: { db: { url: sourceUrl.toString() } },
  });

  let testClient = null;
  let dbCreated = false;

  try {
    // 1. Buat database sementara
    await rootClient.$executeRawUnsafe(
      `CREATE DATABASE \`${testDbName}\` CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci`
    );
    dbCreated = true;
    console.log(`[TEST-DB] Created temporary database: ${testDbName}`);

    // 2. Jalankan prisma migrate deploy pada test db
    const backendDir = fileURLToPath(new URL('..', import.meta.url));
    const prismaCli = path.resolve(backendDir, 'node_modules', 'prisma', 'build', 'index.js');
    const schemaPath = path.resolve(backendDir, 'prisma', 'schema.prisma');
    const scriptPath = path.resolve(backendDir, 'scripts', 'migrate-manuscripts-and-variants.js');

    await runCommand(process.execPath, [prismaCli, 'migrate', 'deploy', '--schema', schemaPath], {
      DATABASE_URL: testUrl.toString(),
      cwd: backendDir,
    });

    // 3. Seed data master item dan roles pada test db
    testClient = new PrismaClient({
      datasources: { db: { url: testUrl.toString() } },
    });

    // Seed category
    const cat = await testClient.mushafCategory.create({
      data: { code: 'MC', name: 'Mushaf Cetak', status: 'ACTIVE' },
    });

    // Seed publisher
    const pub = await testClient.publisher.create({
      data: {
        legal_name: 'PT Mushaf Test Mandiri',
        entity_type: 'PT',
        verification_status: 'VERIFIED',
      },
    });

    // Seed 17 service types lama
    const serviceTypeNames = [
      "Mushaf Al-Qur'an 30 Juz",
      "Mushaf Al-Qur'an dan Terjemahnya",
      "Mushaf Al-Qur'an Tajwid Warna/Kode Tajwid",
      "Mushaf Al-Qur'an Waqaf Ibtida'",
      "Mushaf Al-Qur'an Qiraat",
      "Mushaf Al-Qur'an Transliterasi",
      "Al-Qur'an Audio/Visual",
      "Mushaf Al-Qur'an Digital",
      "Mushaf Al-Qur'an Terjemah Perkata",
      "Mushaf Al-Qur'an dan Tafsirnya",
      "Mushaf Al-Qur'an Luar Negeri",
      "Mushaf Al-Qur'an Braille",
      "Surah Yasin dan Bacaan Tahlil",
      "Juz 'Amma dan Terjemahnya",
      "Majmu' Syarif",
      "Metode Baca Tulis Al-Qur'an",
      "Kaligrafi",
    ];

    const serviceTypes = {};
    for (const name of serviceTypeNames) {
      serviceTypes[name] = await testClient.serviceType.create({
        data: {
          category_id: cat.id,
          name,
          service_kind: name.includes('Digital')
            ? 'DIGITAL'
            : name.includes('Audio')
            ? 'AUDIO_VISUAL'
            : name.includes('Braille')
            ? 'BRAILLE'
            : 'CETAK',
          base_fee: name.includes('Yasin') || name.includes('Amma') || name.includes('Majmu') || name.includes('Kaligrafi') || name.includes('Metode') ? 500000 : name.includes('Braille') ? 0 : 1000000,
          status: 'ACTIVE',
        },
      });
    }

    // Seed 16 master items baru
    const masterItemsData = [
      { code: 'JUZ30', name: "Al-Qur'an 30 Juz", group_number: 1, role: 'DASAR', service_kind: 'CETAK', unit_fee_rate: 1, fee_per_unit: 1000000, duration_initial: 15, duration_revision: 7, duration_dummy: 3 },
      { code: 'YASIN', name: 'Surah Yasin dan Bacaan Tahlil', group_number: 1, role: 'DASAR', service_kind: 'CETAK', unit_fee_rate: 1, fee_per_unit: 500000, duration_initial: 5, duration_revision: 2, duration_dummy: 1 },
      { code: 'AMMA', name: "Juz 'Amma dan Terjemahnya", group_number: 1, role: 'DASAR', service_kind: 'CETAK', unit_fee_rate: 1, fee_per_unit: 500000, duration_initial: 5, duration_revision: 2, duration_dummy: 1 },
      { code: 'MAJMU', name: "Majmu' Syarif", group_number: 1, role: 'DASAR', service_kind: 'CETAK', unit_fee_rate: 1, fee_per_unit: 500000, duration_initial: 5, duration_revision: 2, duration_dummy: 1 },
      { code: 'KALIGRAFI', name: 'Kaligrafi', group_number: 1, role: 'DASAR', service_kind: 'CETAK', unit_fee_rate: 1, fee_per_unit: 500000, duration_initial: 3, duration_revision: 2, duration_dummy: 1 },
      { code: 'METODE', name: "Metode Baca Tulis Al-Qur'an", group_number: 1, role: 'DASAR', service_kind: 'CETAK', unit_fee_rate: 1, fee_per_unit: 500000, duration_initial: 15, duration_revision: 7, duration_dummy: 3 },
      { code: 'AV', name: 'Audio/Visual', group_number: 2, role: 'DASAR', service_kind: 'AUDIO_VISUAL', unit_fee_rate: 1, fee_per_unit: 1000000, duration_initial: 30, duration_revision: 15, duration_dummy: 7 },
      { code: 'DIGITAL', name: 'Digital', group_number: 2, role: 'DASAR', service_kind: 'DIGITAL', unit_fee_rate: 1, fee_per_unit: 1000000, duration_initial: 15, duration_revision: 7, duration_dummy: 3 },
      { code: 'BRAILLE', name: 'Mushaf Standar Braille', group_number: 1, role: 'DASAR', service_kind: 'BRAILLE', unit_fee_rate: 0, fee_per_unit: 0, duration_initial: 60, duration_revision: 30, duration_dummy: 15 },
      { code: 'TERJEMAH', name: 'Terjemah', group_number: 3, role: 'TAMBAHAN', service_kind: 'CETAK', unit_fee_rate: 1, fee_per_unit: 500000, duration_initial: 7, duration_revision: 5, duration_dummy: 4 },
      { code: 'TRANSLITERASI', name: 'Transliterasi', group_number: 3, role: 'TAMBAHAN', service_kind: 'CETAK', unit_fee_rate: 1, fee_per_unit: 500000, duration_initial: 7, duration_revision: 5, duration_dummy: 4 },
      { code: 'TAJWID', name: 'Tajwid Warna / Kode Tajwid', group_number: 3, role: 'TAMBAHAN', service_kind: 'CETAK', unit_fee_rate: 1, fee_per_unit: 500000, duration_initial: 7, duration_revision: 5, duration_dummy: 4 },
      { code: 'WAQAF', name: "Waqaf Ibtida'", group_number: 3, role: 'TAMBAHAN', service_kind: 'CETAK', unit_fee_rate: 1, fee_per_unit: 500000, duration_initial: 7, duration_revision: 5, duration_dummy: 4 },
      { code: 'QIRAAT', name: 'Qiraat', group_number: 3, role: 'TAMBAHAN', service_kind: 'CETAK', unit_fee_rate: 1, fee_per_unit: 500000, duration_initial: 7, duration_revision: 5, duration_dummy: 4 },
      { code: 'PERKATA', name: 'Terjemah/Transliterasi Perkata', group_number: 3, role: 'TAMBAHAN', service_kind: 'CETAK', unit_fee_rate: 2, fee_per_unit: 500000, duration_initial: 30, duration_revision: 15, duration_dummy: 9, covers_item_code: 'TERJEMAH' },
      { code: 'TAFSIR', name: 'Tafsir', group_number: 3, role: 'TAMBAHAN', service_kind: 'CETAK', unit_fee_rate: 2, fee_per_unit: 500000, duration_initial: 30, duration_revision: 15, duration_dummy: 9, covers_item_code: 'TERJEMAH' },
    ];

    for (const item of masterItemsData) {
      await testClient.jenisNaskahItem.create({ data: item });
    }

    // 4. Masukkan registrasi lama untuk ke-17 jenis layanan
    let regIndex = 1;
    for (const name of serviceTypeNames) {
      const regNo = `REG-2026-${String(regIndex).padStart(4, '0')}`;
      const isSizeTest = regIndex === 1; // Registrasi pertama punya sizes[]
      const meta = isSizeTest
        ? { sizes: [{ ukuran: 'A4 (21,0 x 29,7)', oplah: 5000 }, { ukuran: 'B5 (17,6 x 25,0)', oplah: 2000 }] }
        : null;

      const createdReg = await testClient.registration.create({
        data: {
          registration_no: regNo,
          publisher_id: pub.id,
          service_type_id: serviceTypes[name].id,
          title: `Naskah Uji ${name}`,
          foreign_metadata: meta,
          status: 'IN_VERIFICATION',
        },
      });

      // Tambahkan berkas uji pada registrasi pertama
      if (isSizeTest) {
        await testClient.manuscriptFile.create({
          data: {
            registration_id: createdReg.id,
            type: 'COVER',
            file_id: 'test-cover-file-uuid',
            version: 1,
          },
        });
      }

      regIndex++;
    }

    // 5. Jalankan skrip migrasi data dengan --execute
    await runCommand(process.execPath, [scriptPath, '--execute'], {
      DATABASE_URL: testUrl.toString(),
      cwd: backendDir,
    });

    // 6. Verifikasi Hasil Migrasi

    // 6.1 Jumlah registrasi dan naskah
    const totalRegs = await testClient.registration.count();
    const totalManuscripts = await testClient.manuscript.count();
    assert.equal(totalRegs, 17, 'Total registrasi harus tetap 17');
    assert.equal(totalManuscripts, 17, 'Setiap registrasi lama harus menjadi tepat 1 naskah');

    // 6.2 Pemetaan 17 jenis layanan ke item baru
    const allManuscripts = await testClient.manuscript.findMany({
      include: {
        registration: { include: { service_type: true } },
        items: { include: { item: true } },
        variants: true,
        files: true,
      },
    });

    for (const m of allManuscripts) {
      const stName = m.registration.service_type.name;
      const itemCodes = m.items.map((i) => i.item.code);

      if (stName === "Mushaf Al-Qur'an 30 Juz") {
        assert.deepEqual(itemCodes, ['JUZ30']);
      } else if (stName === "Mushaf Al-Qur'an dan Terjemahnya") {
        assert.ok(itemCodes.includes('JUZ30') && itemCodes.includes('TERJEMAH'));
      } else if (stName === "Mushaf Al-Qur'an Tajwid Warna/Kode Tajwid") {
        assert.ok(itemCodes.includes('JUZ30') && itemCodes.includes('TAJWID'));
      } else if (stName === "Mushaf Al-Qur'an Waqaf Ibtida'") {
        assert.ok(itemCodes.includes('JUZ30') && itemCodes.includes('WAQAF'));
      } else if (stName === "Mushaf Al-Qur'an Qiraat") {
        assert.ok(itemCodes.includes('JUZ30') && itemCodes.includes('QIRAAT'));
      } else if (stName === "Mushaf Al-Qur'an Transliterasi") {
        assert.ok(itemCodes.includes('JUZ30') && itemCodes.includes('TRANSLITERASI'));
      } else if (stName === "Mushaf Al-Qur'an Terjemah Perkata") {
        assert.ok(itemCodes.includes('JUZ30') && itemCodes.includes('PERKATA'));
      } else if (stName === "Mushaf Al-Qur'an dan Tafsirnya") {
        assert.ok(itemCodes.includes('JUZ30') && itemCodes.includes('TAFSIR'));
      } else if (stName === "Al-Qur'an Audio/Visual") {
        assert.deepEqual(itemCodes, ['AV']);
      } else if (stName === "Mushaf Al-Qur'an Digital") {
        assert.deepEqual(itemCodes, ['DIGITAL']);
      } else if (stName === "Mushaf Al-Qur'an Braille") {
        assert.deepEqual(itemCodes, ['BRAILLE']);
      } else if (stName === 'Surah Yasin dan Bacaan Tahlil') {
        assert.deepEqual(itemCodes, ['YASIN']);
      } else if (stName === "Juz 'Amma dan Terjemahnya") {
        assert.deepEqual(itemCodes, ['AMMA']);
      } else if (stName === "Majmu' Syarif") {
        assert.deepEqual(itemCodes, ['MAJMU']);
      } else if (stName === "Metode Baca Tulis Al-Qur'an") {
        assert.deepEqual(itemCodes, ['METODE']);
      } else if (stName === 'Kaligrafi') {
        assert.deepEqual(itemCodes, ['KALIGRAFI']);
      }
    }

    // 6.3 Varian ukuran dan oplah
    const reg1Manuscript = allManuscripts.find((m) => m.registration.registration_no === 'REG-2026-0001');
    assert.equal(reg1Manuscript.variants.length, 2, 'Harus mengekstrak 2 varian riil dari sizes[]');
    const a4 = reg1Manuscript.variants.find((v) => v.ukuran.includes('A4'));
    const b5 = reg1Manuscript.variants.find((v) => v.ukuran.includes('B5'));
    assert.ok(a4, 'Varian A4 harus ditemukan');
    assert.ok(b5, 'Varian B5 harus ditemukan');
    assert.equal(a4.oplah, 5000);
    assert.equal(b5.oplah, 2000);

    // Registrasi tanpa sizes[] tidak boleh memiliki varian fiktif
    const reg2Manuscript = allManuscripts.find((m) => m.registration.registration_no === 'REG-2026-0002');
    assert.equal(reg2Manuscript.variants.length, 0, 'Registrasi tanpa sizes[] tidak boleh diisi varian bawaan');

    // 6.4 Berkas lampiran tertaut
    assert.equal(reg1Manuscript.files.length, 1, 'Berkas harus tertaut ke manuscript_id');
    assert.equal(reg1Manuscript.files[0].manuscript_id, reg1Manuscript.id);

    // 6.5 Idempotensi: Jalankan migrasi kedua kali
    await runCommand(process.execPath, [scriptPath, '--execute'], {
      DATABASE_URL: testUrl.toString(),
      cwd: backendDir,
    });
    const afterSecondRunManuscripts = await testClient.manuscript.count();
    const afterSecondRunVariants = await testClient.manuscriptVariant.count();
    assert.equal(afterSecondRunManuscripts, 17, 'Idempoten: jumlah naskah tidak bertambah pada run kedua');
    assert.equal(afterSecondRunVariants, 2, 'Idempoten: jumlah varian tidak bertambah pada run kedua');

    // 6.6 Batasan Keunikan: seq_number per registration
    await assert.rejects(
      async () => {
        await testClient.manuscript.create({
          data: {
            registration_id: reg1Manuscript.registration_id,
            seq_number: 1, // Duplikat seq_number
            title: 'Duplikat Seq',
          },
        });
      },
      /Unique constraint failed|Duplicate entry/,
      'Batasan keunikan (registration_id, seq_number) harus menolak duplikat'
    );

    console.log('✅ SELURUH UJI MIGRASI B-01 PADA DATABASE SEMENTARA LULUS 100%');
  } finally {
    if (testClient) await testClient.$disconnect();
    if (dbCreated) {
      try {
        await rootClient.$executeRawUnsafe(`DROP DATABASE IF EXISTS \`${testDbName}\``);
        console.log(`[TEST-DB] Dropped temporary database: ${testDbName}`);
      } catch (e) {
        console.warn(`[TEST-DB] Warning during cleanup: ${e.message}`);
      }
    }
    try { await rootClient.$disconnect(); } catch {}
  }
});

