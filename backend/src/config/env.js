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
  PUBLIC_APP_URL: process.env.PUBLIC_APP_URL || (isProduction ? null : 'http://localhost:3000'),
  ENABLE_PASSWORD_RESET: process.env.ENABLE_PASSWORD_RESET !== 'false',
  AV_SCAN_MODE: (process.env.AV_SCAN_MODE || (process.env.ENABLE_CLAMAV === 'false' ? 'off' : isProduction ? 'required' : 'optional')).toLowerCase(),
  CLAMAV_HOST: process.env.CLAMAV_HOST || '127.0.0.1',
  CLAMAV_PORT: parseInt(process.env.CLAMAV_PORT || '3310', 10),
  CLAMAV_SOCKET: process.env.CLAMAV_SOCKET || null,
  CLAMAV_TIMEOUT_MS: parseInt(process.env.CLAMAV_TIMEOUT_MS || '10000', 10),
  MAIL_DRIVER: (process.env.MAIL_DRIVER || (isProduction ? 'smtp' : 'internal')).toLowerCase(),
  MAIL_FROM_ADDRESS: process.env.MAIL_FROM_ADDRESS || 'no-reply@lpmq.kemenag.go.id',
  MAIL_FROM_NAME: process.env.MAIL_FROM_NAME || 'LPMQ Kementerian Agama RI',
  SMTP_HOST: process.env.SMTP_HOST || null,
  SMTP_PORT: parseInt(process.env.SMTP_PORT || '587', 10),
  SMTP_SECURE: process.env.SMTP_SECURE === 'true',
  SMTP_USER: process.env.SMTP_USER || null,
  SMTP_PASS: process.env.SMTP_PASS || null,
  SMTP_REQUIRE_TLS: process.env.SMTP_REQUIRE_TLS !== 'false',
  SMTP_TIMEOUT_MS: parseInt(process.env.SMTP_TIMEOUT_MS || '15000', 10),
  LPMQ_QURAN_USERNAME: process.env.LPMQ_QURAN_USERNAME || null,
  LPMQ_QURAN_TOKEN: process.env.LPMQ_QURAN_TOKEN || null,
  WHATSAPP_DRIVER: (process.env.WHATSAPP_DRIVER || 'mock').toLowerCase(),
  QONTAK_CLIENT_ID: process.env.QONTAK_CLIENT_ID || null,
  QONTAK_CLIENT_SECRET: process.env.QONTAK_CLIENT_SECRET || null,
  QONTAK_API_BASE_URL: (process.env.QONTAK_API_BASE_URL || 'https://api.mekari.com/qontak/chat/v1').replace(/\/$/, ''),
  QONTAK_CHANNEL_INTEGRATION_ID: process.env.QONTAK_CHANNEL_INTEGRATION_ID || null,
  QONTAK_WHATSAPP_BUSINESS_USER_ID: process.env.QONTAK_WHATSAPP_BUSINESS_USER_ID || null,
  QONTAK_TEMPLATE_NAME: process.env.QONTAK_TEMPLATE_NAME || null,
  QONTAK_TEMPLATE_UUID: process.env.QONTAK_TEMPLATE_UUID || null,
  QONTAK_TIMEOUT_MS: parseInt(process.env.QONTAK_TIMEOUT_MS || '15000', 10),
};

if (!['internal', 'smtp'].includes(ENV.MAIL_DRIVER)) {
  throw new Error('MAIL_DRIVER harus bernilai "internal" atau "smtp".');
}

if (ENV.MAIL_DRIVER === 'smtp' && (!ENV.SMTP_HOST || !ENV.SMTP_USER || !ENV.SMTP_PASS)) {
  throw new Error('MAIL_DRIVER=smtp memerlukan SMTP_HOST, SMTP_USER, dan SMTP_PASS.');
}

if (!['mock', 'qontak'].includes(ENV.WHATSAPP_DRIVER)) {
  throw new Error('WHATSAPP_DRIVER harus bernilai "mock" atau "qontak".');
}

if (ENV.WHATSAPP_DRIVER === 'qontak' && (!ENV.QONTAK_CLIENT_ID || !ENV.QONTAK_CLIENT_SECRET || !ENV.QONTAK_CHANNEL_INTEGRATION_ID || !ENV.QONTAK_TEMPLATE_UUID)) {
  console.warn('⚠️  Qontak OTP belum siap: isi QONTAK_CLIENT_ID, QONTAK_CLIENT_SECRET, QONTAK_CHANNEL_INTEGRATION_ID, dan QONTAK_TEMPLATE_UUID.');
}

if (
  ENV.PUBLIC_APP_URL &&
  !ENV.PUBLIC_APP_URL.includes('localhost') &&
  !ENV.PUBLIC_APP_URL.includes('127.0.0.1') &&
  ENV.MAIL_DRIVER !== 'smtp'
) {
  console.warn(
    `⚠️  MAIL WARNING: PUBLIC_APP_URL (${ENV.PUBLIC_APP_URL}) bukan localhost, tetapi MAIL_DRIVER diatur ke "${ENV.MAIL_DRIVER}". Email tidak akan terkirim ke pengguna nyata via SMTP.`
  );
}

export default ENV;
