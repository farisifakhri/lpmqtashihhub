// Manajemen sesi login untuk test E2E.
// Endpoint /auth/login dibatasi 20 percobaan / 15 menit per IP, jadi token tiap akun
// disimpan di e2e/.auth/tokens.json dan dipakai ulang selama masih valid (dicek ke /auth/me).
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { ACCOUNTS, PASSWORD } from './accounts.js';

const here = path.dirname(fileURLToPath(import.meta.url));
const CACHE_FILE = path.resolve(here, '../.auth/tokens.json');
export const API_URL = (process.env.E2E_API_URL || 'http://127.0.0.1:5000') + '/api/v1';

const readCache = () => {
  try { return JSON.parse(fs.readFileSync(CACHE_FILE, 'utf8')); } catch { return {}; }
};
const writeCache = (cache) => {
  fs.mkdirSync(path.dirname(CACHE_FILE), { recursive: true });
  fs.writeFileSync(CACHE_FILE, JSON.stringify(cache, null, 2));
};

const isTokenValid = async (token) => {
  const res = await fetch(`${API_URL}/auth/me`, { headers: { Authorization: `Bearer ${token}` } });
  return res.ok;
};

export async function loginApi(email, password = PASSWORD) {
  const res = await fetch(`${API_URL}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password }),
  });
  const body = await res.json().catch(() => ({}));
  if (res.status === 429) {
    throw new Error(`Login ${email} terkena rate limit (429). Tunggu ${res.headers.get('retry-after') || '±900'} detik, atau jalankan backend dengan NODE_ENV=test.`);
  }
  if (!res.ok || !body?.data?.token) throw new Error(`Login ${email} gagal (${res.status}): ${body?.message}`);
  return body.data.token;
}

/** Ambil token akun (dari cache bila masih valid, selain itu login ulang). */
export async function getToken(accountKey) {
  const account = ACCOUNTS[accountKey];
  if (!account) throw new Error(`Akun uji tidak dikenal: ${accountKey}`);
  const cache = readCache();
  const cached = cache[account.email];
  if (cached && await isTokenValid(cached)) return cached;
  const token = await loginApi(account.email);
  writeCache({ ...readCache(), [account.email]: token });
  return token;
}

/** Panggil API backend sebagai akun tertentu (untuk persiapan/verifikasi data). */
export async function api(accountKey, method, urlPath, body) {
  const token = await getToken(accountKey);
  const account = ACCOUNTS[accountKey];
  const res = await fetch(`${API_URL}${urlPath}`, {
    method,
    headers: {
      Authorization: `Bearer ${token}`,
      'X-Active-Role': account.role,
      ...(body ? { 'Content-Type': 'application/json' } : {}),
    },
    body: body ? JSON.stringify(body) : undefined,
  });
  const json = await res.json().catch(() => null);
  return { status: res.status, body: json };
}

/** Pasang sesi login ke browser context (token + peran aktif di localStorage). */
export async function attachSession(context, accountKey) {
  const token = await getToken(accountKey);
  const { role } = ACCOUNTS[accountKey];
  await context.addInitScript(([t, r]) => {
    window.localStorage.setItem('lpmq_token', t);
    window.localStorage.setItem('lpmq_active_role', r);
  }, [token, role]);
}
