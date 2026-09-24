# Acuan rapat 24 September 2026

- [Daftar sembilan tim inti](roster-tim-inti-2026-09-24.jpeg): tiap baris terdiri dari verifikator, distributor, dan dokumentator. `DistributionTeam` dalam aplikasi adalah kelompok pentashih dan bukan daftar ini.
- [Perkiraan HK untuk 17 jenis naskah](durasi-17-jenis-naskah-2026-09-24.jpeg): tiga kolom master awal, perbaikan, dan dumi/perpanjangan. Batas STT dua HK sesudah dumi cetak dinyatakan bersih adalah aturan terpisah.

## Aktivasi roster tim inti

1. Jalankan migrasi `20260924150000_core_team_rotation` di lingkungan uji dahulu. Migrasi membuat pointer awal 1 dan **tidak** mengubah pengajuan lama.
2. Buat atau cocokkan 27 akun petugas dari gambar dengan akun aktif yang memiliki peran masing-masing. Jangan memakai akun contoh hasil seed sebagai pengganti orang dalam gambar. Nama saja tidak cukup sebagai identitas; admin memilih akun berdasarkan ID, email/NIP yang telah diverifikasi.
3. Superadmin membuka `/internal/core-teams`, memilih tiga akun untuk setiap nomor 1–9, menulis alasan, lalu menyimpan versi roster. Setiap posisi memakai akun berbeda. Pembaruan roster membuat versi baru; snapshot perkara lama tetap.
4. Jika giliran pertama bukan 1, atur **Nomor tim berikutnya** dengan alasan. Pengaturan ini hanya memengaruhi submit selanjutnya.
5. Uji submit draf dan periksa `GET /registrations/:id`: `core_team` harus berisi nomor, versi, dan tiga anggota. Perkara tanpa roster lengkap ditolak saat submit, sehingga pointer tidak bergeser.

API admin: `GET /core-teams`, `PUT /core-teams/roster`, `PUT /core-teams/next`, dan `GET /core-teams/legacy`. Semua perubahan roster/pointer dicatat di audit. Pengajuan baru mengambil giliran di transaksi yang sama dengan perubahan status; pengajuan ulang memakai snapshot lama.

## Pengajuan sebelum migrasi

`GET /core-teams/legacy` menampilkan perkara yang belum mempunyai snapshot, verifikator penugasan terakhir, dan distributor BAST terakhir. Tinjau laporan ini sebelum menyusun pemetaan historis. Migrasi sengaja tidak menebak nomor tim dari penugasan manual lama atau mengganti penerima BAST. Perkara lama tetap memakai alur lama selama belum dipetakan; pengajuan ulang perkara lama tanpa snapshot ditahan untuk peninjauan. Simpan hasil peninjauan dan alasan administratif sebelum membuat prosedur backfill per perkara.

## Batas tahap fondasi

Tahap ini memasang roster, rotasi, snapshot, akses dasar, dan UI pengaturan. Aturan catat mundur sejak Senin minggu sebelumnya dengan reset Senin sore, billing SIMPONI manual oleh verifikator, tanda tangan digital verifikator, serta outbox email/WhatsApp berada pada tahap berikutnya sesuai urutan pekerjaan.
