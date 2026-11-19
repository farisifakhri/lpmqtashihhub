import { rateLimit, ipKeyGenerator } from 'express-rate-limit';

export const shouldSkipRateLimit = () => process.env.NODE_ENV === 'test';

/**
 * Ekstraksi Client IP sebenarnya di balik Cloudflare / Nginx reverse proxy.
 * Prioritas: CF-Connecting-IP > X-Forwarded-For (hop pertama) > X-Real-IP > req.ip > socket
 */
export const getClientIp = (req) => {
  const cfIp = req.headers?.['cf-connecting-ip'];
  if (cfIp && typeof cfIp === 'string' && cfIp.trim()) return cfIp.trim();

  const xForwardedFor = req.headers?.['x-forwarded-for'];
  if (xForwardedFor && typeof xForwardedFor === 'string') {
    const first = xForwardedFor.split(',')[0].trim();
    if (first) return first;
  }

  const xRealIp = req.headers?.['x-real-ip'];
  if (xRealIp && typeof xRealIp === 'string' && xRealIp.trim()) return xRealIp.trim();

  if (typeof req.ip === 'string' && req.ip.trim()) return req.ip.trim();
  if (typeof req.socket?.remoteAddress === 'string' && req.socket.remoteAddress.trim()) {
    return req.socket.remoteAddress.trim();
  }

  try {
    const gen = ipKeyGenerator(req);
    return typeof gen === 'string' ? gen : (req.ip || '127.0.0.1');
  } catch {
    return req.ip || '127.0.0.1';
  }
};

export const authAccountKeyGenerator = (req) => {
  const ip = getClientIp(req);
  const email = (req.body?.email || '').trim().toLowerCase();
  return email ? `${ip}_${email}` : ip;
};

export const authIpKeyGenerator = (req) => getClientIp(req);

// Rate limiter per-akun per-IP: hanya menghitung percobaan login yang GAGAL (skipSuccessfulRequests: true)
// Ini mencegah pemblokiran pengguna lain di jaringan/WiFi yang sama saat 1 orang salah password
export const authRateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 menit
  max: 15, // Maksimal 15 percobaan gagal per akun per IP
  skip: shouldSkipRateLimit,
  skipSuccessfulRequests: true, // Login berhasil TIDAK dihitung sebagai percobaan gagal
  keyGenerator: authAccountKeyGenerator,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    success: false,
    message: 'Terlalu banyak percobaan masuk yang gagal untuk akun ini. Silakan coba lagi setelah 15 menit.',
  },
});

// Rate limiter per-IP global: mencegah serangan brute-force masif (password spraying) lintas banyak akun dari 1 IP
export const authIpRateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 menit
  max: 60, // 60 percobaan gagal dari IP yang sama dalam 15 menit
  skip: shouldSkipRateLimit,
  skipSuccessfulRequests: true, // Login berhasil tidak dihitung
  keyGenerator: authIpKeyGenerator,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    success: false,
    message: 'Terlalu banyak percobaan masuk yang gagal dari jaringan Anda. Silakan coba lagi setelah 15 menit.',
  },
});

export const registrationRateLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 jam
  max: 10,
  skip: shouldSkipRateLimit,
  keyGenerator: (req) => getClientIp(req),
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    success: false,
    message: 'Batas pendaftaran dari IP ini tercapai. Silakan coba lagi nanti.',
  },
});

export const uploadRateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 menit
  max: 60, // 60 unggah per 15 menit
  skip: shouldSkipRateLimit,
  keyGenerator: (req) => getClientIp(req),
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    success: false,
    message: 'Batas unggah berkas tercapai. Silakan coba lagi beberapa saat lagi.',
  },
});

export const forgotPasswordRateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 menit
  max: 5, // 5 permintaan pemulihan per 15 menit per IP & email
  skip: shouldSkipRateLimit,
  keyGenerator: (req) => {
    const ip = getClientIp(req);
    const email = (req.body?.email || '').trim().toLowerCase();
    return email ? `${ip}_${email}` : ip;
  },
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    success: false,
    message: 'Terlalu banyak permintaan pemulihan kata sandi. Silakan coba lagi setelah 15 menit.',
  },
});

export const publisherRegistrationRateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 menit
  max: 10, // Maksimal 10 pendaftaran per 15 menit per IP
  skip: shouldSkipRateLimit,
  keyGenerator: (req) => getClientIp(req),
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    success: false,
    code: 'RATE_LIMITED',
    message: 'Terlalu banyak percobaan pendaftaran akun penerbit dari IP ini. Silakan coba lagi setelah 15 menit.',
  },
});

export const publisherStatusCheckRateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 menit
  max: 20, // Maksimal 20 pengecekan status per 15 menit per IP
  skip: shouldSkipRateLimit,
  keyGenerator: (req) => getClientIp(req),
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    success: false,
    code: 'RATE_LIMITED',
    message: 'Terlalu banyak permintaan pengecekan status dari IP ini. Silakan coba lagi setelah 15 menit.',
  },
});

export const masterRequestRateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 menit
  max: 10, // Maksimal 10 permohonan master per 15 menit per IP
  skip: shouldSkipRateLimit,
  keyGenerator: (req) => getClientIp(req),
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    success: false,
    code: 'RATE_LIMITED',
    message: 'Terlalu banyak permohonan master mushaf dari IP ini. Silakan coba lagi setelah 15 menit.',
  },
});

export const complaintSubmitRateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 menit
  max: 10, // Maksimal 10 pengiriman pengaduan per 15 menit per IP
  skip: shouldSkipRateLimit,
  keyGenerator: (req) => getClientIp(req),
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    success: false,
    code: 'RATE_LIMITED',
    message: 'Terlalu banyak pengaduan dari jaringan Anda. Silakan coba lagi setelah 15 menit.',
  },
});

export const complaintTrackRateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 menit
  max: 30, // Mencegah penebakan kode pengaduan
  skip: shouldSkipRateLimit,
  keyGenerator: (req) => getClientIp(req),
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    success: false,
    code: 'RATE_LIMITED',
    message: 'Terlalu banyak percobaan pelacakan. Silakan coba lagi setelah 15 menit.',
  },
});

export const captchaRateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 menit
  max: 60,
  skip: shouldSkipRateLimit,
  keyGenerator: (req) => getClientIp(req),
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    success: false,
    code: 'RATE_LIMITED',
    message: 'Terlalu banyak permintaan kode verifikasi. Silakan coba lagi setelah 15 menit.',
  },
});

export default {
  authRateLimiter,
  authIpRateLimiter,
  registrationRateLimiter,
  uploadRateLimiter,
  forgotPasswordRateLimiter,
  publisherRegistrationRateLimiter,
  publisherStatusCheckRateLimiter,
  masterRequestRateLimiter,
  complaintSubmitRateLimiter,
  complaintTrackRateLimiter,
  captchaRateLimiter,
};
