import test from 'node:test';
import assert from 'node:assert/strict';
import {
  calculateItemTarifAndSla,
  calculateRegistrationSummary,
  normalizeLegacyToItemCodes,
  SLA_INITIAL_CAP_DAYS,
} from '../src/utils/item-calculator.js';

test('B-01 Sesi 0b: T1 - 30 Juz', () => {
  const res = calculateItemTarifAndSla(['JUZ30']);
  assert.equal(res.fee, 1000000);
  assert.equal(res.sla_initial, 15);
  assert.equal(res.sla_revision, 7);
  assert.equal(res.sla_dummy, 3);
  assert.equal(res.service_type_name, "Mushaf Al-Qur'an 30 Juz");
});

test('B-01 Sesi 0b: T2 - 30 Juz + Terjemah + Transliterasi + Tajwid', () => {
  const res = calculateItemTarifAndSla(['JUZ30', 'TERJEMAH', 'TRANSLITERASI', 'TAJWID']);
  assert.equal(res.fee, 2500000);
  assert.equal(res.sla_initial, 36);
  assert.equal(res.sla_revision, 22);
  assert.equal(res.sla_dummy, 15);
});

test('B-01 Sesi 0b: T3 - 30 Juz + Perkata', () => {
  const res = calculateItemTarifAndSla(['JUZ30', 'PERKATA']);
  assert.equal(res.fee, 2000000);
  assert.equal(res.sla_initial, 45);
  assert.equal(res.sla_revision, 22);
  assert.equal(res.sla_dummy, 12);
});

test('B-01 Sesi 0b: T4 - 30 Juz + Perkata + Transliterasi + Tajwid', () => {
  const res = calculateItemTarifAndSla(['JUZ30', 'PERKATA', 'TRANSLITERASI', 'TAJWID']);
  assert.equal(res.fee, 3000000);
  assert.equal(res.sla_initial, 59);
  assert.equal(res.sla_revision, 32);
  assert.equal(res.sla_dummy, 20);
});

test('B-01 Sesi 0b: T5 - 30 Juz + Terjemah + Perkata (Terjemah diabaikan)', () => {
  const res = calculateItemTarifAndSla(['JUZ30', 'TERJEMAH', 'PERKATA']);
  assert.equal(res.fee, 2000000);
  assert.equal(res.sla_initial, 45);
  assert.equal(res.sla_revision, 22);
  assert.equal(res.sla_dummy, 12);

  const terjemahItem = res.items.find((i) => i.code === 'TERJEMAH');
  assert.equal(terjemahItem.is_covered, true);
  assert.equal(terjemahItem.fee, 0);
  assert.equal(terjemahItem.delta_initial, 0);
});

test('B-01 Sesi 0b: T6 - 30 Juz + Tafsir + Perkata (Batas 60 HK hanya untuk perdana)', () => {
  const res = calculateItemTarifAndSla(['JUZ30', 'TAFSIR', 'PERKATA']);
  assert.equal(res.fee, 3000000);
  assert.equal(res.raw_sla_initial, 75);
  assert.equal(res.sla_initial, 60, 'SLA perdana harus dicap di 60 HK');
  assert.equal(res.sla_revision, 37, 'SLA revisi tidak dibatasi');
  assert.equal(res.sla_dummy, 21, 'SLA dumi tidak dibatasi');
});

test('B-01 Sesi 0b: T7 - 30 Juz + Qiraat', () => {
  const res = calculateItemTarifAndSla(['JUZ30', 'QIRAAT']);
  assert.equal(res.fee, 1500000);
  assert.equal(res.sla_initial, 22);
  assert.equal(res.sla_revision, 12);
  assert.equal(res.sla_dummy, 7);
});

test('B-01 Sesi 0b: T8 - Yasin + Tafsir (Naskah non-30 Juz)', () => {
  const res = calculateItemTarifAndSla(['YASIN', 'TAFSIR']);
  assert.equal(res.fee, 1500000);
  assert.equal(res.sla_initial, 35);
  assert.equal(res.sla_revision, 17);
  assert.equal(res.sla_dummy, 10);
  assert.equal(res.service_type_name, 'Surah Yasin dan Bacaan Tahlil');
});

test('B-01 Sesi 0b: T9 - Braille (Tarif Rp 0, SLA 60 / 30 / 15)', () => {
  const res = calculateItemTarifAndSla(['BRAILLE']);
  assert.equal(res.fee, 0);
  assert.equal(res.sla_initial, 60);
  assert.equal(res.sla_revision, 30);
  assert.equal(res.sla_dummy, 15);
  assert.equal(res.service_kind, 'BRAILLE');
});

test('B-01 Sesi 0b: T10 - Pengajuan 2 naskah: 30 Juz dan Yasin + Tafsir (Agregasi Pengajuan)', () => {
  const naskah1 = calculateItemTarifAndSla(['JUZ30']);
  const naskah2 = calculateItemTarifAndSla(['YASIN', 'TAFSIR']);
  const summary = calculateRegistrationSummary([naskah1, naskah2]);

  assert.equal(summary.total_fee, 2500000, 'Tarif pengajuan = 1.000.000 + 1.500.000 = 2.500.000');
  assert.equal(summary.sla_initial, 35, 'SLA perdana pengajuan memakai naskah terpanjang (max(15, 35) = 35)');
  assert.equal(summary.sla_revision, 17, 'SLA revisi pengajuan memakai naskah terpanjang (max(7, 17) = 17)');
  assert.equal(summary.sla_dummy, 10, 'SLA dumi pengajuan memakai naskah terpanjang (max(3, 10) = 10)');
});

test('B-01 Sesi 0b: T11 - Tambah oplah 30 Juz (PNBP penuh, SLA perpanjangan/dumi)', () => {
  const res = calculateItemTarifAndSla(['JUZ30'], { isExtensionOrTambahOplah: true });
  assert.equal(res.fee, 1000000, 'PNBP penuh tetap dikenakan untuk tambah oplah');
  assert.equal(res.sla_initial, 3, 'SLA memakai durasi perpanjangan/dumi (3 HK)');
});

test('B-01 Sesi 0b: T12 - Kasus UAT (U-01): 30 Juz + Waqaf + Terjemah + Perkata + Tajwid', () => {
  // Input form mentah yang ada di kasus UAT
  const rawFormInputs = [
    "1. Al-Qur'an 30 Juz",
    "3. Waqaf Ibtida'",
    '3. Terjemah',
    '3. Terjemah Perkata',
    '3. Tajwid Warna',
  ];

  const normalizedCodes = normalizeLegacyToItemCodes(rawFormInputs);
  assert.ok(normalizedCodes.includes('JUZ30'), 'Wajib mendeteksi item dasar JUZ30');
  assert.ok(normalizedCodes.includes('WAQAF'), 'Wajib mendeteksi WAQAF');
  assert.ok(normalizedCodes.includes('PERKATA'), 'Wajib mendeteksi PERKATA');
  assert.ok(normalizedCodes.includes('TAJWID'), 'Wajib mendeteksi TAJWID');

  const res = calculateItemTarifAndSla(normalizedCodes);

  // Verifikasi tidak keliru menjadi "Juz 'Amma dan Terjemahnya"
  assert.notEqual(res.service_type_name, "Juz 'Amma dan Terjemahnya");
  assert.equal(res.service_type_name, "Mushaf Al-Qur'an 30 Juz");

  // Verifikasi nominal tarif dan durasi SLA sesuai T12
  assert.equal(res.fee, 3000000, 'Tarif wajib Rp 3.000.000');
  assert.equal(res.sla_initial, 59, 'SLA perdana wajib 59 HK (15 + 7 + 30 + 7)');
  assert.equal(res.sla_revision, 32, 'SLA revisi wajib 32 HK (7 + 5 + 15 + 5)');
  assert.equal(res.sla_dummy, 20, 'SLA dumi wajib 20 HK (3 + 4 + 9 + 4)');

  // Verifikasi Terjemah tercover oleh Perkata
  const terjemahItem = res.items.find((i) => i.code === 'TERJEMAH');
  assert.ok(terjemahItem, 'Terjemah tercatat dalam rincian');
  assert.equal(terjemahItem.is_covered, true);
  assert.equal(terjemahItem.fee, 0);

  // Verifikasi teks tampilan layanan
  assert.ok(res.layananDisplay.includes("Al-Qur'an 30 Juz"));
  assert.ok(res.layananDisplay.includes("Waqaf Ibtida'"));
  assert.ok(res.layananDisplay.includes('Perkata'));
  assert.ok(res.layananDisplay.includes('Tajwid'));
});

test('B-01 Sesi 0b: Edge Cases & Resolusi Deterministik vs Tebakan Teks', () => {
  // 1. 30 Juz dengan string bebas tidak boleh tertebak menjadi Juz 'Amma
  const c1 = normalizeLegacyToItemCodes(["1. Al-Qur'an 30 Juz"]);
  assert.deepEqual(c1, ['JUZ30']);

  // 2. Eksplisit Juz 'Amma
  const c2 = normalizeLegacyToItemCodes(["1. Juz 'Amma", "3. Terjemah"]);
  assert.ok(c2.includes('AMMA'));
  assert.ok(c2.includes('TERJEMAH'));
  const res2 = calculateItemTarifAndSla(c2);
  assert.equal(res2.fee, 1000000); // 500k + 500k
  assert.equal(res2.sla_initial, 12); // 5 + 7

  // 3. Audio Visual
  const c3 = normalizeLegacyToItemCodes(['2. Audio/Visual', '3. Qiraat']);
  assert.ok(c3.includes('AV'));
  assert.ok(c3.includes('QIRAAT'));
  const res3 = calculateItemTarifAndSla(c3);
  assert.equal(res3.fee, 1500000); // 1.000.000 + 500.000
  assert.equal(res3.sla_initial, 37); // 30 + 7
  assert.equal(res3.service_kind, 'AUDIO_VISUAL');

  // 4. Digital
  const c4 = normalizeLegacyToItemCodes(['2. Digital', '3. Tafsir']);
  assert.ok(c4.includes('DIGITAL'));
  assert.ok(c4.includes('TAFSIR'));
  const res4 = calculateItemTarifAndSla(c4);
  assert.equal(res4.fee, 2000000); // 1.000.000 + 1.000.000
  assert.equal(res4.sla_initial, 45); // 15 + 30
  assert.equal(res4.service_kind, 'DIGITAL');

  // 5. Braille via metadata
  const c5 = normalizeLegacyToItemCodes([], { jenis_mushaf: 'Mushaf Standar Braille' });
  assert.deepEqual(c5, ['BRAILLE']);
});

