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
