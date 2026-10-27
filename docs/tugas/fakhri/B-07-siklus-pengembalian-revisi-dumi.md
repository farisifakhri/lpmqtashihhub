# B-07: Siklus Pengembalian Revisi, Naskah Dumi, dan Pelacakan Resi Ekspedisi

- **ID Paket:** B-07
- **Branch:** `feat/b07-siklus-pengembalian-revisi-dumi`
- **Basis:** `feat/b06-rekap-pentashih-internal`
- **PIC:** Fakhri
- **Status:** **Selesai menurut bukti kode**
- **Dependensi:** B-01 (Multiple Manuscript & Items), B-06 (Rekap Pentashih Internal)
- **Memblokir:** B-08 (Status Menunggu Penerbit & Indikator Umur), B-09 s.d. B-11 (Surat Hasil & STT Final)
- **Versi Dokumen:** 1.0 (26 Oktober 2026)

---

## 1. Latar Belakang & Persyaratan Bisnis

Sesuai SOP Pentashihan Mushaf Al-Qur'an Kementerian Agama RI dan ketentuan alur revisi sidang:
1. **Label Pengiriman Dua Varian:** Naskah fisik yang dikirimkan kembali ke LPMQ memiliki dua kategori yang berbeda tujuan pemeriksaannya:
   - **Varian Naskah Perbaikan (Koreksi Sidang):** Ditujukan untuk perbaikan kesalahan teks, lafazh, harakat, rasm usmani, atau tanda waqaf.
   - **Varian Naskah Dumi (Mock-up Cetak Akhir):** Ditujukan untuk pemeriksaan model mockup/dumi cetak akhir (tata letak, nomor halaman, iluminasi) sebelum dicetak massal.
   Setiap varian wajib memiliki label pengiriman PDF berformat standar A4 resmi dengan rincian barang, ronde pemeriksaan, panduan gunting, dan penanda warna yang kontras.
2. **Pencatatan Resi Keluar oleh Distributor:** Ketika sidang pentashihan memutuskan `REVISION_REQUIRED`, fisik naskah beserta risalah perbaikan dikirimkan kembali kepada penerbit. Distributor mencatat ekspedisi dan nomor resi pengiriman keluar (`outgoing_courier`, `outgoing_tracking_no`) agar penerbit dapat melacak naskah fisiknya.
3. **Unggah Penerbit & Konfirmasi Resi Masuk:** Setelah naskah selesai diperbaiki, penerbit mengunggah berkas digital perbaikan dan mencatatkan nomor resi pengiriman masuk (`dispatch_tracking_no`) ke loket TMII.
4. **Penerimaan Fisik Admin Internal & SLA Berjalan:** Paket fisik naskah perbaikan yang tiba di loket TMII diverifikasi oleh Admin Internal (`PhysicalMasterIntake` -> `RECEIVED`) dan diteruskan kepada Distributor (`ADMIN_TO_DISTRIBUTOR`). Begitu serah-terima diterima distributor, status pengajuan berpindah ke `WAITING_DISTRIBUTION` dan perhitungan SLA ronde perbaikan/dumi dimulai kembali secara otomatis.
5. **Pembandingan Rekap & Catatan Sidang Sebelumnya:** Anggota tim pentashih dan koordinator distributor memerlukan tampilan pembandingan langsung (*side-by-side*) antara catatan risalah sidang ronde sebelumnya dengan berkas perbaikan terkini.

---

## 2. Implementasi Teknis

### 2.1. Skema Database & Migrasi (`schema.prisma` & SQL Migration)
- Menambahkan kolom pelacakan pengiriman keluar pada tabel `registrations`:
  - `outgoing_courier String?` (Nama ekspedisi pengembalian dari LPMQ ke penerbit)
  - `outgoing_tracking_no String?` (Nomor resi kurir pengembalian)
  - `outgoing_dispatch_date DateTime?` (Waktu pencatatan pengiriman keluar)
  - `outgoing_notes String? @db.Text` (Catatan pengiriman dari petugas distributor)
- Diterapkan lewat migrasi resmi `20261026190000_registration_outgoing_dispatch`.

### 2.2. Backend (`registration-receipt-pdf.service.js`, `registration.service.js`, `distribution.service.js`, `workflow.routes.js`)
1. **Generator Label Pengiriman Dua Varian:**
   - Memperluas fungsi `renderShippingLabelPdf(reg, options = {})` untuk menghasilkan PDF label fisik sesuai varian:
     - Varian `dumi`: Judul *"Pengiriman Naskah Fisik Dumi (Pemeriksaan Cetak Akhir) - Ronde #X"*, warna aksen biru tua, deskripsi *"Naskah Dumi Cetak Akhir (Model / Mock-up Mushaf)"*.
     - Varian `perbaikan`: Judul *"Pengiriman Naskah Fisik Perbaikan (Koreksi Sidang) - Ronde #X"*, warna aksen amber/cokelat tua, deskripsi *"Naskah Fisik Perbaikan (Koreksi Lafazh, Rasm & Tanda Baca)"*.
     - Varian `perdana`: Format standar awal pendaftaran mushaf A4.
   - Layanan `generateShippingLabelPdf` otomatis mendeteksi varian aktif berdasarkan dokumen `REVISION_RETURN_LETTER` dan `revision_kind`, serta menghasilkan nama berkas dinamis yang mencantumkan ronde perbaikan (misal `Label-Pengiriman-Perbaikan-REG-2026-001-R2.pdf`).
2. **API Pencatatan Resi Keluar Distributor:**
   - Menyediakan validator `outgoingDispatchSchema` dan endpoint `POST /api/v1/registrations/:id/outgoing-dispatch`.
   - Mengizinkan pencatatan resi keluar baik secara langsung saat reviu sidang (`POST /distribution-review`) maupun kapan saja selama masa perbaikan naskah.
   - Mencatat log audit `DISTRIBUTOR_OUTGOING_DISPATCH` dan memicu notifikasi `OUTGOING_DISPATCH_RECORDED` ke akun penerbit.
3. **Data Komparasi pada Penugasan Pentashih:**
   - Memperluas pemanggilan `listMyAssignments` dengan relasi `official_documents` bertipe `REVISION_RETURN_LETTER` sehingga pentashih menerima ringkasan catatan sidang putusan terdahulu.

### 2.3. Frontend (`ShippingLabelDialog.jsx`, `PublisherPhysicalMasterTab.jsx`, `PublisherStatusAlerts.jsx`, `DistributorReviewDialog.jsx`, `ReviewForm.jsx`, `AdminMasterIntakePage.jsx`)
1. **Dialog Unduh Label Pengiriman Multi-Varian (`ShippingLabelDialog.jsx`):**
   - Menyediakan pemilih tab varian label: *Master Fisik Pendaftaran*, *Naskah Perbaikan (Koreksi)*, dan *Naskah Dumi Final*.
   - Otomatis memilih tab varian yang sesuai dengan tahap permohonan penerbit.
   - Menampilkan pratinjau kartu label yang langsung menyesuaikan teks barang, ronde perbaikan, dan panduan paket.
2. **Pelacakan Resi Keluar & Konfirmasi Resi Masuk (`PublisherPhysicalMasterTab.jsx`):**
   - Menampilkan kartu informasi kurir dan nomor resi pengembalian naskah fisik dari LPMQ ketika `data.outgoing_tracking_no` terisi.
   - Judul formulir pengiriman berkas dinamis berubah menjadi *"Konfirmasi Pengiriman Naskah Perbaikan / Dumi (Resi Masuk)"*.
   - Alert status revisi pada dashboard penerbit mencantumkan nomor resi kurir LPMQ beserta tautan langsung ke tab fisik.
3. **Pencatatan Resi & Komparasi Catatan Sidang (`DistributorReviewDialog.jsx`):**
   - Menambahkan input opsional kurir dan nomor resi keluar ketika distributor memilih opsi `REVISION_REQUIRED`.
   - Menampilkan panel pembanding *"Catatan & Hasil Sidang Ronde Sebelumnya"* berisi riwayat ronde, distributor penelaah, dan ringkasan risalah koreksi terdahulu.
4. **Catatan Ronde Sebelumnya pada Lembar Telaah Pentashih (`ReviewForm.jsx`):**
   - Pentashih dapat melihat kartu catatan sidang putusan terdahulu secara langsung di dalam modal telaah sebagai acuan komparasi perbaikan naskah.
5. **Diferensiasi Naskah Dumi di Meja Loket (`AdminMasterIntakePage.jsx`):**
   - Label antrean loket TMII membedakan status antara *Naskah Dumi* dan *Perbaikan Fisik*.

---

## 3. Bukti Pengujian

1. **Unit Test Backend (`backend/tests/distribution-b07.test.js`):**
   - Validasi skema resi keluar `outgoingDispatchSchema`: **Lolos**.
   - Validasi data resi pada `distributorReviewSchema`: **Lolos**.
   - Pembuatan PDF label pengiriman untuk varian Perbaikan, Dumi, dan Perdana: **Lolos (3/3 varian)**.
   - Fungsi `recordOutgoingDispatch` dengan pembaruan database dan notifikasi penerbit: **Lolos**.
2. **Regresi Backend (`backend/tests/distribution-b06.test.js` & `distribution-workflow.test.js`):**
   - 14/14 tests passing tanpa regresi.
3. **Unit Test Frontend (`vitest`):**
   - `ShippingLabelDialog.test.jsx`: **6/6 tests passing** (termasuk pengujian interaktif switch varian dan auto-select naskah dumi).
   - `PublisherRegistrationDetailPage.test.jsx`: **10/10 tests passing**.
   - `DistributorHandoverInboxPage.test.jsx`: **5/5 tests passing**.
   - `PentashihWorkspacePage.test.jsx`: **4/4 tests passing**.
   - `AdminMasterIntakePage.test.jsx`: **5/5 tests passing**.
4. **Build Produksi Frontend (`npm run build`):**
   - 1782 modul berhasil dikompilasi ke direktori `dist/` dalam waktu 6.14 detik tanpa galat.
