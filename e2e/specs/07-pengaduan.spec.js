// Sistem Pengaduan (publik, tanpa login):
//   Pengadu mengirim formulir (+CAPTCHA) -> kode pengaduan -> Admin (Kelola Landing Page > Pengaduan)
//   menerima/menolak -> mengubah status -> laporan akhir -> pengadu melacak dengan kode.
import { test, expect, buka } from '../support/fixtures.js';
import { api, API_URL } from '../support/session.js';
import { pantauCaptcha } from '../support/captcha.js';

const PNG = Buffer.from('89504E470D0A1A0A0000000D49484452000000010000000108060000001F15C4890000000D49444154789C6360000002000105FE02FEA7D5A00000000049454E44AE426082', 'hex');
const gambar = (name) => ({ name, mimeType: 'image/png', buffer: PNG });

async function isiIdentitas(page, nama) {
  await page.getByLabel('Nama Pengadu').fill(nama);
  await page.getByLabel('Perempuan').check();
  await page.getByLabel('Usia Pengadu').fill('41');
  await page.getByLabel('Alamat Pengadu').fill('Jl. Pengujian Otomatis No. 7, RT 03/RW 04');
  await page.getByLabel('Provinsi').selectOption({ label: 'Jawa Barat' });
  await page.getByLabel('Kota/Kabupaten').selectOption({ label: 'Kota Bandung' });
  await page.getByLabel('Kecamatan').selectOption({ label: 'Sukasari' });
  await page.getByLabel('Kode Pos').fill('40151');
  await page.getByLabel('Nomor Telepon Pengadu').fill('081234567899');
  await page.getByLabel('Email Pengadu').fill('pengadu.e2e@example.com');
  await page.getByLabel('Pekerjaan Pengadu').fill('Guru Mengaji');
}

async function bukaPengaduanAdmin(page, kode, jenis) {
  await buka(page, '/internal/landing-page');
  await page.getByRole('button', { name: 'Pengaduan', exact: true }).click();
  if (jenis) {
    await page.getByRole('navigation', { name: 'Submenu Pengaduan' }).getByRole('button', { name: jenis }).click();
  }
  await page.getByRole('searchbox', { name: 'Cari pengaduan' }).fill(kode);
  await page.getByRole('button', { name: 'Cari', exact: true }).click();
  const baris = page.getByRole('row').filter({ hasText: kode });
  await expect(baris).toHaveCount(1);
  return baris;
}

test.describe('Pengaduan — menu & akses', () => {
  test('navbar Pengaduan berisi tiga submenu yang membuka halamannya masing-masing', async ({ page }) => {
    for (const [label, url, heading] of [
      ["Pengaduan Kesalahan Cetak Mushaf Al-Qur'an", /\/pengaduan\/kesalahan-cetak-mushaf$/, "Formulir Pengaduan Kesalahan Cetak Mushaf Al-Qur'an"],
      ['Pengaduan Pelayanan Surat Tanda Tashih/Izin Edar', /\/pengaduan\/pelayanan-surat-tanda-tashih$/, 'Formulir Pengaduan Pelayanan Surat Tanda Tashih/Izin Edar'],
      ['Lacak Pengaduan', /\/pengaduan\/lacak$/, 'Lacak Pengaduan'],
    ]) {
      await buka(page, '/');
      const nav = page.getByRole('navigation', { name: 'Navigasi utama' });
      await nav.getByRole('link', { name: 'Pengaduan', exact: true }).hover();
      await nav.getByRole('link', { name: label }).click();
      await expect(page).toHaveURL(url);
      await expect(page.getByRole('heading', { level: 1, name: heading })).toBeVisible();
    }
  });

  test('pengelolaan pengaduan hanya untuk Helper Admin & Super Admin (diperiksa di backend)', async () => {
    expect((await fetch(`${API_URL}/admin/complaints?type=PELAYANAN`)).status).toBe(401);
    expect((await api('PENERBIT', 'GET', '/admin/complaints?type=PELAYANAN')).status).toBe(403);
    expect((await api('KEPALA_LPMQ', 'GET', '/admin/complaints?type=PELAYANAN')).status).toBe(403);
    expect((await api('ADMIN_INTERNAL', 'GET', '/admin/complaints?type=PELAYANAN')).status).toBe(200);
    expect((await api('SUPERADMIN', 'GET', '/admin/complaints?type=KESALAHAN_CETAK')).status).toBe(200);
    expect((await api('VERIFIKATOR', 'POST', '/admin/complaints/x/accept', {})).status).toBe(403);
  });

  test('menu Kelola Landing Page > Pengaduan tidak memuat Lacak Pengaduan', async ({ bukaSebagai }) => {
    const page = await bukaSebagai('ADMIN_INTERNAL');
    await buka(page, '/internal/landing-page');
    await page.getByRole('button', { name: 'Pengaduan', exact: true }).click();
    await expect(page.getByRole('navigation', { name: 'Submenu Pengaduan' }).getByRole('button')).toHaveText([
      "Pengaduan Kesalahan Cetak Mushaf Al-Qur'an",
      'Pengaduan Pelayanan Surat Tanda Tashih/Izin Edar',
    ]);
  });
});

test.describe.serial('Pengaduan kesalahan cetak — dari pengadu sampai laporan akhir', () => {
  let kode;

  test('1. pengadu mengirim dua kesalahan cetak dan mendapat kode pengaduan', async ({ page }) => {
    const jawabanCaptcha = pantauCaptcha(page);
    await buka(page, '/pengaduan/kesalahan-cetak-mushaf');
    await isiIdentitas(page, 'Pengadu Uji E2E');
    await page.getByLabel('Nama Penerbit Mushaf').fill('PT Penerbit Uji E2E');
    await page.getByLabel(/^Nama Mushaf/).fill('Mushaf Uji E2E 30 Juz');
    await page.getByLabel('Nomor Surat Tanda Tashih').fill('STT-E2E/2026');
    await page.getByLabel('Gambar Surat Tanda Tashih').setInputFiles(gambar('stt.png'));
    await page.getByLabel('Gambar Cover Mushaf').setInputFiles(gambar('cover.png'));

    await page.getByRole('button', { name: 'Tambah Informasi Kesalahan Lainnya' }).click();
    const data = [
      ['Al-Baqarah: 255', 'Kesalahan harakat atau tanda baca', 'Harakat fathah tercetak kasrah (uji E2E).'],
      ['Yasin: 3', 'Kata atau ayat hilang', 'Ayat ketiga tidak tercetak pada halaman 440 (uji E2E).'],
    ];
    for (const [index, [surah, jenis, deskripsi]] of data.entries()) {
      const item = page.getByRole('listitem', { name: `Informasi kesalahan ${index + 1}` });
      await item.getByLabel('Surah dan Ayat').fill(surah);
      await item.getByLabel('Jenis Kesalahan').selectOption(jenis);
      await item.getByLabel('Deskripsi Kesalahan').fill(deskripsi);
      await item.getByLabel('Gambar Halaman Salah').setInputFiles(gambar(`halaman-${index + 1}.png`));
    }

    await page.getByLabel('Kode Verifikasi').fill(await jawabanCaptcha());
    await page.getByRole('button', { name: 'Kirim Pengaduan' }).click();

    const dialog = page.getByRole('dialog', { name: 'Pengaduan Berhasil Dikirim' });
    await expect(dialog).toBeVisible();
    kode = (await dialog.getByTestId('kode-pengaduan').textContent()).trim();
    expect(kode).toMatch(/^ADU-KC-\d{8}-[A-Z2-9]{8}$/);
    await expect(dialog.getByRole('button', { name: 'Salin Kode Pengaduan' })).toBeVisible();
  });

  test('2. pengaduan muncul di Kelola Landing Page; admin melihat detail & lampiran lalu menerima', async ({ bukaSebagai }) => {
    test.skip(!kode, 'Pengaduan gagal dikirim.');
    const page = await bukaSebagai('ADMIN_INTERNAL');
    const baris = await bukaPengaduanAdmin(page, kode);
    await expect(baris).toContainText('PT Penerbit Uji E2E');
    await expect(baris).toContainText('Menunggu Verifikasi');

    await baris.getByRole('button', { name: `Lihat pengaduan ${kode}` }).click();
    const dialog = page.getByRole('dialog');
    await expect(dialog.getByText('pengadu.e2e@example.com')).toBeVisible();
    await expect(dialog.getByText('Ayat ketiga tidak tercetak pada halaman 440 (uji E2E).')).toBeVisible();
    await expect(dialog.getByRole('button', { name: /^Buka Gambar Halaman Salah/ })).toHaveCount(2);
    const popup = page.waitForEvent('popup');
    await dialog.getByRole('button', { name: /^Buka Gambar Cover Mushaf/ }).click();
    await (await popup).close();

    await dialog.getByRole('button', { name: 'Terima', exact: true }).click();
    await dialog.getByRole('button', { name: 'Ya, Terima Pengaduan' }).click();
    await expect(dialog.getByRole('status')).toContainText('Pengaduan diterima');
    await expect(dialog.getByRole('button', { name: 'Ubah Status' })).toBeVisible();
  });

  test('3. admin memproses, menunggu tindak lanjut, lalu membuat laporan akhir', async ({ bukaSebagai }) => {
    test.skip(!kode, 'Pengaduan gagal dikirim.');
    const page = await bukaSebagai('SUPERADMIN');
    const baris = await bukaPengaduanAdmin(page, kode);
    await baris.getByRole('button', { name: `Lihat pengaduan ${kode}` }).click();
    const dialog = page.getByRole('dialog');

    for (const [status, keterangan] of [
      ['Dalam Proses', 'Penerbit dipanggil untuk klarifikasi (uji E2E).'],
      ['Menunggu Tindak Lanjut', 'Menunggu penarikan mushaf dari peredaran (uji E2E).'],
    ]) {
      await dialog.getByRole('button', { name: 'Ubah Status' }).click();
      await dialog.getByLabel(status, { exact: true }).check();
      await dialog.getByLabel(/Keterangan perubahan/).fill(keterangan);
      await dialog.getByRole('button', { name: 'Simpan Status' }).click();
      await expect(dialog.getByText(keterangan)).toBeVisible();
    }

    await dialog.getByRole('button', { name: 'Buat Laporan Akhir' }).click();
    await dialog.getByLabel(/Hasil Penanganan/).fill('Mushaf ditarik dan dicetak ulang');
    await dialog.getByLabel(/Keterangan atau Penjelasan/).fill('Penerbit menarik seluruh cetakan bermasalah dan mencetak ulang (uji E2E).');
    await dialog.getByRole('checkbox').check();
    await dialog.getByRole('button', { name: 'Kirim Laporan Akhir' }).click();
    await expect(dialog.getByRole('heading', { name: 'Laporan Akhir' })).toBeVisible();
    await expect(dialog.getByText('Pengaduan telah selesai ditangani.')).toBeVisible();
  });

  test('4. pengadu melacak kode dan melihat riwayat serta hasil penanganan (tanpa data pribadi)', async ({ page }) => {
    test.skip(!kode, 'Pengaduan gagal dikirim.');
    await buka(page, '/pengaduan/lacak');
    await page.getByPlaceholder('Masukkan kode pengaduan Anda').fill(kode.toLowerCase());
    await page.getByRole('button', { name: 'Lacak Pengaduan' }).click();

    await expect(page.getByRole('heading', { name: 'Informasi Pengaduan' })).toBeVisible();
    await expect(page.getByText('Pe*** Uj*** E2***')).toBeVisible();
    const riwayat = page.getByRole('region', { name: 'Riwayat Status Pengaduan' });
    for (const status of ['Menunggu Verifikasi', 'Diterima', 'Dalam Proses', 'Menunggu Tindak Lanjut', 'Selesai']) {
      await expect(riwayat.getByText(status, { exact: true }).first()).toBeVisible();
    }
    await expect(riwayat.getByText('Menunggu penarikan mushaf dari peredaran (uji E2E).')).toBeVisible();
    await expect(page.getByRole('region', { name: 'Hasil Penanganan' })).toContainText('Mushaf ditarik dan dicetak ulang');
    await expect(page.getByText('pengadu.e2e@example.com')).toHaveCount(0);
    await expect(page.getByText('081234567899')).toHaveCount(0);
  });
});

test.describe.serial('Pengaduan pelayanan — ditolak dengan alasan', () => {
  let kode;

  test('1. pengadu mengirim pengaduan pelayanan', async ({ page }) => {
    const jawabanCaptcha = pantauCaptcha(page);
    await buka(page, '/pengaduan/pelayanan-surat-tanda-tashih');
    await isiIdentitas(page, 'Pengadu Pelayanan E2E');
    await page.getByLabel('Nomor Pendaftaran Mushaf').fill('REG-E2E-0001');
    await page.getByLabel('Penerbit Pendaftar Mushaf').fill('PT Penerbit Uji E2E');
    await page.getByLabel('Kesalahan penetapan biaya PNBP layanan tashih').check();
    await page.getByLabel('Deskripsi Pengaduan').fill('Biaya PNBP yang ditagihkan tidak sesuai jumlah halaman (uji E2E).');
    await page.getByLabel('Kode Verifikasi').fill(await jawabanCaptcha());
    await page.getByRole('button', { name: 'Kirim Pengaduan' }).click();
    const dialog = page.getByRole('dialog', { name: 'Pengaduan Berhasil Dikirim' });
    kode = (await dialog.getByTestId('kode-pengaduan').textContent()).trim();
    expect(kode).toMatch(/^ADU-PL-/);
  });

  test('2. admin menolak dengan alasan dan pengadu melihat alasannya', async ({ bukaSebagai, page }) => {
    test.skip(!kode, 'Pengaduan gagal dikirim.');
    const admin = await bukaSebagai('ADMIN_INTERNAL');
    const baris = await bukaPengaduanAdmin(admin, kode, 'Pengaduan Pelayanan Surat Tanda Tashih/Izin Edar');
    await expect(baris).toContainText('REG-E2E-0001');
    await expect(baris).toContainText('Kesalahan penetapan biaya PNBP layanan tashih');
    await baris.getByRole('button', { name: `Tolak pengaduan ${kode}` }).click();
    const form = admin.getByRole('form', { name: 'Form penolakan pengaduan' });
    await form.getByLabel(/Alasan Penolakan/).fill('Nomor pendaftaran tidak terdaftar pada sistem LPMQ (uji E2E).');
    await form.getByRole('checkbox').check();
    await form.getByRole('button', { name: 'Tolak Pengaduan' }).click();
    await expect(admin.getByRole('dialog').getByRole('heading', { name: 'Keputusan Penolakan' })).toBeVisible();

    await buka(page, '/pengaduan/lacak');
    await page.getByPlaceholder('Masukkan kode pengaduan Anda').fill(kode);
    await page.getByRole('button', { name: 'Lacak Pengaduan' }).click();
    await expect(page.getByRole('region', { name: 'Alasan Penolakan' })).toContainText('Nomor pendaftaran tidak terdaftar pada sistem LPMQ (uji E2E).');
  });

  test('kode yang tidak ada memberi pesan yang jelas', async ({ page }) => {
    await buka(page, '/pengaduan/lacak');
    await page.getByPlaceholder('Masukkan kode pengaduan Anda').fill('ADU-KC-20000101-XXXXXXXX');
    await page.getByRole('button', { name: 'Lacak Pengaduan' }).click();
    await expect(page.getByRole('alert')).toHaveText('Kode pengaduan tidak ditemukan. Silakan periksa kembali kode yang Anda masukkan.');
  });
});
