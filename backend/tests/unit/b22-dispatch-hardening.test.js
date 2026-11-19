import test from 'node:test';
import assert from 'node:assert/strict';
import { dispatchVerificationResult, submitVerificationDraft } from '../../src/services/verification-review.service.js';
import { prisma } from '../../src/config/database.js';

test('B22-Hardening: submitVerificationDraft menolak pemaraf_id yang tidak ada atau bukan Pemaraf aktif (400)', async () => {
  const originalTx = prisma.$transaction;

  prisma.$transaction = async (callback) => {
    const fakeTx = {
      $queryRaw: async () => [{ id: 'reg-1', status: 'IN_VERIFICATION', registration_no: 'REG-2026-0001', publisher_id: 'pub-1' }],
      verificationAssignment: {
        findUnique: async () => ({
          id: 'assign-1',
          registration_id: 'reg-1',
          verifier_id: 'u-1',
          status: 'IN_PROGRESS',
        }),
      },
      registration: {
        findUnique: async () => ({
          id: 'reg-1',
          registration_no: 'REG-2026-0001',
          status: 'IN_VERIFICATION',
          publisher_id: 'pub-1',
        }),
      },
      publisher: {
        findUnique: async () => ({ legal_name: 'PT Percetakan', address: 'Jakarta' }),
      },
      verificationDocument: {
        findFirst: async () => null,
      },
      user: {
        findFirst: async () => null, // Tidak ditemukan / bukan pemaraf
      },
    };
    return callback(fakeTx);
  };

  const dummyData = {
    checklist: [],
    decision: 'REVISION_REQUIRED',
    letter_text: 'Surat Catatan Perbaikan',
    pemaraf_id: 'a0000000-0000-0000-0000-000000000001',
  };

  try {
    await assert.rejects(
      async () => {
        await submitVerificationDraft('assign-1', dummyData, { id: 'u-1', name: 'Verifikator', roles: ['VERIFIKATOR'] }, null);
      },
      err => {
        assert.equal(err.statusCode, 400);
        assert.match(err.message, /Pemaraf yang ditunjuk tidak ditemukan/i);
        return true;
      }
    );
  } finally {
    prisma.$transaction = originalTx;
  }
});

test('B22-Hardening: dispatchVerificationResult klaim atomik dokumen ke status SENDING dan cegah pengiriman ganda', async () => {
  const originalFindUnique = prisma.verificationDocument.findUnique;
  const originalUpdateMany = prisma.verificationDocument.updateMany;
  const originalFindFirst = prisma.verificationDocument.findFirst;

  let updateManyCalledWith = null;

  prisma.verificationDocument.findUnique = async () => ({
    id: 'doc-1',
    document_type: 'SURAT_HASIL_VERIFIKASI',
    status: 'SIGNED',
    version: 1,
    assignment_id: 'assign-1',
    signatories: [
      { id: 'sig-1', status: 'SIGNED', sign_order: 1, name_position_snapshot: 'Verifikator' },
      { id: 'sig-2', status: 'SIGNED', sign_order: 2, name_position_snapshot: 'Kepala LPMQ' },
    ],
    content_snapshot: { decision: 'REVISION_REQUIRED' },
    registration: {
      id: 'reg-1',
      registration_no: 'REG-2026-0001',
      status: 'REVISION_REQUIRED',
      publisher: {
        legal_name: 'PT Percetakan Al-Qur’an',
        email: 'penerbit@kemenag.id',
        user: { email: 'penerbit@kemenag.id' },
      },
    },
  });

  prisma.verificationDocument.findFirst = async () => null; // Tidak ada BA terpisah

  // Simulasi: panggilan kedua gagal klaim karena dokumen sudah SENDING (count: 0)
  prisma.verificationDocument.updateMany = async (args) => {
    updateManyCalledWith = args;
    return { count: 0 }; // Klaim gagal
  };

  try {
    await assert.rejects(
      async () => {
        await dispatchVerificationResult('doc-1', { id: 'v1', name: 'Verifikator', roles: ['VERIFIKATOR'] });
      },
      err => {
        assert.equal(err.statusCode, 409);
        assert.match(err.message, /sedang dalam proses pengiriman atau belum siap dikirim/i);
        return true;
      }
    );

    // Pastikan klaim atomik menargetkan dokumen berstatus SIGNED atau EMAIL_FAILED dan mengubahnya ke EMAIL_QUEUED
    assert.deepEqual(updateManyCalledWith.where.status.in, ['SIGNED', 'EMAIL_FAILED']);
    assert.equal(updateManyCalledWith.data.status, 'EMAIL_QUEUED');
  } finally {
    prisma.verificationDocument.findUnique = originalFindUnique;
    prisma.verificationDocument.updateMany = originalUpdateMany;
    prisma.verificationDocument.findFirst = originalFindFirst;
  }
});
