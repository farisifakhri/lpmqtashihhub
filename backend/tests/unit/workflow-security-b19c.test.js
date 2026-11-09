import test from 'node:test';
import assert from 'node:assert/strict';
import {
  submitToTu,
  parafDocument,
  signDocument,
} from '../../src/services/official-document.service.js';
import { prisma } from '../../src/config/database.js';

test('B19C-01: submitToTu menolak jika signer_1_id dan signer_2_id sama atau menugaskan akun Kepala LPMQ', async () => {
  const docId = 'doc-b19c-01';
  const userStaffTu = { id: 'u-tu-1', name: 'Staf TU 1', roles: ['ADMIN_INTERNAL'] };
  const userKepala = { id: 'u-kepala-1', name: 'Kepala LPMQ', roles: ['KEPALA_LPMQ'] };

  const mockTx = {
    officialDocument: {
      findUnique: async () => ({
        id: docId,
        status: 'DRAFT',
        signatories: [],
      }),
    },
    user: {
      findUnique: async ({ where }) => {
        if (where.id === 'u-tu-1') return userStaffTu;
        if (where.id === 'u-kepala-1') return userKepala;
        return null;
      },
    },
    userRole: {
      findFirst: async () => ({ user: userKepala }),
    },
  };

  const origTx = prisma.$transaction;
  prisma.$transaction = async (fn) => fn(mockTx);

  try {
    const caller = { id: 'u-dist-1', name: 'Distributor 1', roles: ['DISTRIBUTOR'] };

    // 1. Menolak jika signer_1_id dan signer_2_id bernilai sama
    await assert.rejects(
      async () => {
        await submitToTu(docId, { signer_1_id: 'u-tu-1', signer_2_id: 'u-tu-1' }, caller);
      },
      (err) => {
        assert.equal(err.statusCode, 400);
        assert.match(err.message, /dua orang yang berbeda/i);
        return true;
      }
    );

    // 2. Menolak jika akun yang ditugaskan memiliki wewenang murni Kepala LPMQ (tanpa hak akses TU)
    await assert.rejects(
      async () => {
        await submitToTu(docId, { signer_1_id: 'u-kepala-1', signer_2_id: 'u-tu-1' }, caller);
      },
      (err) => {
        assert.equal(err.statusCode, 400);
        assert.match(err.message, /Tata Usaha|Kepala LPMQ/i);
        return true;
      }
    );
  } finally {
    prisma.$transaction = origTx;
  }
});

test('B19C-02: submitToTu berhasil mendaftarkan dua staf TU berbeda dan mencatat penyerahan SUBMITTED_TO_TU', async () => {
  const docId = 'doc-b19c-02';
  const userTu1 = { id: 'u-tu-1', name: 'Staf TU Pertama', roles: ['ADMIN_INTERNAL'] };
  const userTu2 = { id: 'u-tu-2', name: 'Staf TU Kedua', roles: ['ADMIN_INTERNAL'] };
  const userKepala = { id: 'u-kepala-1', name: 'Dr. H. Abdul Aziz Sidqi, M.Ag.', roles: ['KEPALA_LPMQ'] };

  const createdSigs = [];
  let updatedDocData = null;

  const mockTx = {
    officialDocument: {
      findUnique: async () => ({
        id: docId,
        status: 'DRAFT',
        signatories: [],
        content_snapshot: {},
      }),
      update: async ({ data }) => {
        updatedDocData = data;
        return { id: docId, ...data };
      },
    },
    user: {
      findUnique: async ({ where }) => {
        if (where.id === 'u-tu-1') return userTu1;
        if (where.id === 'u-tu-2') return userTu2;
        return null;
      },
    },
    userRole: {
      findFirst: async ({ where }) => {
        if (where.role.code === 'KEPALA_LPMQ') return { user: userKepala };
        if (where.role.code === 'ADMIN_INTERNAL') return { user: userTu1 };
        return { user: userTu2 };
      },
    },
    documentSignatory: {
      create: async ({ data }) => {
        createdSigs.push(data);
        return { id: `sig-${createdSigs.length}`, ...data };
      },
    },
    auditLog: {
      create: async () => ({ id: 'audit-1' }),
    },
  };

  const origTx = prisma.$transaction;
  prisma.$transaction = async (fn) => fn(mockTx);

  try {
    const callerDokumentator = { id: 'u-dok-1', name: 'Dokumentator', roles: ['DOKUMENTATOR'] };
    const result = await submitToTu(docId, { signer_1_id: 'u-tu-1', signer_2_id: 'u-tu-2' }, callerDokumentator);

    assert.ok(result);
    assert.equal(createdSigs.length, 3);
    assert.equal(createdSigs[0].signer_user_id, 'u-tu-1');
    assert.equal(createdSigs[1].signer_user_id, 'u-tu-2');
    assert.equal(createdSigs[2].signer_user_id, 'u-kepala-1');

    const tuWf = updatedDocData.content_snapshot.tu_workflow;
    assert.equal(tuWf.status, 'SUBMITTED_TO_TU');
    assert.ok(tuWf.submitted_at);
    assert.equal(tuWf.designated_signers.paraf_1.id, 'u-tu-1');
    assert.equal(tuWf.designated_signers.paraf_2.id, 'u-tu-2');
  } finally {
    prisma.$transaction = origTx;
  }
});

test('B19C-03: parafDocument menolak eksekusi jika draf STT belum diserahkan ke TU', async () => {
  const docId = 'doc-b19c-03';

  const mockTx = {
    officialDocument: {
      findUnique: async () => ({
        id: docId,
        status: 'DRAFT',
        signatories: [
          { id: 'sig-1', signer_user_id: 'u-tu-1', name_position_snapshot: 'Paraf 1', signing_status: 'PENDING' },
        ],
        content_snapshot: {}, // Belum disubmit ke TU
      }),
    },
  };

  const origTx = prisma.$transaction;
  prisma.$transaction = async (fn) => fn(mockTx);

  try {
    const callerTu = { id: 'u-tu-1', name: 'Staf TU 1', roles: ['ADMIN_INTERNAL'] };

    await assert.rejects(
      async () => {
        await parafDocument(docId, 1, {}, callerTu);
      },
      (err) => {
        assert.equal(err.statusCode, 409);
        assert.match(err.message, /belum diteruskan ke Tata Usaha/i);
        return true;
      }
    );
  } finally {
    prisma.$transaction = origTx;
  }
});

test('B19C-04: parafDocument menolak pembubuhan Paraf 2 sebelum Paraf 1 diselesaikan (penegakan sekuensial)', async () => {
  const docId = 'doc-b19c-04';

  const mockTx = {
    officialDocument: {
      findUnique: async () => ({
        id: docId,
        status: 'DRAFT',
        signatories: [
          { id: 'sig-1', signer_user_id: 'u-tu-1', name_position_snapshot: 'Paraf 1', signing_status: 'PENDING' },
          { id: 'sig-2', signer_user_id: 'u-tu-2', name_position_snapshot: 'Paraf 2', signing_status: 'PENDING' },
        ],
        content_snapshot: {
          tu_workflow: {
            submitted_at: '2026-11-09T08:00:00Z',
            status: 'SUBMITTED_TO_TU',
            // paraf_1 belum ada
          },
        },
      }),
    },
  };

  const origTx = prisma.$transaction;
  prisma.$transaction = async (fn) => fn(mockTx);

  try {
    const callerTu2 = { id: 'u-tu-2', name: 'Staf TU 2', roles: ['ADMIN_INTERNAL'] };

    await assert.rejects(
      async () => {
        await parafDocument(docId, 2, {}, callerTu2);
      },
      (err) => {
        assert.equal(err.statusCode, 409);
        assert.match(err.message, /Paraf 1 harus diselesaikan terlebih dahulu/i);
        return true;
      }
    );
  } finally {
    prisma.$transaction = origTx;
  }
});

test('B19C-05: parafDocument menolak staf yang sama membubuhkan Paraf 1 dan Paraf 2 (penegakan dual control)', async () => {
  const docId = 'doc-b19c-05';
  const sameTuUser = { id: 'u-tu-1', name: 'Staf TU Rangkap', roles: ['ADMIN_INTERNAL'] };

  const mockTx = {
    officialDocument: {
      findUnique: async () => ({
        id: docId,
        status: 'DRAFT',
        signatories: [
          { id: 'sig-1', signer_user_id: 'u-tu-1', name_position_snapshot: 'Paraf 1', signing_status: 'SIGNED' },
          { id: 'sig-2', signer_user_id: 'u-tu-1', name_position_snapshot: 'Paraf 2', signing_status: 'PENDING' },
        ],
        content_snapshot: {
          tu_workflow: {
            submitted_at: '2026-11-09T08:00:00Z',
            status: 'SUBMITTED_TO_TU',
            paraf_1: {
              signed_by: { id: 'u-tu-1', name: 'Staf TU Rangkap' },
              signed_at: '2026-11-09T08:30:00Z',
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
        await parafDocument(docId, 2, {}, sameTuUser);
      },
      (err) => {
        assert.equal(err.statusCode, 409);
        assert.match(err.message, /dua orang staf Tata Usaha yang berbeda|dual-control/i);
        return true;
      }
    );
  } finally {
    prisma.$transaction = origTx;
  }
});

test('B19C-06: parafDocument menolak pemanggil yang bukan pemaraf yang ditetapkan untuk slot tersebut (caller identity mismatch)', async () => {
  const docId = 'doc-b19c-06';
  const designatedTu1 = { id: 'u-tu-designated-1', name: 'Staf Ditugaskan', roles: ['ADMIN_INTERNAL'] };
  const intruderTu = { id: 'u-tu-intruder', name: 'Staf Lain', roles: ['ADMIN_INTERNAL'] };

  const mockTx = {
    officialDocument: {
      findUnique: async () => ({
        id: docId,
        status: 'DRAFT',
        signatories: [
          { id: 'sig-1', signer_user_id: designatedTu1.id, name_position_snapshot: 'Paraf 1', signing_status: 'PENDING' },
        ],
        content_snapshot: {
          tu_workflow: {
            submitted_at: '2026-11-09T08:00:00Z',
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
        await parafDocument(docId, 1, {}, intruderTu);
      },
      (err) => {
        assert.equal(err.statusCode, 403);
        assert.match(err.message, /Anda tidak terdaftar sebagai penandatangan/i);
        return true;
      }
    );
  } finally {
    prisma.$transaction = origTx;
  }
});

test('B19C-07: parafDocument menolak akun dengan peran murni KEPALA_LPMQ', async () => {
  const docId = 'doc-b19c-07';
  const userKepala = { id: 'u-kepala', name: 'Kepala LPMQ', roles: ['KEPALA_LPMQ'] };

  const mockTx = {
    officialDocument: {
      findUnique: async () => ({
        id: docId,
        status: 'DRAFT',
        signatories: [],
      }),
    },
  };

  const origTx = prisma.$transaction;
  prisma.$transaction = async (fn) => fn(mockTx);

  try {
    await assert.rejects(
      async () => {
        await parafDocument(docId, 1, {}, userKepala);
      },
      (err) => {
        assert.equal(err.statusCode, 403);
        assert.match(err.message, /Tindakan ini hanya dapat dilakukan|Peran tidak memiliki izin|Akses ditolak/i);
        return true;
      }
    );
  } finally {
    prisma.$transaction = origTx;
  }
});

test('B19C-08: signDocument menolak tanda tangan jika pemaraf dan Kepala LPMQ adalah akun yang sama', async () => {
  const docId = 'doc-b19c-08';
  const conflictKepalaUser = { id: 'u-dual-role', name: 'Kepala Rangkap', roles: ['KEPALA_LPMQ'] };

  const mockTx = {
    officialDocument: {
      findUnique: async () => ({
        id: docId,
        document_no: 'DRAFT-STT-1111',
        document_type: 'SURAT_TANDA_TASHIH',
        status: 'DRAFT',
        registration_id: 'reg-01',
        signatories: [
          { id: 'sig-1', signer_user_id: 'u-dual-role', name_position_snapshot: 'Paraf 1', signing_status: 'SIGNED' },
          { id: 'sig-2', signer_user_id: 'u-tu-2', name_position_snapshot: 'Paraf 2', signing_status: 'SIGNED' },
          { id: 'sig-3', signer_user_id: 'u-dual-role', name_position_snapshot: 'Kepala LPMQ', signing_status: 'PENDING' },
        ],
        content_snapshot: {
          tu_workflow: {
            paraf_1: { signed_by: { id: 'u-dual-role', name: 'Kepala Rangkap' }, signed_at: '2026-11-09T08:00:00Z' },
            paraf_2: { signed_by: { id: 'u-tu-2', name: 'Staf TU 2' }, signed_at: '2026-11-09T08:30:00Z' },
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
        await signDocument(docId, conflictKepalaUser);
      },
      (err) => {
        assert.equal(err.statusCode, 409);
        assert.match(err.message, /Kepala LPMQ tidak dapat mengesahkan dokumen yang diparaf oleh akunnya sendiri/i);
        return true;
      }
    );
  } finally {
    prisma.$transaction = origTx;
  }
});

test('B19C-09: Alur lengkap STT: submitToTu -> Paraf 1 (TU A) -> Paraf 2 (TU B) -> Sign (Kepala LPMQ) berhasil 100%', async () => {
  const docId = 'doc-b19c-09';
  const regId = 'reg-b19c-09';

  const userTu1 = { id: 'u-tu-a', name: 'Staf TU Pertama', nip: '19850101', roles: ['ADMIN_INTERNAL'] };
  const userTu2 = { id: 'u-tu-b', name: 'Staf TU Kedua', nip: '19870202', roles: ['ADMIN_INTERNAL'] };
  const userKepala = { id: 'u-kepala-definitif', name: 'Dr. H. Abdul Aziz Sidqi, M.Ag.', roles: ['KEPALA_LPMQ'] };
  const userDokumentator = { id: 'u-dok-1', name: 'Dokumentator', roles: ['DOKUMENTATOR'] };

  let currentDoc = {
    id: docId,
    document_no: 'DRAFT-STT-ABC123',
    document_type: 'SURAT_TANDA_TASHIH',
    status: 'DRAFT',
    registration_id: regId,
    signatories: [],
    content_snapshot: { title: 'Mushaf Al-Qur\'an Standar Indonesia' },
  };

  let regStatus = 'READY_FOR_STT';

  const mockTx = {
    $queryRaw: async () => [{ id: regId }],
    officialDocument: {
      findUnique: async () => currentDoc,
      update: async ({ data }) => {
        currentDoc = { ...currentDoc, ...data };
        return currentDoc;
      },
    },
    user: {
      findUnique: async ({ where }) => {
        if (where.id === 'u-tu-a') return userTu1;
        if (where.id === 'u-tu-b') return userTu2;
        if (where.id === 'u-kepala-definitif') return userKepala;
        return null;
      },
    },
    userRole: {
      findFirst: async ({ where }) => {
        if (where.role.code === 'KEPALA_LPMQ') return { user: userKepala };
        if (where.role.code === 'ADMIN_INTERNAL') return { user: userTu1 };
        return { user: userTu2 };
      },
    },
    documentSignatory: {
      create: async ({ data }) => {
        const item = { id: `sig-${currentDoc.signatories.length + 1}`, ...data };
        currentDoc.signatories.push(item);
        return item;
      },
      update: async ({ where, data }) => {
        const sig = currentDoc.signatories.find(s => s.id === where.id);
        if (sig) Object.assign(sig, data);
        return sig;
      },
    },
    registration: {
      findUnique: async () => ({
        id: regId,
        registration_no: 'REG-2026-0099',
        status: regStatus,
        title: 'Mushaf Al-Qur\'an Standar Indonesia',
        publisher_id: 'pub-1',
      }),
      updateMany: async ({ data }) => {
        regStatus = data.status;
        return { count: 1 };
      },
    },
    statusHistory: {
      create: async () => ({ id: 'hist-1' }),
    },
    publisher: {
      findUnique: async () => ({ user_id: 'u-pub-1' }),
    },
    notification: {
      create: async () => ({ id: 'notif-1' }),
    },
    auditLog: {
      create: async () => ({ id: 'audit-1' }),
    },
  };

  const origTx = prisma.$transaction;
  prisma.$transaction = async (fn) => fn(mockTx);

  try {
    // 1. Submit ke TU
    const subRes = await submitToTu(docId, { signer_1_id: userTu1.id, signer_2_id: userTu2.id }, userDokumentator);
    assert.ok(subRes);
    assert.equal(currentDoc.content_snapshot.tu_workflow.status, 'SUBMITTED_TO_TU');
    assert.equal(currentDoc.signatories.length, 3);

    // 2. Paraf 1 oleh Staf TU 1
    const p1Res = await parafDocument(docId, 1, { notes: 'Format dumi sesuai' }, userTu1);
    assert.ok(p1Res);
    assert.equal(currentDoc.content_snapshot.tu_workflow.paraf_1.signed_by.id, userTu1.id);
    assert.equal(currentDoc.signatories[0].signing_status, 'SIGNED');

    // 3. Paraf 2 oleh Staf TU 2
    const p2Res = await parafDocument(docId, 2, { notes: 'Penetapan disetujui' }, userTu2);
    assert.ok(p2Res);
    assert.equal(currentDoc.content_snapshot.tu_workflow.paraf_2.signed_by.id, userTu2.id);
    assert.equal(currentDoc.content_snapshot.tu_workflow.status, 'PARAF_COMPLETED');
    assert.equal(currentDoc.signatories[1].signing_status, 'SIGNED');

    // 4. Tanda Tangan Definitif oleh Kepala LPMQ
    const signRes = await signDocument(docId, userKepala);
    assert.ok(signRes);
    assert.equal(currentDoc.status, 'ISSUED');
    assert.ok(currentDoc.document_no.startsWith('STT/LPMQ/'));
    assert.equal(regStatus, 'STT_ISSUED');
    assert.equal(currentDoc.signatories[2].signing_status, 'SIGNED');
  } finally {
    prisma.$transaction = origTx;
  }
});
