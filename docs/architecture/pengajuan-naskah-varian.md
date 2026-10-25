# Arsitektur B-01: Pengajuan Banyak Naskah, Jenis Naskah Berbasis Item, dan Varian

- **Status Dokumen**: Rancangan awal B-01; status implementasi tidak lagi menunggu persetujuan. Bukti kode dan status terkini dicatat di [peta tugas](../tugas/README.md) dan [backlog fase lanjutan](../tugas/BACKLOG-FASE-LANJUTAN.md).
- **Dasar Branch**: `main`
- **Branch Kerja**: `feat/pengajuan-naskah-skema`
- **Terkait Modul**: Registrasi, Verifikasi, Pembayaran (PNBP), Distribusi, Tashih, Dokumentasi (STT), Keamanan Siber

---

## 1. Latar Belakang & Ringkasan Perubahan

Pada implementasi awal (SRS v2.2), satu permohonan pendaftaran yang berisi beberapa naskah dipecah menjadi beberapa `Registration` terpisah melalui perulangan (*loop*) pada `registration.service.js`. Akibatnya, setiap naskah mendapatkan nomor STT dan billing terpisah, berkas lampiran terduplikasi, dan jenis layanan ditebak melalui pencocokan teks nama (*string contains*). Selain itu, ukuran (*format*) dan oplah hanya tersimpan dalam array JSON bebas `sizes[]` di kolom metadata.

Paket B-01 merombak struktur data dan alur pendaftaran menjadi:
1. **Satu Pengajuan, Satu STT**: Satu `Registration` menaungi banyak naskah (`Manuscript`) dengan satu nomor permohonan dan satu STT akhir.
2. **Jenis Naskah Berbasis Item**: Setiap naskah memiliki tepat **satu item dasar** (Kelompok 1/2) dan dapat memiliki **beberapa item tambahan** (Kelompok 3).
3. **Varian per Naskah**: Setiap naskah memiliki 1 s.d. 10 varian spesifikasi cetak (`ManuscriptVariant`: ukuran dan oplah). Surat Hasil Pentashihan diterbitkan per varian.
4. **Perhitungan Tarif & SLA di Sisi Server**: Tarif dijumlahkan per item, Terjemah tidak dihitung ganda bila bersama Perkata/Tafsir, dan SLA pengajuan mengacu pada SLA naskah terpanjang (dengan batas maksimal 60 HK untuk perdana).

---

## 2. Pemetaan & Dampak Komponen Eksisting (*Impact Analysis*)

Berdasarkan penelusuran menyeluruh pada repositori, berikut adalah komponen dan entitas yang membaca atau dipengaruhi oleh transisi ini:

| Entitas / Kolom Lama | Lokasi Kode Terkait | Dampak & Penyesuaian B-01 |
|---|---|---|
| `Registration.title` | `registration.service.js`, `verification-*.service.js`, `official-document.service.js`, `registration-receipt-pdf.service.js`, `PublisherRegistrationCard.jsx`, `VerificationInspectionPage.jsx`, `UnifiedDashboard.jsx` | Judul naskah berpindah ke entitas `Manuscript.title`. Kolom `Registration.title` tetap dipertahankan selama masa transisi sebagai judul ringkasan pengajuan (misal judul naskah pertama atau komposit) agar query agregat dashboard tidak *break*. |
| `Registration.service_type_id` | `registration.service.js`, `master.service.js`, `InspectionReferencePanels.jsx`, `ResultLetterPanel.jsx`, `TeamAssignmentPanel.jsx` | Digantikan oleh relasi eksplisit `ManuscriptItem` ke master `JenisNaskahItem`. Layanan lama `ServiceType` dipertahankan untuk data historis; data baru merujuk pada master item. |
| `foreign_metadata.sizes` / `mushaf_details.sizes` | `registration-receipt-pdf.service.js`, `NewRegistrationPage.jsx`, `PublisherRegistrationDetailPage.jsx`, `AdminMasterIntakePage.jsx` | Dipindahkan menjadi entitas relasional terstruktur `ManuscriptVariant` (dengan validasi format ukuran dan oplah numerik positif). Tanda terima PDF membaca data varian riil tanpa nilai bawaan (*fallback*). |
| `foreign_metadata` & `mushaf_details` | `registration.validator.js`, `registration.service.js`, `Step1MushafData.jsx` | Skema validasi diperketat dari `z.record(z.any())` menjadi *whitelisted keys* berbatas ukuran dan kedalaman. Kunci cadangan (*bypass*) seperti `*_file_id` dan `apk_url` dilarang disusupkan lewat metadata. |
| `Registration.fee_sla_snapshot` | `registration.service.js`, `verification-report.service.js`, `InspectionReferencePanels.jsx`, `ResultLetterPanel.jsx` | Diperluas untuk menyimpan rincian terstruktur per naskah dan per item (`manuscripts: [{ title, items, base_fee, addon_fee, sla }]`), di samping total agregat pengajuan (`total_fee`, `max_sla_initial_days`, dll.). |
| `ManuscriptFile` | `registration.service.js`, `file-access.service.js`, `Step3Berkas.jsx` | Ditambahkan kolom opsional `manuscript_id` (relasi ke `Manuscript`) sehingga berkas master, dummy, dan sampul dapat melekat spesifik per naskah. |
| `PaymentRecord` | `payment.service.js`, `verification-billing-flow.test.js`, `InternalPaymentQueuePage.jsx` | Menagih total tagihan agregat untuk seluruh naskah di dalam satu `Registration`. Kode billing SIMPONI tetap tunggal per pengajuan. |
| `Assignment` (Pentashihan) | `distribution.service.js`, `juz-checklist.service.js`, `PentashihWorkspacePage.jsx` | Pembagian tugas sidang pentashihan dapat diorganisir per naskah di bawah pengajuan yang sama (menyiapkan fondasi B-05). |
| `OfficialDocument` (Surat Hasil & STT) | `official-document.service.js`, `verification-signing.service.js` | STT diterbitkan satu per pengajuan (`Registration`), sedangkan Surat Hasil Pentashihan diterbitkan per varian naskah (`ManuscriptVariant`) (rujukan B-09). |

---

## 3. Desain Model Data Baru (Prisma Schema)

Berikut adalah usulan penambahan model pada `backend/prisma/schema.prisma`:

```prisma
// ---------------------------------------------------------
// 1. DATA MASTER ITEM JENIS NASKAH (B-01 §4 & §6)
// ---------------------------------------------------------
enum ItemRole {
  DASAR      // Kelompok 1 (Cetak/Lainnya) dan Kelompok 2 (Digital/Audio-Visual)
  TAMBAHAN   // Kelompok 3 (Fitur / Konten Tambahan Naskah)
}

enum ServiceKind {
  CETAK
  DIGITAL
  AUDIO_VISUAL
  BRAILLE
}

model JenisNaskahItem {
  id               String       @id @default(uuid())
  code             String       @unique // Misal: JUZ30, YASIN, TERJEMAH, PERKATA, TAFSIR
  name             String       // Nama resmi item
  group_number     Int          // 1, 2, atau 3
  role             ItemRole     @default(DASAR)
  service_kind     ServiceKind  @default(CETAK)
  unit_fee_rate    Int          @default(1) // Pengali unit (misal: Perkata/Tafsir = 2, materi biasa = 1)
  fee_per_unit     Decimal      @default(500000) @db.Decimal(12, 2)
  duration_initial Int          @default(15) // Mutlak untuk DASAR, penambahan hari (+HK) untuk TAMBAHAN
  duration_revision Int         @default(7)
  duration_dummy   Int          @default(3)
  covers_item_code String?      // Misal: PERKATA dan TAFSIR mencakup 'TERJEMAH'
  status           ActiveStatus @default(ACTIVE)
  created_at       DateTime     @default(now())
  updated_at       DateTime     @updatedAt

  manuscript_items ManuscriptItem[]

  @@map("jenis_naskah_items")
}

// ---------------------------------------------------------
// 2. ENTITAS NASKAH DALAM SATU PENGAJUAN (B-01 §6)
// ---------------------------------------------------------
model Manuscript {
  id              String       @id @default(uuid())
  registration_id String
  seq_number      Int          // Nomor urut naskah dalam pengajuan (1, 2, ..., maks 20)
  title           String       // Judul mushaf / naskah
  created_at      DateTime     @default(now())
  updated_at      DateTime     @updatedAt

  registration     Registration        @relation(fields: [registration_id], references: [id], onDelete: Cascade)
  items            ManuscriptItem[]
  variants         ManuscriptVariant[]
  files            ManuscriptFile[]

  @@unique([registration_id, seq_number])
  @@map("manuscripts")
}

// ---------------------------------------------------------
// 3. RELASI ITEM JENIS NASKAH PER NASKAH (B-01 §6)
// ---------------------------------------------------------
model ManuscriptItem {
  id              String          @id @default(uuid())
  manuscript_id   String
  item_id         String
  role            ItemRole        @default(DASAR)
  fee_snapshot    Decimal         @db.Decimal(12, 2)
  initial_days_snapshot  Int      @default(0)
  revision_days_snapshot Int      @default(0)
  dummy_days_snapshot    Int      @default(0)
  created_at      DateTime        @default(now())

  manuscript      Manuscript      @relation(fields: [manuscript_id], references: [id], onDelete: Cascade)
  item            JenisNaskahItem @relation(fields: [item_id], references: [id])

  @@unique([manuscript_id, item_id])
  @@map("manuscript_items")
}

// ---------------------------------------------------------
// 4. ENTITAS VARIAN UKURAN DAN OPLAH (B-01 §6)
// ---------------------------------------------------------
model ManuscriptVariant {
  id            String     @id @default(uuid())
  manuscript_id String
  ukuran        String     // Format baku: "Panjang x Lebar" (misal: "21,0 x 29,7")
  oplah         Int        // Bilangan bulat positif (> 0)
  created_at    DateTime   @default(now())
  updated_at    DateTime   @updatedAt

  manuscript    Manuscript @relation(fields: [manuscript_id], references: [id], onDelete: Cascade)

  @@map("manuscript_variants")
}
```

### Modifikasi pada Entitas Eksisting:
1. **`Registration`**:
   - Menambahkan relasi `manuscripts Manuscript[]`.
   - Menambahkan `previous_registration_id String?` dengan relasi opsional `previous_registration Registration? @relation("RegistrationRenewals", fields: [previous_registration_id], references: [id])`.
   - Menyimpan `fee_sla_snapshot Json?` dengan skema rinci per naskah dan per item.
2. **`ManuscriptFile`**:
   - Menambahkan kolom opsional: `manuscript_id String?` dan relasi ke `Manuscript`.

---

## 4. Master Data Item & Nilai Bawaan (Seed)

Sesuai Bagian 4 dokumen B-01, master item didefinisikan ke dalam tabel `jenis_naskah_items`:

### 4.1 Item Dasar (Kelompok 1 & 2 — Tepat 1 per Naskah)
| Kode | Item | Tarif Mutlak | SLA Perdana | SLA Revisi | SLA Dumi | Service Kind |
|---|---|---|---|---|---|---|
| `JUZ30` | Al-Qur'an 30 Juz | Rp 1.000.000 | 15 HK | 7 HK | 3 HK | `CETAK` |
| `YASIN` | Surah Yasin dan Bacaan Tahlil | Rp 500.000 | 5 HK | 2 HK | 1 HK | `CETAK` |
| `AMMA` | Juz 'Amma dan Terjemahnya | Rp 500.000 | 5 HK | 2 HK | 1 HK | `CETAK` |
| `MAJMU` | Majmu' Syarif | Rp 500.000 | 5 HK | 2 HK | 1 HK | `CETAK` |
| `KALIGRAFI` | Kaligrafi | Rp 500.000 | 3 HK | 2 HK | 1 HK | `CETAK` |
| `METODE` | Metode Baca Tulis Al-Qur'an | Rp 500.000 | 15 HK | 7 HK | 3 HK | `CETAK` |
| `AV` | Audio/Visual | Rp 1.000.000 | 30 HK | 15 HK | 7 HK | `AUDIO_VISUAL` |
| `DIGITAL` | Digital | Rp 1.000.000 | 15 HK | 7 HK | 3 HK | `DIGITAL` |
| `BRAILLE` | Mushaf Standar Braille | Rp 0 | 60 HK | 30 HK | 15 HK | `BRAILLE` |

### 4.2 Item Tambahan (Kelompok 3 — Boleh $\ge 0$)
| Kode | Item | Unit Tarif | Tarif (+Rp) | +HK Perdana | +HK Revisi | +HK Dumi | Mencakup (*Supersedes*) |
|---|---|---|---|---|---|---|---|
| `TERJEMAH` | Terjemah | 1 | Rp 500.000 | +7 HK | +5 HK | +4 HK | - |
| `TRANSLITERASI` | Transliterasi | 1 | Rp 500.000 | +7 HK | +5 HK | +4 HK | - |
| `TAJWID` | Tajwid Warna / Kode Tajwid | 1 | Rp 500.000 | +7 HK | +5 HK | +4 HK | - |
| `WAQAF` | Waqaf Ibtida' | 1 | Rp 500.000 | +7 HK | +5 HK | +4 HK | - |
| `QIRAAT` | Qiraat | 1 | Rp 500.000 | +7 HK | +5 HK | +4 HK | - |
| `PERKATA` | Terjemah/Transliterasi Perkata | 2 | Rp 1.000.000 | +30 HK | +15 HK | +9 HK | `TERJEMAH` |
| `TAFSIR` | Tafsir | 2 | Rp 1.000.000 | +30 HK | +15 HK | +9 HK | `TERJEMAH` |

---

## 5. Mesin Hitung Tarif dan SLA (Bagian 4.3)

1. **Tarif Naskah**:
   $$\text{Tarif Naskah} = \text{Tarif Item Dasar} + \sum (\text{Unit Tarif Item Tambahan Aktif} \times \text{Rp } 500.000)$$
   - Jika `PERKATA` atau `TAFSIR` dipilih, item `TERJEMAH` otomatis diabaikan dari perhitungan unit tarif dan hari.
2. **Tarif Pengajuan (Total Billing PNBP)**:
   $$\text{Tarif Pengajuan} = \sum_{m=1}^{M} \text{Tarif Naskah}_m$$
3. **SLA Naskah**:
   $$\text{SLA Perdana Naskah} = \min\left(60 \text{ HK}, \text{SLA Dasar} + \sum \Delta \text{HK Perdana}\right)$$
   $$\text{SLA Revisi Naskah} = \text{SLA Dasar} + \sum \Delta \text{HK Revisi}$$
   $$\text{SLA Dumi Naskah} = \text{SLA Dasar} + \sum \Delta \text{HK Dumi}$$
4. **SLA Pengajuan**:
   $$\text{SLA Pengajuan} = \max_{m} (\text{SLA Naskah}_m) \quad \text{untuk masing-masing tahap (Perdana, Revisi, Dumi)}$$
5. **Snapshot Imutabel**: Seluruh nilai tarif dan durasi SLA disalin ke `fee_sla_snapshot` pada `Registration` dan `ManuscriptItem` saat pengajuan disubmit. Perubahan master data di kemudian hari tidak mengubah data pengajuan yang telah diajukan.

---

## 6. Strategi Migrasi Data Idempoten (Bagian 5)

Data historis pada tabel `registrations` wajib termigrasi ke struktur naskah dan varian baru tanpa merusak tagihan lama atau data snapshot:

1. **Pemetaan 17 Jenis Layanan Lama ke Item Baru**:
   - `Mushaf Al-Qur'an 30 Juz` $\rightarrow$ `JUZ30`
   - `Mushaf Al-Qur'an dan Terjemahnya` $\rightarrow$ `JUZ30` + `TERJEMAH`
   - `Mushaf Al-Qur'an Tajwid Warna/Kode Tajwid` $\rightarrow$ `JUZ30` + `TAJWID`
   - `Mushaf Al-Qur'an Waqaf Ibtida'` $\rightarrow$ `JUZ30` + `WAQAF`
   - `Mushaf Al-Qur'an Qiraat` $\rightarrow$ `JUZ30` + `QIRAAT`
   - `Mushaf Al-Qur'an Transliterasi` $\rightarrow$ `JUZ30` + `TRANSLITERASI`
   - `Mushaf Al-Qur'an Terjemah Perkata` $\rightarrow$ `JUZ30` + `PERKATA`
   - `Mushaf Al-Qur'an dan Tafsirnya` $\rightarrow$ `JUZ30` + `TAFSIR`
   - `Mushaf Al-Qur'an Luar Negeri` $\rightarrow$ `JUZ30`, `registration_category = FOREIGN_MANUSCRIPT`
   - `Al-Qur'an Audio/Visual` $\rightarrow$ `AV`
   - `Mushaf Al-Qur'an Digital` $\rightarrow$ `DIGITAL`
   - `Mushaf Al-Qur'an Braille` $\rightarrow$ `BRAILLE`
   - `Surah Yasin dan Bacaan Tahlil` $\rightarrow$ `YASIN`
   - `Juz 'Amma dan Terjemahnya` $\rightarrow$ `AMMA`
   - `Majmu' Syarif` $\rightarrow$ `MAJMU`
   - `Metode Baca Tulis Al-Qur'an` $\rightarrow$ `METODE`
   - `Kaligrafi` $\rightarrow$ `KALIGRAFI`
2. **Idempotensi & Validasi**:
   - Setiap registrasi lama dibuatkan tepat 1 `Manuscript` (`seq_number = 1`, `title = registration.title`).
   - Jika `sizes[]` ada di metadata lama, setiap entri dikonversi menjadi `ManuscriptVariant`. **Jika data tidak ada, jangan mengisi nilai bawaan sembarangan.**
   - Menghubungkan `manuscript_files` yang ada ke `Manuscript` pertama tersebut.
   - Skrip migrasi dapat dijalankan berulang kali (*idempotent*) dengan memeriksa keberadaan naskah sebelum *insert*.
   - Menyediakan flag `--preview` (hanya kalkulasi dan pelaporan jumlah tanpa mutasi data) dan pencatatan cadangan (*backup*).

---

## 7. Rujukan Pengajuan Lama (Perpanjangan & Tambah Oplah)

- Pengajuan perpanjangan STT (`EXTENSION`) dan penambahan oplah adalah permohonan pendaftaran baru (`Registration` baru) yang mengisi `previous_registration_id` mengarah ke registrasi lama.
- Tagihan PNBP dikenakan penuh untuk pengajuan baru ini.
- STT lama tetap sah dan berlaku sampai masa berlakunya berakhir atau oplahnya habis.

---

## 8. Analisis Risiko Siber & Rencana Mitigasi

| Butir Risiko Siber | Vektor Kerentanan | Mitigasi B-01 |
|---|---|---|
| **IDOR** | Pemohon mengakses/mengubah naskah/varian milik penerbit lain via manipulasi `manuscript_id` atau `variant_id`. | Validasi kepemilikan berantai: setiap mutasi naskah/varian memverifikasi relasi `manuscript.registration.publisher_id === req.user.publisherId` (kecuali `SUPERADMIN`). |
| **Mass Assignment** | Klien menyusupkan kolom tarif, status, atau identifier internal di payload naskah/varian. | Validasi ketat skema Zod dengan `.strict()`: tolak kunci tidak dikenal. Tarif dihitung 100% di server dari master item. |
| **Eksploitasi Metadata** | `z.record(z.any())` disusupi payload raksasa, prototipe polusi, atau kunci internal (`*_file_id`, `apk_url`). | Ganti dengan schema terdefinisi: batasi ukuran string, kedalaman JSON $\le 2$, batasi daftar kunci yang diizinkan (*whitelisting*), tolak kunci sistem terlarang. |
| **Denial of Service (DoS)** | Pengiriman ratusan naskah atau ribuan varian dalam 1 payload untuk membebani CPU/DB. | Batasan konfigurasi: `MAX_MANUSCRIPTS_PER_REGISTRATION = 20`, `MAX_VARIANTS_PER_MANUSCRIPT = 10`. Validasi rentang oplah ($1 \le \text{oplah} \le 10.000.000$) dan format ukuran. |
| **Manipulasi Kepemilikan Berkas** | Mengaitkan berkas milik penerbit lain ke naskah baru. | Setiap `file_id` wajib divalidasi kepemilikannya melalui `assertManuscriptAccess` / modul file storage aman. |
| **Race Condition & Bentrok No. Registrasi** | Klik ganda atau pengiriman paralel membuat registrasi duplikat atau nomor bentrok. | Pembuatan pengajuan beserta seluruh naskah dan variannya dibungkus dalam **1 transaksi atomik Prisma** (`prisma.$transaction`) dengan *retry policy* dan nomor permohonan terkunci. |
| **Injeksi Teks ke PDF** | Teks judul naskah atau varian panjang disusupi script/karakter rusak untuk memecah PDF tanda terima/surat. | Penyaringan karakter bebas menggunakan `safeText`, pemotongan teks (*truncation*) sesuai batas lebar cetak kolom PDF. |
| **Audit Logging** | Perubahan dan pembuatan naskah tidak terekam jejak auditnya. | Pencatatan `logAudit` pada setiap aksi penambahan, perubahan, dan penghapusan naskah, item, dan varian. |

---

## 9. Pertanyaan Keputusan (Bagian 12 Dokumen Tugas)

Sesuai instruksi butir 3 Sesi 1, empat pertanyaan ini disampaikan kepada pemilik produk / Anda untuk konfirmasi resmi:

1. **Batas Perdana 60 HK**:
   - *Pertanyaan*: Batas maksimal 60 HK hanya berlaku untuk SLA Perdana, sedangkan SLA Revisi dan Dumi tidak dibatasi (hanya penjumlahan murni). Apakah ketentuan ini dikonfirmasi berlaku demikian?
   - *(Draf ini mengasumsikan Ya melalui konstanta `SLA_INITIAL_CAP_DAYS = 60`)*.
2. **SLA Tambah Oplah**:
   - *Pertanyaan*: Frasa "SLA tidak dikali dua" pada tambah oplah dibaca sebagai: permohonan tambah oplah memakai SLA kolom Dumi/Perpanjangan (3 HK untuk 30 Juz), bukan SLA Perdana penuh (15 HK). Apakah interpretasi ini benar?
3. **Pelacakan Status "Habis" STT**:
   - *Pertanyaan*: STT lama berlaku sampai habis atau kedaluwarsa. Kedaluwarsa dihitung dari waktu (2 tahun). Sedangkan kriteria "habis" membutuhkan data realisasi oplah cetak riil dari penerbit. Apakah disepakati hal ini diputuskan implementasinya di paket B-09 & B-10 (bukan di B-01)?
4. **Kombinasi Item Terlarang**:
   - *Pertanyaan*: Apakah ada kombinasi item jenis naskah yang secara regulasi dilarang (misal Braille digabung dengan materi tambahan, atau Kaligrafi digabung dengan Tafsir)? Ataukah seluruh kombinasi diizinkan dan tarif/SLA-nya mengikuti aturan penjumlahan standar?
