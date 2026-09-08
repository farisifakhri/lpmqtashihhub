# ADR-001: Penetapan Stack Frontend Menggunakan React + Vite + JSX

- **Status**: Approved
- **Tanggal**: 2026-09-08
- **Pengambil Keputusan**: Tim Pengembang & Stakeholder Proyek LPMQ

## Konteks

Sebelumnya pada dokumen rintisan awal (`IMPLEMENTATION.md`), stack frontend sempat tercatat menggunakan Vue 3. Namun, untuk mempercepat delivery, memaksimalkan fleksibilitas sintaks, dan menyelaraskan dengan preferensi pengembangan tim, diputuskan untuk menggunakan React dengan Vite dan JSX (.jsx).

Kebutuhan sistem:
1. Dua antarmuka terpisah dalam satu basis kode frontend: **Portal Penerbit** dan **Aplikasi Internal**.
2. State machine yang ketat untuk siklus pentashihan Al-Qur'an (9 status pengajuan, track pembayaran terpisah, dan iterasi pentashihan).
3. Penerapan token desain formal LPMQ Kemenag (Hijau `#0B5E3B`, Emas `#B8860B`, Netral) tanpa hardcode hex di komponen UI.
4. Dukungan pengujian komponen UI otomatis (Unit test untuk status badge, format rupiah/SLA, dsb.).

## Keputusan

Kami menetapkan **React + Vite + JSX (JavaScript)** sebagai stack standar resmi frontend untuk Sistem Manajemen Layanan Pentashihan Mushaf Al-Qur'an (LPMQ).

Rincian arsitektur pendukung:
- **Build Tool**: Vite (kecepatan HMR dan konfigurasi minimalis).
- **Format Berkas**: React JSX (`.jsx` untuk komponen dan `.js` untuk utilitas/token).
- **Styling**: Tailwind CSS dikonfigurasi dengan Design Token resmi `DESIGN.md` §2.
- **Routing**: React Router DOM (v6) dengan pemisahan rute publik, penerbit (`/publisher/*`), internal instansi (`/internal/*`), dan verifikasi QR (`/verify-documents/:token`).
- **Ikon**: `lucide-react` (konsisten, formal, dan ringan).
- **State & Data Fetching**: State modular berbasis React hooks / Context per fitur (`features/*`).
- **Testing**: Vitest + React Testing Library untuk unit & integration test komponen UI.

## Konsekuensi

### Positif:
- Siklus iterasi cepat tanpa overhead kompilasi tipe atau file `.d.ts`.
- Kompatibilitas luas dengan berbagai pustaka komponen UI.
- Struktur folder `frontend/` terisolasi rapi dari `backend/`, memudahkan CI/CD.

### Negatif / Mitigasi:
- Validasi data runtime dan server-side validation menjadi garda utama integritas tipe data transaksi pentashihan.
