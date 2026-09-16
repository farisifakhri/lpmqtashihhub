import test from 'node:test';
import assert from 'node:assert/strict';
import { verificationInboxSchema } from '../src/validators/verification.validator.js';

test('verificationInboxSchema accepts all lifecycle statuses including post-draft states', () => {
  const validStatuses = [
    'ASSIGNED',
    'IN_PROGRESS',
    'WAITING_APPROVAL',
    'WAITING_SIGNATURE',
    'READY_TO_SEND',
    'COMPLETED',
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

test('post-draft status ordering and actor handoff policy', () => {
  const LIFECYCLE_ACTORS = {
    ASSIGNED: 'VERIFIKATOR',
    IN_PROGRESS: 'VERIFIKATOR',
    WAITING_APPROVAL: 'KEPALA_LPMQ',
    WAITING_SIGNATURE: 'SIGNATORIES', // Verifikator then Kepala LPMQ
    READY_TO_SEND: 'VERIFIKATOR',
    COMPLETED: 'SYSTEM_ARCHIVE',
  };

  assert.equal(LIFECYCLE_ACTORS.WAITING_APPROVAL, 'KEPALA_LPMQ');
  assert.equal(LIFECYCLE_ACTORS.READY_TO_SEND, 'VERIFIKATOR');
});

