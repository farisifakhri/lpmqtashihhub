import test from 'node:test';
import assert from 'node:assert/strict';
import { prisma } from '../../src/config/database.js';
import {
  countIssuedStt,
  countPublishers,
  countPentashih,
  getPublicLandingStatistics,
} from '../../src/services/landing-statistics.service.js';
import { getLandingStatistics } from '../../src/controllers/public.controller.js';

test('landing-statistics: countIssuedStt menghitung registrasi dengan status STT_ISSUED / DOCUMENTATION_IN_PROGRESS atau STT terbit', async () => {
  const origCount = prisma.registration.count;
  let capturedWhere = null;

  prisma.registration.count = async ({ where }) => {
    capturedWhere = where;
    return 42;
  };

  try {
    const result = await countIssuedStt();
    assert.equal(result, 42);
    assert.ok(capturedWhere);
    assert.ok(Array.isArray(capturedWhere.OR));

    // Memastikan status STT_ISSUED dan DOCUMENTATION_IN_PROGRESS tercover
    const statusCondition = capturedWhere.OR.find((cond) => cond.status);
    assert.ok(statusCondition);
    assert.deepEqual(statusCondition.status.in, ['STT_ISSUED', 'DOCUMENTATION_IN_PROGRESS']);

    // Memastikan dokumen resmi SURAT_TANDA_TASHIH ISSUED tercover
    const docCondition = capturedWhere.OR.find((cond) => cond.official_documents);
    assert.ok(docCondition);
    assert.equal(docCondition.official_documents.some.document_type, 'SURAT_TANDA_TASHIH');
    assert.equal(docCondition.official_documents.some.status, 'ISSUED');
  } finally {
    prisma.registration.count = origCount;
  }
});

test('landing-statistics: countPublishers menghitung pengguna dengan role PENERBIT', async () => {
  const origCount = prisma.user.count;
  let capturedWhere = null;

  prisma.user.count = async ({ where }) => {
    capturedWhere = where;
    return 15;
  };

  try {
    const result = await countPublishers();
    assert.equal(result, 15);
    assert.ok(capturedWhere?.roles?.some?.role);
  } finally {
    prisma.user.count = origCount;
  }
});

test('landing-statistics: countPentashih menghitung pengguna dengan role PENTASHIH', async () => {
  const origCount = prisma.user.count;
  let capturedWhere = null;

  prisma.user.count = async ({ where }) => {
    capturedWhere = where;
    return 30;
  };

  try {
    const result = await countPentashih();
    assert.equal(result, 30);
    assert.ok(capturedWhere?.roles?.some?.role);
  } finally {
    prisma.user.count = origCount;
  }
});

test('landing-statistics: getPublicLandingStatistics mengembalikan angka agregat tanpa data pengguna / dokumen internal', async () => {
  const origRegCount = prisma.registration.count;
  const origUserCount = prisma.user.count;

  prisma.registration.count = async () => 10;
  prisma.user.count = async ({ where }) => {
    const roleClause = JSON.stringify(where);
    if (roleClause.includes('PENERBIT')) return 20;
    if (roleClause.includes('PENTASHIH')) return 35;
    return 0;
  };

  try {
    const stats = await getPublicLandingStatistics();

    // Pastikan angka agregat tepat
    assert.equal(stats.stt_issued, 10);
    assert.equal(stats.publishers, 20);
    assert.equal(stats.pentashih, 35);
    assert.equal(stats.sttIssued, 10);
    assert.equal(stats.publishersCount, 20);
    assert.equal(stats.pentashihCount, 35);

    // Keamanan: pastikan tidak ada data sensitif
    assert.equal(stats.users, undefined);
    assert.equal(stats.items, undefined);
    assert.equal(stats.names, undefined);
    assert.equal(stats.documents, undefined);
  } finally {
    prisma.registration.count = origRegCount;
    prisma.user.count = origUserCount;
  }
});

test('landing-statistics: getLandingStatistics controller mengirimkan HTTP 200 dengan no-cache', async () => {
  const origRegCount = prisma.registration.count;
  const origUserCount = prisma.user.count;

  prisma.registration.count = async () => 7;
  prisma.user.count = async ({ where }) => {
    const roleClause = JSON.stringify(where);
    if (roleClause.includes('PENERBIT')) return 12;
    if (roleClause.includes('PENTASHIH')) return 18;
    return 0;
  };

  try {
    const headers = {};
    let responseStatus = null;
    let responseBody = null;

    const req = {};
    const res = {
      set: (k, v) => {
        headers[k] = v;
        return res;
      },
      status: (s) => {
        responseStatus = s;
        return res;
      },
      json: (b) => {
        responseBody = b;
        return res;
      },
    };

    await getLandingStatistics(req, res, () => {});

    assert.equal(responseStatus, 200);
    assert.equal(headers['Cache-Control'], 'no-cache');
    assert.equal(responseBody.success, true);
    assert.equal(responseBody.data.stt_issued, 7);
    assert.equal(responseBody.data.publishers, 12);
    assert.equal(responseBody.data.pentashih, 18);
  } finally {
    prisma.registration.count = origRegCount;
    prisma.user.count = origUserCount;
  }
});
