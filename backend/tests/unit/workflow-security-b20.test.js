import test from 'node:test';
import assert from 'node:assert/strict';
import {
  submitToTu,
  parafDocument,
  signDocument,
} from '../../src/services/official-document.service.js';
import {
  revokeAssignment,
  assertReadyForSttEligibility,
} from '../../src/services/distribution.service.js';
import { revokePentashihAssignmentSchema } from '../../src/validators/workflow.validator.js';
import { prisma } from '../../src/config/database.js';

test('B20-01: submitToTu menolak (409) jika draf STT sudah diserahkan ke TU sebelumnya atau sudah memiliki paraf', async () => {
  const docId = 'doc-b20-01';
  const caller = { id: 'u-dok-1', name: 'Dokumentator', roles: ['DOKUMENTATOR'] };

  const mockTx = {
    officialDocument: {
      findUnique: async () => ({
        id: docId,
        status: 'DRAFT',
        signatories: [],
        content_snapshot: {
          tu_workflow: {
            submitted_at: '2026-11-09T08:00:00.000Z',
            status: 'SUBMITTED_TO_TU',
          },
        },
      }),
    },
  };

  const origTx = prisma.$transaction;
  prisma.$transaction = async (fn) => fn(mockTx);

  try {
    await assert.rejects(
      async () => {
        await submitToTu(docId, {}, caller);
      },
      (err) => {
        assert.equal(err.statusCode, 409);
        assert.match(err.message, /sudah diserahkan ke Tata Usaha dan tidak dapat disubmit ulang/i);
        return true;
      }
    );

    // Kasus 1b: Ada paraf_1 terisi walaupun submitted_at tidak ada
    mockTx.officialDocument.findUnique = async () => ({
      id: docId,
      status: 'DRAFT',
      signatories: [],
      content_snapshot: {
        tu_workflow: {
          paraf_1: { signed_by: { id: 'u-tu-1' } },
        },
      },
    });

    await assert.rejects(
      async () => {
        await submitToTu(docId, {}, caller);
      },
      (err) => {
        assert.equal(err.statusCode, 409);
        assert.match(err.message, /sudah diserahkan ke Tata Usaha dan tidak dapat disubmit ulang/i);
        return true;
      }
    );
  } finally {
    prisma.$transaction = origTx;
  }
});

test('B20-02: submitToTu menolak (400) secara elegan jika akun Kepala LPMQ aktif tidak ditemukan', async () => {
  const docId = 'doc-b20-02';
  const caller = { id: 'u-dok-1', name: 'Dokumentator', roles: ['DOKUMENTATOR'] };
  const userTu1 = { id: 'u-tu-1', name: 'Staf TU 1', status: 'ACTIVE', roles: ['ADMIN_INTERNAL'] };
  const userTu2 = { id: 'u-tu-2', name: 'Staf TU 2', status: 'ACTIVE', roles: ['ADMIN_INTERNAL'] };

  const mockTx = {
    officialDocument: {
      findUnique: async () => ({
        id: docId,
        status: 'DRAFT',
        signatories: [],
        content_snapshot: {},
      }),
    },
    user: {
      findUnique: async ({ where }) => {
        if (where.id === 'u-tu-1') return userTu1;
        if (where.id === 'u-tu-2') return userTu2;
        return null;
      },
      findFirst: async () => null, // Tidak ada Kepala LPMQ aktif
    },
    userRole: {
      findFirst: async () => null,
    },
  };

  const origTx = prisma.$transaction;
  prisma.$transaction = async (fn) => fn(mockTx);

  try {
    await assert.rejects(
      async () => {
        await submitToTu(docId, { signer_1_id: 'u-tu-1', signer_2_id: 'u-tu-2' }, caller);
      },
      (err) => {
        assert.equal(err.statusCode, 400);
        assert.match(err.message, /Akun Kepala LPMQ aktif tidak ditemukan pada sistem/i);
        return true;
      }
    );
  } finally {
    prisma.$transaction = origTx;
  }
});

test('B20-03: submitToTu menolak akun pemaraf berstatus INACTIVE atau SUSPENDED (status !== ACTIVE)', async () => {
  const docId = 'doc-b20-03';
  const caller = { id: 'u-dok-1', name: 'Dokumentator', roles: ['DOKUMENTATOR'] };
  const activeUser = { id: 'u-tu-1', name: 'Staf TU 1', status: 'ACTIVE', roles: ['ADMIN_INTERNAL'] };
  const inactiveUser = { id: 'u-inactive', name: 'Staf Tidak Aktif', status: 'INACTIVE', roles: ['ADMIN_INTERNAL'] };
  const suspendedUser = { id: 'u-suspended', name: 'Staf Ditangguhkan', status: 'SUSPENDED', roles: ['ADMIN_INTERNAL'] };
  const kepalaUser = { id: 'u-kepala', name: 'Kepala LPMQ', status: 'ACTIVE', roles: ['KEPALA_LPMQ'] };

  const mockTx = {
    officialDocument: {
      findUnique: async () => ({
        id: docId,
        status: 'DRAFT',
        signatories: [],
        content_snapshot: {},
      }),
    },
    user: {
      findUnique: async ({ where }) => {
        if (where.id === 'u-tu-1') return activeUser;
        if (where.id === 'u-inactive') return inactiveUser;
        if (where.id === 'u-suspended') return suspendedUser;
        return null;
      },
      findFirst: async () => kepalaUser,
    },
    userRole: {
      findFirst: async () => ({ user: kepalaUser }),
    },
  };

  const origTx = prisma.$transaction;
  prisma.$transaction = async (fn) => fn(mockTx);

  try {
    // 1. INACTIVE
    await assert.rejects(
      async () => {
        await submitToTu(docId, { signer_1_id: 'u-inactive', signer_2_id: 'u-tu-1' }, caller);
      },
      (err) => {
        assert.equal(err.statusCode, 400);
        assert.match(err.message, /berstatus tidak aktif/i);
        return true;
      }
    );

    // 2. SUSPENDED
    await assert.rejects(
      async () => {
        await submitToTu(docId, { signer_1_id: 'u-tu-1', signer_2_id: 'u-suspended' }, caller);
      },
      (err) => {
        assert.equal(err.statusCode, 400);
        assert.match(err.message, /berstatus tidak aktif/i);
        return true;
      }
    );
  } finally {
    prisma.$transaction = origTx;
  }
});

test('B20-04: parafDocument menolak SUPERADMIN membubuhkan Paraf 1 dan Paraf 2 sekaligus (four-eyes tanpa bypass)', async () => {
  const docId = 'doc-b20-04';
  const superadminUser = { id: 'u-superadmin-1', name: 'Super Administrator', roles: ['SUPERADMIN', 'ADMIN_INTERNAL'] };

  const mockTx = {
    officialDocument: {
      findUnique: async () => ({
        id: docId,
        status: 'DRAFT',
        signatories: [
          { id: 'sig-1', signer_user_id: superadminUser.id, name_position_snapshot: 'Paraf 1', signing_status: 'SIGNED' },
          { id: 'sig-2', signer_user_id: 'u-tu-2', name_position_snapshot: 'Paraf 2', signing_status: 'PENDING' },
        ],
        content_snapshot: {
          tu_workflow: {
            submitted_at: '2026-11-09T08:00:00.000Z',
            status: 'SUBMITTED_TO_TU',
            paraf_1: {
              signed_by: { id: superadminUser.id, name: superadminUser.name, nip: '19800101' },
              signed_at: '2026-11-09T08:05:00.000Z',
            },
          },
        },
      }),
    },
  };

  const origTx = prisma.$transaction;
  prisma.$transaction = async (fn) => fn(mockTx);

  try {
    await assert.rejects(
      async () => {
        // Superadmin yang sama mencoba membubuhkan Paraf 2
        await parafDocument(docId, 2, { notes: 'Mencoba bypass dual control' }, superadminUser);
      },
      (err) => {
        assert.equal(err.statusCode, 409);
        assert.match(err.message, /harus dibubuhkan oleh dua orang staf Tata Usaha yang berbeda/i);
        return true;
      }
    );
  } finally {
    prisma.$transaction = origTx;
  }
});

test('B20-05: Alur pool TU mode: tanpa penetapan ID saat submit, Staf TU A dapat paraf 1 dan Staf TU B dapat paraf 2', async () => {
  const docId = 'doc-b20-05';
  const callerDokumentator = { id: 'u-dok-1', name: 'Dokumentator', roles: ['DOKUMENTATOR'] };
  const tuStaffA = { id: 'u-tu-a', name: 'Staf TU Pertama', status: 'ACTIVE', roles: ['ADMIN_INTERNAL'] };
  const tuStaffB = { id: 'u-tu-b', name: 'Staf TU Kedua', status: 'ACTIVE', roles: ['ADMIN_INTERNAL'] };
  const kepalaUser = { id: 'u-kepala-1', name: 'Kepala LPMQ Definitif', status: 'ACTIVE', roles: ['KEPALA_LPMQ'] };

  let currentDoc = {
    id: docId,
    status: 'DRAFT',
    signatories: [],
    content_snapshot: {},
  };

  const createdSigs = [];
  const mockTx = {
    officialDocument: {
      findUnique: async () => currentDoc,
      update: async ({ data }) => {
        currentDoc = { ...currentDoc, ...data };
        return currentDoc;
      },
    },
    user: {
      findUnique: async ({ where }) => {
        if (where.id === 'u-tu-a') return tuStaffA;
        if (where.id === 'u-tu-b') return tuStaffB;
        if (where.id === 'u-kepala-1') return kepalaUser;
        return null;
      },
      findFirst: async ({ where }) => {
        if (where?.roles?.some?.role?.code === 'KEPALA_LPMQ') return kepalaUser;
        if (where?.roles?.some?.role?.code === 'ADMIN_INTERNAL') return tuStaffA;
        if (where?.id?.not === 'u-tu-a') return tuStaffB;
        return null;
      },
    },
    userRole: {
      findFirst: async ({ where }) => {
        if (where?.role?.code === 'KEPALA_LPMQ') return { user: kepalaUser };
        if (where?.role?.code === 'ADMIN_INTERNAL') return { user: tuStaffA };
        return { user: tuStaffB };
      },
    },
    documentSignatory: {
      create: async ({ data }) => {
        const sig = { id: `sig-${createdSigs.length + 1}`, ...data };
        createdSigs.push(sig);
        currentDoc.signatories.push(sig);
        return sig;
      },
      update: async ({ where, data }) => {
        const sig = currentDoc.signatories.find(s => s.id === where.id);
        if (sig) Object.assign(sig, data);
        return sig;
      },
    },
    auditLog: {
      create: async () => ({ id: 'audit-1' }),
    },
  };

  const origTx = prisma.$transaction;
  prisma.$transaction = async (fn) => fn(mockTx);

  try {
    // 1. Submit ke TU tanpa signer_1_id dan signer_2_id (Pool TU Mode)
    const submitted = await submitToTu(docId, {}, callerDokumentator);
    assert.ok(submitted);
    assert.equal(currentDoc.content_snapshot.tu_workflow.status, 'SUBMITTED_TO_TU');
    assert.equal(currentDoc.content_snapshot.tu_workflow.pool_mode, true);
    assert.equal(currentDoc.content_snapshot.tu_workflow.designated_signers.paraf_1, null);
    assert.equal(currentDoc.content_snapshot.tu_workflow.designated_signers.paraf_2, null);

    // 2. Staf TU A membubuhkan Paraf 1
    const p1 = await parafDocument(docId, 1, { notes: 'Paraf 1 oleh Staf TU A' }, tuStaffA);
    assert.ok(p1.content_snapshot.tu_workflow.paraf_1);
    assert.equal(p1.content_snapshot.tu_workflow.paraf_1.signed_by.id, 'u-tu-a');
    assert.equal(currentDoc.signatories[0].signer_user_id, 'u-tu-a');
    assert.equal(currentDoc.signatories[0].signing_status, 'SIGNED');

    // 3. Staf TU A mencoba memaraf Paraf 2 -> Wajib ditolak dual control (409)
    await assert.rejects(
      async () => {
        await parafDocument(docId, 2, { notes: 'Staf TU A mencoba paraf 2' }, tuStaffA);
      },
      (err) => {
        assert.equal(err.statusCode, 409);
        return true;
      }
    );

    // 4. Staf TU B membubuhkan Paraf 2 -> Sukses
    const p2 = await parafDocument(docId, 2, { notes: 'Paraf 2 oleh Staf TU B' }, tuStaffB);
    assert.ok(p2.content_snapshot.tu_workflow.paraf_2);
    assert.equal(p2.content_snapshot.tu_workflow.paraf_2.signed_by.id, 'u-tu-b');
    assert.equal(p2.content_snapshot.tu_workflow.status, 'PARAF_COMPLETED');
    assert.equal(currentDoc.signatories[1].signer_user_id, 'u-tu-b');
    assert.equal(currentDoc.signatories[1].signing_status, 'SIGNED');
  } finally {
    prisma.$transaction = origTx;
  }
});

test('B20-06: revokeAssignment menolak role ADMIN_INTERNAL (403) dan menolak alasan < 10 karakter', async () => {
  const asgId = 'asg-test-b20-06';
  const adminTu = { id: 'u-tu-1', name: 'Staf TU', roles: ['ADMIN_INTERNAL'] };
  const distributorUser = { id: 'u-dist-1', name: 'Distributor', roles: ['DISTRIBUTOR'] };

  const mockTx = {
    assignment: {
      findUnique: async () => ({
        id: asgId,
        registration_id: 'reg-1',
        status: 'ASSIGNED',
        registration: { id: 'reg-1', status: 'TASHIH_IN_PROGRESS' },
        assignee: { id: 'u-pentashih-1', name: 'Pentashih' },
        juz_items: [{ juz_number: 1 }],
      }),
      update: async ({ data }) => ({ id: asgId, ...data }),
    },
    auditLog: {
      create: async () => ({ id: 'audit-1' }),
    },
  };

  const origTx = prisma.$transaction;
  prisma.$transaction = async (fn) => fn(mockTx);

  try {
    // 1. ADMIN_INTERNAL ditolak dari pencabutan penugasan (403)
    await assert.rejects(
      async () => {
        await revokeAssignment(asgId, { reason: 'Pencabutan oleh staf TU' }, adminTu);
      },
      (err) => {
        assert.equal(err.statusCode, 403);
        assert.match(err.message, /distributor atau administrator sistem/i);
        return true;
      }
    );

    // 2. Skema Zod revokePentashihAssignmentSchema menolak alasan < 10 karakter
    const shortReason = revokePentashihAssignmentSchema.body.safeParse({ reason: 'Sakit 123' }); // 9 karakter
    assert.equal(shortReason.success, false);
    assert.match(shortReason.error.issues[0].message, /minimal 10 karakter/i);

    const validReason = revokePentashihAssignmentSchema.body.safeParse({ reason: 'Cuti dinas luar kota' }); // 20 karakter
    assert.equal(validReason.success, true);

    // 3. Distributor dengan alasan >= 10 karakter berhasil
    const result = await revokeAssignment(asgId, { reason: 'Cuti dinas luar kota' }, distributorUser);
    assert.ok(result);
    assert.equal(result.success, true);
    assert.equal(result.assignment.status, 'REVOKED');
  } finally {
    prisma.$transaction = origTx;
  }
});

test('B20-07: assertReadyForSttEligibility memuat query tanpa duplikasi key dan memvalidasi siklus DUMMY', async () => {
  const regId = 'reg-b20-07';

  let findManyCalled = false;
  let findManyArgs = null;

  const mockTx = {
    assignment: {
      findFirst: async () => ({
        iteration: 2,
        stage: 'DUMMY',
      }),
      findMany: async (args) => {
        findManyCalled = true;
        findManyArgs = args;
        return [
          {
            id: 'asg-1',
            status: 'COMPLETED',
            reviews: [
              { result: 'PASSED', recap_file_id: 'recap-uuid-1', recap_scope: 'SELF' },
            ],
            juz_items: [{ juz_number: 1 }],
          },
        ];
      },
    },
  };

  const res = await assertReadyForSttEligibility(mockTx, regId);
  assert.equal(res.lastIteration, 2);
  assert.equal(findManyCalled, true);
  // Pastikan include memuat reviews dan juz_items secara bersih
  assert.deepEqual(findManyArgs.include, { reviews: true, juz_items: true });
});
