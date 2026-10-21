import 'dotenv/config';
import test from 'node:test';
import assert from 'node:assert/strict';
import { prisma } from '../src/config/database.js';
import {
  publisherTypeSchema,
  publisherRegistrationStatusSchema,
  publisherRegistrationDocumentTypeSchema,
  computeActiveIdentifiers,
  createPublisherRegistrationSchema,
} from '../src/validators/publisher-registration.validator.js';
import { registerPublisherSchema } from '../src/validators/auth.validator.js';
import { updatePublisherProfileSchema } from '../src/validators/publisher.validator.js';

test('T-F04: Validator Zod membuang nilai PERORANGAN dan menerima tipe penerbit legal', () => {
  // Test schema pendaftaran baru
  assert.equal(publisherTypeSchema.safeParse('PERUSAHAAN').success, true);
  assert.equal(publisherTypeSchema.safeParse('YAYASAN').success, true);
  assert.equal(publisherTypeSchema.safeParse('LEMBAGA_PEMERINTAH').success, true);
  assert.equal(publisherTypeSchema.safeParse('PERORANGAN').success, false);

  // Test schema auth validator lama
  assert.equal(registerPublisherSchema.body.shape.entity_type.safeParse('PT').success, true);
  assert.equal(registerPublisherSchema.body.shape.entity_type.safeParse('CV').success, true);
  assert.equal(registerPublisherSchema.body.shape.entity_type.safeParse('YAYASAN').success, true);
  assert.equal(registerPublisherSchema.body.shape.entity_type.safeParse('LEMBAGA_PEMERINTAH').success, true);
  assert.equal(registerPublisherSchema.body.shape.entity_type.safeParse('PERORANGAN').success, false);

  // Test schema update profil penerbit
  assert.equal(updatePublisherProfileSchema.body.shape.entity_type.safeParse('PERORANGAN').success, false);
  assert.equal(updatePublisherProfileSchema.body.shape.entity_type.safeParse('PT').success, true);
});

test('T-F04: computeActiveIdentifiers menghasilkan nilai pembantu indeks parsial yang benar', () => {
  const active = computeActiveIdentifiers('DIAJUKAN', '01.234.567.8-901.000', '9120001234567');
  assert.equal(active.active_npwp, '01.234.567.8-901.000');
  assert.equal(active.active_nib, '9120001234567');

  const revision = computeActiveIdentifiers('PERLU_PERBAIKAN', '01.234.567.8-901.000', null);
  assert.equal(revision.active_npwp, '01.234.567.8-901.000');
  assert.equal(revision.active_nib, null);

  const approved = computeActiveIdentifiers('DISETUJUI', '01.234.567.8-901.000', '9120001234567');
  assert.equal(approved.active_npwp, '01.234.567.8-901.000');
  assert.equal(approved.active_nib, '9120001234567');

  // Saat DITOLAK, kolom pembantu wajib bernilai NULL agar tidak mengunci nomor di masa depan
  const rejected = computeActiveIdentifiers('DITOLAK', '01.234.567.8-901.000', '9120001234567');
  assert.equal(rejected.active_npwp, null);
  assert.equal(rejected.active_nib, null);
});

test('T-F04: Skema Database & Keunikan Parsial NPWP/NIB di antara pendaftaran yang tidak DITOLAK', async () => {
  const testNpwp = `01.999.888.7-${Date.now().toString().slice(-6)}.000`;
  const testNib = `912000${Date.now().toString().slice(-7)}`;
  const code1 = `REG-TEST-${Math.random().toString(36).substring(2, 10).toUpperCase()}`;
  const code2 = `REG-TEST-${Math.random().toString(36).substring(2, 10).toUpperCase()}`;
  const code3 = `REG-TEST-${Math.random().toString(36).substring(2, 10).toUpperCase()}`;

  let reg1Id, reg2Id, reg3Id;

  try {
    // 1. Buat pendaftaran aktif pertama
    const active1 = computeActiveIdentifiers('DIAJUKAN', testNpwp, testNib);
    const reg1 = await prisma.publisherRegistration.create({
      data: {
        registration_code: code1,
        publisher_type: 'PERUSAHAAN',
        name: 'PT Test Penerbit Pertama',
        address: 'Jl. Uji Coba Skema No. 1, Jakarta',
        pic_name: 'Budi Santoso',
        pic_phone: '081234567891',
        email: `penerbit1_${Date.now()}@example.com`,
        npwp: testNpwp,
        nib: testNib,
        active_npwp: active1.active_npwp,
        active_nib: active1.active_nib,
        status: 'DIAJUKAN',
      },
    });
    reg1Id = reg1.id;
    assert.equal(reg1.status, 'DIAJUKAN');
    assert.equal(reg1.active_npwp, testNpwp);
    assert.equal(reg1.active_nib, testNib);

    // 2. Percobaan membuat pendaftaran aktif kedua dengan NPWP sama HARUS DITOLAK (Unique Constraint)
    const active2 = computeActiveIdentifiers('DIAJUKAN', testNpwp, '9120008888888');
    await assert.rejects(
      async () => {
        await prisma.publisherRegistration.create({
          data: {
            registration_code: code2,
            publisher_type: 'PERUSAHAAN',
            name: 'PT Test Penerbit Duplikat NPWP',
            address: 'Jl. Uji Coba Skema No. 2, Jakarta',
            pic_name: 'Agus Subroto',
            pic_phone: '081234567892',
            email: `penerbit2_${Date.now()}@example.com`,
            npwp: testNpwp,
            nib: '9120008888888',
            active_npwp: active2.active_npwp,
            active_nib: active2.active_nib,
            status: 'DIAJUKAN',
          },
        });
      },
      (err) => {
        assert.ok(err.code === 'P2002', `Harus melempar kode error unik Prisma P2002: ${err.message}`);
        return true;
      }
    );

    // 3. Ubah status pendaftaran pertama menjadi DITOLAK, kosongkan active_npwp & active_nib
    const rejectedActive = computeActiveIdentifiers('DITOLAK', testNpwp, testNib);
    await prisma.publisherRegistration.update({
      where: { id: reg1Id },
      data: {
        status: 'DITOLAK',
        reason: 'Dokumen akta tidak memenuhi standar.',
        active_npwp: rejectedActive.active_npwp,
        active_nib: rejectedActive.active_nib,
      },
    });

    // 4. Setelah pendaftaran pertama DITOLAK, pendaftaran baru dengan NPWP sama SEKARANG DIIZINKAN
    const active3 = computeActiveIdentifiers('DIAJUKAN', testNpwp, testNib);
    const reg3 = await prisma.publisherRegistration.create({
      data: {
        registration_code: code3,
        publisher_type: 'PERUSAHAAN',
        name: 'PT Test Penerbit Baru Pasca Tolak',
        address: 'Jl. Uji Coba Skema No. 3, Jakarta',
        pic_name: 'Budi Santoso Reborn',
        pic_phone: '081234567893',
        email: `penerbit3_${Date.now()}@example.com`,
        npwp: testNpwp,
        nib: testNib,
        active_npwp: active3.active_npwp,
        active_nib: active3.active_nib,
        status: 'DIAJUKAN',
      },
    });
    reg3Id = reg3.id;
    assert.equal(reg3.status, 'DIAJUKAN');
    assert.equal(reg3.active_npwp, testNpwp);

    // 5. Uji relasi dokumen dan token perbaikan
    const doc = await prisma.publisherRegistrationDocument.create({
      data: {
        registration_id: reg3Id,
        document_type: 'SURAT_PENDAFTARAN',
        storage_path: 'private/publisher-docs/test-doc.pdf',
        original_filename: 'surat-permohonan.pdf',
        file_size: 102400,
        file_hash: 'a'.repeat(64),
        mime_type: 'application/pdf',
        has_links: true,
        detected_links: ['https://example.com/company'],
      },
    });
    assert.ok(doc.id);
    assert.equal(doc.has_links, true);

    const token = await prisma.publisherRevisionToken.create({
      data: {
        registration_id: reg3Id,
        token_hash: 'b'.repeat(64),
        expires_at: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000),
      },
    });
    assert.ok(token.id);
    assert.equal(token.used_at, null);

    // 6. Uji cascade delete saat pendaftaran dihapus
    await prisma.publisherRegistration.delete({ where: { id: reg3Id } });
    reg3Id = null;

    const remainingDoc = await prisma.publisherRegistrationDocument.findUnique({ where: { id: doc.id } });
    assert.equal(remainingDoc, null, 'Dokumen harus terhapus secara cascade saat pendaftaran dihapus');

    const remainingToken = await prisma.publisherRevisionToken.findUnique({ where: { id: token.id } });
    assert.equal(remainingToken, null, 'Token revisi harus terhapus secara cascade saat pendaftaran dihapus');
  } finally {
    // Cleanup records
    if (reg1Id) await prisma.publisherRegistration.delete({ where: { id: reg1Id } }).catch(() => {});
    if (reg2Id) await prisma.publisherRegistration.delete({ where: { id: reg2Id } }).catch(() => {});
    if (reg3Id) await prisma.publisherRegistration.delete({ where: { id: reg3Id } }).catch(() => {});
  }
});

