import test from 'node:test';
import assert from 'node:assert/strict';
import { detectMime, MAX_UPLOAD_BYTES } from '../src/services/storage.service.js';
import { assertManuscriptAccess } from '../src/services/file-access.service.js';
import { calculateDueAt, jakartaDate } from '../src/services/sla.service.js';
import { transitionStatus } from '../src/services/registration.service.js';
import { signDocument, renderDraft } from '../src/services/official-document.service.js';
import { confirmPaymentSchema } from '../src/validators/workflow.validator.js';

test('upload rejects executable content, empty files and excessive size', () => {
  for (const bytes of [Buffer.from('MZ executable'), Buffer.alloc(0), Buffer.alloc(MAX_UPLOAD_BYTES + 1)]) {
    assert.throws(() => detectMime(bytes), error => error.statusCode === 400);
  }
  assert.equal(detectMime(Buffer.from('%PDF-1.4\n%%EOF')), 'application/pdf');
});

test('unassigned internal users and other publishers cannot access manuscripts', async () => {
  const db = { assignment: { findFirst: async () => null }, verificationAssignment: { findFirst: async () => null } };
  const reg = { id: 'r', publisher_id: 'p', status: 'DRAFT' };
  for (const user of [{ id: 'u', roles: ['PENTASHIH'] }, { id: 'u', roles: ['DOKUMENTATOR'] }, { id: 'u', publisherId: 'other', roles: ['ADMIN_PENERBIT'] }]) {
    await assert.rejects(assertManuscriptAccess(reg, user, false, db), error => error.statusCode === 403);
  }
  await assertManuscriptAccess(reg, { id: 'u', publisherId: 'p', roles: ['ADMIN_PENERBIT'] }, true, db);
  await assert.rejects(assertManuscriptAccess({ ...reg, status: 'TASHIH_IN_PROGRESS' }, { id: 'u', publisherId: 'p', roles: ['ADMIN_PENERBIT'] }, true, db), error => error.statusCode === 409);
});

test('active pentashih assignment grants read access but not manuscript writes', async () => {
  const db = { assignment: { findFirst: async () => ({ id: 'a' }) } };
  const user = { id: 'u', roles: ['PENTASHIH'] };
  await assertManuscriptAccess({ id: 'r' }, user, false, db);
  await assert.rejects(assertManuscriptAccess({ id: 'r' }, user, true, db), error => error.statusCode === 403);
});

test('SLA uses complete master calendar including holidays and Jakarta end of day', async () => {
  const db = { workingDay: { findMany: async () => [
    { date: new Date('2026-09-11Z'), is_working_day: false },
    { date: new Date('2026-09-12Z'), is_working_day: true },
    { date: new Date('2026-09-13Z'), is_working_day: true },
  ] } };
  const due = await calculateDueAt(db, new Date('2026-09-10T08:00:00Z'), 2);
  assert.equal(due.toISOString(), '2026-09-13T16:59:59.999Z');
  assert.equal(jakartaDate(new Date('2026-09-10T18:00:00Z')), '2026-09-11');
  await assert.rejects(calculateDueAt({ workingDay: { findMany: async () => [{ date: new Date('2026-09-12Z'), is_working_day: true }] } }, new Date('2026-09-10Z'), 1), error => error.statusCode === 409);
});

test('manual status endpoint cannot bypass payment, assignments, review or official signing', async () => {
  for (const status of ['PAYMENT_VERIFICATION', 'WAITING_DISTRIBUTION', 'TASHIH_IN_PROGRESS', 'READY_FOR_STT', 'STT_ISSUED', 'READY_FOR_VERIFICATION']) {
    await assert.rejects(transitionStatus('id', status, '', { roles: ['SUPERADMIN'] }), error => error.statusCode === 400);
  }
  await assert.rejects(signDocument('id', { roles: ['SUPERADMIN'] }), error => error.statusCode === 403);
});

test('payment confirmation rejects client-controlled amount and free-form file path', () => {
  assert.equal(confirmPaymentSchema.body.safeParse({ receipt_file_id: '../../receipt.pdf' }).success, false);
  assert.equal(confirmPaymentSchema.body.safeParse({ receipt_file_id: '00000000-0000-4000-8000-000000000001', amount: 1 }).success, false);
});

test('draft PDF is generated on the server and unsupported text fails explicitly', async () => {
  const draft = { status: 'DRAFT', document_type: 'BERITA_ACARA_TASHIH', document_no: 'DRAFT-1', version: 1, content_snapshot: { title: 'Naskah Uji' } };
  assert.equal((await renderDraft(draft)).subarray(0, 5).toString(), '%PDF-');
  await assert.rejects(renderDraft({ ...draft, content_snapshot: { title: 'القرآن' } }), error => error.statusCode === 422);
});
