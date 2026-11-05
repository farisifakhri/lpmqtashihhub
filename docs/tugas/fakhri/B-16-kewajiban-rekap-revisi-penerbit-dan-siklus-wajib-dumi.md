# B-16: Kewajiban Rekap Revisi Penerbit (Per Ronde) dan Penegakan Siklus Wajib Dumi

- **ID Paket:** B-16
- **Branch:** `feat/b16-rekap-revisi-penerbit-dan-siklus-dumi`
- **Basis:** `feat/b15-rekap-kelompok-dan-eliminasi-checklist`
- **PIC:** Fakhri
- **Status:** **Selesai** (Commit `0ee0b9e`)
- **Dependensi:** B-14 (Gerbang STT), B-15 (Rekap Kelompok)
- **Memblokir:** B-09 s.d. B-11
- **Versi Dokumen:** 1.0 (5 November 2026)

---

## 1. Latar Belakang & Masalah (Audit Workflow Temuan A3 & Aturan Siklus Dumi)

Sesuai SOP Pentashihan Mushaf Al-Qur'an Kementerian Agama RI dan hasil konfirmasi operasional bersama:

1. **Temuan A3 (Ketiadaan Dokumen Rekap Revisi Penerbit & Pembandingan Semu):**
   - Saat penerbit mengirimkan kembali naskah perbaikan atau dumi, sistem saat ini hanya mencatat kurir dan nomor resi pengiriman (`outgoing_tracking_no`).
   - Tidak ada kolom atau berkas yang menyimpan dokumen *Rekap Hasil Revisi dari Penerbit* (daftar butir apa saja yang telah diperbaiki oleh penerbit berdasarkan catatan telaah fisik LPMQ).
   - Akibatnya, janji fitur pembandingan pada B-07 hanya menampilkan catatan sidang sebelumnya tanpa dokumen tandingan dari penerbit, sehingga pentashih dan distributor kesulitan memeriksa apakah seluruh catatan koreksi telah ditindaklanjuti.
2. **Ketiadaan Penegakan Tahap Dumi (*Skipping DUMMY Stage to STT*):**
   - Implementasi `approveDistribution` saat ini mengizinkan naskah langsung meloncat ke status `READY_FOR_STT` dari tahap mana pun (termasuk tahap reguler/tashih awal) asalkan putusannya `PASSED`.
   - Padahal aturan mutlak menyatakan: **Setiap naskah WAJIB melewati tahap Dumi (`DUMMY`) sebelum Surat Tanda Tashih (STT) dapat diterbitkan.**
   - Bahkan jika pada Tashih Awal naskah dinyatakan lolos tanpa koreksi (*unanimous pass*, walau kasus ini jarang terjadi), naskah **tidak boleh** langsung terbit STT, melainkan wajib masuk ke tahap Dumi untuk pengujian spesifikasi cetak dummy fisik terlebih dahulu.

---

## 2. Rincian Solusi & Perubahan Teknis

### 2.1. Kewajiban Rekap Revisi Penerbit Per Ronde (Solusi A3)

1. **Penambahan Model Database (`backend/prisma/schema.prisma`):**
   - Tambahkan tabel pencatat dokumen rekap revisi penerbit per iterasi/ronde:
     ```prisma
     model PublisherRevisionRecap {
       id              String       @id @default(uuid())
       registration_id String
       round_number    Int
       revision_kind   String       @db.VarChar(20) // "CORRECTION" | "DUMMY"
       recap_file_id   String
       recap_file      StoredFile   @relation(fields: [recap_file_id], references: [id])
       created_at      DateTime     @default(now())

       registration    Registration @relation(fields: [registration_id], references: [id], onDelete: Cascade)

       @@unique([registration_id, round_number])
       @@map("publisher_revision_recaps")
     }
     ```
   - Berkas rekap revisi penerbit disimpan aman di `StoredFile` dengan batasan format: `.pdf, .doc, .docx` (maks 25 MB).

2. **Arsitektur Tiga Titik Kontrol (Titik a, b, c):**
   - **Titik (a) - Sisi Penerbit (Gerbang Paling Awal):**
     - Pada form pengiriman naskah perbaikan (`PublisherRevisionPage.jsx`) dan endpoint `POST /api/v1/registrations/:id/publisher-revision`:
     - Selain menginput kurir dan resi masuk, penerbit **wajib mengunggah Berkas Rekap Revisi Penerbit**.
     - Tombol submit terkunci rapat (*disabled*) jika berkas rekap revisi belum diunggah.
   - **Titik (b) - Sisi Admin Internal (Loket Fisik TMII):**
     - Saat staf loket menerima naskah fisik dan mencatat BAST masuk, dashboard menampilkan status dokumen rekap:
       `[Badge: Berkas Rekap Revisi Penerbit Terlampir]` beserta tombol pratinjau.
     - Penerimaan fisik tidak diblokir agar naskah fisik yang telah tiba di kantor tidak menggantung statusnya, namun indikator ketiadaan berkas akan menjadi peringatan visual bagi admin.
   - **Titik (c) - Sisi Koordinator Distributor & Backend (Pagar Terakhir):**
     - Pada saat Koordinator Distributor akan membagikan kembali naskah ronde perbaikan ke pentashih (`createAssignmentsBatch`), backend memeriksa keberadaan `publisher_revision_recaps` untuk ronde berjalan.
     - Jika berkas belum ada, penugasan ditolak dengan error `409 Conflict: Naskah revisi belum dapat ditugaskan karena Penerbit belum mengunggah dokumen rekapitulasi perbaikan untuk ronde ini.`

3. **Antarmuka Pembandingan Berkas untuk Pentashih & Distributor:**
   - Pada modal kerja Pentashih (`PentashihWorkspacePage.jsx`) dan dialog reviu Distributor (`DistributorReviewDialog.jsx`), tampilkan panel perbandingan berdampingan:
     1. Tombol `[📄 Unduh Catatan/Rekap Sidang LPMQ Ronde Lalu]`
     2. Tombol `[📥 Unduh Rekap Hasil Perbaikan Penerbit Ronde Ini]`
   - Pentashih dapat mencocokkan setiap butir koreksi yang telah diperbaiki penerbit sebelum memberikan putusan akhir.

---

### 2.2. Penegakan Siklus Wajib Dumi Sebelum STT

1. **State Machine Alur Sidang & Tahapan Naskah:**
   ```
   [Tashih Awal (REGULAR)]
          │
          ├────────────────────────────────────────┐
          │ (Jika ada koreksi / mayoritas kasus)   │ (Jika lolos bersih / jarang)
          ▼                                        ▼
   [REVISION_REQUIRED (CORRECTION)]         [Tahap Dumi (DUMMY)] ◄─────────────┐
          │                                        │                           │
          ▼                                        │                           │
   Penerbit kirim fisik revisi + rekap revisi     Penerbit kirim fisik dumi    │
          │                                        │                           │
          ▼                                        ▼                           │
   [Tashih Perbaikan (CORRECTION)]           [Tashih Dumi (DUMMY)]             │
          │                                        │                           │
          ├─ Masih perlu perbaikan ────────────────┘                           │
          │                                        │ (Jika dumi perlu perbaikan)
          ▼ (Lolos perbaikan)                      └───────────────────────────┘
   [Tahap Dumi (DUMMY)]                            │ (Lolos dumi)
                                                   ▼
                                           [READY_FOR_STT]
                                                   │
                                                   ▼
                                           [Penerbitan STT]
                                                   │
                                                   ▼
                                           [Penerbit kirim 5 Eksemplar ke Dokumentator]
   ```

2. **Aturan Transisi Backend (`approveDistribution` & `assertReadyForSttEligibility`):**
   - **Tashih Awal (`stage === 'REGULAR'`):**
     - Jika putusan = `PASSED`: Status dialihkan ke tahap Dumi (`stage: 'DUMMY'`, `status: 'WAITING_FOR_DUMMY'`). Status **DILARANG** berubah menjadi `READY_FOR_STT`.
     - Jika putusan = `REVISION_REQUIRED`: Status menjadi `REVISION_REQUIRED` dengan `revision_kind: 'CORRECTION'`.
   - **Tahap Perbaikan (`stage === 'REGULAR'` dan `revision_kind === 'CORRECTION'`):**
     - Jika putusan = `PASSED`: Naskah dinyatakan tuntas koreksi teksnya dan dialihkan ke tahap Dumi (`revision_kind: 'DUMMY'`).
     - Jika putusan = `REVISION_REQUIRED`: Tetap dalam siklus `REVISION_REQUIRED`.
   - **Tahap Dumi (`stage === 'DUMMY'`):**
     - Penugasan dumi dialokasikan kembali ke pentashih untuk memeriksa sampel cetak fisik dumi.
     - Jika putusan = `REVISION_REQUIRED`: Naskah dikembalikan ke penerbit untuk revisi dumi (`revision_kind: 'DUMMY'`).
     - **HANYA JIKA putusan pada tahap `DUMMY` adalah `PASSED` secara bulat, status naskah diizinkan berpindah ke `READY_FOR_STT`.**
   - **Pendaftaran Perpanjangan STT (`registration_type === 'EXTENSION'`):**
     - Alur langsung diinisialisasi pada tahap `DUMMY`.

---

## 3. Rencana Pengujian (Test Suite)

1. **Backend Integration / Unit Test (`backend/tests/unit/distribution-b16.test.js`):**
   - `test('B16-01: Penerbit wajib mengunggah berkas rekap revisi saat submit perbaikan (titik a)')`
   - `test('B16-02: Distributor ditolak menugaskan pentashih jika berkas rekap revisi penerbit belum ada (titik c)')`
   - `test('B16-03: Putusan PASSED pada Tashih Awal mengalihkan status ke DUMMY, bukan READY_FOR_STT')`
   - `test('B16-04: Transisi ke READY_FOR_STT hanya sah jika berasal dari tahap DUMMY yang dinyatakan PASSED')`
   - `test('B16-05: Distributor dan pentashih dapat mengakses dokumen rekap penerbit untuk pembandingan')`

2. **Frontend Workflow Test:**
   - Memverifikasi form `PublisherRevisionPage` mengunci tombol kirim bila rekap revisi penerbit belum dipilih.
   - Memverifikasi panel perbandingan dokumen muncul pada dialog reviu distributor dan workspace pentashih.

---

## 4. Kriteria Keberhasilan (*Definition of Done*)

- [x] Model `publisher_revision_recaps` tersimpan rapi via migrasi Prisma.
- [x] Tombol kirim revisi penerbit mengunci kewajiban unggah dokumen rekap revisi (PDF/DOCX).
- [x] Distributor tidak dapat membagikan naskah ronde revisi jika rekap revisi penerbit untuk ronde tersebut belum tersedia.
- [x] Seluruh transisi menuju `READY_FOR_STT` wajib melewati kelulusan tahap Dumi (`DUMMY`). Tidak ada jalan pintas dari tashih awal langsung ke STT.
- [x] Seluruh pengujian unit backend dan frontend lulus 100%.

