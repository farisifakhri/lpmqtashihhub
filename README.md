# Sistem Manajemen Layanan Pentashihan Mushaf Al-Qur'an (LPMQ Tashih Hub)

[![Quality Gate CI](https://github.com/farisifakhri/lpmqtashihhub/actions/workflows/ci.yml/badge.svg)](https://github.com/farisifakhri/lpmqtashihhub/actions)
[![Kementerian Agama RI](https://img.shields.io/badge/Kemenag_RI-Lajnah_Pentashihan_Mushaf_Al--Qur'an-1E560D.svg)](https://lpmq.kemenag.go.id)
[![Glosarium Resmi](https://img.shields.io/badge/Dokumentasi-Glosarium_Istilah_Resmi-396A06.svg)](docs/GLOSARIUM.md)

**LPMQ Tashih Hub** adalah platform layanan publik digital resmi milik **Lajnah Pentashihan Mushaf Al-Qur'an (LPMQ), Badan Litbang dan Diklat / Balitbang Diklat Kementerian Agama Republik Indonesia**. Aplikasi ini melayani pendaftaran badan hukum penerbit, pengajuan tanda tashih mushaf Al-Qur'an multi-naskah dan varian ukuran/oplah, verifikasi berkas, pembayaran Penerimaan Negara Bukan Pajak (PNBP), distribusi sidang pentashihan per rentang juz, siklus revisi naskah dan dumi (*pra-cetak*), hingga penerbitan **Surat Tanda Tashih (STT)** digital ber-QR yang sah secara hukum.

---

## 👥 8 Peran Pengguna & Ruang Lingkup Wewenang

Sistem menerapkan kendali akses berbasis peran (*Role-Based Access Control / RBAC*) yang ketat selaras dengan Tata Naskah Dinas dan Standar Operasional Prosedur (SOP) Kementerian Agama RI:

| Peran Pengguna | Kode Sistem | Ruang Lingkup Wewenang & Tanggung Jawab |
|---|---|---|
| **Penerbit Terverifikasi** | `PENERBIT` | Mendaftarkan badan hukum (PT, CV, Yayasan, Lembaga, Koperasi), mengajukan permohonan naskah baru, mengunggah sampel digital, memantau estimasi SLA, membayar tagihan PNBP SIMPONI, mengunggah naskah revisi/dumi, dan mengunduh STT resmi. |
| **Helper Admin Loket** | `ADMIN_INTERNAL` | Melayani *intake* master fisik di loket LPMQ, memverifikasi nomor resi ekspedisi, menerbitkan tanda terima fisik, serta melakukan verifikasi administratif akun pendaftaran penerbit. |
| **Verifikator Dokumen** | `VERIFIKATOR` | Menerima disposisi penugasan (Nota Dinas), memeriksa checklist administrasi dan rasm mushaf, menyusun draf Berita Acara Verifikasi (BAV), menerbitkan surat lolos/tolak berkas berkode `TL.01`, serta menyerahkan master fisik ke distributor. |
| **Koordinator Distribusi** | `DISTRIBUTOR` | Menerima serah-terima fisik master mushaf (BAST), membentuk formatur tim sidang pentashihan, membagi rentang juz penugasan tanpa tumpang tindih, mereviu putusan pentashih, dan menerbitkan Surat Pengembalian Naskah Perbaikan resmi. |
| **Pentashih Naskah** | `PENTASHIH` | Meneliti keabsahan lafazh ayat suci, rasm usmani, harakat, dan tanda waqaf per rentang juz yang ditugaskan, memberikan rekomendasi kelulusan (`PASSED` / `REVISION_REQUIRED`), dan mengunggah berkas rekapan koreksi internal. |
| **Administrator Dokumen** | `DOKUMENTATOR` | Mengelola arsip dokumen resmi negara, memproses penomoran STT, menyusun Berita Acara Pentashihan (BAT), serta mencatat pemenuhan deposit 5 eksemplar cetak fisik mushaf dari penerbit. |
| **Kepala LPMQ** | `KEPALA_LPMQ` | Mengesahkan Nota Dinas penugasan verifikator, menyetujui draf surat hasil verifikasi naskah, menandatangani Surat Tanda Tashih (STT) digital ber-QR, dan mengawasi kepatuhan SLA layanan. |
| **Administrator Sistem** | `SUPERADMIN` | Mengelola data master layanan, akun pengguna dan penugasan peran ganda (*multi-role*), audit log keamanan, serta konfigurasi portal informasi landing page. |

---

## 🔄 8 Fase Alur Kerja Layanan

Alur pentashihan mushaf dirancang berkesinambungan melalui 8 fase resmi:

```
[1. Pendaftaran] ──> [2. Verifikasi] ──> [3. Pembayaran] ──> [4. Serah-Terima]
       │                    │                  │                   │
[8. Selesai]     <── [7. Dokumentasi]<── [6. STT]        <── [5. Pentashihan]
```

| No | Fase Layanan | Aktor Utama | Keluaran (*Output*) & Keterangan |
|---|---|---|---|
| **1** | **Pendaftaran** | Penerbit | Nomor Registrasi Naskah & Tanda Terima Permohonan elektronik ber-QR. |
| **2** | **Verifikasi Permohonan & Naskah Fisik** | Penerbit, Helper Admin, Verifikator, Kepala LPMQ | Penerimaan naskah fisik A4 di loket, Nota Dinas Penugasan, checklist rasm 8 butir, dan Surat Hasil Verifikasi berkode dinas `TL.01`. |
| **3** | **Pembayaran PNBP** | Penerbit, Verifikator | Penerbitan kode billing SIMPONI (berlaku 7 hari), validasi setoran Nomor Transaksi Penerimaan Negara (NTPN). Penghitungan target SLA resmi dimulai H+1 pasca verifikasi bayar. |
| **4** | **Serah-Terima Fisik** | Verifikator, Distributor | Berita Acara Serah Terima (BAST) master fisik naskah dari verifikator ke distributor. |
| **5** | **Sidang Pentashihan** | Distributor, Pentashih, Penerbit | Penugasan 6 Kelompok Utama Pentashihan (SK 2025), telaah per rentang juz, Berkas Rekapan Internal (rahasia tim), Surat Pengembalian Revisi beronde, penegakan siklus wajib Naskah Dumi (*pra-cetak*). |
| **6** | **Penerbitan STT** | Kepala LPMQ | Surat Tanda Tashih (STT) digital ber-QR resmi Kementerian Agama RI. |
| **7** | **Dokumentasi & Deposit Eksemplar** | Penerbit, Dokumentator | Laporan realisasi pencetakan oplah dan penyerahan deposit **5 eksemplar fisik** mushaf dalam waktu 1 bulan kalender sejak STT terbit. |
| **8** | **Selesai & Arsip** | Sistem LPMQ | Penutupan siklus naskah dan pengarsipan permanen di Pusat Dokumen LPMQ. |

---

## 📖 Glosarium Singkat Istilah Kunci

Untuk panduan terminologi lengkap dan kaidah anti-bahasa sistem, lihat dokumen resmi **[docs/GLOSARIUM.md](docs/GLOSARIUM.md)**.

* **Permohonan Terdaftar:** Status awal ketika penerbit telah melengkapi data mushaf dan mengirimkan permohonan ke LPMQ (menggantikan istilah teknis `DRAFT` / *Draf Belum Diajukan*).
* **Master Fisik Naskah:** Naskah Al-Qur'an lengkap (Juz 1–30) cetak satu muka pada kertas A4 tanpa jilid keras yang diserahkan penerbit ke loket LPMQ untuk ditelaah.
* **Naskah Dumi (*Dummy*):** Naskah contoh cetak pra-cetak (*mockup sample*) dalam bentuk jilid jadi yang wajib diperiksa sebelum izin pencetakan massal STT diterbitkan. Seluruh naskah wajib melalui tahap dumi.
* **Surat Tanda Tashih (STT):** Dokumen negara berkekuatan hukum yang menyatakan mushaf Al-Qur'an telah ditashih dan diizinkan beredar di wilayah Republik Indonesia.
* **Surat Hasil Verifikasi (`TL.01`):** Surat resmi pemberitahuan hasil kelolosan administrasi berkas naskah yang menjadi dasar penerbitan kode billing PNBP.
* **SIMPONI:** Sistem Informasi PNBP Online milik Kementerian Keuangan RI yang digunakan untuk memungut tarif jasa pentashihan mushaf sesuai PP Tarif PNBP Kemenag RI.
* **Berita Acara Serah Terima (BAST):** Berita acara penyerahan berkas master fisik antar unit kerja internal LPMQ (Verifikator $\rightarrow$ Distributor).
* **Hari Kerja (HK):** Satuan waktu resmi penghitungan Service Level Agreement (SLA). Hari libur nasional dan cuti bersama tidak dihitung ke dalam masa layanan.

---

## 🛠️ Arsitektur & Teknologi Stack

* **Frontend:** React 18, Vite 5, Tailwind CSS, React Router 7, TipTap Rich Text Editor, Lucide Icons, Vitest.
* **Backend:** Node.js 20, Express 4, Prisma ORM 5, Zod Schema Validation, JSON Web Token (JWT), PDFKit / Puppeteer Renderer.
* **Basis Data:** MySQL 8 dengan integritas relasional, skema migrasi terotomatisasi, dan sequence penomoran surat atomik anti-tabrakan.
* **Keamanan:** Proteksi Cross-Site Scripting (DOMPurify anti-XSS), mitigasi Insecure Direct Object Reference (IDOR), penyimpanan unggahan berkas privat terenkripsi, sanitasi nama berkas, dan Audit Log seluruh transaksi operasional.

---

## 🚀 Panduan Menjalankan Sistem di Lingkungan Lokal

### 1. Prasyarat Sistem
* **Node.js** versi `>= 20.x` dan **npm** versi `>= 10.x`
* **MySQL** versi `8.x` yang sedang aktif (misalnya via Laragon, XAMPP, atau Docker)

### 2. Kloning & Pemasangan Dependensi
```sh
# Kloning repositori
git clone https://github.com/farisifakhri/lpmqtashihhub.git
cd lpmqtashihhub

# Pasang dependensi root, backend, dan frontend
npm install
npm --prefix backend install
npm --prefix frontend install
```

### 3. Konfigurasi Lingkungan (*Environment Variables*)
1. Salin file contoh konfigurasi backend:
   ```sh
   cp backend/.env.example backend/.env
   ```
   Sesuaikan `DATABASE_URL` (contoh: `mysql://root:@localhost:3306/lpmq_db`) dan pastikan `JWT_SECRET` terisi.
2. Salin file contoh konfigurasi frontend:
   ```sh
   cp frontend/.env.example frontend/.env
   ```
   Pastikan `VITE_API_BASE_URL` mengarah ke `http://localhost:5000/api/v1`.

### 4. Migrasi Basis Data & Seed Data Demo
```sh
cd backend
npx prisma generate
npx prisma migrate deploy
npm run prisma:seed
cd ..
```

### 5. Menjalankan Server Pengembangan
Dari root repository:
```sh
npm run dev
```
* **Frontend Portal:** Akses di [http://localhost:3000](http://localhost:3000) (atau port Vite yang tampil di terminal).
* **Backend API:** Berjalan di [http://localhost:5000/api/v1](http://localhost:5000/api/v1).
* **Pemeriksaan Kesehatan Server:** Buka `GET http://localhost:5000/api/v1/health`.

### 6. Deploy Backend ke Server
Setiap deploy (setelah `git pull`) jalankan dari folder `backend`:
```sh
npm ci
npm run build   # prisma generate
npm start       # prestart: prisma migrate deploy, lalu node src/server.js
```
* `npm start` otomatis menerapkan migrasi yang belum berjalan (`prisma migrate deploy`). Bila migrasi gagal, server **tidak** dinyalakan agar tidak berjalan dengan skema basis data yang tidak cocok; perbaiki migrasinya lalu jalankan ulang.
* Jangan pernah memakai `prisma migrate dev` atau `prisma migrate reset` di server produksi. Backup basis data (`npm run db:backup`) sebelum deploy yang membawa migrasi baru.
* Bila server dijalankan langsung dengan `node src/server.js` (misalnya lewat pm2), jalankan `npx prisma migrate deploy` secara manual sebelum me-restart.

---

## 🔑 Akun Demo Pengembangan (*Seed Accounts*)

Gunakan kata sandi standar untuk seluruh akun demo lokal: `Password123!`

| Peran | Akun Email | Nama Petugas / Instansi |
|---|---|---|
| **Super Admin** | `superadmin@lpmq.kemenag.go.id` | Super Admin LPMQ |
| **Helper Admin Loket** | `admin.internal@lpmq.kemenag.go.id` | Muhammad Zamroni Ahbab, S.S.I., M.Ag. |
| **Verifikator Dokumen** | `verifikator@lpmq.kemenag.go.id` | Shera Diya Zahiyah, S.Hum. |
| **Koordinator Distribusi** | `distributor@lpmq.kemenag.go.id` | H. Fahrur Rozi, M.A. |
| **Pentashih Naskah** | `pentashih@lpmq.kemenag.go.id` | Dr. H. Ahmad Jaeni, M.A. |
| **Administrator Dokumen** | `dokumentator@lpmq.kemenag.go.id` | Ahmad Khotib, S.Sos. |
| **Kepala LPMQ** | `kepala@lpmq.kemenag.go.id` | H. Abdul Aziz Sidqi, M.A. |
| **Penerbit Mushaf** | `penerbit@demo.com` | PT Madina Quran Nusantara |

---

## 🧪 Validasi & Pengujian Mutu (*Testing & Quality Assurance*)

Seluruh fitur dilengkapi pengujian otomatis unit dan integrasi:

```sh
# Menjalankan pengujian backend
npm --prefix backend test

# Menjalankan pengujian frontend (Vitest)
npm --prefix frontend test

# Memvalidasi skema Prisma
cd backend && npx prisma validate && cd ..

# Menjalankan build bundle produksi frontend
npm --prefix frontend run build
```

---

## 📁 Struktur Direktori & Navigasi Dokumentasi

```text
lpmqtashihhub/
├── backend/                 API Express, Prisma ORM, Skema Migrasi, & Pengujian Integrasi
│   ├── prisma/              schema.prisma, migrations/, & seed data resmi
│   └── src/                 Controllers, Services, Routes, Middlewares, & PDF Renderers
├── frontend/                Aplikasi Antarmuka React 18, Vite, & Tailwind CSS
│   ├── src/components/      Komponen UI terstandarisasi, Layout, Navbar, & Sidebar
│   ├── src/features/        Modul fungsional per peran (penerbit, verifikasi, distribusi, tashih)
│   └── src/lib/             Glosarium resmi (glossary.js) & Engine Kalkulator PNBP
└── docs/                    Dokumentasi Arsitektur, Keputusan Rapat, & Glosarium
    ├── GLOSARIUM.md         <- Rujukan Standar Glosarium & Anti-Bahasa Sistem
    ├── README.md            <- Indeks Direktori Dokumentasi
    ├── api/workflow.md      <- Spesifikasi Kontrak API & State Machine
    └── tugas/README.md      <- Peta Tugas Notulensi & Status Penyelesaian Backlog
```

---

*Hak Cipta &copy; 2026 Lajnah Pentashihan Mushaf Al-Qur'an (LPMQ) — Kementerian Agama Republik Indonesia.*
