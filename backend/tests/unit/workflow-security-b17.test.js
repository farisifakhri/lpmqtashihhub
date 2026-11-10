import test from 'node:test';
import assert from 'node:assert/strict';
import {
  uploadPublisherRevisionRecap,
  dispatchPhysical,
  TRANSITION_POLICY,
  transitionStatus,
} from '../../src/services/registration.service.js';
import {
  approveDistribution,
  recordReview,
} from '../../src/services/distribution.service.js';
import { createDocument } from '../../src/services/official-document.service.js';
import { prisma } from '../../src/config/database.js';

test('B17-01: Upload rekap penerbit mandiri sukses walau status intake fisik sudah RECEIVED (bebas jalan buntu)', async () => {
  const regId = 'reg-b17-01';
  let prrUpserted = false;

  const mockTx = {
    $queryRaw: async () => [{ id: regId }],
    registration: {
      findUnique: async () => ({
        id: regId,
        status: 'REVISION_REQUIRED',
        revision_source: 'TASHIH_REVISION',
        publisher_id: 'pub-b17',
      }),
    },
    physicalMasterIntake: {
      findUnique: async () => ({
        registration_id: regId,
        status: 'RECEIVED',
        receipt_no: 'RCV-TMII-001',
      }),
    },
    storedFile: {
      findUnique: async () => ({
        id: 'file-recap-valid',
        owner_id: 'usr-pub',
        file_size: 2048,
        mime_type: 'application/pdf',
      }),
    },
    officialDocument: {
      findFirst: async () => ({
        document_type: 'REVISION_RETURN_LETTER',
        version: 1,
        content_snapshot: { revision_round: 1, revision_kind: 'NASKAH_PERBAIKAN' },
      }),
    },
    publisherRevisionRecap: {
      upsert: async ({ create }) => {
        prrUpserted = true;
        assert.equal(create.round_number, 1);
        assert.equal(create.recap_file_id, 'file-recap-valid');
        assert.equal(create.revision_kind, 'CORRECTION');
        return { id: 'prr-1', ...create };
      },
    },
    auditLog: {
      create: async () => ({ id: 'audit-1' }),
    },
  };

  prisma.$transaction = async (fn) => fn(mockTx);
  const publisherUser = { id: 'usr-pub', roles: ['PENERBIT'], publisherId: 'pub-b17' };

  // 1. dispatchPhysical tetap menolak jika master fisik sudah RECEIVED (409)
  await assert.rejects(
    dispatchPhysical(regId, {
      courier: 'JNE',
      tracking_no: 'JNE888',
      recap_file_id: 'file-recap-valid',
    }, publisherUser),
    (err) => err.statusCode === 409 && /sudah diterima oleh LPMQ/i.test(err.message)
  );

  // 2. Tetapi endpoint mandiri uploadPublisherRevisionRecap tetap berhasil tanpa hambatan!
  const res = await uploadPublisherRevisionRecap(regId, {
    recap_file_id: 'file-recap-valid',
    notes: 'Perbaikan mandiri diunggah setelah fisik diserahkan ke TMII.',
  }, publisherUser);

  assert.ok(res);
  assert.equal(prrUpserted, true);
  assert.equal(res.round_number, 1);
});

test('B17-02: Upload rekap menolak berkas 0-byte atau file yang tidak ada di StoredFile', async () => {
  const regId = 'reg-b17-02';

  const mockTx = {
    $queryRaw: async () => [{ id: regId }],
    registration: {
      findUnique: async () => ({
        id: regId,
        status: 'REVISION_REQUIRED',
        revision_source: 'TASHIH_REVISION',
        publisher_id: 'pub-b17',
      }),
    },
    storedFile: {
      findUnique: async ({ where }) => {
        if (where.id === 'file-zero-byte') return { id: 'file-zero-byte', owner_id: 'usr-pub', file_size: 0, mime_type: 'application/pdf' };
        if (where.id === 'file-foreign-owner') return { id: 'file-foreign-owner', owner_id: 'other-pub', file_size: 1024, mime_type: 'application/pdf' };
        return null;
      },
    },
    officialDocument: {
      findFirst: async () => ({
        document_type: 'REVISION_RETURN_LETTER',
        version: 1,
        content_snapshot: { revision_round: 1, revision_kind: 'NASKAH_PERBAIKAN' },
      }),
    },
  };

  prisma.$transaction = async (fn) => fn(mockTx);
  const publisherUser = { id: 'usr-pub', roles: ['PENERBIT'], publisherId: 'pub-b17' };

  // 1. Tolak jika file tidak ditemukan
  await assert.rejects(
    uploadPublisherRevisionRecap(regId, { recap_file_id: 'file-not-found' }, publisherUser),
    (err) => err.statusCode === 400 && /tidak ditemukan/i.test(err.message)
  );

  // 2. Tolak jika file 0-byte
  await assert.rejects(
    uploadPublisherRevisionRecap(regId, { recap_file_id: 'file-zero-byte' }, publisherUser),
    (err) => err.statusCode === 400 && /berkas kosong/i.test(err.message)
  );

  // 3. Tolak jika file milik akun lain
  await assert.rejects(
    uploadPublisherRevisionRecap(regId, { recap_file_id: 'file-foreign-owner' }, publisherUser),
    (err) => err.statusCode === 403 && /bukan milik akun penerbit Anda/i.test(err.message)
  );
});

test('B17-03: approveDistribution dengan putusan REVISION_REQUIRED menolak eksekusi jika pentashih belum setor rekap', async () => {
  const regId = 'reg-b17-03';

  // Skenario A: Pentashih belum menyelesaikan reviu / belum ada rekap
  const mockTxIncomplete = {
    $queryRaw: async () => [{ id: regId }],
    registration: {
      findUnique: async () => ({
        id: regId,
        status: 'TASHIH_IN_PROGRESS',
        publisher_id: 'pub-1',
      }),
    },
    assignment: {
      findFirst: async () => ({ id: 'asg-1', iteration: 1, stage: 'INITIAL' }),
      findMany: async () => [
        {
          id: 'asg-1',
          team_id: null,
          status: 'ASSIGNED',
          reviews: [],
        },
      ],
    },
    officialDocument: {
      count: async () => 0,
    },
  };

  prisma.$transaction = async (fn) => fn(mockTxIncomplete);
  const distributorUser = { id: 'usr-dist', roles: ['DISTRIBUTOR'], name: 'Distributor 1' };

  await assert.rejects(
    approveDistribution(regId, {
      result: 'REVISION_REQUIRED',
      notes: 'Kembalikan revisi sebelum pentashih selesai merekap',
    }, distributorUser),
    (err) => err.statusCode === 409 && /belum selesai atau belum memiliki hasil sidang/i.test(err.message)
  );

  // Skenario B: Review ada tetapi belum upload recap_file_id
  const mockTxMissingRecap = {
    ...mockTxIncomplete,
    assignment: {
      findFirst: async () => ({ id: 'asg-1', iteration: 1, stage: 'INITIAL' }),
      findMany: async () => [
        {
          id: 'asg-1',
          team_id: null,
          status: 'COMPLETED',
          reviews: [{ id: 'rev-1', result: 'REVISION_REQUIRED', recap_file_id: null }],
        },
      ],
    },
  };
  prisma.$transaction = async (fn) => fn(mockTxMissingRecap);

  await assert.rejects(
    approveDistribution(regId, {
      result: 'REVISION_REQUIRED',
      notes: 'Kembalikan revisi sebelum pentashih unggah rekap',
    }, distributorUser),
    (err) => err.statusCode === 409 && /dokumen rekap hasil telaah internal belum diunggah/i.test(err.message)
  );
});

test('B17-04: TRANSITION_POLICY menolak generic transition REVISION_REQUIRED -> READY_FOR_VERIFICATION (domainAction: true)', async () => {
  const policy = TRANSITION_POLICY['REVISION_REQUIRED']['READY_FOR_VERIFICATION'];
  assert.ok(policy, 'Kebijakan transisi REVISION_REQUIRED -> READY_FOR_VERIFICATION harus terdefinisi');
  assert.equal(policy.domainAction, true, 'Transisi REVISION_REQUIRED -> READY_FOR_VERIFICATION wajib ditandai domainAction: true');

  // transitionStatus generik wajib memblokir target status READY_FOR_VERIFICATION
  const publisherUser = { id: 'usr-pub', roles: ['PENERBIT'], publisherId: 'pub-1' };
  await assert.rejects(
    transitionStatus('reg-any', 'READY_FOR_VERIFICATION', 'Bypass transisi', publisherUser, {}),
    (err) => err.statusCode === 409 && /Gunakan aksi submit/i.test(err.message)
  );
});

test('B17-05: createDocument tidak membocorkan nama pentashih (assignee) dan reviews ke dalam content_snapshot', async () => {
  const regId = 'reg-b17-05';
  let createdSnapshot = null;

  const mockTx = {
    $queryRaw: async () => [{ id: regId }],
    registration: {
      findUnique: async () => ({
        id: regId,
        status: 'READY_FOR_STT',
        title: 'Mushaf Al-Qur\'an Standar',
        registration_no: 'REG-2026-001',
        publisher: { legal_name: 'PT Percetakan Al-Qur\'an', address: 'Jakarta', phone: '08123456789', email: 'kontak@percetakan.com' },
        verification_assignments: [{ decision: 'APPROVED', notes: 'Dokumen verifikasi lengkap' }],
        assignments: [
          {
            stage: 'INITIAL',
            iteration: 1,
            status: 'COMPLETED',
            due_at: new Date('2026-11-01'),
            assignee: { name: 'Dr. Rahasia Negara, M.Ag.' },
            team: { name: 'Tim Pentashih 1', decree_no: 'SK-01' },
            reviews: [
              {
                id: 'rev-internal-1',
                notes: 'Catatan rahasia sidang: ada potensi kekeliruan tanda waqaf pada ayat 12',
                recap_file_id: 'recap-confidential-uuid',
                result: 'PASSED',
              },
            ],
          },
        ],
      }),
    },
    paymentRecord: {
      findFirst: async () => ({ status: 'VERIFIED' }),
    },
    officialDocument: {
      findFirst: async () => null,
      create: async ({ data }) => {
        createdSnapshot = data.content_snapshot;
        return { id: 'doc-stt-1', ...data };
      },
    },
    auditLog: {
      create: async () => ({ id: 'audit-1' }),
    },
  };

  prisma.$transaction = async (fn) => fn(mockTx);
  const adminUser = { id: 'usr-admin', roles: ['ADMIN_INTERNAL'], name: 'Admin Internal' };

  await createDocument(regId, { document_type: 'SURAT_TANDA_TASHIH' }, adminUser);

  assert.ok(createdSnapshot, 'content_snapshot dokumen harus terbentuk');
  assert.ok(Array.isArray(createdSnapshot.assignments), 'snapshot harus memiliki array assignments');
  assert.equal(createdSnapshot.assignments.length, 1);

  const snapshotAssignment = createdSnapshot.assignments[0];
  // Validasi sanitasi privasi mutlak:
  assert.equal(snapshotAssignment.assignee, undefined, 'Nama pentashih TIDAK BOLEH ada di snapshot!');
  assert.equal(snapshotAssignment.reviews, undefined, 'Review sidang dan recap_file_id TIDAK BOLEH ada di snapshot!');
  // Hanya metadata non-sensitif yang boleh ada:
  assert.equal(snapshotAssignment.stage, 'INITIAL');
  assert.equal(snapshotAssignment.iteration, 1);
  assert.equal(snapshotAssignment.status, 'COMPLETED');
  assert.ok(snapshotAssignment.due_at);
});

test('B17-06 (Updated B-19a): approveDistribution tidak lagi menyimpan comparison_notes pada content_snapshot surat pengembalian', async () => {
  const regId = 'reg-b17-06';
  let createdRevLetterSnapshot = null;

  const mockTx = {
    $queryRaw: async () => [{ id: regId }],
    registration: {
      findUnique: async () => ({
        id: regId,
        status: 'TASHIH_IN_PROGRESS',
        publisher_id: 'pub-1',
      }),
      update: async () => ({ id: regId }),
      updateMany: async () => ({ count: 1 }),
    },
    assignment: {
      findFirst: async () => ({ id: 'asg-round-2', iteration: 2, stage: 'REVISION' }),
      findMany: async () => [
        {
          id: 'asg-round-2',
          team_id: null,
          status: 'COMPLETED',
          reviews: [{ id: 'rev-2', result: 'REVISION_REQUIRED', recap_file_id: 'file-recap-2' }],
        },
      ],
      update: async () => ({ id: 'asg-round-2' }),
    },
    statusHistory: {
      create: async () => ({ id: 'sh-1' }),
    },
    physicalMasterIntake: {
      updateMany: async () => ({ count: 1 }),
    },
    officialDocument: {
      count: async () => 1, // Ronde sebelumnya sudah pernah ada surat pengembalian
      create: async ({ data }) => {
        createdRevLetterSnapshot = data.content_snapshot;
        return { id: 'doc-srv-2', ...data };
      },
    },
    publisher: {
      findUnique: async () => ({ user_id: 'usr-pub' }),
    },
    notification: {
      create: async () => ({ id: 'notif-1' }),
    },
    auditLog: {
      create: async () => ({ id: 'audit-1' }),
    },
  };

  prisma.$transaction = async (fn) => fn(mockTx);
  const distributorUser = { id: 'usr-dist', roles: ['DISTRIBUTOR'], name: 'Distributor 1' };

  // Berhasil tanpa comparison_notes
  await approveDistribution(regId, {
    result: 'REVISION_REQUIRED',
    notes: 'Perbaikan putaran kedua masih belum sempurna',
  }, distributorUser);

  assert.ok(createdRevLetterSnapshot);
  // Snapshot surat bersih dari comparison_notes (tidak bocor ke penerbit)
  assert.equal(createdRevLetterSnapshot.comparison_notes, undefined);
});

test('B17-07: recordReview mengizinkan perbaikan review lama jika recap_file_id sebelumnya kosong', async () => {
  const asgId = 'asg-legacy-1';
  let reviewUpdated = false;

  const mockTx = {
    $queryRaw: async () => [{ id: asgId }],
    registration: {
      findUnique: async () => ({
        id: 'reg-legacy-1',
        status: 'TASHIH_IN_PROGRESS',
      }),
    },
    assignment: {
      findUnique: async () => ({
        id: asgId,
        registration_id: 'reg-legacy-1',
        assignee_id: 'usr-pentashih-legacy',
        status: 'COMPLETED',
        reviews: [
          {
            id: 'rev-legacy-1',
            result: 'PASSED',
            notes: 'Hasil checklist lama tanpa berkas rekap',
            recap_file_id: null,
            recap_scope: 'SELF',
          },
        ],
        juz_items: [],
      }),
      update: async () => ({ id: asgId }),
    },
    storedFile: {
      findUnique: async () => ({
        id: 'new-valid-recap-file',
        file_size: 4096,
      }),
    },
    tashihReview: {
      update: async ({ where, data }) => {
        reviewUpdated = true;
        assert.equal(where.id, 'rev-legacy-1');
        assert.equal(data.recap_file_id, 'new-valid-recap-file');
        return { id: 'rev-legacy-1', ...data };
      },
    },
    auditLog: {
      create: async () => ({ id: 'audit-1' }),
    },
  };

  prisma.$transaction = async (fn) => fn(mockTx);
  const pentashihUser = { id: 'usr-pentashih-legacy', roles: ['PENTASHIH'], name: 'Pentashih Senior' };

  // Pentashih dapat melengkapi berkas rekap yang sebelumnya null
  const res = await recordReview(asgId, {
    result: 'PASSED',
    notes: 'Melengkapi berkas rekap resmi yang tertinggal',
    recap_file_id: 'new-valid-recap-file',
  }, pentashihUser);

  assert.ok(res);
  assert.equal(reviewUpdated, true);
});
