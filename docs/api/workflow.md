# API alur layanan — implementasi awal

Base URL: `/api/v1`. Seluruh endpoint di bawah memerlukan Bearer token. Respons JSON mengikuti `{ "success": true, "data": ... }`; kesalahan memakai HTTP 400 (input), 403 (izin), 404 (tidak tersedia), atau 409 (konflik status).

## Fondasi SOP Verifikasi (SOP v2.2)

State machine membedakan `READY_FOR_VERIFICATION → VERIFICATION_ASSIGNED → IN_VERIFICATION → WAITING_VERIFICATION_APPROVAL → VERIFICATION_APPROVED → AWAITING_PAYMENT → PAYMENT_VERIFICATION → WAITING_DISTRIBUTOR_RECEIPT → WAITING_DISTRIBUTION` serta jalur koreksi `PHYSICAL_HANDOVER_CORRECTION_REQUIRED`. Penerimaan master fisik permohonan dilakukan oleh `ADMIN` (Staf TU / Layanan). Penugasan verifikator dan penerbitan Nota Dinas dilakukan oleh Kepala LPMQ secara atomik dalam satu transaksi dengan SLA 2 hari kerja kalender `Asia/Jakarta` (cut-off 16:00 WIB). Persetujuan draf dokumen verifikasi dilakukan oleh Kepala LPMQ, penandatanganan digital internal bertingkat dilakukan oleh Verifikator dan Kepala LPMQ, pengiriman surat hasil verifikasi dicatat melalui `EmailOutbox` idempoten dengan mekanisme antrean/retry, dan serah-terima fisik ke distributor disahkan oleh verifikator penugasan. Alur verifikasi internal ini telah selesai diimplementasikan end-to-end dan seluruh rangkaian test suite saat ini lulus.

## Intake master fisik, penugasan, dan dokumen verifikasi

| Endpoint | Aktor | Body / hasil |
|---|---|---|
| `PUT /registrations/:id/physical-master` | Penerbit pemilik | `{ "format": "A4", "binding_method": "PER_JUZ", "volume_count": 30, "sent_at": "2026-09-14T10:00:00+07:00", "delivery_method": "KURIR", "notes": "opsional" }`. Membuat atau memperbarui deklarasi berstatus `PENDING` selama DRAFT, READY_FOR_VERIFICATION, atau REVISION_REQUIRED. |
| `POST /registrations/:id/physical-master/receive` | `ADMIN` / `SUPERADMIN` | `{ "decision": "RECEIVED", "receipt_no": "TR-001", "condition": "Baik", "volume_count": 30 }` atau `RETURNED` dengan `notes` wajib. Memeriksa fisik naskah per juz di loket LPMQ. Kepala LPMQ ditolak (`403`). |
| `GET /registrations/:id/receipt` | Penerbit pemilik, Kepala LPMQ, superadmin | Bukti pendaftaran JSON setelah submit: nomor, penerbit, layanan, judul, waktu submit, daftar metadata berkas digital, dan status master fisik. |
| `POST /registrations/:id/verification-assignments` | `ADMIN`, `SUPERADMIN` | `{ "verifier_id": "UUID", "nota_no": "ND-001", "notes": "opsional" }`. Admin Internal atau Superadmin menerbitkan Nota Dinas Verifikasi (`NOTA_DINAS_VERIFIKASI`) dan menugaskan verifikator secara atomik. Tenggat SLA dihitung tepat 2 hari kerja kalender `Asia/Jakarta` (pukul 16:00 WIB). |
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

## Distribusi, sidang, dan revisi

1. `PUT /master/working-days` oleh SUPERADMIN menerima `{ "days": [{ "date": "2026-09-11", "is_working_day": true, "source": "Nomor keputusan kalender", "description": "opsional" }] }` (maksimal 366 tanggal). Isi juga tanggal libur/nonkerja; tanggal yang hilang menyebabkan perhitungan SLA ditolak. Gunakan kalender resmi instansi.
2. `POST /registrations/:id/assignments` oleh DISTRIBUTOR/superadmin menerima `{ "team_id": "ID tim", "assignee_ids": ["UUID pentashih"], "stage": "INITIAL" }`. Tim/SK dan seluruh anggota harus aktif. Tahap awal perpanjangan menggunakan DUMMY; penugasan setelah perbaikan memakai REVISION. Semua anggota dibuat dalam transaksi yang sama.
3. `GET /distribution-teams/:id/workload` mengembalikan jumlah penugasan aktif menurut `assignee_id` dan `status`, termasuk OVERDUE.
4. `POST /assignments/:id/review` oleh pentashih yang ditugaskan menerima `{ "result": "PASSED", "notes": "Catatan sidang" }`. Hasil lain: REVISION_REQUIRED atau REJECTED. Hasil bersifat append-only; satu penugasan hanya dapat diselesaikan sekali.
5. `POST /registrations/:id/distribution-review` oleh DISTRIBUTOR/superadmin menerima bentuk body yang sama. Semua penugasan iterasi terakhir harus selesai. PASSED hanya tersedia jika seluruh hasil lulus; memindahkan ke READY_FOR_STT. REVISION_REQUIRED mengembalikan ke penerbit. Penolakan akhir setelah pembayaran belum diaktifkan.
6. Submit ulang revisi yang sudah lunas masuk WAITING_DISTRIBUTION, mempertahankan snapshot tarif/SLA, dan tidak membuat tagihan ulang. Iterasi berikutnya tidak menimpa hasil lama.

SLA dihitung dari snapshot durasi dan kalender kerja lengkap, dengan tenggat akhir hari Asia/Jakarta. Backend mengecek OVERDUE setiap menit; `npm run sla:check` juga dapat dijalankan melalui scheduler eksternal. Keterlambatan tidak menghalangi pencatatan sidang. Perubahan kalender tidak menghitung ulang tenggat penugasan yang sudah dibuat.

## Dokumen — masih draf

`POST /registrations/:id/official-documents` oleh distributor/dokumentator/superadmin menerima `{ "document_type": "BERITA_ACARA_TASHIH" }` atau SURAT_TANDA_TASHIH. Hanya tersedia pada READY_FOR_STT. Setiap pemanggilan menambah versi dengan snapshot data naskah, tarif/SLA, verifikasi, dan hasil pentashihan.

`GET /official-documents/:id/pdf` menghasilkan PDF snapshot **berlabel DRAF** untuk internal. Ini belum template resmi. Font draf Latin belum mendukung teks Arab; karakter yang tidak didukung menghasilkan 422 tanpa mengubah snapshot. Endpoint publik QR mengembalikan 404 untuk draf; draf juga tidak dikembalikan ke penerbit pada detail pengajuan.

`POST /official-documents/:id/sign` belum menerbitkan dokumen: Kepala LPMQ menerima 409 sampai template dan alur penanda tangan disahkan. SUPERADMIN tanpa peran Kepala LPMQ menerima 403. Tidak ada tanda tangan digital/BSrE semu atau penerbitan STT tanpa dasar keputusan. Format, penanda tangan BA, delegasi, PDF final Unicode, dan notifikasi STT masih pekerjaan lanjutan.

## Status dan notifikasi

Persetujuan hasil verifikasi oleh KEPALA_LPMQ; penolakan draf surat kembali ke IN_VERIFICATION dengan alasan wajib dan tetap ditangani verifikator semula. SUPERADMIN tanpa peran Kepala tidak dapat menggantikan persetujuan ini. Kontrak API lengkap mengacu pada [API_CONTRACT_MODUL_LANJUTAN.md](../../API_CONTRACT_MODUL_LANJUTAN.md).

Endpoint status umum menolak transisi yang harus melalui submit/pembayaran/assignment/sidang/penetapan. Gunakan `from_status` pada aksi status lama untuk mendeteksi halaman yang sudah kedaluwarsa; ketidaksesuaian menghasilkan 409.

`GET /notifications` menampilkan 50 notifikasi terakhir pengguna. `PATCH /notifications/:id/read` dengan `{}` menandai notifikasi milik pengguna sebagai dibaca. Notifikasi pembayaran dan penugasan sudah dibuat di dalam transaksi domain; pengiriman email belum tersedia.

## Migrasi dan verifikasi

```sh
cd backend
npm ci
npx prisma generate
npx prisma migrate deploy
npm run test:unit
npm test
```

Gunakan database pengujian dengan seed untuk pengujian integrasi; pengujian membuat pengajuan serta audit dan memakai kalender sintetis sementara. Migrasi menambahkan tabel file privat, enum status domain utama, dan snapshot dokumen. Nilai status ilegal harus diperbaiki sebelum migrasi; konversi enum menggunakan strict SQL mode. Kolom riwayat status tetap String agar nilai historis seperti NONE tetap dapat disimpan.
