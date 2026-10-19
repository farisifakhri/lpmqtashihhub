# T-F05: Modul unggah dokumen yang aman

- **Branch:** `feat/upload-dokumen-aman`
- **Basis:** `<BASE>`
- **Pemilik:** Fakhri
- **Dependensi:** T-F04
- **Memblokir:** T-F06 (dipakai ulang oleh rekap dan dokumen fase lanjutan)

## Tujuan
Mencegah file injeksi (PDF berisi malware, sisipan tautan judi online, dan sejenisnya) pada semua unggahan.

## Lingkup
- [x] Validasi magic bytes `%PDF-`, bukan hanya ekstensi atau MIME dari klien.
- [x] Batas ukuran per tipe dokumen (500 KB, Akta 2 MB), dapat diatur per pemanggil.
- [x] Tolak PDF terenkripsi.
- [x] Deteksi konten aktif: `/JavaScript`, `/JS`, `/OpenAction`, `/Launch`, `/EmbeddedFile`. Tolak.
- [x] Ekstrak tautan (`/URI` dan URL di teks). Jangan tolak otomatis, tetapi tandai untuk ditinjau admin.
- [x] Nama file diacak. Simpan di luar web root pada direktori yang dapat dikonfigurasi.
- [x] Endpoint unduh lewat otorisasi, dengan `Content-Disposition` unduh. Pembukaan KTP dicatat di audit log.
- [x] Pemindaian antivirus (mis. ClamAV) jika server mengizinkan; jadikan opsional lewat konfigurasi.
- [x] Batas laju unggah.
- [x] Test dengan PDF sintetis yang tidak berbahaya (berisi penanda yang dideteksi), bukan malware sungguhan.

## Di luar lingkup
Endpoint pendaftaran (T-F06).

## Kriteria selesai
- Semua penanda di atas terdeteksi di test.
- Dokumen sah dengan tautan biasa lolos dan hanya ditandai.

## Catatan
Pemindaian tidak menjamin 100% bersih (mis. tautan di dalam gambar tidak terdeteksi). Karena itu dokumen tidak pernah disajikan langsung ke publik dan tetap diperiksa manusia sebelum diproses. Pindai konten setelah stream didekompresi, bukan hanya byte mentah.
