# B-06: Rekap Telaah Pentashih Internal & Kerahasiaan Dokumen Sidang

- **ID Paket:** B-06
- **Branch:** `feat/b06-rekap-pentashih-internal`
- **Basis:** `feat/b05-distribusi-kelompok-juz`
- **PIC:** Fakhri
- **Status:** **Selesai menurut bukti kode**
- **Dependensi:** B-05 (Distribusi Kelompok & Penjatahan Juz)
- **Memblokir:** B-07 (Siklus Pengembalian Revisi & Dumi), B-08, B-09 s.d. B-11
- **Versi Dokumen:** 1.0 (26 Oktober 2026)

---

## 1. Latar Belakang & Persyaratan Bisnis

Sesuai SOP Pentashihan Mushaf Al-Qur'an Kementerian Agama RI dan hasil audit UAT:
1. **Pelaporan Keseluruhan Rentang Penugasan:** Pentashih melaporkan hasil akhir sidang untuk keseluruhan rentang juz yang ditugaskan kepadanya secara komprehensif, bukan melaporkan pecahan per juz yang parsial.
2. **Kewajiban Dokumen Rekap:** Setiap pentashih wajib mengunggah dokumen rekap telaah internal (PDF / DOCX) yang memuat catatan koreksi rasm usmani, harakat, dan tanda waqaf. Sebelumnya validator menjadikan berkas rekap opsional (`optional()`), kini ditegakkan secara wajib (`required`).
3. **Penyelesaian Utang Teknis Keamanan (`TODO(SEC)`):** Berkas rekap sebelumnya dicari lewat parsing teks bebas `[RECAP_FILE:id]` di kolom `notes`. Pola ini telah dimigrasikan ke kolom eksplisit `recap_file_id` pada tabel `tashih_reviews` lengkap dengan indeks database dan migrasi SQL.
4. **Prinsip Satu Rekap per Kelompok:** Untuk kelompok kerja pentashih, minimal satu berkas rekap dari kelompok sudah mencukupi setelah diverifikasi oleh Koordinator Distributor.
5. **Kerahasiaan Dokumen Internal:** Berkas rekap internal hanya boleh diakses dan diunduh oleh Pentashih terkait, Koordinator Distributor, dan Staf Internal (Super Admin / Admin Internal). Pihak eksternal (Penerbit) mutlak dilarang mengakses berkas ini demi menjaga integritas sidang internal LPMQ.

---

## 2. Implementasi Teknis

### 2.1. Backend (`distribution.service.js`, `workflow.validator.js`, `workflow.routes.js`, `private-file.service.js`)
1. **Validasi Wajib Rekap Pentashih:**
   - Skema `reviewSchema` pada `workflow.validator.js` mewajibkan `recap_file_id: z.string().uuid('ID berkas rekap wajib berupa UUID valid.')`.
   - Endpoint `POST /api/v1/assignments/:id/review` menolak permohonan tanpa berkas rekap dengan status `400 Bad Request`.
   - Memvalidasi keberadaan fisik berkas pada tabel `StoredFile` (`404` bila berkas tidak ditemukan).
2. **Skema Terpisah Reviu Distributor:**
   - Menyediakan `distributorReviewSchema` untuk endpoint `POST /api/v1/registrations/:id/distribution-review` yang menerima putusan sidang (`PASSED` / `REVISION_REQUIRED`) dan `revision_kind` tanpa membebani distributor kewajiban mengunggah rekap.
3. **Pemberian Tanda Selesai Kolektif pada Juz:**
   - Ketika pentashih menyimpan hasil sidang telaah, seluruh butir juz yang ditugaskan kepadanya pada tabel `assignment_juz` langsung diperbarui secara serentak dengan putusan sidang dan waktu selesai.
4. **Verifikasi Keberadaan Rekap pada Sidang Distributor:**
   - Fungsi `approveDistribution` memverifikasi bahwa pada iterasi sidang berjalan, minimal satu berkas rekap telaah internal telah berhasil diunggah (`hasRecap`). Jika belum ada rekap yang diunggah, permohonan ditolak dengan pesan `409 Conflict`.
5. **Otorisasi Privasi Berkas:**
   - Layanan `private-file.service.js` memeriksa hak akses unduhan berkas rekapan berdasarkan kolom `recap_file_id` di `tashih_reviews`. Akses dibatasi ketat hanya untuk:
     - Pemilik berkas (`file.owner_id === user.id`)
     - Pentashih penanggung jawab (`assignment.assignee_id === user.id`)
     - `DISTRIBUTOR`, `ADMIN_INTERNAL`, `SUPERADMIN`

### 2.2. Frontend (`ReviewForm.jsx`, `PentashihWorkspacePage.jsx`, `DistributorReviewDialog.jsx`)
1. **Lembar Telaah Pentashih (`ReviewForm.jsx` & `PentashihWorkspacePage.jsx`):**
   - Menampilkan label *"Berkas Rekapan Hasil Telaah Internal"* dengan badge penanda *"Wajib Diunggah"*.
   - Filter file picker dikunci ke format dokumen resmi: `.pdf, .doc, .docx` (maks 25 MB).
   - Tombol *"Kirim Hasil Telaah"* dinonaktifkan (`disabled`) jika berkas rekap belum terunggah atau catatan telaah kosong.
   - Pengecekan klien memunculkan peringatan langsung bila pengguna mencoba mengirim tanpa berkas rekap.
2. **Dialog Reviu Distributor (`DistributorReviewDialog.jsx`):**
   - Kartu penugasan anggota sidang menampilkan tombol unduh berkas rekap *"Unduh Berkas Rekapan Internal ({Nama Pentashih})"*.
   - Jika sidang telaah selesai namun belum ada anggota kelompok yang mengunggah rekap, kotak peringatan amber muncul:
     *"Dokumen Rekapan Belum Diunggah: Minimal 1 dokumen rekap kelompok/pentashih wajib diunggah sebelum keputusan distributor dapat disimpan."*
   - Tombol *"Simpan Keputusan Distributor"* dikunci hingga dokumen rekap tersedia.

---

## 3. Bukti Pengujian

1. **Unit Test Backend (`backend/tests/distribution-b06.test.js` & `distribution-workflow.test.js`):**
   - 4/4 pengujian di `distribution-b06.test.js` lulus 100%:
     - Enforce `recap_file_id` UUID pada `reviewSchema`.
     - Validasi `distributorReviewSchema` fleksibel untuk distributor.
     - Penolakan 404 jika `recap_file_id` tidak ada di database storage.
     - Pembaruan kolektif rentang juz dan pencatatan audit log `TashihReview`.
     - Penolakan 409 pada `approveDistribution` jika rekap kelompok belum ada.
   - 10/10 pengujian regresi di `distribution-workflow.test.js` lulus 100%.
2. **Unit Test Frontend (`PentashihWorkspacePage.test.jsx` & `DistributorHandoverInboxPage.test.jsx`):**
   - 4/4 pengujian vitest di `PentashihWorkspacePage.test.jsx` lulus 100%.
   - 5/5 pengujian vitest di `DistributorHandoverInboxPage.test.jsx` lulus 100%.
3. **Production Build:**
   - `npm run build` frontend selesai sukses tanpa error dalam 3.96s (1782 modul).
