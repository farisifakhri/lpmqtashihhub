import test from 'node:test';
import assert from 'node:assert/strict';
import { prisma } from '../src/config/database.js';
import { createDraft } from '../src/services/registration.service.js';
import { getRegistrationPayment } from '../src/services/payment.service.js';
import { authRateLimiter, registrationRateLimiter, shouldSkipRateLimit } from '../src/middlewares/rateLimiter.middleware.js';

test('P0: createDraft rejects attachment files belonging to other users', async () => {
  const originalFindUnique = prisma.serviceType.findUnique;
  const originalStoredFileFindMany = prisma.storedFile.findMany;

  try {
    prisma.serviceType.findUnique = async () => ({ id: 'srv-1', status: 'ACTIVE', category: {} });
    prisma.storedFile.findMany = async () => [
      { id: 'file-other', owner_id: 'other-user-uuid' },
    ];

    await assert.rejects(
      createDraft(
        {
          service_type_id: 'srv-1',
          title: 'Mushaf Test',
          cover_file_id: 'file-other',
        },
        { id: 'my-user-uuid', roles: ['ADMIN_PENERBIT'], publisherId: 'pub-1' }
      ),
      (err) => err.statusCode === 403 && err.message.includes('bukan milik akun Anda')
    );
  } finally {
    prisma.serviceType.findUnique = originalFindUnique;
    prisma.storedFile.findMany = originalStoredFileFindMany;
  }
});

test('P0: getRegistrationPayment denies unassigned verifier with 403', async () => {
  const originalRegFindUnique = prisma.registration.findUnique;
  const originalAssignFindFirst = prisma.verificationAssignment.findFirst;

  try {
    prisma.registration.findUnique = async () => ({
      id: 'reg-1',
      publisher_id: 'pub-1',
      fee_sla_snapshot: {},
    });

    prisma.verificationAssignment.findFirst = async () => ({
      id: 'assign-1',
      verifier_id: 'other-verifier-id',
    });

    await assert.rejects(
      getRegistrationPayment('reg-1', {
        id: 'unassigned-verifier-id',
        roles: ['VERIFIKATOR'],
      }),
      (err) => err.statusCode === 403 && err.message.includes('Anda tidak memiliki hak akses')
    );
  } finally {
    prisma.registration.findUnique = originalRegFindUnique;
    prisma.verificationAssignment.findFirst = originalAssignFindFirst;
  }
});

test('P0: rateLimiter does not bypass on User-Agent header in non-test environment', () => {
  const originalEnv = process.env.NODE_ENV;
  try {
    process.env.NODE_ENV = 'production';
    assert.equal(shouldSkipRateLimit(), false);
    process.env.NODE_ENV = 'test';
    assert.equal(shouldSkipRateLimit(), true);
  } finally {
    process.env.NODE_ENV = originalEnv;
  }
});
