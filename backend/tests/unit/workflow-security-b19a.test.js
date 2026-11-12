import test from 'node:test';
import assert from 'node:assert/strict';
import { prisma } from '../../src/config/database.js';
import { uploadPublisherRevisionRecap, dispatchPhysical, getDetail } from '../../src/services/registration.service.js';
import { createAssignments, recordReview } from '../../src/services/distribution.service.js';

test('B19A-01: Upload rekap sukses pada status WAITING_DISTRIBUTOR_RECEIPT dan WAITING_DISTRIBUTION (N1)', async () => {
  const regId = 'reg-b19a-01';
  let savedRecap = null;

  for (const status of ['WAITING_DISTRIBUTOR_RECEIPT', 'WAITING_DISTRIBUTION']) {
    const mockTx = {
      $queryRaw: async () => [{ id: regId }],
      registration: {
        findUnique: async () => ({
          id: regId,
          status,
          publisher_id: 'pub-1',
          revision_source: 'TASHIH_REVISION',
        }),
      },
      storedFile: {
        findUnique: async () => ({
          id: 'file-valid-recap',
          owner_id: 'usr-pub',
          file_size: 15420,
          mime_type: 'application/pdf',
        }),
      },
      officialDocument: {
        findFirst: async () => ({
          id: 'srv-1',
          document_type: 'REVISION_RETURN_LETTER',
          version: 1,
          content_snapshot: { revision_round: 1, revision_kind: 'NASKAH_PERBAIKAN' },
          created_at: new Date(Date.now() - 100000),
        }),
      },
      assignment: {
        findFirst: async () => null, // Belum ada penugasan baru setelah surat pengembalian
      },
      publisherRevisionRecap: {
        upsert: async ({ create }) => {
          savedRecap = create;
          return { id: 'prr-1', ...create };
        },
      },
      auditLog: {
        create: async () => ({ id: 'audit-1' }),
      },
    };

    prisma.$transaction = async (fn) => fn(mockTx);
    const publisherUser = { id: 'usr-pub', publisherId: 'pub-1', roles: ['PENERBIT'] };

    const res = await uploadPublisherRevisionRecap(regId, {
      recap_file_id: 'file-valid-recap',
      notes: `Unggah saat status ${status}`,
    }, publisherUser);

    assert.equal(res.round_number, 1);
    assert.equal(res.revision_kind, 'CORRECTION');
    assert.equal(savedRecap.recap_file_id, 'file-valid-recap');
  }
});

test('B19A-02: Upload rekap ditolak (409) jika penugasan ronde telah dibuat (N1 Lock)', async () => {
  const regId = 'reg-b19a-02';

  const mockTx = {
    $queryRaw: async () => [{ id: regId }],
    registration: {
      findUnique: async () => ({
        id: regId,
        status: 'WAITING_DISTRIBUTION',
        publisher_id: 'pub-1',
        revision_source: 'TASHIH_REVISION',
      }),
    },
    storedFile: {
      findUnique: async () => ({
        id: 'file-valid-recap',
        owner_id: 'usr-pub',
        file_size: 15420,
        mime_type: 'application/pdf',
      }),
    },
    officialDocument: {
      findFirst: async () => ({
        id: 'srv-1',
        document_type: 'REVISION_RETURN_LETTER',
        version: 1,
        content_snapshot: { revision_round: 1 },
        created_at: new Date(Date.now() - 100000),
      }),
    },
    assignment: {
      findFirst: async () => ({ id: 'asg-active-round-1' }), // Penugasan ronde ini sudah dibuat
    },
  };

  prisma.$transaction = async (fn) => fn(mockTx);
  const publisherUser = { id: 'usr-pub', publisherId: 'pub-1', roles: ['PENERBIT'] };

  await assert.rejects(
    uploadPublisherRevisionRecap(regId, { recap_file_id: 'file-valid-recap' }, publisherUser),
    (err) => err.statusCode === 409 && /penugasan pentashih untuk ronde ini telah dibuat/i.test(err.message)
  );
});

test('B19A-03: Upload rekap ditolak (400) jika naskah dalam revisi administrasi verifikator (N3)', async () => {
  const regId = 'reg-b19a-03';

  const mockTx = {
    $queryRaw: async () => [{ id: regId }],
    registration: {
      findUnique: async () => ({
        id: regId,
        status: 'REVISION_REQUIRED',
        publisher_id: 'pub-1',
        revision_source: null, // Bukan dari tashih, melainkan verifikasi administrasi
      }),
    },
    storedFile: {
      findUnique: async () => ({
        id: 'file-valid-recap',
        owner_id: 'usr-pub',
        file_size: 15420,
        mime_type: 'application/pdf',
      }),
    },
    officialDocument: {
      findFirst: async () => null, // Tidak ada REVISION_RETURN_LETTER dari tashih
    },
  };

  prisma.$transaction = async (fn) => fn(mockTx);
  const publisherUser = { id: 'usr-pub', publisherId: 'pub-1', roles: ['PENERBIT'] };

  await assert.rejects(
    uploadPublisherRevisionRecap(regId, { recap_file_id: 'file-valid-recap' }, publisherUser),
    (err) => err.statusCode === 400 && /hanya berlaku untuk naskah hasil revisi pentashihan/i.test(err.message)
  );
});

test('B19A-04: Upload rekap ditolak (403) jika berkas rekap bukan milik akun penerbit bersangkutan (N5)', async () => {
  const regId = 'reg-b19a-04';

  const mockTx = {
    $queryRaw: async () => [{ id: regId }],
    registration: {
      findUnique: async () => ({
        id: regId,
        status: 'REVISION_REQUIRED',
        publisher_id: 'pub-1',
        revision_source: 'TASHIH_REVISION',
      }),
    },
    storedFile: {
      findUnique: async () => ({
        id: 'file-foreign-owner',
        owner_id: 'usr-other-hacker', // Milik user lain
        file_size: 15420,
        mime_type: 'application/pdf',
      }),
    },
    officialDocument: {
      findFirst: async () => ({
        id: 'srv-1',
        document_type: 'REVISION_RETURN_LETTER',
        version: 1,
        content_snapshot: { revision_round: 1 },
      }),
    },
    assignment: {
      findFirst: async () => null,
    },
  };

  prisma.$transaction = async (fn) => fn(mockTx);
  const publisherUser = { id: 'usr-pub', publisherId: 'pub-1', roles: ['PENERBIT'] };

  await assert.rejects(
    uploadPublisherRevisionRecap(regId, { recap_file_id: 'file-foreign-owner' }, publisherUser),
    (err) => err.statusCode === 403 && /bukan milik akun penerbit anda/i.test(err.message)
  );
});

test('B19A-05: recordReview menolak berkas rekap jika bukan milik pentashih bersangkutan (N5)', async () => {
  const asgId = 'asg-pentashih-1';

  const mockTx = {
    $queryRaw: async () => [{ id: 'reg-1' }],
    registration: {
      findUnique: async () => ({ id: 'reg-1', status: 'TASHIH_IN_PROGRESS' }),
    },
    assignment: {
      findUnique: async () => ({
        id: asgId,
        assignee_id: 'usr-pentashih-1',
        stage: 'REVISION',
        iteration: 2,
        reviews: [],
        registration: { id: 'reg-1', status: 'TASHIH_IN_PROGRESS' },
      }),
    },
    storedFile: {
      findUnique: async () => ({
        id: 'file-stolen-recap',
        owner_id: 'usr-pentashih-2', // Diupload pentashih lain
        file_size: 10000,
        mime_type: 'application/pdf',
      }),
    },
  };

  prisma.$transaction = async (fn) => fn(mockTx);
  const pentashihUser = { id: 'usr-pentashih-1', roles: ['PENTASHIH'], name: 'Pentashih 1' };

  await assert.rejects(
    recordReview(asgId, {
      result: 'PASSED',
      notes: 'Lolos',
      recap_file_id: 'file-stolen-recap',
    }, pentashihUser),
    (err) => err.statusCode === 403 && /bukan milik akun pentashih anda/i.test(err.message)
  );
});

test('B19A-06: comparison_notes opsional pada penugasan naskah revisi masuk; disimpan hanya bila diisi (N4)', async () => {
  const regId = 'reg-b19a-06';
  let savedComparison = null;

  const mockTx = {
    $queryRaw: async () => [{ id: regId }],
    registration: {
      findUnique: async () => ({
        id: regId,
        status: 'WAITING_DISTRIBUTION',
        title: 'Mushaf Al-Qur`an Revisi',
        core_team_number: 1,
        core_distributor_id: 'usr-dist',
        payment_records: [{ status: 'VERIFIED' }],
      }),
      updateMany: async () => ({ count: 1 }),
    },
    paymentRecord: {
      findFirst: async () => ({ status: 'VERIFIED' }),
    },
    assignment: {
      findFirst: async () => ({ id: 'asg-round-1', iteration: 1, stage: 'INITIAL' }),
      create: async ({ data }) => ({ id: 'asg-new-1', ...data }),
    },
    officialDocument: {
      findFirst: async () => ({
        id: 'srv-1',
        document_type: 'REVISION_RETURN_LETTER',
        version: 1,
        content_snapshot: { revision_round: 1 },
      }),
    },
    publisherRevisionRecap: {
      findUnique: async () => ({ id: 'prr-1', round_number: 1, recap_file_id: 'file-pub-1' }),
    },
    distributorComparison: {
      upsert: async ({ create }) => {
        savedComparison = create;
        return { id: 'dc-1', ...create };
      },
    },
    auditLog: { create: async () => ({ id: 'audit-1' }) },
    notification: { create: async () => ({ id: 'notif-1' }) },
    statusHistory: { create: async () => ({ id: 'sh-1' }) },
    user: {
      findFirst: async () => ({ id: 'usr-p-1', status: 'ACTIVE', roles: [{ role: { code: 'PENTASHIH' } }] }),
    },
    workingDay: {
      findMany: async ({ where }) => {
        const start = where?.date?.gte || where?.date?.gt || new Date();
        const base = new Date(start.toISOString().slice(0, 10) + 'T00:00:00Z');
        return Array.from({ length: 40 }, (_, i) => ({
          date: new Date(base.getTime() + i * 86400000),
          is_working_day: true,
        }));
      },
    },
  };

  prisma.$transaction = async (fn) => fn(mockTx);
  const distributorUser = { id: 'usr-dist', roles: ['DISTRIBUTOR'], name: 'Distributor 1' };

  // 1. Boleh dilewati: tanpa comparison_notes penugasan tetap berhasil dan tidak ada telaah yang disimpan
  await createAssignments(regId, {
    stage: 'REVISION',
    is_individual: true,
    assignee_ids: ['usr-p-1'],
  }, distributorUser);
  assert.equal(savedComparison, null);

  // 2. Bila diisi, catatan tersimpan
  const validNotes = 'Catatan telaah pembanding: Naskah revisi ronde 1 telah diperiksa kesesuaiannya terhadap surat pengembalian sebelumnya.';
  await createAssignments(regId, {
    stage: 'REVISION',
    is_individual: true,
    assignee_ids: ['usr-p-1'],
    comparison_notes: validNotes,
  }, distributorUser);

  assert.ok(savedComparison);
  assert.equal(savedComparison.registration_id, regId);
  assert.equal(savedComparison.round_number, 1);
  assert.equal(savedComparison.notes, validNotes);
});

test('B19A-07: getDetail menyaring comparison_notes dari snapshot dokumen saat dibaca akun penerbit', async () => {
  const regId = 'reg-b19a-07';

  prisma.registration.findUnique = async () => ({
    id: regId,
    publisher_id: 'pub-1',
    status: 'TASHIH_IN_PROGRESS',
    official_documents: [
      {
        id: 'doc-srv-1',
        status: 'ISSUED',
        document_type: 'REVISION_RETURN_LETTER',
        content_snapshot: {
          title: 'Mushaf Standar',
          revision_round: 1,
          notes: 'Perbaiki harakat',
          comparison_notes: 'Catatan internal rahasia distributor yang tidak boleh bocor',
        },
      },
    ],
  });

  const publisherUser = { id: 'usr-pub', publisherId: 'pub-1', roles: ['PENERBIT'] };
  const detail = await getDetail(regId, publisherUser);

  assert.ok(detail);
  assert.equal(detail.official_documents.length, 1);
  const docSnapshot = detail.official_documents[0].content_snapshot;
  assert.equal(docSnapshot.notes, 'Perbaiki harakat');
  // comparison_notes harus bersih (tidak boleh bocor ke penerbit)
  assert.equal(docSnapshot.comparison_notes, undefined);
});

test('B19A-08: dispatchPhysical tidak mewajibkan rekapitulasi pada revisi administrasi verifikator', async () => {
  const regId = 'reg-b19a-08';
  let physicalUpdated = false;

  const mockTx = {
    $queryRaw: async () => [{ id: regId }],
    registration: {
      findUnique: async () => ({
        id: regId,
        status: 'REVISION_REQUIRED',
        publisher_id: 'pub-1',
        revision_source: null, // Revisi verifikasi administrasi
      }),
      update: async () => {
        physicalUpdated = true;
        return { id: regId, physical_dispatch_status: 'DISPATCHED' };
      },
    },
    physicalMasterIntake: {
      findUnique: async () => ({ status: 'PENDING' }),
      upsert: async () => ({ id: 'pmi-1' }),
      update: async () => ({ id: 'pmi-1' }),
    },
    officialDocument: {
      findFirst: async () => null, // Tidak ada surat pengembalian tashih
    },
    statusHistory: { create: async () => ({ id: 'sh-1' }) },
    auditLog: { create: async () => ({ id: 'audit-1' }) },
  };

  prisma.$transaction = async (fn) => fn(mockTx);
  const publisherUser = { id: 'usr-pub', publisherId: 'pub-1', roles: ['PENERBIT'] };

  // Dispatch physical tanpa recap_file_id harus berhasil karena bukan revisi tashih
  await dispatchPhysical(regId, {
    courier: 'JNE',
    tracking_no: 'JNE123456789',
  }, publisherUser);

  assert.equal(physicalUpdated, true);
});
