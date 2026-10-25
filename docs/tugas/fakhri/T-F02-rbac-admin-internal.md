# T-F02: Role ADMIN_INTERNAL dan guard test

- **Branch:** `feat/rbac-admin-internal`
- **Basis:** `<BASE>`
- **Pemilik:** Fakhri
- **Dependensi:** tidak ada
- **Memblokir:** T-F06 (endpoint keputusan), T-S03

## Tujuan
Menyediakan role `ADMIN_INTERNAL` dengan wewenang terbatas, termasuk memverifikasi penerbit.

## Lingkup
- [x] Tambah kode peran `ADMIN_INTERNAL` ke RBAC (selain `SUPERADMIN`).
- [x] Wewenang `ADMIN_INTERNAL`: membaca seluruh pengajuan, melihat progres tashih, mengelola akun internal (termasuk reset password staf), serta memverifikasi pendaftaran penerbit.
- [x] Pastikan wewenang operasional `DISTRIBUTOR` tetap utuh: Distributor berhak penuh memilih tim/kelompok (bisa lebih dari satu kelompok, per individu, atau kombinasi kelompok-individu dan pembagian rentang juz seperti 20-10 juz).
- [x] Reset password lewat tiga jalur (pemilik akun mandiri lupa sandi, mandiri ganti sandi di profil, dan bantuan ADMIN / SUPERADMIN dengan notifikasi email/WA).
- [x] Test regresi guard memakai fungsi, controller, dan route asli proyek dengan bahasa bisnis sebenarnya.

## Di luar lingkup
Pengembangan UI/UX kombinasi multi-kelompok dan penjatahan juz fleksibel oleh distributor (dikerjakan khusus di paket B-05).

## Kriteria selesai
- `ADMIN_INTERNAL` dan `SUPERADMIN` dapat mengelola akun staf internal, melakukan reset password, dan memanggil endpoint keputusan penerbit.
- Wewenang distribusi dan penugasan pentashihan tetap dapat diakses oleh peran `DISTRIBUTOR`.
- Test guard otorisasi lolos bersama seluruh test yang ada.
