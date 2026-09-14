# Backlog Implementasi Codex — SOP Verifikasi Mushaf Al-Qur'an

**Status sumber:** SOP Verifikasi final  
**Tanggal SOP:** 10 September 2026  
**Target repository:** `farisifakhri/lpmqtashihhub`  
**Cakupan dokumen:** modul verifikasi sampai serah-terima master kepada distributor  
**Di luar cakupan:** detail pentashihan, penerbitan STT, dan dokumentasi pasca-STT; backlog modul tersebut menyusul setelah SOP masing-masing tersedia.

## 1. Tujuan implementasi

Menerapkan delapan langkah SOP Verifikasi sebagai alur digital yang:

- mempertahankan keterlibatan Penerbit, Kepala LPMQ, Verifikator, dan Distributor;
- mencatat dokumen digital serta pergerakan master mushaf fisik;
- menerapkan SLA setiap langkah sebagai target pemantauan, bukan pemblokir otomatis;
- membatasi aksi berdasarkan peran dan kewenangan;
- menyimpan riwayat status, dokumen, notifikasi, dan audit log;
- berhenti pada keluaran `master siap tashih` dan penyerahan konteks kepada modul Pentashihan.

## 2. Aturan bisnis kanonik

| ID | Aturan bisnis | Implikasi sistem |
|---|---|---|
| BR-VER-001 | SOP Verifikasi berlaku untuk seluruh kategori mushaf. | Jangan membatasi workflow berdasarkan kategori atau jenis layanan. |
| BR-VER-002 | Penerbit mengisi pendaftaran di aplikasi dan menyerahkan print-out master ukuran A4 yang dijilid per juz. | Bedakan berkas digital dengan serah-terima master fisik. |
| BR-VER-003 | Kepala LPMQ menerima pengajuan dan meneruskannya kepada verifikator. | Verifikator tidak boleh mengambil sendiri pengajuan yang belum ditugaskan. |
| BR-VER-004 | Penerusan kepada verifikator menghasilkan Nota Dinas Verifikasi. | Nota dinas harus memiliki nomor, versi, status, pembuat, penerima, dan waktu penerbitan. |
| BR-VER-005 | Verifikator memeriksa pendaftaran dan master fisik, kemudian menyusun draf surat hasil verifikasi beserta lampiran jika lolos. | Checklist pemeriksaan, kesimpulan, catatan, draf surat, dan lampiran disimpan sebagai satu hasil verifikasi berversi. |
| BR-VER-006 | Kepala LPMQ menyetujui atau menolak draf. | Aksi persetujuan dan pengembalian draf hanya milik Kepala LPMQ; penolakan wajib disertai alasan. |
| BR-VER-007 | Draf yang disetujui ditandatangani Kepala LPMQ dan dikembalikan kepada verifikator. | Persetujuan tidak langsung mengirim surat kepada penerbit. Harus ada tahap menunggu pengiriman oleh verifikator. |
| BR-VER-008 | Verifikator mengirim surat hasil verifikasi kepada penerbit. | Sistem mencatat kanal, penerima, waktu, dan pelaku pengiriman. |
| BR-VER-009 | Penerbit melakukan pembayaran memakai kode billing dan mengonfirmasi pembayaran. | Tagihan, bukti pembayaran, NTPN/referensi, serta batas waktu tujuh hari harus tercatat. |
| BR-VER-010 | Verifikator memeriksa pembayaran PNBP sebelum menyerahkan master kepada distributor. | Verifikasi pembayaran dan serah-terima master merupakan dua fakta yang harus tercatat. |
| BR-VER-011 | Distributor menerima master dan menentukan tenggat proses pentashihan. | Penerimaan fisik dan deadline menjadi keluaran akhir modul Verifikasi. |
| BR-VER-012 | SLA dipakai untuk pemantauan dan pelaporan. | Keterlambatan menandai item `OVERDUE`, tetapi tidak otomatis membatalkan atau melompati proses. |
| BR-VER-013 | Administrator teknis tidak menggantikan kewenangan penetapan Kepala LPMQ. | `SUPERADMIN` tidak boleh menyetujui atau menandatangani surat atas nama Kepala LPMQ. |
| BR-VER-014 | Semua perubahan keputusan, status, dokumen, pembayaran, dan serah-terima diaudit. | Audit mencatat aktor, waktu, nilai sebelum/sesudah, IP, dan user agent. |

## 3. Alur kanonik dan SLA

| Langkah | Aktor | Aktivitas sistem | SLA | Keluaran | Status tujuan yang disarankan |
|---:|---|---|---:|---|---|
| 1 | Penerbit | Login, mengisi formulir, mengirim pendaftaran, dan mencatat penyerahan master fisik | 30 menit | Bukti pendaftaran | `READY_FOR_VERIFICATION` |
| 2 | Kepala LPMQ | Menerima pengajuan, memilih verifikator, dan menerbitkan Nota Dinas Verifikasi | 30 menit | Nota Dinas dan assignment | `VERIFICATION_ASSIGNED` |
| 3 | Verifikator | Memulai pemeriksaan, mengisi checklist, menyusun draf surat serta lampiran, lalu mengajukannya | 2 hari | Draf surat hasil verifikasi | `WAITING_VERIFICATION_APPROVAL` |
| 4a | Kepala LPMQ | Menyetujui dan menandatangani draf | 30 menit | Surat hasil verifikasi disetujui | `VERIFICATION_APPROVED` |
| 4b | Kepala LPMQ | Mengembalikan draf dengan alasan perbaikan | 30 menit | Draf dikembalikan | `IN_VERIFICATION` |
| 5 | Verifikator | Mengirim surat dan lampiran kepada penerbit | 30 menit | Informasi hasil verifikasi terkirim | `AWAITING_PAYMENT` |
| 6 | Penerbit | Melihat billing, membayar, mengunggah bukti, dan mengisi NTPN/referensi | 7 hari | Konfirmasi pembayaran PNBP | `PAYMENT_VERIFICATION` |
| 7 | Verifikator | Memverifikasi pembayaran dan mencatat penyerahan master fisik kepada distributor | 30 menit | Master siap diserahkan | `WAITING_DISTRIBUTOR_RECEIPT` |
| 8 | Distributor | Mengonfirmasi penerimaan master dan menetapkan deadline awal pentashihan | 30 menit | Master siap tashih dan deadline | `WAITING_DISTRIBUTION` atau status awal resmi modul Pentashihan |

### Perubahan state machine yang wajib

Alur repo saat ini terlalu cepat pada tiga bagian berikut:

1. `READY_FOR_VERIFICATION → IN_VERIFICATION` saat ini dapat dilakukan langsung oleh Verifikator. Ubah menjadi penugasan oleh Kepala LPMQ lebih dahulu.
2. `WAITING_VERIFICATION_APPROVAL → AWAITING_PAYMENT` saat ini melewati aksi pengiriman surat oleh Verifikator. Tambahkan `VERIFICATION_APPROVED`.
3. Verifikasi pembayaran saat ini langsung menghasilkan `WAITING_DISTRIBUTION`. Tambahkan pencatatan serah-terima dan konfirmasi penerimaan master fisik terlebih dahulu.

Status baru yang direkomendasikan:

```text
VERIFICATION_ASSIGNED
VERIFICATION_APPROVED
WAITING_DISTRIBUTOR_RECEIPT
```

Nama status boleh disesuaikan, tetapi tiga kejadian bisnis tersebut tidak boleh kembali digabungkan.

## 4. Backlog implementasi

### Epic A — Sinkronisasi domain dan state machine

- [ ] **VER-A01 — Tambahkan status workflow baru**  
  Tambahkan tiga status rekomendasi ke `RegistrationStatus`, komentar skema, label pengguna, dokumentasi API, dan seluruh validasi status.

- [ ] **VER-A02 — Ubah matriks transisi resmi**  
  Perbarui `TRANSITION_POLICY` sehingga Kepala LPMQ melakukan assignment, Verifikator mengirim hasil, dan Distributor mengonfirmasi penerimaan master.

- [ ] **VER-A03 — Pertahankan authority boundary**  
  Pastikan `SUPERADMIN` tidak dapat menjalankan aksi persetujuan atau tanda tangan yang secara SOP menjadi kewenangan Kepala LPMQ.

- [ ] **VER-A04 — Tambahkan label status Indonesia**  
  Seluruh status baru harus memiliki label, pesan tindakan, empty state, dan pesan kesalahan yang mudah dipahami.

- [ ] **VER-A05 — Buat migrasi Prisma yang aman**  
  Migrasi harus additive terlebih dahulu, tidak menghapus data lama, serta dapat dijalankan oleh `prisma migrate deploy` pada CI.

**Acceptance criteria Epic A**

- Tidak ada jalur dari pendaftaran menuju pembayaran tanpa assignment, pemeriksaan, persetujuan, dan pengiriman surat.
- Transisi ilegal menghasilkan `409` atau `403` dengan pesan pengguna yang jelas.
- Seluruh perubahan status menghasilkan `StatusHistory` dan `AuditLog`.

### Epic B — Pendaftaran dan penerimaan master fisik

- [ ] **VER-B01 — Finalisasi formulir pendaftaran penerbit**  
  Pertahankan data layanan, kategori, judul, jenis pendaftaran, add-on, serta relasi perpanjangan yang sudah ada.

- [ ] **VER-B02 — Tambahkan deklarasi master fisik**  
  Simpan format `A4`, metode jilid `PER_JUZ`, jumlah jilid/volume jika diperlukan, tanggal kirim, metode pengiriman, dan catatan.

- [ ] **VER-B03 — Catat penerimaan awal master oleh LPMQ**  
  Sediakan status `PENDING`, `RECEIVED`, dan `RETURNED`, petugas penerima, waktu, kondisi, serta nomor tanda terima.

- [ ] **VER-B04 — Generate bukti pendaftaran**  
  Bukti memuat nomor registrasi, penerbit, layanan, waktu submit, daftar berkas digital, serta status master fisik tanpa membuka file privat.

- [ ] **VER-B05 — Buat halaman pelacakan penerbit**  
  Tampilkan status digital dan fisik secara terpisah agar penerbit mengetahui apakah formulir sudah masuk dan master sudah diterima.

**Acceptance criteria Epic B**

- Pengajuan tidak boleh masuk assignment sebelum syarat pendaftaran dan penerimaan master yang ditetapkan terpenuhi.
- Berkas digital tersimpan privat dan hanya dapat diakses oleh pemilik serta petugas yang berwenang.
- Semua kategori mushaf memakai workflow yang sama.

### Epic C — Penugasan oleh Kepala LPMQ dan Nota Dinas

- [ ] **VER-C01 — Perluas `VerificationAssignment`**  
  Tambahkan `assigned_by`, `started_at`, `due_at`, `assignment_notes`, dan relasi ke Nota Dinas.

- [ ] **VER-C02 — Buat model dokumen verifikasi**  
  Model minimal mendukung `NOTA_DINAS_VERIFIKASI` dan `SURAT_HASIL_VERIFIKASI`, nomor dokumen, versi, status, snapshot isi, file, pembuat, approver, waktu persetujuan, waktu tanda tangan, dan waktu kirim.

- [ ] **VER-C03 — Buat aksi assignment**  
  Endpoint Kepala LPMQ memilih satu verifikator aktif, membuat Nota Dinas, menghitung due date pemeriksaan, dan memindahkan status ke `VERIFICATION_ASSIGNED` dalam satu transaksi.

- [ ] **VER-C04 — Validasi verifikator**  
  Hanya pengguna aktif dengan role `VERIFIKATOR` yang dapat dipilih.

- [ ] **VER-C05 — Buat inbox Kepala LPMQ**  
  Halaman menampilkan pengajuan siap diteruskan, status master fisik, pilihan verifikator, pratinjau Nota Dinas, dan riwayat assignment.

- [ ] **VER-C06 — Kirim notifikasi assignment**  
  Verifikator menerima notifikasi berisi nomor registrasi, nomor Nota Dinas, waktu penugasan, dan tenggat.

**Acceptance criteria Epic C**

- Verifikator tidak dapat memulai pengajuan yang belum ditugaskan kepadanya.
- Satu assignment aktif hanya memiliki satu verifikator.
- Pembuatan assignment, Nota Dinas, status, notifikasi, dan audit bersifat atomik.

### Epic D — Pemeriksaan dan draf surat hasil verifikasi

- [ ] **VER-D01 — Buat checklist verifikasi berversi**  
  Checklist menyimpan butir, hasil `SESUAI/TIDAK_SESUAI/TIDAK_BERLAKU`, catatan, pemeriksa, dan waktu.

- [ ] **VER-D02 — Tambahkan aksi mulai pemeriksaan**  
  Hanya verifikator yang ditugaskan dapat mengubah `VERIFICATION_ASSIGNED → IN_VERIFICATION`.

- [ ] **VER-D03 — Buat halaman detail pemeriksaan**  
  Tampilkan data pendaftaran, dokumen penerbit, master fisik, checklist, catatan, histori, dan tenggat dua hari.

- [ ] **VER-D04 — Buat draf surat hasil verifikasi**  
  Draf dibuat dari snapshot hasil checklist agar perubahan master data di masa depan tidak mengubah dokumen lama.

- [ ] **VER-D05 — Kelola lampiran**  
  Lampiran dapat ditambahkan ketika diperlukan, tersimpan privat, memiliki versi dan checksum, serta ikut snapshot dokumen.

- [ ] **VER-D06 — Ajukan draf kepada Kepala LPMQ**  
  Validasi seluruh checklist wajib, keputusan, draf surat, dan lampiran yang disyaratkan sebelum transisi ke `WAITING_VERIFICATION_APPROVAL`.

- [ ] **VER-D07 — Terapkan SLA pemeriksaan**  
  Due date dihitung dua hari sesuai kebijakan kalender sistem. Keterlambatan diberi indikator `OVERDUE` tanpa memblokir penyelesaian.

**Acceptance criteria Epic D**

- Hasil pemeriksaan bersifat append-only atau berversi; versi yang telah diajukan tidak boleh ditimpa.
- Pengajuan milik verifikator lain tidak dapat dibaca atau diubah kecuali ada kewenangan eksplisit.
- Draf belum disetujui tidak dapat dilihat penerbit.

### Epic E — Persetujuan Kepala LPMQ

- [ ] **VER-E01 — Buat antrean persetujuan**  
  Kepala LPMQ melihat draf, checklist, lampiran, riwayat revisi, identitas verifikator, dan SLA.

- [ ] **VER-E02 — Implementasikan aksi setujui**  
  Aksi mengunci versi draf, mencatat approver, menyiapkan tanda tangan, dan memindahkan status ke `VERIFICATION_APPROVED`.

- [ ] **VER-E03 — Implementasikan aksi kembalikan**  
  Alasan wajib diisi; sistem membuat histori revisi dan mengembalikan pengajuan ke `IN_VERIFICATION` tanpa menghapus versi sebelumnya.

- [ ] **VER-E04 — Siapkan adapter tanda tangan**  
  Gunakan interface/adapter agar metode manual atau BSrE dapat dipasang kemudian. Jangan membuat integrasi BSrE palsu atau menanam kredensial.

- [ ] **VER-E05 — Notifikasi hasil persetujuan**  
  Setelah disetujui atau dikembalikan, verifikator menerima notifikasi beserta tindak lanjut yang diperlukan.

**Acceptance criteria Epic E**

- Hanya Kepala LPMQ yang dapat menyetujui dan menandatangani.
- Dokumen yang disetujui tidak dapat diedit langsung; perbaikan menghasilkan versi baru.
- Pengembalian draf selalu menyimpan alasan dan identitas pengembali.

### Epic F — Pengiriman surat kepada penerbit

- [ ] **VER-F01 — Buat antrean surat siap kirim**  
  Verifikator melihat dokumen berstatus disetujui yang belum dikirim.

- [ ] **VER-F02 — Implementasikan aksi kirim**  
  Catat kanal, alamat tujuan, waktu kirim, pelaku, dan versi dokumen. Untuk MVP, kanal aplikasi/in-app wajib tersedia; email dapat menjadi adapter.

- [ ] **VER-F03 — Buka akses penerbit setelah pengiriman**  
  Penerbit hanya dapat melihat surat hasil verifikasi dan lampirannya setelah aksi kirim berhasil.

- [ ] **VER-F04 — Buat notifikasi penerbit**  
  Notifikasi memuat hasil verifikasi, tautan aman ke dokumen, billing aktif, nominal, dan tenggat pembayaran.

- [ ] **VER-F05 — Pindahkan status ke pembayaran**  
  Setelah pengiriman berhasil, pindahkan `VERIFICATION_APPROVED → AWAITING_PAYMENT` dan aktifkan billing.

**Acceptance criteria Epic F**

- Persetujuan Kepala tidak otomatis dianggap sebagai pengiriman kepada penerbit.
- Aksi kirim idempoten; pengulangan request tidak mengirim atau mencatat dokumen dua kali.
- Dokumen privat tidak dapat diakses melalui URL publik tanpa otorisasi.

### Epic G — Billing dan konfirmasi pembayaran PNBP

- [ ] **VER-G01 — Tambahkan masa berlaku tagihan**  
  Tambahkan `due_at/expires_at` tujuh hari dan status tampilan `AKTIF`, `MENUNGGU_VERIFIKASI`, `LUNAS`, atau `KEDALUWARSA`.

- [ ] **VER-G02 — Pertahankan snapshot tarif**  
  Nominal tagihan wajib berasal dari `fee_sla_snapshot`, bukan master tarif terbaru.

- [ ] **VER-G03 — Tampilkan billing pada portal penerbit**  
  Tampilkan kode billing, nominal, batas waktu, petunjuk, serta status pembayaran.

- [ ] **VER-G04 — Konfirmasi pembayaran**  
  Penerbit mengunggah bukti privat dan mengisi NTPN/referensi pembayaran. Validasi kepemilikan pengajuan dan kepemilikan file.

- [ ] **VER-G05 — Antrean pemeriksaan pembayaran**  
  Verifikator melihat tagihan yang menunggu verifikasi beserta bukti, nominal, referensi, dan waktu konfirmasi.

- [ ] **VER-G06 — Implementasikan keputusan pembayaran**  
  Sediakan aksi `VERIFIED` dan aksi pengembalian/koreksi bukti dengan alasan; jangan hanya menyediakan jalur sukses.

- [ ] **VER-G07 — Tangani kedaluwarsa tanpa asumsi pembatalan**  
  Lewat tujuh hari tandai overdue/expired untuk pelaporan. Jangan otomatis membatalkan pengajuan sebelum ada kebijakan resmi.

**Acceptance criteria Epic G**

- Bukti bayar milik penerbit lain tidak dapat diakses.
- Verifikasi ganda ditolak secara idempoten.
- Pembayaran belum terverifikasi tidak dapat diteruskan ke serah-terima distributor.

### Epic H — Serah-terima master kepada Distributor

- [ ] **VER-H01 — Buat model `PhysicalManuscriptHandover`**  
  Simpan registration, pihak penyerah/penerima, tahap, nomor berita/tanda terima, kondisi, jumlah volume, waktu penyerahan, waktu penerimaan, catatan, dan status.

- [ ] **VER-H02 — Buat aksi serahkan master**  
  Setelah pembayaran terverifikasi, Verifikator mencatat penyerahan kepada Distributor dan memilih penerima yang aktif.

- [ ] **VER-H03 — Buat inbox Distributor**  
  Tampilkan master yang menunggu konfirmasi penerimaan beserta identitas pengajuan, status pembayaran, dan dokumen serah-terima.

- [ ] **VER-H04 — Buat aksi konfirmasi penerimaan**  
  Distributor mencatat waktu, kondisi, jumlah fisik, dan catatan selisih bila ada.

- [ ] **VER-H05 — Tentukan deadline awal pentashihan**  
  Distributor memasukkan atau mengonfirmasi deadline sesuai profil layanan dan kalender kerja. Nilai disimpan sebagai snapshot.

- [ ] **VER-H06 — Tutup modul Verifikasi**  
  Setelah penerimaan berhasil, pindahkan ke `WAITING_DISTRIBUTION` atau status awal yang nanti disepakati pada SOP Pentashihan.

**Acceptance criteria Epic H**

- Verifikator tidak dapat mengonfirmasi penerimaan atas nama Distributor.
- Status tidak berubah sebelum penerimaan fisik dikonfirmasi.
- Keluaran akhir menyediakan nomor registrasi, penerbit, master diterima, waktu penerimaan, dan deadline untuk modul berikutnya.

### Epic I — SLA, notifikasi, audit, dan pelaporan

- [ ] **VER-I01 — Konfigurasi SLA per langkah**  
  Simpan target 30 menit, 2 hari, dan 7 hari sebagai konfigurasi/konstanta domain yang terdokumentasi; gunakan kalender kerja bila satuan hari dinyatakan hari kerja.

- [ ] **VER-I02 — Tambahkan timestamp workflow**  
  Setiap langkah menyimpan `started_at`, `due_at`, `completed_at`, serta durasi aktual.

- [ ] **VER-I03 — Tambahkan indikator keterlambatan**  
  Job SLA menandai langkah terlambat dan memberi notifikasi tanpa mengubah keputusan bisnis.

- [ ] **VER-I04 — Lengkapi audit log**  
  Audit minimal untuk submit, penerimaan fisik, assignment, penerbitan Nota Dinas, mulai verifikasi, simpan checklist, ajukan draf, approve/return, send, create billing, confirm/verify payment, handover, dan receipt.

- [ ] **VER-I05 — Buat timeline lintas peran**  
  Timeline menampilkan kejadian yang aman bagi masing-masing peran tanpa membuka catatan internal kepada penerbit.

- [ ] **VER-I06 — Siapkan laporan kinerja**  
  Laporan memuat jumlah proses, durasi rata-rata, jumlah overdue, hasil verifikasi, pembayaran, dan waktu serah-terima.

### Epic J — Frontend dan pengalaman pengguna

- [ ] **VER-J01 — Ganti placeholder modul Verifikasi** dengan halaman nyata berbasis API.
- [ ] **VER-J02 — Buat dashboard Kepala LPMQ** untuk assignment dan approval.
- [ ] **VER-J03 — Buat dashboard Verifikator** untuk antrean pemeriksaan, surat siap kirim, pembayaran, dan serah-terima.
- [ ] **VER-J04 — Buat dashboard Distributor** untuk master masuk dan penerimaan.
- [ ] **VER-J05 — Lengkapi portal Penerbit** untuk status verifikasi, surat hasil, billing, dan konfirmasi pembayaran.
- [ ] **VER-J06 — Terapkan loading, empty, success, error, overdue, dan forbidden state** pada setiap halaman.
- [ ] **VER-J07 — Tambahkan konfirmasi aksi kritis** untuk submit, approve, return, send, verify payment, dan confirm receipt.
- [ ] **VER-J08 — Pastikan responsive serta aksesibel** melalui keyboard, label formulir, fokus, kontras, dan pesan validasi.

### Epic K — Pengujian dan quality gate

- [ ] **VER-K01 — Unit test state machine** untuk seluruh transisi sah dan terlarang.
- [ ] **VER-K02 — Integration test RBAC** untuk empat aktor dan `SUPERADMIN`.
- [ ] **VER-K03 — Integration test ownership** agar penerbit tidak membaca pengajuan atau bukti bayar milik penerbit lain.
- [ ] **VER-K04 — Integration test assignment** agar hanya verifikator terpilih yang dapat memproses.
- [ ] **VER-K05 — Integration test document versioning** untuk draf, pengembalian, persetujuan, dan pengiriman.
- [ ] **VER-K06 — Integration test payment** untuk billing aktif, konfirmasi, koreksi bukti, verifikasi, dan idempotensi.
- [ ] **VER-K07 — Integration test physical handover** untuk penyerahan, penerimaan, dan larangan lompatan status.
- [ ] **VER-K08 — Test SLA** menggunakan waktu terkontrol/fake clock.
- [ ] **VER-K09 — Frontend component test** untuk halaman setiap aktor dan state utama.
- [ ] **VER-K10 — End-to-end happy path** dari submit penerbit sampai distributor menerima master.
- [ ] **VER-K11 — End-to-end revision path** ketika Kepala mengembalikan draf kepada Verifikator.
- [ ] **VER-K12 — End-to-end negative path** untuk akses lintas penerbit, role salah, status stale, request ganda, dan file privat.
- [ ] **VER-K13 — Pertahankan CI hijau** untuk Prisma validate, migration, seed, backend tests, frontend tests, dan production build.

## 5. Rancangan endpoint minimum

Endpoint dapat disesuaikan dengan konvensi repo, tetapi kapabilitas berikut wajib tersedia.

| Method | Endpoint | Role utama | Fungsi |
|---|---|---|---|
| `POST` | `/api/v1/registrations/:id/physical-master/receive` | Kepala LPMQ/petugas intake yang ditetapkan | Catat penerimaan awal master fisik |
| `POST` | `/api/v1/registrations/:id/verification-assignments` | Kepala LPMQ | Buat assignment dan Nota Dinas |
| `PATCH` | `/api/v1/verification-assignments/:id/start` | Verifikator terpilih | Mulai verifikasi |
| `PUT` | `/api/v1/verification-assignments/:id/checklist` | Verifikator terpilih | Simpan checklist berversi |
| `POST` | `/api/v1/verification-assignments/:id/result-drafts` | Verifikator terpilih | Buat/ajukan draf surat hasil |
| `POST` | `/api/v1/verification-results/:id/approve` | Kepala LPMQ | Setujui dan proses tanda tangan |
| `POST` | `/api/v1/verification-results/:id/return` | Kepala LPMQ | Kembalikan draf dengan alasan |
| `POST` | `/api/v1/verification-results/:id/send` | Verifikator terpilih | Kirim hasil kepada penerbit |
| `POST` | `/api/v1/registrations/:id/payments` | Verifikator/sistem | Buat billing |
| `POST` | `/api/v1/payments/:id/confirm` | Penerbit pemilik | Konfirmasi pembayaran |
| `POST` | `/api/v1/payments/:id/return` | Verifikator | Minta koreksi bukti bayar |
| `PATCH` | `/api/v1/payments/:id/verify` | Verifikator | Verifikasi PNBP |
| `POST` | `/api/v1/registrations/:id/physical-master/handovers` | Verifikator | Serahkan master kepada Distributor |
| `POST` | `/api/v1/physical-master/handovers/:id/receive` | Distributor tujuan | Konfirmasi penerimaan dan deadline |

Endpoint daftar dan detail perlu tersedia untuk inbox setiap role dengan pagination, filter status, pencarian, serta `myTasks=true`.

## 6. Urutan pengerjaan Codex

Kerjakan sebagai PR kecil dan berurutan agar mudah direviu:

1. **PR-VER-01 — Domain dan migrasi:** Epic A serta model dasar Epic B/C/H.
2. **PR-VER-02 — Intake dan assignment:** Epic B dan C backend + test.
3. **PR-VER-03 — Pemeriksaan:** Epic D backend + halaman Verifikator.
4. **PR-VER-04 — Approval dan pengiriman:** Epic E dan F + halaman Kepala/Verifikator/Penerbit.
5. **PR-VER-05 — Pembayaran:** Epic G beserta negative tests.
6. **PR-VER-06 — Serah-terima:** Epic H dan boundary ke modul Pentashihan.
7. **PR-VER-07 — SLA, laporan, dan hardening:** Epic I, J, dan K yang belum tercakup.

Setiap PR wajib:

- dibuat dari `main` terbaru;
- tidak mengubah aturan modul lain yang SOP-nya belum final;
- menyertakan migrasi dan seed bila skema berubah;
- memperbarui kontrak API dan dokumentasi state machine;
- menambah test positif, negatif, RBAC, ownership, dan concurrency yang relevan;
- menjalankan seluruh backend test, frontend test, Prisma validation, migration, dan build;
- tidak menyimpan file `.env`, kredensial, master mushaf, atau bukti bayar nyata.

## 7. Definition of Done modul Verifikasi

Modul dianggap selesai jika:

- delapan langkah SOP dapat dilakukan end-to-end oleh role yang tepat;
- tidak ada lompatan status yang melewati Nota Dinas, approval, pengiriman surat, pembayaran, atau serah-terima fisik;
- seluruh dokumen memiliki versi, status, snapshot, akses privat, dan audit;
- SLA tampil dan dapat dilaporkan tanpa memblokir proses secara otomatis;
- setiap actor mempunyai inbox, detail, aksi, notifikasi, dan timeline yang sesuai;
- happy path, revision path, negative path, RBAC, ownership, idempotensi, concurrency, dan file privacy lulus;
- CI pada `main` tetap hijau;
- keluaran akhir siap diterima modul Pentashihan tanpa mengarang detail SOP Pentashihan yang belum final.

## 8. Instruksi siap-tempel untuk Codex

```text
Implementasikan backlog SOP Verifikasi secara bertahap berdasarkan file
CODEX_BACKLOG_SOP_VERIFIKASI_v1.md.

Mulai hanya dari PR-VER-01. Inspeksi main terbaru sebelum mengubah kode.
Pertahankan fitur dan test yang sudah ada. Jangan mengimplementasikan detail
Pentashihan, STT, atau Dokumentasi yang SOP-nya belum final. Jika menemukan
konflik antara kode lama dan backlog ini, aturan bisnis pada backlog ini menjadi
sumber kanonik untuk modul Verifikasi dan konflik tersebut harus dilaporkan.

Sebelum coding, tuliskan daftar file yang akan diubah dan rencana migrasi.
Setelah coding, jalankan Prisma validate/migrate, backend tests, frontend tests,
dan production build. Laporkan perubahan, test, risiko, serta pekerjaan PR
berikutnya. Jangan merge otomatis ke main.
```

## 9. Hal yang sengaja ditunda

- Struktur checklist teknis verifikasi per kategori/butir rinci, bila belum dinyatakan pada sumber resmi lain.
- Template visual final Nota Dinas dan Surat Pemberitahuan.
- Integrasi SIMPONI langsung.
- Integrasi tanda tangan elektronik BSrE.
- Detail pembatalan setelah billing atau setelah pembayaran.
- Detail penugasan tim, tahap awal/perbaikan/dumi, dan keputusan pentashihan.
- Alur penerbitan STT serta dokumentasi lima eksemplar.

Penundaan tersebut tidak boleh digantikan dengan asumsi permanen. Gunakan interface, adapter, atau placeholder konfigurasi yang aman sampai SOP dan keputusan stakeholder tersedia.
