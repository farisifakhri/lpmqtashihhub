import test from 'node:test';
import assert from 'node:assert/strict';
import {
  checkPublisherRegistrationStatusSchema,
  adminEditRegistrationSchema,
} from '../../src/validators/publisher-registration.validator.js';
import { adminEditPublisherSchema } from '../../src/validators/publisher.validator.js';
import { forbidPemaraf } from '../../src/utils/pemaraf.js';

test('B24-02: Validator checkPublisherRegistrationStatusSchema menerima kode atau email atau identifier', () => {
  // Hanya kode pendaftaran
  const byCode = checkPublisherRegistrationStatusSchema.body.safeParse({
    kode_pendaftaran: 'REG-PUB-7K9M2X4F',
  });
  assert.equal(byCode.success, true);

  // Hanya email
  const byEmail = checkPublisherRegistrationStatusSchema.body.safeParse({
    email: 'penerbit@instansi.com',
  });
  assert.equal(byEmail.success, true);

  // Menggunakan field identifier generik
  const byIdentifier = checkPublisherRegistrationStatusSchema.body.safeParse({
    identifier: 'penerbit@instansi.com',
  });
  assert.equal(byIdentifier.success, true);

  // Kosong harus ditolak
  const empty = checkPublisherRegistrationStatusSchema.body.safeParse({});
  assert.equal(empty.success, false);
});

test('B24-03: Validator adminEditPublisherSchema memvalidasi data dan alasan wajib minimal 10 karakter', () => {
  // Alasan < 10 karakter harus gagal
  const shortReason = adminEditPublisherSchema.body.safeParse({
    legal_name: 'PT Percetakan Baru',
    reason: 'pendek',
  });
  assert.equal(shortReason.success, false);

  // Valid dengan alasan >= 10 karakter
  const valid = adminEditPublisherSchema.body.safeParse({
    legal_name: 'PT Percetakan Mushaf Sejahtera',
    entity_type: 'PT',
    phone: '08123456789',
    npwp: '01.234.567.8-901.000',
    reason: 'Pembaruan legalitas badan hukum sesuai akta notaris terbaru',
  });
  assert.equal(valid.success, true);
});

test('B24-03: Validator adminEditRegistrationSchema memvalidasi permohonan pendaftaran', () => {
  const valid = adminEditRegistrationSchema.body.safeParse({
    name: 'Penerbit Al-Huda Baru',
    publisher_type: 'SWASTA',
    pic_name: 'Haji Ahmad',
    pic_phone: '081199998888',
    email: 'ahmad@alhuda.co.id',
    npwp: '123456789012345',
    reason: 'Koreksi penulisan nama penanggung jawab dan NPWP oleh Super Admin',
  });
  assert.equal(valid.success, true);

  // Tanpa reason harus gagal
  const noReason = adminEditRegistrationSchema.body.safeParse({
    name: 'Penerbit Al-Huda Baru',
  });
  assert.equal(noReason.success, false);
});

test('B24-04: Guard forbidPemaraf melempar 403 untuk Pemaraf dan mengizinkan peran lain', () => {
  const pemaraf = { id: 'u-pemaraf', isPemaraf: true, roles: ['KEPALA_LPMQ'] };
  const kepala = { id: 'u-kepala', isPemaraf: false, roles: ['KEPALA_LPMQ'] };
  const superadmin = { id: 'u-admin', isPemaraf: false, roles: ['SUPERADMIN'] };

  assert.throws(
    () => forbidPemaraf(pemaraf, 'mengembalikan draf surat hasil verifikasi'),
    (err) => err.statusCode === 403 && err.message.includes('Akses ditolak')
  );

  assert.doesNotThrow(() => forbidPemaraf(kepala, 'mengembalikan draf'));
  assert.doesNotThrow(() => forbidPemaraf(superadmin, 'mengembalikan draf'));
  assert.doesNotThrow(() => forbidPemaraf(null, 'mengembalikan draf'));
});


test('B24-P0: Cek status via email SELALU mengembalikan respons generik tanpa data sensitif', async () => {
  // Simulasi: mock prisma dan sendOutboxEmail
  const { prisma } = await import('../../src/config/database.js');
  const service = await import('../../src/services/publisher-registration.service.js');

  const originalFindMany = prisma.publisherRegistration.findMany;

  // Kasus 1: Email TERDAFTAR — respons harus sama dengan email TIDAK terdaftar
  prisma.publisherRegistration.findMany = async () => [
    { id: 'r1', registration_code: 'REG-PUB-SECRET', name: 'PT Rahasia', status: 'DIAJUKAN', reason: null, created_at: new Date(), updated_at: new Date() },
  ];
  try {
    const resultFound = await service.checkPublisherRegistrationStatus('terdaftar@email.com');
    // TIDAK boleh mengandung kode pendaftaran, status, alasan, atau data sensitif apapun
    assert.equal(resultFound.is_email_search, true);
    assert.equal('kode_pendaftaran' in resultFound, false, 'Kode pendaftaran TIDAK boleh dikembalikan ke HTTP');
    assert.equal('status' in resultFound, false, 'Status TIDAK boleh dikembalikan ke HTTP');
    assert.equal('status_label' in resultFound, false, 'Label status TIDAK boleh dikembalikan ke HTTP');
    assert.equal('alasan' in resultFound, false, 'Alasan TIDAK boleh dikembalikan ke HTTP');
    assert.equal('masked_email' in resultFound, false, 'Masked email TIDAK boleh dikembalikan ke HTTP');
    assert.equal('email_sent' in resultFound, false, 'email_sent TIDAK boleh dikembalikan ke HTTP');
    assert.equal('total_pendaftaran' in resultFound, false, 'total_pendaftaran TIDAK boleh dikembalikan ke HTTP');
    assert.equal('timeline' in resultFound, false, 'timeline TIDAK boleh dikembalikan ke HTTP');
    assert.ok(resultFound.message.includes('Jika email terdaftar'));

    // Kasus 2: Email TIDAK terdaftar — respons identik
    prisma.publisherRegistration.findMany = async () => [];
    const resultNotFound = await service.checkPublisherRegistrationStatus('tidakada@email.com');
    assert.equal(resultNotFound.is_email_search, true);
    assert.equal('kode_pendaftaran' in resultNotFound, false);
    assert.equal('status' in resultNotFound, false);
    assert.ok(resultNotFound.message.includes('Jika email terdaftar'));

    // Kasus 3: Respons keduanya harus IDENTIK secara struktur
    assert.deepEqual(Object.keys(resultFound).sort(), Object.keys(resultNotFound).sort(),
      'Struktur respons email terdaftar dan tidak terdaftar harus identik');
  } finally {
    prisma.publisherRegistration.findMany = originalFindMany;
  }
});
