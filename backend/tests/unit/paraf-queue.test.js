import test from 'node:test';
import assert from 'node:assert/strict';
import { prisma } from '../../src/config/database.js';
import { isWaitingForMe, listMyParafQueue } from '../../src/services/paraf-queue.service.js';

/** Ganti delegate Prisma sementara selama `fn` berjalan. */
async function withDelegates(delegates, fn) {
  const originals = Object.fromEntries(Object.keys(delegates).map((key) => [key, Object.getOwnPropertyDescriptor(prisma, key)]));
  try {
    for (const [key, value] of Object.entries(delegates)) Object.defineProperty(prisma, key, { configurable: true, value });
    return await fn();
  } finally {
    for (const [key, original] of Object.entries(originals)) {
      if (original) Object.defineProperty(prisma, key, original);
      else delete prisma[key];
    }
  }
}

const pemaraf = { id: 'pem-1', name: 'Pemaraf Satu', isPemaraf: true };
const reg = (id, status) => ({ id, registration_no: `REG-${id}`, title: `Naskah ${id}`, status, publisher: { legal_name: 'PT Mushaf' } });

test('isWaitingForMe: hanya Pemaraf yang ditunjuk dan belum memaraf', () => {
  assert.equal(isWaitingForMe('a', ['a', 'b'], []), true);
  assert.equal(isWaitingForMe('c', ['a', 'b'], []), false);
  assert.equal(isWaitingForMe('a', ['a', 'b'], ['a']), false);
  assert.equal(isWaitingForMe('a', null, []), true); // dokumen lama tanpa penunjukan
});

test('antrean paraf ditolak untuk akun bukan Pemaraf', async () => {
  await assert.rejects(listMyParafQueue({ id: 'kepala', isPemaraf: false }), (err) => err.statusCode === 403);
});

test('antrean paraf menggabungkan keempat alur, membuang yang bukan giliran saya, dan urut terlama', async () => {
  const rows = [
    { subject_type: 'VERIFICATION_RESULT', subject_id: 'asg-1', assigned_ids: ['pem-1', 'pem-2'], signers: [], required_count: 2, created_at: new Date('2026-11-20') },
    { subject_type: 'DISTRIBUTOR_REVIEW', subject_id: 'reg-2', assigned_ids: ['pem-1', 'pem-2'], signers: [{ id: 'pem-2' }], required_count: 2, requested_by_id: 'dist-1', payload: { result: 'PASSED' }, created_at: new Date('2026-11-18') },
    // sudah saya paraf -> tidak tampil
    { subject_type: 'MASTER_LETTER', subject_id: 'mst-1', assigned_ids: ['pem-1', 'pem-2'], signers: [{ id: 'pem-1' }], required_count: 2, created_at: new Date('2026-11-19') },
    // bukan saya yang ditunjuk -> tidak tampil
    { subject_type: 'MASTER_LETTER', subject_id: 'mst-2', assigned_ids: ['pem-2', 'pem-3'], signers: [], required_count: 2, created_at: new Date('2026-11-19') },
    { subject_type: 'MASTER_LETTER', subject_id: 'mst-3', assigned_ids: ['pem-1', 'pem-2'], signers: [], required_count: 2, created_at: new Date('2026-11-21') },
  ];
  const items = await withDelegates({
    approvalParaf: { findMany: async () => rows },
    user: { findMany: async () => [{ id: 'dist-1', name: 'Distributor A' }] },
    verificationAssignment: { findMany: async () => [{ id: 'asg-1', verifier: { name: 'Verifikator' }, registration: reg('1', 'WAITING_VERIFICATION_APPROVAL') }] },
    verificationDocument: { findMany: async () => [{ id: 'vdoc-1', assignment_id: 'asg-1', document_type: 'SURAT_HASIL_VERIFIKASI' }] },
    registration: { findMany: async () => [reg('reg-2', 'IN_TASHIH')] },
    masterMushafRequest: { findMany: async ({ where }) => [{ id: 'mst-3', request_code: 'PMQ-3', letter_number: 'B-3', mushaf_type_label: 'Yasin dan Tahlil', institution: 'Yayasan', publisher: null }].filter((l) => where.id.in.includes(l.id)) },
    officialDocument: { findMany: async () => [
      { id: 'stt-1', document_no: 'STT-1', registration: reg('4', 'READY_FOR_STT'), content_snapshot: { tu_workflow: { submitted_at: '2026-11-17T00:00:00.000Z', pemaraf_ids: ['pem-1', 'pem-2'], parafs: [], paraf_required: 2 } } },
      // belum diserahkan ke Pemaraf -> tidak tampil
      { id: 'stt-2', document_no: 'STT-2', registration: reg('5', 'READY_FOR_STT'), content_snapshot: {} },
    ] },
  }, () => listMyParafQueue(pemaraf));

  assert.deepEqual(items.map((i) => `${i.type}:${i.action_id}`), [
    'STT:stt-1', 'DISTRIBUTOR_REVIEW:reg-2', 'VERIFICATION_RESULT:vdoc-1', 'MASTER_LETTER:mst-3',
  ]);
  const review = items.find((i) => i.type === 'DISTRIBUTOR_REVIEW');
  assert.equal(review.paraf_done, 1);
  assert.equal(review.detail, 'Keputusan: Lulus tashih');
  assert.deepEqual(review.people, [{ role: 'Distributor', name: 'Distributor A' }]);
  assert.deepEqual(items.map((i) => i.queue_position), [1, 2, 3, 4]);
});
