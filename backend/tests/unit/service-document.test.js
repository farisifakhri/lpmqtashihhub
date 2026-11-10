import test from 'node:test';
import assert from 'node:assert/strict';
import { prisma } from '../../src/config/database.js';
import {
  getServiceDocumentFile,
  listPublicServiceDocuments,
  validateServiceDocumentPdf,
} from '../../src/services/service-document.service.js';
import {
  createServiceDocumentSchema,
  listServiceDocumentsSchema,
  SERVICE_DOCUMENT_CATEGORIES,
  updateServiceDocumentSchema,
} from '../../src/validators/service-document.validator.js';

test('service document schemas allow only the six requested categories', () => {
  assert.equal(SERVICE_DOCUMENT_CATEGORIES.length, 6);
  assert.equal(createServiceDocumentSchema.body.safeParse({
    title: 'Pedoman Pentashihan',
    category: 'Pedoman Pentashihan Mushaf Al-Qur’an',
  }).success, true);
  assert.equal(createServiceDocumentSchema.body.safeParse({
    title: 'Dokumen Lain',
    category: 'Kategori Lain',
  }).success, false);
  assert.equal(updateServiceDocumentSchema.body.safeParse({}).success, false);
});

test('service document query parses pagination and publication filters', () => {
  assert.deepEqual(listServiceDocumentsSchema.query.parse({}), { page: 1, limit: 10 });
  assert.deepEqual(listServiceDocumentsSchema.query.parse({
    page: '2',
    limit: '25',
    category: 'Produk LPMQ',
    is_published: 'false',
  }), {
    page: 2,
    limit: 25,
    category: 'Produk LPMQ',
    is_published: false,
  });
  assert.equal(listServiceDocumentsSchema.query.safeParse({ limit: '101' }).success, false);
});

test('public document listing always excludes drafts and scopes an optional category', async () => {
  const originalDelegate = Object.getOwnPropertyDescriptor(prisma, 'serviceDocument');
  const mockDelegate = {};
  try {
    mockDelegate.count = async ({ where }) => {
      assert.deepEqual(where, { is_published: true, category: 'Produk LPMQ' });
      return 1;
    };
    mockDelegate.findMany = async (query) => {
      assert.deepEqual(query.where, { is_published: true, category: 'Produk LPMQ' });
      assert.equal(query.skip, 10);
      assert.equal(query.take, 10);
      assert.equal(query.select.storage_path, undefined);
      return [{ id: 'doc-1', title: 'Dokumen Terbit', category: 'Produk LPMQ' }];
    };
    Object.defineProperty(prisma, 'serviceDocument', { configurable: true, value: mockDelegate });

    const result = await listPublicServiceDocuments({ page: 2, limit: 10, category: 'Produk LPMQ' });
    assert.equal(result.items[0].title, 'Dokumen Terbit');
    assert.deepEqual(result.pagination, { total: 1, page: 2, limit: 10, totalPages: 1 });
  } finally {
    if (originalDelegate) Object.defineProperty(prisma, 'serviceDocument', originalDelegate);
    else delete prisma.serviceDocument;
  }
});

test('public document download rejects unpublished documents', async () => {
  const originalDelegate = Object.getOwnPropertyDescriptor(prisma, 'serviceDocument');
  try {
    Object.defineProperty(prisma, 'serviceDocument', {
      configurable: true,
      value: { findUnique: async () => ({ id: 'doc-1', is_published: false }) },
    });
    await assert.rejects(getServiceDocumentFile('doc-1'), (error) => error.statusCode === 404);
  } finally {
    if (originalDelegate) Object.defineProperty(prisma, 'serviceDocument', originalDelegate);
    else delete prisma.serviceDocument;
  }
});

test('service document upload rejects a spoofed PDF before antivirus processing', async () => {
  await assert.rejects(
    validateServiceDocumentPdf({
      originalname: 'dokumen.pdf',
      buffer: Buffer.from('not a PDF'),
    }),
    (error) => error.statusCode === 400 && /PDF/.test(error.message)
  );
});
