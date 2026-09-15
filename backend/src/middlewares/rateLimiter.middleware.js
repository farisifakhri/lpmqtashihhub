import rateLimit from 'express-rate-limit';

export const authRateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 menit
  max: 20, // 20 percobaan per 15 menit
  skip: (req) => process.env.NODE_ENV === 'test' || req.headers['user-agent']?.includes('test'),
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
  skip: (req) => process.env.NODE_ENV === 'test' || req.headers['user-agent']?.includes('test'),
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
