import test from 'node:test';
import assert from 'node:assert/strict';
import { requireAdminInternal, requireManualTeamAssignment } from '../src/middlewares/admin-internal.middleware.js';
import { TRANSITION_POLICY } from '../src/services/registration.service.js';
import { authorize } from '../src/middlewares/rbac.middleware.js';

function check(guard, user) {
  let next = false, status;
  guard({ user }, { status(code) { status = code; return this; }, json() { return this; } }, () => { next = true; });
  return { next, status };
}
test('separate admin guard only permits explicit HELPER_ADMIN or SUPERADMIN membership', () => {
  for (const role of ['HELPER_ADMIN', 'SUPERADMIN']) assert.equal(check(requireAdminInternal, { roles: [role] }).next, true);
  assert.equal(check(requireAdminInternal, { role: 'HELPER_ADMIN' }).status, 403);
  for (const role of ['KEPALA_LPMQ', 'DISTRIBUTOR', 'PENTASHIH', 'VERIFIKATOR', 'ADMIN_PENERBIT', 'ADMIN_INTERNAL', 'UNKNOWN']) assert.equal(check(requireAdminInternal, { roles: [role] }).status, 403);
  assert.equal(check(requireAdminInternal, undefined).status, 403);
  assert.equal(check(requireAdminInternal, { roles: [] }).status, 403);
});
test('existing Kepala route guard rejects pure HELPER_ADMIN and preserves Kepala access', () => {
  const guard = authorize('KEPALA_LPMQ');
  assert.equal(check(guard, { roles: ['HELPER_ADMIN'] }).status, 403);
  assert.equal(check(guard, { roles: ['HELPER_ADMIN', 'PENTASHIH'] }).status, 403);
  assert.equal(check(guard, { roles: ['KEPALA_LPMQ'] }).next, true);
  assert.equal(check(guard, { roles: ['HELPER_ADMIN', 'KEPALA_LPMQ'] }).next, true);
  // Existing SUPERADMIN middleware bypass remains; domain approval still
  // checks KEPALA_LPMQ explicitly (covered by real endpoint integration tests).
  assert.equal(check(guard, { roles: ['SUPERADMIN'] }).next, true);
});
test('manual team assignment belongs exclusively to HELPER_ADMIN or SUPERADMIN', () => {
  for (const role of ['HELPER_ADMIN', 'SUPERADMIN']) assert.equal(check(requireManualTeamAssignment, { roles: [role] }).next, true);
  for (const role of ['DISTRIBUTOR', 'KEPALA_LPMQ', 'ADMIN_PENERBIT', 'PENTASHIH', 'VERIFIKATOR']) assert.equal(check(requireManualTeamAssignment, { roles: [role] }).status, 403);
  assert.deepEqual(TRANSITION_POLICY.READY_FOR_VERIFICATION.VERIFICATION_ASSIGNED.allowedRoles, ['HELPER_ADMIN', 'SUPERADMIN']);
  assert.deepEqual(TRANSITION_POLICY.WAITING_VERIFICATION_APPROVAL.VERIFICATION_APPROVED.allowedRoles, ['KEPALA_LPMQ']);
});
