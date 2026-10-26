# T-S03: Halaman verifikasi penerbit (admin)

- **Branch:** `feat/fe-verifikasi-penerbit-admin`
- **Basis:** `<BASE>` (`main`)
- **Pemilik:** Faisal
- **Dependensi:** T-F06 dan T-F02 sudah masuk `<BASE>`
- **Status:** **Selesai menurut bukti kode** (Unit tests `PublisherVerificationPage.test.jsx` 4/4 passing, build produksi lolos).

## Tujuan
Memberi SUPERADMIN dan ADMIN_INTERNAL halaman untuk memeriksa dan memutuskan pendaftaran penerbit.

## Lingkup
- [x] Daftar pendaftaran dengan filter status, pencarian, dan paginasi dari server.
- [x] Detail pendaftaran: data isian, dokumen, dan penanda `tautan_terdeteksi` yang jelas bagi peninjau.
- [x] Unduh atau lihat dokumen lewat endpoint ber-otorisasi (`PrivateFileViewer` dengan JWT).
- [x] Aksi keputusan: setujui, perlu perbaikan (alasan wajib), tolak (alasan wajib). Kirim `versi` dan tangani `VERSION_CONFLICT`.
- [x] Hanya tampil untuk peran SUPERADMIN dan ADMIN_INTERNAL. Peran lain tidak melihat menunya (dijaga oleh router & ProtectedRoute).

## Kriteria selesai
- [x] Keputusan tersimpan dan tercermin di halaman cek status.
- [x] Konflik versi ditangani tanpa menimpa keputusan orang lain.

## Catatan
Kode peran mengikuti backend (`SUPERADMIN`, `ADMIN_INTERNAL`). Menu dan halaman diselaraskan dengan sidebar yang sudah ada di `<BASE>`.
