# Kontrak API — Modul Payment, Distribusi, Tashih, Dokumen Resmi

> Status: kontrak ini adalah rancangan target, bukan daftar seluruh endpoint yang sudah tersedia.
> Pencocokan dengan SOP verifikasi dan batas implementasi dicatat dalam
> [review SOP](docs/api/verifikasi-sop-review.md); endpoint yang sudah berjalan ada pada
> [dokumentasi workflow](docs/api/workflow.md). Detail yang belum pasti tetap menunggu
> rapat stakeholder sesuai arahan pengguna.

Dokumen ini melanjutkan `IMPLEMENTATION.md` dan `registration.service.js` yang sudah ada di branch
`feature/backend-api-mysql`. Konvensi yang dipakai **sengaja disamakan** dengan kode yang sudah berjalan:

- Response envelope: `{ success, message, data }` (lihat semua controller yang ada).
- Error dilempar sebagai `Error` dengan `error.statusCode`, ditangkap oleh `error.middleware.js`.
- Validasi input pakai Zod, didaftarkan lewat `validate.middleware.js`.
- Otorisasi role pakai `authorize(...roles)`, guard kepemilikan (`ownershipGuard`) ditulis manual di
  service seperti pola pada `registration.service.js`.
- **Perubahan status registrasi HARUS lewat `transitionStatus()`**, tidak pernah update kolom `status`
  langsung dari modul lain. Ini prinsip dari `IMPLEMENTATION.md` §5 ("Transisi ilegal ditolak
  server-side") dan harus dipertahankan meski logic pindah ke 4 modul baru ini.

> **Update (berdasarkan SOP Verifikasi Mushaf Al-Qur'an resmi):** ditemukan bug pada
> `TRANSITION_POLICY` yang sudah ada — lihat §0 di bawah, ini WAJIB diperbaiki sebelum lanjut ke
> modul-modul baru, karena menyangkut titik approval Kepala LPMQ yang pertama dari dua titik yang
> selama ini jadi pertanyaan terbuka.

Urutan modul di bawah mengikuti urutan alur registrasi:

```
... AWAITING_PAYMENT → PAYMENT_VERIFICATION → WAITING_DISTRIBUTION
  → TASHIH_IN_PROGRESS → READY_FOR_STT → STT_ISSUED
  → DOCUMENTATION_IN_PROGRESS → COMPLETED
```

---

## 0. Perbaikan Wajib: `TRANSITION_POLICY` (file yang SUDAH ADA)

Berdasarkan SOP Verifikasi Mushaf Al-Qur'an resmi (langkah 4): yang **menyetujui atau menolak**
draf surat pemberitahuan hasil verifikasi adalah **Kepala LPMQ**, bukan Verifikator sendiri.
Verifikator hanya menyusun draf (langkah 3). Kode yang ada sekarang salah — verifikator seolah
menyetujui pekerjaannya sendiri, cacat kontrol internal.

**File**: `backend/src/services/registration.service.js`

Hasil pencocokan dengan `docs/SOP Verifikasi Mushaf Al-Quran.xlsx`, sheet
`3. SOP Pendaftaran Mushaf`, langkah 4 (B9): penolakan draf dikembalikan kepada
**verifikator**. Karena itu, state aplikasi harus kembali ke `IN_VERIFICATION`;
`REVISION_REQUIRED` tetap khusus perbaikan oleh penerbit.

```js
WAITING_VERIFICATION_APPROVAL: {
  AWAITING_PAYMENT: {
    allowedRoles: ['KEPALA_LPMQ'],
    description: 'Kepala LPMQ menyetujui hasil verifikasi untuk dilanjutkan ke pembayaran',
  },
  IN_VERIFICATION: {
    allowedRoles: ['KEPALA_LPMQ'],
    description: 'Kepala LPMQ mengembalikan draf surat kepada verifikator untuk diperbaiki',
  },
},
```

Alasan pengembalian wajib diisi. Penugasan verifikator lama tetap dipertahankan;
Kepala LPMQ tidak dibuat menjadi verifikator baru. `SUPERADMIN` tanpa peran
`KEPALA_LPMQ` tidak dapat menyetujui atau mengembalikan draf sebagai pengganti
pejabat. Mekanisme delegasi tetap menunggu rapat stakeholder.

Perbaikan role dan state di atas sudah diterapkan. Ini belum merupakan implementasi
penuh surat bernomor, tanda tangan, dan pengiriman pada §0.1.

Ini juga menjawab satu dari 4 pertanyaan terbuka Anda: **dua titik approval Kepala LPMQ** adalah
(1) persetujuan draf surat hasil verifikasi (di sini), dan (2) penetapan STT (§4 dokumen).
Keduanya butuh mekanisme delegasi yang sama kalau beliau berhalangan — jadi kalau nanti SOP
delegasi disahkan, satu solusi cukup untuk dua titik ini.

---

## 0.1 Modul Dokumen Tahap Verifikasi (Nota Dinas & Surat Pemberitahuan)

**Status: kebutuhan dokumen disebut SOP; endpoint di bagian ini masih rancangan dan
belum diimplementasikan.** Keputusan Kepala atas kelayakan *draf surat* berbeda dari
hasil verifikasi naskah LOLOS/TIDAK_LOLOS. Surat yang disetujui Kepala tidak otomatis
berarti naskah lolos atau boleh ditagih; guard pembayaran harus memeriksa hasil naskah
ketika modul surat ini diterapkan.

SOP menyebut dua dokumen resmi bernomor di tahap verifikasi yang **belum ada modelnya** di schema
sekarang — cuma tertampung sebagai `StatusHistory.notes` (teks bebas, tidak bisa dicetak/diarsip
sebagai surat resmi):

1. **Nota Dinas Verifikasi Mushaf Al-Qur'an** — dibuat saat berkas diteruskan ke verifikator
   (langkah 2 SOP).
2. **Surat Pemberitahuan Hasil Verifikasi** — draf oleh verifikator (langkah 3), disahkan Kepala
   LPMQ (langkah 4), dikirim ke penerbit (langkah 5).

### Opsi desain
Daripada bikin model baru terpisah, model `OfficialDocument` yang sudah ada di schema **bisa
dipakai ulang** dengan menambah dua nilai baru di `document_type`:

```
document_type: BERITA_ACARA_TASHIH | SURAT_TANDA_TASHIH
             | NOTA_DINAS_VERIFIKASI | SURAT_PEMBERITAHUAN_VERIFIKASI   // ← tambahan
```

Keuntungan: infrastruktur nomor dokumen, versioning, `DocumentSignatory`, dan `qr_token` sudah ada,
tinggal dipakai. Tidak perlu bikin model+migration+service+controller terpisah dari nol.

### Endpoints tambahan (masuk ke `document.service.js`/`document.controller.js` yang sudah
direncanakan di §4, cukup tambah case baru, bukan file baru)

#### `POST /registrations/:id/nota-dinas`
- **Role**: `VERIFIKATOR`, `SUPERADMIN`
- **Prasyarat**: `Registration.status === 'IN_VERIFICATION'` (baru mulai diproses verifikator)
- **Logic**: buat `OfficialDocument(document_type: 'NOTA_DINAS_VERIFIKASI', status: 'ISSUED')` —
  ini dokumen internal, tidak butuh `DocumentSignatory` (tidak disebut ada tanda tangan khusus di
  SOP untuk nota dinas, cuma dokumen serah terima internal).

#### `POST /registrations/:id/surat-pemberitahuan`
Draf oleh verifikator, sesuai langkah 3.
- **Role**: `VERIFIKATOR`, `SUPERADMIN`
- **Prasyarat**: `Registration.status === 'IN_VERIFICATION'`, hasil review sudah ditentukan
  (`decision: 'LOLOS' | 'TIDAK_LOLOS'` — kalau tidak lolos, isi alasan wajib)
- **Logic**: buat `OfficialDocument(document_type: 'SURAT_PEMBERITAHUAN_VERIFIKASI', status: 'DRAFT')`
  + `DocumentSignatory` untuk Kepala LPMQ, lalu `transitionStatus(reg.id, 'WAITING_VERIFICATION_APPROVAL', ...)`.

#### `POST /official-documents/:id/sign` (endpoint yang sama dari §4, dipakai ulang)
Kepala LPMQ menyetujui/menolak di sini — **sama persis pola tanda tangan BA/STT**, cuma beda
`document_type`. Setelah `SIGNED`:
- Kalau approve → `transitionStatus(reg.id, 'AWAITING_PAYMENT', ...)`
- Kalau reject (`signing_status: 'REJECTED'`, wajib isi `notes` alasan) →
  `transitionStatus(reg.id, 'IN_VERIFICATION', ...)` — draf dikembalikan ke verifikator, **bukan**
  ke penerbit. Wajib menyimpan alasan dan mempertahankan penugasan verifikator (lihat §0).

#### `POST /official-documents/:id/send-to-publisher`
Langkah 5 SOP — verifikator kirim surat yang sudah disahkan ke penerbit.
- **Role**: `VERIFIKATOR`, `SUPERADMIN`
- **Prasyarat**: `OfficialDocument.status === 'SIGNED'`
- **Logic**: update `status: 'ISSUED'`, kirim `Notification` ke penerbit
  (`type: 'STATUS_UPDATE'`, payload berisi hasil lolos/tidak + link tagihan kalau lolos). Kalau
  lolos, ini juga titik yang tepat untuk memicu pembuatan `PaymentRecord` (§1) — bisa otomatis di
  sini, atau tetap manual lewat `POST /registrations/:id/billing`, tergantung preferensi UX Anda.

### Catatan tambahan dari SOP yang perlu masuk validasi
- **SLA per langkah eksplisit** dari SOP: verifikasi 2 hari (langkah 3), approval Kepala LPMQ
  30 menit (langkah 4), kirim surat 30 menit (langkah 5), bayar 7 hari (langkah 6), cek bayar
  30 menit (langkah 7). Field `duration_initial` yang ada sekarang cuma satu angka SLA gabungan
  (15 hari) — kalau mau presisi sesuai SOP, breakdown SLA per sub-langkah ini idealnya dicatat
  terpisah (bisa di `Assignment.due_at` untuk tiap tahap, bukan cuma satu SLA besar di
  `fee_sla_snapshot`).
- **Print out fisik wajib** (langkah 1: "print out master mushaf Al-Qur'an dalam ukuran A4 dengan
  dijilid per juz ke LPMQ") — ini bukti fisik yang harus diterima LPMQ sebelum verifikasi bisa
  mulai. Perlu field tracking sederhana, mis. `Registration.physical_document_received_at`, atau
  pakai pola `DocumentationItem` yang sudah ada (item_type baru: `PHYSICAL_MASTER_FOR_VERIFICATION`)
  supaya konsisten dengan pola tracking fisik yang sudah dipakai di tahap dokumentasi akhir.

---

## 1. Modul Payment (PNBP)

### Model yang sudah ada (schema.prisma)
`PaymentRecord` — sudah lengkap fieldnya (billing_no, amount, status, receipt_file_id, provider,
external_ref/NTPN, sync_status). Belum ada service/controller/route sama sekali.

### File baru
```
backend/src/services/payment.service.js
backend/src/controllers/payment.controller.js
backend/src/routes/payment.routes.js
backend/src/validators/payment.validator.js
```
Daftarkan di `routes/index.js`: `router.use('/payments', paymentRoutes);`

### Endpoints

#### `POST /registrations/:id/billing`
Generate tagihan PNBP dari `fee_sla_snapshot` yang sudah tersimpan saat submit.

- **Role**: `VERIFIKATOR`, `SUPERADMIN`
- **Prasyarat status registrasi**: `AWAITING_PAYMENT` (kalau bukan, lempar 400)
- **Body**: tidak perlu — `amount` diambil dari `reg.fee_sla_snapshot.total_fee`, jangan terima
  `amount` dari klien (mencegah manipulasi tarif).
- **Logic**:
  1. Cek belum ada `PaymentRecord` aktif (status != CANCELLED/EXPIRED) untuk registrasi ini →
     kalau ada, 409 "Tagihan sudah diterbitkan".
  2. `billing_no` di-generate deterministik, mis. `PNBP-{registration_no}-{seq}` (pola sama seperti
     `generateRegistrationNo` di `registration.service.js` — retry loop untuk P2002).
  3. Buat `PaymentRecord` status `UNPAID`, `provider: MANUAL` (Simponi jadi adapter kosong dulu,
     sesuai `IMPLEMENTATION.md` Sprint 3: "Sediakan port/adapter SIMPONI tanpa memanggil layanan
     eksternal pada MVP").
  4. Audit log `CREATE_BILLING`.
- **Response 201**: object `PaymentRecord`.

#### `POST /payments/:id/proof`
Penerbit unggah bukti bayar.

- **Role**: `ADMIN_PENERBIT` (ownership guard: `payment.registration.publisher_id === user.publisherId`),
  `SUPERADMIN`
- **Body**: `{ receipt_file_id: string, external_ref?: string }` (external_ref = NTPN kalau ada)
- **Prasyarat**: `PaymentRecord.status === 'UNPAID'`
- **Logic**:
  1. Update `receipt_file_id`, `external_ref`, `status: 'PAID'`, `paid_at: now()`.
  2. **Trigger** `registrationService.transitionStatus(reg.id, 'PAYMENT_VERIFICATION', ..., user, req)`
     — jangan set status registrasi manual, pakai fungsi yang sudah ada supaya
     `TRANSITION_POLICY` dan `StatusHistory` tetap konsisten.
- **Response 200**: object `PaymentRecord` + registrasi terbaru.

#### `PATCH /payments/:id/verify`
Verifikator konfirmasi pembayaran lunas & sah.

- **Role**: `VERIFIKATOR`, `SUPERADMIN`
- **Body**: `{ decision: 'VERIFIED' | 'REJECTED', notes?: string }`
- **Prasyarat**: `PaymentRecord.status === 'PAID'`
- **Logic**:
  - Jika `VERIFIED`: update `status: 'VERIFIED'`, `verified_at: now()`, lalu
    `transitionStatus(reg.id, 'WAITING_DISTRIBUTION', ...)`.
  - Jika `REJECTED`: update `status: 'UNPAID'` (kembali, minta upload ulang), catat `notes` alasan
    penolakan bukti bayar. **Jangan** transisi registrasi balik ke status sebelumnya — registrasi
    tetap `AWAITING_PAYMENT`/`PAYMENT_VERIFICATION` menunggu bukti baru.
- **Response 200**.

#### `GET /registrations/:id/billing`
List riwayat `PaymentRecord` registrasi (bisa lebih dari satu kalau ada penolakan bukti bayar
sebelumnya). Role: pemilik penerbit (ownership guard) + semua role internal + SUPERADMIN.

### Catatan kritis implementasi
- **Jangan** biarkan endpoint mana pun menerima `amount` dari body request — selalu dihitung ulang
  dari `fee_sla_snapshot` di server. Ini celah manipulasi tarif paling gampang kalau lengah.
- `sync_status` field disiapkan untuk sinkronisasi Simponi masa depan — biarkan `NOT_SYNCED` di MVP,
  jangan diisi manual, supaya gampang dibedakan mana yang benar-benar tersinkron API resmi nanti.

---

## 2. Modul Distribusi & Assignment

### Model yang sudah ada
`Assignment` (registration_id, team_id, assignee_id, stage, iteration, due_at, status),
`DistributionTeam`, `TeamMember`.

### File baru
```
backend/src/services/assignment.service.js
backend/src/controllers/assignment.controller.js
backend/src/routes/assignment.routes.js
backend/src/validators/assignment.validator.js
```

### Endpoints

#### `POST /registrations/:id/assignments`
Distributor membentuk penugasan ke tim & anggota untuk memulai sidang tashih.

- **Role**: `DISTRIBUTOR`, `SUPERADMIN`
- **Prasyarat status registrasi**: `WAITING_DISTRIBUTION`
- **Body**:
  ```json
  {
    "team_id": "uuid",
    "assignee_ids": ["uuid", "uuid"],
    "stage": "INITIAL",
    "due_at": "2026-10-01T00:00:00Z"
  }
  ```
- **Validasi**:
  - `team_id` harus `DistributionTeam.status === 'ACTIVE'` dan `active_to` belum lewat (kalau ada).
  - Semua `assignee_ids` harus anggota (`TeamMember`) dari `team_id` tersebut — **jangan** izinkan
    assign user di luar SK tim (sesuai catatan Anda: "Team formation is based on existing SK").
  - `stage` harus konsisten dengan `iteration`: `INITIAL` → iteration 1 otomatis; kalau distributor
    mau assign `REVISION`/`DUMMY`, harus ada `Assignment` sebelumnya dengan hasil
    `REVISION_REQUIRED` di stage terkait (cegah lompat stage).
  - **due_at dihitung dari `WorkingDay`**, bukan kalender biasa — pakai `duration_initial`/
    `duration_revision`/`duration_dummy` dari `fee_sla_snapshot` registrasi + fungsi hitung hari
    kerja terhadap tabel `WorkingDay`. Kalau `due_at` dikirim manual oleh distributor, validasi tetap
    tidak boleh melebihi SLA resmi.
- **Logic**: buat N `Assignment` (satu per assignee, sesuai catatan "buat penugasan untuk setiap
  anggota terkait; tidak ada ketua kelompok pada logika bisnis" dari `IMPLEMENTATION.md` Sprint 4),
  lalu `transitionStatus(reg.id, 'TASHIH_IN_PROGRESS', ...)`.
- **Response 201**: array `Assignment`.

#### `GET /assignments?my_tasks=true`
List assignment milik user login (dipakai filter "Tugas Saya" — pola sama seperti
`listRegistrations` yang sudah ada). Role: `PENTASHIH`, `DISTRIBUTOR`, `SUPERADMIN`.

#### `PATCH /assignments/:id/status`
Pentashih mulai kerja / tandai in-progress (bukan hasil final, itu di modul Tashih Review §3).

- **Role**: assignee sendiri (`assignment.assignee_id === user.id`), `SUPERADMIN`
- **Body**: `{ status: 'IN_PROGRESS' }`

### Catatan kritis implementasi
- **Tidak ada overwrite** terhadap `Assignment` iterasi sebelumnya (`IMPLEMENTATION.md` Sprint 4)
  — setiap iterasi baru = row `Assignment` baru dengan `iteration + 1`, bukan update row lama.
  Ini penting untuk audit trail "siapa mengerjakan revisi ke berapa".
- Job SLA (`OVERDUE`) yang saya sebut di analisis sebelumnya idealnya nempel di modul ini: cron
  harian yang scan `Assignment` dengan `status IN (ASSIGNED, IN_PROGRESS)` dan `due_at < today`
  (hitung working day), lalu update `status: 'OVERDUE'` + kirim `Notification`.

---

## 3. Modul Sidang Tashih (TashihReview)

### Model yang sudah ada
`TashihReview` (assignment_id, result, notes, completed_at) — relasi 1 assignment bisa punya
banyak review? Cek schema: `Assignment.reviews TashihReview[]` — jadi **bisa lebih dari satu**,
tapi secara bisnis harusnya cuma 1 review final per assignment. Perlu keputusan desain: apakah
`TashihReview` dipakai untuk mencatat progres bertahap per anggota tim dalam satu assignment, atau
memang 1:1. Rekomendasi saya: **1 review = 1 hasil final assignment**, kalau butuh multiple opinion
dari anggota tim berbeda, itu sudah tertampung karena tiap anggota punya `Assignment` sendiri
(lihat §2 — assign per orang, bukan per tim).

### File baru
```
backend/src/services/tashih.service.js
backend/src/controllers/tashih.controller.js
backend/src/routes/tashih.routes.js
backend/src/validators/tashih.validator.js
```

### Endpoints

#### `POST /assignments/:id/review`
Pentashih mencatat hasil sidang untuk assignment miliknya.

- **Role**: assignee sendiri, `SUPERADMIN`
- **Prasyarat**: `Assignment.status IN ('ASSIGNED', 'IN_PROGRESS')`, belum ada `TashihReview` untuk
  assignment ini.
- **Body**: `{ result: 'PASSED' | 'REVISION_REQUIRED' | 'REJECTED', notes: string }`
  (`notes` wajib diisi kalau `result !== 'PASSED'` — validasi di Zod `.superRefine`, pola sama
  seperti `createRegistrationSchema` yang sudah ada untuk EXTENSION).
- **Logic**: buat `TashihReview`, update `Assignment.status = 'COMPLETED'`.
  **Tidak langsung transisi status registrasi di sini** — itu keputusan distributor (lihat endpoint
  berikutnya), karena satu registrasi bisa punya beberapa `Assignment` paralel (beberapa pentashih)
  yang perlu dikumpulkan dulu hasilnya sebelum registrasi lanjut.

#### `POST /registrations/:id/tashih-decision`
Distributor mereviu kumpulan hasil `TashihReview` dari semua assignment aktif registrasi, lalu
memutuskan langkah berikutnya — ini persis yang disebut di `IMPLEMENTATION.md` Sprint 4:
"Distributor mereviu rekomendasi pentashih/pembaca naskah dan memilih lanjut STT, baca ulang,
perbaikan penerbit, atau dumi."

- **Role**: `DISTRIBUTOR`, `SUPERADMIN`
- **Prasyarat**: semua `Assignment` aktif registrasi (stage & iteration terkini) berstatus
  `COMPLETED` dengan `TashihReview` terisi — kalau belum semua selesai, 400.
- **Body**: `{ decision: 'READY_FOR_STT' | 'REVISION_REQUIRED' | 'DUMMY', notes: string }`
- **Logic**:
  - `READY_FOR_STT` → `transitionStatus(reg.id, 'READY_FOR_STT', ...)`.
  - `REVISION_REQUIRED` → `transitionStatus(reg.id, 'REVISION_REQUIRED', ...)` **plus** catatan:
    ini kembali ke penerbit untuk perbaikan naskah, beda dengan `DUMMY` yang minta iterasi tashih
    ulang internal.
  - `DUMMY` → tidak ada di `TRANSITION_POLICY` yang sudah ada sekarang! **Ini gap** —
    `Assignment.stage` sudah punya nilai `DUMMY`, tapi `TRANSITION_POLICY['TASHIH_IN_PROGRESS']`
    di `registration.service.js` cuma punya 2 opsi (`READY_FOR_STT`, `REVISION_REQUIRED`). Perlu
    diputuskan: apakah DUMMY itu sub-alur dalam `TASHIH_IN_PROGRESS` (assignment baru stage=DUMMY,
    status registrasi tidak berubah), atau butuh status baru. Saran: **jangan ubah status
    registrasi untuk kasus DUMMY**, cukup buat `Assignment` baru dengan `stage: 'DUMMY'` — status
    registrasi tetap `TASHIH_IN_PROGRESS` sampai hasil dumi keluar. Ini konsisten dengan makna
    "dumi/perpanjangan" di SOP Anda (SLA dumi 3 hari, bukan siklus penuh ulang).

### Catatan kritis implementasi
- Endpoint `/tashih-decision` **wajib** validasi kelengkapan semua assignment sebelum boleh
  diputuskan — kalau tidak, distributor bisa "lompat" mengambil keputusan padahal masih ada
  pentashih yang belum submit hasil.

---

## 4. Modul Dokumen Resmi (Berita Acara & Surat Tanda Tashih)

### Model yang sudah ada
`OfficialDocument` (document_type, document_no, version, status, qr_token, valid_until),
`DocumentSignatory` (signer_user_id, name_position_snapshot, method, signing_status).

⚠️ **Perlu klarifikasi sebelum implementasi**: `IMPLEMENTATION.md` Sprint 2 menyebut "Bentuk Berita
Acara Tashih, lalu sediakan persetujuan/pengembalian oleh Kepala LPMQ" — tapi itu ditulis di bagian
*sebelum* pembayaran/distribusi/tashih, padahal secara isi Berita Acara Tashih (yang memuat hasil
sidang, matriks distribusi, rekomendasi verifikator — lihat Sprint 5) baru bisa dibuat **setelah**
sidang tashih selesai. Kemungkinan ini salah ketik dokumen atau memang ada dua Berita Acara berbeda
di tahap berbeda (satu untuk verifikasi awal, satu untuk hasil tashih). **Ini salah satu dari 4
pertanyaan terbuka Anda ("Detail SOP Penerbitan Surat Tanda Tashih") — sebaiknya dikonfirmasi ke
stakeholder dulu sebelum modul ini dibangun**, karena akan menentukan di status apa endpoint
`POST .../berita-acara` boleh dipanggil.

Desain di bawah saya buat mengikuti urutan status yang sudah dikodekan di `TRANSITION_POLICY`
(`READY_FOR_STT → STT_ISSUED`), yaitu Berita Acara terbit **setelah** tashih selesai:

### File baru
```
backend/src/services/document.service.js
backend/src/controllers/document.controller.js
backend/src/routes/document.routes.js
backend/src/validators/document.validator.js
```

### Endpoints

#### `POST /registrations/:id/berita-acara`
Generate draft Berita Acara Tashih dari data sistem (identitas naskah, tarif, matriks distribusi,
rekomendasi — sesuai `IMPLEMENTATION.md` Sprint 5).

- **Role**: `DISTRIBUTOR`, `SUPERADMIN`
- **Prasyarat**: `Registration.status === 'READY_FOR_STT'`, belum ada `OfficialDocument` tipe
  `BERITA_ACARA_TASHIH` versi aktif untuk registrasi ini.
- **Logic**: kumpulkan data dari `Assignment` + `TashihReview` + `VerificationAssignment` terkait,
  generate `document_no` deterministik, buat `OfficialDocument(status: 'DRAFT')`, lalu buat
  `DocumentSignatory` untuk penanda tangan yang disahkan. **Usulan ketua kelompok tashih
  masih menunggu penyelarasan saat rapat stakeholder; belum mengaktifkan tanda tangan BA.**
- **Response 201**: object `OfficialDocument` + `DocumentSignatory[]`.

#### `POST /official-documents/:id/sign`
Penandatanganan oleh signatory yang ditunjuk.

- **Role**: `signer_user_id === user.id` (ownership guard personal, bukan role-based)
- **Body**: `{ method: 'DIGITAL' | 'MANUAL', external_signature_id?: string }`
- **Logic**: update `DocumentSignatory.signing_status = 'SIGNED'`, `signed_at: now()`. Kalau semua
  signatory dokumen ini sudah `SIGNED` → update `OfficialDocument.status = 'SIGNED'`.
  **Berita Acara yang sudah SIGNED tidak otomatis mengubah status registrasi** — itu baru terjadi
  saat STT diterbitkan (endpoint berikut), karena Berita Acara adalah bukti pendukung, bukan
  dokumen final untuk penerbit.

#### `POST /registrations/:id/stt`
Kepala LPMQ menetapkan & menerbitkan Surat Tanda Tashih.

- **Role**: `KEPALA_LPMQ`, `SUPERADMIN`
- **Prasyarat**: `Registration.status === 'READY_FOR_STT'` **dan** Berita Acara terkait sudah
  `status: 'SIGNED'` (jangan izinkan STT terbit tanpa BA sah — ini guard bisnis yang wajib, bukan
  cuma guard status registrasi).
- **Logic**:
  1. Buat `OfficialDocument(document_type: 'SURAT_TANDA_TASHIH', valid_until: now() + 2 tahun)`
     — field `valid_until` sudah dikomentari di schema sebagai "BR-20: 2 tahun".
  2. Buat `DocumentSignatory` untuk Kepala LPMQ.
  3. Setelah signed → `status: 'ISSUED'`, `issued_at: now()`.
  4. `transitionStatus(reg.id, 'STT_ISSUED', ...)`.
  5. Kirim `Notification` ke penerbit (`type: 'DOCUMENT_ISSUED'`) — ini pertanyaan terbuka Anda
     ("notifikasi STT terbit ke penerbit"), minimal versi MVP-nya insert row `Notification`, detail
     channel (email/WA/in-app) menyusul.
- **⚠️ Soal delegasi Kepala LPMQ** (pertanyaan terbuka Anda): kalau delegasi belum disahkan SOP-nya,
  `IMPLEMENTATION.md` sendiri sudah bilang **"gunakan feature flag dan jangan mengarang rule
  delegasi"**. SUPERADMIN teknis tidak menjadi pengganti Kepala. Jangan tambah role "Plt"
  atau hak penetapan pengganti sebelum ada kepastian dari stakeholder.

#### `GET /public/verify-document/:token` (sudah ada controllernya, perlu diisi logicnya)
Endpoint publik ini sudah ada route-nya di `public.routes.js` tapi perlu dipastikan
`public.controller.js` benar-benar query ke `OfficialDocument` by `qr_token` dan **hanya**
mengembalikan metadata terbatas (nomor dokumen, nama naskah, status, masa berlaku) — **jangan**
expose data penerbit lengkap, NIP verifikator, atau riwayat internal lain di endpoint publik ini.

#### `POST /registrations/:id/documentation`
Dokumentator mencatat penerimaan eksemplar fisik & arsip master.

- **Role**: `DOKUMENTATOR`, `SUPERADMIN`
- **Prasyarat**: `Registration.status === 'STT_ISSUED'`
- **Body**: `{ item_type, quantity_actual, file_id? }`
- **Logic**: update `DocumentationItem`. Untuk `service_kind` digital/audio-visual, `item_type`
  fisik otomatis `status: 'NOT_APPLICABLE'` (sesuai catatan Anda: fisik non-blocking, hanya untuk
  cetak). Kekurangan eksemplar **tidak boleh memblokir** transisi ke `COMPLETED` — validasi ini
  penting supaya dokumentator tidak sengaja bikin field required yang menghambat penyelesaian.
- Setelah semua item checklist selesai (atau di-waive) → `transitionStatus(reg.id, 'COMPLETED', ...)`.

### Catatan kritis implementasi
- Urutan **BA sah → STT terbit** harus jadi *hard guard* di service, bukan cuma di UI — kalau tidak,
  ada celah Kepala LPMQ menandatangani STT tanpa Berita Acara yang sah sama sekali.
- `qr_token` sudah `@default(uuid())` di schema — pastikan endpoint publik tidak bisa dipakai untuk
  enumerasi dokumen (uuid v4 aman dari brute-force, tapi tetap terapkan rate limit di endpoint
  publik ini karena tidak ada auth sama sekali).

---

## Ringkasan Perubahan pada File yang Sudah Ada

| File | Perubahan |
|---|---|
| `TRANSITION_POLICY` (`registration.service.js`) | Tambah handling untuk kasus DUMMY (lihat §3) — putuskan dulu apakah ini sub-alur atau status baru |
| `routes/index.js` | Daftarkan 4 router baru: `/payments`, `/assignments`, `/tashih`, `/official-documents` atau `/documents` |
| `middlewares/rateLimiter.middleware.js` | Tambah limiter baru untuk `/public/verify-document/:token` (tanpa auth, rawan abuse) |
| `services/audit.service.js` | Pastikan dipanggil di setiap logic penerbitan dokumen resmi — ini yang paling butuh audit trail kuat secara legal |
| `public.controller.js` | Cek/lengkapi implementasi verifikasi QR agar hanya expose metadata terbatas |

Sebelum mulai coding, dua hal yang sebaiknya dikonfirmasi dulu ke stakeholder supaya tidak salah
arah (biar tidak perlu refactor besar nanti):
1. Kasus `DUMMY` di §3 — sub-alur atau status terpisah?
2. Timing Berita Acara Tashih yang sebenarnya (sebelum vs sesudah sidang tashih) — ada indikasi
   inkonsistensi antara `IMPLEMENTATION.md` Sprint 2 dan Sprint 5.
