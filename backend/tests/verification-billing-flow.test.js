import test from 'node:test';
import assert from 'node:assert/strict';
import { verificationDraftSchema } from '../src/validators/verification.validator.js';
import { computeDocumentHash } from '../src/services/verification-signing.service.js';

const checklist = [
  'REGISTRATION_DATA', 'DIGITAL_FILES', 'PHYSICAL_MASTER', 'MANUSCRIPT_CONTENT',
].map(code => ({ code, result: 'SESUAI' }));

test('surat lolos wajib memiliki kode billing sebelum diajukan', () => {
  const base = { decision: 'PASSED', checklist, letter_text: 'Naskah memenuhi syarat pemeriksaan.' };
  assert.equal(verificationDraftSchema.body.safeParse(base).success, false);
  assert.equal(verificationDraftSchema.body.safeParse({ ...base, billing_no: 'SIMPONI-001' }).success, true);
});

test('kode billing tidak diterima untuk surat yang meminta perbaikan', () => {
  const payload = {
    decision: 'REVISION_REQUIRED',
    checklist: checklist.map((item, index) => index ? item : { ...item, result: 'TIDAK_SESUAI', notes: 'Perbaiki naskah.' }),
    notes: 'Perbaiki naskah sebelum diajukan kembali.',
    letter_text: 'Naskah perlu diperbaiki sebelum pentashihan.',
    billing_no: 'SIMPONI-001',
  };
  assert.equal(verificationDraftSchema.body.safeParse(payload).success, false);
});

test('tanda tangan draf tetap cocok saat urutan properti JSON berubah', () => {
  const base = { id: 'doc-1', document_type: 'SURAT_HASIL_VERIFIKASI', version: 1 };
  assert.equal(
    computeDocumentHash({ ...base, content_snapshot: { decision: 'PASSED', billing_no: 'SIMPONI-001' } }),
    computeDocumentHash({ ...base, content_snapshot: { billing_no: 'SIMPONI-001', decision: 'PASSED' } }),
  );
});
