# Panduan Desain UI/UX

**Sistem Manajemen Layanan Pentashihan Mushaf Al-Qur'an — LPMQ**
Status: Baseline Sprint 0 · Living document

> Dokumen ini adalah ringkasan yang dapat dieksekusi langsung oleh tim
> frontend. Rasional lengkap ada di dokumen "Gambaran Desain Aplikasi"
> (arsip). **Peringatan:** dokumen arsip tersebut disusun sebelum SRS
> v2.1 dan memakai label status lama — jangan salin timeline/status
> dari sana. Selalu rujuk state machine di `IMPLEMENTATION.md` §4.

## 1. Prinsip Desain

1. **Formal & Tepercaya** — sistem instansi pemerintah, hindari kesan
   aplikasi konsumen/playful.
2. **Kejelasan Status di Atas Segalanya** — setiap layar menampilkan
   status pengajuan secara konsisten (warna + label + ikon).
3. **Peran Menentukan Tampilan** — dashboard dan menu menyesuaikan
   peran aktif, bukan satu tampilan generik.
4. **Transparansi Biaya & Waktu** — rincian tarif dan SLA ditampilkan
   eksplisit sebelum konfirmasi.
5. **Jejak Audit Terlihat oleh Pengguna** — riwayat status, billing,
   dan dokumen bisa ditelusuri dari UI.
6. **Konsisten Lintas Modul** — komponen kartu/tabel/badge/form yang
   sama dipakai berulang di semua modul.
7. **Bahasa Indonesia & Terminologi Resmi LPMQ** — Tashih, Naskah Dumi,
   PNBP, Berita Acara Tashih, Surat Tanda Tashih — bukan istilah teknis
   generik.

## 2. Design Token

### 2.1 Warna — Hijau · Putih · Emas (rasio ±30/60/10)

| Token | Hex | Pemakaian |
|---|---|---|
| `color-primary-700` | `#0B5E3B` | Header, sidebar aktif, tombol utama |
| `color-primary-500` | `#1B7A4D` | Aksen tombol, ikon aktif, tab terpilih |
| `color-primary-100` | `#E3F3EA` | Latar kartu info, hover, badge positif |
| `color-neutral-white` | `#FFFFFF` | Latar dominan (±70% luas layar) |
| `color-neutral-50` | `#F7F8F6` | Latar halaman |
| `color-neutral-200` | `#E1E4E0` | Border/garis pemisah |
| `color-neutral-700` | `#2A2E2B` | Teks isi/body |
| `color-accent-gold-600` | `#B8860B` | Aksen dokumen resmi, ikon "terverifikasi" |
| `color-accent-gold-400` | `#D4AF37` | Highlight nominal tarif/PNBP |
| `color-accent-gold-50` | `#FBF6E7` | Latar kartu ringkasan tarif/billing |
| `color-status-warning` | `#C77B2A` | Perlu Perbaikan, Menunggu Pembayaran |
| `color-status-danger` | `#B3261E` | Ditolak, Dibatalkan |
| `color-status-info` | `#2E6F95` | Sedang Diproses |

**Aturan pemakaian emas:** dipakai untuk dua makna berbeda — "butuh
perhatian" (revisi, jatuh tempo) dan "resmi/final" (dokumen terbit).
Bedakan lewat kombinasi ikon, jangan andalkan warna saja.

### 2.2 Tipografi

| Elemen | Ukuran | Bobot |
|---|---|---|
| H1 (judul halaman) | 24–28px | Semi-bold |
| H2 (sub-judul) | 18–20px | Semi-bold |
| Body/tabel | 14px | Regular |
| Label form/caption | 12–13px | Medium |
| Nominal tarif/PNBP | 20–24px | Bold, angka tabular |

Font sans-serif institusional (Plus Jakarta Sans/Inter) untuk UI.
Dokumen resmi (Berita Acara, Surat Tanda Tashih) memakai serif formal
terpisah untuk kesan sertifikat — lihat §5.

### 2.3 Implementasi token

Definisikan sebagai variabel CSS/Tailwind config (`frontend/src/app/tokens.ts`)
— jangan hardcode hex di komponen. Konsisten dengan prinsip "config
over hardcode" di `IMPLEMENTATION.md`.

## 3. Status → Warna Badge (acuan wajib: `IMPLEMENTATION.md` §4)

| Status pengajuan | Warna badge |
|---|---|
| DRAFT | Abu-abu netral `#8A8F8B` |
| READY_FOR_VERIFICATION | Hijau muda (info) |
| IN_VERIFICATION | Biru keabuan `#2E6F95` |
| REVISION_REQUIRED | Emas/oranye `#C77B2A` |
| WAITING_DISTRIBUTION | Hijau utama |
| TASHIH_IN_PROGRESS | Hijau utama + ikon tahap (awal/perbaikan/dumi) |
| DOCUMENTATION | Hijau tua + aksen emas |
| COMPLETED | Hijau tua + aksen emas, badge khusus dokumen resmi |
| CANCELLED | Merah `#B3261E` |

Status pembayaran (`payment_records.status`) dan tahap tashih
(`assignments.stage`) punya badge terpisah dari status pengajuan —
jangan gabungkan jadi satu badge/timeline tunggal.

## 4. Komponen UI Inti

- **Card**: latar putih, radius ±8px, border 1px `color-neutral-200`.
- **Badge Status**: bentuk pil, selalu disertai label teks (bukan
  warna saja) untuk aksesibilitas.
- **Button**: Primary (hijau), Secondary/Outline (border hijau),
  Danger (merah), Aksen Emas (terbatas untuk aksi dokumen resmi, mis.
  "Tetapkan Surat Tanda Tashih").
- **Tabel Data**: header hijau muda, zebra striping, kolom status
  pakai Badge Status.
- **Form**: label di atas input, dropdown/searchable-select untuk
  field dari master data (bukan input bebas).
- **Timeline/Stepper**: horizontal (desktop) / vertikal (mobile).
  **Update wajib**: render dari state machine `IMPLEMENTATION.md` §4,
  dengan track terpisah untuk status pembayaran dan tahap tashih —
  jangan pakai satu stepper linear seperti draft desain lama.
- **Kartu Ringkasan Tarif/Billing**: latar emas muda, nominal besar.

## 5. Dua Dokumen Resmi — Implikasi ke Layar

Lihat `IMPLEMENTATION.md` §3.1 untuk detail model data. Untuk UI:

| Layar | Catatan desain |
|---|---|
| **Pratinjau Berita Acara Tashih** | Tampilkan identitas naskah, rincian komponen/tarif/durasi, matriks distribusi & progres tahapan, catatan+rekomendasi verifikator, TTD verifikator (ketua kelompok). Gaya dokumen kerja/laporan — tidak perlu seformal sertifikat. |
| **Pratinjau Surat Tanda Tashih** | Menyerupai sertifikat: bingkai emas, kop resmi, nomor surat + QR verifikasi, penetapan oleh Kepala LPMQ, referensi eksplisit ke Berita Acara yang mendasarinya. |
| **Halaman arsip dokumen** | Tampilkan kedua jenis dokumen sebagai entri terpisah namun tertaut (Surat → Berita Acara sumber), bukan satu daftar campur. |

**Belum ada wireframe untuk:**
- Halaman verifikasi QR publik (diakses tanpa login) — beda pola akses
  dari seluruh sistem berbasis role, perlu layar tersendiri.
- Form pembuatan pengajuan perpanjangan (`REG-07`) yang menautkan ke
  dokumen sebelumnya.
- Indikator dokumen "akan kedaluwarsa"/"kedaluwarsa" di dashboard dan
  arsip (`DOC-07`).

Ketiganya wajib punya wireframe P0 sebelum sprint terkait mulai (lihat
Exit Criteria di `IMPLEMENTATION.md`).

## 6. Struktur Navigasi

Sidebar menyesuaikan role aktif; role switcher di header untuk
pengguna multi-role. Menu ringkas per peran mengikuti RF-terkait di
SRS §4 — jangan hardcode daftar menu di frontend, ambil dari
permission efektif pengguna (least privilege, `IMPLEMENTATION.md` §1).

## 7. Desain Responsif & Aksesibilitas

- Breakpoint: Desktop ≥1200px (prioritas), Tablet 768–1199px, Mobile <768px.
- Tabel → stacked card list di mobile.
- Kontras WCAG AA minimum (rasio ≥4.5:1) — **verifikasi dengan tool
  otomatis** (mis. axe/WebAIM) saat implementasi, jangan asumsikan
  "sudah sesuai" tanpa bukti uji.
- Status tidak pernah diwakili warna saja.
- Target sentuh minimum 44×44px di mobile/tablet.

## 8. Belum Diputuskan

- Jumlah halaman naskah yang ditampilkan di form upload (3–4 vs 1–5)
  — lihat `IMPLEMENTATION.md` §7.
- Resolusi cover yang ditampilkan di halaman verifikasi QR publik
  (penuh vs terbatas) — SRS v2.1 Bab 16.