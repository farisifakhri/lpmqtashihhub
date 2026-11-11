// Login, validasi form, logout, dan perlindungan sesi.
// Catatan: /auth/login dibatasi 20 percobaan/15 menit per IP, jadi spec ini sengaja hanya
// melakukan sedikit login lewat form. Test lain memakai token yang di-cache (lihat support/session.js).
import { test, expect, buka } from '../support/fixtures.js';
import { ACCOUNTS, PASSWORD } from '../support/accounts.js';

async function isiLogin(page, email, password) {
  await buka(page, '/login');
  await page.locator('#email').fill(email);
  await page.locator('#password').fill(password);
  await page.getByRole('button', { name: /^Masuk/i }).click();
}

test.describe('Autentikasi', () => {
  test('form kosong menampilkan pesan validasi tanpa memanggil server', async ({ page }) => {
    let loginCalled = false;
    page.on('request', (req) => { if (req.url().includes('/auth/login')) loginCalled = true; });
    await buka(page, '/login');
    // Lewati validasi HTML5 bawaan browser agar validasi aplikasi yang diuji
    await page.locator('form').evaluate((f) => { f.noValidate = true; });
    await page.getByRole('button', { name: /^Masuk/i }).click();
    await expect(page.getByText('Harap masukkan email dan kata sandi.')).toBeVisible();
    expect(loginCalled).toBe(false);
  });

  test('kata sandi salah ditolak dan tetap di halaman login', async ({ page }) => {
    await isiLogin(page, ACCOUNTS.PENERBIT.email, 'kata-sandi-salah-e2e');
    await expect(page.getByText(/tidak sesuai|terlalu banyak/i)).toBeVisible();
    await expect(page).toHaveURL(/\/login/);
  });

  test('penerbit login lewat form diarahkan ke portal penerbit', async ({ page }) => {
    await isiLogin(page, ACCOUNTS.PENERBIT.email, PASSWORD);
    await expect(page).toHaveURL(/\/publisher$/);
    await expect(page.getByRole('heading', { name: /Selamat .*PT Mushaf Nusantara/i })).toBeVisible();
  });

  test('petugas internal login lewat form diarahkan ke dashboard internal, lalu logout', async ({ page }) => {
    await isiLogin(page, ACCOUNTS.KEPALA_LPMQ.email, PASSWORD);
    await expect(page).toHaveURL(/\/internal$/);

    await page.getByRole('button', { name: /^Menu profil/ }).click();
    await page.getByRole('button', { name: /Akhiri Sesi/i }).click();
    await expect(page).toHaveURL(/\/login/);

    // Setelah logout, halaman internal tidak dapat dibuka lagi
    await buka(page, '/internal');
    await expect(page).toHaveURL(/\/login/);
    expect(await page.evaluate(() => localStorage.getItem('lpmq_token'))).toBeNull();
  });

  test('token tidak valid di localStorage dibersihkan dan diarahkan ke login', async ({ page, context }) => {
    await context.addInitScript(() => {
      if (!sessionStorage.getItem('e2e-token-set')) {
        localStorage.setItem('lpmq_token', 'token.palsu.e2e');
        sessionStorage.setItem('e2e-token-set', '1');
      }
    });
    await buka(page, '/internal');
    await expect(page).toHaveURL(/\/login/);
  });
});
