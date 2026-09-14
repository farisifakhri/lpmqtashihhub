# Sistem Manajemen Layanan Pentashihan Mushaf Al-Qur'an

Aplikasi LPMQ untuk portal penerbit dan petugas internal. Frontend menggunakan React 18, Vite 5, dan Tailwind CSS. Backend menggunakan Express 4, Prisma 5, dan MySQL 8, dengan autentikasi JWT, RBAC, audit log, serta penyimpanan unggahan privat.

## Status implementasi

Fondasi API, migrasi/seed database, master data, dashboard berbasis peran, dan sebagian alur pengajuan hingga dokumen draf sudah tersedia. Beberapa halaman operasional masih `ModulePlaceholder`, termasuk riwayat pengajuan, billing PNBP, antrean verifikasi, distribusi, pentashihan, dan dokumen. Sistem belum siap dipakai end-to-end untuk SOP Verifikasi final. Penugasan verifikator oleh Kepala LPMQ, pengiriman surat hasil verifikasi, dan serah-terima master fisik masih perlu dilengkapi. Kontrak API saat ini dijelaskan di [docs/api/workflow.md](docs/api/workflow.md); kesenjangan terhadap SOP dicatat di [docs/api/verifikasi-sop-review.md](docs/api/verifikasi-sop-review.md).

Nomor billing `MANUAL` adalah referensi internal, bukan kode SIMPONI. PDF dokumen resmi masih draf dan belum memakai template final atau tanda tangan elektronik.

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
docs/api/                Kontrak workflow dan catatan SOP
.github/workflows/ci.yml Quality gate CI
DESIGN.MD                Rancangan arsitektur dan domain
IMPLEMENTATION.md        Rencana implementasi
USER_FLOWS.md            Alur pengguna dan keputusan terbuka
```

SOP dan keputusan stakeholder menjadi sumber aturan bisnis. SLA adalah target pemantauan, bukan pemblokir otomatis. File unggahan privat dan perubahan transaksi harus ditangani sesuai otorisasi serta audit. Alur Berita Acara/STT final, delegasi Kepala LPMQ, integrasi SIMPONI, dan tanda tangan elektronik menunggu keputusan resmi.
