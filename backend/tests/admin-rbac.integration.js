import 'dotenv/config';
import assert from 'node:assert/strict';
import { once } from 'node:events';
import app from '../src/app.js';
import { prisma } from '../src/config/database.js';
import { assertIsolatedTestDatabase } from '../src/utils/test-database.js';
import { jakartaDate } from '../src/services/sla.service.js';
import { migrateReviewedAdmins } from '../src/services/admin-role-migration.service.js';

assertIsolatedTestDatabase(process.env.DATABASE_URL);
const server = app.listen(0, '127.0.0.1');
await once(server, 'listening');
const base = `http://127.0.0.1:${server.address().port}/api/v1`;
let assertions = 0;
const call = async (path, token, method = 'GET', body, expected = 200) => {
  const response = await fetch(`${base}${path}`, { method, headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}) }, ...(method === 'GET' || body === undefined ? {} : { body: JSON.stringify(body) }) });
  const result = await response.json();
  assert.equal(response.status, expected, `${method} ${path}: ${JSON.stringify(result)}`);
  assertions += 1;
  return result;
};
try {
  const tokens = {};
  for (const [role, email] of [['HELPER_ADMIN', 'admin.internal@lpmq.kemenag.go.id'], ['SUPERADMIN', 'admin@lpmq.kemenag.go.id'], ['DISTRIBUTOR', 'distributor@lpmq.kemenag.go.id'], ['ADMIN_PENERBIT', 'penerbit@mushafnusantara.com'], ['VERIFIKATOR', 'verifikator@lpmq.kemenag.go.id'], ['KEPALA_LPMQ', 'kepala@lpmq.kemenag.go.id']]) tokens[role] = (await call('/auth/login', null, 'POST', { email, password: 'password123' })).data.token;
  const publisher = await prisma.publisher.findFirst();
  const service = await prisma.serviceType.findFirst();
  const verifier = await prisma.user.findUnique({ where: { email: 'verifikator@lpmq.kemenag.go.id' } });
  const superadmin = await prisma.user.findUnique({ where: { email: 'admin@lpmq.kemenag.go.id' } });
  const internalAdmin = await prisma.user.findUnique({ where: { email: 'admin.internal@lpmq.kemenag.go.id' } });
  const team = await prisma.distributionTeam.findFirst({ include: { members: true } });
  const assignee = team.members[0].user_id;
  const create = (name, status = 'WAITING_DISTRIBUTION') => prisma.registration.create({ data: { title: `HELPER_ADMIN RBAC ${name}`, registration_no: `HELPER_ADMIN-RBAC-${name}`, publisher_id: publisher.id, service_type_id: service.id, status, fee_sla_snapshot: { sla_initial_days: 2, sla_revision_days: 2, sla_dummy_days: 2 } } });
  const pending = await create('approval', 'WAITING_VERIFICATION_APPROVAL');
  const ready = await create('ready', 'READY_FOR_VERIFICATION');
  const draft = await create('draft', 'DRAFT');
  const document = await prisma.verificationDocument.create({ data: { registration_id: pending.id, document_type: 'SURAT_HASIL_VERIFIKASI', status: 'SUBMITTED', created_by_id: verifier.id } });
  const data = { team_id: team.id, assignee_ids: [assignee], stage: 'INITIAL' };
  const deny = (path, method = 'POST', body = {}) => call(path, tokens.HELPER_ADMIN, method, body, 403);

  // Write-denial tests first: the new admin is NOT an operational substitute.
  for (const status of ['VERIFICATION_APPROVED', 'IN_VERIFICATION']) {
    await deny(`/registrations/${pending.id}/status`, 'PATCH', { to_status: status, notes: 'Not authorized' });
    await deny(`/registrations/${pending.id}/transition`, 'POST', { to_status: status, notes: 'Not authorized' });
  }
  await deny(`/verification-documents/${document.id}/approve`);
  await deny(`/verification-results/${document.id}/approve`);
  await deny(`/verification-documents/${document.id}/return`, 'POST', { reason: 'Tidak berwenang' });
  await deny(`/verification-documents/${document.id}/send`);
  await call(`/registrations/${ready.id}/verification-assignments`, tokens.HELPER_ADMIN, 'POST', { verifier_id: verifier.id, nota_no: 'HELPER_ADMIN-NO-INTAKE-ND' }, 409);
  // Under KB-01: Admin is authorized to receive physical master; Kepala LPMQ and Verifikator are denied 403
  await call(`/registrations/${ready.id}/physical-master/receive`, tokens.KEPALA_LPMQ, 'POST', { decision: 'RECEIVED', receipt_no: 'FORBIDDEN-TR', condition: 'Baik', volume_count: 30 }, 403);
  await call(`/registrations/${ready.id}/physical-master/receive`, tokens.VERIFIKATOR, 'POST', { decision: 'RECEIVED', receipt_no: 'FORBIDDEN-TR', condition: 'Baik', volume_count: 30 }, 403);
  await call(`/registrations/${ready.id}/physical-master/receive`, tokens.HELPER_ADMIN, 'POST', { decision: 'RECEIVED', receipt_no: 'FORBIDDEN-TR', condition: 'Baik', volume_count: 30 }, 200);
  await deny('/registrations', 'POST', { service_type_id: service.id, title: 'Forbidden publisher action' });
  await deny(`/registrations/${draft.id}/submit`);
  await deny(`/registrations/${draft.id}/manuscripts`, 'POST', { type: 'COVER', file_id: '00000000-0000-4000-8000-000000000001' });
  await deny(`/registrations/${draft.id}/physical-master`, 'PUT', { format: 'A4', binding_method: 'PER_JUZ' });
  await deny('/publishers/me', 'PUT', { legal_name: 'Forbidden edit' });
  await deny('/publishers', 'GET', undefined);
  await deny(`/registrations/${pending.id}/payments`);
  await deny(`/registrations/${pending.id}/distribution-review`, 'POST', { result: 'PASSED', notes: 'Forbidden review' });
  await deny('/assignments/00000000-0000-4000-8000-000000000001/review', 'POST', { result: 'PASSED', notes: 'Forbidden review' });
  await deny('/users', 'GET', undefined);
  await deny('/master/categories', 'POST', { code: 'FORBIDDEN', name: 'Forbidden' });
  assert.equal((await prisma.registration.findUnique({ where: { id: pending.id } })).status, 'WAITING_VERIFICATION_APPROVAL');
  await call(`/verification-documents/${document.id}/approve`, tokens.SUPERADMIN, 'POST', {}, 403);
  await call(`/registrations/${ready.id}/verification-assignments`, tokens.KEPALA_LPMQ, 'POST', { verifier_id: verifier.id, nota_no: 'HEAD-FORBIDDEN-ND' }, 403);
  await call(`/registrations/${ready.id}/verification-assignments`, tokens.SUPERADMIN, 'POST', { verifier_id: verifier.id, nota_no: 'SA-ALLOWED-ND' }, 201);
  await call('/users', tokens.SUPERADMIN);

  // Positive tests fail until narrowly scoped read and assignment routes are opened.
  const list = await call('/registrations?search=HELPER_ADMIN%20RBAC&queue_only=true', tokens.HELPER_ADMIN);
  assert.equal(list.pagination.total, 2);
  await call(`/registrations/${pending.id}`, tokens.HELPER_ADMIN);
  await call(`/registrations/${pending.id}/timeline`, tokens.HELPER_ADMIN);
  await call('/reports/verification-performance', tokens.HELPER_ADMIN);
  await call(`/distribution-teams/${team.id}/workload`, tokens.HELPER_ADMIN);

  const start = new Date(`${jakartaDate(new Date())}T00:00:00Z`);
  await prisma.workingDay.createMany({ data: Array.from({ length: 30 }, (_, i) => ({ date: new Date(start.getTime() + (i + 1) * 86400000), is_working_day: true, source: 'ADMIN_RBAC_TEST' })), skipDuplicates: true });
  for (const role of ['HELPER_ADMIN', 'SUPERADMIN']) {
    const reg = await create(role);
    await prisma.paymentRecord.create({ data: { registration_id: reg.id, billing_no: `HELPER_ADMIN-BILL-${role}`, amount: 100, status: 'VERIFIED' } });
    await call(`/registrations/${reg.id}/assignments`, tokens.ADMIN_PENERBIT, 'POST', data, 403);
    await call(`/registrations/${reg.id}/assignments`, tokens.VERIFIKATOR, 'POST', data, 403);
    await call(`/registrations/${reg.id}/assignments`, tokens.DISTRIBUTOR, 'POST', data, 403);
    const assignment = (await call(`/registrations/${reg.id}/assignments`, tokens[role], 'POST', data, 201)).data[0];
    assert.ok(assignment.due_at);
    assert.equal((await prisma.registration.findUnique({ where: { id: reg.id } })).status, 'TASHIH_IN_PROGRESS');
    assert.equal(await prisma.notification.count({ where: { registration_id: reg.id, type: 'ASSIGNMENT' } }), 1);
    assert.equal((await prisma.auditLog.findFirst({ where: { subject_id: assignment.id, action: 'CREATE_ASSIGNMENT' } })).actor_id, role === 'HELPER_ADMIN' ? internalAdmin.id : superadmin.id);
    await call(`/registrations/${reg.id}/assignments`, tokens[role], 'POST', data, 409);
  }
  const unpaid = await create('unpaid');
  await call(`/registrations/${unpaid.id}/assignments`, tokens.HELPER_ADMIN, 'POST', data, 409);
  const invalidTeam = await create('invalid-team');
  await prisma.paymentRecord.create({ data: { registration_id: invalidTeam.id, billing_no: 'HELPER_ADMIN-BILL-invalid', amount: 100, status: 'VERIFIED' } });
  await call(`/registrations/${invalidTeam.id}/assignments`, tokens.HELPER_ADMIN, 'POST', { ...data, assignee_ids: [verifier.id] }, 400);
  await call(`/registrations/${invalidTeam.id}/assignments`, tokens.HELPER_ADMIN, 'POST', { ...data, team_id: 'missing-team' }, 409);
  const competing = await create('competing');
  await prisma.paymentRecord.create({ data: { registration_id: competing.id, billing_no: 'HELPER_ADMIN-BILL-competing', amount: 100, status: 'VERIFIED' } });
  const attempts = await Promise.all([tokens.HELPER_ADMIN, tokens.SUPERADMIN].map(token => fetch(`${base}/registrations/${competing.id}/assignments`, { method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` }, body: JSON.stringify(data) }).then(res => res.status)));
  assert.deepEqual(attempts.sort(), [201, 409]);
  assert.equal(await prisma.assignment.count({ where: { registration_id: competing.id } }), 1);

  // Reviewed migration is dry-run by default, audited, additive and idempotent.
  const reviewed = await prisma.user.create({ data: { name: 'Ketua Pentashih Reviewed Test', email: 'ketua.reviewed@test.example', password_hash: 'test-only', roles: { create: { role: { connect: { code: 'PENTASHIH' } } } } } });
  const options = { userIds: [reviewed.id], expected: 1, approvedBy: superadmin.id };
  await migrateReviewedAdmins(options);
  assert.equal(await prisma.userRole.count({ where: { user_id: reviewed.id } }), 1);
  assert.equal((await migrateReviewedAdmins({ ...options, execute: true })).changed, 1);
  assert.equal(await prisma.userRole.count({ where: { user_id: reviewed.id } }), 2);
  assert.equal((await migrateReviewedAdmins({ ...options, execute: true })).changed, 0);
  assert.equal(await prisma.auditLog.count({ where: { action: 'MIGRATE_KETUA_PENTASHIH_TO_ADMIN', subject_id: reviewed.id } }), 1);
  console.log(`HELPER_ADMIN RBAC integration passed: ${assertions} HTTP checks plus state, audit, concurrency and migration assertions.`);
} finally {
  await new Promise(resolve => server.close(resolve));
  await prisma.$disconnect();
}
