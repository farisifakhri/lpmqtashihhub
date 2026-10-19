# T-F01: Finalisasi kontrak API pendaftaran penerbit

- **Branch:** `docs/kontrak-api-pendaftaran-penerbit`
- **Basis:** `<BASE>` (lihat README bagian 3)
- **Pemilik:** Fakhri
- **Dependensi:** tidak ada
- **Memblokir:** T-S01, T-S02, T-F06

## Tujuan
Membekukan kontrak v1 supaya Faisal bisa membangun frontend tanpa menebak.

- [x] Salin `docs/api/KONTRAK_PENDAFTARAN_PENERBIT.md` ke repo.
- [x] Samakan dengan konvensi API LPMQ (`/api/v1`): prefiks path, bentuk respons sukses, bentuk respons kesalahan.
- [x] Putuskan: masa berlaku tautan perbaikan (14 hari), bentuk kode pendaftaran (`REG-PUB-XXXXXXXX`), tidak memblokir antrean verifikasi untuk verifikasi email.
- [x] Tambahkan contoh request dan response nyata untuk tiap endpoint (tanpa data pribadi sungguhan).
- [x] Tandai versi sebagai v1.0 resmi dan siap digunakan oleh Faisal (T-S01, T-S02).

## Di luar lingkup
Implementasi endpoint (T-F06) dan skema (T-F04).

## Kriteria selesai
- Faisal dapat memulai T-S01 dan T-S02 tanpa bertanya tentang bentuk data.
- Semua kode kesalahan dan status terdokumentasi.

## Catatan
Perubahan kontrak sesudah v1 dicatat sebagai versi baru dan diberitahukan ke Faisal.
