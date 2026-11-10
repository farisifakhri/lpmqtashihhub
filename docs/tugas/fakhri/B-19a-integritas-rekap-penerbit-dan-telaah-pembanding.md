# B-19a: Integritas Rekapitulasi Penerbit & Pemindahan Telaah Pembanding Distributor

- **ID Paket:** B-19a
- **Branch:** `feat/b19a-integritas-rekap-penerbit-dan-telaah-pembanding`
- **Basis:** `main` (`02fd332`)
- **PIC:** Fakhri
- **Status:** **Selesai (Siap Reviu & Merge)**
- **Dependensi:** B-17 (Integritas Siklus Revisi), B-18 (Penetapan STT & Workspace Dokumentator)
- **Versi Dokumen:** 1.0 (9 November 2026)

---

## 1. Latar Belakang & Masalah (Hasil Audit Implementasi Post-B18)

Setelah integrasi B-17 dan B-18 di-merge ke `main`, reviu mendalam menemukan sejumlah celah integritas data dan potensi kebuntuan (*deadlock*):

1. **Jalan Buntu Rekapitulasi Penerbit (N1):**
   - Endpoint `POST /registrations/:id/publisher-revision-recap` hanya mensyaratkan status `REVISION_REQUIRED`.
   - Namun jika Admin Internal menerima fisik lebih dulu (`verification-intake.service.js`), status naskah berpindah ke `WAITING_DISTRIBUTOR_RECEIPT` dan selanjutnya `WAITING_DISTRIBUTION`.
   - Pada status tersebut, endpoint rekap menolak unggahan penerbit, sementara Distributor terblokir membuat penugasan karena berkas rekap belum tercatat.
2. **Rekapitulasi Penerbit Rentan Tertrigger Keliru Saat Revisi Verifikasi (N3):**
   - `uploadPublisherRevisionRecap` belum memeriksa apakah naskah berada dalam siklus revisi tashih.
   - Jika dipanggil saat status `REVISION_REQUIRED` akibat revisi verifikasi berkas administrasi awal, berkas tercatat sebagai ronde 1 sehingga syarat rekap ronde tashih pertama terisi secara keliru.
   - Demikian pula di `dispatchPhysical`, pengiriman fisik revisi administrasi mewajibkan rekap tashih padahal belum ada sidang tashih.
3. **Pemeriksaan Kepemilikan Berkas Rekap (N5):**
   - Validasi kepemilikan sebelumnya membandingkan `recapFile.owner_id` dengan `reg.publisher_id` (User ID vs Publisher ID).
   - Mengingat satu penerbit memiliki satu akun pengguna (`Publisher.user_id` adalah `@unique`), kepemilikan berkas harus ditegakkan dengan `recapFile.owner_id === user.id`.
   - Ditambahkan validasi `mime_type` (wajib PDF/dokumen) dan `file_size > 0`.
   - Cek serupa ditegakkan untuk `review_recap_file_id` di `recordReview`.
4. **Salah Waktu & Kebocoran Telaah Pembanding Distributor (N4):**
   - `comparison_notes` saat ini diwajibkan di `approveDistribution` (saat memulangkan naskah ke penerbit) dan disimpan di `content_snapshot` pada `REVISION_RETURN_LETTER`.
   - Ini salah waktu (telaah pembanding naskah masuk seharusnya dilakukan sebelum naskah dibagikan kembali ke pentashih) dan membocorkan telaah internal ke surat penerbit.
   - Telaah pembanding harus dipindahkan ke `createAssignments` saat naskah revisi/dumi masuk, dengan panjang minimal 20 karakter, dan disimpan di tabel relasional khusus internal `distributor_comparisons`.

---

## 2. Rincian Solusi & Perubahan Teknis

### 2.1. Helper Kanonikal `resolveTashihRound(tx, reg)`
Dibuat di `backend/src/services/workflow-utils.js` untuk dipakai bersama oleh `registration.service.js`, `distribution.service.js`, dan `verification-intake.service.js`:
- Mendeteksi `lastRevLetter` (`REVISION_RETURN_LETTER` terbaru).
- Menghitung `roundNumber` kanonikal (`lastRevLetter.content_snapshot.revision_round || lastRevLetter.version || 1`).
- Menentukan `isTashihRevision` (`!!lastRevLetter`).
- Menentukan apakah penugasan untuk ronde ini sudah dibuat (`hasAssignmentsForRound`: ada penugasan dengan `created_at > lastRevLetter.created_at`).

### 2.2. Perluasan & Penguncian `uploadPublisherRevisionRecap`
- Status yang diizinkan: `['REVISION_REQUIRED', 'WAITING_DISTRIBUTOR_RECEIPT', 'WAITING_DISTRIBUTION']`.
- Validasi kepastian revisi tashih: `if (!roundInfo.isTashihRevision) fail(400, ...)`.
- Validasi kunci penugasan: `if (roundInfo.hasAssignmentsForRound) fail(409, ...)`.
- Validasi kepemilikan berkas: `recapFile.owner_id === user.id`, `file_size > 0`, dan tipe MIME dokumen sah.
- Sinkronisasi `dispatchPhysical`: hanya wajibkan rekapitulasi jika `roundInfo.isTashihRevision === true`.

### 2.3. Model Baru `DistributorComparison`
Ditambahkan di `backend/prisma/schema.prisma`:
```prisma
model DistributorComparison {
  id              String       @id @default(uuid())
  registration_id String
  round_number    Int
  distributor_id  String
  notes           String       @db.Text
  created_at      DateTime     @default(now())
  updated_at      DateTime     @updatedAt

  registration    Registration @relation(fields: [registration_id], references: [id], onDelete: Cascade)
  distributor     User         @relation(fields: [distributor_id], references: [id])

  @@unique([registration_id, round_number])
  @@index([distributor_id])
  @@map("distributor_comparisons")
}
```

### 2.4. Pemindahan Telaah Pembanding ke `createAssignments`
- Di `createAssignments`:
  - Jika `roundInfo.isTashihRevision === true`:
    - Wajibkan dokumen rekapitulasi penerbit untuk ronde tersebut.
    - Pada penugasan awal ronde masuk (`WAITING_DISTRIBUTION` atau belum ada penugasan setelah surat pengembalian): wajibkan `comparison_notes` (minimal 20 karakter).
    - Simpan ke `DistributorComparison`.
- Di `approveDistribution`:
  - Hapus validasi dan penyimpanan `comparison_notes`.
  - Hapus dari `content_snapshot` `REVISION_RETURN_LETTER`.
- Di `workflow.validator.js`:
  - Tambahkan `comparison_notes` (opsional di skema umum, divalidasi bersyarat di service).
  - Hapus dari `distributorReviewSchema`.
- Di `registration.service.js`:
  - Di `getDetail`, relasi `distributor_comparisons` tidak di-include untuk role `PENERBIT`.
  - Filter `comparison_notes` dari snapshot dokumen lama jika dibaca oleh penerbit.

### 2.5. Skrip Backfill Pembersihan Snapshot Lama
- Buat skrip `backend/scripts/backfill-clean-comparison-notes.js` dengan opsi `--dry-run` untuk memindahkan `comparison_notes` lama ke `distributor_comparisons` dan menghapusnya dari `content_snapshot` dokumen pengembalian.

### 2.6. Penyesuaian Frontend
- Di `PublisherOfficialDocsTab.jsx` / `PublisherRevisionPage.jsx`: pastikan kartu unggah rekapitulasi tetap aktif pada status `WAITING_DISTRIBUTOR_RECEIPT` dan `WAITING_DISTRIBUTION`.
- Di `ManualTeamAssignmentDialog.jsx`: sediakan input "Catatan Telaah Pembanding Naskah Masuk" saat menugaskan naskah revisi/dumi.
- Di `DistributorReviewDialog.jsx`: hapus form input telaah pembanding.

---

## 3. Rencana Pengujian Backend & Frontend

1. **Unit & Security Tests (`backend/tests/unit/workflow-security-b19a.test.js`)**:
   - `B19A-01`: Upload rekap sukses pada status `WAITING_DISTRIBUTOR_RECEIPT` dan `WAITING_DISTRIBUTION`.
   - `B19A-02`: Upload rekap ditolak (409) jika penugasan ronde telah dibuat.
   - `B19A-03`: Upload rekap ditolak (400) jika naskah dalam revisi administrasi verifikator (bukan revisi tashih).
   - `B19A-04`: Upload rekap ditolak (403) jika `owner_id !== user.id`.
   - `B19A-05`: `recordReview` menolak berkas rekap jika bukan milik pentashih bersangkutan (`owner_id !== user.id`).
   - `B19A-06`: `createAssignments` mewajibkan `comparison_notes` minimal 20 karakter pada penugasan awal naskah revisi masuk dan menyimpannya di `distributor_comparisons`.
   - `B19A-07`: `approveDistribution` tidak lagi mewajibkan dan tidak menyimpan `comparison_notes` di `REVISION_RETURN_LETTER`.
   - `B19A-08`: Snapshot dokumen pengembalian yang dibaca penerbit tidak memuat `comparison_notes`.
2. **Frontend Tests**:
   - Validasi rendering form rekap di detail pendaftaran pada status antrean fisik.
   - Pemeriksaan token warna design system (`npm --prefix frontend run check:colors`).

---

## 4. Kriteria Keberhasilan (*Definition of Done*)

- [x] Helper `resolveTashihRound` aktif dan digunakan secara konsisten.
- [x] Penerbit dapat mengunggah rekapitulasi perbaikan saat naskah berstatus `REVISION_REQUIRED`, `WAITING_DISTRIBUTOR_RECEIPT`, atau `WAITING_DISTRIBUTION`.
- [x] Unggahan rekap terkunci (409) begitu Distributor menerbitkan penugasan ronde tersebut.
- [x] Pengunggahan rekap ditolak (400) pada revisi verifikasi awal (tanpa surat pengembalian tashih).
- [x] Cek kepemilikan berkas `owner_id === user.id`, `file_size > 0`, dan tipe MIME dokumen sah ditegakkan di `uploadPublisherRevisionRecap` dan `recordReview`.
- [x] `createAssignments` mewajibkan telaah pembanding $\ge 20$ karakter untuk naskah revisi/dumi masuk dan menyimpannya di tabel `distributor_comparisons`.
- [x] `approveDistribution` bebas dari `comparison_notes` dan snapshot surat pengembalian bersih 100% dari catatan internal pembanding.
- [x] Skrip backfill dengan mode `--dry-run` siap pakai.
- [x] Seluruh pengujian backend dan frontend lulus 100%.
- [x] `check:colors` frontend hijau tanpa pelanggaran token.
