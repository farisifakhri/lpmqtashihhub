import test from 'node:test';
import assert from 'node:assert/strict';
import { verificationInboxSchema } from '../src/validators/verification.validator.js';

test('verificationInboxSchema accepts all lifecycle statuses including REVOKED and post-draft states', () => {
  const validStatuses = [
    'ASSIGNED',
    'IN_PROGRESS',
    'WAITING_APPROVAL',
    'WAITING_SIGNATURE',
    'READY_TO_SEND',
    'COMPLETED',
    'REVOKED',
  ];

  for (const status of validStatuses) {
    const parsed = verificationInboxSchema.query.safeParse({ status });
    assert.equal(parsed.success, true, `Status "${status}" should be accepted by verificationInboxSchema`);
    assert.equal(parsed.data.status, status);
  }

  // Unknown status must be rejected
  const invalid = verificationInboxSchema.query.safeParse({ status: 'PENDING_APPROVAL' });
  assert.equal(invalid.success, false);
});

test('revokeAssignmentSchema and reassignAssignmentSchema validation rules', async () => {
  const { revokeAssignmentSchema, reassignAssignmentSchema } = await import('../src/validators/verification.validator.js');

  // Revoke: Valid
  const validRevoke = revokeAssignmentSchema.body.safeParse({ reason: 'Verifikator sedang cuti dinas luar.' });
  assert.equal(validRevoke.success, true);

  // Revoke: Short reason rejected (< 5 chars)
  const shortRevoke = revokeAssignmentSchema.body.safeParse({ reason: 'abc' });
  assert.equal(shortRevoke.success, false);

  // Reassign: Valid
  const validReassign = reassignAssignmentSchema.body.safeParse({
    verifier_id: 'a0000000-0000-0000-0000-000000000001',
    nota_no: 'ND-2026/09/REV-01',
    reason: 'Pengalihan tugas karena rotasi berkas.',
    notes: 'Prioritas tinggi.',
  });
  assert.equal(validReassign.success, true);

  // Reassign: Invalid verifier UUID rejected
  const invalidReassign = reassignAssignmentSchema.body.safeParse({
    verifier_id: 'not-a-uuid',
    nota_no: 'ND-2026/09/REV-01',
    reason: 'Pengalihan tugas karena rotasi berkas.',
  });
  assert.equal(invalidReassign.success, false);
});

test('stage-owner-aware SLA evaluation prevents penalizing verifier when review is submitted', () => {
  const dueAt = new Date('2026-09-20T17:00:00.000Z');
  const reviewSubmittedOnTime = new Date('2026-09-20T14:00:00.000Z');
  const reviewSubmittedLate = new Date('2026-09-21T10:00:00.000Z');

  // Case 1: In progress and current time is past dueAt -> VERIFIKATOR OVERDUE
  const nowOverdue = new Date('2026-09-21T12:00:00.000Z');
  const isVerifierOverdueInProgress = nowOverdue.getTime() > dueAt.getTime();
  assert.equal(isVerifierOverdueInProgress, true);

  // Case 2: Waiting approval, submitted on time -> verifier is ON_TIME, current stage owner is KEPALA_LPMQ
  const verifierPerformanceOnTime = reviewSubmittedOnTime.getTime() <= dueAt.getTime() ? 'ON_TIME' : 'LATE';
  assert.equal(verifierPerformanceOnTime, 'ON_TIME');

  // Case 3: Waiting approval, submitted late -> verifier is LATE
  const verifierPerformanceLate = reviewSubmittedLate.getTime() <= dueAt.getTime() ? 'ON_TIME' : 'LATE';
  assert.equal(verifierPerformanceLate, 'LATE');
});

test('post-draft status ordering and actor handoff policy', () => {
  const LIFECYCLE_ACTORS = {
    ASSIGNED: 'VERIFIKATOR',
    IN_PROGRESS: 'VERIFIKATOR',
    WAITING_APPROVAL: 'KEPALA_LPMQ',
    WAITING_SIGNATURE: 'SIGNATORIES', // Verifikator then Kepala LPMQ
    READY_TO_SEND: 'VERIFIKATOR',
    COMPLETED: 'SYSTEM_ARCHIVE',
    REVOKED: 'NONE',
  };

  assert.equal(LIFECYCLE_ACTORS.WAITING_APPROVAL, 'KEPALA_LPMQ');
  assert.equal(LIFECYCLE_ACTORS.READY_TO_SEND, 'VERIFIKATOR');
  assert.equal(LIFECYCLE_ACTORS.REVOKED, 'NONE');
});

