import 'dotenv/config';
import assert from 'node:assert/strict';
import { prisma } from '../src/config/database.js';
import { assertIsolatedTestDatabase } from '../src/utils/test-database.js';
import { listRegistrations } from '../src/services/registration.service.js';
import { listVerificationAssignments } from '../src/services/verification-intake.service.js';
import { listHandovers } from '../src/services/handover.service.js';
import { listPayments } from '../src/services/payment.service.js';
import { move } from '../src/services/workflow-utils.js';
assertIsolatedTestDatabase(process.env.DATABASE_URL);
try {
  const publisher = await prisma.publisher.findFirst();
  const service = await prisma.serviceType.findFirst();
  const verifier = await prisma.user.findUnique({ where: { email: 'verifikator@lpmq.kemenag.go.id' } });
  const distributor = await prisma.user.findUnique({ where: { email: 'distributor@lpmq.kemenag.go.id' } });
  const head = await prisma.user.findUnique({ where: { email: 'kepala@lpmq.kemenag.go.id' } });
  const admin = { id: head.id, roles: ['SUPERADMIN', 'KEPALA_LPMQ'] };
  const old = new Date('2026-09-01T00:00:00Z'), newer = new Date('2026-09-02T00:00:00Z');
  const a = await prisma.registration.create({ data: { registration_no: 'FIFO-PROBE-A', title: 'FIFO probe A', publisher_id: publisher.id, service_type_id: service.id, status: 'WAITING_VERIFICATION_APPROVAL', created_at: old, stage_entered_at: newer } });
  const b = await prisma.registration.create({ data: { registration_no: 'FIFO-PROBE-B', title: 'FIFO probe B', publisher_id: publisher.id, service_type_id: service.id, status: 'WAITING_VERIFICATION_APPROVAL', created_at: newer, stage_entered_at: old } });
  const page = await listRegistrations({ user: admin, search: 'FIFO probe', queueOnly: true, page: 1, limit: 1 });
  assert.equal(page.items[0].id, b.id, 'Stage entry wins over draft creation');
  assert.equal(page.pagination.total, 2);
  assert.equal(page.items[0].queue_position, 1);
  assert.equal((await listRegistrations({ user: admin, search: 'FIFO probe', page: 2, limit: 1 })).items[0].id, a.id);
  assert.equal((await listRegistrations({ user: { roles: ['ADMIN_PENERBIT'], publisherId: 'other' }, search: 'FIFO probe' })).pagination.total, 0);
  const va = await prisma.verificationAssignment.create({ data: { registration_id: a.id, verifier_id: verifier.id, assigned_at: old } });
  const vb = await prisma.verificationAssignment.create({ data: { registration_id: b.id, verifier_id: verifier.id, assigned_at: newer } });
  assert.equal((await listVerificationAssignments({ registration_status: 'WAITING_VERIFICATION_APPROVAL', page: 1, limit: 20 }, admin)).items[0].id, vb.id);
  assert.equal((await listVerificationAssignments({ status: 'ASSIGNED', page: 1, limit: 20 }, { id: verifier.id, roles: ['VERIFIKATOR'] })).items[0].id, va.id);
  for (const [reg, created] of [[a, newer], [b, old]]) {
    await prisma.physicalManuscriptHandover.create({ data: { registration_id: reg.id, from_user_id: verifier.id, to_user_id: distributor.id, created_at: created } });
    await prisma.paymentRecord.create({ data: { registration_id: reg.id, billing_no: `FIFO-${reg.id}`, amount: 100, status: 'PAID', created_at: reg.created_at } });
  }
  assert.equal((await listHandovers({ status: 'PENDING' }, admin)).items[0].registration_id, b.id);
  assert.equal((await listPayments({ status: 'PAID' }, admin)).items[0].registration_id, b.id);
  await prisma.$transaction(tx => move(tx, b, 'IN_VERIFICATION', { id: verifier.id }, 'FIFO stage entry probe'));
  const updated = await prisma.registration.findUnique({ where: { id: b.id } });
  assert.ok(updated.stage_entered_at > newer, 'Entering a new stage resets queue age');
  const history = await prisma.statusHistory.findFirst({ where: { registration_id: b.id } });
  assert.equal(updated.stage_entered_at.getTime(), history.changed_at.getTime());
  console.log('FIFO integration probes passed: stage order, pagination, ownership, verification, approval, payment, handover and re-entry.');
  await prisma.registration.deleteMany({ where: { id: { in: [a.id, b.id] } } });
} finally { await prisma.$disconnect(); }
