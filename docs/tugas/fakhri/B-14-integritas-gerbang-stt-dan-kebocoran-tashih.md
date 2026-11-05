# B-14: Integritas Gerbang STT, Penutupan Bypass Transisi, dan Proteksi Privasi Pentashih

- **ID Paket:** B-14
- **Branch:** `feat/b14-integritas-gerbang-stt-dan-kebocoran-tashih`
- **Basis:** `feat/db-migration-update` (atau `main`)
- **PIC:** Fakhri
- **Status:** **Siap Dikerjakan**
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
   - Pada endpoint detail (`getRegistrationById`), data relasi `assignments` sudah disaring ketat demi privasi pentashih.
   - Namun, pada endpoint daftar pengajuan (`listRegistrations`), pemfilteran relasi `assignments` terlewat. Query mengembalikan data lengkap penugasan termasuk nama, email, NIP pentashih, catatan internal (`notes`), dan hasil review ke akun Penerbit.
   - Hal ini melanggar prinsip kerahasiaan sidang tashih LPMQ, di mana penerbit dilarang mengetahui komposisi anggota tim pentashih yang memeriksa mushafnya guna mencegah intervensi eksternal.

---

## 2. Rincian Solusi & Perubahan Teknis

### 2.1. Penyatuan Gerbang Menuju `READY_FOR_STT` (Menutup Temuan B1)
1. **Fungsi Pemeriksaan Kelayakan STT Tunggal (*Single Source of Truth*):**
   - Buat fungsi validator bersama `assertReadyForSttEligibility(registrationId, prismaClient)` di `distribution.service.js`.
   - Memvalidasi bahwa:
     1. Naskah berada pada tahap sidang Dumi (`stage === 'DUMMY'`).
     2. Seluruh penugasan aktif pada iterasi dumi telah selesai (`COMPLETED`).
     3. Minimal satu dokumen rekap internal resmi telah terunggah dan terverifikasi sah.
     4. Keputusan sidang distributor adalah bulat lulus (`PASSED`).
2. **Deprecate / Kunci `requestSttFromAdmin`:**
   - Hapus atau redirect endpoint `requestSttFromAdmin` agar memanggil fungsi validasi gerbang terpusat di atas.
   - Larang transisi status manual ke `READY_FOR_STT` di luar eksekusi `approveDistribution`.
3. **Harmonisasi Notifikasi Sistem:**
   - Saat naskah mencapai `READY_FOR_STT`, notifikasi in-app dan outbox dikirimkan secara serentak ke pihak yang berhak: Kepala LPMQ (untuk penandatanganan SK & STT) dan Tim Dokumentator (pemberitahuan persiapan arsip).

### 2.2. Penutupan Celah Bypass Transisi Penerbit (Menutup Temuan B2)
1. **Penegakan `domainAction: true` di `TRANSITION_POLICY` (`backend/src/constants/workflow.constants.js`):**
   - Tandai seluruh transisi dari dan ke `REVISION_REQUIRED` serta `TASHIH_IN_PROGRESS` sebagai `domainAction: true`.
   - Transisi `REVISION_REQUIRED -> TASHIH_IN_PROGRESS` HANYA boleh dipicu oleh aksi `assignPentashihBatch` atau `approveDistribution` dari Koordinator Distributor.
   - Endpoint generic `PATCH /:id/status` dan `POST /:id/transition` menolak keras permintaan role `PENERBIT` untuk status-status operasional internal dengan kode `403 Forbidden`.
2. **Pemisahan Status Transisi Revisi Verifikasi vs Revisi Tashih:**
   - Bedakan alur `REVISION_REQUIRED` tahap verifikasi berkas (kembali ke `READY_FOR_VERIFICATION` setelah penerbit melengkapi berkas digital) dari `REVISION_REQUIRED` tahap tashih fisik (wajib melalui loket fisik TMII dan pencatatan resi masuk sebelum bisa dialokasikan oleh distributor).

### 2.3. Sanitasi Response `listRegistrations` untuk Penerbit (Menutup Temuan B3)
1. **Penyaringan Relasi pada `backend/src/services/registration.service.js`:**
   - Pada fungsi `listRegistrations`:
     ```javascript
     if (userRole === 'PENERBIT') {
       // Mutlak jangan sertakan include assignments, reviews, atau data internal pentashih
       delete queryOptions.include.assignments;
       // Atau gunakan projection/select DTO khusus penerbit
     }
     ```
   - Pastikan DTO response daftar pengajuan untuk penerbit hanya mencakup: metadata pengajuan, judul naskah, varian, status umum, nomor resi ekspedisi, status SLA penerbit, dan tautan dokumen resmi publik yang telah diterbitkan (Surat Hasil Verifikasi, Surat Penyerahan, Surat Hasil Akhir, STT).
   - Identitas pentashih (nama, gelar, NIP, email), penomoran tim internal, dan catatan review internal pentashih dihapus bersih dari payload response JSON.

---

## 3. Rencana Pengujian (Test Suite)

1. **Backend Integration / Unit Security Test (`backend/tests/unit/workflow-security-b14.test.js`):**
   - `test('B14-SEC-01: Penerbit ditolak 403 saat mencoba bypass REVISION_REQUIRED ke TASHIH_IN_PROGRESS via generic status endpoint')`
   - `test('B14-SEC-02: Transisi ke READY_FOR_STT ditolak jika belum ada berkas rekap sah atau bukan dari tahap DUMMY')`
   - `test('B14-SEC-03: requestSttFromAdmin tidak dapat memotong validasi rekap distributor')`
   - `test('B14-SEC-04: listRegistrations untuk akun PENERBIT tidak mengekspos relasi assignments, NIP, nama pentashih, atau notes')`
   - `test('B14-SEC-05: listRegistrations untuk akun DISTRIBUTOR/ADMIN tetap menampilkan assignments secara lengkap')`

2. **Frontend Route & Action Test:**
   - Memastikan tombol aksi penerbit di dashboard hanya mengarahkan ke form pelaporan resmi (`PublisherRevisionPage`), bukan menembak endpoint transisi mentah.

---

## 4. Kriteria Keberhasilan (*Definition of Done*)

- [ ] Tidak ada lagi 2 jalur berbeda menuju `READY_FOR_STT`; seluruhnya melewati satu gerbang validasi rekap & tahap dumi.
- [ ] Endpoint `PATCH /api/v1/registrations/:id/status` dan `POST /api/v1/registrations/:id/transition` memblokir upaya manipulasi status oleh peran penerbit.
- [ ] Response JSON `GET /api/v1/registrations` milik penerbit bersih 100% dari data pentashih dan catatan sidang internal.
- [ ] Matriks `TRANSITION_POLICY` di `workflow.constants.js` telah diperbarui dan sinkron dengan perilaku kode aktual.
- [ ] Seluruh pengujian unit dan integrasi baru lulus 100%.
