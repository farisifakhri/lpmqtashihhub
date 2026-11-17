// CAPTCHA mandiri untuk formulir publik (tanpa layanan pihak ketiga).
// - Gambar SVG digambar sebagai goresan path (bukan elemen <text>), dengan rotasi, distorsi, dan garis pengganggu,
//   sehingga jawabannya tidak dapat dibaca langsung dari markup.
// - Jawaban tidak disimpan di server: dibungkus di dalam token terenkripsi AES-256-GCM (kunci diturunkan dari
//   JWT_SECRET), berlaku 10 menit, dan hanya dapat dipakai satu kali per proses server.
import crypto from 'node:crypto';
import { ENV } from '../config/env.js';

export const CAPTCHA_TTL_MS = 10 * 60 * 1000;
export const CAPTCHA_LENGTH = 5;

// Glyph goresan pada grid 4 x 6 (karakter mirip seperti 0/O, 1/I, B/8, S/5 sengaja tidak dipakai)
const GLYPHS = {
  2: [[[0, 1], [1, 0], [3, 0], [4, 1], [4, 2], [0, 6], [4, 6]]],
  3: [[[0, 0], [4, 0], [2, 2.5], [3.5, 3], [4, 4.5], [3, 6], [1, 6], [0, 5]]],
  4: [[[3, 6], [3, 0], [0, 4], [4, 4]]],
  6: [[[4, 0.5], [3, 0], [1, 0], [0, 1.5], [0, 5], [1, 6], [3, 6], [4, 5], [4, 3.6], [3, 2.8], [1, 2.8], [0, 3.6]]],
  7: [[[0, 0], [4, 0], [1.5, 6]]],
  9: [[[4, 2.5], [3, 3.2], [1, 3.2], [0, 2.5], [0, 1], [1, 0], [3, 0], [4, 1], [4, 5], [3, 6], [1, 6], [0, 5.4]]],
  A: [[[0, 6], [2, 0], [4, 6]], [[1, 3.6], [3, 3.6]]],
  C: [[[4, 1], [3, 0], [1, 0], [0, 1.5], [0, 4.5], [1, 6], [3, 6], [4, 5]]],
  E: [[[4, 0], [0, 0], [0, 6], [4, 6]], [[0, 3], [3, 3]]],
  F: [[[4, 0], [0, 0], [0, 6]], [[0, 3], [3, 3]]],
  H: [[[0, 0], [0, 6]], [[4, 0], [4, 6]], [[0, 3], [4, 3]]],
  K: [[[0, 0], [0, 6]], [[4, 0], [0, 3.6]], [[1.3, 2.6], [4, 6]]],
  L: [[[0, 0], [0, 6], [4, 6]]],
  M: [[[0, 6], [0, 0], [2, 3.5], [4, 0], [4, 6]]],
  N: [[[0, 6], [0, 0], [4, 6], [4, 0]]],
  P: [[[0, 6], [0, 0], [3, 0], [4, 1], [4, 2.2], [3, 3.2], [0, 3.2]]],
  R: [[[0, 6], [0, 0], [3, 0], [4, 1], [4, 2.2], [3, 3.2], [0, 3.2]], [[2, 3.2], [4, 6]]],
  T: [[[0, 0], [4, 0]], [[2, 0], [2, 6]]],
  U: [[[0, 0], [0, 5], [1, 6], [3, 6], [4, 5], [4, 0]]],
  W: [[[0, 0], [1, 6], [2, 2.5], [3, 6], [4, 0]]],
  X: [[[0, 0], [4, 6]], [[4, 0], [0, 6]]],
  Y: [[[0, 0], [2, 3]], [[4, 0], [2, 3], [2, 6]]],
};
export const CAPTCHA_ALPHABET = Object.keys(GLYPHS).join('');

const WIDTH = 200;
const HEIGHT = 64;
const INK = ['#1f3d2b', '#24324a', '#4a2b1f', '#3b2a4a', '#1f4a46'];

const key = () => crypto.createHash('sha256').update(`complaint-captcha:${ENV.JWT_SECRET}`).digest();
const rand = (min, max) => min + crypto.randomInt(0, 10_000) / 10_000 * (max - min);
const pick = (list) => list[crypto.randomInt(0, list.length)];
const fmt = (n) => Math.round(n * 10) / 10;

// Token yang sudah dipakai (sekali pakai). Disimpan di memori proses; kedaluwarsa bersama token.
const usedTokens = new Map();
function rememberUsed(id, expiresAt) {
  const now = Date.now();
  for (const [usedId, exp] of usedTokens) if (exp < now) usedTokens.delete(usedId);
  usedTokens.set(id, expiresAt);
}

export function randomCaptchaText(length = CAPTCHA_LENGTH) {
  return Array.from({ length }, () => CAPTCHA_ALPHABET[crypto.randomInt(0, CAPTCHA_ALPHABET.length)]).join('');
}

/** Gambar SVG berisi teks CAPTCHA sebagai goresan path. */
export function renderCaptchaSvg(answer) {
  const parts = [];
  // Garis pengganggu di belakang
  for (let i = 0; i < 5; i += 1) {
    parts.push(`<path d="M${fmt(rand(0, 30))} ${fmt(rand(5, HEIGHT - 5))} C${fmt(rand(40, 90))} ${fmt(rand(0, HEIGHT))} ${fmt(rand(100, 160))} ${fmt(rand(0, HEIGHT))} ${fmt(rand(170, WIDTH))} ${fmt(rand(5, HEIGHT - 5))}" stroke="${pick(INK)}" stroke-opacity="0.35" stroke-width="${fmt(rand(1, 2))}" fill="none"/>`);
  }
  const step = (WIDTH - 30) / answer.length;
  [...answer].forEach((char, index) => {
    const sx = rand(5.2, 6.4);
    const sy = rand(6, 7.2);
    const cx = 15 + step * index + step / 2;
    const cy = HEIGHT / 2 + rand(-4, 4);
    const angle = rand(-0.38, 0.38);
    const skew = rand(-0.25, 0.25);
    const transform = ([gx, gy]) => {
      const x = (gx - 2 + rand(-0.22, 0.22)) * sx;
      const y = (gy - 3 + rand(-0.22, 0.22)) * sy;
      const xs = x + skew * y;
      return [cx + xs * Math.cos(angle) - y * Math.sin(angle), cy + xs * Math.sin(angle) + y * Math.cos(angle)];
    };
    const d = GLYPHS[char]
      .map((stroke) => stroke.map(transform).map(([x, y], i) => `${i === 0 ? 'M' : 'L'}${fmt(x)} ${fmt(y)}`).join(' '))
      .join(' ');
    parts.push(`<path d="${d}" stroke="${pick(INK)}" stroke-width="${fmt(rand(2.4, 3.2))}" stroke-linecap="round" stroke-linejoin="round" fill="none"/>`);
  });
  // Titik dan garis pengganggu di depan
  for (let i = 0; i < 28; i += 1) {
    parts.push(`<circle cx="${fmt(rand(0, WIDTH))}" cy="${fmt(rand(0, HEIGHT))}" r="${fmt(rand(0.6, 1.6))}" fill="${pick(INK)}" fill-opacity="0.45"/>`);
  }
  for (let i = 0; i < 2; i += 1) {
    parts.push(`<path d="M0 ${fmt(rand(15, HEIGHT - 15))} Q${fmt(WIDTH / 2)} ${fmt(rand(0, HEIGHT))} ${WIDTH} ${fmt(rand(15, HEIGHT - 15))}" stroke="${pick(INK)}" stroke-opacity="0.6" stroke-width="1.4" fill="none"/>`);
  }
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${WIDTH}" height="${HEIGHT}" viewBox="0 0 ${WIDTH} ${HEIGHT}"><rect width="100%" height="100%" fill="#f4f1e8"/>${parts.join('')}</svg>`;
}

export function sealCaptcha(answer, now = Date.now()) {
  const payload = JSON.stringify({ id: crypto.randomUUID(), a: answer, exp: now + CAPTCHA_TTL_MS });
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv('aes-256-gcm', key(), iv);
  const encrypted = Buffer.concat([cipher.update(payload, 'utf8'), cipher.final()]);
  return Buffer.concat([iv, cipher.getAuthTag(), encrypted]).toString('base64url');
}

function openCaptcha(token) {
  try {
    const raw = Buffer.from(String(token), 'base64url');
    if (raw.length < 29) return null;
    const decipher = crypto.createDecipheriv('aes-256-gcm', key(), raw.subarray(0, 12));
    decipher.setAuthTag(raw.subarray(12, 28));
    const payload = Buffer.concat([decipher.update(raw.subarray(28)), decipher.final()]).toString('utf8');
    return JSON.parse(payload);
  } catch {
    return null;
  }
}

export function createCaptcha() {
  const answer = randomCaptchaText();
  const svg = renderCaptchaSvg(answer);
  return {
    token: sealCaptcha(answer),
    image: `data:image/svg+xml;base64,${Buffer.from(svg).toString('base64')}`,
    expires_in: CAPTCHA_TTL_MS / 1000,
  };
}

const captchaError = (message) => Object.assign(new Error(message), { statusCode: 400, code: 'CAPTCHA_INVALID', errors: [{ field: 'captcha_jawaban', message }] });

/** Verifikasi jawaban CAPTCHA. Token langsung hangus setelah diperiksa (benar maupun salah). */
export function verifyCaptcha(token, answer, now = Date.now()) {
  const payload = openCaptcha(token);
  if (!payload?.id || !payload?.a) throw captchaError('Verifikasi keamanan tidak valid. Muat ulang kode verifikasi, lalu coba lagi.');
  if (usedTokens.has(payload.id)) throw captchaError('Kode verifikasi sudah dipakai. Muat ulang kode verifikasi, lalu coba lagi.');
  if (payload.exp < now) throw captchaError('Kode verifikasi sudah kedaluwarsa. Muat ulang kode verifikasi, lalu coba lagi.');
  rememberUsed(payload.id, payload.exp);
  const given = String(answer || '').trim().toUpperCase();
  const expected = Buffer.from(payload.a);
  const actual = Buffer.from(given.padEnd(payload.a.length).slice(0, payload.a.length));
  if (given.length !== payload.a.length || !crypto.timingSafeEqual(expected, actual)) {
    throw captchaError('Kode verifikasi tidak sesuai. Ketik ulang kode pada gambar yang baru.');
  }
  return true;
}
