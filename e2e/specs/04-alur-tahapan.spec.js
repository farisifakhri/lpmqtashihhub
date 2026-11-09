// Alur utama LPMQ dari loket sampai arsip: setiap naskah demo (REG-DEMO-*) harus muncul
// di antrean peran yang bertanggung jawab pada tahap tersebut.
// Data disiapkan oleh global-setup (npm --prefix backend run seed:demo-stages).
import { test, expect, buka, pilihTab, tungguData } from '../support/fixtures.js';
import { DEMO } from '../support/accounts.js';

/** Pastikan nomor registrasi tampil di halaman. */
async function harusTampil(page, regNo) {
  await expect(page.getByText(regNo).first(), `${regNo} harus muncul di antrean`).toBeVisible();
}

test.describe('Alur utama per tahapan', () => {
  test('Tahap 2 — Loket: admin internal melihat naskah yang menunggu penerimaan fisik', async ({ bukaSebagai }) => {
    const page = await bukaSebagai('ADMIN_INTERNAL');
    await buka(page, '/internal/master-intake');
    await harusTampil(page, DEMO.LOKET);
  });

  test('Tahap 3 — Penugasan verifikator: admin internal melihat naskah siap ditugaskan', async ({ bukaSebagai }) => {
    const page = await bukaSebagai('ADMIN_INTERNAL');
    await buka(page, '/internal/verifications');
    await harusTampil(page, DEMO.SIAP_DITUGASKAN);
    await expect(page.getByRole('button', { name: 'Tugaskan Verifikator' }).first()).toBeVisible();
  });

  test('Tahap 4 — Verifikasi berkas: verifikator melihat tugas yang sedang diperiksa', async ({ bukaSebagai }) => {
    const page = await bukaSebagai('VERIFIKATOR');
    await buka(page, '/internal/verifications');
    await pilihTab(page, 'Sedang Diperiksa');
    await harusTampil(page, DEMO.SEDANG_VERIFIKASI);
    await expect(page.getByRole('button', { name: 'Lanjutkan Pemeriksaan' }).first()).toBeVisible();
  });

  test('Tahap 5 — Persetujuan: Kepala LPMQ melihat draf hasil verifikasi', async ({ bukaSebagai }) => {
    const page = await bukaSebagai('KEPALA_LPMQ');
    await buka(page, '/internal/verifications');
    await harusTampil(page, DEMO.MENUNGGU_PERSETUJUAN);
    await expect(page.getByRole('button', { name: 'Lihat Detail Draf' }).first()).toBeVisible();
  });

  test('Tahap 5 — Verifikator melihat naskah di tab Menunggu Persetujuan', async ({ bukaSebagai }) => {
    const page = await bukaSebagai('VERIFIKATOR');
    await buka(page, '/internal/verifications');
    await pilihTab(page, 'Menunggu Persetujuan');
    await harusTampil(page, DEMO.MENUNGGU_PERSETUJUAN);
  });

  test('Tahap 6 — Pembayaran: naskah menunggu PNBP tercatat di dashboard internal', async ({ bukaSebagai }) => {
    const page = await bukaSebagai('ADMIN_INTERNAL');
    await buka(page, '/internal');
    await harusTampil(page, DEMO.MENUNGGU_PEMBAYARAN);
  });

  test('Tahap 7 — Serah terima: distributor melihat master fisik yang menunggu konfirmasi', async ({ bukaSebagai }) => {
    const page = await bukaSebagai('DISTRIBUTOR');
    await buka(page, '/internal/distributions');
    await harusTampil(page, DEMO.SERAH_TERIMA);
    await expect(page.getByRole('button', { name: /Konfirmasi Diterima/ }).first()).toBeVisible();
  });

  test('Tahap 8 — Sidang tashih: distributor memantau sidang yang berjalan', async ({ bukaSebagai }) => {
    const page = await bukaSebagai('DISTRIBUTOR');
    await buka(page, '/internal/distributions');
    await pilihTab(page, '3. Monitoring Sidang');
    await harusTampil(page, DEMO.SEDANG_TASHIH);
  });

  test('Tahap 8 — Sidang tashih: ketua kelompok pentashih menerima tugas sidang', async ({ bukaSebagai }) => {
    const page = await bukaSebagai('PENTASHIH_KETUA');
    await buka(page, '/internal/tashih');
    await harusTampil(page, DEMO.SEDANG_TASHIH);
  });

  test('Tahap 9 — Revisi: naskah perbaikan menunggu master fisik di loket', async ({ bukaSebagai }) => {
    const page = await bukaSebagai('ADMIN_INTERNAL');
    await buka(page, '/internal/master-intake');
    await harusTampil(page, DEMO.PERLU_REVISI);
  });

  test('Tahap 10 — Siap STT: naskah tampil di pengajuan STT distributor', async ({ bukaSebagai }) => {
    const page = await bukaSebagai('DISTRIBUTOR');
    await buka(page, '/internal/distributions');
    await pilihTab(page, '4. Pengajuan STT');
    await harusTampil(page, DEMO.SIAP_STT);
  });

  test('Tahap 11–13 — STT terbit, dokumentasi, dan selesai tercatat di arsip dokumen', async ({ bukaSebagai }) => {
    const page = await bukaSebagai('DOKUMENTATOR');
    await buka(page, '/internal/archive');
    // Daftar arsip berhalaman, jadi cari tiap nomor lewat kolom pencarian
    const cari = page.getByRole('textbox', { name: 'Cari naskah atau nomor permohonan' });
    for (const regNo of [DEMO.STT_TERBIT, DEMO.DOKUMENTASI, DEMO.SELESAI]) {
      await cari.fill(regNo);
      await tungguData(page);
      await harusTampil(page, regNo);
    }
  });

  test('Dashboard admin internal merangkum naskah di semua tahap aktif', async ({ bukaSebagai }) => {
    const page = await bukaSebagai('ADMIN_INTERNAL');
    await buka(page, '/internal');
    for (const regNo of [DEMO.LOKET, DEMO.SEDANG_VERIFIKASI, DEMO.SERAH_TERIMA, DEMO.SEDANG_TASHIH, DEMO.SIAP_STT]) {
      await harusTampil(page, regNo);
    }
  });
});
