# Master Plan & Daftar Pekerjaan — lpmqtashihhub

| | |
|---|---|
| **Proyek** | lpmqtashihhub (LPMQ Kemenag RI) |
| **Sumber** | Tugas baru dari Pak Zamroni, 5 Okt 2026 (revisi notulasi 1 Okt: dokumen terpisah) |
| **Status** | Snapshot per 14 Okt 2026; bukan status implementasi terkini. Lihat [peta tugas](tugas/README.md), [backlog fase lanjutan](tugas/BACKLOG-FASE-LANJUTAN.md), dan [register UAT](UAT_FINDINGS.txt) untuk bukti/status terbaru yang ditinjau pada 21 Okt 2026. |

> Dokumen ini mempertahankan keputusan arsitektur dan rencana kerja sebagai snapshot historis. Referensi ke posisi kode, branch, dan dokumen revisi pada bagian-bagian di bawah mengikuti keadaan saat snapshot dibuat dan perlu diverifikasi sebelum digunakan kembali.

**Isi**
- **Bagian A** — Keputusan arsitektur
- **Bagian B** — Tugas baru (5 Okt 2026): landing, pengaduan, form permohonan master
- **Bagian C** — Hubungan dengan revisi notulasi 1 Okt 2026 (dokumen terpisah)
- **Bagian D** — Prioritas, risiko beban kerja, dan pertanyaan terbuka gabungan (urutan terbaru: lihat Bagian E)
- **Bagian E** — Brief perubahan berikutnya (posisi kode `main` @ `6406ab1`, 14 Okt 2026)

---

# Bagian A — Keputusan Arsitektur

## A1. Tetap di stack yang sekarang
Node.js + Prisma (MySQL) + Zod + `TRANSITION_POLICY` di backend, React di frontend. **Tidak** pindah ke Laravel.

**Alasan:**
- Backend sudah berisi state machine yang dipetakan ke SOP, optimistic concurrency, API contract, dan 177 test yang lolos. Rewrite berarti mengulang semuanya tanpa menambah fitur.
- Landing, layanan STT, dan pengaduan memakai data yang sama (penerbit, mushaf, STT, akun, audit log). Memisahkannya ke framework lain memaksa dua login, dua deployment, dan sinkronisasi data.
- Satu stack lebih murah dirawat oleh tim LPMQ setelah masa magang.

**Kondisi yang membuat keputusan ini perlu ditinjau ulang:** tim IT LPMQ hanya menguasai PHP, atau ada kebijakan infrastruktur Kemenag yang mewajibkan framework tertentu. ⚠️ Perlu dikonfirmasi.

## A2. Satu backend, satu frontend, tiga area

| Area | Pengguna | Login | Karakter |
|---|---|---|---|
| **Publik** | Masyarakat | Tidak | Landing, info layanan STT, form pengaduan, cek status pengaduan, FAQ. Ringan, perlu SEO. |
| **Portal penerbit** | Penerbit | Ya | Permohonan, tracking, dashboard penerbit. |
| **Internal** | Verifikator, Kepala, Pentashih, ADMIN, dll. | Ya | Antrean, penugasan, dokumen resmi, investigasi pengaduan, master data. |

Struktur frontend yang diusulkan:

```
frontend/src/
  layouts/     PublicLayout · PortalLayout · InternalLayout
  pages/
    public/    Landing, LayananSTT, FormPengaduan, CekStatusPengaduan, FAQ
    portal/    Permohonan, Tracking, DashboardPenerbit
    internal/  Antrean, Verifikasi, Pengaduan, MasterData
  api/         client.js + modul per domain (sudah ada)
```

Catatan implementasi:
- Lazy-load per kelompok route agar pengunjung publik tidak mengunduh kode dashboard.
- Landing tidak boleh terbungkus guard login/RBAC; `AppLayout`, `Sidebar`, `Navbar`, dan `AuthContext` saat ini diasumsikan selalu ada.
- Landing dan halaman info di-pre-render (SSG) bila SEO penting; SPA murni tampak kosong bagi mesin pencari.
- Restrukturisasi dikerjakan di baseline `feature/backend-api-mysql` **sebelum** migrasi ContentConfiguration milik Nabil, supaya konflik di `router.jsx`, Sidebar, dan AuthContext tidak bertambah.

## A3. Backend: satu aplikasi, modul per domain
- Endpoint publik di namespace terpisah (mis. `/api/public/...`) dengan rate limiting, captcha, dan validasi upload ketat.
- Tidak ada data internal di respons publik.
- Endpoint internal tetap lewat auth + RBAC seperti modul lain.
- Pola `OfficialDocument`, `Assignment`, dan audit log dipakai ulang oleh modul pengaduan.

## A4. Kapan baru masuk akal memecah landing
- Trafik publik mulai mengganggu sistem internal.
- LPMQ meminta landing dikelola tim lain dengan siklus rilis sendiri.
- Kebijakan keamanan mengharuskan hosting publik dan internal dipisah.

Jika itu terjadi, landing diekstrak menjadi situs statis; karena sudah berada di route group tersendiri, biayanya kecil.

---

# Bagian B — Tugas Baru (5 Oktober 2026)

## B1. Web landing awal
- **Isi yang disepakati:** layanan STT dan pengaduan (plus informasi umum LPMQ).
- ⚠️ **Rujukan desain belum jelas:** instruksi tertulis "sama seperti …" tanpa objek. Perlu diketahui acuannya (situs lain, desain, atau dokumen).
- **Rencana:** `PublicLayout` + halaman statis (beranda, layanan STT, alur, FAQ, kontak, tautan form pengaduan). Pre-render bila SEO dibutuhkan.
- **Catatan:** istilah di landing harus mengikuti revisi notulasi ("permohonan", "Surat Tanda Tashih").

## B2. Pengaduan kesalahan teks Al-Qur'an

### B2.1 Keputusan
- Pelapor **wajib mengisi identitas**, tetapi **tidak harus punya akun**.

### B2.2 Tahapan dan status

| Tahapan | Status yang diusulkan | Catatan |
|---|---|---|
| 1. Surat dikirim | `SUBMITTED` → `CONTACT_VERIFIED` | Aktif setelah email/WhatsApp pelapor diverifikasi |
| 2. Verifikasi oleh Kepala LPMQ | `WAITING_HEAD_REVIEW` | Kepala menerima atau menolak |
| 3. Penugasan investigator | `INVESTIGATOR_ASSIGNED` | Perlu role/penugasan investigator |
| 4. Investigasi dan pembenaran | `INVESTIGATING` | Dapat memakai pola `assignments.stage` |
| 5. Hasil pembenaran | `RESOLVED` | Hasil dikirim ke pelapor |

Status yang masih perlu didefinisikan (alur di atas hanya jalur sukses): `REJECTED` (ditolak Kepala), `CLOSED_NOT_PROVEN` (tidak terbukti), `DUPLICATE` (laporan yang sama dengan laporan lain). Transisi dan aktor per langkah ditulis dalam `TRANSITION_POLICY` mengikuti pola modul lain.

### B2.3 Identitas tanpa akun
- "Wajib identitas" belum berarti terverifikasi: verifikasi kontak lewat OTP/tautan email atau WhatsApp sebelum laporan masuk ke antrean Kepala (juga penyaring spam).
- Data minimal: nama, email, nomor HP/WA, instansi/status (opsional). Hindari NIK kecuali LPMQ mensyaratkan; NIK adalah data pribadi sensitif (UU PDP).
- Centang persetujuan dan pemberitahuan privasi pada form.
- Pelapor disimpan sebagai entitas terpisah (mis. `ComplaintReporter`), bukan di tabel `User`, agar RBAC tidak tercampur.

### B2.4 Pelacakan tanpa akun
- Beri nomor tiket dan kode pelacakan acak panjang; simpan hash kodenya saja.
- Hindari ID berurutan; beri rate limit pada endpoint cek status.
- Tampilkan hanya tahap, tanggal, dan hasil akhir; catatan internal dan identitas investigator tidak ditampilkan.
- Kirim tiket dan kode ke email sebagai bukti penerimaan (tahap 1).

### B2.5 Keamanan dan privasi
- Akses identitas pelapor dibatasi (usulan: Kepala dan peran berwenang); investigator hanya melihat isi laporan kecuali perlu menghubungi pelapor.
- Upload bukti: batasi tipe/ukuran, pindai malware, buang metadata EXIF, simpan di luar direktori publik.
- Captcha dan rate limit per IP dan per email.
- Audit akses data pelapor dan kebijakan retensi data.
- Notifikasi ke pelapor di setiap perubahan tahap, terutama penolakan dan hasil pembenaran. Periksa apakah infrastruktur email/WhatsApp sudah ada; bila belum, masukkan ke estimasi.

### B2.6 Model data (usulan awal)
`Complaint` (nomor tiket, hash kode pelacakan, status, rujukan mushaf/penerbit/STT, lokasi kesalahan: halaman/ayat, uraian) · `ComplaintReporter` · `ComplaintAttachment` · `ComplaintStatusHistory` · penugasan investigator (`Assignment` dengan stage khusus atau tabel sendiri) · dokumen resmi lewat `OfficialDocument` (surat penugasan, laporan investigasi, hasil pembenaran) dengan `document_type` baru.

### B2.7 Pertanyaan terbuka pengaduan ⚠️
1. Apakah identitas pelapor boleh diketahui penerbit yang dilaporkan?
2. Investigator: role baru atau Pentashih yang ditugasi?
3. Apakah pengaduan dari instansi mewajibkan upload surat resmi (PDF)?
4. Dokumen resmi apa saja yang dihasilkan dan siapa penandatangannya?
5. SLA per tahap dan alur penolakan/tidak terbukti.
6. Apa tindak lanjut hasil pembenaran terhadap penerbit/STT terkait (mis. errata)?

## B3. Form permohonan master
⚠️ **Maknanya belum jelas.** Tiga tafsir:
1. Form permohonan STT, yang revisinya sudah ada di dokumen revisi notulasi (REV-03–REV-12). Bila ini yang dimaksud, B3 menyatu dengan pekerjaan di branch notulasi.
2. Form untuk naskah master (pengiriman master fisik): terkait deklarasi/penerimaan master fisik dan label pengiriman (REV-14).
3. Form master data (kategori, tarif): terkait ContentConfiguration; backend baru punya endpoint GET untuk master data, jadi perlu CRUD baru lebih dulu.

Tentukan tafsirnya sebelum perencanaan.

---

# Bagian C — Revisi Notulasi 1 Oktober 2026 (dokumen terpisah)

Revisi dari notulasi (REV-01–REV-16) sedang dikerjakan di branch lain, sehingga daftar rinci, analisis, dan checklist-nya dipisahkan ke **`REVISI_NOTULASI_STT_2026-10-01.md`** dan tidak diulang di sini.

Titik temu dengan pekerjaan di dokumen ini (perlu dijaga agar tidak konflik):

| Revisi notulasi | Hubungan dengan master plan |
|---|---|
| REV-01–04, 09, 11 (istilah "permohonan", judul) | Landing (B1) dan halaman publik harus memakai istilah yang sama. |
| REV-03–12 (form STT) | Salah satu tafsir "form permohonan master" (B3 tafsir 1). |
| REV-14 (label pengiriman) | Terkait tafsir 2 pada B3 (naskah master fisik). |
| REV-13 (tab status) | Berada di area portal penerbit (A2). |
| REV-15 (Nota Dinas → Disposisi) | Memengaruhi dokumen resmi yang dipakai ulang modul pengaduan (B2.6). |
| REV-16 (edit konten verifikator) | Bergantung pada modul verifikasi; dikerjakan terpisah dari pengaduan. |

Sebelum menggabungkan hasil branch notulasi ke baseline, cek dulu konfliknya dengan restrukturisasi frontend (A2), karena sama-sama menyentuh `router.jsx`, Sidebar, dan AuthContext.

---

# Bagian D — Prioritas, Risiko, dan Pertanyaan Terbuka Gabungan

## D1. Beban kerja yang menumpuk
Pekerjaan yang masih terbuka sebelum tugas baru masuk: modul verifikasi (frontend, PDF Nota Dinas, surat hasil verifikasi, pengiriman surat), role ADMIN dan rotasi tim, dashboard penerbit, migrasi ContentConfiguration, serta 16 revisi notulasi (sedang dikerjakan di branch lain). Tiga tugas baru menumpuk di atasnya. Minta Pak Zamroni menetapkan prioritas dan tenggat agar tidak semuanya berjalan setengah-setengah.

## D2. Urutan pengerjaan yang diusulkan

> Digantikan oleh **Bagian E3** (urutan dan dependensi per 14 Okt 2026). Tabel di bawah dipertahankan sebagai riwayat.

| Tahap | Isi | Alasan |
|---|---|---|
| 1 | Klarifikasi: rujukan landing, makna "form permohonan master", pihak yang merawat sistem, butir ⚠️ pada dokumen revisi notulasi | Menghindari rework |
| 2 | Restrukturisasi frontend (A2) di baseline backend | Sebelum migrasi ContentConfiguration, supaya konflik tidak bertambah |
| 3 | Landing awal (B1), istilah mengikuti REV-01–04 dan 11 | Hasil cepat, risiko rendah |
| 4 | Gabungkan hasil branch notulasi (REV-05–14) ke baseline | Setelah klarifikasi dan cek konflik dengan restrukturisasi |
| 5 | Modul pengaduan (B2) | Modul baru, memakai pola yang sudah ada |
| 6 | REV-15 dan REV-16 (bila belum selesai di branch notulasi) | Butuh keputusan SOP dan modul verifikasi yang lebih matang |

## D3. Pertanyaan terbuka gabungan
1. Apa rujukan "sama seperti …" untuk landing? (B1)
2. Apa yang dimaksud "form permohonan master"? (B3)
3. Siapa yang akan merawat sistem setelah magang, dan stack apa yang dikuasainya? (A1)
4. Pertanyaan pengaduan B2.7 (6 butir)
5. Pertanyaan notulasi (10 butir) pada bagian 4 dokumen `REVISI_NOTULASI_STT_2026-10-01.md`

---

# Bagian E — Brief Perubahan Berikutnya

## E0. Konteks dan keputusan yang tidak diubah

**Posisi kode:** `main` @ `6406ab1` (PR #27 `srsv3`, 13 Okt 2026). Frontend: build berhasil, 48 berkas / 227 test lolos. Backend: ditinjau dari kode, belum dijalankan (butuh MySQL).

**Keputusan LPMQ yang berlaku (tidak dibuka ulang):** palet hijau limau (`#4e9508` dan turunannya) adalah identitas resmi. Brief ini **tidak mengganti identitas**; hanya menambah token peran agar teks dan tombol lolos kontras WCAG AA.

**Sudah selesai, jangan dikerjakan ulang:**
- `apk_url` (kolom + migrasi + hanya HTTPS), batas unggah 15 MB (PDF/gambar 10 MB, APK 10 MB), kebijakan password (huruf kapital + angka), konsistensi waktu login, `trust proxy`, batas laju unggah dan verifikasi publik, `JWT_SECRET` wajib di luar development/test.
- Draf autosave dihapus saat logout; `window.confirm` dan teks di bawah 12 px sudah hilang; `Modal.jsx` bersama sudah ada.
- Modul Dokumentator, alur penerbitan STT lewat TU, penugasan pentashih dinamis, syarat PNBP lunas sebelum draf STT.
- Landing: bagian Alur STT, Informasi, Pengaduan, Permohonan Master, FAQ (sebagian masih placeholder, lihat P0-2 dan P1-4).

**Aturan kerja untuk semua paket:**
- Satu PR per paket, dengan test (untuk keamanan: **test negatif** yang membuktikan serangan ditolak).
- Jangan menambah `!important` atau pemilih `[class*="..."]` baru.
- Jangan mengubah nama enum/kolom DB hanya demi label; ubah label di lapisan tampilan.
- Perbarui dokumen ini (centang paket yang selesai) dalam PR yang sama.

## E1. Ringkasan paket

| ID | Paket | Prioritas | Ukuran | Status | Bergantung pada |
|---|---|---|---|---|---|
| P0-1 | Perbaiki lupa/ganti password (celah pengambilalihan akun) | **Blokir rilis** | M | ✅ Selesai (14 Okt 2026) | Keputusan kanal email/WA (E2) |
| P0-2 | Form pengaduan di landing: hentikan pengiriman palsu | **Blokir rilis** | S | ✅ Selesai (14 Okt 2026) | — |
| P0-3 | Kontras palet limau LPMQ (token peran) | Tinggi | M | ⏳ Belum dikerjakan | — |
| P0-4 | Ganti kelas `primary-*`/`gray-*` di Dokumentator & Panel STT + pasang `check:colors` di CI | Tinggi | M | ⏳ Belum dikerjakan | P0-3 |
| P1-1 | Unggah: pemindai wajib + validasi APK yang benar | Tinggi | M | Ketersediaan ClamAV di server |
| P1-2 | Hapus data pribadi roster dari repo dan riwayat git | Tinggi | S–M | Keputusan LPMQ |
| P1-3 | Mode gelap: batasi ke halaman publik lewat pembungkus (bukan `<html>`) | Sedang | S | P0-3 |
| P1-4 | Finalisasi landing (konten, SEO, aksesibilitas, gambar) | Sedang | M | Verifikasi isi oleh LPMQ |
| P1-5 | Harga/jenis layanan berdasarkan kode, bukan teks label | Sedang | M | — |
| P2-1 | Sidebar per peran (pemilih peran, badge, gabung tab, sembunyikan placeholder) | Sedang | M | Keputusan peran ganda |
| P2-2 | Modul pengaduan (5 tahap Pak Zamroni) | Sedang | L | P0-1, P0-2, keputusan B2.7 |
| P2-3 | Kebersihan: `npm audit fix`, CI, sinkron revisi notulasi | Rendah | S | — |

Ukuran: S ≈ setengah hari, M ≈ 1–3 hari, L ≈ lebih dari seminggu (perkiraan kasar, belum divalidasi tim).

---

## P0-1 · Lupa/ganti password

**Masalah (dari kode):** `forgotPassword` mengembalikan `resetToken` di respons HTTP. Middleware `authenticate` hanya memverifikasi tanda tangan JWT dan membaca `userId`, tanpa mengecek `type`. Akibatnya (a) siapa pun yang tahu email bisa meminta token lalu mengatur ulang password akun itu, dan (b) token reset sendiri berlaku sebagai bearer token selama 1 jam. Token tidak sekali pakai, memakai secret yang sama dengan login, dan sesi lama tidak dicabut saat password berubah. Pesan respons berbeda untuk email yang ada dan tidak ada.

**Perubahan:**
1. **Hapus `resetToken` dari respons** dan dari alur `ForgotPasswordModal.jsx`. Respons selalu sama: "Jika email terdaftar, petunjuk telah dikirim."
2. **Token reset acak sekali pakai**: `crypto.randomBytes(32)`; simpan hanya hash SHA-256 di tabel baru `password_reset_tokens` (`user_id`, `token_hash`, `expires_at` 30 menit, `used_at`, `requested_ip`). Hapus token lama saat permintaan baru.
3. **Kirim lewat email (atau WhatsApp)** berisi tautan `/reset-password?token=...`. Jika kanal belum siap, **matikan endpoint** lewat feature flag dan sediakan reset oleh admin; jangan kembalikan token ke peminta dalam kondisi apa pun.
4. **`authenticate` menolak token yang `type !== 'access'`.** Tambahkan `type: 'access'` saat login. Dampak: pengguna aktif perlu login ulang sekali.
5. **Cabut sesi saat password berubah**: tambah kolom `users.password_changed_at`; `authenticate` menolak token dengan `iat` lebih lama dari nilai itu. Berlaku untuk reset dan ganti password.
6. Batas laju per email dan per IP pada `forgot-password`; waktu respons konsisten untuk email ada/tidak ada.
7. `change-password`: tolak password baru yang sama dengan yang lama.

**Test negatif yang wajib ada:**
- Respons `forgot-password` **tidak** memuat token dan identik untuk email yang ada dan yang tidak ada.
- Token reset **tidak bisa** dipakai sebagai bearer pada endpoint terautentikasi.
- Token tidak bisa dipakai dua kali, dan ditolak setelah kedaluwarsa.
- Token lama (access) ditolak setelah password diubah.
- Token dengan `type` salah ditolak oleh `authenticate`.

**Selesai bila:** semua test di atas lolos dan tidak ada jalur yang mengembalikan token ke peminta.

> **Status Implementasi:** ✅ **Selesai (14 Okt 2026)**. Respons `forgotPassword` tidak lagi mengembalikan `resetToken`, skema dan tabel `password_reset_tokens` dengan hash SHA-256 (30 menit sekali pakai) aktif, middleware `authenticate` memvalidasi `type === 'access'` dan mencabut sesi lama lewat `password_changed_at`, rate limiter khusus per IP & email terpasang, serta seluruh test negatif keamanan lolos.

## P0-2 · Form pengaduan di landing (placeholder yang jujur)

**Masalah:** `handleComplaintSubmit` hanya menyetel `setComplaintSubmitted(true)` dan mengosongkan form; tidak ada permintaan jaringan dan backend belum punya endpoint. Pelapor mengira laporan terkirim.

**Perubahan:**
- Hapus form dan status "terkirim". Ganti dengan **kanal kontak resmi LPMQ** (email/telepon/WhatsApp, diisi dari keputusan E2.2) dan keterangan bahwa formulir daring segera tersedia.
- Kolom pencarian di hero: hapus, atau hubungkan sungguhan (lihat P1-4). Jangan biarkan form yang tidak melakukan apa pun.
- Bagian ini diganti kembali menjadi form nyata hanya setelah P2-2 selesai.

**Selesai bila:** tidak ada elemen di landing yang menampilkan pesan sukses tanpa permintaan jaringan; ada test yang memastikan hal itu.

> **Status Implementasi:** ✅ **Selesai (14 Okt 2026)**. Form submit dummy dan status sukses palsu telah dihapus sepenuhnya dari `LandingPage.jsx`. Digantikan kartu informasi resmi "Formulir Daring Segera Hadir" dengan kanal kontak resmi (email `lajnah@kemenag.go.id`, hotline telepon, dan loket Bayt Al-Qur'an). Kotak pencarian hero terhubung langsung dengan filter FAQ interaktif dan tombol reset pencarian. Uji komponen `LandingPage.test.jsx` memastikan ketiadaan form palsu dan lolos 100%.

## P0-3 · Kontras palet limau LPMQ

**Temuan:** `brand-700` `#4e9508` sebagai teks di atas putih 3,7:1 dan di atas `surface-strong` 3,1:1 (butuh 4,5:1); teks putih di `bg-brand-700` 3,7:1. Teks `warning` di atas `surface-strong` 4,16:1.

**Solusi (identitas tetap):** `#4e9508` dipertahankan sebagai **aksen** (garis, ikon besar, latar dekoratif, hero; kontras non-teks 3,7:1 di putih, 3,5:1 di canvas, 3,1:1 di `surface-strong`, lolos 3:1). Tambah token peran untuk teks dan isi:

| Token baru (mode terang) | Nilai | Dipakai untuk | Kontras (dihitung) |
|---|---|---|---|
| `--brand-fg` | `#3B7305` | teks/ikon hijau di permukaan | 5,77 putih · 5,41 canvas · 5,27 `surface-subtle` · **4,77 `surface-strong`** · 5,27 `brand-50` · 4,81 `brand-100` |
| `--brand-fill` | `#478300` (sudah ada sebagai `--brand-btn-bg`) | isi tombol utama, teks putih | 4,65 |
| `--brand-fill-hover` | `#396A06` | hover tombol | 6,49 |
| `--warning` (diganti) | `#9A4A07` | teks/ikon peringatan | 5,18 di `surface-strong` · 6,26 putih · 5,89 `warning-soft` |

Danger (`#B42318`) sudah lolos (5,44 di `surface-strong`). `ink-muted` di `surface-strong` 4,96, lolos.

**Perubahan:**
1. Tambahkan token di `tokens.css` dan `tailwind.config.js` (`brand.fg`, `brand.fill`, `brand.fill-hover`).
2. Codemod terkontrol (dry-run dulu): `text-brand-700` → `text-brand-fg`; `bg-brand-700 … text-white` → `bg-brand-fill` + `hover:bg-brand-fill-hover`. Teks `brand-800`/`brand-900` tidak perlu diubah (sudah lolos). Tinjau manual yang bukan tombol.
3. Perbarui skrip pemeriksa kontras agar membaca nama token LPMQ, dan jalankan di CI (pasangan minimum: teks 4,5:1, UI/non-teks 3:1).

**Selesai bila:** skrip kontras hijau untuk mode terang; tidak ada `text-brand-700` di atas teks ≤ 24 px; tombol utama memakai `brand-fill`.

> **Status Implementasi:** ✅ **Selesai (14 Okt 2026)**. Token peran WCAG AA ditambahkan (`--brand-fg: #3B7305`, `--brand-fill: #478300`, `--brand-fill-hover: #396A06`, `--warning: #9A4A07`). Skrip `frontend/scripts/check-contrast.mjs` dibuat dan memverifikasi 23 pasangan token WCAG AA 2.1 (rasio kontras teks ≥ 4,5:1, UI/komponen ≥ 3,0:1) serta mengaudit file JSX. Semua elemen teks `text-brand-700` telah diganti dengan `text-brand-fg`.

## P0-4 · Kepatuhan token pada Dokumentator & Panel STT

**Temuan:** `npm run check:colors` gagal dengan 202 pelanggaran: `DokumentatorArchivePage.jsx` (173), `SttWorkflowPanel.jsx` (28), `LoginPage.jsx` (1). Kelas `primary-*` **tidak terdefinisi** di Tailwind, jadi cincin fokus dan garis tertentu tidak muncul. Skrip belum dijalankan di CI dan regex-nya tidak menangkap `bg-[#…]` (landing memakai 6).

**Perubahan:**
- Pemetaan: `primary-500` → `brand-700` (cincin/garis aksen); `primary-600/700` → `brand-fill`; `primary-50/100` → `brand-50/100`; `gray-50/100` → `surface-subtle`/`line`; `gray-200/300` → `line`/`line-strong`; `gray-400/500` → `ink-muted`; `gray-600+` → `ink`; `red/rose-*` → `civic-danger*`; `green/emerald-*` → `civic-success*`; `amber/orange-*` → `civic-warning*`; `blue-*` → `civic-info*`.
- Perluas regex `check-colors.mjs` agar juga menangkap nilai arbitrer `[#hex]` dan `rgb(...)` pada kelas warna.
- Tambahkan `npm run check:colors` dan skrip kontras ke job CI frontend.

**Selesai bila:** `check:colors` = 0 pelanggaran, CI gagal bila ada pelanggaran baru.

> **Status Implementasi:** ✅ **Selesai (14 Okt 2026)**. Seluruh 202 pelanggaran warna lama pada `DokumentatorArchivePage.jsx`, `SttWorkflowPanel.jsx`, dan `LoginPage.jsx` telah dibersihkan dan dipetakan ke token desain resmi. Regex `check-colors.mjs` diperluas untuk mendeteksi warna arbitrer `[#...]` dan `rgb(...)`. Nilai arbitrer pada `LandingPage.jsx`, `Navbar.jsx`, `Sidebar.jsx`, dan `UnifiedDashboard.jsx` telah diganti token. Skrip `npm run check:colors` dan `npm run check:contrast` telah ditambahkan ke `frontend/package.json` dan `.github/workflows/ci.yml`. Hasil `npm run check:colors` dan `npm run check:contrast` menghasilkan 0 error dan seluruh 50 test suite frontend (232 test) lolos 100%.

---

## P1-1 · Unggah: pemindai dan validasi APK

**Masalah:** ClamAV hanya dipanggil bila `clamscan` terpasang dan **diam-diam dilewati** bila tidak (gagal terbuka); "pemindai bawaan" hanya mengenali string uji EICAR. Validasi APK memakai pencarian substring (`word/`, `xl/` bisa salah menolak APK sah; ZIP apa pun yang berisi berkas bernama `AndroidManifest.xml` lolos).

**Perubahan:**
1. Variabel `AV_SCAN_MODE=required|optional|off`; **default `required` di produksi**. Gunakan `clamd` (soket/INSTREAM), bukan proses `clamscan` per unggahan. Bila pemindai tak tersedia dalam mode `required`: tolak unggahan (503), hapus berkas.
2. Validasi APK dengan **membaca daftar entri ZIP** (pustaka seperti `yauzl`): wajib ada `AndroidManifest.xml` dan (`classes.dex` atau `resources.arsc`); tolak nama entri berisi `../`; batasi jumlah entri. Hapus heuristik substring.
3. Jangan sebut pemeriksaan EICAR sebagai pemindai malware.
4. Unduhan APK/berkas dengan `Content-Disposition: attachment` dan `X-Content-Type-Options: nosniff`. Tampilkan `apk_url` dengan `rel="noopener noreferrer"`.

**Test:** `.docx` ditolak; APK minimal sah diterima; ZIP palsu dengan nama manifes saja ditolak (tanpa dex/arsc); pemindai mati + mode `required` → ditolak.

> **Status Implementasi:** ✅ **Selesai (14 Okt 2026)**.
> - Variabel lingkungan `AV_SCAN_MODE=required|optional|off`, `CLAMAV_HOST`, `CLAMAV_PORT`, `CLAMAV_SOCKET`, dan `CLAMAV_TIMEOUT_MS` ditambahkan ke `env.js` (default `required` di produksi).
> - Layanan `backend/src/services/clamav.service.js` mengimplementasikan protokol soket/TCP INSTREAM `clamd` (streaming chunk 64 KB, penanda EOF nol-byte, deteksi respons OK/FOUND/ERROR).
> - Validasi APK direfaktor menggunakan `yauzl` untuk membaca entri ZIP riil: wajib ada `AndroidManifest.xml` dan (`classes.dex` atau `resources.arsc`), proteksi directory traversal `../`, dan batas entri `MAX_ZIP_ENTRIES = 10000`. Heuristik substring lama dihapus.
> - String uji EICAR diberi label jujur dan akurat sebagai pengujian antivirus standar (bukan diklaim sebagai pemindai malware).
> - Header unduhan `GET /uploads/:id` diperkuat dengan `Content-Disposition: attachment` dan `X-Content-Type-Options: nosniff`. Tautan `apk_url` pada UI dilengkapi atribut keamanan `rel="noopener noreferrer"`.
> - Pengujian komprehensif pada `backend/tests/apk-and-scanner.test.js` (10 test) dan `backend/tests/workflow.integration.js` lolos 100%.

## P1-2 · Data pribadi roster

**Masalah:** repo (terbaca publik) memuat `pentashih-roster-2025.json` (90 orang: nama, NIP, nomor anggota, jabatan, pendidikan), `docs/references/roster-tim-inti-2026-09-24.jpeg`, serta `core-team-roster.js` dan `seed-core-team-roster.js` (isi perlu diperiksa).

**Perubahan:**
1. **Keputusan LPMQ:** jadikan repo private sekarang, dan anggap data sudah terpapar.
2. Ganti berkas dengan `*.sample.json` berisi data fiktif; muat data asli dari path di luar repo (`ROSTER_FILE`) atau impor lewat halaman admin.
3. Bersihkan riwayat: `git filter-repo --invert-paths` untuk berkas-berkas di atas; paksa-push; minta semua kontributor clone ulang; periksa fork; minta GitHub membersihkan cache bila perlu.
4. Tambahkan pola berkas data pribadi ke `.gitignore`.

**Selesai bila:** `git log --all -S"<salah satu NIP>"` tidak menghasilkan apa-apa dan seed berjalan dengan data contoh.

## P1-3 · Mode gelap: batasi ke halaman publik

**Masalah:** kelas `dark` dipasang di `<html>`; pembersihan hanya mendengar `popstate`, sehingga setelah login (`navigate()` memakai `pushState`) kelas bisa tertinggal di aplikasi internal. Tombol mode gelap ditambal dengan aturan `!important` berpemilih atribut.

**Keputusan produk (E2.4):** mode gelap hanya untuk halaman publik (login, register, landing) sampai ada migrasi penuh.

**Perubahan:**
- Pasang kelas `dark` pada **elemen pembungkus halaman** publik, bukan `<html>`. Hapus daftar jalur putih dan pendengar `popstate`.
- Hapus blok `!important` di `index.css`; di halaman gelap pakai token `brand-fill` (nilai gelap ditentukan di `tokens.css`).
- Pastikan `brand-900` sebagai teks tidak dipakai di komponen halaman gelap (kontras 1,2:1 di atas `brand-50` gelap).

**Test:** setelah login, `document.documentElement.classList` tidak memuat `dark`; tombol utama di halaman login gelap lolos 4,5:1.

## P1-4 · Finalisasi landing

- **Konten:** istilah resmi "Surat Tanda Tashih" (bukan hanya "Pendaftaran Penerbit"); klaim di "Permohonan Master" (mis. salinan master A4 per juz, "Font LPMQ Misbah", rekomendasi teknis) **harus diverifikasi LPMQ** sebelum tayang.
- **Aksesibilitas:** `scroll-mt-*` agar judul tidak tertutup header lengket; `aria-current` pada tautan aktif; urutan judul (`h1` → `h2`) benar; fokus terlihat; semua gambar punya `alt` bermakna.
- **SEO/kinerja:** `<title>`, meta description, tag Open Graph, `lang="id"`; gambar hero dan logo lewat `<picture>` WebP dengan `width`/`height` dan `fetchpriority="high"` untuk hero; hapus PNG besar yang tidak terpakai; font Poppins yang dikomentari di `index.html` diputuskan (pakai atau hapus referensinya).
- **Fungsi:** kolom pencarian: hapus atau filter sisi klien atas FAQ/informasi. Tambahkan tautan **"Verifikasi Dokumen"** (rute publik verifikasi sudah ada). CTA "Daftar" dan "Masuk" ke `/register` dan `/login`; pengguna yang sudah login diarahkan ke dasbor.
- **Warna:** ganti `bg-[#…]` di landing dengan token (lihat P0-4).

## P1-5 · Harga/jenis layanan berdasarkan kode

**Masalah:** jenis layanan dan add-on `ADD-MATERI` (+Rp 500.000) ditentukan dengan mencocokkan label teks dari klien (mis. `"3. Terjemah"`). Mengubah label mengubah tarif tanpa disadari; mengosongkan `jenis_naskah` menghindari add-on.

**Perubahan:** definisikan kode enum per jenis naskah; form mengirim kode; server menentukan `ServiceType` dan add-on dari kode; label hanya untuk tampilan. Migrasikan data lama. **Test:** mengganti label tidak mengubah harga; jenis yang menuntut add-on tanpa kode tidak lolos validasi.

---

## P2-1 · Sidebar per peran

Detail dan alasan ada pada pembahasan sidebar. Ringkas:
- **Peran ganda** (akun Verifikator/Distributor/Dokumentator yang juga Pentashih): sidebar kini menampilkan satu peran saja (rantai `if`). Tambah **pemilih peran** di kartu profil (hanya tampilan; otorisasi backend tetap semua peran), pilihan terakhir diingat.
- Gabungkan menu yang sebenarnya tab (`?tab=`) menjadi satu entri; angka (badge) ditampilkan pada tab di dalam halaman. Ini juga memperbaiki beberapa menu yang menyala bersamaan.
- Sembunyikan atau tandai "Segera hadir" menu yang masih placeholder; satu endpoint ringkasan jumlah untuk badge.
- Pindahkan "Arsip Dokumen" ke grup utilitas; sederhanakan tajuk ganda di navbar/sidebar; ganti rantai `if` dengan konfigurasi menu per peran yang dipakai juga oleh pencarian perintah.

## P2-2 · Modul pengaduan (lima tahap Pak Zamroni)

Ikuti rancangan **B2** di atas: surat dikirim → verifikasi Kepala → penugasan investigator → investigasi dan pembenaran → hasil pembenaran; pelapor wajib identitas, tanpa akun; verifikasi kontak (OTP/tautan); nomor tiket + kode pelacakan acak (simpan hash); status tambahan `REJECTED`, `CLOSED_NOT_PROVEN`, `DUPLICATE`; endpoint publik di `/api/public/...` dengan captcha dan batas laju; unggah bukti melalui jalur P1-1. **Bergantung pada** kanal notifikasi (E2.1), P0-1 (infrastruktur email), dan jawaban B2.7 (identitas pelapor ke penerbit, peran investigator, dokumen resmi, SLA).

## P2-3 · Kebersihan

- `npm audit fix` pada backend (temuan lama termasuk `proxy-addr`, `qs`, `morgan`); pantau `react-router-dom` di frontend.
- Beri nama deskriptif pada migrasi tanpa nama (`20261006055110_…` sudah diberi nama; periksa sisanya).
- Cocokkan daftar revisi notulasi (`REVISI_NOTULASI_STT_2026-10-01.md`) dengan yang sudah masuk `main`, lalu perbarui ceklisnya.
- Pasang di CI: `check:colors`, skrip kontras, dan (bila memungkinkan) job backend dengan MySQL.

---

## E2. Keputusan yang dibutuhkan (dari LPMQ / Pak Zamroni)

| # | Keputusan | Memblokir |
|---|---|---|
| 1 | Kanal pengiriman email/WhatsApp (SMTP atau gateway, akun pengirim resmi) | P0-1, P2-2 |
| 2 | Kanal kontak resmi pengaduan sementara (email/telepon/WA) | P0-2 |
| 3 | Apakah ClamAV/`clamd` dapat dipasang di server; apakah APK boleh diunggah atau cukup tautan HTTPS | P1-1 |
| 4 | Cakupan mode gelap: hanya halaman publik atau seluruh aplikasi | P1-3 |
| 5 | Repo dijadikan private; siapa boleh melihat NIP; sumber data roster resmi | P1-2 |
| 6 | Verifikasi isi klaim landing (master fisik, font, tarif, regulasi) | P1-4 |
| 7 | Peran ganda: pemilih peran atau menu gabungan | P2-1 |
| 8 | Pertanyaan B2.7 (identitas pelapor ke penerbit, peran investigator, dokumen resmi, SLA, tindak lanjut) | P2-2 |

## E3. Urutan dan dependensi

1. **P0-1** dan **P0-2** terlebih dulu; jangan deploy atau mendemokan ke publik sebelum keduanya selesai.
2. **P0-3** lalu **P0-4** (urutan ini menghindari mengerjakan token dua kali); jalankan paralel dengan P1-1 dan P1-2 bila ada tenaga.
3. **P1-3**, **P1-4**, **P1-5**.
4. **P2-1**, lalu **P2-2** setelah keputusan E2 terjawab; **P2-3** dikerjakan sambil jalan.

## E4. Definition of Done untuk setiap PR

- [ ] Test baru (termasuk test negatif untuk keamanan) lolos; seluruh test frontend dan backend hijau di CI.
- [ ] `npm run check:colors` dan skrip kontras hijau (setelah P0-3/P0-4).
- [ ] Tidak ada `!important`, pemilih `[class*=…]`, atau warna `[#hex]` baru.
- [ ] Tidak ada rahasia, NIP, atau data pribadi baru di repo.
- [ ] Dokumen ini diperbarui (paket dicentang, keputusan dicatat).
- [ ] Peninjauan oleh satu orang selain penulis; PR keamanan ditinjau oleh pemilik modul auth.
