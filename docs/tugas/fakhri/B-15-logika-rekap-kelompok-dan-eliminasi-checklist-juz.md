# B-15: Logika Rekap Kelompok (TEAM vs SELF), Penugasan Campuran, dan Eliminasi Checklist Per Juz

- **ID Paket:** B-15
- **Branch:** `feat/b15-rekap-kelompok-dan-eliminasi-checklist`
- **Basis:** `feat/b14-integritas-gerbang-stt-dan-kebocoran-tashih`
- **PIC:** Fakhri
- **Status:** **Selesai (Commit 8b29f4b)**
- **Dependensi:** B-14 (Integritas Gerbang STT & Proteksi Privasi)
- **Memblokir:** B-16 (Rekap Penerbit & Siklus Dumi)
- **Versi Dokumen:** 1.1 (5 November 2026)

---

## 1. Latar Belakang & Masalah (Audit Workflow Temuan A1, A2, A4)

Berdasarkan kesepakatan operasional sidang pentashihan LPMQ:
1. **Temuan A1 (Penugasan Campuran Kelompok & Individu Belum Nyata):**
   - Implementasi `createAssignment` pada `distribution.service.js` saat ini hanya menerima satu `team_id` dan mewajibkan semua pentashih merupakan anggota dari tim tersebut.
   - Pengecekan cakupan lengkap 30 juz langsung dieksekusi pada penetapan pertama ketika status naskah masih di luar `TASHIH_IN_PROGRESS`.
   - Akibatnya, skenario riil di mana Koordinator Distributor membagi naskah: Kelompok A menggarap Juz 1–15, lalu Pentashih Individu B menggarap Juz 16–30 akan gagal pada panggilan pertama karena sistem menolak pembagian parsial yang belum mencapai 30 juz.
2. **Temuan A2 (Aturan "Satu Rekap Menggugurkan yang Lain" Belum Terpenuhi):**
   - Saat ini `approveDistribution` melakukan verifikasi rekap menggunakan `some()` terhadap seluruh penugasan naskah. Hal ini keliru: satu rekap dari pentashih individu manapun secara tidak sengaja meloloskan seluruh pentashih lain yang belum mengunggah rekap.
   - Di sisi lain, kode mewajibkan *seluruh penugasan* berstatus `COMPLETED`. Jika seorang anggota kelompok mengunggah rekap untuk seluruh timnya, anggota kelompok lainnya yang tidak menekan tombol selesai tetap memblokir distributor untuk melangkah maju.
   - Dibutuhkan pemisahan konsep **Unit Penugasan**: Kelompok dihitung sebagai satu unit kolektif, sedangkan individu dihitung sebagai unit mandiri.
3. **Temuan A4 (Beban Form Checklist Per Juz yang Berlebih & Menimbulkan Celah):**
   - Antarmuka `JuzChecklistForm` dan fungsi `recordJuzChecklist` memaksa pentashih mencatat checklist butir per juz secara mendetail.
   - Selain tidak sesuai dengan praktik lapangan (di mana pentashih cukup mencatat rekap komprehensif pada dokumen fisik/digital lalu mengunggah rekapitulasi akhir), jalur ini juga membuka celah di mana status penugasan dianggap selesai tanpa mengunggah berkas rekap.

---

## 2. Rincian Solusi & Perubahan Teknis

### 2.1. Penugasan Fleksibel Campuran secara Atomik (Solusi A1)
1. **Refaktor Payload Endpoint Penugasan (`POST /api/v1/registrations/:id/assignments/batch`):**
   - Perbarui skema validator `assignmentBatchSchema` agar menerima daftar alokasi yang dapat menggabungkan kelompok dan individu dalam satu transaksi database atomik:
     ```json
     {
       "assignments": [
         { "team_id": "uuid-kelompok-a", "assignee_id": "usr-pentashih-1", "juz_start": 1, "juz_end": 15 },
         { "team_id": "uuid-kelompok-a", "assignee_id": "usr-pentashih-2", "juz_start": 1, "juz_end": 15 },
         { "team_id": null, "assignee_id": "usr-pentashih-3", "juz_start": 16, "juz_end": 30 }
       ]
     }
     ```
2. **Validasi Cakupan 30 Juz Tingkat Batch:**
   - Validasi agregasi 30 juz (untuk naskah Al-Qur'an 30 Juz lengkap) dievaluasi terhadap himpunan seluruh penugasan dalam batch transaksi tersebut, sehingga kombinasi antar-kelompok dan individu tervalidasi tuntas tanpa terbentur parsialitas.

### 2.2. Opsi Cakupan Rekap `recap_scope` (TEAM vs SELF) (Solusi A2)
1. **Migrasi Skema Basis Data (`backend/prisma/schema.prisma`):**
   - Tambahkan kolom `recap_scope` pada tabel `tashih_reviews`:
     ```prisma
     recap_scope  String  @default("SELF") @db.VarChar(20) // "TEAM" | "SELF"
     ```
2. **Logika Bisnis Pelaporan Pentashih (`submitReview`):**
   - Pentashih yang tergabung dalam suatu `team_id` diberikan opsi pilihan saat mengunggah rekap:
     - `TEAM` (*Rekapan Keseluruhan Kelompok / Untuk Yang Lain*):
       - Rekap telaah ini dinyatakan sah mewakili seluruh anggota kelompok pada iterasi sidang berjalan.
       - Sistem secara otomatis menandai kewajiban rekap bagi anggota kelompok lain dalam tim tersebut sebagai terpenuhi (*fulfilled by team*).
     - `SELF` (*Hanya Rekapan Saya*):
       - Rekap hanya mencakup porsi telaah pribadi. Anggota kelompok lain tetap berkewajiban mengunggah rekap masing-masing.
   - Untuk pentashih yang ditugaskan secara individu (`team_id === null`), nilai `recap_scope` terkunci mutlak ke `SELF`.
3. **Logika Verifikasi Kelulusan di Distributor (`approveDistribution`):**
   - Sistem mengelompokkan penugasan ke dalam **Unit Penugasan**:
     - Tiap kelompok (`team_id`) dianggap sah jika minimal ada 1 rekap berlingkup `TEAM`, ATAU seluruh anggota kelompok tersebut telah mengunggah rekap berlingkup `SELF`.
     - Tiap individu mandiri wajib memiliki rekap berlingkup `SELF`.
   - **Agregasi Putusan Sidang:** Jika terdapat minimal 1 putusan `REVISION_REQUIRED` di antara seluruh unit penugasan, maka keputusan agregat naskah pada ronde tersebut wajib menjadi `REVISION_REQUIRED`.

### 2.3. Eliminasi Checklist Per Juz & Simplifikasi UI (Solusi A4)
1. **Pembersihan Antarmuka Pentashih (`PentashihWorkspacePage.jsx` & `ReviewForm.jsx`):**
   - Hapus komponen `JuzChecklistForm.jsx` dan dialog pengisian rincian butir per juz.
   - Tampilan kerja pentashih difokuskan pada:
     1. Informasi naskah dan rentang juz yang ditugaskan (misal Juz 1 s.d. 15).
     2. Tombol Aksi *"Input Hasil Telaah Sidang"*.
     3. Pemilihan Putusan: Radio Button `Lolos (PASSED)` atau `Perlu Perbaikan (REVISION_REQUIRED)`.
     4. Pemilihan Cakupan Rekap (khusus anggota tim):
        - `( ) Rekapan Keseluruhan (Mewakili seluruh anggota kelompok)`
        - `( ) Hanya Rekapan Saya`
     5. Unggah Berkas Rekapitulasi Internal (PDF/DOCX) - *Wajib*.
     6. Ringkasan Catatan Sidang (Teks bebas ringkas) - *Wajib*.
2. **Backend Cleanup:**
   - Depresiasi endpoint `POST /assignments/:id/juz-checklist`.
   - Relasi `assignment_juz` difungsikan murni sebagai pencatat rentang juz penugasan untuk audit dan kalkulasi beban kerja.

---

## 3. Rencana Pengujian (Test Suite)

1. **Unit Test Backend (`backend/tests/unit/distribution-b15.test.js`):**
   - `test('B15-01: Penugasan batch campuran (Tim A juz 1-15 + Individu B juz 16-30) sukses dan memvalidasi 30 juz penuh')`
   - `test('B15-02: Anggota tim mengunggah rekap dengan scope TEAM menggugurkan kewajiban unggah anggota lain di tim yang sama')`
   - `test('B15-03: Anggota tim mengunggah rekap dengan scope SELF mewajibkan anggota lain tetap mengunggah rekap')`
   - `test('B15-04: Pentashih individu mandiri tidak dapat memilih scope TEAM (otomatis SELF)')`
   - `test('B15-05: Jika satu pentashih memutuskan REVISION_REQUIRED, distributor dipaksa menetapkan revisi naskah')`
   - `test('B15-06: Endpoint reviu pentashih menolak pengiriman tanpa berkas rekap')`

2. **Frontend Component Test (`PentashihWorkspacePage.test.jsx` & `ReviewForm.test.jsx`):**
   - Memverifikasi hilangnya checklist form per juz.
   - Memverifikasi munculnya radio selection cakupan rekap bagi anggota tim.

---

## 4. Kriteria Keberhasilan (*Definition of Done*)

- [x] Distributor dapat menetapkan kombinasi kelompok dan individu dalam satu aksi penugasan yang mencakup 30 juz.
- [x] Opsi pilihan `recap_scope` (`TEAM` vs `SELF`) tersimpan di basis data dan berfungsi sesuai aturan pengguguran tugas kelompok.
- [x] Individu mandiri wajib mengunggah rekapnya sendiri tanpa terpengaruh rekap pentashih lain.
- [x] Formulir checklist butir per juz telah dihapus bersih dari antarmuka pentashih; pelaporan kini murni berbasis dokumen rekapitulasi + putusan akhir.
- [x] Seluruh pengujian unit backend dan frontend lulus 100%.

