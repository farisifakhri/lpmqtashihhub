# T-S02: Cek status pendaftaran, perbaikan, dan pesan login

- **Branch:** `feat/fe-cek-status-dan-perbaikan`
- **Basis:** `<BASE>` (`main`)
- **Pemilik:** Faisal
- **Dependensi:** T-F01. Integrasi nyata menunggu T-F06.
- **Status:** **Selesai menurut bukti kode** (Unit tests `CheckRegistrationStatusPage.test.jsx`, `PublisherRevisionPage.test.jsx`, dan `LoginPage.test.jsx` lolos 100%).

## Tujuan
Memberi penerbit yang belum bisa login cara mengetahui dan memperbaiki pendaftarannya.

## Lingkup
- [x] Halaman publik cek status (`/cek-status`): input kode pendaftaran, tampilkan status saja (menunggu verifikasi, perlu perbaikan, ditolak, disetujui) dan alasan jika perlu perbaikan.
- [x] Tampilkan respons yang sama untuk kode yang tidak ditemukan dan tangani `RATE_LIMITED` dengan pesan ramah.
- [x] Halaman perbaikan lewat tautan sekali pakai (`/pendaftaran-penerbit/perbaikan/:token`): tampilkan alasan, izinkan mengganti hanya dokumen yang berubah, lalu kirim ulang.
- [x] Tangani `TOKEN_INVALID_OR_EXPIRED` dengan petunjuk meminta tautan baru atau menghubungi admin.
- [x] Halaman login: tangani kode `PUBLISHER_NOT_APPROVED` dengan pesan "pendaftaran sedang menunggu verifikasi" dan tautan ke halaman cek status serta kontak.
- [x] Status "ditolak" menjelaskan bahwa keputusan final dan penerbit dapat mendaftar baru.

## Di luar lingkup
Mengubah teks "peringatan" di halaman login yang disebut notulensi sebelum maksudnya dikonfirmasi.

## Kriteria selesai
- [x] Alur cek status, perbaikan, dan pesan login berjalan terhadap API nyata (`/api/v1/publisher-registrations/*`).
- [x] Tidak ada informasi pribadi tampil di halaman publik (hanya status, alasan perbaikan jika ada, dan petunjuk langkah).

## Catatan
Kode pendaftaran jangan ditaruh di URL atau log klien.
