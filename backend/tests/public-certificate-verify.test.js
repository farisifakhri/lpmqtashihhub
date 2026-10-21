import test from 'node:test';
import assert from 'node:assert/strict';
import { verifyPublisherCertificate } from '../src/services/publisher-registration.service.js';

test('verifyPublisherCertificate: format tidak valid langsung ditolak sebagai TIDAK_VALID', async () => {
  const invalidInputs = [
    '',
    null,
    undefined,
    'invalid-token',
    '12345',
    '31.74', // Kurang dari 4 segmen
    'AB.CD.EF.GH.IJ',
  ];

  for (const input of invalidInputs) {
    const res = await verifyPublisherCertificate(input);
    assert.equal(res.valid, false);
    assert.equal(res.status, 'TIDAK_VALID');
  }
});

test('verifyPublisherCertificate: format valid tapi tidak tercatat mengembalikan TIDAK_TERDAFTAR', async () => {
  // Format nomor induk valid (5 segmen angka bertitik) yang tidak mungkin ada di DB
  const unrecordedNip = '99.99.99.99.99.999';
  const res = await verifyPublisherCertificate(unrecordedNip);
  assert.equal(res.valid, false);
  assert.equal(res.status, 'TIDAK_TERDAFTAR');
});
