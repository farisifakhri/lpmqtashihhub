import test from 'node:test';
import assert from 'node:assert/strict';
import {
  TRANSITION_POLICY,
  transitionStatus,
} from '../../src/services/registration.service.js';
import {
  createDocument,
  submitToTu,
  parafDocument,
  signDocument,
} from '../../src/services/official-document.service.js';
import { recordDocumentationArchive } from '../../src/services/documentation.service.js';
import { prisma } from '../../src/config/database.js';

test('B18-01: Transisi READY_FOR_STT ke STT_ISSUED via generic transition ditolak (penegakan domainAction: true)', async () => {
  const regId = 'reg-b18-01';

  // Periksa deklarasi di TRANSITION_POLICY
  assert.equal(
    TRANSITION_POLICY.READY_FOR_STT.STT_ISSUED.domainAction,
    true,
    'Transisi READY_FOR_STT -> STT_ISSUED harus memiliki domainAction: true'
  );

  const mockTx = {
    $queryRaw: async () => [{ id: regId }],
    registration: {
      findUnique: async () => ({
        id: regId,
        status: 'READY_FOR_STT',
        title: 'Mushaf Al-Qur\'an',
      }),
      updateMany: async () => ({ count: 1 }),
    },
    statusHistory: {
      create: async () => ({ id: 'hist-1' }),
    },
    auditLog: {
      create: async () => ({ id: 'audit-1' }),
    },
  };

  const origTx = prisma.$transaction;
  prisma.$transaction = async (fn) => fn(mockTx);

  try {
    // Mencoba generic transition status dari READY_FOR_STT ke STT_ISSUED
    await assert.rejects(
      async () => {
        await transitionStatus(
          regId,
          'STT_ISSUED',
          'Bypass TTE',
          { id: 'user-kepala', roles: ['KEPALA_LPMQ'] }
        );
      },
      (err) => {
        assert.equal(err.statusCode, 409);
        assert.match(err.message, /Gunakan aksi submit|dokumen resmi|transisi/i);
        return true;
      }
    );
  } finally {
    prisma.$transaction = origTx;
  }
});

test('B18-02: Dokumentator berwenang membuat draf STT (createDocument) pada status READY_FOR_STT', async () => {
  const regId = 'reg-b18-02';
  let createdDocData = null;

  const mockTx = {
    $queryRaw: async () => [{ id: regId }],
    registration: {
      findUnique: async () => ({
        id: regId,
        registration_no: 'REG-202611-0088',
        title: 'Mushaf Utsmani Standar',
        status: 'READY_FOR_STT',
        created_at: new Date('2026-11-01'),
        foreign_metadata: {
          nomor_surat_permohonan: '01/PUB/XI/2026',
          sizes: [{ ukuran: 'A5', oplah: 5000 }],
        },
        publisher: { legal_name: 'PT Pustaka Quran' },
      }),
    },
    paymentRecord: {
      findFirst: async () => ({ id: 'pay-1', status: 'VERIFIED' }),
    },
    officialDocument: {
      findFirst: async () => null,
      create: async ({ data }) => {
        createdDocData = data;
        return { id: 'doc-stt-draft-01', ...data };
      },
    },
    auditLog: {
      create: async () => ({ id: 'audit-1' }),
    },
  };

  const origTx = prisma.$transaction;
  prisma.$transaction = async (fn) => fn(mockTx);

  try {
    const userDokumentator = {
      id: 'user-dok-1',
      name: 'Dokumentator LPMQ',
      roles: ['DOKUMENTATOR'],
    };

    const doc = await createDocument(regId, { document_type: 'SURAT_TANDA_TASHIH' }, userDokumentator);
    assert.ok(doc);
    assert.equal(createdDocData.document_type, 'SURAT_TANDA_TASHIH');
    assert.ok(createdDocData.document_no.startsWith('DRAFT-'));
    assert.equal(createdDocData.content_snapshot.title, 'Mushaf Utsmani Standar');
    assert.equal(createdDocData.content_snapshot.total_oplah, 5000);
  } finally {
    prisma.$transaction = origTx;
  }
});

test('B18-03: Dokumentator berhasil meneruskan draf STT ke Tata Usaha (submitToTu)', async () => {
  const docId = 'doc-stt-draft-01';
  let updatedDocData = null;
  const createdSigs = [];

  const mockTx = {
    officialDocument: {
      findUnique: async () => ({
        id: docId,
        document_type: 'SURAT_TANDA_TASHIH',
        status: 'DRAFT',
        registration_id: 'reg-b18-03',
        signatories: [],
        content_snapshot: {},
      }),
      update: async ({ data }) => {
        updatedDocData = data;
        return { id: docId, ...data };
      },
    },
    userRole: {
      findFirst: async ({ where }) => {
        if (where.role.code === 'KEPALA_LPMQ') return { user: { id: 'u-kepala', name: 'Dr. H. Abdul Aziz Sidqi, M.Ag.' } };
        if (where.role.code === 'ADMIN_INTERNAL') return { user: { id: 'u-tu1', name: 'Staf TU 1' } };
        return { user: { id: 'u-tu2', name: 'Staf TU 2' } };
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
    const userDokumentator = {
      id: 'user-dok-1',
      name: 'Dokumentator LPMQ',
      roles: ['DOKUMENTATOR'],
    };

    const result = await submitToTu(docId, {}, userDokumentator);
    assert.ok(result);
    assert.equal(createdSigs.length, 3);
    assert.equal(updatedDocData.content_snapshot.tu_workflow.status, 'SUBMITTED_TO_TU');
  } finally {
    prisma.$transaction = origTx;
  }
});

test('B18-04: Pembubuhan Paraf 1 dan Paraf 2 oleh staf Tata Usaha berhasil dan tercatat di tu_workflow', async () => {
  const docId = 'doc-stt-draft-01';
  const existingSigs = [
    { id: 'sig-1', name_position_snapshot: 'Staf TU 1 (Penandatangan 1 - Tata Usaha (Paraf 1))', signing_status: 'PENDING' },
    { id: 'sig-2', name_position_snapshot: 'Staf TU 2 (Penandatangan 2 - Tata Usaha (Paraf 2))', signing_status: 'PENDING' },
    { id: 'sig-3', name_position_snapshot: 'Kepala LPMQ', signing_status: 'PENDING' },
  ];

  let currentSnapshot = { tu_workflow: { status: 'SUBMITTED_TO_TU' } };

  const mockTx = {
    officialDocument: {
      findUnique: async () => ({
        id: docId,
        status: 'DRAFT',
        signatories: existingSigs,
        content_snapshot: currentSnapshot,
      }),
      update: async ({ data }) => {
        currentSnapshot = data.content_snapshot;
        return { id: docId, content_snapshot: currentSnapshot, signatories: existingSigs };
      },
    },
    documentSignatory: {
      update: async ({ where, data }) => {
        const target = existingSigs.find(s => s.id === where.id);
        if (target) Object.assign(target, data);
        return target;
      },
    },
    auditLog: {
      create: async () => ({ id: 'audit-1' }),
    },
  };

  const origTx = prisma.$transaction;
  prisma.$transaction = async (fn) => fn(mockTx);

  try {
    const userTu1 = { id: 'u-tu1', name: 'Ahmad Fauzi', nip: '198501012010011001', roles: ['ADMIN_INTERNAL'] };
    const userTu2 = { id: 'u-tu2', name: 'Siti Rahma', nip: '198702022011012002', roles: ['ADMIN_INTERNAL'] };

    // 1. Bubuhkan Paraf 1
    const res1 = await parafDocument(docId, 1, { notes: 'Naskah dumi sudah diteliti, format sesuai.' }, userTu1);
    assert.ok(res1);
    assert.equal(existingSigs[0].signing_status, 'SIGNED');
    assert.equal(currentSnapshot.tu_workflow.paraf_1.signed_by.name, 'Ahmad Fauzi');

    // 2. Bubuhkan Paraf 2
    const res2 = await parafDocument(docId, 2, { notes: 'Penetapan disetujui, siap TTE Kepala LPMQ.' }, userTu2);
    assert.ok(res2);
    assert.equal(existingSigs[1].signing_status, 'SIGNED');
    assert.equal(currentSnapshot.tu_workflow.paraf_2.signed_by.name, 'Siti Rahma');
  } finally {
    prisma.$transaction = origTx;
  }
});

test('B18-05: Kepala LPMQ menandatangani STT definitif (signDocument) setelah paraf 1 & 2 lengkap', async () => {
  const docId = 'doc-stt-draft-01';
  const regId = 'reg-b18-05';
  let regUpdatedStatus = null;
  let docUpdatedData = null;

  const mockTx = {
    $queryRaw: async () => [{ id: regId }],
    officialDocument: {
      findUnique: async () => ({
        id: docId,
        document_no: 'DRAFT-STT-123456',
        document_type: 'SURAT_TANDA_TASHIH',
        status: 'DRAFT',
        registration_id: regId,
        signatories: [
          { id: 'sig-1', name_position_snapshot: 'Paraf 1', signing_status: 'SIGNED' },
          { id: 'sig-2', name_position_snapshot: 'Paraf 2', signing_status: 'SIGNED' },
          { id: 'sig-3', name_position_snapshot: 'Kepala LPMQ', signing_status: 'PENDING' },
        ],
        content_snapshot: {
          tu_workflow: {
            paraf_1: { signed_at: '2026-11-08T10:00:00Z' },
            paraf_2: { signed_at: '2026-11-08T11:00:00Z' },
          },
        },
      }),
      update: async ({ data }) => {
        docUpdatedData = data;
        return { id: docId, ...data };
      },
    },
    documentSignatory: {
      update: async () => ({ id: 'sig-3', signing_status: 'SIGNED' }),
    },
    registration: {
      findUnique: async () => ({
        id: regId,
        registration_no: 'REG-202611-0088',
        title: 'Mushaf Al-Qur\'an',
        status: 'READY_FOR_STT',
        publisher_id: 'pub-1',
      }),
      updateMany: async ({ data }) => {
        regUpdatedStatus = data.status;
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
    const userKepala = {
      id: 'u-kepala',
      name: 'Dr. H. Abdul Aziz Sidqi, M.Ag.',
      roles: ['KEPALA_LPMQ'],
    };

    const signed = await signDocument(docId, userKepala);
    assert.ok(signed);
    assert.equal(docUpdatedData.status, 'ISSUED');
    assert.ok(docUpdatedData.document_no.startsWith('STT/LPMQ/'));
    assert.equal(regUpdatedStatus, 'STT_ISSUED');
  } finally {
    prisma.$transaction = origTx;
  }
});

test('B18-06: signDocument ditolak (409) jika draf STT belum diparaf oleh Tata Usaha', async () => {
  const docId = 'doc-stt-draft-tanpa-paraf';

  const mockTx = {
    officialDocument: {
      findUnique: async () => ({
        id: docId,
        document_type: 'SURAT_TANDA_TASHIH',
        status: 'DRAFT',
        content_snapshot: {}, // tu_workflow kosong
      }),
    },
  };

  const origTx = prisma.$transaction;
  prisma.$transaction = async (fn) => fn(mockTx);

  try {
    const userKepala = {
      id: 'u-kepala',
      name: 'Dr. H. Abdul Aziz Sidqi, M.Ag.',
      roles: ['KEPALA_LPMQ'],
    };

    await assert.rejects(
      async () => {
        await signDocument(docId, userKepala);
      },
      (err) => {
        assert.equal(err.statusCode, 409);
        assert.match(err.message, /dibubuhi Paraf 1 dan Paraf 2 oleh Tata Usaha/i);
        return true;
      }
    );
  } finally {
    prisma.$transaction = origTx;
  }
});

test('B18-07: Dokumentator mencatat penerimaan 5 eksemplar fisik dan kode rak arsip otomatis memindahkan status ke COMPLETED', async () => {
  const regId = 'reg-b18-07';
  let regUpdatedStatus = null;
  let savedArchiveMeta = null;

  const mockTx = {
    $queryRaw: async () => [{ id: regId }],
    registration: {
      findUnique: async () => ({
        id: regId,
        registration_no: 'REG-202611-0099',
        title: 'Mushaf Al-Qur\'an Standar',
        status: 'STT_ISSUED',
        publisher_id: 'pub-1',
        foreign_metadata: {},
      }),
      update: async ({ data }) => {
        savedArchiveMeta = data.foreign_metadata;
        return { id: regId, foreign_metadata: savedArchiveMeta };
      },
      updateMany: async ({ data }) => {
        regUpdatedStatus = data.status;
        return { count: 1 };
      },
    },
    documentationItem: {
      findFirst: async () => null,
      create: async ({ data }) => ({ id: 'item-1', ...data }),
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
    const userDokumentator = {
      id: 'u-dok-1',
      name: 'Dokumentator Arsip',
      roles: ['DOKUMENTATOR'],
    };

    const archivePayload = {
      has_master_documentation: true,
      has_received_5_exemplars: true,
      storage_location: {
        cabinet: 'Lemari A',
        shelf: 'Rak 3',
        archive_code: 'ARSIP-LPMQ-2026-0099',
      },
      survey: {
        print_quality: 'SANGAT_BAIK',
        paper_quality: 'BAIK',
        binding_quality: 'SANGAT_BAIK',
      },
    };

    const result = await recordDocumentationArchive(regId, archivePayload, userDokumentator);
    assert.ok(result);
    assert.equal(savedArchiveMeta.documentation_archive.storage_location.archive_code, 'ARSIP-LPMQ-2026-0099');
    assert.equal(regUpdatedStatus, 'COMPLETED', 'Status registrasi harus otomatis beralih ke COMPLETED');
  } finally {
    prisma.$transaction = origTx;
  }
});
