# T-S03: Halaman verifikasi penerbit (admin)

- **Branch:** `feat/fe-verifikasi-penerbit-admin`
- **Basis:** `<BASE>`
- **Pemilik:** Faisal
- **Dependensi:** T-F06 dan T-F02 sudah masuk `<BASE>`

## Tujuan
Memberi SUPERADMIN dan ADMIN halaman untuk memeriksa dan memutuskan pendaftaran penerbit.

## Lingkup
- [ ] Daftar pendaftaran dengan filter status, pencarian, dan paginasi dari server.
- [ ] Detail pendaftaran: data isian, dokumen, dan penanda `tautan_terdeteksi` yang jelas bagi peninjau.
- [ ] Unduh atau lihat dokumen lewat endpoint ber-otorisasi.
- [ ] Aksi keputusan: setujui, perlu perbaikan (alasan wajib), tolak (alasan wajib). Kirim `versi` dan tangani `VERSION_CONFLICT`.
- [ ] Hanya tampil untuk peran SUPERADMIN dan ADMIN. Peran lain tidak melihat menunya.

## Kriteria selesai
- Keputusan tersimpan dan tercermin di halaman cek status.
- Konflik versi ditangani tanpa menimpa keputusan orang lain.

## Catatan
Kode peran mengikuti backend. Menu dan halaman diselaraskan dengan sidebar yang sudah ada di `<BASE>`.
