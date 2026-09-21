# Sistem Manajemen Layanan Pentashihan Mushaf Al-Qur'an

Aplikasi LPMQ untuk portal penerbit dan petugas internal. Frontend menggunakan React 18, Vite 5, dan Tailwind CSS. Backend menggunakan Express 4, Prisma 5, dan MySQL 8, dengan autentikasi JWT, RBAC, audit log, serta penyimpanan unggahan privat.

## Status implementasi

Alur internal SOP Verifikasi Mushaf Al-Qur'an (SOP v2.2) telah selesai diimplementasikan secara end-to-end dan seluruh rangkaian test suite saat ini lulus:
- Pemeriksaan berkas fisik (intake) dan serah-terima fisik oleh `ADMIN` (Staf TU / Layanan).
- Penerbitan Nota Dinas Verifikasi dan penugasan verifikator oleh Kepala LPMQ secara atomik dengan SLA 2 hari kerja kalender kerja (`Asia/Jakarta`, cut-off 16:00 WIB).
- Pemisahan dokumen resmi verifikasi: Nota Dinas Verifikasi, Surat Pemberitahuan Hasil Verifikasi, dan Berita Acara Verifikasi.
- Penandatanganan digital bertingkat (multi-signatory) internal untuk Kepala LPMQ dan Verifikator.
- Mekanisme pengiriman email hasil verifikasi berbasis database outbox idempoten dengan status antrean/retry (saat ini menggunakan `MockEmailProvider` in-memory untuk dev/test sebelum penyambungan SMTP gateway produksi).
- Validasi ketat kontak penerbit tanpa fallback email generik dummy.
- Pembatasan verifikasi pembayaran PNBP dan serah-terima master fisik ke distributor loket pentashihan.
- Akses berkas privat terproteksi tanpa token query URL.
- Penanganan sinkronisasi ke sistem eksternal dengan status terverifikasi (`PENDING`, `SYNCED`, `FAILED`) tanpa false-success.

Spesifikasi kontrak API lengkap dan arsitektur alur kerja tercatat pada [API_CONTRACT_MODUL_LANJUTAN.md](API_CONTRACT_MODUL_LANJUTAN.md).

## Prasyarat

- Node.js 20 dan npm.
- MySQL 8 yang berjalan dan database kosong `lpmq_db` (atau nama lain sesuai `DATABASE_URL`).
- Kredensial database lokal yang dapat membuat dan mengubah tabel.

## Menjalankan lokal

Dari root repository:

```sh
npm ci
npm --prefix backend ci
npm --prefix frontend ci
```

Salin `backend/.env.example` menjadi `backend/.env` dan sesuaikan `DATABASE_URL` serta `JWT_SECRET`. Salin `frontend/.env.example` menjadi `frontend/.env` dan arahkan `VITE_API_BASE_URL` ke `http://localhost:5000/api/v1`. Jangan commit file `.env` atau data asli. Akun seed hanya untuk pengembangan lokal.

```sh
cd backend
npx prisma generate
npx prisma migrate deploy
npm run prisma:seed
cd ..
npm run dev
```

Frontend tersedia di `http://localhost:5173` dan API di `http://localhost:5000/api/v1`. `GET /api/v1/health` memeriksa database dan mengembalikan HTTP 503 saat tidak siap. Dalam development server masih dapat membuka endpoint kesehatan ketika database gagal tersambung; dalam production startup gagal. Siapkan `JWT_SECRET` yang kuat dan konfigurasi origin yang sesuai sebelum menjalankan production.

## Validasi

```sh
cd backend
npx prisma validate
cd ..
npm --prefix backend run test:unit
npm --prefix backend test
npm --prefix frontend test
npm --prefix frontend run build
```

Tes backend integrasi membutuhkan database uji yang sudah dimigrasi dan di-seed. CI menjalankan MySQL 8, validasi/migrasi Prisma, seed, tes backend/frontend, dan build. Jangan arahkan tes integrasi ke database produksi karena tes menulis data.

## Struktur proyek

```text
backend/                 Express API, Prisma schema/migrations/seed, tests
frontend/                React/Vite UI, API client, component tests
backend/prisma/          Model dan migrasi MySQL
backend/src/             Routes, controllers, services, middleware
frontend/src/            Router, halaman, komponen, konteks autentikasi
docs/                    Dokumentasi teknis, RBAC admin, dashboard, FIFO
docs/api/                Kontrak workflow dan siklus SOP
.github/workflows/ci.yml Quality gate CI
API_CONTRACT_MODUL_LANJUTAN.md Spesifikasi kontrak API modul lanjutan (Live)
DESIGN.MD                Rancangan arsitektur dan domain
IMPLEMENTATION.md        Rencana implementasi & status sprint
USER_FLOWS.md            Alur pengguna per peran
```

SOP dan keputusan stakeholder menjadi sumber aturan bisnis. Alur SOP Verifikasi v2.2 (penerimaan fisik oleh Admin, penugasan Kepala LPMQ dengan SLA 2 hari kerja kalender dan cut-off 16:00 WIB, penyusunan draf Surat Hasil & Berita Acara Verifikasi, tanda tangan digital internal multi-signatory, outbox email idempoten, verifikasi pembayaran internal, serta serah-terima fisik distributor dengan penanganan koreksi fisik cacat) telah selesai diimplementasikan secara end-to-end dan seluruh test suite saat ini lulus. Integrasi produksi tingkat lanjut (gateway SIMPONI, sertifikat digital BSrE, SMTP produksi, dan implementasi penuh UI Pentashihan/Dokumentasi) disiapkan sebagai tahapan implementasi berikutnya.

