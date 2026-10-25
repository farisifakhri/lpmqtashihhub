# U-05: Perbaikan "PDF Dokumen Belum Dapat Dibuka" pada Arsip Dokumen Resmi

- **ID Temuan UAT:** U-05 (Prioritas **P0** - Kebenaran Data & Akses Dokumen Resmi)
- **Branch:** `fix/u-05-pdf-dokumen-arsip`
- **Basis:** `main` (commit `d9302c2`)
- **PIC:** Fakhri
- **Lingkup:** Backend (Routes, RBAC, PDF Service Fallback) & Frontend (`DocumentArchive.jsx`)
- **Dependensi:** Tidak ada
- **Memblokir:** Verifikasi arsip oleh stakeholder internal, Dokumentator (B-10, B-11)
- **Versi Dokumen:** 1.0 (21 Oktober 2026)

---

## 1. Latar Belakang & Investigasi Masalah (Hasil Temuan UAT)

Pada pengujian UAT tanggal 20 Oktober 2026 (Gambar 14), pengguna/penguji melaporkan error:
> *"PDF dokumen belum dapat dibuka."* saat menekan tombol **"Lihat Dokumen PDF"** di Arsip Dokumen Resmi.

### Akar Masalah Teknis (*Root Causes*):
1. **Defisit RBAC Otorisasi Endpoint PDF Resmi:**
   Pada [`backend/src/routes/workflow.routes.js`](file:///c:/laragon/www/lpmq/backend/src/routes/workflow.routes.js#L54), endpoint `GET /official-documents/:id/pdf` dikunci hanya untuk:
   ```js
   authorize('PENERBIT', 'ADMIN_INTERNAL', 'DISTRIBUTOR', 'DOKUMENTATOR', 'KEPALA_LPMQ')
   ```
   Peran **`SUPERADMIN`** dan **`VERIFIKATOR`** tertinggal (tidak ada di daftar otorisasi), sehingga langsung diblokir `403 Forbidden` saat mencoba membuka PDF resmi di halaman arsip.
2. **Pemblokiran 409 pada Dokumen Resmi Sebelum Berstatus 'ISSUED':**
   Pada [`backend/src/services/official-document.service.js`](file:///c:/laragon/www/lpmq/backend/src/services/official-document.service.js#L210), fungsi `documentPdf()` melempar:
   ```js
   if (document.status !== 'ISSUED' ...) fail(409, 'Dokumen belum diterbitkan...');
   ```
   Jika dokumen berada dalam status antara (`SUBMITTED`, `PARAF_1`, `PARAF_2`, `SIGNED`), staf internal yang memeriksa arsip dihalangi membuka PDF pratinjau.
3. **Pembatasan Hak Akses pada Dokumen Verifikasi:**
   Pada [`backend/src/services/verification-review.service.js`](file:///c:/laragon/www/lpmq/backend/src/services/verification-review.service.js#L1240), fungsi `getVerificationDocument()` menolak peran `DOKUMENTATOR` dan staf non-verifikator dengan `403`, padahal Dokumentator perlu melihat riwayat dokumen verifikasi untuk audit 5 eksemplar dan kearsipan.
4. **Kehilangan Berkas Fisik (ENOENT / Checksum Mismatch) Tanpa Fallback:**
   Pada lingkungan pengujian atau migrasi data uji, jika record file tersimpan di database namun berkas PDF fisik di direktori storage tidak tersedia, sistem langsung melempar kegagalan 409 tanpa upaya merender ulang (*on-the-fly dynamic rendering fallback*).
5. **Error Swallowing di Frontend:**
   Pada [`frontend/src/components/common/DocumentArchive.jsx`](file:///c:/laragon/www/lpmq/frontend/src/components/common/DocumentArchive.jsx#L52), komponen menelan pesan asli dari server dan selalu menggantinya secara *hardcoded* dengan string *"PDF dokumen belum dapat dibuka."*, menyembunyikan akar masalah sebenarnya dari pengguna.

---

## 2. Rencana Solusi & Implementasi

### 2.1. Backend: Penyelarasan Otorisasi & Akses Dokumen
1. **Lengkapi Role di Endpoint PDF Resmi (`workflow.routes.js`):**
   Tambahkan `SUPERADMIN` dan `VERIFIKATOR` ke `router.get('/official-documents/:id/pdf')`.
2. **Izinkan Pratinjau Draf untuk Staf Internal (`official-document.service.js`):**
   Jika dokumen belum berstatus `ISSUED` namun diakses oleh pengguna internal berwenang, sistem merender pratinjau draf (`renderDraft(document)`) dengan penanda *"DRAF / BELUM DITERBITKAN"*, sehingga staf dapat meninjau dokumen kapan saja.
3. **Perluas Otorisasi Dokumen Verifikasi (`verification-review.service.js`):**
   Izinkan staf internal (`ADMIN_INTERNAL`, `SUPERADMIN`, `DOKUMENTATOR`, `KEPALA_LPMQ`) membaca dokumen verifikasi arsip.
4. **Fallback Dinamis PDF:**
   Jika berkas PDF fisik di storage hilang (misal data uji coba) saat status dokumen valid, tangkap `ENOENT` dan lakukan render ulang secara dinamis (*graceful fallback*) dengan pencatatan *audit warning*.

### 2.2. Frontend: Penanganan Error Transparan & UI Feedback
1. **Perbaiki Parsing Error di `DocumentArchive.jsx`:**
   Ekstrak pesan error dari respons JSON backend jika status HTTP bukan 2xx (misalnya: *"Dokumen sedang menunggu paraf Kepala"* atau *"Akses terbatas"*), dan tampilkan pesan spesifik tersebut kepada pengguna.
2. **Kesesuaian Label & Tombol:**
   Beri indikasi jelas apakah dokumen yang akan dibuka adalah *Dokumen Resmi Sah* atau *Pratinjau Draf*.

---

## 3. Rencana Sesi Kerja (Urutan Pengerjaan)

1. **Branch:** `fix/u-05-pdf-dokumen-arsip`
2. **Langkah 1 (Backend):** Perbaikan otorisasi role, penanganan status dokumen pra-terbit, dan graceful fallback di service PDF.
3. **Langkah 2 (Frontend):** Peningkatan *error handling* dan penampil pesan informatif di `DocumentArchive.jsx`.
4. **Langkah 3 (Testing):** Pembuatan unit & integration test untuk verifikasi akses PDF oleh berbagai peran (`SUPERADMIN`, `VERIFIKATOR`, `DOKUMENTATOR`, `ADMIN_INTERNAL`, `PENERBIT`).

---

## 4. Kriteria Keberhasilan (*Definition of Done*)

- Seluruh peran internal (`SUPERADMIN`, `ADMIN_INTERNAL`, `VERIFIKATOR`, `DOKUMENTATOR`, `KEPALA_LPMQ`) dapat membuka dan melihat dokumen PDF (baik draf maupun resmi) di Arsip Dokumen tanpa error 403 atau 409.
- Tidak ada lagi pesan merah *"PDF dokumen belum dapat dibuka"* saat dokumen valid diakses.
- Seluruh unit & integration test dokumen arsip lulus 100%.

