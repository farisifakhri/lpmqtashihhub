import test from 'node:test';
import assert from 'node:assert/strict';
import { z } from 'zod';
import jwt from 'jsonwebtoken';
import { validate } from '../src/middlewares/validate.middleware.js';
import { errorHandler } from '../src/middlewares/error.middleware.js';
import { authenticate } from '../src/middlewares/auth.middleware.js';
import { prisma } from '../src/config/database.js';
import { ENV } from '../src/config/env.js';
import { requireStatus } from '../src/services/workflow-utils.js';

const response = () => ({ status(code) { this.statusCode = code; return this; }, json(body) { this.body = body; return this; } });

test('validation summary identifies required fields in Indonesian and preserves field paths', () => {
  const res = response();
  validate({ body: z.object({ receipt_file_id: z.string().uuid(), notes: z.string().min(1) }) })({ body: {} }, res, assert.fail);
  assert.equal(res.statusCode, 400);
  assert.match(res.body.message, /Bukti pembayaran wajib diisi/);
  assert.match(res.body.message, /Catatan wajib diisi/);
  assert.equal(res.body.errors[0].field, 'receipt_file_id');
  assert.doesNotMatch(res.body.message, /Required|Expected|undefined/);
});

test('validation preserves specific schema messages and explains array and unsupported fields', () => {
  const res = response();
  validate({ body: z.object({ assignee_ids: z.array(z.string()).min(1), email: z.string().email('Gunakan alamat email yang valid.') }).strict() })({ body: { assignee_ids: [], email: 'invalid', amount: 1 } }, res, assert.fail);
  assert.match(res.body.message, /minimal 1 pilihan/);
  assert.match(res.body.message, /Gunakan alamat email yang valid/);
  assert.match(res.body.message, /isian tambahan/);
});

test('workflow errors explain current status and required stage without enum codes', () => {
  assert.throws(() => requireStatus({ status: 'WAITING_VERIFICATION_APPROVAL' }, ['AWAITING_PAYMENT']), error => {
    assert.equal(error.statusCode, 409);
    assert.match(error.message, /Menunggu persetujuan Kepala LPMQ/);
    assert.match(error.message, /Menunggu pembayaran/);
    assert.doesNotMatch(error.message, /WAITING_|AWAITING_/);
    return true;
  });
});

test('server distinguishes malformed requests, oversized upload, concurrency and unavailable data', t => {
  t.mock.method(console, 'error', () => {});
  for (const [error, status, expected] of [
    [{ type: 'entity.parse.failed', status: 400 }, 400, /Muat ulang formulir/],
    [{ type: 'entity.too.large', status: 413 }, 413, /maksimal 10 MB/],
    [{ name: 'PrismaClientKnownRequestError', code: 'P2034' }, 409, /petugas atau permintaan lain/],
    [{ name: 'PrismaClientInitializationError' }, 503, /Layanan data/],
    [new Error('SQL SELECT secret_table password_hash'), 500, /gangguan sistem/],
  ]) {
    const res = response();
    errorHandler(error, { path: '/api/v1/uploads' }, res, assert.fail);
    assert.equal(res.statusCode, status);
    assert.match(res.body.message, expected);
    assert.doesNotMatch(res.body.message, /secret_table|password_hash|Prisma/);
  }
});

test('database failure during authentication is forwarded instead of falsely reporting invalid session', async t => {
  const failure = Object.assign(new Error('offline'), { name: 'PrismaClientInitializationError' });
  const original = prisma.user.findUnique;
  prisma.user.findUnique = async () => { throw failure; };
  t.after(() => { prisma.user.findUnique = original; });
  const token = jwt.sign({ userId: 'user' }, ENV.JWT_SECRET);
  let forwarded;
  const res = response();
  await authenticate({ headers: { authorization: `Bearer ${token}` } }, res, error => { forwarded = error; });
  assert.equal(forwarded, failure);
  assert.equal(res.statusCode, undefined);
});
