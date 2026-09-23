import dotenv from 'dotenv';
dotenv.config();

const isProduction = process.env.NODE_ENV === 'production';
const rawJwtSecret = process.env.JWT_SECRET;

const INSECURE_JWT_SECRETS = [
  'default_secret_fallback_do_not_use_in_prod',
  'lpmq_secret_key_super_secure_jwt_2026_pentashihan',
  'secret',
  'secret123',
  'changeme',
];

if (isProduction && (!rawJwtSecret || INSECURE_JWT_SECRETS.includes(rawJwtSecret) || rawJwtSecret.length < 32)) {
  throw new Error('FATAL SECURITY ERROR: JWT_SECRET environment variable is required, must not use default/example fallback values, and must be at least 32 characters in production!');
}

if (!rawJwtSecret) {
  console.warn('⚠️  SECURITY WARNING: Using fallback JWT_SECRET in development. Define JWT_SECRET in your .env file before production deployment.');
}

const rawAllowedOrigins = process.env.ALLOWED_ORIGINS;
const defaultOrigins = [
  'http://localhost:5173',
  'http://127.0.0.1:5173',
  'http://localhost:3000',
  'http://127.0.0.1:3000',
  'http://localhost:4173',
  'http://127.0.0.1:4173',
];

export const ENV = {
  PORT: process.env.PORT || 5000,
  NODE_ENV: process.env.NODE_ENV || 'development',
  DATABASE_URL: process.env.DATABASE_URL,
  JWT_SECRET: rawJwtSecret || 'default_secret_fallback_do_not_use_in_prod',
  JWT_EXPIRES_IN: process.env.JWT_EXPIRES_IN || '7d',
  UPLOAD_DIR: process.env.UPLOAD_DIR || './storage/uploads',
  ALLOWED_ORIGINS: rawAllowedOrigins
    ? rawAllowedOrigins.split(',').map((origin) => origin.trim()).filter(Boolean)
    : defaultOrigins,
};

export default ENV;
