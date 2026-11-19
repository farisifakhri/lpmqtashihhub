# B-25: Sambungan Dumi → STT, Ketahanan Penunjukan Pemaraf, dan Penutupan Sisa Temuan Audit

- **ID Paket:** B-25
- **Branch:** `fix-stt-flow-and-hardening` (atau `fix/b25-dumi-stt-pemaraf-sisa-audit`)
- **Basis:** `main` (commit `0077cf7`, 19 November 2026)
- **PIC:** Fakhri
- **Status:** Spesifikasi & Implementasi
- **Dependensi:** commit `a01ae1b` (penunjukan 2 Pemaraf dan pengesahan Kepala atas keputusan distributor)
- **Versi Dokumen:** 1.0 (19 November 2026)

---

## 1. Tujuan

1. Menyambungkan alur **dumi lulus → draf STT → paraf 2 Pemaraf → pengesahan Kepala → STT terbit → arsip** supaya tiap langkah punya pemilik, notifikasi, dan tampilan yang jelas.
2. Menutup kebuntuan dan celah pada penunjukan Pemaraf (khususnya STT).
3. Menutup sisa temuan audit 17-18 November yang belum dikerjakan.

---

## 2. Keputusan yang Berlaku dan Asumsi

**Terkunci (dinyatakan 19 November 2026):**
- Pemaraf membubuhkan paraf **sebelum** Kepala.
- Kepala LPMQ dihitung sebagai **pengesah akhir** (TTE final); Kepala tidak membubuhkan paraf terpisah.

**Berlaku di kode (`a01ae1b`):**
- Pengaju (verifikator, distributor, admin surat master, pengaju draf STT) menunjuk **tepat 2 Pemaraf aktif**; hanya mereka yang boleh memaraf.
- Keputusan sidang distributor baru berlaku setelah 2 paraf lalu **pengesahan Kepala** (`POST /registrations/:id/distribution-review/approve`).

**Keputusan Desain B-25:**
- **T1: Dokumentator** menyiapkan draf STT setelah dumi lulus (selaras dengan B-18 dan halaman `/internal/documents`). Panel distributor berstatus pantauan baca-saja.
- **T2: Dispensasi paraf** berada di tangan **Kepala LPMQ** (sebagai pengesah utama) dengan fallback **Super Admin** untuk darurat teknis. Pemaraf dilarang memberikan dispensasi.
- **T3: Kepala bertindak dua kali** pada jalur dumi: pertama mengesahkan keputusan sidang (`headApproveDistribution`), kedua mengesahkan STT (`signDocument`). Objek hukum keduanya berbeda (BA Sidang vs Izin Terbit STT).
- **T4: Telaah pembanding** tetap opsional agar tidak memblokir naskah baru yang tidak memiliki komparasi master lama.
- **T5: Peta publik penerbit** menyembunyikan data kontak pribadi, menerapkan pembatasan lokasi, dan mengecualikan perseorangan.

---

## 3. Temuan dan Bukti di Kode (`0077cf7`)

### 3.1 Dumi → STT belum tersambung
| ID | Temuan | Lokasi |
|---|---|---|
| S1 | Jalur "distributor mengajukan STT ke Admin" **tidak punya ujung**: `requestSttFromAdmin` hanya menyimpan `foreign_metadata.stt_request` dan mengirim notifikasi `STT_REQUEST` ke Admin Internal/Super Admin dengan tautan `/internal/distributions`. Admin tidak punya UI untuk membuat draf dari permintaan itu | `official-document.service.js` (`requestSttFromAdmin`), `SttWorkflowPanel.jsx` |
| S2 | Endpoint `POST /official-documents/:id/send-to-distributor` tidak punya pemanggil di frontend (`sendDraftToDistributor(` hanya terdefinisi di `documentation.api.js`) | `workflow.routes.js`, `documentation.api.js:22` |
| S3 | Notifikasi `READY_FOR_STT` dikirim ke `KEPALA_LPMQ` dan `DOKUMENTATOR`. Kepala diberi tahu saat draf belum ada (bahkan ia sendiri yang baru mengesahkan keputusannya); distributor dan Admin tidak diberi tahu | `distribution.service.js` (`applyDistributionDecision`, cabang `READY_FOR_STT`) |
| S4 | Satu-satunya jalur yang benar-benar bisa jalan adalah halaman Dokumentator (`DokumentatorArchivePage`: tab `READY_FOR_STT` → "Buat Draf STT" → "Kirim ke Pemaraf"). Panel distributor tetap menampilkan "Ajukan Pembuatan STT ke Admin" sehingga dua pihak bisa saling menunggu | `DokumentatorArchivePage.jsx`, `SttWorkflowPanel.jsx` |
| S5 | `createDocument` untuk STT lolos bila ada pembayaran terverifikasi **di status apa pun**: syaratnya `!verifiedPayment && !['READY_FOR_STT','STT_ISSUED'].includes(status)`, sehingga draf bisa dibuat sebelum pentashihan selesai. `submitToTu` dan `parafDocument` tidak memeriksa status registrasi | `official-document.service.js` (`createDocument`, `submitToTu`) |
| S6 | Tidak ada pembatas satu draf STT aktif per pengajuan selain opsi `reuse_existing_draft` | `createDocument` |
| S7 | Setelah paraf terakhir STT, tidak ada notifikasi ke Kepala (hanya `tu_workflow.status = PARAF_COMPLETED`). Pada alur keputusan distributor notifikasi `APPROVAL_REQUEST` ke Kepala sudah ada | `parafDocument` |

### 3.2 Penunjukan Pemaraf
| ID | Temuan | Lokasi |
|---|---|---|
| P1 | STT **tidak dapat disubmit ulang** (409) setelah diserahkan, jadi bila salah satu dari 2 Pemaraf yang ditunjuk berhalangan atau dinonaktifkan, STT tidak bisa maju dan tidak ada cara mengganti penunjukan. (Keputusan distributor dan permohonan lain bisa dibuka ulang lewat `openParafRequest`) | `submitToTu` |
| P2 | `overrideParafByAdmin` (dispensasi Super Admin) **tidak punya pemanggil** (tidak ada rute atau layanan yang memakainya) | `paraf.service.js` |
| P3 | Setelah penunjukan tepat 2, `requireParaf` dan `addPemarafSignature` masih menghitung ulang target dari **jumlah Pemaraf aktif**. Itu dua sumber kebenaran yang bisa berbeda, dan jumlah wajib bisa turun hanya dengan menonaktifkan akun | `paraf.service.js` |
| P4 | Setelah `isPemaraf` ditentukan dari header `X-Active-Role` (PR #104), akun berperan ganda (Pemaraf dan Kepala) bisa memaraf lalu mengesahkan. Pemeriksaan lama "yang memaraf tidak boleh mengesahkan" sudah dihapus | `signDocument`, `headApproveDistribution`, `approveVerificationDocument` |
| P5 | Pemaraf dipetakan menjadi `KEPALA_LPMQ` pada `user.roles` di seluruh API sehingga terbuka ke rute Kepala. `forbidPemaraf` baru dipasang di 2 tempat (pengembalian dokumen verifikasi, izin ubah profil) | `utils/pemaraf.js`, lihat inventaris bagian 4.5 |

### 3.3 Sisa temuan audit lain
| ID | Temuan | Lokasi |
|---|---|---|
| R1 | Status `EMAIL_QUEUED` bisa macet permanen: klaim atomik hanya menerima `SIGNED`/`EMAIL_FAILED`, `retryVerificationEmail` hanya `EMAIL_FAILED`, dan kegagalan transaksi penutup setelah email terkirim meninggalkan `EMAIL_QUEUED` | `verification-review.service.js` (`dispatchVerificationResult`) |
| R2 | Cek status via email: respons email terdaftar lebih lambat (pengiriman email di dalam permintaan), dan pembatas laju hanya per IP | `publisher-registration.service.js` |
| R3 | `backend/.env.example` terhapus dari repo (commit `01eb17d`), padahal memuat `MAIL_DRIVER`, `SMTP_*`, `PUBLIC_APP_URL` | repo |
| R4 | Telaah pembanding kini opsional di kode, berbeda dari keputusan 5 November | `distribution.service.js` |
| R5 | Peta publik penerbit (nama, alamat, koordinat semua penerbit terverifikasi) tanpa persetujuan penerbit | `public.routes.js` |

---

## 4. Rincian Perubahan

### 4.1 Dumi → STT (Jalur Dokumentator)
1. **Notifikasi `READY_FOR_STT`:** kirim hanya ke `DOKUMENTATOR` (utamakan `core_documenter_id` registrasi bila ada, selain itu semua Dokumentator aktif). **Hapus Kepala** dari penerima saat dumi selesai. Tautan: `/internal/documents?id=<id>`.
2. **Matikan jalur Admin yang tidak berujung:**
   - Hapus tombol "Ajukan Pembuatan STT ke Admin" dan cabang `stt_request`/`DRAFT_READY` di `SttWorkflowPanel.jsx`.
   - Panel distributor menjadi pantauan baca-saja.
3. **Syarat draf STT:** `createDocument` untuk `SURAT_TANDA_TASHIH` hanya bila `reg.status === 'READY_FOR_STT'` (dan `STT_ISSUED` untuk salinan ulang bila memang dibutuhkan). Tambahkan pemeriksaan yang sama pada `submitToTu` dan `parafDocument`.
4. **Satu draf aktif per pengajuan:** tolak 409 bila sudah ada STT berstatus `DRAFT` yang belum dibatalkan; kembalikan draf yang ada bila `reuse_existing_draft: true`.
5. **Notifikasi Kepala saat paraf lengkap (S7):** pada paraf terakhir STT (`isComplete === true`), kirim `STT_READY_FOR_SIGNATURE` ke akun Kepala LPMQ aktif dengan tautan ke Pusat Tanda Tangan (`/internal/signatures`).

### 4.2 Penunjukan Ulang dan Dispensasi Pemaraf
1. **Dispensasi oleh Kepala LPMQ / Super Admin:**
   - Rute:
     - `POST /official-documents/:id/paraf-override`
     - `POST /registrations/:id/distribution-review/paraf-override`
     - `POST /verification-documents/:id/paraf-override`
   - Syarat: Wajib alasan (`reason`) minimal 10 karakter. Hanya boleh dieksekusi oleh akun dengan hak akses `KEPALA_LPMQ` atau `SUPERADMIN`, dan bukan yang sedang beroperasi murni sebagai `isPemaraf`.
   - Tindakan: Menandai paraf darurat sebagai `[DISPENSASI KEPALA LPMQ]` atau `[DISPENSASI SUPERADMIN]`, mencatat ke audit trail, dan mengubah status menjadi siap disahkan.
2. **Pemisahan Peran Satu Orang (Anti Self-Sign):**
   - Tolak `signDocument`, `approveVerificationDocument`, dan `headApproveDistribution` bila `user.id` terdaftar dalam daftar orang yang membubuhkan paraf (`signers` / `parafs`).

### 4.3 Inventaris Rute Kepala vs Pemaraf
Pemaraf hanya diizinkan membubuhkan paraf dan membaca (GET). Seluruh mutasi atau keputusan final wajib dilindungi `forbidPemaraf`:
- `signDocument`: Pengesahan STT final (403 untuk Pemaraf).
- `headApproveDistribution`: Pengesahan hasil sidang pentashihan (403 untuk Pemaraf).
- `returnVerificationDocument`: Pengembalian hasil verifikasi (403 untuk Pemaraf).
- `permitEdit`: Izin edit data penerbit (403 untuk Pemaraf).

### 4.4 Sisa Temuan Audit
1. **R1 (EMAIL_QUEUED Reclaim & Transaction Catch):**
   - Reklaim status `EMAIL_QUEUED` yang lebih tua dari 5 menit pada klaim atomik.
   - Bungkus transaksi penutup dalam blok `try/catch` yang membalikkan status ke `EMAIL_FAILED` disertai `dispatch_error` bila transaksi pasca-email gagal.
   - Izinkan `retryVerificationEmail` memproses dokumen `EMAIL_QUEUED` yang tersangkut.
2. **R2 (Timing Attack & Rate Limiter Email):**
   - Tambahkan proteksi limit per alamat email pada cek status pendaftaran.
3. **R3 (.env.example):**
   - Pulihkan `backend/.env.example` dengan variabel lengkap tanpa nilai rahasia.

---

## 5. Skenario Uji

| ID | Skenario | Hasil yang Diharapkan |
|---|---|---|
| B25-T1 | Dumi lulus, Kepala mengesahkan keputusan sidang | Status `READY_FOR_STT`; notifikasi hanya ke Dokumentator |
| B25-T2 | Draf STT dibuat saat status naskah bukan `READY_FOR_STT` | Ditolak 409 |
| B25-T3 | Mencoba membuat dua draf STT aktif pada registrasi yang sama | Ditolak 409 (kecuali reuse_existing_draft) |
| B25-T4 | Tampilan panel distributor setelah dumi lulus | Monitoring baca-saja; tidak ada tombol "Ajukan ke Admin" |
| B25-T5 | Kedua Pemaraf membubuhkan paraf pada draf STT | Kepala LPMQ menerima notifikasi `STT_READY_FOR_SIGNATURE` |
| B25-T6 | Kepala mengesahkan STT sebelum seluruh paraf lengkap | Ditolak 409 |
| B25-T7 | Kepala memberikan dispensasi darurat pada draf STT | Status paraf menjadi komplit, tercatat audit, siap disahkan Kepala |
| B25-T8 | Pemaraf yang sudah memaraf mencoba mengesahkan sebagai Kepala | Ditolak 403 (self-sign forbidden) |
| B25-T9 | Pemaraf mencoba mengakses rute pengesahan keputusan sidang | Ditolak 403 (forbidPemaraf) |
| B25-T10 | Dokumen verifikasi macet di `EMAIL_QUEUED` > 5 menit | Berhasil direklaim atomik atau di-retry via `retryVerificationEmail` |
| B25-T11 | Transaksi penutup verifikasi gagal setelah email terkirim | Status otomatis dialihkan ke `EMAIL_FAILED` dengan error detail |
| B25-T12 | Pemeriksaan `backend/.env.example` di repo | Berkas tersedia dan mencakup konfigurasi MAIL & APP |
