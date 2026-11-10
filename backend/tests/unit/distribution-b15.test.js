import test from 'node:test';
import assert from 'node:assert/strict';
import {
  createAssignments,
  recordReview,
  recordJuzChecklist,
  assertReadyForSttEligibility,
  approveDistribution,
} from '../../src/services/distribution.service.js';
import { assignmentSchema, reviewSchema } from '../../src/validators/workflow.validator.js';
import { prisma } from '../../src/config/database.js';

test('B15-01: Penugasan batch campuran (Tim A juz 1-15 + Individu B juz 16-30) tervalidasi skema dan menutup 30 juz penuh', async () => {
  const payload = {
    stage: 'INITIAL',
    juz_assignments: [
      { team_id: 'team-uuid-a', assignee_id: '11111111-1111-4111-8111-111111111111', juz_numbers: Array.from({ length: 15 }, (_, i) => i + 1) },
      { team_id: 'team-uuid-a', assignee_id: '22222222-2222-4222-8222-222222222222', juz_numbers: Array.from({ length: 15 }, (_, i) => i + 1) },
      { team_id: null, assignee_id: '33333333-3333-4333-8333-333333333333', juz_numbers: Array.from({ length: 15 }, (_, i) => i + 16) },
    ],
  };

  const parsed = assignmentSchema.body.safeParse(payload);
  assert.equal(parsed.success, true);

  const createdAssignments = [];
  const mockTx = {
    $queryRaw: async () => [{ id: 'reg-30juz' }],
    registration: {
      findUnique: async () => ({
        id: 'reg-30juz',
        status: 'WAITING_DISTRIBUTION',
        registration_type: 'NEW',
        service_type: { name: 'Pentashihan Mushaf Standar Indonesia 30 Juz' },
        fee_sla_snapshot: { sla_initial_days: 15 },
      }),
      update: async () => ({ id: 'reg-30juz', status: 'TASHIH_IN_PROGRESS' }),
      updateMany: async () => ({ count: 1 }),
    },
    statusHistory: {
      create: async () => ({ id: 'sh-1' }),
    },
    paymentRecord: {
      findFirst: async () => ({ id: 'pay-1', status: 'VERIFIED', verified_at: new Date() }),
    },
    assignment: {
      findFirst: async () => null,
      findMany: async () => [],
      create: async ({ data }) => {
        const item = { id: `asg-${createdAssignments.length + 1}`, ...data };
        createdAssignments.push(item);
        return item;
      },
    },
    distributionTeam: {
      findUnique: async ({ where: { id } }) => ({
        id,
        status: 'ACTIVE',
        active_from: new Date(Date.now() - 86400000),
        active_to: null,
        members: [
          { user_id: '11111111-1111-4111-8111-111111111111', status: 'ACTIVE', user: { status: 'ACTIVE', roles: [{ role: { code: 'PENTASHIH' } }] } },
          { user_id: '22222222-2222-4222-8222-222222222222', status: 'ACTIVE', user: { status: 'ACTIVE', roles: [{ role: { code: 'PENTASHIH' } }] } },
        ],
      }),
    },
    user: {
      findFirst: async ({ where: { id } }) => ({
        id,
        status: 'ACTIVE',
        roles: [{ role: { code: 'PENTASHIH' } }],
      }),
    },
    teamMember: {
      findFirst: async () => null,
    },
    physicalManuscriptHandover: {
      findFirst: async () => ({ tashih_due_at: new Date(Date.now() + 86400000 * 15) }),
    },
    officialDocument: {
      findFirst: async () => null,
    },
    auditLog: {
      create: async () => ({ id: 'audit-1' }),
    },
    notification: {
      create: async () => ({ id: 'notif-1' }),
    },
  };

  prisma.$transaction = async (fn) => fn(mockTx);

  const user = { id: 'usr-admin', name: 'Admin', roles: ['ADMIN_INTERNAL'] };
  const res = await createAssignments('reg-30juz', payload, user);
  assert.equal(res.length, 3);
  assert.equal(res[0].team_id, 'team-uuid-a');
  assert.equal(res[1].team_id, 'team-uuid-a');
  assert.equal(res[2].team_id, null);
});

test('B15-02: Anggota tim mengunggah rekap dengan scope TEAM menggugurkan kewajiban unggah anggota lain di tim yang sama', async () => {
  const updatedAssignments = [];
  const mockTx = {
    $queryRaw: async () => [{ id: 'reg-team' }],
    assignment: {
      findUnique: async () => ({
        id: 'asg-member-1',
        registration_id: 'reg-team',
        team_id: 'team-uuid-a',
        assignee_id: 'usr-pentashih-1',
        stage: 'INITIAL',
        iteration: 1,
        status: 'ASSIGNED',
        reviews: [],
        juz_items: [],
      }),
      update: async ({ where: { id }, data }) => {
        updatedAssignments.push({ id, ...data });
        return { id, ...data };
      },
      updateMany: async ({ where, data }) => {
        updatedAssignments.push({ where, ...data });
        return { count: 1 };
      },
    },
    registration: {
      findUnique: async () => ({ id: 'reg-team', status: 'TASHIH_IN_PROGRESS' }),
    },
    storedFile: {
      findUnique: async () => ({ id: 'file-recap-uuid', original_name: 'rekap-tim.pdf' }),
    },
    tashihReview: {
      create: async ({ data }) => ({ id: 'rev-team-1', ...data }),
    },
    auditLog: {
      create: async () => ({ id: 'audit-1' }),
    },
  };

  prisma.$transaction = async (fn) => fn(mockTx);

  const user = { id: 'usr-pentashih-1', name: 'Pentashih 1', roles: ['PENTASHIH'] };
  const reviewResult = await recordReview('asg-member-1', {
    result: 'PASSED',
    notes: 'Hasil tashih tuntas dan bersih untuk kelompok A.',
    recap_file_id: 'file-recap-uuid',
    recap_scope: 'TEAM',
  }, user);

  assert.equal(reviewResult.recap_scope, 'TEAM');
  assert.equal(reviewResult.result, 'PASSED');

  const teamUpdate = updatedAssignments.find(u => u.where && u.where.team_id === 'team-uuid-a' && u.status === 'COMPLETED');
  assert.ok(teamUpdate, 'Penugasan anggota kelompok lain harus ditandai COMPLETED saat salah satu mengunggah rekap TEAM');
});

test('B15-03: Anggota tim mengunggah rekap dengan scope SELF mewajibkan anggota lain tetap mengunggah rekap', async () => {
  const updatedAssignments = [];
  const mockTx = {
    $queryRaw: async () => [{ id: 'reg-team' }],
    assignment: {
      findUnique: async () => ({
        id: 'asg-member-1',
        registration_id: 'reg-team',
        team_id: 'team-uuid-a',
        assignee_id: 'usr-pentashih-1',
        stage: 'INITIAL',
        iteration: 1,
        status: 'ASSIGNED',
        reviews: [],
        juz_items: [],
      }),
      update: async ({ where: { id }, data }) => {
        updatedAssignments.push({ id, ...data });
        return { id, ...data };
      },
      updateMany: async ({ where, data }) => {
        updatedAssignments.push({ where, ...data });
        return { count: 0 };
      },
    },
    registration: {
      findUnique: async () => ({ id: 'reg-team', status: 'TASHIH_IN_PROGRESS' }),
    },
    storedFile: {
      findUnique: async () => ({ id: 'file-recap-uuid', original_name: 'rekap-pribadi.pdf' }),
    },
    tashihReview: {
      create: async ({ data }) => ({ id: 'rev-self-1', ...data }),
    },
    auditLog: {
      create: async () => ({ id: 'audit-1' }),
    },
  };

  prisma.$transaction = async (fn) => fn(mockTx);

  const user = { id: 'usr-pentashih-1', name: 'Pentashih 1', roles: ['PENTASHIH'] };
  const reviewResult = await recordReview('asg-member-1', {
    result: 'PASSED',
    notes: 'Hasil tashih pribadi juz 1 s.d. 5.',
    recap_file_id: 'file-recap-uuid',
    recap_scope: 'SELF',
  }, user);

  assert.equal(reviewResult.recap_scope, 'SELF');
  const teamUpdate = updatedAssignments.find(u => u.where && u.where.team_id === 'team-uuid-a');
  assert.equal(teamUpdate, undefined, 'Penugasan anggota tim lain tidak boleh otomatis COMPLETED bila scope SELF');
});

test('B15-04: Pentashih individu mandiri tidak dapat memilih scope TEAM (otomatis SELF)', async () => {
  const mockTx = {
    $queryRaw: async () => [{ id: 'reg-indiv' }],
    assignment: {
      findUnique: async () => ({
        id: 'asg-individual-1',
        registration_id: 'reg-indiv',
        team_id: null,
        assignee_id: 'usr-pentashih-indiv',
        stage: 'INITIAL',
        iteration: 1,
        status: 'ASSIGNED',
        reviews: [],
        juz_items: [],
      }),
      update: async ({ where: { id }, data }) => ({ id, ...data }),
    },
    registration: {
      findUnique: async () => ({ id: 'reg-indiv', status: 'TASHIH_IN_PROGRESS' }),
    },
    storedFile: {
      findUnique: async () => ({ id: 'file-recap-uuid', original_name: 'rekap-indiv.pdf' }),
    },
    tashihReview: {
      create: async ({ data }) => ({ id: 'rev-indiv-1', ...data }),
    },
    auditLog: {
      create: async () => ({ id: 'audit-1' }),
    },
  };

  prisma.$transaction = async (fn) => fn(mockTx);

  const user = { id: 'usr-pentashih-indiv', name: 'Pentashih Mandiri', roles: ['PENTASHIH'] };
  const reviewResult = await recordReview('asg-individual-1', {
    result: 'PASSED',
    notes: 'Hasil tashih individu.',
    recap_file_id: 'file-recap-uuid',
    recap_scope: 'TEAM',
  }, user);

  assert.equal(reviewResult.recap_scope, 'SELF', 'Individu mandiri wajib otomatis dipaksa ke scope SELF');
});

test('B15-05: Jika satu pentashih memutuskan REVISION_REQUIRED, distributor ditolak meloloskan STT (dipaksa revisi)', async () => {
  const mockTx = {
    $queryRaw: async () => [{ id: 'reg-stt' }],
    registration: {
      findUnique: async () => ({
        id: 'reg-stt',
        status: 'TASHIH_IN_PROGRESS',
        publisher: { legal_name: 'PT Mushaf Utama' },
      }),
    },
    assignment: {
      findFirst: async () => ({ id: 'asg-1', iteration: 1 }),
      findMany: async () => [
        { id: 'asg-1', team_id: 'team-1', status: 'COMPLETED', reviews: [{ result: 'PASSED', recap_file_id: 'recap-1', recap_scope: 'TEAM' }] },
        { id: 'asg-2', team_id: null, status: 'COMPLETED', reviews: [{ result: 'REVISION_REQUIRED', recap_file_id: 'recap-2', recap_scope: 'SELF' }] },
      ],
    },
  };

  prisma.$transaction = async (fn) => fn(mockTx);

  const distributorUser = { id: 'usr-dist', name: 'Distributor', roles: ['DISTRIBUTOR'] };

  await assert.rejects(
    approveDistribution('reg-stt', { result: 'PASSED', notes: 'Loloskan naskah' }, distributorUser),
    (err) => err.statusCode === 409 && /perlu perbaikan/i.test(err.message)
  );
});

test('B15-06: Endpoint reviu pentashih menolak pengiriman tanpa berkas rekap', async () => {
  const mockTx = {
    $queryRaw: async () => [{ id: 'reg-1' }],
    assignment: {
      findUnique: async () => ({
        id: 'asg-1',
        registration_id: 'reg-1',
        assignee_id: 'usr-pentashih',
        reviews: [],
      }),
    },
    registration: {
      findUnique: async () => ({ id: 'reg-1', status: 'TASHIH_IN_PROGRESS' }),
    },
  };

  prisma.$transaction = async (fn) => fn(mockTx);

  const user = { id: 'usr-pentashih', name: 'Pentashih', roles: ['PENTASHIH'] };

  await assert.rejects(
    recordReview('asg-1', { result: 'PASSED', notes: 'Selesai tanpa rekap', recap_file_id: null }, user),
    (err) => err.statusCode === 400 && /dokumen rekap/i.test(err.message)
  );
});

test('B15-07: Endpoint recordJuzChecklist mengembalikan 410 (dialihkan ke dokumen rekap & lembar telaah)', async () => {
  const user = { id: 'usr-pentashih', name: 'Pentashih', roles: ['PENTASHIH'] };

  prisma.$transaction = async (fn) => fn({});

  await assert.rejects(
    recordJuzChecklist('asg-1', 1, { result: 'PASSED' }, user),
    (err) => err.statusCode === 410 && /dialihkan/i.test(err.message)
  );
});
