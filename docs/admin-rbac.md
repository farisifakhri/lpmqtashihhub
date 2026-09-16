# RBAC Admin Internal

Role pengguna tetap many-to-many melalui `UserRole`. `RoleCode` membatasi kode
pada tabel `Role`, bukan menambahkan single-role pada `User`. Semua guard membaca
`req.user.roles` dan menggunakan `authorize` existing.

## Hak akses yang disepakati

| Aksi | ADMIN | SUPERADMIN | DISTRIBUTOR |
| --- | --- | --- | --- |
| Baca pengajuan, timeline tersanitasi, progres | Ya | Tetap | Tetap |
| POST `/registrations/:id/physical-master/receive` (intake fisik master) | Ya | Ya | Tidak, 403 |
| POST `/registrations/:id/assignments` (tim pentashihan) | Ya | Ya | Tidak, 403 |
| GET `/distribution-teams/:id/workload` | Ya | Ya | Ya |
| Persetujuan SOP verifikasi, Nota Dinas verifikator | Tidak | Guard existing, tidak diperluas | Tidak |
| Aksi penerbit, pemeriksaan verifikasi, sidang, pengesahan | Tidak melalui ADMIN | Guard existing | Sesuai role existing |
| Kelola akun dan master data | Tidak | Tetap | Tidak |

Path tabel berada di bawah `/api/v1`. `requireAdminInternal` adalah guard terpisah
yang memakai `authorize('ADMIN', 'SUPERADMIN')`; endpoint assignment menggunakan
guard eksklusif dengan allowlist yang sama serta pemeriksaan service.

Sesuai SOP Pendaftaran Mushaf (Sheet 3) dan keputusan bisnis KB-01 / P1-01, pemeriksaan berkas
fisik dan tanda terima fisik (`POST /registrations/:id/physical-master/receive`) dilakukan oleh
`ADMIN` (Staf TU / Layanan) dan `SUPERADMIN`. `KEPALA_LPMQ` memiliki hak akses view-only dan ditolak
dengan 403 jika mencoba melakukan penerimaan fisik.

`/registrations/:id/verification-assignments` bukan assignment tim pentashihan:
itu penugasan verifikator/Nota Dinas milik Kepala LPMQ dan tidak diubah.
Guard `/verification-documents/:id/approve`, alias
`/verification-results/:id/approve`, return, dan `TRANSITION_POLICY` tidak diubah.
Pure ADMIN mendapat 403. Multi-role bersifat aditif: ADMIN + KEPALA_LPMQ tetap
mempunyai kewenangan dari KEPALA_LPMQ, bukan dari ADMIN. Pembatasan service
existing untuk SUPERADMIN tanpa role Kepala tetap berlaku.

Distributor kehilangan **hanya penugasan tim manual**; workload read-only,
serah-terima BAST dan keputusan distribusi existing tetap berjalan.

Assignment tetap mensyaratkan status WAITING_DISTRIBUTION, pembayaran VERIFIED,
tim/SK aktif, dan anggota aktif dengan role PENTASHIH. Server menghitung SLA dari
kalender hari kerja, membuat audit/notifikasi, serta mengunci pengajuan untuk
mencegah penugasan ganda. UI Admin menyediakan dialog pilih tim dan pentashih
dari antrean FIFO dashboard; tidak membuat rotasi otomatis atau bypass SOP.

## Migrasi aman

Backup database sebelum deployment, lalu dari `backend`:

```powershell
npx prisma migrate deploy
npx prisma generate
node scripts/migrate-ketua-pentashih-to-admin.js --dry-run
```

Migrasi `20260916140000_add_admin_role` membatasi `roles.code` ke kode valid dan
menambahkan ADMIN jika belum ada. ID role serta membership existing dipertahankan.
Skrip inspeksi tidak menganggap status akun ACTIVE atau jabatan ketua tim sebagai
bukti otomatis Ketua Pentashih. Hasil harus ditinjau manusia terlebih dahulu.

Contoh preview untuk UUID yang sudah ditinjau (ganti placeholder):

```powershell
node scripts/migrate-ketua-pentashih-to-admin.js --user-ids=UUID_USER --expected=1 --dry-run
```

Eksekusi memerlukan daftar eksplisit, jumlah tepat, dan actor SUPERADMIN aktif:

```powershell
node scripts/migrate-ketua-pentashih-to-admin.js --user-ids=UUID_USER --expected=1 --approved-by=UUID_SUPERADMIN --execute
```

Skrip menambah membership ADMIN, tidak menghapus role lain; idempotent dan audited.
Deployment lokal hanya menjalankan inspeksi: belum ada user yang dipromosikan.

## Verifikasi

```powershell
# backend: unit + HTTP regression/FIFO/RBAC pada database disposable
npm run test:unit
npm run test:isolated
# frontend
npm test
npm run build
```

Runner isolated menolak database aplikasi, membuat database bersufiks `_test`,
dan menghapus hanya database disposable miliknya. `--rbac-only` tersedia pada
`node scripts/test-isolated.js` untuk pemeriksaan RBAC terfokus.
