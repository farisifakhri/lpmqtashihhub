// Permohonan Master Mushaf Al-Qur'an — khusus penerbit terdaftar, dengan surat persetujuan ber-TTE:
//   Penerbit mengajukan -> Admin menyusun surat & mengajukan ke Kepala -> Kepala TTE di Pusat Tanda Tangan
//   -> Admin mengirim surat -> Penerbit mengunduh surat dari portalnya.
import { test, expect, buka } from '../support/fixtures.js';
import { api, API_URL, getToken } from '../support/session.js';

/** PDF minimal yang valid (lolos pemeriksaan magic bytes, %%EOF, dan pemindaian konten aktif). */
function pdfMinimal() {
  const objects = [
    '1 0 obj<</Type/Catalog/Pages 2 0 R>>endobj',
    '2 0 obj<</Type/Pages/Kids[3 0 R]/Count 1>>endobj',
    '3 0 obj<</Type/Page/Parent 2 0 R/MediaBox[0 0 200 200]>>endobj',
  ];
  let pdf = '%PDF-1.4\n';
  const offsets = objects.map((obj) => { const at = pdf.length; pdf += `${obj}\n`; return at; });
  const xref = pdf.length;
  pdf += `xref\n0 4\n0000000000 65535 f \n${offsets.map((o) => `${String(o).padStart(10, '0')} 00000 n \n`).join('')}`;
  pdf += `trailer<</Size 4/Root 1 0 R>>\nstartxref\n${xref}\n%%EOF\n`;
  return Buffer.from(pdf);
}

const berkas = (name) => ({ name, mimeType: 'application/pdf', buffer: pdfMinimal() });

/** Baris/kartu terdalam yang memuat teks dan tombol tertentu. */
const kartu = (page, text, tombol) => page.locator('div, li, tr')
  .filter({ hasText: text })
  .filter({ has: page.getByRole('button', { name: tombol }) })
  .last();

test.describe('Permohonan Master — akses', () => {
  test('menu publik "Permohonan Master" mengarahkan tamu ke halaman masuk', async ({ page }) => {
    await buka(page, '/');
    await page.getByRole('navigation', { name: 'Navigasi utama' }).getByRole('link', { name: 'Permohonan Master' }).click();
    await expect(page).toHaveURL(/\/login$/);
  });

  test('API permohonan master dibatasi per peran', async () => {
    expect((await fetch(`${API_URL}/publisher/master-requests`)).status).toBe(401);
    expect((await api('ADMIN_INTERNAL', 'GET', '/publisher/master-requests')).status).toBe(403);
    expect((await api('PENERBIT', 'GET', '/admin/master-requests')).status).toBe(403);
    expect((await api('ADMIN_INTERNAL', 'POST', '/signatures/master-letters/x/sign')).status).toBe(403);
    expect((await api('KEPALA_LPMQ', 'GET', '/admin/master-requests')).status).toBe(403);
  });

  test('penerbit melihat menu Permohonan Master di sidebar', async ({ bukaSebagai }) => {
    const page = await bukaSebagai('PENERBIT');
    await buka(page, '/publisher');
    await page.getByRole('link', { name: /Permohonan Master/ }).first().click();
    await expect(page).toHaveURL(/\/publisher\/master-requests$/);
    await expect(page.getByRole('heading', { name: 'Permohonan Master Mushaf' })).toBeVisible();
  });
});

test.describe.serial('Permohonan Master — dari penerbit, TTE Kepala, sampai surat diterima penerbit', () => {
  let kode;
  let nomorSurat;

  test('1. penerbit mengajukan permohonan dari portalnya', async ({ bukaSebagai }) => {
    const page = await bukaSebagai('PENERBIT');
    await buka(page, '/publisher/master-requests/new');
    await expect(page.getByLabel('Lembaga Pemohon')).not.toHaveValue('');

    await page.getByLabel('Nama Pemohon').fill('Pemohon Uji E2E');
    await page.getByLabel('Nomor Telepon Pemohon').fill('081234567890');
    await page.getByLabel('Email Pemohon').fill('pemohon.e2e@example.com');
    await page.getByLabel('Alamat Pemohon').fill('Jl. Pengujian Otomatis No. 1, RT 01/RW 02');
    await page.getByLabel('Provinsi').selectOption({ label: 'Jawa Barat' });
    await page.getByLabel('Kota/Kabupaten').selectOption({ label: 'Kota Bandung' });
    await page.getByLabel('Kecamatan').selectOption({ label: 'Sukasari' });
    await page.getByLabel('Kode Pos').fill('40151');
    await page.getByText('Yasin dan Tahlil', { exact: true }).click();
    await page.getByLabel('Rencana Penggunaan').fill('Dicetak untuk dibagikan gratis kepada jamaah (uji E2E).');
    // Pilih berkas lewat dialog pemilih file sungguhan (klik kotak unggah), seperti pengguna.
    // Regresi: dulu fokus ke input tersembunyi menggulir wadah layout sehingga layar menjadi kosong.
    for (const [kotak, nama] of [['Surat permohonan', 'surat-permohonan.pdf'], ['Profil pemohon', 'profil-pemohon.pdf']]) {
      const [chooser] = await Promise.all([
        page.waitForEvent('filechooser'),
        page.locator('label').filter({ hasText: kotak }).filter({ hasText: /Pilih PDF|Ganti berkas/ }).click(),
      ]);
      await chooser.setFiles(berkas(nama));
      await expect(page.getByText(nama)).toBeVisible();
    }
    await expect(page.getByRole('heading', { name: 'Lampirkan dokumen' })).toBeInViewport();
    await expect(page.getByRole('link', { name: /Permohonan Master/ }).first()).toBeInViewport();
    expect(await page.evaluate(() => document.getElementById('main-content').parentElement.scrollTop)).toBe(0);
    await page.getByRole('checkbox', { name: /menyetujui pernyataan/i }).check();
    await page.getByRole('button', { name: 'Kirim Permohonan' }).click();

    await expect(page).toHaveURL(/\/publisher\/master-requests$/);
    const banner = page.getByRole('status').filter({ hasText: 'Permohonan terkirim' });
    await expect(banner).toBeVisible();
    kode = (await banner.locator('.font-mono').textContent()).trim();
    expect(kode).toMatch(/^PMQ-\d{8}-[A-Z0-9]{6}$/);
    await expect(page.getByText('Sedang ditinjau LPMQ').first()).toBeVisible();
  });

  test('2. admin menyusun surat persetujuan dan mengajukannya ke Kepala', async ({ bukaSebagai }) => {
    test.skip(!kode, 'Permohonan pada langkah sebelumnya gagal dibuat.');
    const page = await bukaSebagai('ADMIN_INTERNAL');
    await buka(page, '/internal/master-requests');
    await page.getByRole('searchbox', { name: 'Cari permohonan master' }).fill(kode);
    await page.getByRole('button', { name: 'Cari', exact: true }).click();
    await page.getByRole('button', { name: `Lihat detail permohonan ${kode}` }).click();

    const dialog = page.getByRole('dialog');
    await expect(dialog.getByText('pemohon.e2e@example.com')).toBeVisible();
    await dialog.getByRole('button', { name: 'Susun Surat Persetujuan' }).click();
    await dialog.getByLabel(/Isi tambahan surat/).fill('Berkas master dikirim melalui surel resmi LPMQ (uji E2E).');
    await dialog.getByRole('button', { name: 'Ajukan ke Kepala untuk TTE' }).click();
    await expect(dialog.getByText(/menunggu tanda tangan elektronik Kepala LPMQ/)).toBeVisible();

    const res = await api('ADMIN_INTERNAL', 'GET', `/admin/master-requests?search=${kode}`);
    nomorSurat = res.body.data[0].letter_number;
    expect(nomorSurat).toMatch(/^B-\d{4}\/LPMQ\.01\/HM\.01\//);
    expect(res.body.data[0].status).toBe('MENUNGGU_TTE');
  });

  test('3. Kepala menandatangani surat di Pusat Tanda Tangan (TTE)', async ({ bukaSebagai }) => {
    test.skip(!nomorSurat, 'Surat belum diajukan.');
    // Penerbit belum boleh membuka surat sebelum dikirim admin
    const id = (await api('ADMIN_INTERNAL', 'GET', `/admin/master-requests?search=${kode}`)).body.data[0].id;
    expect((await api('PENERBIT', 'GET', `/publisher/master-requests/${id}/letter`)).status).toBe(409);

    const page = await bukaSebagai('KEPALA_LPMQ');
    await buka(page, '/internal/signatures');
    const baris = kartu(page, nomorSurat, 'Tandatangani Surat');
    // Pusat Tanda Tangan memuat beberapa antrean sekaligus; beri waktu lebih pada server dev yang baru dikompilasi
    await expect(baris.getByText('Surat Persetujuan Master')).toBeVisible({ timeout: 30_000 });
    await baris.getByRole('button', { name: 'Tandatangani Surat' }).click();
    await expect(page.getByText('Tanda Tangan Surat Persetujuan Master')).toBeVisible();
    await page.getByRole('button', { name: 'Tandatangani Surat' }).last().click();
    await expect(page.getByText(/berhasil ditandatangani dan dikembalikan ke Admin/)).toBeVisible();
  });

  test('4. admin mengirim surat bertanda tangan ke penerbit', async ({ bukaSebagai }) => {
    test.skip(!nomorSurat, 'Surat belum diajukan.');
    const page = await bukaSebagai('ADMIN_INTERNAL');
    await buka(page, '/internal/master-requests');
    await page.getByRole('searchbox', { name: 'Cari permohonan master' }).fill(kode);
    await page.getByRole('button', { name: 'Cari', exact: true }).click();
    await page.getByRole('button', { name: `Lihat detail permohonan ${kode}` }).click();

    const dialog = page.getByRole('dialog');
    await expect(dialog.getByText('Ditandatangani Kepala LPMQ').first()).toBeVisible();
    await dialog.getByRole('button', { name: 'Kirim Surat ke Penerbit' }).click();
    await expect(dialog.getByText(/dapat diunduh penerbit/)).toBeVisible();
  });

  test('5. penerbit melihat persetujuan dan dapat mengunduh surat ber-TTE', async ({ bukaSebagai }) => {
    test.skip(!nomorSurat, 'Surat belum diajukan.');
    const page = await bukaSebagai('PENERBIT');
    await buka(page, '/publisher/master-requests');
    const item = page.locator('li').filter({ hasText: kode });
    await expect(item.getByText('Disetujui — surat tersedia')).toBeVisible();
    await expect(item.getByText(nomorSurat)).toBeVisible();
    await expect(item.getByRole('button', { name: 'Lihat Surat Persetujuan' })).toBeVisible();

    // Isi surat diperiksa langsung lewat API (penampil PDF bawaan browser tidak dapat diuji)
    const id = (await api('PENERBIT', 'GET', '/publisher/master-requests')).body.data.find((r) => r.request_code === kode).id;
    const res = await fetch(`${API_URL}/publisher/master-requests/${id}/letter`, {
      headers: { Authorization: `Bearer ${await getToken('PENERBIT')}`, 'X-Active-Role': 'PENERBIT' },
    });
    expect(res.status).toBe(200);
    expect(res.headers.get('content-type')).toContain('application/pdf');
    expect(Buffer.from(await res.arrayBuffer()).subarray(0, 5).toString()).toBe('%PDF-');
  });
});
