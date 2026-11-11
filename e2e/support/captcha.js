// Menjawab CAPTCHA formulir pengaduan dalam test E2E.
// Token CAPTCHA berisi jawaban terenkripsi (AES-256-GCM, kunci dari JWT_SECRET backend), sehingga hanya
// pihak yang memegang JWT_SECRET (di sini: test yang berjalan di mesin yang sama dengan backend) yang dapat membukanya.
import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const here = path.dirname(fileURLToPath(import.meta.url));

function backendSecret() {
  if (process.env.E2E_JWT_SECRET) return process.env.E2E_JWT_SECRET;
  try {
    const env = fs.readFileSync(path.resolve(here, '../../backend/.env'), 'utf8');
    const value = env.match(/^\s*JWT_SECRET\s*=\s*(.*)$/m)?.[1]?.trim().replace(/^["']|["']$/g, '');
    if (value) return value;
  } catch { /* .env tidak ada */ }
  return 'default_secret_fallback_do_not_use_in_prod';
}

export function solveCaptcha(token) {
  const raw = Buffer.from(token, 'base64url');
  const key = crypto.createHash('sha256').update(`complaint-captcha:${backendSecret()}`).digest();
  const decipher = crypto.createDecipheriv('aes-256-gcm', key, raw.subarray(0, 12));
  decipher.setAuthTag(raw.subarray(12, 28));
  return JSON.parse(Buffer.concat([decipher.update(raw.subarray(28)), decipher.final()]).toString('utf8')).a;
}

/**
 * Pantau CAPTCHA yang dimuat halaman (panggil sebelum membuka halaman). Mode dev React (StrictMode)
 * dapat memuat CAPTCHA dua kali; jawaban yang dipakai selalu milik CAPTCHA terakhir yang tampil.
 */
export function pantauCaptcha(page) {
  let latest = null;
  page.on('response', async (response) => {
    if (!response.url().includes('/complaints/captcha') || !response.ok()) return;
    try {
      const token = (await response.json())?.data?.token;
      if (token) latest = token;
    } catch { /* respons bukan JSON */ }
  });
  return async () => {
    // Tunggu sampai gambar tampil dan permintaan CAPTCHA selesai
    await page.getByAltText('Gambar kode verifikasi').waitFor();
    await page.waitForLoadState('networkidle').catch(() => {});
    if (!latest) throw new Error('CAPTCHA belum dimuat.');
    return solveCaptcha(latest);
  };
}
