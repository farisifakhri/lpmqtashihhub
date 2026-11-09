import test from 'node:test';
import assert from 'node:assert/strict';
import { listDocumentArchive } from '../../src/services/document-archive.service.js';
import { renderVerificationPdf } from '../../src/services/verification-document-pdf.service.js';
import { documentPdf } from '../../src/services/official-document.service.js';

const document = { id: 'v1', document_type: 'NOTA_DINAS_VERIFIKASI', version: 1, status: 'DRAFT' };
// r1: penerbit p1, tim inti verifikator v1 & distributor d1, pentashih t1; tidak ada baris verification_assignments.
const reg = { id: 'r1', publisher_id: 'p1', core_verifier_id: 'v1', core_distributor_id: 'd1', assignees: ['t1'] };
const inScope = where =>
  (!('publisher_id' in where) || where.publisher_id === reg.publisher_id)
  && (!('core_verifier_id' in where) || where.core_verifier_id === reg.core_verifier_id)
  && (!('core_distributor_id' in where) || where.core_distributor_id === reg.core_distributor_id)
  && (!where.assignments || reg.assignees.includes(where.assignments.some.assignee_id));
const db = {
  registration: {
    findUnique: async () => ({ id: reg.id, publisher_id: reg.publisher_id }),
    findFirst: async ({ where }) => (inScope(where) ? { id: reg.id } : null),
  },
  verificationDocument: { findMany: async () => [document] },
  officialDocument: { findMany: async () => [{ ...document, id: 'o1', document_type: 'BERITA_ACARA_TASHIH' }] },
};

test('archive includes draft verification and tashih versions for the owner and approved internal roles', async () => {
  for (const user of [
    { id: 'u-pub', roles: ['PENERBIT'], publisherId: 'p1' },
    { id: 'u-admin', roles: ['ADMIN_INTERNAL'] },
    { id: 'u-doc', roles: ['DOKUMENTATOR'] },
    // Verifikator tim inti tetap boleh walau belum ada baris penugasan (naskah ini tampil di daftarnya).
    { id: 'v1', roles: ['PENTASHIH', 'VERIFIKATOR'] },
    { id: 'd1', roles: ['DISTRIBUTOR'] },
    { id: 't1', roles: ['PENTASHIH'] },
  ]) {
    const result = await listDocumentArchive('r1', user, db);
    assert.deepEqual(result.map(item => [item.source, item.status]), [['VERIFICATION', 'DRAFT'], ['OFFICIAL', 'DRAFT']]);
  }
});

test('archive denies another publisher and unrelated staff', async () => {
  for (const user of [
    { id: 'u-pub2', roles: ['PENERBIT'], publisherId: 'p2' },
    { id: 'v2', roles: ['VERIFIKATOR'] },
    { id: 'd2', roles: ['DISTRIBUTOR'] },
    { id: 't2', roles: ['PENTASHIH'] },
  ]) {
    await assert.rejects(listDocumentArchive('r1', user, db), error => error.statusCode === 403);
  }
});

test('U-05: renderVerificationPdf handles unbroken long test words (adssadas...) without throwing 422', async () => {
  const docWithLongText = {
    document_type: 'SURAT_HASIL_VERIFIKASI',
    version: 1,
    content_snapshot: {
      registration_no: 'REG-001',
      title: "Mushaf Al-Qur'an Standar",
      publisher_name: 'PT Mushaf Nusantara',
      decision: 'REVISION_REQUIRED',
      // Simulasi teks uji panjang tanpa spasi (kasus UAT U-05 Gambar 14)
      letter_text: 'Teks catatan perbaikan: ' + 'adssadas'.repeat(25) + ' teks lanjutan reguler.',
    },
  };

  const bytes = await renderVerificationPdf(docWithLongText, { draft: true });
  assert.ok(bytes instanceof Uint8Array);
  assert.equal(bytes.subarray(0, 5).toString(), '%PDF-');
});

test('U-05: renderVerificationPdf safely sanitizes special and transliterated characters', async () => {
  const docWithSpecialChars = {
    document_type: 'SURAT_HASIL_VERIFIKASI',
    version: 1,
    content_snapshot: {
      registration_no: 'REG-002',
      title: 'Al-Qur’ān al-Karīm “Edisi Khusus” – Cetakan I • Standar LPMQ ✓',
      publisher_name: 'Penerbit Berkualitas',
      decision: 'REVISION_REQUIRED',
      letter_text: 'Perhatikan tanda waqaf lāzim, mad wajib muttaṣil, dan idġām bighunnah.',
    },
  };

  const bytes = await renderVerificationPdf(docWithSpecialChars, { draft: true });
  assert.ok(bytes instanceof Uint8Array);
  assert.equal(bytes.subarray(0, 5).toString(), '%PDF-');
});

test('U-05: documentPdf allows internal staff to preview unissued official documents, while rejecting publisher', async () => {
  const unissuedOfficialDoc = {
    id: 'o-unissued-1',
    document_type: 'BERITA_ACARA_TASHIH',
    document_no: 'DRAFT-BA-001',
    version: 1,
    status: 'SUBMITTED', // Dokumen belum ISSUED
    content_snapshot: {
      title: 'Mushaf Standar Uji',
      registration_no: 'REG-202610-0001',
      publisher: 'PT Penerbit Uji',
    },
  };

  // Internal staff (ADMIN_INTERNAL / SUPERADMIN / DOKUMENTATOR) can preview the PDF
  const internalUser = { roles: ['ADMIN_INTERNAL'] };
  const bytes = await documentPdf(unissuedOfficialDoc, internalUser);
  assert.ok(bytes instanceof Uint8Array);
  assert.equal(bytes.subarray(0, 5).toString(), '%PDF-');

  // Publisher is rejected with 409 because document is not yet officially ISSUED
  const publisherUser = { roles: ['PENERBIT'], publisherId: 'pub-1' };
  await assert.rejects(
    documentPdf(unissuedOfficialDoc, publisherUser),
    error => error.statusCode === 409
  );
});
