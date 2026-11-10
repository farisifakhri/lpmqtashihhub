import test from 'node:test';
import assert from 'node:assert/strict';
import { prisma } from '../../src/config/database.js';
import { getSidebarBadges } from '../../src/services/sidebar-badge.service.js';

// Stub seluruh query yang dipakai service badge; setiap stub mencatat argumen `where`.
function stubPrisma(overrides = {}) {
  const calls = [];
  const originals = [];
  const stub = (model, method, impl) => {
    originals.push([model, method, prisma[model][method]]);
    prisma[model][method] = async args => {
      calls.push({ model, method, where: args?.where });
      return impl(args);
    };
  };
  for (const model of ['registration', 'publisherRegistration', 'verificationAssignment', 'paymentRecord', 'physicalManuscriptHandover', 'assignment']) {
    stub(model, 'count', overrides[model] || (() => 2));
  }
  stub('verificationDocumentSignatory', 'findMany', overrides.signatories || (() => []));
  const restore = () => originals.forEach(([model, method, fn]) => { prisma[model][method] = fn; });
  return { calls, restore };
}

test('Penerbit hanya menerima badge portal penerbit yang dicakup ke penerbitnya sendiri', async () => {
  const { calls, restore } = stubPrisma();
  try {
    const badges = await getSidebarBadges({ id: 'u-pub', roles: ['PENERBIT'], publisherId: 'pub-1' });
    assert.deepEqual(Object.keys(badges).sort(), ['publisher_actions', 'publisher_billing']);
    const regCall = calls.find(c => c.model === 'registration');
    assert.equal(regCall.where.publisher_id, 'pub-1');
    assert.deepEqual(regCall.where.status.in, ['DRAFT', 'REVISION_REQUIRED', 'AWAITING_PAYMENT', 'PHYSICAL_HANDOVER_CORRECTION_REQUIRED']);
    const payCall = calls.find(c => c.model === 'paymentRecord');
    assert.equal(payCall.where.status, 'UNPAID');
    assert.equal(payCall.where.registration.publisher_id, 'pub-1');
  } finally { restore(); }
});

test('Penerbit yang belum terhubung ke penerbit tidak memicu query dan tidak mendapat badge', async () => {
  const { calls, restore } = stubPrisma();
  try {
    assert.deepEqual(await getSidebarBadges({ id: 'u-pub', roles: ['PENERBIT'], publisherId: null }), {});
    assert.equal(calls.length, 0);
  } finally { restore(); }
});

test('Verifikator hanya menghitung penugasan miliknya dan tidak menerima antrean admin', async () => {
  const { calls, restore } = stubPrisma();
  try {
    const badges = await getSidebarBadges({ id: 'u-ver', roles: ['VERIFIKATOR'] });
    for (const key of ['verification_assigned', 'verification_ready_to_send', 'verification_bast_ready', 'payments_pending_verification', 'signatures_pending']) {
      assert.ok(key in badges, `${key} harus tersedia untuk verifikator`);
    }
    for (const key of ['publisher_registrations', 'master_intake', 'verification_need_assignment', 'tashih_initial', 'publisher_actions']) {
      assert.ok(!(key in badges), `${key} tidak boleh tersedia untuk verifikator`);
    }
    const assignmentCalls = calls.filter(c => c.model === 'verificationAssignment');
    assert.ok(assignmentCalls.length > 0);
    assert.ok(assignmentCalls.every(c => c.where.verifier_id === 'u-ver'));
    const assigned = assignmentCalls.find(c => c.where.status?.in);
    assert.deepEqual(assigned.where.status.in, ['ASSIGNED', 'IN_PROGRESS']);
  } finally { restore(); }
});

test('Helper Admin tidak menerima antrean pembayaran maupun sidang yang halamannya tidak dapat ia buka', async () => {
  const { restore } = stubPrisma();
  try {
    const badges = await getSidebarBadges({ id: 'u-adm', roles: ['ADMIN_INTERNAL'] });
    assert.equal(badges.publisher_registrations, 2);
    assert.equal(badges.verification_need_assignment, 2);
    for (const key of ['payments_pending_verification', 'handover_pending', 'tashih_initial', 'tashih_revision', 'signatures_pending']) {
      assert.ok(!(key in badges), `${key} tidak boleh tersedia untuk ADMIN_INTERNAL`);
    }
  } finally { restore(); }
});

test('Pentashih memisahkan sidang awal dan revisi, hanya untuk tugas miliknya yang belum ditelaah', async () => {
  const { calls, restore } = stubPrisma({ assignment: args => (args.where.stage === 'INITIAL' ? 3 : 1) });
  try {
    const badges = await getSidebarBadges({ id: 'u-tas', roles: ['PENTASHIH'] });
    assert.equal(badges.tashih_initial, 3);
    assert.equal(badges.tashih_revision, 1);
    for (const call of calls.filter(c => c.model === 'assignment')) {
      assert.equal(call.where.assignee_id, 'u-tas');
      assert.deepEqual(call.where.reviews, { none: {} });
    }
  } finally { restore(); }
});

test('Tanda tangan hanya dihitung bila penanda tangan sebelumnya sudah menandatangani', async () => {
  const signatories = () => [
    { sign_order: 1, document: { signatories: [{ sign_order: 1, status: 'PENDING' }] } },
    { sign_order: 2, document: { signatories: [{ sign_order: 1, status: 'SIGNED' }, { sign_order: 2, status: 'PENDING' }] } },
    { sign_order: 2, document: { signatories: [{ sign_order: 1, status: 'PENDING' }, { sign_order: 2, status: 'PENDING' }] } },
  ];
  const { restore } = stubPrisma({ signatories });
  try {
    const badges = await getSidebarBadges({ id: 'u-head', roles: ['KEPALA_LPMQ'] });
    assert.equal(badges.signatures_pending, 2);
  } finally { restore(); }
});

test('Antrean yang gagal dihitung dilewati tanpa menghilangkan badge lainnya', async () => {
  const { restore } = stubPrisma({ publisherRegistration: () => { throw new Error('db down'); } });
  const originalError = console.error;
  console.error = () => {};
  try {
    const badges = await getSidebarBadges({ id: 'u-adm', roles: ['ADMIN_INTERNAL'] });
    assert.ok(!('publisher_registrations' in badges));
    assert.equal(badges.verification_need_assignment, 2);
  } finally { console.error = originalError; restore(); }
});
