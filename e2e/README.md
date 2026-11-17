# Test E2E (Playwright)

Test end-to-end yang menjalankan aplikasi LPMQ di browser sungguhan (Chromium): login per peran,
membuka halaman, dan menjalankan aksi alur kerja seperti pengguna asli.

## Prasyarat

1. MySQL berjalan dan database sudah di-seed: `npm --prefix backend run prisma:seed`
2. Backend berjalan di port 5000: `npm run dev:backend`
3. Sekali saja: `npx playwright install chromium`

Frontend **tidak perlu** dinyalakan manual. Playwright menyalakan server Vite tersendiri di port 5173
(atau memakai yang sudah berjalan di port itu).

## Menjalankan

```bash
npm run test:e2e                      # semua test
npm run test:e2e -- e2e/specs/04-alur-tahapan.spec.js   # satu file
npm run test:e2e:ui                   # mode interaktif (lihat browser langkah demi langkah)
npm run test:e2e:report               # buka laporan HTML hasil run terakhir
```

## Isi test

| File | Cakupan |
| --- | --- |
| `01-publik.spec.js` | Landing, menu informasi, pendaftaran, cek status, verifikasi QR/sertifikat palsu, 403/404 |
| `02-autentikasi.spec.js` | Validasi form login, kata sandi salah, login penerbit & internal, logout, token tidak valid |
| `03-hak-akses.spec.js` | RBAC: halaman yang boleh/tidak boleh dibuka tiap peran, dan penolakan di level API |
| `04-alur-tahapan.spec.js` | Alur utama tahap 2–13: tiap naskah demo tampil di antrean peran yang tepat |
| `05-alur-aksi.spec.js` | Aksi nyata: validasi formulir permohonan, konfirmasi serah terima, reviu sidang terkunci, lepas tugas pentashih (B-19b) |
| `06-permohonan-master.spec.js` | Permohonan Master: penerbit mengajukan → admin menyusun surat → Kepala TTE di Pusat Tanda Tangan → admin mengirim → penerbit mengunduh surat; pembatasan akses per peran |
| `07-pengaduan.spec.js` | Sistem Pengaduan: navbar 3 submenu, kirim pengaduan kesalahan cetak (2 kesalahan + lampiran) & pelayanan dengan CAPTCHA, admin menerima/menolak, ubah status, laporan akhir, pelacakan publik tanpa data pribadi; pembatasan akses API |

## Data uji

`global-setup.js` menjalankan `npm --prefix backend run seed:demo-stages` di awal setiap run.
Script itu **hanya** menghapus lalu membuat ulang naskah berawalan `REG-DEMO-` (13 naskah, satu per tahap),
sehingga setiap run mulai dari kondisi yang sama. Lewati dengan `E2E_SKIP_SEED=1`.

## Batas login (rate limit)

Endpoint login dibatasi **20 percobaan / 15 menit per IP**. Karena itu token tiap akun disimpan di
`e2e/.auth/tokens.json` dan dipakai ulang selama masih valid. Run berikutnya hampir tidak memakai kuota login.
Jika muncul error 429, tunggu hingga 15 menit atau jalankan backend dengan `NODE_ENV=test` (rate limit dilewati).

## Bug yang sudah diketahui

Test yang ditandai `test.fail(...)` mendokumentasikan bug yang belum diperbaiki. Test itu tetap "lulus" selama
bug masih ada, dan akan **gagal** begitu bug diperbaiki. Itu tanda penandanya boleh dihapus.

## Variabel lingkungan

| Variabel | Bawaan | Fungsi |
| --- | --- | --- |
| `E2E_BASE_URL` | `http://localhost:5173` | URL frontend |
| `E2E_API_URL` | `http://127.0.0.1:5000` | URL backend |
| `E2E_PASSWORD` | `password123` | Password akun seed |
| `E2E_SKIP_SEED` | (kosong) | `1` = jangan reset data REG-DEMO |
