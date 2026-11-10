import test from 'node:test';
import assert from 'node:assert/strict';
import {
  createAssignments,
  assertReadyForSttEligibility,
  approveDistribution,
} from '../../src/services/distribution.service.js';
import { dispatchPhysical } from '../../src/services/registration.service.js';
import { prisma } from '../../src/config/database.js';

test('B16-01: Penerbit wajib mengunggah berkas rekap revisi saat submit pengiriman fisik revisi (titik a)', async () => {
  const regId = 'reg-rev-1';
  let upsertCalled = false;

  const mockTx = {
    $queryRaw: async () => [{ id: regId }],
    registration: {
      findUnique: async () => ({
        id: regId,
        status: 'REVISION_REQUIRED',
        publisher_id: 'pub-1',
      }),
      update: async ({ data }) => ({
        id: regId,
        status: 'REVISION_REQUIRED',
        ...data,
      }),
    },
    physicalMasterIntake: {
      findUnique: async () => ({ registration_id: regId, status: 'PENDING' }),
      upsert: async () => ({ id: 'intake-1' }),
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
        upsertCalled = true;
        assert.equal(create.round_number, 1);
        assert.equal(create.recap_file_id, 'recap-uuid-123');
        assert.equal(create.revision_kind, 'CORRECTION');
        return { id: 'prr-1', ...create };
      },
    },
    auditLog: {
      create: async () => ({ id: 'audit-1' }),
    },
  };

  prisma.$transaction = async (fn) => fn(mockTx);

  const publisherUser = { id: 'usr-pub', roles: ['PENERBIT'], publisherId: 'pub-1' };

  // 1. Ditolak jika recap_file_id kosong pada status REVISION_REQUIRED
  await assert.rejects(
    dispatchPhysical(regId, {
      courier: 'JNE',
      tracking_no: 'JNE123456',
      recap_file_id: null,
    }, publisherUser),
    (err) => err.statusCode === 400 && /rekapitulasi perbaikan/i.test(err.message)
  );

  // 2. Berhasil jika recap_file_id disertakan
  const res = await dispatchPhysical(regId, {
    courier: 'JNE',
    tracking_no: 'JNE123456',
    recap_file_id: 'recap-uuid-123',
  }, publisherUser);

  assert.equal(res.physical_dispatch_status, 'DISPATCHED');
  assert.equal(upsertCalled, true);
});

test('B16-02: Distributor ditolak menugaskan pentashih jika berkas rekap revisi penerbit belum ada (titik c)', async () => {
  const regId = 'reg-rev-assign';

  const mockTx = {
    $queryRaw: async () => [{ id: regId }],
    registration: {
      findUnique: async () => ({
        id: regId,
        status: 'WAITING_DISTRIBUTION',
        registration_type: 'NEW',
        service_type: { name: 'Mushaf Standar' },
        core_team_number: 1,
        core_distributor_id: 'usr-dist',
      }),
    },
    paymentRecord: {
      findFirst: async () => ({ id: 'pay-1', status: 'VERIFIED' }),
    },
    assignment: {
      findFirst: async () => ({ id: 'asg-prev', iteration: 1, stage: 'INITIAL' }),
    },
    officialDocument: {
      findFirst: async () => ({
        document_type: 'REVISION_RETURN_LETTER',
        version: 1,
        content_snapshot: { revision_round: 1, revision_kind: 'NASKAH_PERBAIKAN' },
      }),
    },
    publisherRevisionRecap: {
      findUnique: async () => null, // Belum diunggah oleh penerbit
    },
  };

  prisma.$transaction = async (fn) => fn(mockTx);

  const distributorUser = { id: 'usr-dist', roles: ['DISTRIBUTOR'], name: 'Distributor 1' };

  await assert.rejects(
    createAssignments(regId, {
      stage: 'REVISION',
      juz_assignments: [
        { team_id: null, assignee_id: '11111111-1111-4111-8111-111111111111', juz_numbers: [1] },
      ],
    }, distributorUser),
    (err) => err.statusCode === 409 && /belum mengunggah dokumen rekapitulasi/i.test(err.message)
  );
});

test('B16-03: Putusan PASSED pada Tashih Awal (stage: INITIAL) mengalihkan status ke REVISION_REQUIRED dengan revision_kind: NASKAH_DUMI, bukan READY_FOR_STT', async () => {
  const regId = 'reg-init-pass';
  let movedStatus = null;
  let createdDocType = null;
  let createdRevisionKind = null;

  const mockTx = {
    $queryRaw: async () => [{ id: regId }],
    registration: {
      findUnique: async () => ({
        id: regId,
        status: 'TASHIH_IN_PROGRESS',
        publisher_id: 'pub-1',
        title: 'Mushaf Al-Baqarah',
      }),
      update: async () => ({ id: regId }),
      updateMany: async () => ({ count: 1 }),
    },
    physicalMasterIntake: {
      updateMany: async () => ({ count: 1 }),
    },
    assignment: {
      findFirst: async () => ({ id: 'asg-1', iteration: 1, stage: 'INITIAL' }),
      findMany: async () => [
        {
          id: 'asg-1',
          team_id: null,
          status: 'COMPLETED',
          reviews: [{ result: 'PASSED', recap_file_id: 'recap-uuid-1', recap_scope: 'SELF' }],
        },
      ],
      update: async () => ({ id: 'asg-1' }),
    },
    statusHistory: {
      create: async ({ data }) => {
        movedStatus = data.to_status;
        return { id: 'sh-1' };
      },
    },
    officialDocument: {
      count: async () => 0,
      create: async ({ data }) => {
        createdDocType = data.document_type;
        createdRevisionKind = data.content_snapshot?.revision_kind;
        return { id: 'doc-1' };
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

  await approveDistribution(regId, {
    result: 'PASSED',
    notes: 'Seluruh naskah lulus bersih pada tashih awal.',
  }, distributorUser);

  // Wajib dialihkan ke tahap dumi cetak fisik, tidak boleh langsung ke READY_FOR_STT
  assert.equal(movedStatus, 'REVISION_REQUIRED');
  assert.equal(createdDocType, 'REVISION_RETURN_LETTER');
  assert.equal(createdRevisionKind, 'NASKAH_DUMI');
});

test('B16-04: Transisi ke READY_FOR_STT ditolak jika naskah belum melalui tahap DUMMY (penegakan assertReadyForSttEligibility)', async () => {
  const mockTx = {
    assignment: {
      findFirst: async () => ({ id: 'asg-1', iteration: 1, stage: 'INITIAL' }), // Bukan DUMMY
    },
  };

  await assert.rejects(
    assertReadyForSttEligibility(mockTx, 'reg-not-dummy'),
    (err) => err.statusCode === 409 && /belum melalui dan lulus tahap verifikasi naskah dumi fisik/i.test(err.message)
  );
});

test('B16-05: Transisi ke READY_FOR_STT berhasil ketika berada pada tahap DUMMY dengan seluruh putusan PASSED', async () => {
  const regId = 'reg-dummy-pass';
  let movedStatus = null;

  const mockTx = {
    $queryRaw: async () => [{ id: regId }],
    registration: {
      findUnique: async () => ({
        id: regId,
        status: 'TASHIH_IN_PROGRESS',
        publisher_id: 'pub-1',
        title: 'Mushaf Dumi Akhir',
      }),
      update: async () => ({ id: regId }),
      updateMany: async () => ({ count: 1 }),
    },
    assignment: {
      findFirst: async () => ({ id: 'asg-dummy', iteration: 2, stage: 'DUMMY' }),
      findMany: async () => [
        {
          id: 'asg-dummy',
          team_id: null,
          status: 'COMPLETED',
          reviews: [{ result: 'PASSED', recap_file_id: 'recap-dummy-uuid', recap_scope: 'SELF' }],
        },
      ],
      update: async () => ({ id: 'asg-dummy' }),
    },
    statusHistory: {
      create: async ({ data }) => {
        movedStatus = data.to_status;
        return { id: 'sh-1' };
      },
    },
    user: {
      findMany: async () => [],
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

  await approveDistribution(regId, {
    result: 'PASSED',
    notes: 'Sampel naskah dumi cetak disetujui, siap terbit STT.',
  }, distributorUser);

  // Hanya tahap DUMMY yang berhak beralih ke READY_FOR_STT
  assert.equal(movedStatus, 'READY_FOR_STT');
});
