import rateLimit from 'express-rate-limit';

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

export default {
  authRateLimiter,
  registrationRateLimiter,
};
