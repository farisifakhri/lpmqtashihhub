# Panduan untuk AI Coding Assistant

Baca file ini di awal setiap sesi coding pada repository ini. Tujuannya
supaya keputusan arsitektur dan keamanan yang sudah disepakati tim
tidak terlanggar hanya karena dikerjakan lintas sesi/lintas orang.

## Konteks Proyek

Sistem Manajemen Layanan Pentashihan Mushaf Al-Qur'an untuk LPMQ
(Lajnah Pentashihan Mushaf Al-Qur'an), Kementerian Agama RI. Ini
**sistem instansi pemerintah** yang menangani dokumen resmi negara
(Berita Acara Tashih, Surat Tanda Tashih) dan penerimaan negara bukan
pajak (PNBP). Perlakukan setiap keputusan keamanan dan integritas data
dengan standar lebih ketat daripada aplikasi konsumen biasa.

Dokumen acuan wajib dibaca sebelum mengerjakan task apa pun:
- `docs/IMPLEMENTATION.md` — keputusan teknis, model data, state
  machine, checklist keamanan
- `docs/DESIGN.md` — design token, komponen UI, status→warna
- `README.md` — struktur proyek dan prinsip non-negosiasi

**Kalau ada pertentangan antara task yang diminta dan dokumen di atas,
berhenti dan tanyakan — jangan diam-diam mengambil jalan yang lebih
mudah tapi menyimpang dari keputusan yang sudah disepakati.**

## Aturan Keras (Non-Negosiasi)

Tolak atau tandai eksplisit sebagai peringatan bila diminta melakukan
hal berikut, walau diminta "untuk sementara" atau "biar cepat":

1. **Jangan validasi business rule di frontend saja.** Tarif,
   otorisasi, dan transisi status HARUS divalidasi ulang di backend
   meski frontend sudah memvalidasi. Ini bukan duplikasi kerja sia-sia
   — ini prinsip "server is the source of truth".
2. **Jangan kirim atau simpan password dalam bentuk yang bisa dibaca**
   di titik mana pun (log, response API, network tab). Selalu hash
   dengan bcrypt/argon2.
3. **Jangan buat endpoint tanpa role-check eksplisit.** Default harus
   deny, bukan allow. Kalau ragu suatu endpoint butuh role apa,
   tanyakan — jangan tebak lalu buka akses longgar "untuk sekarang".
4. **Jangan hardcode nilai tarif, SLA, atau kalender kerja di kode.**
   Semua itu master data berversi dengan `effective_date`. Kalau task
   meminta angka spesifik (mis. "tarif Mushaf 30 Juz Rp 1.000.000"),
   itu masuk seed data, bukan konstanta di service/controller.
5. **Jangan timpa (overwrite) data audit, riwayat status, atau versi
   dokumen resmi.** Semua bersifat append-only / 1:N dengan versioning.
   `UPDATE` yang menghapus histori adalah bug, bukan fitur.
6. **Jangan generate PDF dokumen resmi di client-side.** Selalu
   server-side (Puppeteer/pdf-lib), supaya dokumen tidak bisa
   dimanipulasi sebelum diarsipkan.
7. **Jangan gabungkan state machine yang berbeda domain.** Status
   pengajuan, status pembayaran, dan tahap tashih adalah tiga hal
   terpisah (lihat `IMPLEMENTATION.md` §4) — jangan disatukan jadi
   satu enum besar meski terasa lebih "simpel".
8. **Jangan implementasikan endpoint pembatalan pasca-pembayaran**
   sampai `BR-16` (kebijakan PNBP) disahkan — lihat status di
   `IMPLEMENTATION.md` §7. Kalau diminta, tanyakan dulu apakah
   kebijakan sudah ada; kalau belum, buat stub yang menolak dengan
   pesan jelas, bukan implementasi penuh.
9. **Jangan asumsikan detail yang masih `[KEPUTUSAN TIM]` atau
   `[PERLU VALIDASI]`** di `IMPLEMENTATION.md` §7 (mis. auth
   session-vs-JWT, jumlah halaman upload, delegasi penandatanganan).
   Kalau task menyentuh area ini, tanyakan status terbarunya dulu.

## Konvensi Kode

- **Backend**: satu domain = satu folder di
  `backend/src/{routes,controllers,services,models,validators}/<domain>`.
  Controller tipis, delegasi ke service. Validasi request pakai
  Zod/Joi di layer `validators/`.
- **Frontend**: satu fitur = satu folder di `frontend/src/features/<fitur>/`,
  berisi komponen `.vue`, store Pinia, dan `api.ts` sendiri. Komponen
  di `frontend/src/components/` hanya untuk yang benar-benar shared
  lintas fitur.
- **Migration**: perubahan skema selalu lewat Prisma migration,
  jangan edit skema database secara manual.
- **Penamaan status**: gunakan kode status persis seperti di SRS
  (`READY_FOR_VERIFICATION`, bukan `SIAP_VERIFIKASI` atau singkatan
  lain) supaya konsisten antara backend, frontend, dan dokumentasi.
- **Bahasa UI**: semua label, pesan error, dan teks pengguna dalam
  Bahasa Indonesia dengan terminologi resmi LPMQ (Tashih, Naskah Dumi,
  PNBP, Berita Acara Tashih, Surat Tanda Tashih) — bukan istilah teknis
  generik seperti "submission" atau "invoice".
- **Komentar kode & commit message**: Bahasa Indonesia atau Inggris
  konsisten per file — jangan campur dalam satu file.

## Alur Kerja yang Diharapkan

Saat diminta mengerjakan satu item backlog (mis. `AUTH-01`):

1. Baca acceptance criteria item tersebut di
   `Backlog_MVP_Sistem_Pentashihan_LPMQ_v2.1.xlsx` sheet "Product Backlog".
2. Cek dependency item tersebut sudah selesai atau belum.
3. Implementasikan sesuai prinsip di atas.
4. Tulis test yang mencakup **kasus negatif** (permission ditolak,
   transisi ilegal) — bukan cuma happy path. Ini bagian dari
   Definition of Done, bukan opsional.
5. Pastikan perubahan yang mengubah state mencatat audit log.
6. Update `docs/IMPLEMENTATION.md`/`docs/DESIGN.md` di PR yang sama
   kalau ada keputusan teknis baru yang diambil selama implementasi.

## Kalau Tidak Yakin

Lebih baik berhenti dan bertanya daripada menebak lalu
mengimplementasikan sesuatu yang menyimpang dari SRS/ERD/backlog.
Proyek ini sudah beberapa kali mengalami drift dokumen-ke-kode pada
iterasi sebelumnya (skema kontradiktif, entitas hilang dari ERD,
requirement yang terlewat) — tujuan file ini adalah mencegah pola itu
terulang di level implementasi kode.
