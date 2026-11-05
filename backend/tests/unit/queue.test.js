import test from 'node:test';
import assert from 'node:assert/strict';
import { queueItems, queuePagination, ACTIVE_REGISTRATION_STATUSES } from '../../src/services/queue-utils.js';
import { move } from '../../src/services/workflow-utils.js';
import { assertIsolatedTestDatabase } from '../../src/utils/test-database.js';
import { QUEUE_CONFIG } from '../../src/services/queue.config.js';
import {
  buildAdminPublisherRegistrationWhere,
  buildMasterIntakeQueueWhere,
  buildUnassignedVerificationWhere,
  buildVerificationAssignmentsWhere,
} from '../../src/services/queue-filters.js';
import { requireActiveRole } from '../../src/middlewares/active-role.middleware.js';
import { authenticate } from '../../src/middlewares/auth.middleware.js';


test('queue pagination rejects invalid offsets and bounds page size', () => {
  assert.deepEqual(queuePagination({ page: '-3', limit: '1000' }), { page: 1, limit: 100, skip: 0 });
  assert.deepEqual(queuePagination({ page: '2', limit: '20' }), { page: 2, limit: 20, skip: 20 });
  for (const value of ['NaN', '0', 'Infinity', '1.5']) assert.equal(queuePagination({ page: value }).page, 1);
  for (const status of ['DRAFT', 'COMPLETED', 'CANCELLED']) assert.equal(ACTIVE_REGISTRATION_STATUSES.includes(status), false);
});

test('queue positions are scoped to the filtered page and archives have no queue ticket', () => {
  const item = { id: 'r', entered: new Date() };
  const [result] = queueItems([item], record => record.entered, 20);
  assert.equal(result.queue_position, 21);
  assert.equal(result.queue_entered_at, item.entered);
  assert.equal(queueItems([item], record => record.entered, 0, false)[0].queue_position, null);
  assert.equal(item.queue_position, undefined);
});

test('every domain transition stamps the same stage entry and history timestamp', async () => {
  let update, history;
  const tx = {
    registration: { updateMany: async input => { update = input; return { count: 1 }; } },
    statusHistory: { create: async input => { history = input; } },
    auditLog: { create: async () => {} },
  };
  await move(tx, { id: 'r', status: 'READY_FOR_VERIFICATION' }, 'VERIFICATION_ASSIGNED', { id: 'u' }, 'Assigned');
  assert.equal(update.data.stage_entered_at, history.data.changed_at);
  assert.equal(history.data.to_status, 'VERIFICATION_ASSIGNED');
});

test('integration tests cannot use the shared application database', () => {
  for (const value of [undefined, 'mysql://root@localhost/lpmq_db', 'mysql://root@localhost/not_test_prod']) assert.throws(() => assertIsolatedTestDatabase(value));
  assert.equal(assertIsolatedTestDatabase('mysql://root@localhost/lpmq_fifo_123_test'), 'lpmq_fifo_123_test');
});

test('admin roles share the same queue items and PENANDATANGAN has no queue config', () => {
  assert.deepEqual(
    QUEUE_CONFIG.ADMIN_INTERNAL.map(({ key, tab }) => [key, tab]),
    QUEUE_CONFIG.SUPERADMIN.map(({ key, tab }) => [key, tab]),
  );
  assert.deepEqual(
    QUEUE_CONFIG.ADMIN_INTERNAL.map(({ key }) => key),
    ['publisher_registration_pending', 'master_intake_pending', 'verification_assignment_pending'],
  );
  assert.equal(QUEUE_CONFIG.PENANDATANGAN, undefined);
});

test('queue list and count filters select the documented admin tabs', () => {
  assert.deepEqual(
    buildAdminPublisherRegistrationWhere({ status: 'DIAJUKAN', search: '  Mushaf  ' }),
    {
      status: 'DIAJUKAN',
      OR: [
        { name: { contains: 'Mushaf' } },
        { registration_code: { contains: 'Mushaf' } },
        { email: { contains: 'Mushaf' } },
        { npwp: { contains: 'Mushaf' } },
      ],
    },
  );

  const intakeWhere = buildMasterIntakeQueueWhere();
  assert.deepEqual(intakeWhere.OR.map(({ status, revision_source }) => [status, revision_source]), [
    ['READY_FOR_VERIFICATION', undefined],
    ['REVISION_REQUIRED', 'PHYSICAL_MASTER'],
  ]);
  assert.deepEqual(buildUnassignedVerificationWhere(), {
    status: 'READY_FOR_VERIFICATION',
    physical_master_intake: { status: 'RECEIVED', receipt_no: { not: null } },
    verification_assignments: {
      none: {
        status: { in: ['ASSIGNED', 'IN_PROGRESS', 'WAITING_APPROVAL', 'WAITING_SIGNATURE', 'READY_TO_SEND'] },
      },
    },
  });
});

test('verifier queue config scopes counts to verifier assignments without changing other roles', () => {
  const verifier = { id: 'verifier-1', roles: ['VERIFIKATOR'] };
  assert.deepEqual(
    QUEUE_CONFIG.VERIFIKATOR.map(({ key, tab }) => [key, tab]),
    [
      ['verification_assigned', 'ASSIGNED'],
      ['verification_ready_to_send', 'READY_TO_SEND'],
      ['verification_bast_ready', 'BAST_READY'],
      ['payment_verification_pending', 'Perlu Verifikasi (PAID)'],
    ],
  );
  assert.deepEqual(QUEUE_CONFIG.ADMIN_INTERNAL.map(({ key }) => key), [
    'publisher_registration_pending',
    'master_intake_pending',
    'verification_assignment_pending',
  ]);
  assert.deepEqual(buildVerificationAssignmentsWhere({ status: 'ASSIGNED' }, verifier, { scopeToVerifier: true }), {
    verifier_id: 'verifier-1',
    status: 'ASSIGNED',
  });
  assert.deepEqual(
    buildVerificationAssignmentsWhere({ status: 'READY_TO_SEND' }, verifier, { scopeToVerifier: true }),
    { verifier_id: 'verifier-1', status: 'READY_TO_SEND' },
  );
  assert.deepEqual(
    buildVerificationAssignmentsWhere({ handover_ready: 'true' }, verifier, { scopeToVerifier: true }),
    {
      verifier_id: 'verifier-1',
      status: 'COMPLETED',
      registration: {
        core_distributor_id: { not: null },
        payment_records: { some: { status: 'VERIFIED' } },
        OR: [
          { status: 'PAYMENT_VERIFICATION', physical_handovers: { none: { status: 'PENDING' } } },
          { status: 'PHYSICAL_HANDOVER_CORRECTION_REQUIRED', physical_handovers: { some: { status: 'RETURNED' } } },
        ],
      },
    },
  );

  const verifierAdmin = { id: 'verifier-admin', roles: ['VERIFIKATOR', 'SUPERADMIN'] };
  assert.deepEqual(buildVerificationAssignmentsWhere({ status: 'ASSIGNED' }, verifierAdmin), { status: 'ASSIGNED' });
  assert.deepEqual(
    buildVerificationAssignmentsWhere({ status: 'ASSIGNED' }, verifierAdmin, { scopeToVerifier: true }),
    { verifier_id: 'verifier-admin', status: 'ASSIGNED' },
  );
});

test('payment verification count is scoped to the token user and does not change other roles', () => {
  const verifier = { id: 'verifier-from-token', roles: ['VERIFIKATOR'] };
  const paymentQueue = QUEUE_CONFIG.VERIFIKATOR.find(({ key }) => key === 'payment_verification_pending');

  assert.equal(paymentQueue.model, 'paymentRecord');
  assert.deepEqual(paymentQueue.buildWhere(verifier), {
    status: 'PAID',
    registration: {
      status: 'PAYMENT_VERIFICATION',
      verification_assignments: {
        some: {
          verifier_id: 'verifier-from-token',
          status: 'COMPLETED',
          decision: 'PASSED',
        },
      },
    },
  });
  assert.equal(QUEUE_CONFIG.ADMIN_INTERNAL.some(({ key }) => key === 'payment_verification_pending'), false);
  assert.equal(QUEUE_CONFIG.SUPERADMIN.some(({ key }) => key === 'payment_verification_pending'), false);
});

test('active role middleware accepts only a role owned by the authenticated user', () => {
  const next = () => {};
  const acceptedRequest = { headers: { 'x-active-role': 'ADMIN_INTERNAL' }, user: { roles: ['ADMIN_INTERNAL'] } };
  requireActiveRole(acceptedRequest, {}, next);
  assert.equal(acceptedRequest.activeRole, 'ADMIN_INTERNAL');

  let statusCode;
  let body;
  const rejectedResponse = {
    status(code) {
      statusCode = code;
      return this;
    },
    json(value) {
      body = value;
      return this;
    },
  };
  const rejectedRequest = { headers: { 'x-active-role': 'SUPERADMIN' }, user: { roles: ['ADMIN_INTERNAL'] } };
  requireActiveRole(rejectedRequest, rejectedResponse, next);
  assert.equal(statusCode, 403);
  assert.equal(body.success, false);
  assert.equal(rejectedRequest.activeRole, undefined);
});

test('authentication rejects a queue request without a token', async () => {
  let statusCode;
  let body;
  const response = {
    status(code) {
      statusCode = code;
      return this;
    },
    json(value) {
      body = value;
      return this;
    },
  };
  await authenticate({ headers: {} }, response, () => {
    assert.fail('next must not be called without a token');
  });
  assert.equal(statusCode, 401);
  assert.equal(body.success, false);
});
