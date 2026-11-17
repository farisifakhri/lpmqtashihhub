import test from 'node:test';
import assert from 'node:assert/strict';
import { prisma } from '../../src/config/database.js';
import { submitToTu, parafDocument, signDocument, STT_KEPALA_TITLE } from '../../src/services/official-document.service.js';

const KEPALA = { id: 'u-kepala', name: 'H. Abdul Aziz Sidqi, M.Ag. (Kepala LPMQ)', roles: ['KEPALA_LPMQ'] };
const PEMARAF_A = { id: 'u-pemaraf-a', name: 'Pemaraf Uji LPMQ', roles: ['PENTASHIH', 'KEPALA_LPMQ'], isPemaraf: true };
const PEMARAF_B = { id: 'u-pemaraf-b', name: 'dr afdhal', roles: ['PENTASHIH', 'KEPALA_LPMQ'], isPemaraf: true };
const DOKUMENTATOR = { id: 'u-dok', name: 'Dokumentator', roles: ['DOKUMENTATOR'] };

// tx tiruan satu dokumen STT; mencatat baris penandatangan, notifikasi, dan isi snapshot terakhir.
const fakeTx = ({ snapshot = {}, signatories = [], pemaraf = [PEMARAF_A, PEMARAF_B], kepala = KEPALA } = {}) => {
  const state = { snapshot, signatories: [...signatories], notifications: [], docUpdates: [] };
  const tx = {
    $queryRaw: async () => [{ id: 'reg-1' }],
    officialDocument: {
      findUnique: async () => ({
        id: 'doc-1',
        document_no: 'DRAFT-STT-1',
        document_type: 'SURAT_TANDA_TASHIH',
        status: 'DRAFT',
        registration_id: 'reg-1',
        registration: { registration_no: 'REG-1' },
        signatories: state.signatories,
        content_snapshot: state.snapshot,
      }),
      update: async ({ data }) => {
        state.docUpdates.push(data);
        if (data.content_snapshot) state.snapshot = data.content_snapshot;
        return { id: 'doc-1', ...data, signatories: state.signatories };
      },
    },
    user: {
      findMany: async () => pemaraf.map(({ id }) => ({ id })),
      findFirst: async () => kepala,
    },
    documentSignatory: {
      create: async ({ data }) => {
        const row = { id: `sig-${state.signatories.length + 1}`, ...data };
        state.signatories.push(row);
        return row;
      },
      update: async ({ where, data }) => ({ id: where.id, ...data }),
    },
    notification: {
      createMany: async ({ data }) => state.notifications.push(...data),
      create: async () => ({}),
    },
    registration: {
      findUnique: async () => ({ id: 'reg-1', registration_no: 'REG-1', title: 'Mushaf Uji', status: 'READY_FOR_STT', publisher_id: 'pub-1' }),
      updateMany: async () => ({ count: 1 }),
    },
    statusHistory: { create: async () => ({}) },
    publisher: { findUnique: async () => ({ user_id: null }) },
    storedFile: { create: async () => ({}) },
    auditLog: { create: async () => ({}) },
  };
  return { tx, state };
};

const withTx = async (fake, run) => {
  const original = prisma.$transaction;
  prisma.$transaction = async (fn) => fn(fake.tx);
  try {
    await run(fake.state);
  } finally {
    prisma.$transaction = original;
  }
};

test('submitToTu: hanya menyiapkan baris Kepala, tanpa Paraf 1/2, dan memberi tahu semua Pemaraf aktif', async () => {
  await withTx(fakeTx(), async (state) => {
    await submitToTu('doc-1', {}, DOKUMENTATOR);
    assert.deepEqual(state.signatories.map((s) => s.name_position_snapshot), [`${KEPALA.name} (${STT_KEPALA_TITLE})`]);
    assert.equal(state.snapshot.tu_workflow.status, 'SUBMITTED_TO_PEMARAF');
    assert.equal(state.snapshot.tu_workflow.paraf_required, 2); // kedua Pemaraf aktif wajib memaraf
    assert.deepEqual(state.notifications.map((n) => n.user_id), [PEMARAF_A.id, PEMARAF_B.id]);
  });
});

test('submitToTu: ditolak bila belum ada Pemaraf aktif, belum ada Kepala, atau sudah pernah diserahkan', async () => {
  await withTx(fakeTx({ pemaraf: [] }), async () => {
    await assert.rejects(submitToTu('doc-1', {}, DOKUMENTATOR), (e) => e.statusCode === 400 && /Pemaraf/.test(e.message));
  });
  await withTx(fakeTx({ kepala: null }), async () => {
    await assert.rejects(submitToTu('doc-1', {}, DOKUMENTATOR), (e) => e.statusCode === 400 && /Kepala/.test(e.message));
  });
  await withTx(fakeTx({ snapshot: { tu_workflow: { submitted_at: '2026-11-16T00:00:00Z' } } }), async () => {
    await assert.rejects(submitToTu('doc-1', {}, DOKUMENTATOR), (e) => e.statusCode === 409);
  });
});

test('parafDocument: hanya akun berperan Pemaraf; Tata Usaha, Super Admin, dan Kepala ditolak', async () => {
  await withTx(fakeTx({ snapshot: { tu_workflow: { submitted_at: '2026-11-16T00:00:00Z' } } }), async () => {
    for (const user of [
      { id: 'u-tu', name: 'Staf TU', roles: ['ADMIN_INTERNAL'] },
      { id: 'u-sa', name: 'Super Admin', roles: ['SUPERADMIN'] },
      KEPALA,
    ]) {
      await assert.rejects(parafDocument('doc-1', {}, user), (e) => e.statusCode === 403, user.name);
    }
  });
});

const SUBMITTED = () => ({ tu_workflow: { submitted_at: '2026-11-16T00:00:00Z', status: 'SUBMITTED_TO_PEMARAF', paraf_required: 2, parafs: [] } });

test('parafDocument: kedua Pemaraf wajib memaraf (urutan bebas); Kepala belum bisa sebelum keduanya selesai', async () => {
  await withTx(fakeTx({ snapshot: SUBMITTED() }), async (state) => {
    // Pemaraf B lebih dulu: tidak ada urutan Paraf 1/Paraf 2
    await parafDocument('doc-1', {}, PEMARAF_B);
    assert.equal(state.snapshot.tu_workflow.status, 'PARAF_IN_PROGRESS');
    await assert.rejects(signDocument('doc-1', KEPALA), (e) => e.statusCode === 409);

    await parafDocument('doc-1', {}, PEMARAF_A);
    assert.equal(state.snapshot.tu_workflow.status, 'PARAF_COMPLETED');
    assert.deepEqual(state.snapshot.tu_workflow.parafs.map((p) => p.signed_by.id), [PEMARAF_B.id, PEMARAF_A.id]);
    assert.deepEqual(state.signatories.map((s) => [s.name_position_snapshot, s.signing_status]), [
      ['dr afdhal (Pemaraf)', 'SIGNED'],
      ['Pemaraf Uji LPMQ (Pemaraf)', 'SIGNED'],
    ]);
  });
});

test('parafDocument: Pemaraf yang sama tidak bisa memaraf dua kali, dan paraf ditolak setelah lengkap', async () => {
  await withTx(fakeTx({ snapshot: SUBMITTED() }), async () => {
    await parafDocument('doc-1', {}, PEMARAF_A);
    await assert.rejects(parafDocument('doc-1', {}, PEMARAF_A), (e) => e.statusCode === 409 && /sudah membubuhkan/.test(e.message));
    await parafDocument('doc-1', {}, PEMARAF_B);
    const pemarafC = { id: 'u-pemaraf-c', name: 'Pemaraf C', roles: ['KEPALA_LPMQ'], isPemaraf: true };
    await assert.rejects(parafDocument('doc-1', {}, pemarafC), (e) => e.statusCode === 409 && /seluruh Pemaraf/.test(e.message));
  });
});

test('signDocument: Kepala berhasil menandatangani setelah kedua Pemaraf memaraf', async () => {
  await withTx(fakeTx({ snapshot: SUBMITTED(), signatories: [
    { id: 'sig-k', signer_user_id: KEPALA.id, name_position_snapshot: `${KEPALA.name} (${STT_KEPALA_TITLE})`, signing_status: 'PENDING' },
  ] }), async (state) => {
    await parafDocument('doc-1', {}, PEMARAF_A);
    await parafDocument('doc-1', {}, PEMARAF_B);
    await signDocument('doc-1', KEPALA);
    assert.ok(state.docUpdates.some((data) => data.status === 'ISSUED'));
  });
});

test('parafDocument: ditolak bila draf belum diserahkan', async () => {
  await withTx(fakeTx(), async () => {
    await assert.rejects(parafDocument('doc-1', {}, PEMARAF_A), (e) => e.statusCode === 409);
  });
});

test('signDocument: ditolak (409) sebelum diparaf Pemaraf, dan Pemaraf tidak dapat mengesahkan', async () => {
  await withTx(fakeTx({ snapshot: { tu_workflow: { submitted_at: '2026-11-16T00:00:00Z' } } }), async () => {
    await assert.rejects(signDocument('doc-1', KEPALA), (e) => e.statusCode === 409);
    await assert.rejects(signDocument('doc-1', PEMARAF_A), (e) => e.statusCode === 403);
  });
});

test('signDocument: Kepala dikenali dari baris jabatannya walau nama Pemaraf memuat "LPMQ" (regresi)', async () => {
  // Data nyata yang sebelumnya gagal: baris paraf "Pemaraf Uji LPMQ ..." ikut cocok dengan kata "LPMQ".
  const signatories = [
    { id: 'sig-p1', signer_user_id: PEMARAF_A.id, name_position_snapshot: 'Pemaraf Uji LPMQ (Penandatangan 1 - Tata Usaha (Paraf 1))', signing_status: 'SIGNED' },
    { id: 'sig-p2', signer_user_id: PEMARAF_B.id, name_position_snapshot: 'dr afdhal (Penandatangan 2 - Tata Usaha (Paraf 2))', signing_status: 'SIGNED' },
    { id: 'sig-k', signer_user_id: KEPALA.id, name_position_snapshot: `${KEPALA.name} (${STT_KEPALA_TITLE})`, signing_status: 'PENDING' },
  ];
  const snapshot = { tu_workflow: { submitted_at: '2026-11-16T00:00:00Z', paraf_1: { signed_by: { id: PEMARAF_A.id } }, paraf_2: { signed_by: { id: PEMARAF_B.id } } } };
  await withTx(fakeTx({ snapshot, signatories }), async (state) => {
    await signDocument('doc-1', KEPALA);
    assert.ok(state.docUpdates.some((data) => data.status === 'ISSUED'));
  });
});

test('signDocument: Kepala lain yang bukan penandatangan dokumen tetap ditolak', async () => {
  const signatories = [
    { id: 'sig-p', signer_user_id: PEMARAF_A.id, name_position_snapshot: 'Pemaraf Uji LPMQ (Pemaraf)', signing_status: 'SIGNED' },
    { id: 'sig-k', signer_user_id: KEPALA.id, name_position_snapshot: `${KEPALA.name} (${STT_KEPALA_TITLE})`, signing_status: 'PENDING' },
  ];
  const snapshot = { tu_workflow: { submitted_at: '2026-11-16T00:00:00Z', status: 'PARAF_COMPLETED', paraf_required: 1, parafs: [{ signed_by: { id: PEMARAF_A.id } }] } };
  await withTx(fakeTx({ snapshot, signatories }), async () => {
    await assert.rejects(signDocument('doc-1', { id: 'u-kepala-lain', name: 'Kepala Lain', roles: ['KEPALA_LPMQ'] }), (e) => e.statusCode === 403);
  });
});
