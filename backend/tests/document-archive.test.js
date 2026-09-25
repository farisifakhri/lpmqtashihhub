import test from 'node:test';
import assert from 'node:assert/strict';
import { listDocumentArchive } from '../src/services/document-archive.service.js';

const document = { id: 'v1', document_type: 'NOTA_DINAS_VERIFIKASI', version: 1, status: 'DRAFT' };
const db = {
  registration: { findUnique: async () => ({ id: 'r1', publisher_id: 'p1' }) },
  verificationDocument: { findMany: async () => [document] },
  officialDocument: { findMany: async () => [{ ...document, id: 'o1', document_type: 'BERITA_ACARA_TASHIH' }] },
};

test('archive includes draft verification and tashih versions for the owner and approved internal roles', async () => {
  for (const user of [
    { roles: ['ADMIN_PENERBIT'], publisherId: 'p1' },
    { roles: ['HELPER_ADMIN'] },
    { roles: ['DOKUMENTATOR'] },
  ]) {
    const result = await listDocumentArchive('r1', user, db);
    assert.deepEqual(result.map(item => [item.source, item.status]), [['VERIFICATION', 'DRAFT'], ['OFFICIAL', 'DRAFT']]);
  }
});

test('archive denies another publisher and unrelated staff', async () => {
  for (const user of [
    { roles: ['ADMIN_PENERBIT'], publisherId: 'p2' },
    { roles: ['VERIFIKATOR'] },
  ]) {
    await assert.rejects(listDocumentArchive('r1', user, db), error => error.statusCode === 403);
  }
});
