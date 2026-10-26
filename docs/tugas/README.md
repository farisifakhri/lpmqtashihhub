# Peta Tugas: Tindak Lanjut Notulensi Rapat 15 Okt 2026

Dokumen ini adalah pintu masuk. Setiap paket pekerjaan punya file sendiri dan **satu branch sendiri**.

- Disusun: 19 Okt 2026
- Status bukti implementasi ditinjau: 26 Okt 2026 (Sinkronisasi dengan Backlog Fase Lanjutan)
- Sumber: notulensi rapat laporan magang (15 Okt 2026), jawaban klarifikasi, dan dokumen label pengembalian naskah
- Pemilik: Fakhri (backend, koordinasi, review) dan Faisal (frontend pendaftaran penerbit)

## Status bukti implementasi per 26 Oktober 2026

Status berikut membedakan keberadaan kode dari selesainya semua kriteria. PR/merge tidak dicantumkan kecuali dapat dibuktikan dari checkout; status ini bukan pengganti review penerimaan.

| Paket | Status | Bukti dan batas yang diketahui |
|---|---|---|
| T-F01, T-F02, T-F04–T-F07 | **Selesai menurut checklist tugas** | Checklist detail ditandai selesai; implementasi terkait ada di `backend/src/routes/publisher-registration.routes.js`, layanan pendaftaran, dan test backend. Status merge PR tidak diverifikasi terpisah. |
| T-F03 | **Parsial / lingkungan belum diverifikasi** | Hasil pembersihan lokal dicatat; dokumen hanya menyatakan skrip server disiapkan, bukan bukti eksekusi di setiap lingkungan. |
| T-S01 | **Selesai menurut bukti kode** | `frontend/src/features/auth/RegisterPublisherPage.jsx` telah sepenuhnya dibangun ulang sesuai kontrak pendaftaran resmi LPMQ: opsi `PERORANGAN` dibuang mutlak (hanya PT/CV, Yayasan, Lembaga Pemerintah), matriks dokumen dinamis, validasi PDF/ukuran di klien dan server, panel panduan dokumen interaktif, dan 6 unit test lolos 100%. |
| T-S02 | **Selesai menurut bukti kode** | Halaman publik cek status di `/cek-status` (`CheckRegistrationStatusPage.jsx`) dengan perlindungan privasi anti-kebocoran PII, halaman perbaikan dokumen token 14 hari di `/pendaftaran-penerbit/perbaikan/:token` (`PublisherRevisionPage.jsx`), dan banner penolakan `PUBLISHER_NOT_APPROVED` di `/login` (`LoginPage.jsx`) telah diimplementasikan dengan test lolos 100%. |
| T-S03 | **Selesai menurut bukti kode** | Halaman verifikasi admin (`PublisherVerificationPage.jsx`) untuk `SUPERADMIN` dan `ADMIN_INTERNAL` telah terintegrasi dengan `publisherRegistrationApi`: filter status, paginasi dan pencarian server, penanda keamanan `tautan_terdeteksi`, pratinjau dokumen terotorisasi via `PrivateFileViewer`, putusan (Setujui, Perlu Perbaikan, Tolak) dengan `versi` dan penanganan `VERSION_CONFLICT` lolos test 100%. |
| B-01 | **Selesai menurut bukti kode** | Model pengajuan/naskah/varian, alur pendaftaran, kalkulasi item, dan test terkait tersedia. B-03 juga mencatat B-01 telah di-merge ke `main`; nomor PR tidak diklaim di sini. |
| B-02 | **Selesai menurut bukti kode** | Pemisahan tegas alur pengembalian draf internal Kepala LPMQ ke Verifikator vs penerbitan surat naskah tidak lolos ke Penerbit. |
| B-03 | **Selesai menurut bukti kode** | Kode resmi `TL.01` disahkan. Sequence atomik backend aktif, terintegrasi ke dialog approval `VerificationInspectionPage.jsx` dengan flag `auto_number: true` saat nomor manual kosong. UAT U-04 terselesaikan. |
| B-04 | **Selesai menurut bukti kode** | Dokumen kode billing menggabungkan surat lolos verifikasi dengan lampiran berkas billing SIMPONI (PDF), dan tagihan/kode billing ditegakkan hanya untuk naskah yang lolos. |
| B-05 | **Selesai menurut bukti kode** | Backend endpoint master pentashih candidates, alokasi fleksibel kelompok/individu, validasi lengkap 30 juz, alasan pergantian generik, antarmuka dialog dengan live indicator 30 juz dan pencarian pentashih, serta tes lulus 100%. |
| B-06 | **Selesai menurut bukti kode** | Kewajiban dokumen rekap telaah internal pada pelaporan pentashih, kolom eksplisit recap_file_id, verifikasi kelengkapan rekap oleh distributor, pembatasan kerahasiaan rekap internal, dan tes lolos 100%. |
| B-07 | **Selesai menurut bukti kode** | Label pengiriman 2 varian resmi (Perbaikan & Dumi), kolom resi keluar distributor outgoing_courier/outgoing_tracking_no, pelacakan resi keluar di dashboard penerbit, form konfirmasi resi masuk naskah perbaikan, penerusan loket TMII, dan pembandingan catatan sidang ronde sebelumnya di modal telaah pentashih & distributor. |
| B-08 | **Siap Dikerjakan (Unblocked)** | B-07 selesai; status menunggu penerbit, pengingat, dan indikator umur admin siap dibangun. |
| B-09–B-11 | **Unblocked (Siap Dikerjakan Nabil)** | Dependensi B-07 selesai; alur penerbitan surat hasil & STT per pengajuan siap dikerjakan. |
| B-12–B-13 | **Belum diverifikasi** | Menunggu pengerjaan Choirul. |

**Definisi status:** *Selesai* = bukti checkout/checklist mendukung kriteria yang dinyatakan; *Parsial* = sebagian alur ada tetapi ada gap yang disebutkan; *Belum diverifikasi* = bukti belum cukup; *Belum dimulai* = sumber tugas saat ini menyatakan belum ada reproduksi/pekerjaan yang dapat dinilai. Jangan menafsirkan “tidak diverifikasi” sebagai “tidak ada kode”.

## 1. Isi folder

| File / Paket | Pemilik (PIC) | Branch | Keterangan |
|---|---|---|---|
| **Fase 1 (Pendaftaran Penerbit)** | | | |
| `fakhri/T-F01` s.d. `T-F07` | Fakhri | `feat/api-pendaftaran-penerbit` | Checklist selesai; merge PR belum diverifikasi terpisah |
| `faisal/T-S01-form-pendaftaran-penerbit.md` | Faisal | `feat/fe-form-pendaftaran-penerbit` | **Selesai**: formulir legalitas resmi tanpa perorangan, upload dinamis, lolos test & build |
| `faisal/T-S02-cek-status-dan-perbaikan.md` | Faisal | `feat/fe-cek-status-dan-perbaikan` | **Selesai**: cek status mandiri, revisi token 14 hari, handling PUBLISHER_NOT_APPROVED |
| `faisal/T-S03-verifikasi-penerbit-admin.md` | Faisal | `feat/fe-verifikasi-penerbit-admin` | **Selesai**: verifikasi admin, audit tautan, optimistic concurrency versi & konflik |
| **Fase Lanjutan** | | | |
| `B-01` s.d. `B-04` | Fakhri | `feat/pengajuan-banyak-naskah-varian` dkk. | Status per paket dan bukti: [backlog fase lanjutan](BACKLOG-FASE-LANJUTAN.md) |
| `B-05` | Fakhri | `feat/b05-distribusi-kelompok-juz` | **Selesai**: alokasi fleksibel kelompok/individu, live indicator 30 juz, dropdown pentashih |
| `B-06` | Fakhri | `feat/b06-rekap-pentashih-internal` | **Selesai**: dokumen rekap internal wajib, verifikasi distributor |
| `B-07` | Fakhri | `feat/b07-siklus-pengembalian-revisi-dumi` | **Selesai**: label 2 varian, resi keluar distributor, resi masuk penerbit, pembandingan catatan |
| `B-08` | Fakhri | `feat/b08-status-menunggu-penerbit` | **Selesai**: status jeda SLA, kalkulasi umur antrean, pengingat berkala & batch |
| `B-09` s.d. `B-11` | Nabil | `feat/penerbitan-surat-hasil-stt` dkk. | Status: unblocked (dependensi B-07 terpenuhi) |
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
- `ADMIN_INTERNAL` (Helper Admin) bertugas memeriksa kelengkapan draf, meneruskan ke verifikator, dan membantu proses administratif.
- `VERIFIKATOR` memeriksa substansi mushaf dan menerbitkan draf surat persetujuan/penolakan.
- `KEPALA_LPMQ` memiliki hak persetujuan akhir draf surat sebelum diterbitkan.
