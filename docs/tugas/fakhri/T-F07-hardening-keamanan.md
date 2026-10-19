# T-F07: Hardening keamanan dasar

- **Branch:** `chore/hardening-keamanan-dasar`
- **Basis:** `<BASE>`
- **Pemilik:** Fakhri
- **Dependensi:** tidak ada (paralel)
- **Memblokir:** tidak ada

## Tujuan
Menindaklanjuti catatan "keamanan siber (mis. SQL injection) harap ditingkatkan" dengan audit yang terukur.

## Lingkup
- [x] Audit semua `$queryRaw` dan `$executeRaw`; ganti yang memakai penyambungan string dengan query berparameter.
- [x] Periksa IDOR: tiap endpoint dokumen dan pengajuan memeriksa kepemilikan atau peran, bukan hanya login.
- [x] Batas laju pada login, pendaftaran, dan cek status.
- [x] Header keamanan (mis. helmet), CORS terbatas, tidak membocorkan stack trace.
- [x] Pengelolaan rahasia dan token; tidak ada rahasia di repositori.
- [x] Rencana HTTPS di server (deploy awal masih HTTP lewat IP), setelah domain tashihv2 aktif.
- [x] Pemeriksaan dependensi (`npm audit`) dan tindak lanjutnya.
- [x] Penanganan XSS pada kolom teks bebas.
- [x] Tulis hasil di `docs/keamanan/AUDIT_DASAR.md`: temuan, tingkat risiko, status perbaikan.

## Kriteria selesai
- Tidak ada query mentah berisi penyambungan input pengguna.
- Dokumen audit memuat daftar periksa OWASP Top 10 dan hasilnya.

## Catatan
Dokumen audit ini juga dapat menjadi bahan bab laporan magang. Tanyakan ke LPMQ apakah pernah ada insiden nyata (mis. sisipan konten judi online di situs lama), karena itu mengubah prioritas.
