// Hak akses per peran (RBAC) di sisi tampilan dan di sisi API.
import { test, expect, buka } from '../support/fixtures.js';
import { api } from '../support/session.js';

test.describe('Hak akses halaman', () => {
  test('pengunjung tanpa login diarahkan ke /login', async ({ page }) => {
    for (const url of ['/internal', '/publisher', '/internal/distributions', '/publisher/billing']) {
      await buka(page, url);
      await expect(page, `akses ${url}`).toHaveURL(/\/login/);
    }
  });

  const KASUS_DITOLAK = [
    ['PENERBIT', '/internal'],
    ['PENERBIT', '/internal/verifications'],
    ['PENTASHIH', '/internal/users'],
    ['PENTASHIH', '/internal/distributions'],
    // (akun verifikator seed juga ber-peran PENTASHIH, jadi pakai Kepala LPMQ untuk ruang sidang)
    ['KEPALA_LPMQ', '/internal/tashih'],
    ['DISTRIBUTOR', '/internal/users'],
    ['ADMIN_INTERNAL', '/internal/core-teams'],
    ['KEPALA_LPMQ', '/publisher'],
  ];
  for (const [akun, url] of KASUS_DITOLAK) {
    test(`${akun} tidak boleh membuka ${url}`, async ({ bukaSebagai }) => {
      const page = await bukaSebagai(akun);
      await buka(page, url);
      await expect(page).not.toHaveURL(new RegExp(`${url}$`));
      await expect(page).toHaveURL(/\/(403|login|internal|publisher)$/);
    });
  }

  const KASUS_DIIZINKAN = [
    ['PENERBIT', '/publisher/registrations', 'Permohonan Saya'],
    ['ADMIN_INTERNAL', '/internal/master-intake', 'Penerimaan Master Fisik Mushaf'],
    ['VERIFIKATOR', '/internal/verifications', 'Antrean Verifikasi Berkas'],
    ['KEPALA_LPMQ', '/internal/signatures', 'Pusat Persetujuan Internal'],
    ['DISTRIBUTOR', '/internal/distributions', 'Antrean Serah-Terima Master Fisik'],
    ['PENTASHIH', '/internal/tashih', /Ruang Sidang Pentashihan/],
    ['DOKUMENTATOR', '/internal/documents', /Pengarsipan Naskah/],
    ['SUPERADMIN', '/internal/users', /Manajemen Pengguna/],
  ];
  for (const [akun, url, judul] of KASUS_DIIZINKAN) {
    test(`${akun} dapat membuka ${url}`, async ({ bukaSebagai }) => {
      const page = await bukaSebagai(akun);
      await buka(page, url);
      await expect(page).toHaveURL(new RegExp(`${url}$`));
      await expect(page.getByRole('heading', { name: judul }).first()).toBeVisible();
    });
  }
});

test.describe('Hak akses API', () => {
  test('penerbit tidak dapat memanggil endpoint internal', async () => {
    const res = await api('PENERBIT', 'GET', '/users');
    expect([401, 403]).toContain(res.status);
  });

  test('pentashih tidak dapat melepas penugasan pentashih lain', async () => {
    const res = await api('PENTASHIH', 'POST', '/assignments/id-tidak-ada/revoke', { reason: 'uji hak akses e2e' });
    expect(res.status).toBe(403);
  });

  test('permintaan tanpa token ditolak 401', async () => {
    const res = await fetch(`${process.env.E2E_API_URL || 'http://127.0.0.1:5000'}/api/v1/auth/me`);
    expect(res.status).toBe(401);
  });
});
