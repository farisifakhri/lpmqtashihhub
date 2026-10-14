import dotenv from 'dotenv';
dotenv.config();

const nodeEnv = process.env.NODE_ENV || 'development';
const isDevOrTest = ['development', 'test'].includes(nodeEnv);
const isProduction = nodeEnv === 'production';
const rawJwtSecret = process.env.JWT_SECRET;

const INSECURE_JWT_SECRETS = [
  'default_secret_fallback_do_not_use_in_prod',
  'lpmq_secret_key_super_secure_jwt_2026_pentashihan',
  'secret',
  'secret123',
  'changeme',
];

if (!isDevOrTest && (!rawJwtSecret || INSECURE_JWT_SECRETS.includes(rawJwtSecret) || rawJwtSecret.length < 32)) {
  throw new Error('FATAL SECURITY ERROR: JWT_SECRET environment variable is required, must not use default/example fallback values, and must be at least 32 characters in non-development environments!');
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
  PUBLIC_APP_URL: process.env.PUBLIC_APP_URL || (isProduction ? null : 'http://localhost:5173'),
  ENABLE_PASSWORD_RESET: process.env.ENABLE_PASSWORD_RESET !== 'false',
  AV_SCAN_MODE: (process.env.AV_SCAN_MODE || (isProduction ? 'required' : 'optional')).toLowerCase(),
  CLAMAV_HOST: process.env.CLAMAV_HOST || '127.0.0.1',
  CLAMAV_PORT: parseInt(process.env.CLAMAV_PORT || '3310', 10),
  CLAMAV_SOCKET: process.env.CLAMAV_SOCKET || null,
  CLAMAV_TIMEOUT_MS: parseInt(process.env.CLAMAV_TIMEOUT_MS || '10000', 10),
  LPMQ_QURAN_USERNAME: process.env.LPMQ_QURAN_USERNAME || null,
  LPMQ_QURAN_TOKEN: process.env.LPMQ_QURAN_TOKEN || null,
};

export default ENV;
