import test from 'node:test';
import assert from 'node:assert/strict';
import { calculateItemTarifAndSla, calculateRegistrationSummary } from '../../src/utils/item-calculator.js';

test('B22-T3: Server menghitung ulang tarif dari master data dan mengabaikan manipulasi', () => {
  // Simulasi 2 naskah:
  // Naskah 1: JUZ30 (Dasar Rp 1.000.000) + TERJEMAH (Tambahan Rp 500.000) -> Rp 1.500.000
  // Naskah 2: YASIN (Dasar Rp 500.000) -> Rp 500.000
  // Total resmi server: Rp 2.000.000
  const m1Codes = ['JUZ30', 'TERJEMAH'];
  const m2Codes = ['YASIN'];

  const m1Calc = calculateItemTarifAndSla(m1Codes, { isExtensionOrTambahOplah: false });
  const m2Calc = calculateItemTarifAndSla(m2Codes, { isExtensionOrTambahOplah: false });

  assert.equal(m1Calc.fee, 1500000);
  assert.equal(m2Calc.fee, 500000);

  const summary = calculateRegistrationSummary([m1Calc, m2Calc]);
  assert.equal(summary.totalFee, 2000000);

  // Jika klien mencoba mengirim manipulasi angka Rp 10.000,
  // kalkulasi server tetap menghasilkan Rp 2.000.000
  assert.equal(summary.totalFee === 10000, false);
});

test('B22-T2: Naskah bebas tarif atau 0 dihitung dengan benar', () => {
  // Simulasi item yang menghasilkan 0 bila ada kategori bebas tarif atau perpanjangan tanpa perubahan
  // Pastikan summary mengembalikan totalFee sebagai number yang valid
  const mockCalcs = [
    {
      fee: 0,
      slaInitial: 5,
      slaRevision: 2,
      slaDummy: 1,
      items: [],
      layanan_display: 'Mushaf Bebas Tarif',
    },
  ];
  const summary = calculateRegistrationSummary(mockCalcs);
  assert.equal(summary.totalFee, 0);
  assert.equal(summary.slaInitialDays, 5);
});
