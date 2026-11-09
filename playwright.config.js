// Konfigurasi test E2E (Playwright) untuk aplikasi LPMQ.
// Prasyarat: MySQL + backend (port 5000) berjalan dan database sudah di-seed (npm --prefix backend run prisma:seed).
// Frontend E2E dinyalakan otomatis di port 5173 (terpisah dari server dev harian di port 3000,
// dan termasuk dalam ALLOWED_ORIGINS backend). Set E2E_BASE_URL untuk memakai server lain.
import { defineConfig, devices } from '@playwright/test';

const E2E_PORT = 5173;
const BASE_URL = process.env.E2E_BASE_URL || `http://localhost:${E2E_PORT}`;

export default defineConfig({
  testDir: './e2e/specs',
  globalSetup: './e2e/global-setup.js',
  outputDir: './e2e/.results',
  timeout: 45_000,
  expect: { timeout: 10_000 },
  // Data uji dipakai bersama (satu database), jadi test dijalankan berurutan agar tidak saling mengganggu.
  fullyParallel: false,
  workers: 1,
  retries: process.env.CI ? 1 : 0,
  reporter: [['list'], ['html', { outputFolder: './e2e/.report', open: 'never' }]],
  use: {
    baseURL: BASE_URL,
    locale: 'id-ID',
    timezoneId: 'Asia/Jakarta',
    trace: 'retain-on-failure',
    screenshot: 'only-on-failure',
    video: 'retain-on-failure',
  },
  projects: [{ name: 'chromium', use: { ...devices['Desktop Chrome'] } }],
  webServer: {
    command: `npm --prefix frontend run dev -- --port ${E2E_PORT} --strictPort`,
    url: BASE_URL,
    reuseExistingServer: true,
    timeout: 120_000,
  },
});
