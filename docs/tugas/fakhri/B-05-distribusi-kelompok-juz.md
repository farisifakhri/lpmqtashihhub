# B-05: Distribusi Kelompok & Penjatahan Juz Fleksibel

- **ID Paket:** B-05
- **Branch:** `feat/b05-distribusi-kelompok-juz`
- **Basis:** `main`
- **PIC:** Fakhri
- **Status:** **Selesai menurut bukti kode**
- **Dependensi:** T-F02 (RBAC ADMIN_INTERNAL), Pembayaran PNBP Lunas
- **Memblokir:** B-06 (Rekap Pentashih), B-07, B-08, B-09 s.d. B-11
- **Versi Dokumen:** 1.0 (26 Oktober 2026)

---

## 1. Latar Belakang & Persyaratan

Pada versi awal alur distribusi pentashihan:
1. **Pemberian Tugas Kaku:** Penugasan pentashihan hanya dapat dilakukan pada satu kelompok kerja tunggal, tanpa dukungan pemilihan pentashih individual atau lintas kelompok.
2. **Ketiadaan Pencarian Pentashih:** Belum terdapat dropdown/input pencarian pentashih terintegrasi untuk menyaring anggota berdasarkan nama, NIP, atau email.
3. **Celah Validasi Rentang Juz:** Belum ada validasi matematis di backend bahwa pembagian juz mencakup secara lengkap Juz 1 s.d. 30 untuk mushaf Al-Qur'an 30 juz, sehingga berisiko meninggalkan juz kosong tanpa pentashih.
4. **Alasan Pergantian Mengandung Data Sensitif:** Alasan pergantian atau penambahan pentashih belum distandarisasi ke opsi administratif umum (menghindari pencatatan data kesehatan atau privasi).
5. **Bahasa Terlarang "SK":** Antarmuka dan pesan validasi backend sebelumnya masih menggunakan istilah "SK" ("Tim dengan SK aktif"), yang dilarang dalam panduan terminologi resmi LPMQ.

---

## 2. Implementasi Teknis

### 2.1. Backend (`distribution.service.js`, `workflow.validator.js`, `master.routes.js`, `master.service.js`)
1. **Pembersihan Terminologi:**
   - Seluruh istilah *"SK aktif"* dihapus dari validasi dan pesan sistem, digantikan dengan *"Kelompok Kerja Pentashihan Aktif"*.
2. **Dukungan Kelompok & Individu Fleksibel:**
   - Parameter `team_id` pada `assignmentSchema` dijadikan opsional (`optional()`), sehingga distributor dapat menetapkan pentashih per kelompok, individu langsung, maupun kombinasi.
   - Anggota divalidasi terhadap keanggotaan kelompok aktif atau akun peran `PENTASHIH` aktif secara menyeluruh di sistem.
3. **Validasi Matematis 30 Juz Lengkap:**
   - Untuk layanan mushaf 30 juz (`CETAK` / 30 Juz) atau saat `enforce_full_coverage` aktif, sistem memverifikasi kesatuan himpunan juz (`union(assigned_juz)`) mencakup rentang `1..30` tanpa ada celah juz yang terlewat.
   - Jika terdapat juz yang belum terbagi, backend melemparkan respons `400 Bad Request` yang secara spesifik mencantumkan nomor-nomor juz yang belum teralokasikan.
4. **Alasan Administratif Pergantian Pentashih (Perlindungan Privasi):**
   - Mendukung opsi generik pada `reassignment_reason`:
     - `BEBAN_KERJA` (Penyesuaian Beban Kerja)
     - `ROTASI_TUGAS` (Rotasi Penugasan Berkala)
     - `PENDELEGASIAN` (Pendelegasian Tugas Tambahan)
     - `PERMINTAAN_DISTRIBUTOR` (Kebutuhan Penyesuaian oleh Distributor)
     - `LAINNYA` (Penyesuaian Administratif Lainnya)
   - Tanpa kolom data medis/kesehatan apapun untuk menjamin privasi pegawai.
5. **Endpoint Master Pencarian Pentashih:**
   - Menambahkan `GET /api/v1/master/pentashih-candidates?search={query}&team_id={id}` yang mengembalikan daftar pentashih aktif, NIP, beban kerja penugasan berjalan (`active_assignments_count`), dan kelompok kerja terkait.

### 2.2. Frontend (`ManualTeamAssignmentDialog.jsx`, `master.api.js`)
1. **Dropdown & Pencarian Pentashih Realtime:**
   - Kotak pencarian interaktif untuk memfilter pentashih berdasarkan nama, NIP, atau email.
   - Pilihan mode: memilih kelompok kerja tertentu atau memuat seluruh pentashih aktif lintas kelompok.
2. **Indikator Langsung Cakupan 30 Juz:**
   - Badge visual dinamis: menampilkan progres alokasi juz (misal `20/30 Juz`).
   - Notifikasi peringatan amber jika alokasi belum lengkap, merinci daftar nomor juz yang belum terbagi.
   - Badge hijau sukses *"Cakupan Penuh: Seluruh 30 Juz Lengkap Teralokasikan"* ketika rentang juz 1–30 telah tertutup rapat.
3. **Preset Pembagian Cepat:**
   - Tombol pembagian rentang cepat meliputi:
     - `Juz 1–20 (20 Juz)` dan `Juz 21–30 (10 Juz)` (skema 20–10)
     - `Juz 1–15 (15 Juz)` dan `Juz 16–30 (15 Juz)` (skema 15–15)
     - `Juz 1–10`, `Juz 11–20`, `Juz 21–30` (skema 10–10–10)
     - Blok 5 juz (1–5, 6–10, 11–15, 16–20, 21–25, 26–30)
     - `Juz 1–30 (Penuh)`

---

## 3. Bukti Pengujian

1. **Unit Test Backend (`backend/tests/distribution-b05.test.js` & `distribution-workflow.test.js`):**
   - Lolos validasi skema opsional `team_id` dan penolakan duplikasi juz tanpa `allow_overlap`.
   - Lolos penolakan 400 saat cakupan 30 juz tidak lengkap.
   - Lolos penugasan kombinasi 20–10 juz (Pentashih 1: 1–20, Pentashih 2: 21–30).
   - Lolos query `getPentashihCandidates` dengan pencarian dan perhitungan beban kerja.
2. **Unit Test Frontend (`frontend/src/features/distribution/ManualTeamAssignmentDialog.test.jsx`):**
   - 5/5 pengujian vitest lulus 100% (termasuk pembagian preset 20–10 juz dan pencarian realtime).
3. **Production Build:**
   - `npm run build` frontend selesai sukses tanpa error (1782 modul).
