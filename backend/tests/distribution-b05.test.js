import test from 'node:test';
import assert from 'node:assert/strict';
import { assignmentSchema } from '../src/validators/workflow.validator.js';
import { createAssignments } from '../src/services/distribution.service.js';
import { getPentashihCandidates } from '../src/services/master.service.js';
import { prisma } from '../src/config/database.js';

test('B-05: assignmentSchema allows optional team_id and validates juz assignments', () => {
  const validWithoutTeam = assignmentSchema.body.safeParse({
    stage: 'INITIAL',
    juz_assignments: [
      { assignee_id: 'a0000000-0000-0000-0000-000000000001', juz_numbers: [1, 2, 3] },
      { assignee_id: 'a0000000-0000-0000-0000-000000000002', juz_numbers: [4, 5, 6] },
    ],
  });
  assert.ok(validWithoutTeam.success, 'Harus sukses tanpa team_id eksplisit');

  const validWithReason = assignmentSchema.body.safeParse({
    team_id: 'team-1',
    stage: 'INITIAL',
    reassignment_reason: 'ROTASI_TUGAS',
    reassignment_notes: 'Penyesuaian giliran penugasan',
    juz_assignments: [
      { assignee_id: 'a0000000-0000-0000-0000-000000000001', juz_numbers: [1] },
    ],
  });
  assert.ok(validWithReason.success, 'Harus menerima alasan pergantian generik');

  const duplicateJuz = assignmentSchema.body.safeParse({
    stage: 'INITIAL',
    juz_assignments: [
      { assignee_id: 'a0000000-0000-0000-0000-000000000001', juz_numbers: [1, 2] },
      { assignee_id: 'a0000000-0000-0000-0000-000000000002', juz_numbers: [2, 3] },
    ],
  });
  assert.equal(duplicateJuz.success, false, 'Harus menolak duplikasi juz lintas pentashih jika allow_overlap tidak diaktifkan');
});

test('B-05: createAssignments enforces complete 30-juz coverage for 30 Juz manuscripts', async () => {
  const originalTx = prisma.$transaction;

  try {
    prisma.$transaction = async (callback) => {
      const mockTx = {
        $queryRaw: async () => [],
        registration: {
          findUnique: async () => ({
            id: 'reg-30',
            status: 'WAITING_DISTRIBUTION',
            registration_type: 'NEW',
            service_type: { name: 'Mushaf Al-Qur\x27an 30 Juz' },
            fee_sla_snapshot: { sla_initial_days: 15 },
          }),
        },
        paymentRecord: {
          findFirst: async () => ({ id: 'pay-1', status: 'VERIFIED', verified_at: new Date() }),
        },
        assignment: {
          findFirst: async () => null,
          findMany: async () => [],
        },
        officialDocument: {
          findFirst: async () => null,
        },
        distributionTeam: {
          findUnique: async () => null,
        },
        user: {
          findFirst: async () => ({ id: 'user-1', status: 'ACTIVE' }),
        },
        physicalManuscriptHandover: {
          findFirst: async () => ({ status: 'RECEIVED', tashih_due_at: new Date(Date.now() + 864000000) }),
        },
      };
      return callback(mockTx);
    };

    // Hanya mengisi juz 1..20, juz 21..30 kosong -> harus ditolak
    await assert.rejects(
      () => createAssignments(
        'reg-30',
        {
          stage: 'INITIAL',
          juz_assignments: [
            {
              assignee_id: 'a0000000-0000-0000-0000-000000000001',
              juz_numbers: Array.from({ length: 20 }, (_, i) => i + 1), // 1..20
            },
          ],
        },
        { id: 'admin-1', roles: ['ADMIN_INTERNAL'] }
      ),
      (err) => {
        assert.equal(err.statusCode, 400);
        assert.ok(err.message.includes('Penjatahan juz belum lengkap'));
        assert.ok(err.message.includes('21, 22'));
        return true;
      }
    );
  } finally {
    prisma.$transaction = originalTx;
  }
});

test('B-05: createAssignments succeeds with flexible combination covering 1..30 juz', async () => {
  const originalTx = prisma.$transaction;
  const createdAssignments = [];
  let moveCalled = false;

  try {
    prisma.$transaction = async (callback) => {
      const mockTx = {
        $queryRaw: async () => [],
        registration: {
          findUnique: async () => ({
            id: 'reg-30',
            status: 'WAITING_DISTRIBUTION',
            registration_type: 'NEW',
            service_type: { name: 'Mushaf Al-Qur\x27an 30 Juz' },
            fee_sla_snapshot: { sla_initial_days: 15 },
          }),
          update: async () => {
            moveCalled = true;
          },
          updateMany: async () => {
            moveCalled = true;
            return { count: 1 };
          },
        },
        paymentRecord: {
          findFirst: async () => ({ id: 'pay-1', status: 'VERIFIED', verified_at: new Date() }),
        },
        assignment: {
          findFirst: async () => null,
          findMany: async () => [],
          create: async ({ data }) => {
            const row = { id: `assign-${createdAssignments.length + 1}`, ...data };
            createdAssignments.push(row);
            return row;
          },
        },
        officialDocument: {
          findFirst: async () => null,
        },
        distributionTeam: {
          findUnique: async () => null,
        },
        teamMember: {
          findFirst: async () => ({ team_id: 'team-auto' }),
        },
        user: {
          findFirst: async () => ({ id: 'pentashih-active', status: 'ACTIVE' }),
        },
        workingDay: {
          findMany: async () => [],
        },
        physicalManuscriptHandover: {
          findFirst: async () => ({ status: 'RECEIVED', tashih_due_at: new Date(Date.now() + 864000000) }),
        },
        auditLog: {
          create: async () => ({}),
        },
        statusHistory: {
          create: async () => ({}),
        },
        notification: {
          create: async () => ({}),
        },
      };
      return callback(mockTx);
    };

    const res = await createAssignments(
      'reg-30',
      {
        stage: 'INITIAL',
        juz_assignments: [
          {
            assignee_id: 'a0000000-0000-0000-0000-000000000001',
            juz_numbers: Array.from({ length: 20 }, (_, i) => i + 1), // Juz 1..20
          },
          {
            assignee_id: 'a0000000-0000-0000-0000-000000000002',
            juz_numbers: Array.from({ length: 10 }, (_, i) => i + 21), // Juz 21..30
          },
        ],
      },
      { id: 'admin-1', roles: ['ADMIN_INTERNAL'] }
    );

    assert.equal(res.length, 2);
    assert.equal(createdAssignments.length, 2);
    assert.equal(createdAssignments[0].assignee_id, 'a0000000-0000-0000-0000-000000000001');
    assert.equal(createdAssignments[1].assignee_id, 'a0000000-0000-0000-0000-000000000002');
    assert.ok(moveCalled);
  } finally {
    prisma.$transaction = originalTx;
  }
});

test('B-05: getPentashihCandidates returns searchable candidates with active workload', async () => {
  const originalFindMany = prisma.user.findMany;

  try {
    let capturedQuery = null;
    prisma.user.findMany = async (args) => {
      capturedQuery = args;
      return [
        {
          id: 'u-1',
          name: 'Deni Hudaeny',
          nip: '197907272002121008',
          email: 'deni@example.com',
          status: 'ACTIVE',
          team_memberships: [
            {
              role_in_team: 'KETUA',
              team: { id: 'team-reguler', name: 'Kelompok Reguler', decree_no: 'NOMOR-01' },
            },
          ],
          assignments: [{ id: 'assign-1' }],
        },
      ];
    };

    const candidates = await getPentashihCandidates({ search: 'Deni' });
    assert.equal(candidates.length, 1);
    assert.equal(candidates[0].name, 'Deni Hudaeny');
    assert.equal(candidates[0].active_assignments_count, 1);
    assert.equal(candidates[0].teams[0].name, 'Kelompok Reguler');
    assert.ok(capturedQuery.where.OR.some(cond => cond.name?.contains === 'Deni'));
  } finally {
    prisma.user.findMany = originalFindMany;
  }
});
