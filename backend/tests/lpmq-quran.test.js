import test from 'node:test';
import assert from 'node:assert/strict';
import { normalizeOfficialVerse } from '../src/services/lpmq-quran.service.js';

test('normalizes an official verse response without exposing API credentials', () => {
  const verse = normalizeOfficialVerse({ data: [{
    ayat: 1,
    teks_msi_usmani: 'بِسْمِ اللَّهِ',
    terjemah: 'Dengan nama Allah.',
  }] }, 1, 1, 'Al-Fatihah');
  assert.deepEqual(verse, {
    arabic: 'بِسْمِ اللَّهِ', translation: 'Dengan nama Allah.', footnote: null,
    source: 'QS. Al-Fatihah: 1', provider: 'LPMQ',
  });
});
