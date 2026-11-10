# B-17: Integritas Siklus Revisi, Pembanding Distributor, dan Penutupan Kebocoran Dokumen

- **ID Paket:** B-17
- **Branch:** `feat/b17-integritas-siklus-revisi-dan-penutupan-kebocoran`
- **Basis:** `main` (`d87a649`)
- **PIC:** Fakhri
- **Status:** **Dalam Pengerjaan (Tahap 1: Backend)**
- **Dependensi:** B-14 (Gerbang STT), B-15 (Rekap Kelompok), B-16 (Rekap Penerbit & Siklus Dumi)
- **Memblokir:** B-09 s.d. B-11
- **Versi Dokumen:** 1.0 (8 November 2026)

---

## 1. Latar Belakang & Masalah (Hasil Audit Implementasi Post-B16)

Setelah penggabungan paket B-14, B-15, dan B-16, audit komprehensif terhadap alur kerja state machine dan integritas data menemukan beberapa celah dan kebuntuan (*deadlock*) yang harus dituntaskan:

1. **Kebuntuan Rekapitulasi Penerbit (Form Hilang Sisi Penerbit):**
   - Rekap penerbit hanya bisa diunggah melalui `dispatchPhysical`.
   - Pengecekan master fisik sudah diterima (`previousIntake.status === 'RECEIVED'`) dieksekusi **sebelum** blok pencatatan rekap penerbit B-16.
   - Jika admin internal di loket TMII menerima fisik lebih dahulu (misalnya naskah revisi/dumi diantar langsung atau kurir tiba sebelum staf penerbit mendeklarasikan resi), penerbit ditolak dengan `409 Conflict`.
   - Karena rekap tidak bisa diunggah, Koordinator Distributor juga tertolak `409 Conflict` di `createAssignments` (pagar Titik c). Naskah mengalami *deadlock*.

2. **Ketiadaan Penegakan Pembanding Wajib Distributor:**
   - Distributor wajib membandingkan hasil perbaikan penerbit dengan catatan sidang ronde sebelumnya.
   - Namun di kode backend saat ini belum ada field atau validasi yang menegakkan bukti telaah pembanding distributor sebelum rekomendasi diputuskan.

3. **Pengembalian Revisi Tanpa Gerbang Kelengkapan Sidang:**
   - Fungsi `assertDistributionReviewCompleteness` hanya dipanggil jika `result === 'PASSED'`.
   - Akibatnya, distributor dapat mengembalikan naskah ke penerbit (`REVISION_REQUIRED`) sebelum seluruh kelompok atau pentashih individu mengunggah rekapitulasi telaah.
   - Hukum dasar sidang menyatakan distributor wajib menunggu seluruh unit pentashih/kelompok tuntas menyelesaikan rekapnya (kecuali untuk kelompok yang telah direkap oleh salah satu anggota dengan cakupan `TEAM`).

4. **Pagar Berkas "Ada Isi" Belum Ditegakkan:**
   - Berkas rekap pentashih hanya dicek eksistensi record-nya di `StoredFile` tanpa memastikan ukuran `file_size > 0` dan kesesuaian tipe file dokumen.
   - Berkas rekap penerbit di `dispatchPhysical` bahkan langsung di-upsert ke tabel `publisher_revision_recaps` tanpa memeriksa tabel `StoredFile` sama sekali.

5. **Celah Bypass Transisi Generik Penerbit:**
   - Pada `TRANSITION_POLICY`, transisi `REVISION_REQUIRED -> READY_FOR_VERIFICATION` belum ditandai `domainAction: true`.
   - Karena status `REVISION_REQUIRED` digunakan bersama untuk revisi verifikasi awal dan revisi sidang tashih, penerbit dapat menembakkan transisi generik untuk memotong siklus fisik dan mengembalikan naskah yang sedang ditashih kembali ke antrean verifikasi awal.

6. **Kebocoran Identitas Pentashih & Catatan Sidang di Dokumen Resmi:**
   - Fungsi `createDocument` menyalin array penugasan lengkap (`assignee.name` dan `reviews` berisi catatan mentah serta `recap_file_id`) ke kolom `content_snapshot`.
   - Endpoint `getDetail` meloloskan seluruh dokumen resmi berstatus `ISSUED` ke akun Penerbit. Penerbit dapat membaca nama pentashih dan catatan internal yang seharusnya rahasia negara.

7. **Inkonsistensi Perhitungan Nomor Ronde:**
   - `approveDistribution` menghitung ronde revisi menggunakan jumlah surat pengembalian (`count + 1`).
   - `dispatchPhysical` menghitung ronde dari `lastRevLetter.version`.
   - Jika draf surat sempat dibuat ulang, versinya naik dan kedua nilai ini bergeser.

8. **Keterjebakan Data Lama (Legacy Reviews):**
   - Guard `assignment.reviews.length` di `recordReview` memblokir pengunggahan rekap pada review lama yang dahulu dibuat tanpa berkas rekap, sehingga naskah lama macet permanen di `TASHIH_IN_PROGRESS`.

---

## 2. Rincian Solusi & Perubahan Teknis

### Tahap 1: Backend (Prioritas Utama)

1. **Endpoint Mandiri Rekapitulasi Penerbit:**
   - Route baru: `POST /api/v1/registrations/:id/publisher-revision-recap` (otorisasi role `PENERBIT`).
   - Skema validasi: `publisherRevisionRecapSchema` (`recap_file_id: z.string().uuid()`).
   - Validasi `recap_file_id` di `StoredFile`: file ada, milik penerbit, dan `file_size > 0`.
   - Dapat diakses kapan saja selama status naskah `REVISION_REQUIRED` tanpa terpengaruh status penerimaan fisik loket TMII.
   - Penyesuaian `dispatchPhysical`: jika `recap_file_id` tidak disertakan di form resi, cek apakah `PublisherRevisionRecap` untuk ronde ini sudah pernah diunggah via endpoint mandiri.

2. **Penegakan Gerbang Rekap Lengkap & Catatan Pembanding Distributor:**
   - Pada `approveDistribution`: panggil `assertDistributionReviewCompleteness(assignments)` untuk **semua hasil** (`PASSED` maupun `REVISION_REQUIRED`).
   - Tambahkan field `comparison_notes` pada `reviewDistributionSchema` (minimal 5 karakter, maksimal 2000 karakter).
   - Wajibkan `comparison_notes` jika naskah merupakan ronde revisi atau dumi (`previousLetters > 0`).

3. **Penutupan Bypass Transisi Penerbit:**
   - Tandai transisi `REVISION_REQUIRED -> READY_FOR_VERIFICATION` dengan `domainAction: true` pada `TRANSITION_POLICY`.
   - Transisi perbaikan verifikasi wajib dipicu lewat domain action khusus, bukan generic endpoint.

4. **Sanitasi Snapshot Dokumen Resmi:**
   - Pada `createDocument`, pemetaan `snapshot.assignments` disanitasi:
     - Hapus field `assignee` (nama pentashih).
     - Hapus field `reviews` mentah (catatan sidang internal & `recap_file_id`).
     - Cukup simpan metadata status: `{ stage, iteration, status, due_at }`.

5. **Harmonisasi Ronde & Perbaikan Validasi:**
   - Gunakan penghitungan ronde kanonikal yang konsisten di semua service: `previousLetters + 1`.
   - Pada `recordReview`: validasi `file_size > 0` pada `recap_file_id`.
   - Berikan relaksasi pada `recordReview`: izinkan pentashih memperbarui rekap jika review lama yang tersimpan memiliki `recap_file_id === null` dan status naskah masih `TASHIH_IN_PROGRESS`.
   - Hapus parameter mati `team_ids` pada `assignmentSchema`.

---

### Tahap 2: Frontend

1. **API Client:**
   - Tambahkan method `uploadPublisherRevisionRecap(id, payload)` pada `registration.api.js`.
   - Perbarui payload `approveDistribution` pada `tashih.api.js` untuk menyertakan `comparison_notes`.

2. **Antarmuka Penerbit (`PublisherRevisionPage.jsx`):**
   - Tambahkan card terpisah untuk mengunggah dokumen Rekapitulasi Perbaikan / Dumi secara mandiri.
   - Tampilkan badge status dan link pratinjau berkas yang telah diunggah.

3. **Antarmuka Reviu Distributor (`DistributorReviewDialog.jsx`):**
   - Tampilkan tombol unduh rekap catatan ronde sebelumnya berdampingan dengan tombol unduh rekap revisi penerbit.
   - Sediakan textarea wajib *Catatan Telaah Pembanding* (`comparison_notes`).

4. **Pembersihan Komponen Usang:**
   - Hapus berkas usang `JuzChecklistForm.jsx`.

---

## 3. Rencana Pengujian Backend

Unit/Integration Security Test File: `backend/tests/unit/workflow-security-b17.test.js`
- `B17-01`: Upload rekap penerbit mandiri sukses walau status intake fisik sudah `RECEIVED`.
- `B17-02`: Upload rekap menolak berkas 0-byte atau file yang tidak ada di `StoredFile`.
- `B17-03`: `approveDistribution` dengan putusan `REVISION_REQUIRED` menolak eksekusi jika pentashih belum setor rekap.
- `B17-04`: `TRANSITION_POLICY` menolak generic transition `REVISION_REQUIRED -> READY_FOR_VERIFICATION` (`domainAction: true`).
- `B17-05`: `createDocument` tidak membocorkan nama pentashih (`assignee`) dan `reviews` ke dalam `content_snapshot`.
- `B17-06`: Distributor wajib menyertakan `comparison_notes` pada ronde perbaikan/dumi.
- `B17-07`: `recordReview` mengizinkan perbaikan review lama jika `recap_file_id` sebelumnya kosong.

---

## 4. Kriteria Keberhasilan (*Definition of Done*)

- [ ] Penerbit dapat mengunggah berkas rekap revisi/dumi kapan saja via endpoint mandiri tanpa terkunci fisik.
- [ ] Pengiriman naskah fisik revisi tidak ditolak jika rekap penerbit sudah diunggah sebelumnya.
- [ ] Distributor tidak dapat memulangkan revisi naskah sebelum seluruh unit pentashih menyelesaikan rekap.
- [ ] Distributor wajib mengisi catatan pembanding pada naskah revisi/dumi.
- [ ] Generic transition bypass ditutup dengan `domainAction: true`.
- [ ] Identitas dan review pentashih bersih 100% dari snapshot dokumen resmi yang terbit ke penerbit.
- [ ] Nomor ronde konsisten di semua tahap dan service.
- [ ] Seluruh pengujian backend dan frontend lulus 100%.

