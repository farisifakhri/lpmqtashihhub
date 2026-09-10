# API alur layanan — implementasi awal

Base URL: `/api/v1`. Seluruh endpoint di bawah memerlukan Bearer token. Respons JSON mengikuti `{ "success": true, "data": ... }`; kesalahan memakai HTTP 400 (input), 403 (izin), 404 (tidak tersedia), atau 409 (konflik status).

Pesan error menjelaskan penyebab dan langkah tindak lanjut dalam Bahasa Indonesia. Validasi mengembalikan ringkasan pada `message` dan detail lengkap pada `errors: [{ field, message }]`. Status HTTP tetap menjadi acuan aplikasi; jangan menggunakan teks pesan sebagai kode kondisi. Berkas terlalu besar memakai 413, dan layanan data yang belum tersedia memakai 503. Kegagalan koneksi saat autentikasi tidak dianggap sebagai sesi masuk yang salah. Detail teknis error dicatat di log server; pesan gangguan umum meminta pengguna memeriksa hasil sebelum mengirim ulang.

## Pembayaran manual

| Endpoint | Aktor | Body / perilaku |
|---|---|---|
| `POST /registrations/:id/payments` | Verifikator / superadmin | `{}`; status harus AWAITING_PAYMENT; nominal dari `fee_sla_snapshot.total_fee`; menghasilkan satu billing aktif dengan awalan MANUAL |
| `POST /payments/:id/confirm` | Penerbit pemilik | `{ "receipt_file_id": "UUID unggahan", "external_ref": "referensi opsional" }`; menyimpan PAID dan memindahkan pengajuan ke PAYMENT_VERIFICATION |
| `PATCH /payments/:id/verify` | Verifikator / superadmin | `{}`; memverifikasi bukti, menyimpan VERIFIED, memindahkan ke WAITING_DISTRIBUTION, membuat notifikasi |

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
