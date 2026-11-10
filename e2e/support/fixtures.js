// Fixture Playwright untuk LPMQ.
//   test.use({ akun: 'DISTRIBUTOR' })  -> `page` otomatis sudah login sebagai akun tersebut.
//   bukaSebagai('PENERBIT')            -> halaman baru dengan sesi akun lain dalam test yang sama.
import { test as base, expect } from '@playwright/test';
import { attachSession } from './session.js';

export const test = base.extend({
  akun: [null, { option: true }],

  context: async ({ context, akun }, use) => {
    if (akun) await attachSession(context, akun);
    await use(context);
  },

  bukaSebagai: async ({ browser }, use) => {
    const contexts = [];
    await use(async (accountKey) => {
      const ctx = await browser.newContext();
      contexts.push(ctx);
      await attachSession(ctx, accountKey);
      return ctx.newPage();
    });
    await Promise.all(contexts.map((c) => c.close()));
  },
});

export { expect };

/**
 * Tunggu permintaan data selesai. Beberapa halaman (mis. dashboard) memuat ulang data secara berkala
 * sehingga tidak pernah benar-benar "idle"; karena itu penantian dibatasi dan tidak dianggap gagal.
 */
export async function tungguData(page, timeout = 5_000) {
  await page.waitForLoadState('networkidle', { timeout }).catch(() => {});
}

/** Buka halaman lalu tunggu data selesai dimuat. */
export async function buka(page, url) {
  await page.goto(url);
  await tungguData(page);
}

/** Klik tab/filter berdasarkan teksnya di area konten utama. */
export async function pilihTab(page, label) {
  await page.locator('main button', { hasText: label }).first().click();
  await tungguData(page);
}
