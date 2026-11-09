import test from 'node:test';
import assert from 'node:assert/strict';
import { verifyPublisherCertificate } from '../../src/services/publisher-registration.service.js';

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

test('maskIdentifier: NPWP/NIB disamarkan kecuali 4 digit awal dan akhir', async () => {
  const { maskIdentifier } = await import('../../src/services/publisher-registration.service.js');
  assert.equal(maskIdentifier('9981809820001234'), '9981********1234');
  assert.equal(maskIdentifier('81818098200001'), '8181******0001');
  assert.equal(maskIdentifier('12345678'), '********');
  assert.equal(maskIdentifier(null), null);
});

test('isCertificateActive: SAH hanya bila pendaftaran disetujui dan akun aktif', async () => {
  const { isCertificateActive } = await import('../../src/services/publisher-registration.service.js');
  assert.equal(isCertificateActive({ registrationStatus: 'DISETUJUI', userStatus: 'ACTIVE' }), true);
  assert.equal(isCertificateActive({ registrationStatus: 'DISETUJUI', userStatus: 'INACTIVE' }), false);
  assert.equal(isCertificateActive({ registrationStatus: 'DITOLAK', userStatus: 'ACTIVE' }), false);
  assert.equal(isCertificateActive({ registrationStatus: 'DISETUJUI', userStatus: null }), false);
  assert.equal(isCertificateActive({ registrationStatus: undefined, userStatus: 'ACTIVE' }), true);
});
