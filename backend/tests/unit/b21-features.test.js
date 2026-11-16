import test from 'node:test';
import assert from 'node:assert/strict';
import { BRAND } from '../../src/config/brand.js';

test('B21-01: BRAND config memuat nama resmi Sistem Informasi Layanan Surat Tanda Tashih', () => {
  assert.equal(BRAND.SYSTEM_NAME, 'Sistem Informasi Layanan Surat Tanda Tashih');
  assert.equal(BRAND.SHORT_NAME, 'LPMQ Tashih');
  assert.equal(BRAND.ORGANIZATION_NAME, "Lajnah Pentashihan Mushaf Al-Qur'an");
  assert.equal(BRAND.MINISTRY_NAME, 'Kementerian Agama Republik Indonesia');
});

test('B21-01: BRAND tidak mengandung kata SIPNA atau Tashih Hub', () => {
  assert.equal(/SIPNA/i.test(BRAND.SYSTEM_NAME), false);
  assert.equal(/Tashih Hub/i.test(BRAND.SHORT_NAME), false);
});
