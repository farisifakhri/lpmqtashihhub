# T-F04: Skema data pendaftaran penerbit

- **Branch:** `feat/skema-pendaftaran-penerbit`
- **Basis:** `<BASE>`
- **Pemilik:** Fakhri
- **Dependensi:** T-F01, T-F03
- **Memblokir:** T-F05, T-F06

## Tujuan
Menyiapkan model dan migrasi untuk pendaftaran penerbit, dengan satu migrasi dan satu pemilik.

## Lingkup
- [x] Model pendaftaran penerbit: kode pendaftaran (acak, unik), jenis, nama, alamat lengkap, penanggung jawab (nama, telepon), email, NPWP, NIB (opsional), status, alasan, versi (konkurensi optimistik), pemutus dan waktu keputusan.
- [x] Model dokumen pendaftaran: tipe, lokasi penyimpanan, nama asli, ukuran, hash, penanda `tautan_terdeteksi`, waktu unggah, penanda digantikan.
- [x] Model token perbaikan: hanya hash token, kedaluwarsa, waktu terpakai.
- [x] Hubungkan dengan model akun penerbit yang sudah ada. Jangan menggandakan data akun.
- [x] Buang nilai "perorangan" dari enum jenis penerbit, validator Zod, dan seed.
- [x] Keunikan NPWP dan NIB hanya di antara pendaftaran yang tidak `DITOLAK`.
- [x] Migrasi baru (`20261019120000_publisher_registration_schema`). Migrasi lama tidak diedit.

## Di luar lingkup
Endpoint (T-F06) dan penyimpanan file (T-F05).

## Kriteria selesai
- Migrasi berjalan di database kosong dan di database hasil T-F03.
- Percobaan membuat dua pendaftaran aktif dengan NPWP sama ditolak, tetapi pendaftaran baru setelah `DITOLAK` diizinkan.
- Seluruh test yang ada lolos.

## Catatan teknis
MySQL tidak punya indeks unik parsial. Gunakan kolom pembantu yang berisi NPWP (atau NIB) saat status bukan `DITOLAK` dan bernilai NULL saat `DITOLAK`, lalu beri indeks unik pada kolom itu. NULL ganda diizinkan oleh indeks unik MySQL.
