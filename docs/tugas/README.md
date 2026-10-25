# Peta Tugas: Tindak Lanjut Notulensi Rapat 15 Okt 2026

Dokumen ini adalah pintu masuk. Setiap paket pekerjaan punya file sendiri dan **satu branch sendiri**.

- Disusun: 19 Okt 2026
- Status bukti implementasi ditinjau: 21 Okt 2026
- Sumber: notulensi rapat laporan magang (15 Okt 2026), jawaban klarifikasi, dan dokumen label pengembalian naskah
- Pemilik: Fakhri (backend, koordinasi, review) dan Faisal (frontend pendaftaran penerbit)

## Status bukti implementasi per 21 Oktober 2026

Status berikut membedakan keberadaan kode dari selesainya semua kriteria. PR/merge tidak dicantumkan kecuali dapat dibuktikan dari checkout; status ini bukan pengganti review penerimaan.

| Paket | Status | Bukti dan batas yang diketahui |
|---|---|---|
| T-F01, T-F02, T-F04–T-F07 | **Selesai menurut checklist tugas** | Checklist detail ditandai selesai; implementasi terkait ada di `backend/src/routes/publisher-registration.routes.js`, layanan pendaftaran, dan test backend. Status merge PR tidak diverifikasi terpisah. |
| T-F03 | **Parsial / lingkungan belum diverifikasi** | Hasil pembersihan lokal dicatat; dokumen hanya menyatakan skrip server disiapkan, bukan bukti eksekusi di setiap lingkungan. |
| T-S01 | **Parsial** | `frontend/src/features/auth/RegisterPublisherPage.jsx` masih menyediakan jenis `PERORANGAN`, bertentangan dengan kontrak penerbit yang disetujui. Jangan anggap formulir lama memenuhi T-S01. |
| T-S02 | **Parsial** | API pendaftaran/status/perbaikan ada di backend, tetapi tidak ditemukan halaman frontend untuk cek status/perbaikan maupun penanganan login `PUBLISHER_NOT_APPROVED`. |
| T-S03 | **Parsial** | `frontend/src/features/internal/publishers/PublisherVerificationPage.jsx` menyediakan daftar dan aksi verifikasi dasar, tetapi kriteria perlu perbaikan/penolakan dan peninjauan detail dokumen belum terpenuhi oleh halaman tersebut. |
| B-01 | **Selesai menurut bukti kode** | Model pengajuan/naskah/varian, alur pendaftaran, kalkulasi item, dan test terkait tersedia. B-03 juga mencatat B-01 telah di-merge ke `main`; nomor PR tidak diklaim di sini. |
| B-02 | **Belum dimulai** | Register UAT menyebut bug “tidak setuju” belum direproduksi (`docs/UAT_FINDINGS.txt`). |
| B-03 | **Parsial** | Sequence, migrasi, dan generator backend ada. Integrasi frontend tidak mengirim `auto_number` atau `auto_generate`; tanpa flag itu backend masih meminta nomor manual. Lihat rincian di file B-03. |
| B-04–B-13 | **Belum diverifikasi** | Fitur terkait atau fondasinya ada di repository, tetapi bukti yang ditinjau belum cukup untuk menyatakan setiap kriteria paket ini selesai atau belum dimulai. |

**Definisi status:** *Selesai* = bukti checkout/checklist mendukung kriteria yang dinyatakan; *Parsial* = sebagian alur ada tetapi ada gap yang disebutkan; *Belum diverifikasi* = bukti belum cukup; *Belum dimulai* = sumber tugas saat ini menyatakan belum ada reproduksi/pekerjaan yang dapat dinilai. Jangan menafsirkan “tidak diverifikasi” sebagai “tidak ada kode”.

## 1. Isi folder

| File / Paket | Pemilik (PIC) | Branch | Keterangan |
|---|---|---|---|
| **Fase 1 (Pendaftaran Penerbit)** | | | |
| `fakhri/T-F01` s.d. `T-F07` | Fakhri | `feat/api-pendaftaran-penerbit` | Checklist selesai; merge PR belum diverifikasi terpisah |
| `faisal/T-S01-form-pendaftaran-penerbit.md` | Faisal | `feat/fe-form-pendaftaran-penerbit` | **Parsial**: formulir lama masih menerima perorangan |
| `faisal/T-S02-cek-status-dan-perbaikan.md` | Faisal | `feat/fe-cek-status-dan-perbaikan` | **Parsial**: API ada; alur UI belum ditemukan |
| `faisal/T-S03-verifikasi-penerbit-admin.md` | Faisal | `feat/fe-verifikasi-penerbit-admin` | **Parsial**: verifikasi dasar tersedia; alur keputusan belum lengkap |
| **Fase Lanjutan** | | | |
| `B-01` s.d. `B-04` | Fakhri | `feat/pengajuan-banyak-naskah-varian` dkk. | Status per paket dan bukti: [backlog fase lanjutan](BACKLOG-FASE-LANJUTAN.md) |
| `B-05` s.d. `B-08` | *(Menunggu arahan)* | `feat/distribusi-kelompok-juz` dkk. | Status per paket: belum diverifikasi |
| `B-09` s.d. `B-11` | Nabil | `feat/penerbitan-surat-hasil-stt` dkk. | Status per paket: belum diverifikasi |
| `B-12` dan `B-13` | Choirul | `chore/glosarium-narasi`, `feat/dashboard-penerbit` | Status per paket: belum diverifikasi |

## 2. Urutan dan dependensi (Fase 1: pendaftaran penerbit)

```
T-F01 kontrak API ──┬─► T-S01 form ───────────┐
                    ├─► T-S02 cek status ──────┤
                    │                          ├─► integrasi dengan API nyata
T-F02 RBAC ADMIN_INTERNAL ───┤                          │
T-F03 bersihkan ────┴─► T-F04 skema ─► T-F05 upload aman ─► T-F06 API ─► T-S03 admin
T-F07 hardening: paralel, kapan saja setelah BASE ditetapkan
```

Aturan urutan:
1. T-F01 dikerjakan paling awal karena membuka pekerjaan Faisal.
2. T-F03 (hapus data perorangan) harus jalan di setiap lingkungan **sebelum** migrasi T-F04 yang membuang nilai "perorangan" dari enum.
3. T-S01 dan T-S02 bisa mulai setelah T-F01 dibekukan. Integrasi dengan API nyata menunggu T-F06.
4. T-S03 menunggu T-F06 dan T-F02.

## 3. Langkah 0: tetapkan branch dasar (`<BASE>`)

Semua branch fitur dibuat dari **satu** `<BASE>` yang sama. Jangan dari `frontend-pendaftaran-byN`.

- [x] Push commit lokal `2180f43` (branch `verifikasi` sudah digabung ke `main` via PR #9).
- [x] Putuskan `<BASE>`: `main` (semua patch production PR #33 dan fitur verifikasi sudah menyatu di `main`).
- [x] Tulis pilihan di sini: `<BASE> = main`
- [ ] Konfirmasi apakah nama `<BASE>` sudah disampaikan; status komunikasi awal tidak dapat diverifikasi dari repository ini.

## 4. Aturan branch dan PR

- Satu paket = satu branch = satu PR. Nama: `<tipe>/<slug>` dengan tipe `feat`, `fix`, `chore`, `docs`.
- Buat dari `<BASE>` terbaru. Rebase ke `<BASE>` sebelum membuka PR. Commit kecil dan jelas.
- Migrasi Prisma: skema pendaftaran penerbit hanya diubah lewat T-F04 (satu migrasi, satu pemilik) agar tidak ada dua migrasi paralel. Migrasi yang sudah diterapkan **tidak boleh diedit**.
- Jika Faisal memerlukan perubahan skema atau backend: buka PR terpisah ke Fakhri (bukan langsung ke `<BASE>`), lengkap dengan file migrasi, lalu direview dengan daftar di bagian 5.
- Kode peran harus sama dengan backend: `SUPERADMIN`, `ADMIN_INTERNAL`, `PENERBIT`, `VERIFIKATOR`, `DISTRIBUTOR`, `PENTASHIH`, `DOKUMENTATOR`, `KEPALA_LPMQ`, dan `PENANDATANGAN` (lihat `backend/prisma/schema.prisma`). Nama peran lama di cabang frontend (`PUBLISHER`, `TASHIH_MEMBER`, dan seterusnya) tidak dipakai.
- Tidak ada data tiruan di aplikasi yang dikirim. Data contoh hanya di test, dan tidak memuat data pribadi sungguhan (nama, telepon, KTP).
- Tidak ada rahasia (kata sandi, kunci, token) di repositori.

## 5. Daftar periksa review PR (terutama dari Faisal)

- [ ] Semua validasi penting ada di **server**, bukan hanya di frontend
- [ ] Kode peran sama dengan backend
- [ ] Login penerbit belum terverifikasi ditolak di backend
- [ ] Tidak ada opsi atau nilai "perorangan"
- [ ] File disimpan di luar web root dengan nama acak, dan unduhan lewat otorisasi
- [ ] Migrasi baru, tidak mengedit migrasi lama
- [ ] `npm run test:unit` dan `npm test` lolos, build lolos
- [ ] Tidak ada data pribadi atau rahasia di commit

## 6. Keputusan yang sudah dikunci

Pendaftaran & Akun Penerbit:
- Hanya PT/CV, Yayasan, Lembaga Pemerintah. Tidak ada perorangan. Pembersihan data uji telah dicatat untuk lokal; status pembersihan tiap server masih perlu diverifikasi sesuai T-F03.
- Dokumen per jenis mengikuti `KONTRAK_PENDAFTARAN_PENERBIT.md`. NIB cukup (SIUP/TDP tidak diwajibkan).
- Penerbit wajib mengajukan pendaftaran dan diverifikasi oleh salah satu: `SUPERADMIN` atau `ADMIN_INTERNAL` sebelum dapat login atau mengakses dashboard.
- Penerbit belum terverifikasi **mutlak tidak boleh login** (diberi respons 403 `PUBLISHER_NOT_APPROVED`) dan **tidak boleh menembus dashboard**. Pengecekan status pendaftaran disediakan di halaman publik mandiri (`/cek-status`).
- "Perlu perbaikan" dibedakan dari "ditolak". Ditolak bersifat final, tetapi NPWP/NIB/Email dibebaskan agar dapat mendaftar baru jika diperlukan.
- Alamat pengiriman adalah alamat penerbit.

Peran & Kewenangan Internal (RBAC):
- **Admin Internal (`ADMIN_INTERNAL`)**:
  - Tetap dipertahankan dalam sistem.
  - Berwenang mengelola akun staf teknis dan melakukan reset password staf teknis/pengguna.
  - Berwenang melakukan verifikasi dan pengambilan keputusan atas pendaftaran penerbit (cukup salah satu dari `SUPERADMIN` atau `ADMIN_INTERNAL`).
  - Untuk penugasan tim dan keputusan pengerjaan pentashihan naskah bersifat **readonly** (tidak ikut campur dalam keputusan subtansi pentashihan).
- **Distributor (`DISTRIBUTOR`)**:
  - Tetap berwenang penuh memilih tim atau kelompok pentashihan.
  - Berhak memilih lebih dari satu kelompok, per individu, atau kombinasi kelompok-individu dengan penjatahan rentang juz fleksibel (misal 20-10 juz, dll).
  - Hak penugasan manual tim pentashihan **tidak dicabut**.

Alur naskah (untuk fase lanjutan):
- Satu pengajuan boleh berisi banyak naskah. **STT per pengajuan** dan menunggu semua naskah. Jika diajukan terpisah, STT terpisah.
- Surat hasil per naskah × ukuran × oplah. Kewajiban 5 eksemplar berlaku per surat hasil, hanya untuk cetak fisik.
- Perbaikan dalam satu pengajuan dilakukan serentak.
- Rekapan pentashih masuk sistem (internal), terlihat pentashih dan distributor, tidak dikembalikan ke penerbit. Penerbit merekap sendiri dan mengunggah rekapnya.
- Resi masuk diisi penerbit. Admin internal mengonfirmasi penerimaan fisik lalu meneruskan ke distributor yang sama. SLA dimulai sejak konfirmasi itu. Distributor mengirim balik dan mencatat resi keluar.
- Status "menunggu penerbit" tidak dihitung SLA, tanpa tenggat, dengan pengingat berkala tanpa konsekuensi dan indikator umur untuk admin.
- Batas 5 eksemplar: satu bulan kalender sejak STT dan surat hasil terbit. Status faktual "kewajiban eksemplar belum terpenuhi" terpisah dari label "penerbit bermasalah" yang ditetapkan admin.

## 7. Asumsi dan status integrasi

- Format nomor surat resmi (B-03): dibuat format default terkonfigurasi dan dapat diganti lewat konfigurasi sistem.
- Kanal notifikasi: Saat ini integrasi gateway WhatsApp dan SMTP Email resmi belum aktif di server. Sistem menyediakan tautan dan token rahasia secara langsung (in-app fallback) untuk keperluan perbaikan pendaftaran dan reset password mandiri sampai gateway resmi terpasang.
- Arti kalimat notulensi "halaman login: peringatan menghapus" belum jelas. Jangan diubah sebelum dikonfirmasi.
- Keluhan UX dokumentator: diselesaikan melalui perbaikan UI card mushaf dan filter berjenjang di paket B-11.

## 8. Glosarium sementara

- Gunakan "penerbit" (bukan "pemohon"), dan "permohonan" untuk pengajuan naskah sesuai notulensi 1 Okt 2026.
- Istilah di label pengiriman dan surat harus mengikuti nama menu di aplikasi baru, bukan situs lama.
