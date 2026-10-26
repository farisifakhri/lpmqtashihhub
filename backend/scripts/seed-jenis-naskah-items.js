import 'dotenv/config';
import { prisma } from '../src/config/database.js';

const items = [
  { code: 'JUZ30', name: "Al-Qur'an 30 Juz", group_number: 1, role: 'DASAR', service_kind: 'CETAK', unit_fee_rate: 1, fee_per_unit: 1000000, duration_initial: 15, duration_revision: 7, duration_dummy: 3, covers_item_code: null },
  { code: 'YASIN', name: 'Surah Yasin dan Bacaan Tahlil', group_number: 1, role: 'DASAR', service_kind: 'CETAK', unit_fee_rate: 1, fee_per_unit: 500000, duration_initial: 5, duration_revision: 2, duration_dummy: 1, covers_item_code: null },
  { code: 'AMMA', name: "Juz 'Amma dan Terjemahnya", group_number: 1, role: 'DASAR', service_kind: 'CETAK', unit_fee_rate: 1, fee_per_unit: 500000, duration_initial: 5, duration_revision: 2, duration_dummy: 1, covers_item_code: null },
  { code: 'MAJMU', name: "Majmu' Syarif", group_number: 1, role: 'DASAR', service_kind: 'CETAK', unit_fee_rate: 1, fee_per_unit: 500000, duration_initial: 5, duration_revision: 2, duration_dummy: 1, covers_item_code: null },
  { code: 'KALIGRAFI', name: 'Kaligrafi', group_number: 1, role: 'DASAR', service_kind: 'CETAK', unit_fee_rate: 1, fee_per_unit: 500000, duration_initial: 3, duration_revision: 2, duration_dummy: 1, covers_item_code: null },
  { code: 'METODE', name: "Metode Baca Tulis Al-Qur'an", group_number: 1, role: 'DASAR', service_kind: 'CETAK', unit_fee_rate: 1, fee_per_unit: 500000, duration_initial: 15, duration_revision: 7, duration_dummy: 3, covers_item_code: null },
  { code: 'AV', name: 'Audio/Visual', group_number: 2, role: 'DASAR', service_kind: 'AUDIO_VISUAL', unit_fee_rate: 1, fee_per_unit: 1000000, duration_initial: 30, duration_revision: 15, duration_dummy: 7, covers_item_code: null },
  { code: 'DIGITAL', name: 'Digital', group_number: 2, role: 'DASAR', service_kind: 'DIGITAL', unit_fee_rate: 1, fee_per_unit: 1000000, duration_initial: 15, duration_revision: 7, duration_dummy: 3, covers_item_code: null },
  { code: 'BRAILLE', name: 'Mushaf Standar Braille', group_number: 1, role: 'DASAR', service_kind: 'BRAILLE', unit_fee_rate: 0, fee_per_unit: 0, duration_initial: 60, duration_revision: 30, duration_dummy: 15, covers_item_code: null },
  { code: 'TERJEMAH', name: 'Terjemah', group_number: 3, role: 'TAMBAHAN', service_kind: 'CETAK', unit_fee_rate: 1, fee_per_unit: 500000, duration_initial: 7, duration_revision: 5, duration_dummy: 4, covers_item_code: null },
  { code: 'TRANSLITERASI', name: 'Transliterasi', group_number: 3, role: 'TAMBAHAN', service_kind: 'CETAK', unit_fee_rate: 1, fee_per_unit: 500000, duration_initial: 7, duration_revision: 5, duration_dummy: 4, covers_item_code: null },
  { code: 'TAJWID', name: 'Tajwid Warna / Kode Tajwid', group_number: 3, role: 'TAMBAHAN', service_kind: 'CETAK', unit_fee_rate: 1, fee_per_unit: 500000, duration_initial: 7, duration_revision: 5, duration_dummy: 4, covers_item_code: null },
  { code: 'WAQAF', name: "Waqaf Ibtida'", group_number: 3, role: 'TAMBAHAN', service_kind: 'CETAK', unit_fee_rate: 1, fee_per_unit: 500000, duration_initial: 7, duration_revision: 5, duration_dummy: 4, covers_item_code: null },
  { code: 'QIRAAT', name: 'Qiraat', group_number: 3, role: 'TAMBAHAN', service_kind: 'CETAK', unit_fee_rate: 1, fee_per_unit: 500000, duration_initial: 7, duration_revision: 5, duration_dummy: 4, covers_item_code: null },
  { code: 'PERKATA', name: 'Terjemah/Transliterasi Perkata', group_number: 3, role: 'TAMBAHAN', service_kind: 'CETAK', unit_fee_rate: 2, fee_per_unit: 500000, duration_initial: 30, duration_revision: 15, duration_dummy: 9, covers_item_code: 'TERJEMAH' },
  { code: 'TAFSIR', name: 'Tafsir', group_number: 3, role: 'TAMBAHAN', service_kind: 'CETAK', unit_fee_rate: 2, fee_per_unit: 500000, duration_initial: 30, duration_revision: 15, duration_dummy: 9, covers_item_code: 'TERJEMAH' }
];

async function seed() {
  console.log('Seeding JenisNaskahItem...');
  for (const item of items) {
    await prisma.jenisNaskahItem.upsert({
      where: { code: item.code },
      update: { ...item, status: 'ACTIVE' },
      create: { ...item, status: 'ACTIVE' }
    });
  }
  const count = await prisma.jenisNaskahItem.count();
  console.log(`✅ Sukses! Total ${count} JenisNaskahItem tersimpan di database.`);
  await prisma.$disconnect();
}

seed().catch(err => {
  console.error('Seed error:', err);
  process.exit(1);
});
