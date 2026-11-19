import test from 'node:test';
import assert from 'node:assert/strict';
import {
  getClientIp,
  authAccountKeyGenerator,
  authIpKeyGenerator,
} from '../../src/middlewares/rateLimiter.middleware.js';

test('RateLimiter: getClientIp mengekstrak IP sebenarnya dari reverse proxy / Cloudflare', () => {
  // 1. Cloudflare CF-Connecting-IP diprioritaskan
  const reqCf = {
    headers: {
      'cf-connecting-ip': '203.0.113.195',
      'x-forwarded-for': '203.0.113.195, 172.68.1.1',
      'x-real-ip': '172.68.1.1',
    },
    ip: '127.0.0.1',
  };
  assert.equal(getClientIp(reqCf), '203.0.113.195');

  // 2. X-Forwarded-For mengambil client IP pertama (hop pertama)
  const reqXff = {
    headers: {
      'x-forwarded-for': '198.51.100.42, 10.0.0.1',
    },
    ip: '10.0.0.1',
  };
  assert.equal(getClientIp(reqXff), '198.51.100.42');

  // 3. X-Real-IP jika tidak ada CF/XFF
  const reqXri = {
    headers: {
      'x-real-ip': '192.0.2.1',
    },
    ip: '127.0.0.1',
  };
  assert.equal(getClientIp(reqXri), '192.0.2.1');

  // 4. Fallback ke req.ip bila tidak ada header proxy
  const reqDirect = {
    headers: {},
    ip: '103.10.5.2',
  };
  assert.equal(getClientIp(reqDirect), '103.10.5.2');
});

test('RateLimiter: authAccountKeyGenerator mengisolasi percobaan login per-akun per-IP', () => {
  const reqA = {
    headers: { 'cf-connecting-ip': '114.122.1.50' },
    body: { email: 'nabil@example.com' },
  };
  const reqB = {
    headers: { 'cf-connecting-ip': '114.122.1.50' },
    body: { email: 'afdhal@example.com' },
  };

  // Kedua laptop berada di WiFi/NAT yang sama (IP sama), tetapi login ke akun berbeda
  // keyGenerator wajib menghasilkan kunci yang berbeda agar kegagalan akun A tidak memblokir akun B
  const keyA = authAccountKeyGenerator(reqA);
  const keyB = authAccountKeyGenerator(reqB);

  assert.equal(keyA, '114.122.1.50_nabil@example.com');
  assert.equal(keyB, '114.122.1.50_afdhal@example.com');
  assert.notEqual(keyA, keyB);
});

test('RateLimiter: authIpKeyGenerator mengawasi akumulasi IP secara menyeluruh', () => {
  const req = {
    headers: { 'cf-connecting-ip': '114.122.1.50' },
    body: { email: 'siapapun@example.com' },
  };
  assert.equal(authIpKeyGenerator(req), '114.122.1.50');
});
