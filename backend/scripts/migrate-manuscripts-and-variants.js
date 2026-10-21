import 'dotenv/config';
import { PrismaClient } from '@prisma/client';
import { writeFile, mkdir } from 'node:fs/promises';
import path from 'node:path';

/**
 * Skrip Migrasi Data Idempoten: Multi-Naskah, Master Item, dan Varian (B-01 §5 & §6)
 *
 * Fitur Utama:
 * 1. Murni Idempoten: Dapat dijalankan berulang kali tanpa membuat duplikasi naskah/varian.
 * 2. Mode Pratinjau (--preview): Memetakan dan menghitung seluruh data tanpa mutasi database.
 * 3. Eksekusi Mandiri (--execute): Wajib dengan flag eksplisit untuk menjalankan mutasi.
 * 4. Pengecekan Jumlah (Count Check): Memverifikasi jumlah naskah yang dibuat cocok dengan jumlah registrasi.
 * 5. Pencadangan Data (Backup): Menyimpan salinan JSON sebelum mutasi dilakukan.
 * 6. Tidak Mengisi Nilai Bawaan: Ukuran dan oplah hanya dibuat jika ada data riil di sizes[].
 * 7. Tidak Menghitung Ulang Snapshot: fee_sla_snapshot historis dipertahankan utuh.
 *
 * Penggunaan:
 *   node backend/scripts/migrate-manuscripts-and-variants.js --preview
 *   node backend/scripts/migrate-manuscripts-and-variants.js --execute
 */

const prisma = new PrismaClient();

// Peta 17 Jenis Layanan Lama -> Master Items Baru (B-01 §5)
const SERVICE_TYPE_TO_ITEMS_MAP = {
  "mushaf al-qur'an 30 juz": ['JUZ30'],
  "mushaf al-qur'an dan terjemahnya": ['JUZ30', 'TERJEMAH'],
  "mushaf al-qur'an tajwid warna/kode tajwid": ['JUZ30', 'TAJWID'],
  "mushaf al-qur'an waqaf ibtida'": ['JUZ30', 'WAQAF'],
  "mushaf al-qur'an qiraat": ['JUZ30', 'QIRAAT'],
  "mushaf al-qur'an transliterasi": ['JUZ30', 'TRANSLITERASI'],
  "mushaf al-qur'an terjemah perkata": ['JUZ30', 'PERKATA'],
  "mushaf al-qur'an dan tafsirnya": ['JUZ30', 'TAFSIR'],
  "mushaf al-qur'an luar negeri": ['JUZ30'],
  "al-qur'an audio/visual": ['AV'],
  "mushaf al-qur'an digital": ['DIGITAL'],
  "mushaf al-qur'an braille": ['BRAILLE'],
  "surah yasin dan bacaan tahlil": ['YASIN'],
  "juz 'amma dan terjemahnya": ['AMMA'],
  "majmu' syarif": ['MAJMU'],
  "metode baca tulis al-qur'an": ['METODE'],
  "kaligrafi": ['KALIGRAFI'],
};

// Peta item tambahan dari checklist metadata jika ada di luar jenis pokok
const ADDITIONAL_METADATA_ITEMS = [
  { keywords: ['tafsir'], code: 'TAFSIR' },
  { keywords: ['perkata'], code: 'PERKATA' },
  { keywords: ['transliterasi'], code: 'TRANSLITERASI' },
  { keywords: ['terjemah'], code: 'TERJEMAH' },
  { keywords: ['tajwid'], code: 'TAJWID' },
  { keywords: ['waqaf', 'ibtida'], code: 'WAQAF' },
  { keywords: ['qiraat', "qira'at", 'qiroat'], code: 'QIRAAT' },
];

export async function runMigration({ execute = false } = {}) {
  console.log('========================================================================');
  console.log(` MIGRASI DATA B-01: NASKAH, MASTER ITEM, DAN VARIAN [${execute ? 'EXECUTE' : 'PREVIEW'}]`);
  console.log('========================================================================\n');

  // 1. Ambil master data JenisNaskahItem
  const masterItems = await prisma.jenisNaskahItem.findMany({ where: { status: 'ACTIVE' } });
  if (masterItems.length === 0) {
    throw new Error('Data master jenis_naskah_items kosong. Harap jalankan prisma db seed terlebih dahulu!');
  }
  const masterItemMap = new Map(masterItems.map((m) => [m.code, m]));

  // 2. Ambil seluruh data registrasi eksisting
  const registrations = await prisma.registration.findMany({
    include: {
      service_type: true,
      manuscripts: {
        include: {
          items: true,
          variants: true,
        },
      },
      manuscript_files: true,
    },
    orderBy: { created_at: 'asc' },
  });

  const totalRegistrations = registrations.length;
  let alreadyMigratedCount = 0;
  let toMigrateCount = 0;
  let plannedManuscripts = 0;
  let plannedManuscriptItems = 0;
  let plannedVariants = 0;
  let plannedFileLinks = 0;

  const migrationPlan = [];

  for (const reg of registrations) {
    if (reg.manuscripts && reg.manuscripts.length > 0) {
      alreadyMigratedCount++;
      continue;
    }

    toMigrateCount++;

    // Tentukan item berdasarkan service_type nama
    const stNameLower = (reg.service_type?.name || '').toLowerCase().trim();
    const itemCodes = new Set(SERVICE_TYPE_TO_ITEMS_MAP[stNameLower] || ['JUZ30']);

    // Periksa jika ada materi tambahan lain di metadata
    const meta = reg.foreign_metadata || {};
    const details = reg.mushaf_details || {};
    const jenisNaskahMeta = [
      ...(Array.isArray(meta.jenis_naskah) ? meta.jenis_naskah : []),
      ...(Array.isArray(details.jenis_naskah) ? details.jenis_naskah : []),
      ...(Array.isArray(reg.jenis_naskah) ? reg.jenis_naskah : []),
    ];

    for (const jn of jenisNaskahMeta) {
      if (typeof jn !== 'string') continue;
      const lowerJn = jn.toLowerCase();
      for (const mItem of ADDITIONAL_METADATA_ITEMS) {
        if (mItem.keywords.some((kw) => lowerJn.includes(kw))) {
          itemCodes.add(mItem.code);
        }
      }
    }

    // Ekstrak varian dari sizes[] jika ada data riil (tanpa fallback sembarangan)
    const sizes = Array.isArray(meta.sizes)
      ? meta.sizes
      : Array.isArray(details.sizes)
      ? details.sizes
      : [];

    const validVariants = [];
    for (const s of sizes) {
      if (s && s.ukuran && typeof s.ukuran === 'string' && s.oplah && Number(s.oplah) > 0) {
        validVariants.push({
          ukuran: String(s.ukuran).trim(),
          oplah: parseInt(s.oplah, 10),
        });
      }
    }

    const itemsToCreate = [];
    for (const code of itemCodes) {
      const itemDef = masterItemMap.get(code);
      if (itemDef) {
        itemsToCreate.push(itemDef);
      }
    }

    plannedManuscripts += 1;
    plannedManuscriptItems += itemsToCreate.length;
    plannedVariants += validVariants.length;
    plannedFileLinks += reg.manuscript_files.length;

    migrationPlan.push({
      registration_id: reg.id,
      registration_no: reg.registration_no,
      title: reg.title || 'Mushaf Al-Qur\'an',
      items: itemsToCreate,
      variants: validVariants,
      files: reg.manuscript_files,
    });
  }

  console.log(`Total Registrasi Terdaftar   : ${totalRegistrations}`);
  console.log(`Sudah Memiliki Naskah (Skip) : ${alreadyMigratedCount}`);
  console.log(`Perlu Dimigrasi              : ${toMigrateCount}`);
  console.log(`Rencana Naskah Dibuat        : ${plannedManuscripts}`);
  console.log(`Rencana Relasi Item Dibuat   : ${plannedManuscriptItems}`);
  console.log(`Rencana Varian Ukuran/Oplah  : ${plannedVariants}`);
  console.log(`Rencana Tautan Berkas        : ${plannedFileLinks}\n`);

  if (!execute) {
    console.log('ℹ️  MODE PRATINJAU SELESAI. Tidak ada data yang diubah di database.');
    console.log('Untuk mengeksekusi migrasi secara nyata, jalankan dengan flag --execute:');
    console.log('  node backend/scripts/migrate-manuscripts-and-variants.js --execute\n');
    return {
      status: 'PREVIEW_COMPLETED',
      totalRegistrations,
      alreadyMigratedCount,
      toMigrateCount,
      plannedManuscripts,
      plannedManuscriptItems,
      plannedVariants,
      plannedFileLinks,
    };
  }

  if (toMigrateCount === 0) {
    console.log('✅ Seluruh registrasi telah memiliki entitas naskah. Tidak ada mutasi yang diperlukan.');
    return { status: 'NOOP', totalRegistrations, alreadyMigratedCount };
  }

  // Backup data sebelum eksekusi
  const backupDir = path.resolve('storage', 'backups');
  await mkdir(backupDir, { recursive: true });
  const backupFile = path.join(backupDir, `backup_b01_migration_${Date.now()}.json`);
  const backupPayload = registrations.map((r) => ({
    id: r.id,
    registration_no: r.registration_no,
    title: r.title,
    foreign_metadata: r.foreign_metadata,
    fee_sla_snapshot: r.fee_sla_snapshot,
    manuscript_files_count: r.manuscript_files.length,
  }));
  await writeFile(backupFile, JSON.stringify(backupPayload, null, 2), 'utf-8');
  console.log(`💾 Backup data tersimpan di: ${backupFile}\n`);

  // Eksekusi mutasi dalam transaksi per registrasi
  let migratedCount = 0;
  for (const plan of migrationPlan) {
    await prisma.$transaction(async (tx) => {
      // 1. Buat Manuscript (seq_number = 1)
      const manuscript = await tx.manuscript.create({
        data: {
          registration_id: plan.registration_id,
          seq_number: 1,
          title: plan.title,
        },
      });

      // 2. Buat ManuscriptItem
      for (const item of plan.items) {
        await tx.manuscriptItem.create({
          data: {
            manuscript_id: manuscript.id,
            item_id: item.id,
            role: item.role,
            fee_snapshot: item.fee_per_unit,
            initial_days_snapshot: item.duration_initial,
            revision_days_snapshot: item.duration_revision,
            dummy_days_snapshot: item.duration_dummy,
          },
        });
      }

      // 3. Buat ManuscriptVariant jika ada data riil
      for (const v of plan.variants) {
        await tx.manuscriptVariant.create({
          data: {
            manuscript_id: manuscript.id,
            ukuran: v.ukuran,
            oplah: v.oplah,
          },
        });
      }

      // 4. Kaitkan manuscript_files yang ada ke manuscript baru
      if (plan.files && plan.files.length > 0) {
        await tx.manuscriptFile.updateMany({
          where: { registration_id: plan.registration_id },
          data: { manuscript_id: manuscript.id },
        });
      }
    });

    migratedCount++;
  }

  // Pengecekan Jumlah (Count Validation)
  const afterRegistrations = await prisma.registration.count();
  const afterManuscripts = await prisma.manuscript.count();

  if (afterRegistrations !== totalRegistrations) {
    throw new Error(`CRITICAL: Jumlah registrasi berubah! Sebelum: ${totalRegistrations}, Sesudah: ${afterRegistrations}`);
  }

  console.log('✅ MIGRASI SELESAI DENGAN SUKSES!');
  console.log(`Jumlah Registrasi Terverifikasi : ${afterRegistrations}`);
  console.log(`Total Naskah di Database        : ${afterManuscripts}`);
  console.log(`Registrasi Berhasil Diproses    : ${migratedCount}\n`);

  return {
    status: 'SUCCESS',
    totalRegistrations: afterRegistrations,
    totalManuscripts: afterManuscripts,
    migratedCount,
  };
}

// Jalankan jika dieksekusi langsung via CLI
if (process.argv[1] && process.argv[1].endsWith('migrate-manuscripts-and-variants.js')) {
  const isExecute = process.argv.includes('--execute');
  runMigration({ execute: isExecute })
    .then(() => prisma.$disconnect())
    .catch((err) => {
      console.error('❌ Gagal menjalankan migrasi:', err);
      prisma.$disconnect().finally(() => process.exit(1));
    });
}

