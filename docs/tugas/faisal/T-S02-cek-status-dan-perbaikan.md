# T-S02: Cek status pendaftaran, perbaikan, dan pesan login

- **Branch:** `feat/fe-cek-status-dan-perbaikan`
- **Basis:** `<BASE>`
- **Pemilik:** Faisal
- **Dependensi:** T-F01. Integrasi nyata menunggu T-F06.

## Tujuan
Memberi penerbit yang belum bisa login cara mengetahui dan memperbaiki pendaftarannya.

## Lingkup
- [ ] Halaman publik cek status: input kode pendaftaran, tampilkan status saja (menunggu verifikasi, perlu perbaikan, ditolak, disetujui) dan alasan jika perlu perbaikan.
- [ ] Tampilkan respons yang sama untuk kode yang tidak ditemukan dan tangani `RATE_LIMITED` dengan pesan ramah.
- [ ] Halaman perbaikan lewat tautan sekali pakai: tampilkan alasan, izinkan mengganti hanya dokumen yang berubah, lalu kirim ulang.
- [ ] Tangani `TOKEN_INVALID_OR_EXPIRED` dengan petunjuk meminta tautan baru atau menghubungi admin.
- [ ] Halaman login: tangani kode `PUBLISHER_NOT_APPROVED` dengan pesan "pendaftaran sedang menunggu verifikasi" dan tautan ke halaman cek status serta kontak.
- [ ] Status "ditolak" menjelaskan bahwa keputusan final dan penerbit dapat mendaftar baru.

## Di luar lingkup
Mengubah teks "peringatan" di halaman login yang disebut notulensi sebelum maksudnya dikonfirmasi.

## Kriteria selesai
- Alur cek status, perbaikan, dan pesan login berjalan terhadap API nyata.
- Tidak ada informasi pribadi tampil di halaman publik.

## Catatan
Kode pendaftaran jangan ditaruh di URL atau log klien.
