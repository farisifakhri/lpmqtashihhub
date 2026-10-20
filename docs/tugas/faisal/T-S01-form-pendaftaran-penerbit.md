# T-S01: Formulir pendaftaran penerbit

- **Branch:** `feat/fe-form-pendaftaran-penerbit`
- **Basis:** `<BASE>` (tanyakan ke Fakhri; bukan `frontend-pendaftaran-byN`)
- **Pemilik:** Faisal
- **Dependensi:** T-F01 (kontrak v1). Integrasi nyata menunggu T-F06.

## Tujuan
Membangun formulir pendaftaran penerbit yang sesuai kontrak API.

## Lingkup
- [ ] Pilihan jenis penerbit: PT/CV, Yayasan, Lembaga Pemerintah. **Tidak ada opsi perorangan.**
- [ ] Daftar dokumen wajib berubah sesuai jenis (tabel di `KONTRAK_PENDAFTARAN_PENERBIT.md`). SIUP dan TDP tidak ada.
- [ ] Field: nama penerbit, alamat lengkap (dipakai sebagai alamat pengiriman), nama dan telepon penanggung jawab, email, kata sandi, NPWP, NIB (hanya perusahaan).
- [ ] Validasi di klien sebagai kemudahan saja: hanya PDF, batas ukuran per dokumen (500 KB, Akta 2 MB). Server tetap penentu.
- [ ] Narasi disesuaikan dengan situs lama. Ganti "pendaftaran akun pemohon" menjadi "pendaftaran akun penerbit".
- [ ] Tautan unduh contoh surat pendaftaran: jadikan konfigurasi, jangan menaruh URL situs lama di kode.
- [ ] Petakan kode kesalahan kontrak ke pesan yang jelas.
- [ ] Halaman sukses menampilkan kode pendaftaran dan petunjuk menyimpannya (kode juga dikirim lewat email).
- [ ] Tidak menyimpan kata sandi atau dokumen di penyimpanan peramban.

## Di luar lingkup
Formulir permohonan naskah, halaman cek status (T-S02).

## Kriteria selesai
- Semua jenis penerbit bisa dikirim sesuai kontrak dan menampilkan kesalahan server dengan benar.
- Tidak ada data tiruan di aplikasi. Respons contoh hanya untuk pengembangan lokal dan dihapus sebelum PR.
- Kode peran sama dengan backend.

## Catatan
Jika Anda membutuhkan perubahan skema atau backend, buat PR terpisah ke Fakhri dengan migrasi (lihat README bagian 4).
