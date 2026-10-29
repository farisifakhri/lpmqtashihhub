import test from 'node:test';
import assert from 'node:assert/strict';
import { prisma } from '../src/config/database.js';
import {
  createInformationGuide,
  getInformationGuide,
  listPublicInformationGuides,
  sanitizeGuideHtml,
} from '../src/services/information-guide.service.js';
import {
  createInformationGuideSchema,
  listInformationGuidesSchema,
  updateInformationGuideSchema,
} from '../src/validators/information-guide.validator.js';

test('guide HTML sanitizer removes scripts, event handlers, unsafe links, and external images', () => {
  const clean = sanitizeGuideHtml(
    '<h2 onclick="alert(1)">Panduan</h2><script>alert(1)</script>' +
    '<a href="javascript:alert(1)" target="_blank">Tautan</a>' +
    '<img src="https://attacker.example/pixel.png" onerror="alert(1)">' +
    '<img src="/api/v1/information-guides/images/123e4567-e89b-42d3-a456-426614174000" alt="Gambar">'
  );

  assert.match(clean, /<h2>Panduan<\/h2>/);
  assert.doesNotMatch(clean, /script|onclick|onerror|javascript:|attacker\.example/);
  assert.match(clean, /<img src="\/api\/v1\/information-guides\/images\/123e4567-e89b-42d3-a456-426614174000" alt="Gambar"/);
});

test('guide HTML sanitizer retains only safe rich text and safe new-window links', () => {
  const clean = sanitizeGuideHtml(
    '<p style="text-align:center;color:red">Teks <strong>penting</strong></p>' +
    '<a href="https://example.org" target="_blank">Sumber</a>'
  );

  assert.match(clean, /style="text-align:center;color:red"/);
  assert.match(clean, /<strong>penting<\/strong>/);
  assert.match(clean, /href="https:\/\/example\.org"[^>]*rel="noopener noreferrer"/);
});

test('guide create and update schemas constrain input and require a non-empty update', () => {
  assert.equal(createInformationGuideSchema.body.safeParse({
    title: 'Panduan Permohonan',
    content_type: 'EDITOR',
    content_html: '<p>Isi panduan</p>',
    is_published: 'false',
  }).success, true);
  assert.equal(createInformationGuideSchema.body.safeParse({
    title: 'Panduan',
    content_type: 'OTHER',
  }).success, false);
  assert.equal(updateInformationGuideSchema.body.safeParse({}).success, false);
  assert.equal(updateInformationGuideSchema.body.safeParse({ is_published: 'yes' }).success, false);
});

test('guide list query parses publication state and rejects excessive page sizes', () => {
  const parsed = listInformationGuidesSchema.query.parse({ page: '2', limit: '25', is_published: 'false' });
  assert.deepEqual(parsed, { page: 2, limit: 25, is_published: false });
  assert.equal(listInformationGuidesSchema.query.safeParse({ limit: '101' }).success, false);
});

test('public guide list excludes drafts and does not select private storage metadata', async () => {
  const originalCount = prisma.informationGuide.count;
  const originalFindMany = prisma.informationGuide.findMany;
  try {
    prisma.informationGuide.count = async ({ where }) => {
      assert.equal(where.is_published, true);
      assert.equal(where.title.contains, 'layanan');
      return 1;
    };
    prisma.informationGuide.findMany = async (query) => {
      assert.equal(query.where.is_published, true);
      assert.equal(query.skip, 10);
      assert.equal(query.take, 10);
      assert.equal(query.select.storage_path, undefined);
      assert.equal(query.select.file_name, undefined);
      return [{ id: 'guide-1', title: 'Panduan layanan', content_type: 'EDITOR' }];
    };

    const result = await listPublicInformationGuides({ page: 2, limit: 10, search: 'layanan' });
    assert.equal(result.items[0].title, 'Panduan layanan');
    assert.deepEqual(result.pagination, { total: 1, page: 2, limit: 10, totalPages: 1 });
  } finally {
    prisma.informationGuide.count = originalCount;
    prisma.informationGuide.findMany = originalFindMany;
  }
});

test('public guide detail cannot retrieve a draft', async () => {
  const originalFindFirst = prisma.informationGuide.findFirst;
  try {
    prisma.informationGuide.findFirst = async ({ where }) => {
      assert.equal(where.is_published, true);
      return null;
    };
    await assert.rejects(getInformationGuide('guide-draft', true), (error) => error.statusCode === 404);
  } finally {
    prisma.informationGuide.findFirst = originalFindFirst;
  }
});

test('guide creation sanitizes editor HTML before persisting and auditing it', async () => {
  const originalTransaction = prisma.$transaction;
  let createdData;
  let auditData;
  try {
    prisma.$transaction = async (callback) => callback({
      informationGuide: {
        create: async ({ data }) => {
          createdData = data;
          return {
            id: 'guide-1',
            ...data,
            created_at: new Date('2026-10-25T10:00:00.000Z'),
            updated_at: new Date('2026-10-25T10:00:00.000Z'),
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

    const guide = await createInformationGuide({
      data: {
        title: 'Panduan Layanan',
        content_type: 'EDITOR',
        content_html: '<p onclick="alert(1)">Aman</p><script>alert(1)</script>',
        is_published: false,
      },
      user: { id: 'admin-1' },
      req: { ip: '127.0.0.1', headers: {} },
    });

    assert.equal(createdData.content_html, '<p>Aman</p>');
    assert.equal(guide.content_html, '<p>Aman</p>');
    assert.equal(auditData.action, 'INFORMATION_GUIDE_CREATED');
  } finally {
    prisma.$transaction = originalTransaction;
  }
});

test('published editor guides require meaningful sanitized content', async () => {
  const originalTransaction = prisma.$transaction;
  let transactionCalled = false;
  try {
    prisma.$transaction = async () => {
      transactionCalled = true;
    };
    await assert.rejects(
      createInformationGuide({
        data: { title: 'Panduan Kosong', content_type: 'EDITOR', content_html: '<script>malicious()</script>', is_published: true },
        user: { id: 'admin-1' },
      }),
      (error) => error.statusCode === 400
    );
    assert.equal(transactionCalled, false);
  } finally {
    prisma.$transaction = originalTransaction;
  }
});
