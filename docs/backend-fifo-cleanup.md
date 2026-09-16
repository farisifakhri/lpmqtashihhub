# Cleanup pengajuan fixture dan antrean FIFO

## Cleanup 16 September 2026

Database lokal `lpmq_db`: 344 pengajuan yang judulnya cocok persis dengan fixture
integration test dihapus setelah persetujuan pengguna dan backup penuh.
10 pengajuan tetap disimpan: 8 berjudul “Uji Coba 2026” (asal belum dikonfirmasi)
dan 2 “Mushaf Alfarisi”. Akun, penerbit, master data, audit log dan berkas fisik
di storage tidak dihapus. Relasi pengajuan terhapus melalui FK cascade.

Backup SQL, checksum SHA-256, dan manifest ID terhapus tersedia di
`backend/storage/backups/` (diabaikan Git; berisi data sensitif).
Pulihkan backup terlebih dahulu ke database terpisah untuk verifikasi, bukan
langsung menimpa database aplikasi yang mungkin sudah memiliki perubahan baru.

Untuk cleanup berikutnya, dari direktori `backend`:

```powershell
npm run db:backup
npm run db:cleanup-preview
# Setelah jumlah/ID disetujui, gunakan path backup yang dicetak:
node scripts/cleanup-test-data.js --execute --expected=JUMLAH --backup=PATH_BACKUP_SQL
```

Skrip menolak jumlah yang berubah, checksum backup tidak cocok, FK non-cascade,
atau pengajuan yang dipertahankan tetapi merujuk fixture sebagai induk.
Skrip ini bukan endpoint aplikasi dan tidak menambahkan hak delete untuk role.

## Kontrak antrean

- `registrations.stage_entered_at` merekam waktu masuk status saat ini.
  Migrasi mengambil riwayat masuk status terbaru; tanpa riwayat memakai tanggal
  pembuatan. Submit ulang dan transisi domain mengatur ulang timestamp ini.
- Antrean internal diurutkan `stage_entered_at ASC, id ASC`. Riwayat penerbit
  tetap tanggal pembuatan terbaru dahulu.
- Penugasan verifikator: `assigned_at ASC`; approval Kepala: waktu masuk status
  `WAITING_VERIFICATION_APPROVAL`. Arsip penugasan selesai terbaru dahulu.
- Validasi pembayaran PAID: waktu masuk tahap PAYMENT_VERIFICATION; handover
  PENDING: waktu handover dibuat. Riwayat diterima/dikembalikan terbaru dahulu.
- `queue_position` adalah posisi dalam filter dan lingkup akses yang dipilih,
  bukan nomor antrean global atau nomor resmi pengajuan.
- `/registrations` mendukung `queue_only=true`, `segment=VERIFICATION|TASHIH|COMPLETED`,
  `search`, `page`, `limit`. Filter diterapkan sebelum paginasi; maksimum 100 per
  halaman. Dashboard memakai 20 dan mengecualikan DRAFT/COMPLETED/CANCELLED pada
  antrean aktif. Summary status mencakup seluruh hasil yang sesuai lingkup/search,
  tidak terbatas halaman saat ini.
- FIFO menentukan urutan tampilan/prioritas; tidak otomatis menugaskan atau
  memproses naskah, dan tidak memblokir tindakan pada item berikutnya jika item
  tertua belum siap. SLA dan otoritas SOP/RBAC tetap berlaku.
  *(Catatan: Penambahan role ADMIN serta kewenangan intake fisik dan penugasan tim pentashihan telah diimplementasikan pada migrasi berikutnya `20260916140000_add_admin_role`, lihat `docs/admin-rbac.md`)*.

## Pengujian tanpa mencemari database aplikasi

```powershell
cd backend
npm run test:unit
npm run test:isolated
```

`test:isolated` membuat database unik `lpmq_fifo_<timestamp>_test`, menerapkan
migrasi, seed, probe FIFO dan integration suite, lalu menghapus hanya database
yang dibuat run tersebut. Akun MySQL memerlukan hak CREATE/DROP DATABASE.
Upload pengujian dipisahkan di `backend/storage/test-runs/`.

`npm test` langsung ditolak jika `DATABASE_URL` tidak menunjuk database berakhiran
`_test`. Ini mencegah fixture pengujian menumpuk kembali di database aplikasi.

Setelah migrasi, restart backend agar Prisma Client yang baru terpakai.
Jika `prisma generate` melaporkan file DLL terkunci pada Windows, hentikan server
backend terlebih dahulu, jalankan `npx prisma generate`, lalu mulai ulang server.
