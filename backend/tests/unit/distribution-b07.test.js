import test from 'node:test';
import assert from 'node:assert/strict';
import { outgoingDispatchSchema, distributorReviewSchema } from '../../src/validators/workflow.validator.js';
import { renderShippingLabelPdf } from '../../src/services/registration-receipt-pdf.service.js';
import { recordOutgoingDispatch, approveDistribution } from '../../src/services/distribution.service.js';
import { prisma } from '../../src/config/database.js';

test('B-07: outgoingDispatchSchema validates courier and tracking number', () => {
  // Gagal jika kurir atau resi kosong
  const invalid = outgoingDispatchSchema.body.safeParse({
    outgoing_courier: '',
    outgoing_tracking_no: '',
  });
  assert.equal(invalid.success, false, 'outgoingDispatchSchema harus menolak jika kurir atau resi kosong');

  // Berhasil dengan kurir dan nomor resi valid
  const valid = outgoingDispatchSchema.body.safeParse({
    outgoing_courier: 'JNE Express',
    outgoing_tracking_no: 'JNE123456789ID',
    outgoing_notes: 'Naskah perbaikan dikembalikan dengan berkas catatan koreksi',
  });
  assert.ok(valid.success, 'outgoingDispatchSchema harus menerima kurir dan nomor resi');
});

test('B-07: distributorReviewSchema accepts optional outgoing dispatch tracking', () => {
  const withTracking = distributorReviewSchema.body.safeParse({
    result: 'REVISION_REQUIRED',
    notes: 'Perbaiki tanda waqaf pada juz 15-20',
    revision_kind: 'NASKAH_PERBAIKAN',
    outgoing_courier: 'TIKI',
    outgoing_tracking_no: 'TIKI-REV-98765',
    outgoing_notes: 'Dikirim ke kantor pusat penerbit',
  });
  assert.ok(withTracking.success, 'distributorReviewSchema harus menerima data resi keluar opsional');
});

test('B-07: renderShippingLabelPdf generates authentic PDF for variants Perbaikan and Dumi', async () => {
  const dummyReg = {
    id: 'reg-b07-001',
    registration_no: 'REG-2026-B07-001',
    title: 'Mushaf Al-Qur\'an Standar Indonesia Uji B07',
    status: 'REVISION_REQUIRED',
    revision_round: 2,
    revision_kind: 'NASKAH_PERBAIKAN',
    publisher: {
      legal_name: 'PT Pustaka Quran Jaya',
      address: 'Jl. Merdeka No. 45 Jakarta Pusat',
      phone: '08123456789',
    },
    physical_master_intake: {
      volume_count: 30,
    },
  };

  // 1. Variant Perbaikan
  const bytesPerbaikan = await renderShippingLabelPdf(dummyReg, { variant: 'perbaikan' });
  assert.ok(Buffer.isBuffer(bytesPerbaikan) || bytesPerbaikan instanceof Uint8Array);
  assert.ok(bytesPerbaikan.length > 1000, 'PDF Label Perbaikan harus memiliki konten yang memadai');

  // 2. Variant Dumi
  const bytesDumi = await renderShippingLabelPdf(dummyReg, { variant: 'dumi', revisionRound: 1 });
  assert.ok(Buffer.isBuffer(bytesDumi) || bytesDumi instanceof Uint8Array);
  assert.ok(bytesDumi.length > 1000, 'PDF Label Dumi harus memiliki konten yang memadai');

  // 3. Variant Perdana (Default)
  const bytesPerdana = await renderShippingLabelPdf({ ...dummyReg, status: 'READY_FOR_VERIFICATION', revision_round: 0 }, { variant: 'perdana' });
  assert.ok(Buffer.isBuffer(bytesPerdana) || bytesPerdana instanceof Uint8Array);
  assert.ok(bytesPerdana.length > 1000, 'PDF Label Perdana harus memiliki konten yang memadai');
});

test('B-07: recordOutgoingDispatch updates registration outgoing fields and notifies publisher', async () => {
  const originalTx = prisma.$transaction;
  let updatedData = null;
  let createdNotification = null;
  let createdAudit = null;

  try {
    prisma.$transaction = async (callback) => {
      const mockTx = {
        registration: {
          findUnique: async () => ({
            id: 'reg-b07-disp-1',
            registration_no: 'REG-2026-B07-002',
            publisher_id: 'pub-b07-1',
            core_distributor_id: 'dist-user-1',
          }),
          update: async ({ data }) => {
            updatedData = data;
            return { id: 'reg-b07-disp-1', ...data };
          },
        },
        publisher: {
          findUnique: async () => ({
            id: 'pub-b07-1',
            user_id: 'pub-user-acc-1',
          }),
        },
        notification: {
          create: async ({ data }) => {
            createdNotification = data;
            return { id: 'notif-1', ...data };
          },
        },
        auditLog: {
          create: async ({ data }) => {
            createdAudit = data;
            return { id: 'audit-1', ...data };
          },
        },
      };
      return callback(mockTx);
    };

    const user = {
      id: 'dist-user-1',
      name: 'Petugas Distributor',
      roles: ['DISTRIBUTOR'],
    };

    const result = await recordOutgoingDispatch('reg-b07-disp-1', {
      outgoing_courier: 'POS Indonesia',
      outgoing_tracking_no: 'POS99887766',
      outgoing_notes: 'Dokumen risalah koreksi dan naskah fisik dikirim ke penerbit',
    }, user);

    assert.ok(result, 'recordOutgoingDispatch harus mengembalikan objek registrasi yang diperbarui');
    assert.equal(updatedData.outgoing_courier, 'POS Indonesia');
    assert.equal(updatedData.outgoing_tracking_no, 'POS99887766');
    assert.equal(updatedData.outgoing_notes, 'Dokumen risalah koreksi dan naskah fisik dikirim ke penerbit');
    assert.ok(updatedData.outgoing_dispatch_date instanceof Date);

    assert.ok(createdNotification, 'Notifikasi ke akun penerbit harus dibuat');
    assert.equal(createdNotification.user_id, 'pub-user-acc-1');
    assert.equal(createdNotification.type, 'OUTGOING_DISPATCH_RECORDED');
    assert.equal(createdNotification.payload.tracking_no, 'POS99887766');
  } finally {
    prisma.$transaction = originalTx;
  }
});
