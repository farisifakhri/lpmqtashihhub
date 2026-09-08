# ADR-001: Penetapan Stack Frontend Menggunakan React + Vite + TypeScript

- **Status**: Approved
- **Tanggal**: 2026-09-08
- **Pengambil Keputusan**: Tim Pengembang & Stakeholder Proyek LPMQ

## Konteks

Sebelumnya pada dokumen rintisan awal (`IMPLEMENTATION.md`), stack frontend sempat tercatat menggunakan Vue 3. Namun, untuk mempercepat delivery, memaksimalkan ketersediaan ekosistem komponen formal/enterprise di Indonesia, serta konsistensi keahlian tim dan fleksibilitas integrasi, tim memutuskan untuk mengevaluasi kembali pilihan framework frontend.

Kebutuhan sistem:
1. Dua antarmuka terpisah dalam satu basis kode frontend atau satu portal terintegrasi: **Portal Penerbit** dan **Aplikasi Internal**.
2. State machine yang ketat untuk siklus pentashihan Al-Qur'an (9 status pengajuan, track pembayaran terpisah, dan iterasi pentashihan).
3. Penerapan token desain formal LPMQ Kemenag (Hijau `#0B5E3B`, Emas `#B8860B`, Netral) tanpa hardcode hex di komponen UI.
4. Dukungan pengujian komponen UI otomatis (Unit test untuk status badge, format rupiah/SLA, dsb.).

## Keputusan

Kami menetapkan **React (v18/19) + Vite + TypeScript** sebagai stack standar resmi frontend untuk Sistem Manajemen Layanan Pentashihan Mushaf Al-Qur'an (LPMQ).

Rincian arsitektur pendukung:
- **Build Tool**: Vite (kecepatan HMR, integrasi TypeScript bawaan, dan konfigurasi ringan).
- **Styling**: Tailwind CSS dikonfigurasi dengan Design Token resmi `DESIGN.md` §2.
- **Routing**: React Router DOM (v6/v7) dengan pemisahan rute publik, penerbit (`/publisher/*`), internal instansi (`/internal/*`), dan verifikasi QR (`/verify-documents/:token`).
- **Ikon**: `lucide-react` (konsisten, formal, dan ringan).
- **State & Data Fetching**: State lokal berbasis React hooks / Context, dengan pola modular per fitur (`features/*`).
- **Testing**: Vitest + React Testing Library untuk unit & integration test komponen UI.

## Konsekuensi

### Positif:
- Kompatibilitas luas dengan berbagai pustaka komponen UI pemerintah dan enterprise.
- Sistem tipe TypeScript yang ketat meminimalisir kesalahan representasi status transisi pengajuan di sisi browser.
- Struktur folder `frontend/` terisolasi rapi dari `backend/`, memungkinkan CI/CD terpisah atau digabung dalam monorepo sederhana.

### Negatif / Mitigasi:
- Catatan lama di `IMPLEMENTATION.md` yang menyebut Vue 3 harus diperbarui agar tidak menimbulkan kebingungan bagi pengembang baru.
- Perlu memastikan kepatuhan terhadap prinsip *Server is the source of truth*—state client tidak boleh melakukan validasi izin/otorisasi final sendiri tanpa konfirmasi server.
