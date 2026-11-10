# B-14: Integritas Gerbang STT, Penutupan Bypass Transisi, dan Proteksi Privasi Pentashih

- **ID Paket:** B-14
- **Branch:** `feat/b14-integritas-gerbang-stt-dan-kebocoran-tashih`
- **Basis:** `feat/db-migration-update` (atau `main`)
- **PIC:** Fakhri
- **Status:** **Selesai menurut bukti kode**
- **Dependensi:** B-06 (Rekap Pentashih Internal), B-07 (Siklus Pengembalian Revisi & Dumi)
- **Memblokir:** B-15, B-16, B-09 s.d. B-11
- **Versi Dokumen:** 1.0 (5 November 2026)

---

## 1. Latar Belakang & Masalah (Audit Workflow Temuan B1, B2, B3)

Dari hasil audit ketat terhadap alur kerja state machine dan implementasi kode pada repositori per November 2026, ditemukan tiga celah krusial (*critical security & workflow vulnerabilities*) yang membahayakan integritas sistem pentashihan:

1. **Temuan B1 (Dua Jalur Menuju `READY_FOR_STT` dengan Kontrak Berbeda):**
   - Terdapat dua fungsi berbeda di backend yang dapat memindahkan naskah ke status `READY_FOR_STT`: `approveDistribution` dan `requestSttFromAdmin`.
   - `approveDistribution` memeriksa kelengkapan rekap, sedangkan `requestSttFromAdmin` tidak memeriksa keberadaan rekap internal dan tidak mematuhi alur `revision_kind`.
   - Akibatnya, ada jalan pintas (*bypass*) di mana naskah bisa meluncur ke `READY_FOR_STT` tanpa rekap sidang yang sah, yang kemudian mematikan form pentashih karena `submitReview` dan `recordJuzChecklist` menolak eksekusi bila status naskah bukan lagi `TASHIH_IN_PROGRESS`.
   - Kedua jalur juga mendistribusikan notifikasi ke pihak yang berbeda secara tidak konsisten (Kepala & Dokumentator vs Admin Internal).

2. **Temuan B2 (Potensi Pemotongan Siklus Revisi oleh Penerbit via Generic Transition):**
   - Pada `TRANSITION_POLICY`, relasi transisi dari `REVISION_REQUIRED` menuju `TASHIH_IN_PROGRESS` tidak ditandai dengan flag `domainAction: true`.
   - Rute generic `PATCH /api/v1/registrations/:id/status` dan `POST /api/v1/registrations/:id/transition` terbuka untuk role `PENERBIT`. Guard generic hanya memblokir transisi keluar dari `TASHIH_IN_PROGRESS`.
   - Akibatnya, penerbit dapat menembakkan HTTP request langsung untuk mengubah status naskah kembali ke `TASHIH_IN_PROGRESS` tanpa melalui pengiriman fisik, tanpa penerimaan loket fisik TMII oleh Admin Internal, dan tanpa penugasan kembali oleh distributor.
   - Transisi `REVISION_REQUIRED -> READY_FOR_VERIFICATION` untuk penerbit juga rancu karena belum memisahkan secara tegas antara revisi verifikasi awal dengan revisi sidang tashih.

3. **Temuan B3 (Kebocoran Data Identitas & Catatan Pentashih ke Penerbit pada List Endpoint):**
   - Pada endpoint detail (`getDetail`), data relasi `assignments` sudah disaring ketat demi privasi pentashih.
   - Namun, pada endpoint daftar pengajuan (`listRegistrations`), pemfilteran relasi `assignments` terlewat. Query mengembalikan data lengkap penugasan termasuk nama, email, NIP pentashih, catatan internal (`notes`), dan hasil review ke akun Penerbit.
   - Hal ini melanggar prinsip kerahasiaan sidang tashih LPMQ, di mana penerbit dilarang mengetahui komposisi anggota tim pentashih yang memeriksa mushafnya guna mencegah intervensi eksternal.

---

## 2. Rincian Solusi & Perubahan Teknis

### 2.1. Penyatuan Gerbang Menuju `READY_FOR_STT` (Menutup Temuan B1)
1. **Fungsi Pemeriksaan Kelayakan STT Tunggal (*Single Source of Truth*):**
   - Buat fungsi validator bersama `assertReadyForSttEligibility(tx, registrationId)` di `distribution.service.js`.
   - Memvalidasi bahwa:
     1. Penugasan pada iterasi berjalan tersedia.
     2. Seluruh penugasan aktif pada iterasi tersebut telah selesai (`COMPLETED`) dan memiliki review.
     3. Seluruh putusan pentashih adalah lulus (`PASSED`).
     4. Minimal satu dokumen rekap internal resmi telah terunggah (`hasRecap`).
2. **Harmonisasi `requestSttFromAdmin`:**
   - Menghubungkan fungsi `requestSttFromAdmin` ke `await assertReadyForSttEligibility(tx, id)` sehingga wajib memverifikasi dokumen rekap internal sebelum status dialihkan ke `READY_FOR_STT`.
3. **Harmonisasi Notifikasi Sistem:**
   - Menyeragamkan pengiriman notifikasi ke pihak-pihak berkepentingan.

### 2.2. Penutupan Celah Bypass Transisi Penerbit (Menutup Temuan B2)
1. **Penegakan `domainAction: true` di `TRANSITION_POLICY` (`backend/src/services/registration.service.js`):**
   - Tandai transisi `REVISION_REQUIRED -> TASHIH_IN_PROGRESS` sebagai `domainAction: true` dengan `allowedRoles: ['DISTRIBUTOR', 'SUPERADMIN']`.
   - Tandai transisi `TASHIH_IN_PROGRESS -> READY_FOR_STT` dan `TASHIH_IN_PROGRESS -> REVISION_REQUIRED` sebagai `domainAction: true` dengan `allowedRoles: ['DISTRIBUTOR', 'SUPERADMIN']`.
   - Upaya perubahan generic oleh role penerbit langsung ditolak dengan `409 Conflict`.

### 2.3. Sanitasi Response `listRegistrations` untuk Penerbit (Menutup Temuan B3)
1. **Penyaringan Relasi pada `backend/src/services/registration.service.js`:**
   - Pada `listRegistrations`, jika `publisherScope === true`, data penugasan disanitasi hanya mengembalikan `{ id, stage, iteration, status, due_at }`.
   - Objek `assignee` (nama, email pentashih) dan `reviews` (catatan/notes internal) dibersihkan dari response.
   - Untuk peran internal (`DISTRIBUTOR`, `PENTASHIH`, `ADMIN_INTERNAL`, `SUPERADMIN`), data dikembalikan 100% lengkap.
2. **Robustness Frontend:**
   - `PublisherProgress.jsx` diperkuat dengan mengevaluasi `registration.revision_source === 'TASHIH_REVISION'` selain `assignments.length > 0`.

---

## 3. Bukti Pengujian

1. **Backend Integration / Unit Security Test (`backend/tests/unit/workflow-security-b14.test.js`):**
   - Seluruh 7 pengujian unit lulus 100%:
     - `B14-01: TRANSITION_POLICY blocks PENERBIT from transitioning REVISION_REQUIRED to TASHIH_IN_PROGRESS` (Pass)
     - `B14-02: TRANSITION_POLICY marks TASHIH_IN_PROGRESS exits as domainAction for DISTRIBUTOR` (Pass)
     - `B14-03: assertReadyForSttEligibility rejects when assignments are incomplete or missing reviews` (Pass)
     - `B14-04: assertReadyForSttEligibility rejects when any review is not PASSED` (Pass)
     - `B14-05: assertReadyForSttEligibility rejects when no recap file is uploaded` (Pass)
     - `B14-06: assertReadyForSttEligibility passes when all assignments completed with PASSED and recap file exists` (Pass)
     - `B14-07: listRegistrations sanitizes assignments for PENERBIT (no pentashih name, email, or notes)` (Pass)

2. **Frontend Vitest Suite:**
   - 65 test files passed, 323 tests passed, 3 skipped (100% Pass).

---

## 4. Kriteria Keberhasilan (*Definition of Done*)

- [x] Tidak ada lagi 2 jalur berbeda menuju `READY_FOR_STT`; seluruhnya melewati satu gerbang validasi kelayakan rekap.
- [x] Endpoint generic status memblokir upaya manipulasi status operasional oleh peran penerbit (`domainAction: true`).
- [x] Response JSON `GET /api/v1/registrations` milik penerbit bersih 100% dari identitas pentashih dan catatan review internal.
- [x] Matriks `TRANSITION_POLICY` di `registration.service.js` telah diperbarui dan sinkron.
- [x] Seluruh pengujian unit backend dan frontend lulus 100%.
