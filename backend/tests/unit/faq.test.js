import test from 'node:test';
import assert from 'node:assert/strict';
import { prisma } from '../../src/config/database.js';
import { createFaq, deleteFaq, listAdminFaqs, listPublicFaqs, updateFaq } from '../../src/services/faq.service.js';
import { createFaqSchema, listFaqsSchema, updateFaqSchema } from '../../src/validators/faq.validator.js';

test('FAQ schemas restrict categories, validate pagination, and require complete creation data', () => {
  const parsedQuery = listFaqsSchema.query.parse({
    category: 'REGULASI',
    is_published: 'false',
    page: '2',
    limit: '20',
  });
  assert.deepEqual(parsedQuery, {
    category: 'REGULASI',
    is_published: false,
    page: 2,
    limit: 20,
  });

  assert.equal(listFaqsSchema.query.safeParse({ category: 'GENERAL' }).success, false);
  assert.equal(listFaqsSchema.query.safeParse({ limit: '101' }).success, false);
  assert.equal(createFaqSchema.body.safeParse({
    category: 'LAYANAN_TASHIH_ONLINE',
    question: 'Bagaimana mengajukan layanan?',
    answer: 'Ajukan melalui portal.',
  }).success, true);
  assert.equal(createFaqSchema.body.safeParse({
    category: 'GENERAL',
    question: 'Pertanyaan?',
    answer: 'Jawaban.',
  }).success, false);
  assert.equal(createFaqSchema.body.safeParse({
    category: 'REGULASI',
    question: 'Pertanyaan?',
  }).success, false);
  assert.equal(updateFaqSchema.body.safeParse({}).success, false);
});

test('public FAQ list always excludes drafts and supports search and category filters', async () => {
  const originalCount = prisma.landingPageFaq.count;
  const originalFindMany = prisma.landingPageFaq.findMany;
  try {
    prisma.landingPageFaq.count = async ({ where }) => {
      assert.equal(where.is_published, true);
      assert.equal(where.category, 'REGULASI');
      assert.deepEqual(where.OR, [
        { question: { contains: 'biaya' } },
        { answer: { contains: 'biaya' } },
      ]);
      return 1;
    };
    prisma.landingPageFaq.findMany = async (query) => {
      assert.equal(query.where.is_published, true);
      assert.equal(query.skip, 10);
      assert.equal(query.take, 10);
      assert.equal(query.select.is_published, undefined);
      assert.equal(query.select.created_by_id, undefined);
      return [{
        id: 'faq-1',
        category: 'REGULASI',
        question: 'Apa dasar biaya?',
        answer: 'Lihat regulasi terkait.',
      }];
    };

    const result = await listPublicFaqs({ page: 2, limit: 10, search: 'biaya', category: 'REGULASI' });
    assert.equal(result.items[0].question, 'Apa dasar biaya?');
    assert.deepEqual(result.pagination, { total: 1, page: 2, limit: 10, totalPages: 1 });
  } finally {
    prisma.landingPageFaq.count = originalCount;
    prisma.landingPageFaq.findMany = originalFindMany;
  }
});

test('admin FAQ list can filter drafts and keeps creator fields available', async () => {
  const originalCount = prisma.landingPageFaq.count;
  const originalFindMany = prisma.landingPageFaq.findMany;
  try {
    prisma.landingPageFaq.count = async ({ where }) => {
      assert.equal(where.is_published, false);
      assert.equal(where.category, 'MUSHAF_STANDAR_INDONESIA');
      return 0;
    };
    prisma.landingPageFaq.findMany = async (query) => {
      assert.equal(query.select.is_published, true);
      assert.equal(query.select.created_by_id, true);
      return [];
    };
    const result = await listAdminFaqs({ category: 'MUSHAF_STANDAR_INDONESIA', is_published: false });
    assert.deepEqual(result.items, []);
  } finally {
    prisma.landingPageFaq.count = originalCount;
    prisma.landingPageFaq.findMany = originalFindMany;
  }
});

test('FAQ create persists audit identity and publication state in one transaction', async () => {
  const originalTransaction = prisma.$transaction;
  let createdData;
  let auditData;
  try {
    prisma.$transaction = async (callback) => callback({
      landingPageFaq: {
        create: async ({ data }) => {
          createdData = data;
          return {
            id: 'faq-1',
            ...data,
            created_at: new Date('2026-11-10T09:00:00.000Z'),
            updated_at: new Date('2026-11-10T09:00:00.000Z'),
          };
        },
      },
      auditLog: {
        create: async ({ data }) => {
          auditData = data;
          return { id: 'audit-1' };
        },
      },
    });

    const faq = await createFaq({
      data: {
        category: 'REGULASI',
        question: 'Apa dasar layanan?',
        answer: 'Lihat peraturan yang berlaku.',
        is_published: true,
      },
      user: { id: 'admin-1' },
      req: { ip: '127.0.0.1', headers: {} },
    });

    assert.equal(createdData.created_by_id, 'admin-1');
    assert.equal(createdData.updated_by_id, 'admin-1');
    assert.equal(createdData.is_published, true);
    assert.equal(faq.question, 'Apa dasar layanan?');
    assert.equal(auditData.action, 'LANDING_PAGE_FAQ_CREATED');
    assert.equal(auditData.actor_id, 'admin-1');
  } finally {
    prisma.$transaction = originalTransaction;
  }
});

test('FAQ update and delete use transactions and record admin audit events', async () => {
  const originalFindUnique = prisma.landingPageFaq.findUnique;
  const originalTransaction = prisma.$transaction;
  const audits = [];
  const previous = {
    id: 'faq-1',
    category: 'REGULASI',
    question: 'Pertanyaan lama',
    answer: 'Jawaban lama',
    is_published: false,
  };
  try {
    prisma.landingPageFaq.findUnique = async () => previous;
    prisma.$transaction = async (callback) => callback({
      landingPageFaq: {
        update: async ({ data }) => ({ ...previous, ...data, question: data.question }),
        delete: async () => previous,
      },
      auditLog: {
        create: async ({ data }) => {
          audits.push(data);
          return { id: `audit-${audits.length}` };
        },
      },
    });

    const updated = await updateFaq({
      id: 'faq-1',
      data: { question: 'Pertanyaan baru', is_published: true },
      user: { id: 'admin-1' },
      req: { headers: {} },
    });
    await deleteFaq({ id: 'faq-1', user: { id: 'admin-1' }, req: { headers: {} } });

    assert.equal(updated.question, 'Pertanyaan baru');
    assert.equal(updated.updated_by_id, 'admin-1');
    assert.equal(audits[0].action, 'LANDING_PAGE_FAQ_UPDATED');
    assert.deepEqual(audits[0].before_json, {
      category: 'REGULASI',
      question: 'Pertanyaan lama',
      is_published: false,
    });
    assert.equal(audits[1].action, 'LANDING_PAGE_FAQ_DELETED');
  } finally {
    prisma.landingPageFaq.findUnique = originalFindUnique;
    prisma.$transaction = originalTransaction;
  }
});
