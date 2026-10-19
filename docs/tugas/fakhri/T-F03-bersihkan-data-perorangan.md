# T-F03: Bersihkan data penerbit perorangan (data uji)

- **Branch:** `chore/bersihkan-data-penerbit-perorangan`
- **Basis:** `<BASE>`
- **Pemilik:** Fakhri
- **Dependensi:** tidak ada
- **Memblokir:** T-F04 (migrasi yang membuang nilai "perorangan")

## Tujuan
Menghapus semua data penerbit perorangan (seluruhnya data uji, bertentangan dengan kebijakan resmi) dengan aman di setiap lingkungan.

## Lingkup
- [x] Gunakan pola skrip pembersihan yang sudah ada: cadangkan, pratinjau kandidat, hapus dengan pengecekan jumlah, relasi, dan checksum cadangan.
- [x] Kandidat: penerbit berjenis perorangan beserta akun dan data turunannya.
- [x] Lihat hasil pratinjau sebelum menghapus. Pastikan tidak ada penerbit non-perorangan yang ikut.
- [x] Jalankan di **lokal** dan siapkan skrip terverifikasi untuk **server tashihv2**, masing-masing dengan cadangan sendiri.
- [x] Audit log tetap utuh (5.595 entri dipertahankan). Data lain (akun internal, master data) tidak disentuh.
- [x] Catat hasil (jumlah dihapus, jumlah dipertahankan) di PR.

## Hasil Eksekusi Lokal
- **File Cadangan (Backup):** `backend/storage/backups/lpmq_db-2026-10-19T05-13-39-629Z.sql` (5.080.820 byte, diverifikasi via SHA256 metadata).
- **Manifest:** `backend/storage/backups/lpmq_db-2026-10-19T05-13-39-629Z.sql.cleanup-perorangan.json`.
- **Dihapus:** 2 penerbit perorangan (`Ahmad Jauhari Abbas, S.Ag.` dan `minnatul maula `), 2 akun user uji (`ahmadjauhariabbas.lpmq@gmail.com` dan `minnatulmaula138@gmail.com`), 1 pendaftaran draf (`REG-202610-0002`).
- **Dipertahankan:** 7 penerbit berbadan hukum resmi (PT & CV), 109 pengguna akun, 10 pendaftaran mushaf valid, 5.595 audit log (100% utuh tanpa pengurangan).
- **Pengujian Ulang (Idempotency):** Berhasil, kandidat tersisa 0 dan skrip aman dijalankan berulang kali.

## Di luar lingkup
Membuang nilai perorangan dari enum dan validator (dikerjakan di T-F04).

## Kriteria selesai
- Tidak ada penerbit perorangan tersisa di lingkungan mana pun.
- Cadangan tersimpan dan skrip bisa dijalankan ulang tanpa merusak data.

## Catatan
Ini penghapusan permanen. Jangan dijalankan di server tanpa cadangan dan pratinjau yang sudah diperiksa.
