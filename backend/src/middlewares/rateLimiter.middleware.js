import { rateLimit, ipKeyGenerator } from 'express-rate-limit';

export const shouldSkipRateLimit = () => process.env.NODE_ENV === 'test';

export const authRateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 menit
  max: 20, // 20 percobaan per 15 menit
  skip: shouldSkipRateLimit,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    success: false,
    message: 'Terlalu banyak percobaan masuk dari IP ini. Silakan coba lagi setelah 15 menit.',
  },
});

export const registrationRateLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 jam
  max: 10,
  skip: shouldSkipRateLimit,
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
    const ip = ipKeyGenerator(req);
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

export default {
  authRateLimiter,
  registrationRateLimiter,
  uploadRateLimiter,
  forgotPasswordRateLimiter,
};
