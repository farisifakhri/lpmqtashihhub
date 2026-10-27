import test from 'node:test';
import assert from 'node:assert/strict';
import { reviewSchema, distributorReviewSchema } from '../src/validators/workflow.validator.js';
import { recordReview, approveDistribution } from '../src/services/distribution.service.js';
import { prisma } from '../src/config/database.js';

test('B-06: reviewSchema enforces mandatory recap_file_id as UUID for pentashih', () => {
  // Tanpa recap_file_id -> gagal validasi
  const withoutRecap = reviewSchema.body.safeParse({
    result: 'PASSED',
    notes: 'Lolos telaah sidang',
  });
  assert.equal(withoutRecap.success, false, 'reviewSchema harus menolak jika recap_file_id kosong');

  // recap_file_id bukan UUID -> gagal validasi
  const invalidUuid = reviewSchema.body.safeParse({
    result: 'PASSED',
    notes: 'Lolos telaah sidang',
    recap_file_id: 'not-a-valid-uuid',
  });
  assert.equal(invalidUuid.success, false, 'reviewSchema harus menolak format non-UUID');

  // Format valid -> berhasil
  const valid = reviewSchema.body.safeParse({
    result: 'PASSED',
    notes: 'Lolos telaah sidang',
    recap_file_id: '123e4567-e89b-12d3-a456-426614174000',
  });
  assert.ok(valid.success, 'reviewSchema harus menerima berkas rekap UUID yang valid');
});

test('B-06: distributorReviewSchema allows distributor review without recap_file_id and accepts revision_kind', () => {
  const distReview = distributorReviewSchema.body.safeParse({
    result: 'REVISION_REQUIRED',
    notes: 'Perlu revisi rasm usmani',
    revision_kind: 'NASKAH_PERBAIKAN',
  });
  assert.ok(distReview.success, 'distributorReviewSchema harus mengizinkan keputusan tanpa recap_file_id');
});

test('B-06: recordReview requires existing StoredFile and updates all assigned juz items collectively', async () => {
  const originalTx = prisma.$transaction;
  let updatedJuz = null;
  let createdReview = null;

  try {
    prisma.$transaction = async (callback) => {
      const mockTx = {
        $queryRaw: async () => [],
        assignment: {
          findUnique: async () => ({
            id: 'assign-1',
            assignee_id: 'pentashih-1',
            registration_id: 'reg-1',
            status: 'IN_PROGRESS',
            reviews: [],
            juz_items: [
              { id: 'juz-1', juz_number: 1, result: null },
              { id: 'juz-2', juz_number: 2, result: null },
            ],
          }),
          update: async () => ({ status: 'COMPLETED' }),
        },
        registration: {
          findUnique: async () => ({
            id: 'reg-1',
            status: 'TASHIH_IN_PROGRESS',
          }),
        },
        storedFile: {
          findUnique: async ({ where }) => {
            if (where.id === '123e4567-e89b-12d3-a456-426614174000') {
              return { id: where.id, mime_type: 'application/pdf' };
            }
            return null;
          },
        },
        assignmentJuz: {
          updateMany: async (args) => {
            updatedJuz = args;
            return { count: 2 };
          },
        },
        tashihReview: {
          create: async ({ data }) => {
            createdReview = { id: 'rev-1', ...data };
            return createdReview;
          },
        },
        auditLog: {
          create: async () => ({}),
        },
      };
      return callback(mockTx);
    };

    // 1. Berkas rekap tidak ditemukan di storage -> throws 404
    await assert.rejects(
      () => recordReview(
        'assign-1',
        {
          result: 'PASSED',
          notes: 'Telaah selesai',
          recap_file_id: '999e4567-e89b-12d3-a456-426614174999',
        },
        { id: 'pentashih-1', roles: ['PENTASHIH'] }
      ),
      (err) => {
        assert.equal(err.statusCode, 404);
        assert.ok(err.message.includes('Berkas rekapan yang diunggah tidak ditemukan'));
        return true;
      }
    );

    // 2. Berkas rekap valid -> sukses, juz_items diupdate keseluruhan, tashih_review tersimpan
    const res = await recordReview(
      'assign-1',
      {
        result: 'PASSED',
        notes: 'Seluruh juz 1-2 lolos bersih',
        recap_file_id: '123e4567-e89b-12d3-a456-426614174000',
      },
      { id: 'pentashih-1', roles: ['PENTASHIH'] }
    );

    assert.equal(res.id, 'rev-1');
    assert.equal(res.recap_file_id, '123e4567-e89b-12d3-a456-426614174000');
    assert.equal(updatedJuz.data.result, 'PASSED');
    assert.equal(createdReview.recap_file_id, '123e4567-e89b-12d3-a456-426614174000');
  } finally {
    prisma.$transaction = originalTx;
  }
});

test('B-06: approveDistribution blocks approval if no pentashih review uploaded recap_file_id', async () => {
  const originalTx = prisma.$transaction;

  try {
    prisma.$transaction = async (callback) => {
      const mockTx = {
        $queryRaw: async () => [],
        registration: {
          findUnique: async () => ({
            id: 'reg-1',
            status: 'TASHIH_IN_PROGRESS',
          }),
        },
        assignment: {
          findFirst: async () => ({ iteration: 1 }),
          findMany: async () => [
            {
              id: 'a1',
              status: 'COMPLETED',
              reviews: [{ id: 'r1', result: 'PASSED', recap_file_id: null }],
            },
          ],
        },
      };
      return callback(mockTx);
    };

    await assert.rejects(
      () => approveDistribution(
        'reg-1',
        { result: 'PASSED', notes: 'Rekomendasi STT' },
        { id: 'dist-1', roles: ['DISTRIBUTOR'] }
      ),
      (err) => {
        assert.equal(err.statusCode, 409);
        assert.ok(err.message.includes('dokumen rekap hasil telaah internal belum diunggah'));
        return true;
      }
    );
  } finally {
    prisma.$transaction = originalTx;
  }
});
