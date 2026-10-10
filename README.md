# Sistem Manajemen Layanan Pentashihan Mushaf Al-Qur'an

Aplikasi LPMQ untuk portal penerbit dan petugas internal. Frontend menggunakan React 18, Vite 5, dan Tailwind CSS. Backend menggunakan Express 4, Prisma 5, dan MySQL 8, dengan autentikasi JWT, RBAC, audit log, serta penyimpanan unggahan privat.

## Status implementasi

Alur internal Sistem Pentashihan Mushaf Al-Qur'an (SOP v2.2 & Addendum SRS v3.1) telah selesai diimplementasikan secara end-to-end dan seluruh rangkaian test suite lulus 100%:
- **Penerimaan Fisik & Intake Loket (`HELPER_ADMIN`)**: Pencatatan nomor resi, tanda terima fisik, bukti fisik paket, dan tanggal terima (`received_at`). Admin Internal (M. Zamroni Ahbab & Mustakim) diisolasi khusus pada tugas teknis intake (`RF-REG-11`, `RF-REG-13`, `T-03`).
- **Verifikasi Berkas & Naskah (`VERIFIKATOR`)**: Penugasan via Nota Dinas, checklist butir pemeriksaan selaras Berita Acara resmi Kemenag RI (T-06), tombol pengajuan "Ajukan Draft" (`RF-VER-04`), penandatanganan digital bertingkat, dan outbox pengiriman hasil verifikasi.
- **Pembayaran PNBP & Serah-Terima Fisik**: Validasi pembayaran sah, penghitungan SLA H+1 pasca verifikasi bayar (`RF-CALC-05`), serah-terima fisik ke distributor, dan penanganan fisik cacat (`PHYSICAL_HANDOVER_CORRECTION_REQUIRED`).
- **Distribusi & Pentashihan Rentang Juz (`RF-DIST-05`)**: 6 Kelompok Utama Pentashihan (SK LPMQ 2025), penugasan berbasis rentang juz tanpa tumpang tindih, dan workspace pentashih interaktif.
- **Berkas Rekapan Koreksi Internal (`RF-DIST-18`, `RF-DIST-19`)**: Pentashih mengunggah 1 (satu) berkas rekapan internal per rentang juz yang bersifat rahasia internal tim (hanya dapat diakses pentashih, distributor, dan admin internal).
- **Surat Pengembalian Revisi Resmi (`REVISION_RETURN_LETTER`)**: Reviu Distributor dengan penetapan `revision_kind` (`NASKAH_PERBAIKAN` / `NASKAH_DUMI`), penomoran ronde otomatis (Ronde 1, 2, 3, dst.), dan penerbitan draf surat resmi Kemenag RI (`RF-DIST-08`, `RF-DIST-09`, `RF-DIST-17`).
- **Penanganan Naskah Dumi (T-04)**: Naskah Dumi dipilih setelah naskah bersih; temuan minor pada dumi diterbitkan notice koreksi tanpa siklus baru ke penerbit.
- **Template Surat Permohonan & Label Pengiriman**: Unduhan langsung template resmi `.docx` di portal pendaftaran (`RF-PBL-01`) dan cetak label pengiriman dengan logo Kemenag & LPMQ tajam dan terbaca jelas (`RF-REG-10`).
- **Pusat Arsip Global**: Menu Arsip & Dokumen dipusatkan di Sidebar `/internal/archive` yang dapat diakses oleh seluruh peran internal (`RF-DOC-14`).

Spesifikasi kontrak API lengkap dan arsitektur alur kerja tercatat pada [docs/api/workflow.md](docs/api/workflow.md) dan catatan keputusan pada [docs/references/keputusan-2026-10-08.md](docs/references/keputusan-2026-10-08.md).

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
docs/api/workflow.md    Kontrak API alur layanan
docs/architecture/design.md          Rancangan arsitektur dan domain
docs/architecture/implementation.md  Rencana implementasi & status sprint
docs/architecture/user-flows.md      Alur pengguna per peran
```

SOP dan keputusan stakeholder menjadi sumber aturan bisnis. Alur SOP Verifikasi v2.2 (penerimaan fisik oleh Admin, penugasan Kepala LPMQ dengan SLA 2 hari kerja kalender dan cut-off 16:00 WIB, penyusunan draf Surat Hasil & Berita Acara Verifikasi, tanda tangan digital internal multi-signatory, outbox email idempoten, verifikasi pembayaran internal, serta serah-terima fisik distributor dengan penanganan koreksi fisik cacat) telah selesai diimplementasikan secara end-to-end dan seluruh test suite saat ini lulus. Integrasi produksi tingkat lanjut (gateway SIMPONI, sertifikat digital BSrE, SMTP produksi, dan implementasi penuh UI Pentashihan/Dokumentasi) disiapkan sebagai tahapan implementasi berikutnya.

