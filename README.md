# Sistem Manajemen Layanan Pentashihan Mushaf Al-Qur'an (LPMQ)

Repositori resmi sistem layanan pentashihan mushaf Al-Qur'an Kementerian Agama Republik Indonesia (Lajnah Pentashihan Mushaf Al-Qur'an — LPMQ).

## Arsitektur & Teknologi

Sistem mengadopsi pola modular monolith yang memisahkan client frontend dan server backend:

- **Frontend**: React + Vite + JSX (JavaScript), Tailwind CSS, React Router, Vitest.
  - Sesuai dengan [ADR-001](docs/adr/ADR-001-frontend-stack-react-vite.md)
  - Panduan desain & token: [DESIGN.md](DESIGN.MD)
  - Arsitektur & catatan teknis: [IMPLEMENTATION.md](IMPLENTATION.MD)
- **Backend**: Node.js + Express, Prisma ORM, PostgreSQL (dalam pengembangan berikutnya).
- **Format Layanan**:
  - **Portal Penerbit**: Pengajuan naskah Al-Qur'an, pemantauan status, billing PNBP, riwayat revisi, unduh tanda tashih resmi.
  - **Aplikasi Internal**: Pengolahan verifikasi kelengkapan naskah, pembagian Tim Distribusi, pentashihan bertahap (Awal, Perbaikan, Dumi), penyusunan Berita Acara Tashih, dan penetapan Surat Tanda Tashih oleh Kepala LPMQ.
  - **Verifikasi Publik**: Pemeriksaan keaslian Surat Tanda Tashih via pemindaian QR code tanpa otentikasi.

## Struktur Direktori

```text
lpmq/
├── docs/                     # SRS v2.1, Backlog, ERD, dan ADR
│   └── adr/                  # Architectural Decision Records
├── frontend/                 # Aplikasi Frontend (React + Vite + JSX)
│   ├── src/
│   │   ├── app/              # Router, App context, Design tokens
│   │   ├── components/       # Komponen UI formal (Button, Badge, Card, dll.) & layout
│   │   ├── features/         # Modul fitur (auth, registrations, verification, tashih, dll.)
│   │   └── index.css         # Styling Tailwind dengan konfigurasi token LPMQ
│   ├── package.json
│   └── vite.config.js
├── backend/                  # (Sprint berikutnya) API Modular Monolith Node.js
├── CODING_BASELINE_PROMPT.md # Aturan & standar agen pengembang
├── DESIGN.MD                 # Panduan Desain UI/UX & Design Tokens
├── IMPLENTATION.MD           # Catatan arsitektur & state machine resmi
└── README.md
```

## Menjalankan Frontend

1. Masuk ke direktori frontend:
   ```bash
   cd frontend
   ```
2. Instal dependensi:
   ```bash
   npm install
   ```
3. Salin file environment:
   ```bash
   cp .env.example .env
   ```
4. Jalankan server pengembangan:
   ```bash
   npm run dev
   ```
5. Menjalankan pengujian (Unit Test):
   ```bash
   npm test
   ```
