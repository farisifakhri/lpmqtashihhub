# T-S01: Formulir pendaftaran penerbit

- **Branch:** `feat/fe-form-pendaftaran-penerbit`
- **Basis:** `<BASE>` (`main`)
- **Pemilik:** Faisal
- **Dependensi:** T-F01 (kontrak v1). Integrasi nyata menunggu T-F06.
- **Status:** **Selesai menurut bukti kode** (Verifikasi Vitest 6/6 tests passing, build produksi lolos).

## Tujuan
Membangun formulir pendaftaran penerbit yang sesuai kontrak API.

## Lingkup
- [x] Pilihan jenis penerbit: PT/CV, Yayasan, Lembaga Pemerintah. **Tidak ada opsi perorangan.**
- [x] Daftar dokumen wajib berubah sesuai jenis (tabel di `KONTRAK_PENDAFTARAN_PENERBIT.md`). SIUP dan TDP tidak ada (cukup NIB untuk perusahaan).
- [x] Field: nama penerbit, alamat lengkap (dipakai sebagai alamat pengiriman), nama dan telepon penanggung jawab, email, kata sandi, NPWP, NIB (hanya perusahaan).
- [x] Validasi di klien sebagai kemudahan saja: hanya PDF, batas ukuran per dokumen (500 KB, Akta 2 MB). Server tetap penentu.
- [x] Narasi disesuaikan dengan situs lama. Ganti "pendaftaran akun pemohon" menjadi "pendaftaran akun penerbit".
- [x] Tautan unduh contoh surat pendaftaran: jadikan konfigurasi (`VITE_SURAT_PENDAFTARAN_TEMPLATE_URL` dengan default `https://tashih.kemenag.go.id/download-materi`).
- [x] Petakan kode kesalahan kontrak ke pesan yang jelas (`DUPLICATE_ACTIVE_REGISTRATION`, `FILE_NOT_PDF`, `FILE_ACTIVE_CONTENT`, `FILE_TOO_LARGE`, `DOCUMENT_REQUIRED`, `RATE_LIMITED`).
- [x] Halaman sukses menampilkan kode pendaftaran dan petunjuk menyimpannya (kode juga dikirim lewat email).
- [x] Tidak menyimpan kata sandi atau dokumen di penyimpanan peramban.

## Di luar lingkup
Formulir permohonan naskah, halaman cek status (T-S02).

## Kriteria selesai
- [x] Semua jenis penerbit bisa dikirim sesuai kontrak dan menampilkan kesalahan server dengan benar.
- [x] Tidak ada data tiruan di aplikasi. Respons contoh hanya untuk pengembangan lokal dan dihapus sebelum PR.
- [x] Kode peran sama dengan backend (`PENERBIT`, `SUPERADMIN`, `ADMIN_INTERNAL`).

## Catatan
Jika Anda membutuhkan perubahan skema atau backend, buat PR terpisah ke Fakhri dengan migrasi (lihat README bagian 4).
