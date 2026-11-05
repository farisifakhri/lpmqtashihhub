import test from 'node:test';
import assert from 'node:assert/strict';
import { TRANSITION_POLICY, listRegistrations } from '../../src/services/registration.service.js';
import { assertReadyForSttEligibility } from '../../src/services/distribution.service.js';
import { prisma } from '../../src/config/database.js';

test('B14-01: TRANSITION_POLICY blocks PENERBIT from transitioning REVISION_REQUIRED to TASHIH_IN_PROGRESS', () => {
  const rule = TRANSITION_POLICY.REVISION_REQUIRED.TASHIH_IN_PROGRESS;
  assert.ok(rule, 'Rule must exist');
  assert.equal(rule.domainAction, true, 'Must require domainAction to prevent direct API transitions');
  assert.ok(!rule.allowedRoles.includes('PENERBIT'), 'PENERBIT must not be allowed to trigger this transition directly');
  assert.ok(rule.allowedRoles.includes('DISTRIBUTOR'), 'DISTRIBUTOR must be allowed via domainAction');
});

test('B14-02: TRANSITION_POLICY marks TASHIH_IN_PROGRESS exits as domainAction for DISTRIBUTOR', () => {
  const sttRule = TRANSITION_POLICY.TASHIH_IN_PROGRESS.READY_FOR_STT;
  assert.equal(sttRule.domainAction, true, 'STT recommendation must require domainAction');
  assert.deepEqual(sttRule.allowedRoles, ['DISTRIBUTOR', 'SUPERADMIN'], 'STT decision belongs to DISTRIBUTOR or SUPERADMIN');

  const revRule = TRANSITION_POLICY.TASHIH_IN_PROGRESS.REVISION_REQUIRED;
  assert.equal(revRule.domainAction, true, 'Revision decision must require domainAction');
  assert.deepEqual(revRule.allowedRoles, ['DISTRIBUTOR', 'SUPERADMIN'], 'Revision decision belongs to DISTRIBUTOR or SUPERADMIN');
});

test('B14-03: assertReadyForSttEligibility rejects when assignments are incomplete or missing reviews', async () => {
  const mockTx = {
    assignment: {
      findFirst: async () => ({ id: 'asg-1', iteration: 1 }),
      findMany: async () => [
        { id: 'asg-1', status: 'IN_PROGRESS', reviews: [] },
      ],
    },
  };

  await assert.rejects(
    assertReadyForSttEligibility(mockTx, 'reg-1'),
    (err) => err.statusCode === 409 && /belum selesai atau belum memiliki hasil sidang/i.test(err.message)
  );
});

test('B14-04: assertReadyForSttEligibility rejects when any review is not PASSED', async () => {
  const mockTx = {
    assignment: {
      findFirst: async () => ({ id: 'asg-1', iteration: 1 }),
      findMany: async () => [
        { id: 'asg-1', status: 'COMPLETED', reviews: [{ result: 'PASSED' }] },
        { id: 'asg-2', status: 'COMPLETED', reviews: [{ result: 'REVISION_REQUIRED' }] },
      ],
    },
  };

  await assert.rejects(
    assertReadyForSttEligibility(mockTx, 'reg-1'),
    (err) => err.statusCode === 409 && /masih ada hasil sidang yang tidak lulus/i.test(err.message)
  );
});

test('B14-05: assertReadyForSttEligibility rejects when no recap file is uploaded', async () => {
  const mockTx = {
    assignment: {
      findFirst: async () => ({ id: 'asg-1', iteration: 1 }),
      findMany: async () => [
        { id: 'asg-1', status: 'COMPLETED', reviews: [{ result: 'PASSED', recap_file_id: null }] },
        { id: 'asg-2', status: 'COMPLETED', reviews: [{ result: 'PASSED', recap_file_id: undefined }] },
      ],
    },
  };

  await assert.rejects(
    assertReadyForSttEligibility(mockTx, 'reg-1'),
    (err) => err.statusCode === 409 && /dokumen rekap hasil telaah internal belum diunggah/i.test(err.message)
  );
});

test('B14-06: assertReadyForSttEligibility passes when team assignment has TEAM scope recap and all PASSED', async () => {
  const mockTx = {
    assignment: {
      findFirst: async () => ({ id: 'asg-1', iteration: 2 }),
      findMany: async () => [
        { id: 'asg-1', team_id: 'team-1', status: 'COMPLETED', reviews: [{ result: 'PASSED', recap_file_id: 'uuid-recap-file', recap_scope: 'TEAM' }] },
        { id: 'asg-2', team_id: 'team-1', status: 'COMPLETED', reviews: [{ result: 'PASSED', recap_file_id: null }] },
      ],
    },
  };

  const result = await assertReadyForSttEligibility(mockTx, 'reg-1');
  assert.equal(result.lastIteration, 2);
  assert.equal(result.assignments.length, 2);
});

test('B14-07: listRegistrations sanitizes assignments for PENERBIT (no pentashih name, email, or notes)', async () => {
  const origCount = prisma.registration.count;
  const origFindMany = prisma.registration.findMany;
  const origGroupBy = prisma.registration.groupBy;

  try {
    prisma.registration.count = async () => 1;
    prisma.registration.findMany = async () => [
      {
        id: 'reg-test-1',
        registration_no: 'REG-001',
        status: 'TASHIH_IN_PROGRESS',
        stage_entered_at: new Date(),
        publisher: { id: 'pub-1', legal_name: 'Penerbit Al-Huda' },
        assignments: [
          {
            id: 'asg-1',
            stage: 'REGULAR',
            iteration: 1,
            status: 'COMPLETED',
            due_at: new Date(),
            assignee_id: 'usr-pentashih-99',
            assignee: { id: 'usr-pentashih-99', name: 'K.H. Ahmad Pentashih', email: 'ahmad@kemenag.go.id' },
            reviews: [
              { id: 'rev-1', result: 'PASSED', notes: 'Catatan rahasia sidang internal', completed_at: new Date() },
            ],
          },
        ],
      },
    ];
    prisma.registration.groupBy = async () => [{ status: 'TASHIH_IN_PROGRESS', _count: 1 }];

    // 1. Akun Penerbit
    const pubUser = { id: 'usr-pub-1', publisherId: 'pub-1', roles: ['PENERBIT'] };
    const pubResult = await listRegistrations({ user: pubUser });

    assert.equal(pubResult.items.length, 1);
    const pubItem = pubResult.items[0];
    assert.ok(Array.isArray(pubItem.assignments), 'assignments array must be present for progress indicator');
    assert.equal(pubItem.assignments[0].id, 'asg-1');
    assert.equal(pubItem.assignments[0].status, 'COMPLETED');
    assert.equal(pubItem.assignments[0].assignee, undefined, 'Pentashih assignee MUST NOT be leaked to PENERBIT');
    assert.equal(pubItem.assignments[0].reviews, undefined, 'Internal review notes MUST NOT be leaked to PENERBIT');

    // 2. Akun Distributor
    const distUser = { id: 'usr-dist-1', roles: ['DISTRIBUTOR'] };
    const distResult = await listRegistrations({ user: distUser });

    assert.equal(distResult.items.length, 1);
    const distItem = distResult.items[0];
    assert.ok(distItem.assignments[0].assignee, 'Pentashih assignee MUST be available for DISTRIBUTOR');
    assert.equal(distItem.assignments[0].assignee.name, 'K.H. Ahmad Pentashih');
    assert.ok(distItem.assignments[0].reviews, 'Reviews and notes MUST be available for DISTRIBUTOR');
    assert.equal(distItem.assignments[0].reviews[0].notes, 'Catatan rahasia sidang internal');
  } finally {
    prisma.registration.count = origCount;
    prisma.registration.findMany = origFindMany;
    prisma.registration.groupBy = origGroupBy;
  }
});
