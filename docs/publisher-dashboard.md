# Dashboard penerbit

Dashboard `/publisher` sekarang khusus layanan penerbit, tidak memakai dasbor
operasional internal. Tampilan responsif menggunakan komponen dan palet existing.

## Alur yang terhubung

- Ringkasan total pengajuan, perlu tindakan, sedang diproses, dan naskah dengan
  STT terbit memakai agregat scoped server, bukan menghitung satu halaman.
- Perlu tindakan: draf, perbaikan yang diminta petugas, serta pembayaran.
  Lima pengajuan terbaru ditampilkan dengan tautan ke daftar lengkap.
- Riwayat `/publisher/registrations` mendukung pencarian debounced, filter,
  pagination server, dan tautan langsung ke detail naskah.
- Detail `/publisher/registrations/:id` memuat timeline permission-aware,
  catatan perbaikan, versi berkas, pernyataan master fisik, pengajuan ulang,
  serta STT yang sudah diterbitkan. Timeline dari detail mentah tidak ditampilkan.
- Pengajuan baru membuat satu draf lalu membuka kelengkapan berkas; tidak
  mengirim naskah kosong otomatis. Sampul dan halaman 1–5 dilengkapi sebelum
  tindakan kirim eksplisit pada halaman detail.
- Unggah memakai storage private existing, maksimal 10 MB PDF/PNG/JPEG. Versi
  lama tidak dihapus. Unggah hanya tersedia pada DRAFT/REVISION_REQUIRED dan
  server tetap memeriksa ownership serta status terbaru.
- Link tagihan mencari detail dengan registration_id; tidak tergantung
  keberadaan tagihan pada halaman pembayaran yang sedang dimuat.
- Arsip `/publisher/documents` hanya mencantumkan STT ISSUED. Tombol unduh
  dinonaktifkan jika PDF belum ada atau masa berlaku sudah berakhir.

## Backend dan keamanan

List pengajuan existing menerima segment `PUBLISHER_ACTIONS`,
`PUBLISHER_PROCESSING`, dan `PUBLISHER_DOCUMENTS`. Summary terikat penerbit dan
search, tetapi tidak dibatasi segment/page/status. `summary.issued_stt` menghitung
jumlah naskah yang punya STT ISSUED, bukan sekadar status READY_FOR_STT.

Penerbit tanpa publisherId mendapat 403 (fail closed). Detail, timeline,
manuscript, billing, dan PDF tetap diperiksa ownership-nya di server.
Penerbit melihat pengajuan terbaru terlebih dahulu, tanpa nomor antrean FIFO.
Urutan FIFO tim internal serta RBAC assignment ADMIN/SUPERADMIN tidak berubah.

Endpoint PDF existing tetap merender draf untuk petugas yang berwenang.
Untuk dokumen ISSUED, server membaca **PDF existing tanpa mengubah bytes** dari
file_id storage private, memeriksa tipe PDF, checksum, status, dan masa berlaku.
Dokumen missing-file, revoked, expired, atau dari penerbit lain tidak diunduh.
Pengunduhan berkas privat dan PDF resmi mewajibkan header `Authorization: Bearer <token>`
dan mengirim header `Cache-Control: private, no-store` tanpa menyertakan query token di URL.
Tidak ada implementasi penerbitan/tanda tangan STT baru: format resmi dan SOP
penetapan existing masih menunggu stakeholder. Tidak ada dokumen resmi palsu
yang dibuat demi mengisi dashboard.

## Pengujian

Frontend meliputi agregat lintas halaman, actions/empty/error states,
pencarian/filter/pagination, upload revisi, sanitized timeline, status write
restrictions, alur draf baru, deep link billing, dan authenticated PDF download.
Runner `npm run test:isolated` backend juga menjalankan
`tests/publisher-dashboard.integration.js` pada database disposable. Test PDF
memakai fixture khusus lalu menghapus berkas UUID yang dibuatnya sendiri.

Tidak diperlukan migrasi database tambahan untuk dashboard penerbit.
