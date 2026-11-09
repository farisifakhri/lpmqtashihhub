import test from 'node:test';
import assert from 'node:assert/strict';
import {
  revokeAssignment,
  recordReview,
  approveDistribution,
  assertDistributionReviewCompleteness,
} from '../../src/services/distribution.service.js';
import { revokePentashihAssignmentSchema } from '../../src/validators/workflow.validator.js';
import { prisma } from '../../src/config/database.js';

test('B19B-01: Pencabutan penugasan aktif berhasil mencatat status REVOKED, alasan, waktu, dan aktor', async () => {
  const asgId = 'asg-active-1';
  let updatedData = null;
  let auditRecorded = false;

  const mockTx = {
    $queryRaw: async () => [{ id: asgId }],
    assignment: {
      findUnique: async () => ({
        id: asgId,
        registration_id: 'reg-1',
        assignee_id: 'usr-pentashih-1',
        status: 'ASSIGNED',
        registration: {
          id: 'reg-1',
          status: 'TASHIH_IN_PROGRESS',
          registration_no: 'REG-2026-001',
          title: 'Mushaf Standar',
        },
        assignee: { id: 'usr-pentashih-1', name: 'Ahmad Pentashih' },
        juz_items: [{ juz_number: 1 }, { juz_number: 2 }],
      }),
      update: async ({ where, data }) => {
        updatedData = data;
        return { id: where.id, ...data };
      },
    },
    auditLog: {
      create: async () => {
        auditRecorded = true;
        return { id: 'audit-1' };
      },
    },
    notification: {
      create: async () => ({ id: 'notif-1' }),
    },
  };

  prisma.$transaction = async (fn) => fn(mockTx);
  const distributorUser = { id: 'usr-dist', roles: ['DISTRIBUTOR'], name: 'Distributor 1' };

  const res = await revokeAssignment(asgId, {
    reason: 'Petugas mengambil cuti melahirkan selama 3 bulan.',
  }, distributorUser);

  assert.ok(res.success);
  assert.equal(updatedData.status, 'REVOKED');
  assert.equal(updatedData.revocation_reason, 'Petugas mengambil cuti melahirkan selama 3 bulan.');
  assert.equal(updatedData.revoked_by_id, 'usr-dist');
  assert.ok(updatedData.revoked_at instanceof Date);
  assert.equal(auditRecorded, true);
});

test('B19B-02: Pencabutan penugasan berstatus COMPLETED atau REVOKED ditolak (409)', async () => {
  const asgId = 'asg-completed-1';

  const mockTx = {
    assignment: {
      findUnique: async () => ({
        id: asgId,
        registration_id: 'reg-1',
        assignee_id: 'usr-pentashih-1',
        status: 'COMPLETED',
        registration: { id: 'reg-1', status: 'TASHIH_IN_PROGRESS' },
        assignee: { id: 'usr-pentashih-1', name: 'Ahmad Pentashih' },
      }),
    },
  };

  prisma.$transaction = async (fn) => fn(mockTx);
  const adminUser = { id: 'usr-admin', roles: ['ADMIN_INTERNAL'] };

  // 1. Tolak jika status COMPLETED
  await assert.rejects(
    revokeAssignment(asgId, { reason: 'Ingin mencabut tugas yang sudah selesai' }, adminUser),
    (err) => err.statusCode === 409 && /sudah selesai dan tidak dapat dicabut/i.test(err.message)
  );

  // 2. Tolak jika sudah REVOKED
  mockTx.assignment.findUnique = async () => ({
    id: asgId,
    registration_id: 'reg-1',
    status: 'REVOKED',
    registration: { id: 'reg-1', status: 'TASHIH_IN_PROGRESS' },
  });

  await assert.rejects(
    revokeAssignment(asgId, { reason: 'Pencabutan ganda' }, adminUser),
    (err) => err.statusCode === 409 && /sudah dicabut sebelumnya/i.test(err.message)
  );
});

test('B19B-03: Validator skema revokePentashihAssignmentSchema menolak alasan kosong atau kurang dari 5 karakter', () => {
  // Kurang dari 5 karakter
  const parseShort = revokePentashihAssignmentSchema.body.safeParse({ reason: 'Skt' });
  assert.equal(parseShort.success, false);

  // Alasan hanya spasi
  const parseWhitespace = revokePentashihAssignmentSchema.body.safeParse({ reason: '    ' });
  assert.equal(parseWhitespace.success, false);

  // Alasan valid >= 5 karakter
  const parseValid = revokePentashihAssignmentSchema.body.safeParse({ reason: 'Sakit keras rawat inap' });
  assert.equal(parseValid.success, true);
});

test('B19B-04: Pentashih yang telah dicabut (REVOKED) diblokir saat mencoba recordReview (409)', async () => {
  const asgId = 'asg-revoked-1';

  const mockTx = {
    $queryRaw: async () => [{ id: 'reg-1' }],
    registration: {
      findUnique: async () => ({
        id: 'reg-1',
        status: 'TASHIH_IN_PROGRESS',
      }),
    },
    assignment: {
      findUnique: async () => ({
        id: asgId,
        registration_id: 'reg-1',
        assignee_id: 'usr-p-1',
        status: 'REVOKED',
        reviews: [],
        juz_items: [{ juz_number: 1 }],
      }),
    },
  };

  prisma.$transaction = async (fn) => fn(mockTx);
  const pentashihUser = { id: 'usr-p-1', roles: ['PENTASHIH'] };

  await assert.rejects(
    recordReview(asgId, {
      result: 'PASSED',
      notes: 'Mencoba kirim review walau penugasan sudah dicabut',
      recap_file_id: 'c8f77372-87c2-463d-b4b1-84c164a27521',
    }, pentashihUser),
    (err) => err.statusCode === 409 && /telah dicabut sehingga tidak dapat lagi menerima atau mengubah hasil sidang/i.test(err.message)
  );
});

test('B19B-05: assertDistributionReviewCompleteness menolak putusan jika seluruh penugasan dicabut (activeAssignments kosong)', () => {
  const assignments = [
    {
      id: 'asg-1',
      team_id: null,
      status: 'REVOKED',
      reviews: [],
      juz_items: [{ juz_number: 1 }],
    },
    {
      id: 'asg-2',
      team_id: null,
      status: 'REVOKED',
      reviews: [],
      juz_items: [{ juz_number: 2 }],
    },
  ];

  assert.throws(
    () => assertDistributionReviewCompleteness(assignments, { requireAllPassed: true }),
    (err) => err.statusCode === 409 && /Seluruh penugasan pada iterasi ini telah dicabut/i.test(err.message)
  );
});

test('B19B-06: assertDistributionReviewCompleteness menolak jika pentashih individual dicabut dan juz miliknya belum ditelaah pengganti', () => {
  // Skenario: Naskah 30 Juz. Pentashih A pegang Juz 1-15 (dicabut/REVOKED).
  // Pentashih B pegang Juz 16-30 (selesai/COMPLETED).
  const assignments = [
    {
      id: 'asg-a',
      team_id: null,
      status: 'REVOKED',
      reviews: [],
      juz_items: Array.from({ length: 15 }, (_, i) => ({ juz_number: i + 1 })), // Juz 1-15
    },
    {
      id: 'asg-b',
      team_id: null,
      status: 'COMPLETED',
      reviews: [{ id: 'rev-b', result: 'PASSED', recap_file_id: 'file-b' }],
      juz_items: Array.from({ length: 15 }, (_, i) => ({ juz_number: i + 16 })), // Juz 16-30
    },
  ];

  assert.throws(
    () => assertDistributionReviewCompleteness(assignments, { requireAllPassed: true }),
    (err) => {
      return err.statusCode === 409 &&
        /Keputusan sidang belum dapat disimpan karena ada juz/i.test(err.message) &&
        /Juz 1/i.test(err.message) &&
        /belum diselesaikan oleh pentashih pengganti/i.test(err.message);
    }
  );
});

test('B19B-07: assertDistributionReviewCompleteness berhasil jika pentashih pengganti menyelesaikan juz yang dicabut', () => {
  // Pentashih A pegang Juz 1-15 (REVOKED).
  // Pentashih B pegang Juz 16-30 (COMPLETED).
  // Pentashih C (Pengganti) pegang Juz 1-15 (COMPLETED).
  const assignments = [
    {
      id: 'asg-a',
      team_id: null,
      status: 'REVOKED',
      reviews: [],
      juz_items: Array.from({ length: 15 }, (_, i) => ({ juz_number: i + 1 })),
    },
    {
      id: 'asg-b',
      team_id: null,
      status: 'COMPLETED',
      reviews: [{ id: 'rev-b', result: 'PASSED', recap_file_id: 'file-b' }],
      juz_items: Array.from({ length: 15 }, (_, i) => ({ juz_number: i + 16 })),
    },
    {
      id: 'asg-c',
      team_id: null,
      status: 'COMPLETED',
      reviews: [{ id: 'rev-c', result: 'PASSED', recap_file_id: 'file-c' }],
      juz_items: Array.from({ length: 15 }, (_, i) => ({ juz_number: i + 1 })),
    },
  ];

  assert.doesNotThrow(() => {
    assertDistributionReviewCompleteness(assignments, { requireAllPassed: true });
  });
});

test('B19B-08: Pada unit kelompok, pencabutan 1 anggota tetap lolos jika anggota lain mengesahkan rekap kelompok (TEAM scope)', () => {
  // Tim 1 memiliki 3 anggota: A, B, C (masing-masing memegang Juz 1-30).
  // C dicabut (REVOKED).
  // A mengunggah rekapitulasi scope TEAM (COMPLETED).
  // B ditandai COMPLETED oleh rekap tim.
  const assignments = [
    {
      id: 'asg-team-a',
      team_id: 'team-1',
      status: 'COMPLETED',
      reviews: [{ id: 'rev-a', result: 'PASSED', recap_scope: 'TEAM', recap_file_id: 'recap-team-file' }],
      juz_items: Array.from({ length: 30 }, (_, i) => ({ juz_number: i + 1 })),
    },
    {
      id: 'asg-team-b',
      team_id: 'team-1',
      status: 'COMPLETED',
      reviews: [{ id: 'rev-b', result: 'PASSED', recap_scope: 'SELF', recap_file_id: 'recap-team-file' }],
      juz_items: Array.from({ length: 30 }, (_, i) => ({ juz_number: i + 1 })),
    },
    {
      id: 'asg-team-c',
      team_id: 'team-1',
      status: 'REVOKED',
      reviews: [],
      juz_items: Array.from({ length: 30 }, (_, i) => ({ juz_number: i + 1 })),
    },
  ];

  assert.doesNotThrow(() => {
    assertDistributionReviewCompleteness(assignments, { requireAllPassed: true });
  });
});

test('B19B-09: Naskah non-30 juz (misal 5 juz: Juz 26-30): validasi cakupan juz dinamis bekerja tanpa asumsi 30 juz', () => {
  // Penugasan awal untuk Juz 26-30 (5 juz).
  // Pentashih A pegang Juz 26-27 (REVOKED).
  // Pentashih B pegang Juz 28-30 (COMPLETED).
  const assignmentsIncomplete = [
    {
      id: 'asg-non30-a',
      team_id: null,
      status: 'REVOKED',
      reviews: [],
      juz_items: [{ juz_number: 26 }, { juz_number: 27 }],
    },
    {
      id: 'asg-non30-b',
      team_id: null,
      status: 'COMPLETED',
      reviews: [{ id: 'rev-b', result: 'PASSED', recap_file_id: 'file-b' }],
      juz_items: [{ juz_number: 28 }, { juz_number: 29 }, { juz_number: 30 }],
    },
  ];

  // 1. Menolak karena Juz 26 & 27 belum ditutup pengganti (bukan menolak karena kurang 1..25!)
  assert.throws(
    () => assertDistributionReviewCompleteness(assignmentsIncomplete, { requireAllPassed: true }),
    (err) => err.statusCode === 409 && /Juz 26, Juz 27/i.test(err.message)
  );

  // 2. Lolos saat pengganti Juz 26 & 27 selesai
  const assignmentsComplete = [
    ...assignmentsIncomplete,
    {
      id: 'asg-non30-c',
      team_id: null,
      status: 'COMPLETED',
      reviews: [{ id: 'rev-c', result: 'PASSED', recap_file_id: 'file-c' }],
      juz_items: [{ juz_number: 26 }, { juz_number: 27 }],
    },
  ];

  assert.doesNotThrow(() => {
    assertDistributionReviewCompleteness(assignmentsComplete, { requireAllPassed: true });
  });
});
