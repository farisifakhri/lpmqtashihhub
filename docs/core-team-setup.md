# Tim inti pentashihan

Daftar sembilan tim pada `docs/references/roster-tim-inti-2026-09-24.jpeg` diaktifkan melalui `backend/scripts/seed-core-team-roster.js`. Setiap tim berisi satu verifikator, satu distributor, dan satu dokumentator. Pengajuan baru menyimpan salinan nomor tim dan identitas ketiga petugas saat dikirim; perkara yang dikembalikan tetap memakai tim semula.

Jalankan migrasi Prisma dan seed dasar sebelum `npm run core-team:seed` di folder `backend`. Perintah seed membuat 27 akun dengan email pada domain `.invalid` yang tidak menerima pesan. Nomor WhatsApp sengaja kosong dan berstatus belum diverifikasi sampai kontak asli diisi melalui Manajemen Pengguna. Kata sandi awal acak tersimpan di `backend/storage/credentials/core-team-<nama_database>.json`, yang diabaikan Git. Jangan menyalinnya ke dokumen proyek atau mengirim notifikasi ke alamat placeholder. Seed menolak berjalan lagi setelah roster aktif.

Admin Internal (`ADMIN`) dan Superadmin (`SUPERADMIN`) dapat mencatat Nota Dinas serta menugaskan verifikator. Kepala LPMQ tetap melakukan persetujuan hasil verifikasi. Superadmin juga tetap dapat mengelola roster, rotasi, dan akun. Pengaturan tim dan nomor giliran berikutnya tersedia di halaman Tim Inti untuk Superadmin.
