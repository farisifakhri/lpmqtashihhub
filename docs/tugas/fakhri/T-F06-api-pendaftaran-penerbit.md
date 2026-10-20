# T-F06: API pendaftaran penerbit

- **Branch:** `feat/api-pendaftaran-penerbit`
- **Basis:** `<BASE>`
- **Pemilik:** Fakhri
- **Dependensi:** T-F01, T-F02, T-F04, T-F05
- **Memblokir:** integrasi T-S01, T-S02, T-S03

## Tujuan
Mengimplementasikan endpoint sesuai `KONTRAK_PENDAFTARAN_PENERBIT.md` v1, termasuk penghalang login.

## Lingkup
- [x] Pendaftaran publik (multipart): validasi jenis, dokumen wajib per jenis, keunikan, lalu kode pendaftaran.
- [x] Cek status publik: kode di body, respons sama untuk kode tidak ada, dibatasi laju.
- [x] Perbaikan lewat tautan sekali pakai: token hanya disimpan sebagai hash, kedaluwarsa, sekali pakai, kembali ke `DIAJUKAN` pada record yang sama.
- [x] Admin: daftar (filter dan pencarian di server sebelum paginasi), detail, unduh dokumen, keputusan dengan `versi`.
- [x] Penghalang login: kredensial benar tetapi belum `DISETUJUI` mengembalikan `PUBLISHER_NOT_APPROVED` dengan pesan umum. Kredensial salah tetap generik.
- [x] Email pada empat peristiwa (diterima, perlu perbaikan, disetujui, ditolak). Konfigurasi lewat environment.
- [x] Audit log untuk keputusan dan pembukaan dokumen sensitif.
- [x] Test integrasi dengan database sementara agar fixture tidak menumpuk.

## Di luar lingkup
Antarmuka (Faisal) dan alur naskah.

## Kriteria selesai
- Penerbit belum terverifikasi tidak bisa login lewat API langsung.
- Semua kode kesalahan di kontrak teruji.
- Seluruh test lolos, kontrak sesuai implementasi.

## Catatan
Penyedia email dan kredensialnya di server TI UIN belum ditetapkan. Jika belum ada, buat antarmuka pengirim email yang dapat diganti, dan uji dengan pengirim palsu.
