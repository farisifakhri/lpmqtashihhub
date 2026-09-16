import test from 'node:test';
import assert from 'node:assert/strict';
import { queueItems, queuePagination, ACTIVE_REGISTRATION_STATUSES } from '../src/services/queue-utils.js';
import { move } from '../src/services/workflow-utils.js';
import { assertIsolatedTestDatabase } from '../src/utils/test-database.js';

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
