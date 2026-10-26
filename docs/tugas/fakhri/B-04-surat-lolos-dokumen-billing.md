# B-04: Penggabungan Dokumen Surat Lolos Verifikasi dan Berkas Billing SIMPONI

- **ID Paket:** B-04
- **Branch:** `feat/surat-lolos-dokumen-billing`
- **Basis:** `main`
- **PIC:** Fakhri
- **Lingkup:** Backend (PDF Renderer & Payment Service), Frontend (Publisher Billing Page), dan QA/Testing
- **Dependensi:** B-03 (Telah selesai & di-merge ke `main`)
- **Status:** **Selesai**
- **Versi Dokumen:** 1.0 (26 Oktober 2026)

---

## 1. Latar Belakang & Persyaratan

Persyaratan utama Paket B-04:
1. **Dokumen kode billing berisi surat lolos verifikasi:** Dokumen resmi yang diterima atau diunduh penerbit untuk pembayaran PNBP menggabungkan lembar Surat Hasil Verifikasi (Lolos) dengan berkas tagihan/slip SIMPONI (PDF) dalam satu bundel dokumen terpadu.
2. **Billing hanya untuk naskah yang lolos:** Kode billing dan tagihan PNBP hanya boleh diterbitkan untuk naskah yang dinyatakan lolos telaah/verifikasi (`decision === 'PASSED'`). Naskah yang memerlukan perbaikan (`decision === 'REVISION_REQUIRED'`) tidak boleh menerbitkan tagihan PNBP atau kode billing.

---

## 2. Solusi Arsitektur & Implementasi

### A. Penggabungan Halaman PDF (`backend/src/services/verification-document-pdf.service.js`)
Pada modul pembuatan dokumen resmi `renderVerificationPdf`:
- Ketika dokumen bertipe `SURAT_HASIL_VERIFIKASI` atau `SURAT_PEMBERITAHUAN_HASIL_VERIFIKASI` dan hasil keputusan adalah lolos (`content.decision === 'PASSED'`) dengan berkas lampiran billing SIMPONI (`content.billing_file_id`):
- Sistem secara otomatis memuat berkas billing dari penyimpanan privat server via `readStoredFile()`.
- Menggunakan `pdf-lib` (`pdf.copyPages`), seluruh halaman dari dokumen billing SIMPONI disalin dan dilampirkan langsung ke dalam bundel PDF surat resmi hasil verifikasi.
- Bundel PDF terpadu ini dihasilkan baik pada pratinjau draf internal maupun dokumen final ber-QR code yang diarsipkan saat pengesahan oleh Kepala LPMQ.

### B. Penyertaan Relasi Dokumen Verifikasi ke Antrean Billing (`backend/src/services/payment.service.js`)
- Pada endpoint `getPaymentDetail` dan `listPayments`, query database menyertakan relasi `verification_documents` yang sah (`SENT` untuk penerbit, atau `SENT`/`SIGNED` untuk staf internal).
- Hal ini memungkinkan antarmuka keuangan penerbit mengetahui secara presisi dokumen surat lolos yang menjadi dasar terbitnya tagihan PNBP tersebut.

### C. Tombol Unduh Surat Lolos & Billing di Halaman Billing (`frontend/src/features/billing/PublisherBillingPage.jsx`)
- Pada setiap kartu tagihan billing di portal penerbit, jika dokumen verifikasi tersedia (`verDoc`), sistem menampilkan tombol:
  `Unduh Surat Lolos & Billing (PDF)` dengan ikon dokumen resmi.
- Saat diklik, dokumen PDF gabungan diunduh langsung secara aman dengan otentikasi Bearer token via endpoint `/api/v1/verification-documents/:id/pdf`.

### D. Penegakan Validasi & Integritas Status
- `backend/src/validators/verification.validator.js`:
  - `data.decision === 'PASSED' && !data.billing_no`: Wajib mengisi kode billing sebelum pengajuan draf lolos.
  - `data.decision === 'REVISION_REQUIRED' && data.billing_no`: Menolak pengisian kode billing untuk naskah yang perlu perbaikan.
  - `data.decision === 'REVISION_REQUIRED' && data.billing_file_id`: Menolak unggahan lampiran billing untuk naskah yang perlu perbaikan.
- `backend/src/services/verification-review.service.js`:
  - Tagihan PNBP (`paymentRecord`) hanya dibuat/diperbarui saat `decision === 'PASSED'`.
  - Notifikasi dan transisi status `AWAITING_PAYMENT` hanya terjadi saat keputusan `PASSED`. Naskah dengan keputusan `REVISION_REQUIRED` berpindah ke `REVISION_REQUIRED` tanpa tagihan.

---

## 3. Hasil Pengujian & Verifikasi

1. **Unit Test PDF Merging (`backend/tests/verification-document-pdf.test.js`):**
   - Lolos pengujian: `B-04: Dokumen kode billing menggabungkan surat lolos verifikasi dan berkas billing SIMPONI` (memastikan halaman hasil >= 2 halaman menggabungkan surat + berkas billing).
2. **Unit Test Billing Flow (`backend/tests/verification-billing-flow.test.js`):**
   - Memastikan naskah lolos wajib memiliki billing dan naskah perbaikan tidak dapat menerima billing.
3. **Unit Test Frontend Billing Page (`frontend/src/features/billing/PublisherBillingPage.test.jsx`):**
   - Lolos pengujian: `B-04: merender tombol unduh Surat Lolos & Billing (PDF) jika dokumen verifikasi tersedia`.
4. **Build Frontend:**
   - `npm --prefix frontend run build` berhasil 100% tanpa galat.

