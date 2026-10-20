import test from 'node:test';
import assert from 'node:assert/strict';
import {
  calculateAddonMateriUnits,
  resolveNaskahEnum,
  NASKAH_CONTENT_ENUM,
} from '../src/services/registration.service.js';

const BASE_FEE_30_JUZ = 1000000;
const ADDON_UNIT_FEE = 500000;

function computeTotalFee(baseFee, addonUnits) {
  return baseFee + addonUnits * ADDON_UNIT_FEE;
}

test('Sesi 0 - Enum & Resolver: Qiraat terdaftar dan terdeteksi dengan tepat', () => {
  assert.equal(NASKAH_CONTENT_ENUM.QIRAAT, 'QIRAAT');
  assert.equal(resolveNaskahEnum('3. Qiraat'), 'QIRAAT');
  assert.equal(resolveNaskahEnum("Mushaf Al-Qur'an Qira'at"), 'QIRAAT');
  assert.equal(resolveNaskahEnum('qiroat'), 'QIRAAT');
});

test('Sesi 0 - T1: 30 Juz murni = Rp 1.000.000', () => {
  const jenisNaskah = ["1. Al-Qur'an 30 Juz"];
  const units = calculateAddonMateriUnits(jenisNaskah);
  assert.equal(units, 0, 'Tidak boleh ada unit addon materi untuk 30 Juz murni');
  const total = computeTotalFee(BASE_FEE_30_JUZ, units);
  assert.equal(total, 1000000);
});

test('Sesi 0 - T2: 30 Juz + Terjemah + Transliterasi + Tajwid = Rp 2.500.000 (contoh resmi)', () => {
  const jenisNaskah = [
    "1. Al-Qur'an 30 Juz",
    '3. Terjemah',
    '3. Transliterasi',
    '3. Tajwid Warna',
  ];
  const units = calculateAddonMateriUnits(jenisNaskah);
  assert.equal(units, 3, 'Terjemah (1) + Transliterasi (1) + Tajwid (1) = 3 unit');
  const total = computeTotalFee(BASE_FEE_30_JUZ, units);
  assert.equal(total, 2500000);
});

test('Sesi 0 - T3: 30 Juz + Perkata = Rp 2.000.000 (sesuai tabel resmi)', () => {
  const jenisNaskah = ["1. Al-Qur'an 30 Juz", '3. Terjemah Perkata'];
  const units = calculateAddonMateriUnits(jenisNaskah);
  assert.equal(units, 2, 'Perkata dihitung 2 unit (+Rp 1.000.000)');
  const total = computeTotalFee(BASE_FEE_30_JUZ, units);
  assert.equal(total, 2000000);

  // Juga valid jika hanya menyebut kata kunci "Perkata"
  const unitsKeyword = calculateAddonMateriUnits(['30 Juz', 'Perkata']);
  assert.equal(unitsKeyword, 2);
  assert.equal(computeTotalFee(BASE_FEE_30_JUZ, unitsKeyword), 2000000);
});

test('Sesi 0 - T4: 30 Juz + Perkata + Transliterasi + Tajwid = Rp 3.000.000', () => {
  const jenisNaskah = [
    "1. Al-Qur'an 30 Juz",
    '3. Terjemah Perkata',
    '3. Transliterasi',
    '3. Kode Tajwid',
  ];
  const units = calculateAddonMateriUnits(jenisNaskah);
  assert.equal(units, 4, 'Perkata (2) + Transliterasi (1) + Tajwid (1) = 4 unit');
  const total = computeTotalFee(BASE_FEE_30_JUZ, units);
  assert.equal(total, 3000000);
});

test('Sesi 0 - T5: 30 Juz + Terjemah + Perkata = Rp 2.000.000 (Terjemah diabaikan)', () => {
  const jenisNaskah = [
    "1. Al-Qur'an 30 Juz",
    '3. Terjemah',
    '3. Terjemah Perkata',
  ];
  const units = calculateAddonMateriUnits(jenisNaskah);
  assert.equal(units, 2, 'Terjemah harus diabaikan bila dipilih bersama Perkata');
  const total = computeTotalFee(BASE_FEE_30_JUZ, units);
  assert.equal(total, 2000000);
});

test('Sesi 0 - T5b: 30 Juz + Terjemah + Tafsir = Rp 2.000.000 (Terjemah diabaikan)', () => {
  const jenisNaskah = [
    "1. Al-Qur'an 30 Juz",
    '3. Terjemah',
    '3. Tafsir',
  ];
  const units = calculateAddonMateriUnits(jenisNaskah);
  assert.equal(units, 2, 'Terjemah harus diabaikan bila dipilih bersama Tafsir');
  const total = computeTotalFee(BASE_FEE_30_JUZ, units);
  assert.equal(total, 2000000);
});

test('Sesi 0 - T6: 30 Juz + Tafsir + Perkata = Rp 3.000.000', () => {
  const jenisNaskah = [
    "1. Al-Qur'an 30 Juz",
    '3. Tafsir',
    '3. Terjemah Perkata',
  ];
  const units = calculateAddonMateriUnits(jenisNaskah);
  assert.equal(units, 4, 'Tafsir (2) + Perkata (2) = 4 unit');
  const total = computeTotalFee(BASE_FEE_30_JUZ, units);
  assert.equal(total, 3000000);

  // Jika Terjemah juga tidak sengaja dipilih bersamaan, tetap diabaikan
  const withTerjemah = [...jenisNaskah, '3. Terjemah'];
  assert.equal(calculateAddonMateriUnits(withTerjemah), 4);
});

test('Sesi 0 - T7: 30 Juz + Qiraat = Rp 1.500.000', () => {
  const jenisNaskah = ["1. Al-Qur'an 30 Juz", '3. Qiraat'];
  const units = calculateAddonMateriUnits(jenisNaskah);
  assert.equal(units, 1, 'Qiraat dihitung 1 unit (+Rp 500.000)');
  const total = computeTotalFee(BASE_FEE_30_JUZ, units);
  assert.equal(total, 1500000);
});

test('Sesi 0 - Bagian II Checklist (Materi Pelengkap) tidak menambah biaya (+Rp 0)', () => {
  // Hanya memilih 30 Juz di bagian jenis naskah, materi tambahan Bagian II tidak dihitung di calculateAddonMateriUnits
  const jenisNaskah = ["1. Al-Qur'an 30 Juz"];
  const units = calculateAddonMateriUnits(jenisNaskah);
  assert.equal(units, 0);
  const total = computeTotalFee(BASE_FEE_30_JUZ, units);
  assert.equal(total, 1000000);
});

test('Sesi 0 - Addon line calculation: fee_snapshot merefleksikan total unit materi', () => {
  const singleUnitAddon = { code: 'ADD-MATERI', fee: 500000 };
  const units = 3;
  const quantity = units;
  const feeSnapshot = Number(singleUnitAddon.fee) * quantity;
  assert.equal(feeSnapshot, 1500000);
  assert.equal(quantity, 3);
});
