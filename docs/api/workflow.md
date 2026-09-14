# API alur layanan — implementasi awal

Base URL: `/api/v1`. Seluruh endpoint di bawah memerlukan Bearer token. Respons JSON mengikuti `{ "success": true, "data": ... }`; kesalahan memakai HTTP 400 (input), 403 (izin), 404 (tidak tersedia), atau 409 (konflik status).

## Fondasi SOP Verifikasi (PR-VER-01)

State machine kini membedakan `READY_FOR_VERIFICATION → VERIFICATION_ASSIGNED → IN_VERIFICATION → WAITING_VERIFICATION_APPROVAL → VERIFICATION_APPROVED → AWAITING_PAYMENT → PAYMENT_VERIFICATION → WAITING_DISTRIBUTOR_RECEIPT → WAITING_DISTRIBUTION`. Penerimaan awal master, penugasan, dan Nota Dinas hanya oleh Kepala LPMQ; persetujuan draf juga hanya oleh Kepala LPMQ; pengiriman surat dan serah-terima oleh verifikator terpilih; penerimaan fisik berikutnya oleh distributor. `SUPERADMIN` tidak mewarisi kewenangan Kepala LPMQ. Endpoint status umum menolak aksi yang membutuhkan dokumen atau bukti fisik dengan 409. Endpoint khusus untuk pemeriksaan, persetujuan, pengiriman surat, dan handover disiapkan dalam PR berikutnya, sehingga alur baru belum dapat diselesaikan end-to-end.

Migrasi `20260914000000_verification_foundation` bersifat additive: tiga nilai status baru, metadata intake master fisik, kolom penugasan, dokumen verifikasi berversi, dan tabel serah-terima. Data dan nilai status lama tetap ada. Status `PAYMENT_VERIFICATION` dapat tetap tampil setelah `PaymentRecord.status=VERIFIED`; handover baru akan memindahkannya ke `WAITING_DISTRIBUTOR_RECEIPT`.

## Intake master fisik dan penugasan (PR-VER-02)

| Endpoint | Aktor | Body / hasil |
|---|---|---|
| `PUT /registrations/:id/physical-master` | Penerbit pemilik | `{ "format": "A4", "binding_method": "PER_JUZ", "volume_count": 30, "sent_at": "2026-09-14T10:00:00+07:00", "delivery_method": "KURIR", "notes": "opsional" }`; `sent_at`, metode, dan catatan opsional. Membuat atau memperbarui deklarasi berstatus `PENDING` selama DRAFT, READY_FOR_VERIFICATION, atau REVISION_REQUIRED. Master yang sudah diterima tidak dapat diubah. |
| `POST /registrations/:id/physical-master/receive` | Kepala LPMQ | `{ "decision": "RECEIVED", "receipt_no": "TR-001", "condition": "Baik", "volume_count": 30 }` atau `RETURNED` dengan `notes` alasan wajib. Hanya pada READY_FOR_VERIFICATION dan deklarasi PENDING; jumlah jilid saat diterima harus sama. Nomor tanda terima unik. Penerbit menerima notifikasi. |
| `GET /registrations/:id/receipt` | Penerbit pemilik, Kepala LPMQ, superadmin | Bukti pendaftaran JSON setelah submit: nomor, penerbit, layanan, judul, waktu submit, daftar metadata berkas digital, dan status master fisik. Tidak mengandung ID atau isi berkas privat. `NOT_DECLARED` berarti deklarasi belum ada. |
| `POST /registrations/:id/verification-assignments` | Kepala LPMQ | `{ "verifier_id": "UUID", "nota_no": "ND-001", "notes": "opsional" }`; memerlukan status READY_FOR_VERIFICATION, master RECEIVED dan nomor tanda terima, serta pengguna aktif berperan VERIFIKATOR. Assignment, Nota Dinas berstatus ISSUED, status VERIFICATION_ASSIGNED, histori, audit, dan notifikasi dibuat dalam satu transaksi. Nomor Nota Dinas dimasukkan dari nomor resmi, bukan dibuat otomatis. |
| `GET /verification-assignments` | Kepala LPMQ, Verifikator, superadmin | Inbox dengan `status`, `search`, `my_tasks`, `page`, `limit`. Verifikator hanya melihat assignment miliknya. Untuk antrean belum ditugaskan, gunakan `GET /registrations?status=READY_FOR_VERIFICATION`; daftar pengajuan sudah memuat status master fisik. |

Tenggat pemeriksaan sementara dihitung **48 jam sejak penugasan**, ditampilkan sebagai target pemantauan dan tidak menghalangi aksi setelah terlewat. SOP menyebut dua hari tanpa menetapkan hari kerja atau kalender; aturan kalender resmi perlu diputuskan sebelum menganggap tenggat ini SLA final. Nota Dinas tersimpan sebagai snapshot data dan metadata dokumen, belum sebagai PDF resmi atau tanda tangan digital.

Pesan error menjelaskan penyebab dan langkah tindak lanjut dalam Bahasa Indonesia. Validasi mengembalikan ringkasan pada `message` dan detail lengkap pada `errors: [{ field, message }]`. Status HTTP tetap menjadi acuan aplikasi; jangan menggunakan teks pesan sebagai kode kondisi. Berkas terlalu besar memakai 413, dan layanan data yang belum tersedia memakai 503. Kegagalan koneksi saat autentikasi tidak dianggap sebagai sesi masuk yang salah. Detail teknis error dicatat di log server; pesan gangguan umum meminta pengguna memeriksa hasil sebelum mengirim ulang.

## Pembayaran manual

| Endpoint | Aktor | Body / perilaku |
|---|---|---|
| `POST /registrations/:id/payments` | Verifikator / superadmin | `{}`; status harus AWAITING_PAYMENT; nominal dari `fee_sla_snapshot.total_fee`; menghasilkan satu billing aktif dengan awalan MANUAL |
| `POST /payments/:id/confirm` | Penerbit pemilik | `{ "receipt_file_id": "UUID unggahan", "external_ref": "referensi opsional" }`; menyimpan PAID dan memindahkan pengajuan ke PAYMENT_VERIFICATION |
| `PATCH /payments/:id/verify` | Verifikator / superadmin | `{}`; memverifikasi bukti, menyimpan VERIFIED dan notifikasi; registrasi tetap PAYMENT_VERIFICATION sampai serah-terima fisik dicatat oleh endpoint berikutnya |

Nomor billing MANUAL adalah identitas internal aplikasi, bukan kode billing SIMPONI. `external_ref` dicatat manual dan tidak menjadi bukti rekonsiliasi NTPN otomatis. Penolakan/pembatalan pasca-billing belum diaktifkan karena kebijakan resminya belum tersedia.

## Berkas privat

`POST /uploads` menerima **raw binary body**, dengan `Content-Type: application/pdf`, `image/png`, atau `image/jpeg` (bukan multipart/form-data). Maksimum 10 MiB. Server memeriksa signature isi, membuat UUID, menghitung checksum SHA-256, dan menyimpan file di `backend/storage/private/` yang tidak dipublikasikan sebagai static directory. Pemindaian antivirus belum tersedia.

Respons 201 mengandung `id`, `mime_type`, `file_size`, dan `checksum`. Tautkan ID tersebut melalui `POST /registrations/:id/manuscripts`:

```json
{ "type": "COVER", "file_id": "UUID dari /uploads" }
```

`version`, `checksum`, `mime_type`, dan `file_size` tidak lagi diterima dari klien; server menetapkan semuanya. Naskah penerbit hanya dapat ditambahkan pada DRAFT/REVISION_REQUIRED. Internal hanya bisa membaca naskah bila memiliki Assignment atau VerificationAssignment aktif; superadmin tetap memiliki akses teknis. Detail pengajuan menyembunyikan naskah bagi aktor tanpa penugasan. `GET /uploads/:id` memeriksa pemilik/penugasan atau tanggung jawab verifikasi pembayaran, lalu mengirim attachment privat.

Validasi signature bukan antivirus atau validasi semantik isi mushaf. Nama dan ekstensi kiriman klien tidak digunakan sebagai path penyimpanan.

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

Persetujuan hasil verifikasi oleh KEPALA_LPMQ; penolakan draf surat kembali ke IN_VERIFICATION dengan alasan wajib dan tetap ditangani verifikator semula. SUPERADMIN tanpa peran Kepala tidak dapat menggantikan persetujuan ini. Lihat [pencocokan SOP verifikasi](verifikasi-sop-review.md) untuk kebutuhan dokumen yang belum selesai dan keputusan yang menunggu rapat.

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
