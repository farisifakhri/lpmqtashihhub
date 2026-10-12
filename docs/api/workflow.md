# API alur layanan

Base URL: `/api/v1`. Seluruh endpoint di bawah memerlukan Bearer token. Respons JSON mengikuti `{ "success": true, "data": ... }`; kesalahan memakai HTTP 400 (input), 403 (izin), 404 (tidak tersedia), atau 409 (konflik status).

## Pembuatan draf penerbit

`POST /registrations` menerima `title` minimal 3 karakter setelah spasi tepi dihapus dan `mushaf_details.penanggung_jawab_produk` berupa nama yang tidak kosong. Keduanya wajib sejak penyimpanan draf. Contoh: `{ "title": "Mushaf Baru", "mushaf_details": { "penanggung_jawab_produk": "Nama Penanggung Jawab" } }`. Validasi gagal mengembalikan HTTP 400 dengan path field terkait.

## Fondasi SOP Verifikasi (SOP v2.2)

State machine membedakan `READY_FOR_VERIFICATION → VERIFICATION_ASSIGNED → IN_VERIFICATION → WAITING_VERIFICATION_APPROVAL → VERIFICATION_APPROVED → AWAITING_PAYMENT → PAYMENT_VERIFICATION → WAITING_DISTRIBUTOR_RECEIPT → WAITING_DISTRIBUTION` serta jalur koreksi `PHYSICAL_HANDOVER_CORRECTION_REQUIRED`. Penerimaan master fisik permohonan dilakukan oleh `HELPER_ADMIN` (Staf TU / Layanan). Penugasan verifikator dan pencatatan Nota Dinas dilakukan oleh HELPER_ADMIN secara atomik dalam satu transaksi dengan SLA 2 hari kerja kalender `Asia/Jakarta` (cut-off 16:00 WIB). Persetujuan draf dokumen verifikasi dilakukan oleh Kepala LPMQ, penandatanganan digital internal bertingkat dilakukan oleh Verifikator dan Kepala LPMQ, pengiriman surat hasil verifikasi dicatat melalui `EmailOutbox` idempoten dengan mekanisme antrean/retry, dan serah-terima fisik ke distributor disahkan oleh verifikator penugasan. Alur verifikasi internal ini telah selesai diimplementasikan end-to-end dan seluruh rangkaian test suite saat ini lulus.

## Intake master fisik, penugasan, dan dokumen verifikasi

| Endpoint | Aktor | Body / hasil |
|---|---|---|
| `PUT /registrations/:id/physical-master` | Penerbit pemilik | `{ "format": "A4", "binding_method": "PER_JUZ", "volume_count": 30, "sent_at": "2026-09-14T10:00:00+07:00", "delivery_method": "KURIR", "notes": "opsional" }`. Membuat atau memperbarui deklarasi berstatus `PENDING` selama DRAFT, READY_FOR_VERIFICATION, atau REVISION_REQUIRED. |
| `POST /registrations/:id/physical-master/receive` | `HELPER_ADMIN` / `SUPERADMIN` | `{ "decision": "RECEIVED", "receipt_no": "TR-001", "condition": "Baik", "volume_count": 30 }` atau `RETURNED` dengan `notes` wajib. Memeriksa fisik naskah per juz di loket LPMQ. Kepala LPMQ ditolak (`403`). |
| `GET /registrations/:id/receipt` | Penerbit pemilik, Kepala LPMQ, superadmin | Bukti pendaftaran JSON setelah submit: nomor, penerbit, layanan, judul, waktu submit, daftar metadata berkas digital, dan status master fisik. |
| `POST /registrations/:id/verification-assignments` | `HELPER_ADMIN`, `SUPERADMIN` | `{ "verifier_id": "UUID", "nota_no": "ND-001", "notes": "opsional" }`. Helper Admin atau Superadmin menerbitkan Nota Dinas Verifikasi (`NOTA_DINAS_VERIFIKASI`) dan menugaskan verifikator secara atomik. Tenggat SLA dihitung tepat 2 hari kerja kalender `Asia/Jakarta` (pukul 16:00 WIB). |
| `GET /verification-assignments` | Kepala LPMQ, Verifikator, superadmin | Inbox penugasan dengan filter `status`, `search`, `my_tasks`, `page`, `limit`. |
| `POST /verification-documents` | `VERIFIKATOR` penugasan | `{ "decision": "PASSED" / "REVISION_REQUIRED", "notes": "...", "attachment_file_ids": [...] }`. Menyusun draf Surat Pemberitahuan Hasil Verifikasi dan Berita Acara Verifikasi. Lampiran divalidasi kepemilikannya. |
| `POST /verification-documents/:id/submit` | `VERIFIKATOR` penugasan | Mengajukan draf dokumen hasil verifikasi ke Kepala LPMQ (`WAITING_APPROVAL`). |
| `POST /verification-documents/:id/approve` | `KEPALA_LPMQ` | `{ "decision": "APPROVED" / "REJECTED", "rejection_reason": "..." }`. Menyetujui draf dan menginisialisasi penandatangan digital multi-signatory. Jika ditolak, kembali ke status `IN_VERIFICATION`. |
| `POST /verification-documents/:id/sign` | `VERIFIKATOR`, `KEPALA_LPMQ` | `{ "method": "MANUAL" / "DIGITAL_SIGNATURE" }`. Menandatangani dokumen sesuai urutan hierarki penandatangan (`sign_order`). Mencatat snapshot hash sha256 dan waktu tanda tangan. |
| `POST /verification-documents/:id/send` | `VERIFIKATOR` penugasan | Mengirimkan surat hasil verifikasi ke penerbit secara nyata melalui antrean `EmailOutbox` ber-idempotency key. Mengubah status pengajuan ke `AWAITING_PAYMENT` (jika lolos) atau `REVISION_REQUIRED` (jika revisi). |
| `POST /verification-documents/:id/retry-email` | Verifikator / Kepala LPMQ | Mengulang pengiriman email hasil verifikasi jika berstatus `EMAIL_FAILED`. |

## Pembayaran dan serah-terima fisik ke distributor

| Endpoint | Aktor | Body / perilaku |
|---|---|---|
| `POST /registrations/:id/payments` | Verifikator / superadmin | `{}`; status harus AWAITING_PAYMENT; nominal dari `fee_sla_snapshot.total_fee`; menghasilkan billing aktif. |
| `POST /payments/:id/confirm` | Penerbit pemilik | `{ "receipt_file_id": "UUID unggahan", "external_ref": "referensi opsional" }`; menyimpan PAID dan memindahkan pengajuan ke PAYMENT_VERIFICATION. |
| `PATCH /payments/:id/verify` | `VERIFIKATOR` penugasan | `{}`; memverifikasi bukti bayar khusus oleh verifikator yang ditugaskan; menyimpan status `VERIFIED`. |
| `POST /registrations/:id/handover/submit` | `VERIFIKATOR` penugasan | `{ "notes": "opsional" }`; verifikator menyerahkan master fisik ke loket Distributor; status beralih ke `WAITING_DISTRIBUTOR_RECEIPT`. |
| `POST /registrations/:id/handover/confirm` | `DISTRIBUTOR` | `{ "notes": "opsional", "tashih_due_at": "ISO datetime masa depan" }`; distributor menerima naskah fisik dan menetapkan target waktu sidang; status beralih ke `WAITING_DISTRIBUTION`. |
| `POST /registrations/:id/handover/return` | `DISTRIBUTOR` | `{ "notes": "Catatan cacat fisik" }`; mengembalikan naskah master fisik yang cacat; memindahkan pengajuan ke `PHYSICAL_HANDOVER_CORRECTION_REQUIRED`. Pembayaran tetap `VERIFIED` tanpa tagihan billing ulang. |

## Berkas privat tanpa token URL

`POST /uploads` menerima **raw binary body**, dengan `Content-Type: application/pdf`, `image/png`, atau `image/jpeg` (maksimum 10 MiB). Server memeriksa magic bytes isi, membuat UUID, menghitung checksum SHA-256, dan menyimpan file di `backend/storage/private/`.

Respons 201 mengandung `id`, `mime_type`, `file_size`, dan `checksum`. Pengaksesan berkas privat melalui `GET /uploads/:id` mewajibkan otentikasi header `Authorization: Bearer <token>` dan mengirimkan header keamanan `Cache-Control: private, no-store`. Parameter token pada query string URL (`?token=...`) telah dieliminasi demi mencegah kebocoran kredensial melalui log referer dan browser history. Naskah digital hanya dapat diakses oleh verifikator yang ditugaskan, tim pentashih aktif, atau penerbit pemilik naskah.

## Distribusi, sidang, dan revisi (SRS v3.1)

1. `PUT /master/working-days` oleh SUPERADMIN menerima `{ "days": [{ "date": "2026-09-11", "is_working_day": true, "source": "Nomor keputusan kalender", "description": "opsional" }] }` (maksimal 366 tanggal). Isi juga tanggal libur/nonkerja; tanggal yang hilang menyebabkan perhitungan SLA ditolak. Gunakan kalender resmi instansi.
2. `POST /registrations/:id/assignments` oleh Distributor menerima `{ "team_id": "ID tim", "juz_assignments": [{ "assignee_id": "UUID pentashih", "juz_numbers": [1, 2, 3, 4, 5] }], "stage": "INITIAL" }`. Sistem mendukung 6 Kelompok Utama Pentashihan (SK LPMQ 2025) dan penugasan berbentuk rentang juz (`RF-DIST-05`). Satu juz hanya boleh diberikan kepada satu pentashih pada iterasi yang sama; tumpang tindih juz ditolak (`400`).
3. `GET /distribution-teams/:id/workload` mengembalikan jumlah penugasan aktif menurut `assignee_id` dan `status`, termasuk OVERDUE.
4. `POST /assignments/:id/review` oleh Pentashih pemilik tugas menerima `{ "result": "PASSED" | "REVISION_REQUIRED", "notes": "...", "recap_file_id": "UUID berkas PDF rekapan" }` (`RF-DIST-18`). Pentashih mengunggah 1 (satu) berkas rekapan internal untuk rentang juz yang ditugaskan. Berkas ini rahasia internal tim (hanya dapat diakses pentashih penugasan, distributor, dan admin internal) dan tidak dikirimkan ke penerbit/publik (`RF-DIST-19`). Penugasan juz checklist per satuan juz juga tetap didukung melalui `PATCH /assignments/:id/juz/:juzNumber`.
5. `POST /registrations/:id/distribution-review` oleh DISTRIBUTOR menerima `{ "result": "PASSED" | "REVISION_REQUIRED", "notes": "...", "revision_kind": "NASKAH_PERBAIKAN" | "NASKAH_DUMI" }` (`RF-DIST-08`).
   - Jika `PASSED`, seluruh hasil telaah lulus dan naskah beralih ke `READY_FOR_STT`.
   - Jika `REVISION_REQUIRED`, sistem otomatis menaikkan `revision_round` (ronde 1, 2, 3, dst.) dan menerbitkan draf surat pengembalian naskah resmi berjenis `REVISION_RETURN_LETTER` (`RF-DIST-09`, `RF-DIST-17`).
   - Aturan Naskah Dumi (T-04): `NASKAH_DUMI` dipilih setelah naskah bersih pada tahap awal/perbaikan. Jika ditemukan koreksi minor di tahap dumi, tidak dikembalikan sebagai siklus baru ke penerbit, melainkan diterbitkan notice koreksi.
6. Submit ulang revisi oleh penerbit yang sudah lunas masuk ke `WAITING_DISTRIBUTION`, mempertahankan snapshot tarif/SLA, dan tidak membuat tagihan billing baru. Iterasi berikutnya tidak menimpa hasil lama.

SLA dihitung dari snapshot durasi dan kalender kerja lengkap, dimulai **H+1** setelah pembayaran PNBP terverifikasi sah (`payment_records.verified_at`) dengan tenggat akhir hari Asia/Jakarta (`RF-CALC-05`). Portal penerbit menampilkan tenggat awal naskah disertai catatan standar durasi perbaikan (`RF-PUB-08`).

## Dokumen Resmi & Pengembalian Revisi

1. `POST /registrations/:id/official-documents` oleh distributor/dokumentator/superadmin menerima `{ "document_type": "BERITA_ACARA_TASHIH" | "SURAT_TANDA_TASHIH" | "REVISION_RETURN_LETTER" }`. Setiap pemanggilan menambah versi dokumen dengan snapshot data naskah, tarif/SLA, verifikasi, dan hasil pentashihan.
2. `REVISION_RETURN_LETTER` diterbitkan otomatis saat Distributor menetapkan pengembalian revisi (`REVISION_REQUIRED`), mencantumkan nomor surat dinas, ronde perbaikan, jenis perbaikan, catatan koreksi, dan kop resmi Kementerian Agama RI.
3. `GET /official-documents/:id/pdf` menghasilkan PDF snapshot resmi dengan format tata naskah dinas Kementerian Agama RI (non-generative AI). Untuk dokumen draf, ditampilkan label penanda draf resmi. Font draf Latin belum mendukung teks Arab; karakter yang tidak didukung menghasilkan 422 tanpa mengubah snapshot. Endpoint publik QR tetap mengembalikan 404 untuk draf.
4. `GET /registrations/:id/document-archive` menampilkan semua versi dokumen verifikasi dan hasil tashih, termasuk draf dan revisi. Menu Arsip terintegrasi pada Sidebar global (`/internal/archive`) dan dapat diakses oleh seluruh peran internal (`RF-DOC-14`). Penerbit hanya dapat membaca arsip pengajuannya sendiri.
5. Unduhan template surat permohonan mandiri format editable `.docx` disediakan di portal pendaftaran dan landing page (`RF-PBL-01`). Label pengiriman naskah fisik dilengkapi logo Kemenag dan LPMQ berukuran besar dan terbaca jelas (`RF-REG-10`).
6. `POST /official-documents/:id/sign` menerapkan pengamanan otoritas penandatanganan: Kepala LPMQ menandatangani dokumen STT definitif setelah seluruh tahapan SOP selesai. Dokumen draf belum ditandatangani mengembalikan 409 bila belum memenuhi prasyarat.

## Status dan notifikasi

Persetujuan hasil verifikasi oleh KEPALA_LPMQ; penolakan draf surat kembali ke IN_VERIFICATION dengan alasan wajib dan tetap ditangani verifikator semula. SUPERADMIN tanpa peran Kepala tidak dapat menggantikan persetujuan ini. Dokumen ini menjadi rujukan kontrak API alur kerja; detail validasi mengikuti route dan validator backend.

Endpoint status umum menolak transisi yang harus melalui submit/pembayaran/assignment/sidang/penetapan. Gunakan `from_status` pada aksi status lama untuk mendeteksi halaman yang sudah kedaluwarsa; ketidaksesuaian menghasilkan 409.

`GET /notifications` menampilkan 50 notifikasi terakhir pengguna. `PATCH /notifications/:id/read` dengan `{}` menandai notifikasi milik pengguna sebagai dibaca. Notifikasi pembayaran dan penugasan sudah dibuat di dalam transaksi domain; pengiriman email belum tersedia.

## Migrasi dan verifikasi

```sh
cd backend
npm ci
npx prisma generate
npx prisma migrate deploy
npm test
```

Gunakan database pengujian dengan seed untuk pengujian integrasi; pengujian membuat pengajuan serta audit dan memakai kalender sintetis sementara. Migrasi menambahkan tabel file privat, enum status domain utama, dan snapshot dokumen. Nilai status ilegal harus diperbaiki sebelum migrasi; konversi enum menggunakan strict SQL mode. Kolom riwayat status tetap String agar nilai historis seperti NONE tetap dapat disimpan.
