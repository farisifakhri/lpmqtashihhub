// Aksi nyata yang mengubah status naskah di alur utama.
// Spec ini memodifikasi data REG-DEMO-* sehingga dijalankan berurutan (serial);
// global-setup mereset data tersebut di awal setiap run.
import { test, expect, buka, pilihTab } from '../support/fixtures.js';
import { DEMO } from '../support/accounts.js';

/** Elemen terdalam yang memuat nomor registrasi dan tombol tertentu (baris/kartu antrean). */
function kartuNaskah(page, regNo, namaTombol) {
  return page
    .locator('div, tr, li, article')
    .filter({ hasText: regNo })
    .filter({ has: page.getByRole('button', { name: namaTombol }) })
    .last();
}

test.describe('Penerbit — formulir permohonan', () => {
  test.use({ akun: 'PENERBIT' });

  test('langkah 1 tidak bisa dilewati bila data mushaf belum diisi', async ({ page }) => {
    await buka(page, '/publisher/new-registration');
    await page.getByRole('button', { name: /Lanjut: Langkah 2/i }).click();
    await expect(page.getByText('Nama mushaf minimal 3 karakter.')).toBeVisible();
    await expect(page.getByText('Nama penanggung jawab produk/mushaf wajib diisi.')).toBeVisible();
  });

  test('langkah 1 lolos validasi bila data wajib terisi', async ({ page }) => {
    await buka(page, '/publisher/new-registration');
    await page.getByPlaceholder(/Contoh: Mushaf Al-Qur/i).fill("Mushaf Al-Qur'an Uji E2E");
    await page.getByPlaceholder(/Tulis nama penanggung jawab Produk\/Mushaf/i).fill('Penanggung Jawab E2E');
    await page.getByPlaceholder(/Tulis nomor WhatsApp/i).fill('081234567890');
    await page.getByPlaceholder(/Tulis email penanggung jawab/i).fill('pj.e2e@example.com');
    await page.getByRole('button', { name: /Lanjut: Langkah 2/i }).click();
    await expect(page.getByText('Nama mushaf minimal 3 karakter.')).toHaveCount(0);
    await expect(page.getByText(/Format alamat email tidak valid/i)).toHaveCount(0);
  });
});

test.describe.serial('Distributor — serah terima & sidang tashih', () => {
  test.use({ akun: 'DISTRIBUTOR' });

  test('Tahap 7 → 8: distributor mengesahkan penerimaan master fisik', async ({ page }) => {
    await buka(page, '/internal/distributions');
    await kartuNaskah(page, DEMO.SERAH_TERIMA, /Konfirmasi Diterima/).getByRole('button', { name: /Konfirmasi Diterima/ }).click();

    await expect(page.getByText('Konfirmasi Penerimaan Master Fisik (Langkah 8 SOP)')).toBeVisible();
    await page.getByPlaceholder(/Catatan kondisi jilid/).fill('Diterima lengkap dan rapi (uji E2E).');
    await page.getByRole('button', { name: 'Sahkan Penerimaan & Lanjut Distribusi' }).click();

    // Naskah keluar dari antrean "Menunggu Konfirmasi" ...
    await expect(page.getByText('Konfirmasi Penerimaan Master Fisik (Langkah 8 SOP)')).toHaveCount(0);
    await expect(kartuNaskah(page, DEMO.SERAH_TERIMA, /Konfirmasi Diterima/)).toHaveCount(0);
    // ... dan siap dibagikan ke tim pentashih
    await pilihTab(page, '2. Penugasan, Monitoring Sidang');
    await expect(page.getByText(DEMO.SERAH_TERIMA).first()).toBeVisible();
  });

  test('Tahap 8: reviu distributor terkunci selama pentashih belum menyerahkan hasil', async ({ page }) => {
    await buka(page, '/internal/distributions');
    await pilihTab(page, '2. Penugasan, Monitoring Sidang');
    await kartuNaskah(page, DEMO.SEDANG_TASHIH, /Lihat Hasil Anggota|Reviu Hasil Sidang/)
      .getByRole('button', { name: /Lihat Hasil Anggota|Reviu Hasil Sidang/ }).click();

    const dialog = page.getByRole('dialog', { name: /Reviu Hasil Sidang Pentashihan/ });
    await expect(dialog).toBeVisible();
    await expect(dialog.getByText('Belum Selesai').first()).toBeVisible();
    await expect(dialog.getByText(/Sidang Belum Selesai Seluruhnya/)).toBeVisible();
    // Pilihan tindak lanjut (STT / dumi / perbaikan) belum boleh tersedia
    await expect(dialog.getByText('Keputusan Tindak Lanjut Distributor')).toHaveCount(0);
  });

  test('Tahap 8 (B-19b): distributor melepas penugasan pentashih yang berhalangan', async ({ page }) => {
    await buka(page, '/internal/distributions');
    await pilihTab(page, '2. Penugasan, Monitoring Sidang');
    const kartu = page.locator('div').filter({ hasText: DEMO.SEDANG_TASHIH })
      .filter({ has: page.getByRole('button', { name: /^Lepas tugas/ }) }).last();
    await kartu.getByRole('button', { name: /^Lepas tugas/ }).first().click();

    const dialog = page.getByRole('dialog', { name: 'Pelepasan Penugasan Pentashih' });
    await expect(dialog).toBeVisible();
    const tombolLepas = dialog.getByRole('button', { name: 'Lepas Penugasan' });

    // Alasan wajib diisi minimal 5 karakter
    await dialog.getByPlaceholder(/Pentashih mengambil cuti dinas/).fill('abc');
    await expect(tombolLepas).toBeDisabled();

    await dialog.getByPlaceholder(/Pentashih mengambil cuti dinas/).fill('Pentashih cuti dinas (uji E2E).');
    await tombolLepas.click();

    await expect(dialog).toHaveCount(0);
    await expect(page.getByText(/Penugasan Dicabut|\(Dicabut\)/).first()).toBeVisible();
  });
});
