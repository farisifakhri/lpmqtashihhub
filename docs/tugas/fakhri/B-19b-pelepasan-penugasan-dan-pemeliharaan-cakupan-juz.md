# B-19b: Pelepasan Penugasan Pentashih & Pemeliharaan Cakupan Juz

- **ID Paket:** B-19b
- **Branch:** `feat/b19b-pelepasan-penugasan-pentashih`
- **Basis:** `feat/b19a-integritas-rekap-penerbit-dan-telaah-pembanding`
- **PIC:** Fakhri
- **Status:** **Selesai (Siap Reviu & Merge)**
- **Dependensi:** B-19a (Integritas Rekap Penerbit & Telaah Pembanding)
- **Versi Dokumen:** 1.0 (9 November 2026)

---

## 1. Latar Belakang & Kebutuhan Bisnis

Dalam operasional pentashihan Al-Qur'an di LPMQ, pentashih yang telah ditetapkan dapat mengalami kendala non-teknis seperti cuti dinas, sakit berkepanjangan, atau penugasan mendesak lainnya (*force majeure*) di tengah proses telaah naskah.

Sebelumnya, sistem tidak menyediakan mekanisme formal untuk melepas (*revoke*) penugasan seorang pentashih tanpa menghapus data riwayat. Jika pentashih berhalangan, sidang akan terhenti tanpa batas waktu karena sistem mewajibkan seluruh penugasan berstatus `COMPLETED`.

Namun, pelepasan penugasan membawa risiko krusial yang diidentifikasi pada audit sistem:
1. **Risiko Hilangnya Cakupan Juz Tanpa Ketahuan:**
   Jika pentashih yang memegang rentang juz tertentu (misal Juz 1–15) dicabut, aturan sederhana seperti "minimal 1 penugasan aktif selesai" dapat meloloskan putusan sidang walau juz tersebut belum pernah ditelaah oleh siapa pun.
2. **Kerapuhan Deteksi Naskah Non-30 Juz:**
   Layanan pentashihan tidak hanya mencakup Mushaf 30 Juz lengkap, melainkan juga Surah Yasin, Juz 'Amma (Juz 30), atau naskah juz tertentu. Validasi cakupan tidak boleh di-hardcode kaku 30 juz, melainkan harus mendeteksi gabungan juz iterasi secara dinamis.
3. **Perlindungan Rekapitulasi Kelompok (Team Scope):**
   Pada kelompok kerja (*distribution team*) di mana seluruh anggota memegang rentang juz yang sama, pelepasan satu anggota tidak boleh membatalkan telaah jika anggota lain telah menyelesaikan atau mengesahkan rekap kelompok.

---

## 2. Rincian Desain & Perubahan Teknis

### 2.1. Skema Database & Enum Status
- **`AssignmentStatus` Enum:**
  Menambahkan nilai status `REVOKED` pada enum `AssignmentStatus`.
- **Kolom Audit pada Model `Assignment`:**
  - `revocation_reason`: `String? @db.Text` (alasan pelepasan dinas)
  - `revoked_at`: `DateTime?` (waktu pencabutan)
  - `revoked_by_id`: `String?` (ID pengguna yang mencabut penugasan)
  - Relasi `revoked_by`: `User? @relation("AssignmentRevoker", fields: [revoked_by_id], references: [id])`

### 2.2. Endpoint & Service Pencabutan Penugasan
- **Endpoint:** `POST /assignments/:id/revoke`
- **Otorisasi Role:** `ADMIN_INTERNAL`, `SUPERADMIN`, `DISTRIBUTOR`
- **Validasi Input:**
  - `reason`: string minimal 5 karakter wajib diisi.
- **Kondisi Validasi Bisnis (*Guards*):**
  - Penugasan harus ditemukan dan naskah berada dalam status aktif (`TASHIH_IN_PROGRESS` atau `WAITING_DISTRIBUTION`).
  - Penugasan yang telah `COMPLETED` tidak dapat dicabut (`409: Penugasan pentashih sudah selesai dan tidak dapat dicabut.`).
  - Penugasan yang sudah `REVOKED` tidak dapat dicabut ulang (`409: Penugasan pentashih sudah dicabut sebelumnya.`).
  - Hanya penugasan dengan status `ASSIGNED`, `IN_PROGRESS`, atau `OVERDUE` yang dapat dicabut.
- **Efek Pencabutan:**
  - Mengubah status penugasan menjadi `REVOKED`.
  - Mengisi `revocation_reason`, `revoked_at`, `revoked_by_id`.
  - Mencatat ke `auditLog` dengan aksi `REVOKE_ASSIGNMENT`.
  - Mengirim notifikasi sistem kepada pentashih bersangkutan.

### 2.3. Pencegahan Mutasi oleh Pentashih yang Dicabut
- Di `recordReview`: jika `assignment.status === 'REVOKED'`, lempar error `409: Penugasan pentashih ini telah dicabut sehingga tidak dapat lagi menerima atau mengubah hasil sidang.`.
- Di `recordJuzChecklist`: jika `assignment.status === 'REVOKED'`, lempar error `409: Penugasan pentashih ini telah dicabut sehingga tidak dapat lagi memperbarui checklist.`.

### 2.4. Penegakan Gerbang Cakupan Juz (*Juz Coverage Gate*)
Di `assertDistributionReviewCompleteness` ([distribution.service.js](file:///c:/laragon/www/lpmq/backend/src/services/distribution.service.js)):
1. Ambil seluruh penugasan pada iterasi berjalan termasuk yang `REVOKED` beserta `juz_items`.
2. Hitung gabungan kebutuhan juz naskah iterasi tersebut:
   `allJuzInIteration = new Set(assignments.flatMap(a => (a.juz_items || []).map(j => j.juz_number)))`
3. Ambil penugasan aktif (non-`REVOKED`):
   - Jika tidak ada penugasan aktif sama sekali (`activeAssignments.length === 0`), lempar error `409: Seluruh penugasan pada iterasi ini telah dicabut. Tugaskan pentashih pengganti sebelum mengambil keputusan.`.
4. Hitung juz yang telah ditelaah secara sah oleh penugasan aktif yang selesai (`status === 'COMPLETED'` dan memiliki rekapitulasi sah):
   `coveredJuz = Set(...)`
5. Jika ada juz pada `allJuzInIteration` yang belum ada di `coveredJuz`:
   Lempar error `409: Keputusan sidang belum dapat disimpan karena ada juz (${missingJuz.map(j => 'Juz ' + j).join(', ')}) dari penugasan yang dicabut dan belum diselesaikan oleh pentashih pengganti. Tugaskan pentashih pengganti untuk menuntaskan telaah juz tersebut.`.

### 2.5. Dialog & UI Pelepasan Penugasan
- Buat komponen `RevokePentashihAssignmentDialog.jsx`:
  - Menampilkan informasi naskah, nama pentashih, dan juz yang diampu.
  - Peringatan konsekuensi penugasan pengganti.
  - Textarea alasan pencabutan (minimal 5 karakter).
- Integrasi ke `ReviewProgressPanel.jsx`:
  - Tombol aksi "Lepas Tugas" pada pentashih yang belum selesai telaah bagi peran Admin/Distributor.
  - Indikator visual badge "Dicabut" beserta alasan pencabutan.
- Penyesuaian `distribution-view-model.js`:
  - `getReviewProgress` hanya menghitung penugasan non-`REVOKED` dalam penghitungan anggota selesai/total.

---

## 3. Matriks Pengujian Unit & Keamanan

File tes: `backend/tests/unit/workflow-security-b19b.test.js`
- **B19B-01:** Pencabutan penugasan aktif mencatat status `REVOKED`, alasan pencabutan, waktu, dan ID pencabut.
- **B19B-02:** Pencabutan penugasan berstatus `COMPLETED` atau `REVOKED` ditolak dengan kode 409.
- **B19B-03:** Pentashih yang telah dicabut (`REVOKED`) diblokir saat mencoba `recordReview` (409).
- **B19B-04:** `approveDistribution` memblokir putusan jika seluruh penugasan dicabut tanpa pentashih aktif.
- **B19B-05:** `approveDistribution` memblokir putusan jika ada juz dari penugasan yang dicabut belum diselesaikan pengganti.
- **B19B-06:** `approveDistribution` berhasil jika pentashih pengganti telah ditugaskan dan menyelesaikan telaah juz yang dicabut.
- **B19B-07:** Penugasan tim dengan rekap kelompok sah tetap dapat disahkan meski ada anggota yang dicabut.
- **B19B-08:** Validasi cakupan juz dinamis bekerja tepat untuk naskah non-30 juz (misal 5 juz).

---

## 4. Kriteria Keberhasilan (*Definition of Done*)

- [x] Status enum `REVOKED` dan kolom audit `revocation_reason`, `revoked_at`, `revoked_by_id` terpasang di database schema & migrasi.
- [x] Endpoint `POST /assignments/:id/revoke` aktif dengan proteksi role `ADMIN_INTERNAL`, `SUPERADMIN`, `DISTRIBUTOR`.
- [x] Validasi penolakan mutasi `recordReview` dan `recordJuzChecklist` untuk penugasan `REVOKED` bekerja aktif.
- [x] Validasi integritas cakupan juz naskah dinamis di `assertDistributionReviewCompleteness` memblokir putusan jika ada juz yang ditinggalkan pentashih yang dicabut.
- [x] Dialog pelepasan pentashih di frontend terhubung ke API dengan penanganan kesalahan ramah pengguna.
- [x] `check:colors` 100% lulus tanpa pelanggaran token warna.
- [x] Seluruh pengujian backend dan frontend lulus 100%.
