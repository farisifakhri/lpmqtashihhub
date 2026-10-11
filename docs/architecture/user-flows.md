# User Flow per Role

Disintesis dari 3 SOP resmi LPMQ yang sudah diverifikasi (ditandatangani
Kepala LPMQ, bersumber tashih.kemenag.go.id):

- SOP Pendaftaran Mushaf Al-Qur'an
- SOP Distribusi Naskah Master Mushaf Al-Qur'an (nama file: "Pentashihan Master")
- SOP Dokumentasi Mushaf Al-Qur'an

Diagram visual lintas-role: [`docs/diagrams/user-flow.mermaid`](../diagrams/user-flow.mermaid)

> ⚠️ **Masih menunggu**: SOP Penerbitan Surat Tanda Tashih. Bagian
> penetapan dokumen oleh Kepala LPMQ di bawah ini adalah **rekonstruksi
> dari petunjuk tidak langsung** di dua SOP lain + klarifikasi lisan
> sebelumnya — bukan dari SOP resmi langkah-demi-langkah. Tandai
> `[BELUM DIKONFIRMASI]` di setiap poin yang berasal dari sumber ini.

---

## 1. Penerbit

| # | Aksi | Trigger / Syarat | Output |
|---|---|---|---|
| 0 | Unduh template resmi Surat Permohonan Pentashihan Mushaf format `.docx` (`RF-PBL-01`) | Sebelum pengajuan / di landing page | Berkas template siap diisi kop & legalitas perusahaan |
| 1 | Login ke sistem, isi formulir pendaftaran, unggah sampul, surat permohonan, & naskah digital | Akun penerbit terverifikasi | Draf pendaftaran tersimpan |
| 2 | Cetak label pengiriman resmi berlogo Kemenag & LPMQ jelas (`RF-REG-10`), lalu kirim bukti pendaftaran + **naskah master fisik** (cetak A4 dijilid per juz) ke loket LPMQ | Formulir disubmit (`READY_FOR_VERIFICATION`) | Diterima oleh Staf TU / Admin Internal loket |
| 3 | Terima Surat Pemberitahuan Hasil Verifikasi resmi via email | Verifikasi selesai & disetujui Kepala LPMQ | Tahu status lolos/perlu perbaikan; menerima kode billing jika lolos |
| 4a | *(Jika perlu perbaikan verifikasi)* Perbaiki berkas/sampel & ajukan ulang | Email/surat meminta revisi | Naskah masuk kembali ke `READY_FOR_VERIFICATION` |
| 4b | *(Jika lolos)* Bayar PNBP via kode billing & konfirmasi bukti bayar | Maks. 7 hari sejak surat diterima | Verifikator memvalidasi pembayaran sah |
| 4c | *(Jika naskah fisik cacat saat serah-terima distributor)* Serahkan perbaikan jilid fisik | Naskah `PHYSICAL_HANDOVER_CORRECTION_REQUIRED` | Fisik diperbaiki; pembayaran tetap sah tanpa bayar ulang |
| 5 | *(Loop revisi sidang pentashihan, bila diminta)* Terima Surat Pengembalian Naskah Perbaikan resmi (`REVISION_RETURN_LETTER`) per ronde perbaikan (`RF-DIST-09`, `RF-DIST-17`) → perbaiki naskah → kirim kembali | Distributor memutuskan revisi diperlukan | Naskah revisi dikirim ulang |
| 6 | *(Hanya untuk naskah cetak fisik)* Cetak massal setelah Surat Tanda Tashih terbit | Surat Tanda Tashih resmi terbit | Mushaf hasil cetak |
| 7 | *(Hanya untuk naskah cetak fisik)* Kirim s.d. 5 eksemplar mushaf hasil cetak ke LPMQ | Diminta Dokumentator | Surat tanda terima dokumentasi |

**Klarifikasi**:
- Langkah 6-7 **tidak berlaku untuk naskah digital/audio** — penerbit jenis ini tidak perlu kirim eksemplar fisik sama sekali; prosesnya langsung selesai setelah Surat Tanda Tashih terbit.
- Untuk naskah cetak fisik: **kurang dari 5 eksemplar tidak menghambat proses apa pun** — ini murni kepatuhan regulasi, dicatat sebagai data pelaporan/kinerja.

---

## 2. Staf TU / Layanan Loket (`HELPER_ADMIN`)

| # | Aksi | Trigger | Output |
|---|---|---|---|
| 1 | Terima & catat master fisik di loket LPMQ (`POST /registrations/:id/physical-master/receive`) | Penerbit menyerahkan/mengirimkan paket master fisik | Nomor resi, tanda terima, dan tanggal terima (`received_at`) tercatat (`RF-REG-13`, `T-03`). Kondisi naskah tidak didiagnosis di loket awal |
| 2 | Terbitkan Nota Dinas Verifikasi dan tugaskan Verifikator (`POST /registrations/:id/verification-assignments`) | Paket master fisik telah diterima loket | Verifikator ditugaskan secara atomik; status beralih ke `VERIFICATION_ASSIGNED` dengan SLA 2 hari kerja |
| 3 | Pantau antrean intake dan log aktivitas layanan internal | Berkelanjutan | Layanan loket terpantau tertib FIFO |

---

## 3. Kepala LPMQ

| # | Aksi | Trigger | Output |
|---|---|---|---|
| 1 | Terima & tinjau draf Surat Pemberitahuan Hasil Verifikasi dan Berita Acara Verifikasi | Verifikator menyelesaikan pemeriksaan berkas/master | Persetujuan draf (`APPROVED`) atau pengembalian dengan catatan revisi |
| 2 | Lakukan tanda tangan digital resmi (`POST /verification-documents/:id/sign`) | Draf telah disetujui (`APPROVED`) | Surat Pemberitahuan & Berita Acara tertandatangani digital |
| 3 | Menetapkan Surat Tanda Tashih (STT) definitif | Rekomendasi sidang tuntas & Berita Acara Tashih lengkap | Surat Tanda Tashih terbit resmi |

---

## 4. Verifikator

| # | Aksi | Trigger | Output |
|---|---|---|---|
| 1 | Buka antrean tugas verifikasi dan mulai telaah naskah | Admin Internal menugaskan (`VERIFICATION_ASSIGNED`) | Pemeriksaan berkas administratif dan teks sampel naskah dimulai |
| 2 | Isi checklist butir pemeriksaan sesuai Berita Acara resmi (T-06) dan susun draf Berita Acara Verifikasi | Pemeriksaan selesai dalam SLA 2 hari kerja | Butir checklist terverifikasi lengkap |
| 3 | Ajukan draf hasil verifikasi ke Kepala LPMQ melalui tombol **"Ajukan Draft"** (`RF-VER-04`) | Draf lengkap | Status dokumen beralih ke `WAITING_APPROVAL` |
| 4 | Lakukan tanda tangan digital pada Berita Acara Verifikasi | Kepala LPMQ menyetujui draf | Berita Acara ditandatangani verifikator |
| 5 | Kirimkan surat hasil verifikasi ke penerbit (`POST /verification-documents/:id/send`) | Seluruh penandatanganan selesai (`SIGNED`) | Surel resmi dikirim via `EmailOutbox`; status naskah berpindah ke `AWAITING_PAYMENT` / `REVISION_REQUIRED` |
| 6 | Verifikasi bukti setor pembayaran PNBP penerbit | Penerbit mengunggah bukti bayar (`PAYMENT_VERIFICATION`) | Status pembayaran menjadi `VERIFIED` |
| 7 | Serahkan naskah master fisik ke loket Distributor (`POST /registrations/:id/handover/submit`) | Pembayaran terverifikasi sah | Berita acara serah-terima fisik ke distributor |

Akses arsip dokumen hasil verifikasi dapat diakses sewaktu-waktu melalui menu navigasi **Arsip & Dokumen** pada Sidebar (`/internal/archive`).

---

## 5. Distributor

| # | Aksi | Trigger | Output |
|---|---|---|---|
| 1 | Konfirmasi penerimaan fisik master dari Verifikator (`POST /registrations/:id/handover/confirm`) dengan menetapkan `tashih_due_at` masa depan | Verifikator menyerahkan master fisik | Naskah masuk status `WAITING_DISTRIBUTION` |
| 1b | *(Jika fisik master cacat/rusak)* Kembalikan master fisik (`POST /registrations/:id/handover/return`) | Master fisik tidak layak sidang | Status beralih ke `PHYSICAL_HANDOVER_CORRECTION_REQUIRED`; pembayaran tetap sah |
| 2 | Tetapkan pentashih dan rentang juz naskah (`RF-DIST-05`) pada 6 Kelompok Utama (SK 2025) | Penugasan tim terbit | Pentashih menerima rentang juz (mis. Juz 1–5, 6–10) tanpa tumpang tindih |
| 3 | Periksa dan rekap berkas rekapan internal yang diunggah para Pentashih (`RF-DIST-18`, `RF-DIST-19`) | Seluruh pentashih submit rekomendasi & berkas rekapan | Berkas rekapan diverifikasi Distributor |
| 4a | *(Jika belum tuntas/perlu dibaca ulang)* Distribusikan kembali ke Pentashih | Kualitas belum final | Loop sidang lanjutan |
| 4b | *(Jika ada kesalahan teks/tanda baca)* Kembalikan untuk revisi ke Penerbit (`POST /registrations/:id/distribution-review`) | Memerlukan perbaikan | Pilih jenis: `NASKAH_PERBAIKAN` atau `NASKAH_DUMI` (`RF-DIST-08`). Ronde otomatis bertambah (`RF-DIST-17`) & menerbitkan Surat Pengembalian Naskah Resmi `REVISION_RETURN_LETTER` (`RF-DIST-09`) |
| 4c | *(Jika seluruh telaah lulus)* Teruskan untuk penetapan Surat Tanda Tashih | Naskah bersih tuntas | Status beralih ke `READY_FOR_STT` |

**Klarifikasi SRS v3.1 & Notulensi 8 Oktober 2026**:
- Distributor bertugas memeriksa berkas rekapan koreksi internal dari pentashih dan menerbitkan Surat Pengembalian Revisi resmi (`REVISION_RETURN_LETTER`) per putaran pengerjaan sebagai notulen perjalanan naskah.
- Naskah Dumi (`NASKAH_DUMI`) dipilih setelah naskah bersih pada tahap awal/perbaikan. Jika ditemukan temuan minor pada dumi, naskah tidak dikembalikan sebagai siklus baru ke penerbit, melainkan diterbitkan notice koreksi (T-04).
- Pembentukan kelompok pentashihan terbagi dalam 6 Kelompok Utama (masing-masing 10–11 anggota) sesuai SK LPMQ 2025.

---

## 6. Pentashih

| # | Aksi | Trigger | Output |
|---|---|---|---|
| 1 | Terima penugasan rentang juz dari Distributor | Distributor menugaskan kelompok | Rentang juz penugasan aktif di workspace pentashih |
| 2 | Lakukan pentashihan mushaf pada rentang juz yang ditugaskan | Naskah diterima (SLA dihitung H+1 pasca bayar) | Koreksi lafazh, tanda baca, rasm, dan harakat dicatat |
| 3 | Unggah 1 (satu) berkas rekapan koreksi internal dan rekam keputusan evaluasi rentang (`POST /assignments/:id/review`) | Pentashihan rentang juz selesai | Keputusan `PASSED` / `REVISION_REQUIRED` tercatat bersama `recap_file_id` (`RF-DIST-18`) |
| 4 | *(Kerahasiaan)* Berkas rekapan koreksi bersifat rahasia internal tim (`RF-DIST-19`) | Berkas diunggah | Hanya dapat diakses oleh pentashih penugasan, distributor, dan admin internal; tidak dipublikasikan ke penerbit |

---

## 7. Dokumentator

| # | Aksi | Trigger | Output |
|---|---|---|---|
| 1 | Terima dokumen pendaftaran & pentashihan dari Verifikator dan Distributor | Surat Tanda Tashih terbit | Daftar cek kelengkapan |
| 2 | Cek kelengkapan dokumen | Dokumen diterima | Checklist |
| 3 | Unduh Surat Tanda Tashih | Dokumen lengkap | Salinan digital |
| 4 | *(Hanya naskah cetak fisik)* Minta penerbit kirim mushaf hasil cetak (target 5 eksemplar) | — | Permintaan terkirim |
| 5 | Terima & dokumentasikan mushaf hasil cetak yang diterima (boleh <5), catat jumlah aktual + penilaian untuk pelaporan/kinerja | Penerbit kirim fisik | Data dokumentasi + serahkan ke PusdokQ/Arsiparis |
| 5b | *(Naskah digital/audio)* Tidak ada langkah eksemplar — proses dokumentasi selesai begitu berkas digital lengkap | Surat Tanda Tashih terbit | Arsip digital |

---

## 8. PusdokQ / Arsiparis `⚠️ pembagian tugas belum jelas di SOP`

| # | Aksi | Trigger | Output |
|---|---|---|---|
| 1 | Terima & simpan mushaf hasil cetak ke perpustakaan & ruang arsip pentashihan | Dokumentator serahkan | Surat tanda terima mushaf |
| 2 | Terima & arsipkan seluruh dokumen pentashihan | Proses dokumentasi selesai | Arsip dokumentasi lengkap |

**Pertanyaan terbuka untuk stakeholder**: SOP Dokumentasi mencantumkan
PusdokQ dan Arsiparis sebagai pelaksana berbeda di kolom header, tapi
teks kegiatan tidak menyebutkan aktor secara eksplisit per langkah.
Perlu klarifikasi: apakah PusdokQ menerima mushaf fisik dan Arsiparis
mengarsipkan dokumen (pemisahan fisik vs dokumen), atau keduanya
menangani hal yang sama di unit berbeda?

---

## Ringkasan Pertanyaan Terbuka dari Sintesis User Flow Ini

1. Mekanisme notifikasi ke penerbit bahwa Surat Tanda Tashih sudah
   terbit dan boleh mulai cetak massal — belum ada di SOP manapun.
2. Detail proses penetapan Surat Tanda Tashih oleh Kepala LPMQ
   (langkah 3-4 di bagian Kepala LPMQ) — menunggu SOP Penerbitan
   Surat Tanda Tashih.
3. Pembagian tugas pasti PusdokQ vs Arsiparis.
4. Mekanisme delegasi Kepala LPMQ untuk dua titik approval bila
   berhalangan (lihat [implementation.md](implementation.md) §3.1 dan §7).

## Sudah Terjawab (klarifikasi terbaru)

- ✅ Pembentukan tim distribusi/pentashih berbasis SK resmi yang sudah
  terbit — konsisten dengan skema `DISTRIBUTION_TEAMS` yang ada.
- ✅ Reviu hasil pentashihan adalah tugas Distributor (cross-check/
  ceklis), berdasarkan rekomendasi Pentashih — bukan penilaian ulang
  kualitas oleh Distributor, dan tidak melibatkan ketua kelompok di
  langkah ini.
- ✅ "Pembaca Naskah" BUKAN role RBAC terpisah — hanya istilah untuk
  tugas Pentashih di luar tashih itu sendiri (mis. baca ulang dumi).
  Satu role `Pentashih`, dibedakan lewat `assignments.stage`.
- ✅ Tidak ada dokumen/surat untuk hasil reviu Distributor — cukup
  notifikasi ke Penerbit lewat modul `NOTIFICATIONS`.
- ✅ Pengiriman eksemplar mushaf hasil cetak: berlaku hanya untuk
  naskah cetak fisik, bersifat non-blocking (kurang dari 5 tidak
  menghambat proses), dan hanya kepatuhan regulasi + bahan penilaian
  kinerja Dokumentator.
- ✅ Naskah digital/audio tidak melalui proses eksemplar fisik sama
  sekali — dokumentasi selesai begitu berkas digital lengkap.
- ✅ Intake naskah master fisik A4 per juz dilakukan oleh Staf TU / Admin (`HELPER_ADMIN`) di loket LPMQ, bukan oleh Kepala LPMQ ataupun Verifikator.
- ✅ Penugasan Verifikator dilakukan secara atomik bersama Nota Dinas Verifikasi oleh Kepala LPMQ dengan SLA 2 hari kerja kalender `Asia/Jakarta`.
- ✅ Pemisahan dokumen verifikasi (Nota Dinas, Surat Hasil Verifikasi, Berita Acara Verifikasi) dengan penandatanganan digital bertingkat (multi-signatory).
- ✅ Pengiriman Surat Hasil Verifikasi dilakukan secara nyata dan andal melalui modul `EmailOutbox` dengan idempotency key dan mekanisme retry.
- ✅ Pengesahan pembayaran dan serah-terima fisik ke distributor dibatasi khusus untuk verifikator yang ditugaskan.
- ✅ Pengembalian fisik naskah cacat oleh distributor mengalihkan status ke `PHYSICAL_HANDOVER_CORRECTION_REQUIRED` tanpa tagihan billing ulang.
