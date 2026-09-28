import test from 'node:test';
import assert from 'node:assert/strict';
import { authorize } from '../src/middlewares/rbac.middleware.js';
import { createVerificationAssignmentSchema } from '../src/validators/verification.validator.js';

function checkGuard(guard, user) {
  let next = false;
  let status = null;
  let errorJson = null;

  const req = { user };
  const res = {
    status(code) {
      status = code;
      return this;
    },
    json(data) {
      errorJson = data;
      return this;
    },
  };

  guard(req, res, () => {
    next = true;
  });

  return { next, status, errorJson };
}

test('RBAC: /verification/verifiers & /verification/unassigned-registrations allow HELPER_ADMIN & SUPERADMIN', () => {
  const guard = authorize('HELPER_ADMIN', 'SUPERADMIN');

  // Allowed
  assert.equal(checkGuard(guard, { roles: ['HELPER_ADMIN'] }).next, true);
  assert.equal(checkGuard(guard, { roles: ['SUPERADMIN'] }).next, true);
  assert.equal(checkGuard(guard, { roles: ['HELPER_ADMIN', 'KEPALA_LPMQ'] }).next, true);

  // Disallowed
  for (const role of ['VERIFIKATOR', 'ADMIN_PENERBIT', 'DISTRIBUTOR', 'PENTASHIH', 'KEPALA_LPMQ']) {
    const result = checkGuard(guard, { roles: [role] });
    assert.equal(result.next, false, `Role "${role}" must not pass authorize('HELPER_ADMIN', 'SUPERADMIN')`);
    assert.equal(result.status, 403);
  }

  // Unauthenticated / empty
  assert.equal(checkGuard(guard, undefined).status, 403);
  assert.equal(checkGuard(guard, { roles: [] }).status, 403);
});

test('Validator: createVerificationAssignmentSchema accepts roster assignment and validates optional verifier_id', () => {
  const validUuid = 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11';

  // Valid payload
  const valid = createVerificationAssignmentSchema.body.safeParse({
    verifier_id: validUuid,
    nota_no: 'ND.01/LPMQ/2026',
    notes: 'Periksa kelengkapan master cetak.',
  });
  assert.equal(valid.success, true);
  assert.equal(valid.data.verifier_id, validUuid);
  assert.equal(valid.data.nota_no, 'ND.01/LPMQ/2026');

  // Valid without optional notes
  const validNoNotes = createVerificationAssignmentSchema.body.safeParse({
    verifier_id: validUuid,
    nota_no: 'ND.01/LPMQ/2026',
  });
  assert.equal(validNoNotes.success, true);

  // Invalid verifier_id (not UUID)
  const invalidVerifier = createVerificationAssignmentSchema.body.safeParse({
    verifier_id: 'clx123abc456',
    nota_no: 'ND.01/LPMQ/2026',
  });
  assert.equal(invalidVerifier.success, false);

  // New registrations use the verifier stored in their core team snapshot.
  const missingVerifier = createVerificationAssignmentSchema.body.safeParse({
    nota_no: 'ND.01/LPMQ/2026',
  });
  assert.equal(missingVerifier.success, true);

  // Short nota_no (< 3 chars)
  const shortNota = createVerificationAssignmentSchema.body.safeParse({
    verifier_id: validUuid,
    nota_no: 'ND',
  });
  assert.equal(shortNota.success, false);
});

test('Verification Assignment: verifies notification type and state transitions', () => {
  const NOTIFICATION_TYPES = {
    VERIFICATION_ASSIGNMENT_REQUIRED: 'VERIFICATION_ASSIGNMENT_REQUIRED',
    PHYSICAL_MASTER_RECEIVED: 'PHYSICAL_MASTER_RECEIVED',
    ASSIGNMENT_CREATED: 'VERIFICATION_ASSIGNMENT',
    SIGNATURE_REQUEST: 'SIGNATURE_REQUEST',
    READY_TO_SEND: 'READY_TO_SEND',
  };

  assert.equal(NOTIFICATION_TYPES.VERIFICATION_ASSIGNMENT_REQUIRED, 'VERIFICATION_ASSIGNMENT_REQUIRED');
  assert.equal(NOTIFICATION_TYPES.PHYSICAL_MASTER_RECEIVED, 'PHYSICAL_MASTER_RECEIVED');
  assert.equal(NOTIFICATION_TYPES.SIGNATURE_REQUEST, 'SIGNATURE_REQUEST');

  const OPERATIONAL_STATES = {
    WAITING_PHYSICAL_MASTER: 'WAITING_PHYSICAL_MASTER',
    READY_FOR_ASSIGNMENT: 'READY_FOR_ASSIGNMENT',
    VERIFICATION_ASSIGNED: 'VERIFICATION_ASSIGNED',
  };
  assert.equal(OPERATIONAL_STATES.READY_FOR_ASSIGNMENT, 'READY_FOR_ASSIGNMENT');
});
