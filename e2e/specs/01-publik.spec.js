// Halaman publik (tanpa login): landing, menu informasi, pendaftaran, cek status, verifikasi dokumen.
import { test, expect, buka } from '../support/fixtures.js';

test.describe('Halaman publik', () => {
  // Kumpulkan error JavaScript yang tidak tertangani di setiap halaman.
  let pageErrors;
  test.beforeEach(({ page }) => {
    pageErrors = [];
    page.on('pageerror', (err) => pageErrors.push(err.message));
  });
  test.afterEach(() => {
    expect(pageErrors, 'Tidak boleh ada error JavaScript di halaman').toEqual([]);
  });

  test('landing page menampilkan layanan dan menu informasi', async ({ page }) => {
    await buka(page, '/');
    await expect(page).toHaveTitle(/LPMQ/);
    await expect(page.getByRole('heading', { name: /Layanan Surat Tanda Tashih/i }).first()).toBeVisible();
    await expect(page.getByText(/Regulasi Penerbit Mushaf/i).first()).toBeVisible();
  });

  const HALAMAN_INFORMASI = [
    ['/informasi/regulasi-penerbit-mushaf', /Regulasi Penerbit Mushaf/i],
    ['/informasi/panduan-permohonan-surat-tanda-tashih', /Panduan/i],
    ['/informasi/sop-pelayanan-surat-tanda-tashih', /SOP/i],
    ['/informasi/direktori-penerbit-mushaf', /Direktori Penerbit Mushaf/i],
    ['/informasi/survei-ikm-ipak-pelayanan-surat-tanda-tashih', /Survei IKM/i],
    ['/informasi/siaran-pers', /Siaran Pers/i],
    ['/informasi/unduh-dokumen-pelayanan-surat-tanda-tashih', /Unduh Dokumen/i],
  ];
  for (const [url, judul] of HALAMAN_INFORMASI) {
    test(`menu informasi: ${url}`, async ({ page }) => {
      await buka(page, url);
      await expect(page.getByText('Unexpected Application Error')).toHaveCount(0);
      await expect(page.getByRole('heading', { name: judul }).first()).toBeVisible();
    });
  }

  test('halaman login menampilkan form email & kata sandi', async ({ page }) => {
    await buka(page, '/login');
    await expect(page.getByRole('heading', { name: 'Akses Sistem Pentashihan' })).toBeVisible();
    await expect(page.locator('#email')).toBeVisible();
    await expect(page.locator('#password')).toBeVisible();
    await expect(page.getByRole('button', { name: /Masuk/i })).toBeVisible();
  });

  test('halaman pendaftaran akun penerbit dapat dibuka', async ({ page }) => {
    await buka(page, '/register');
    await expect(page.getByRole('heading', { name: 'Pendaftaran Akun Penerbit' })).toBeVisible();
  });

  test('halaman cek status pendaftaran penerbit dapat dibuka', async ({ page }) => {
    await buka(page, '/cek-status');
    await expect(page.getByRole('heading', { name: 'Cek Status Pendaftaran Penerbit' })).toBeVisible();
  });

  test('verifikasi dokumen dengan QR token palsu ditolak', async ({ page }) => {
    await buka(page, '/verify-documents/token-tidak-valid');
    await expect(page.getByRole('heading', { name: /Tidak Ditemukan \/ Tidak Valid/i })).toBeVisible();
  });

  test('verifikasi sertifikat dengan nomor palsu ditandai tidak sah', async ({ page }) => {
    await buka(page, '/verifikasi/sertifikat/XXX-999');
    await expect(page.getByRole('heading', { name: /TIDAK SAH \/ PALSU/i })).toBeVisible();
  });

  test('halaman 403 menampilkan pesan akses ditolak', async ({ page }) => {
    await buka(page, '/403');
    await expect(page.getByRole('heading', { name: /Akses Terbatas/i })).toBeVisible();
  });

  test('URL yang tidak ada menampilkan halaman 404 yang ramah pengguna', async ({ page }) => {
    test.fail(true, 'BUG DIKETAHUI: router belum punya halaman 404/errorElement, sehingga tampil pesan developer React Router.');
    await buka(page, '/halaman-yang-tidak-ada');
    await expect(page.getByText('Hey developer')).toHaveCount(0);
  });
});
