# User Flow per Role

Disintesis dari 3 SOP resmi LPMQ yang sudah diverifikasi (ditandatangani
Kepala LPMQ, bersumber tashih.kemenag.go.id):

- SOP Pendaftaran Mushaf Al-Qur'an
- SOP Distribusi Naskah Master Mushaf Al-Qur'an (nama file: "Pentashihan Master")
- SOP Dokumentasi Mushaf Al-Qur'an

Diagram visual lintas-role: [`docs/diagrams/user-flow.mermaid`](diagrams/user-flow.mermaid)

> ⚠️ **Masih menunggu**: SOP Penerbitan Surat Tanda Tashih. Bagian
> penetapan dokumen oleh Kepala LPMQ di bawah ini adalah **rekonstruksi
> dari petunjuk tidak langsung** di dua SOP lain + klarifikasi lisan
> sebelumnya — bukan dari SOP resmi langkah-demi-langkah. Tandai
> `[BELUM DIKONFIRMASI]` di setiap poin yang berasal dari sumber ini.

---

## 1. Penerbit

| # | Aksi | Trigger / Syarat | Output |
|---|---|---|---|
| 1 | Login ke sistem, isi formulir pendaftaran, unggah sampul & halaman 1–5 | Akun penerbit terverifikasi | Draf pendaftaran |
| 2 | Kirim bukti pendaftaran + **naskah master fisik** (cetak A4, dijilid per juz) ke loket LPMQ | Formulir disubmit (`READY_FOR_VERIFICATION`) | Diterima & diperiksa oleh Staf TU / Admin |
| 3 | Terima Surat Pemberitahuan Hasil Verifikasi resmi via email | Verifikasi selesai & disetujui Kepala LPMQ | Tahu status lolos/perlu perbaikan; menerima kode billing jika lolos |
| 4a | *(Jika perlu perbaikan verifikasi)* Perbaiki berkas/sampel & ajukan ulang | Email/surat meminta revisi | Naskah masuk kembali ke `READY_FOR_VERIFICATION` |
| 4b | *(Jika lolos)* Bayar PNBP via kode billing & konfirmasi bukti bayar | Maks. 7 hari sejak surat diterima | Verifikator memvalidasi pembayaran |
| 4c | *(Jika naskah fisik cacat saat serah-terima distributor)* Serahkan perbaikan jilid fisik | Naskah `PHYSICAL_HANDOVER_CORRECTION_REQUIRED` | Fisik diperbaiki; pembayaran tetap sah tanpa bayar ulang |
| 5 | *(Loop revisi sidang pentashihan, bila diminta)* Terima laporan hasil pentashihan → perbaiki naskah → kirim kembali | Distributor memutuskan revisi diperlukan | Naskah revisi dikirim ulang |
| 6 | *(Hanya untuk naskah cetak fisik)* Cetak massal setelah Surat Tanda Tashih terbit | Surat Tanda Tashih resmi terbit | Mushaf hasil cetak |
| 7 | *(Hanya untuk naskah cetak fisik)* Kirim s.d. 5 eksemplar mushaf hasil cetak ke LPMQ | Diminta Dokumentator | Surat tanda terima dokumentasi |

**Klarifikasi**:
- Langkah 6-7 **tidak berlaku untuk naskah digital/audio** — penerbit jenis ini tidak perlu kirim eksemplar fisik sama sekali; prosesnya langsung selesai setelah Surat Tanda Tashih terbit.
- Untuk naskah cetak fisik: **kurang dari 5 eksemplar tidak menghambat proses apa pun** — ini murni kepatuhan regulasi, dicatat sebagai data pelaporan/kinerja.

---

## 2. Staf TU / Layanan (`ADMIN`)

| # | Aksi | Trigger | Output |
|---|---|---|---|
| 1 | Terima & periksa kelengkapan naskah master fisik A4 per juz di loket LPMQ (`POST /registrations/:id/physical-master/receive`) | Penerbit menyerahkan print-out master fisik | Tanda terima fisik tercatat; status `READY_FOR_VERIFICATION` siap ditugaskan |
| 2 | Pantau antrean FIFO naskah yang siap disidangkan | Pembayaran lunas & master diterima distributor (`WAITING_DISTRIBUTION`) | Antrean kerja terurut waktu masuk |
| 3 | Lakukan penugasan tim pentashihan (`POST /registrations/:id/assignments`) | Tim dan anggota aktif sesuai SK | Penugasan pentashih terbentuk; status beralih ke `TASHIH_IN_PROGRESS` |

---

## 3. Kepala LPMQ

| # | Aksi | Trigger | Output |
|---|---|---|---|
| 1 | Terbitkan **Nota Dinas Verifikasi** dan tugaskan Verifikator secara atomik (`POST /registrations/:id/verification-assignments`) | Naskah fisik sudah diterima Admin (`READY_FOR_VERIFICATION`) | Nota Dinas resmi terbit; tenggat SLA dihitung tepat 2 hari kerja kalender `Asia/Jakarta` |
| 2 | Terima & tinjau draf Surat Pemberitahuan Hasil Verifikasi dan Berita Acara Verifikasi | Verifikator menyelesaikan pemeriksaan | Persetujuan draf (`APPROVED`) atau pengembalian dengan catatan revisi |
| 3 | Lakukan tanda tangan digital resmi (`POST /verification-documents/:id/sign`) | Draf telah disetujui (`APPROVED`) | Surat Pemberitahuan & Berita Acara tertandatangani digital (snapshot hash sha256) |
| 4 | `[BELUM DIKONFIRMASI]` Menetapkan Surat Tanda Tashih | Rekomendasi sidang tuntas & Berita Acara Tashih lengkap | Surat Tanda Tashih terbit resmi |

---

## 4. Verifikator

| # | Aksi | Trigger | Output |
|---|---|---|---|
| 1 | Buka antrean tugas verifikasi dan terima Nota Dinas Verifikasi | Kepala LPMQ menugaskan (`VERIFICATION_ASSIGNED`) | Pemeriksaan berkas dan sampel naskah dimulai |
| 2 | Susun draf **Surat Pemberitahuan Hasil Verifikasi** dan **Berita Acara Verifikasi** | Pemeriksaan selesai dalam SLA 2 hari kerja | Draf dokumen tersimpan dengan lampiran terverifikasi |
| 3 | Ajukan draf ke Kepala LPMQ (`POST /verification-documents/:id/submit`) | Draf lengkap | Status dokumen `WAITING_APPROVAL` |
| 4 | Lakukan tanda tangan digital pada Berita Acara Verifikasi (urutan penandatangan 1) | Kepala LPMQ menyetujui draf | Berita Acara ditandatangani verifikator |
| 5 | Kirimkan surat hasil verifikasi ke penerbit (`POST /verification-documents/:id/send`) | Seluruh penandatanganan selesai (`SIGNED`) | Surel resmi dikirim via `EmailOutbox` idempoten; status naskah berpindah ke `AWAITING_PAYMENT` / `REVISION_REQUIRED` |
| 6 | Verifikasi bukti setor pembayaran PNBP penerbit | Penerbit mengunggah bukti bayar (`PAYMENT_VERIFICATION`) | Status pembayaran menjadi `VERIFIED` |
| 7 | Serahkan naskah master fisik ke loket Distributor (`POST /registrations/:id/handover/submit`) | Pembayaran terverifikasi | Berita acara serah-terima fisik ke distributor |

---

## 5. Distributor

| # | Aksi | Trigger | Output |
|---|---|---|---|
| 1 | Konfirmasi penerimaan fisik master dari Verifikator (`POST /registrations/:id/handover/confirm`) dengan menetapkan `tashih_due_at` masa depan | Verifikator menyerahkan master fisik | Naskah masuk status `WAITING_DISTRIBUTION` |
| 1b | *(Jika fisik master cacat/rusak)* Kembalikan master fisik (`POST /registrations/:id/handover/return`) | Master fisik tidak layak sidang | Status beralih ke `PHYSICAL_HANDOVER_CORRECTION_REQUIRED`; pembayaran tetap sah |
| 2 | Distribusikan naskah ke seluruh Pentashih berdasarkan penugasan | Penugasan tim terbit | Pentashih menerima bahan sidang |
| 3 | Cross-check / ceklis laporan hasil pentashihan berdasarkan rekomendasi Pentashih | Pentashih submit rekomendasi | Rekomendasi kompilasi sidang |
| 4a | Jika belum tuntas & perlu dibaca ulang → distribusikan kembali ke Pentashih | Kualitas belum final | Loop sidang lanjutan |
| 4b | Jika mendekati deadline → kembalikan untuk revisi naskah ke Penerbit | Butuh perbaikan lafazh/tanda baca | Status beralih ke `REVISION_REQUIRED` |
| 4c | Jika seluruh telaah lulus → teruskan untuk penetapan Surat Tanda Tashih | Naskah bersih | Status beralih ke `READY_FOR_STT` |

**Klarifikasi penting (mengoreksi asumsi sebelumnya)**:
- Reviu di langkah 3-4 adalah **cross-check administratif / ceklis
  hasil**, BUKAN penilaian ulang kualitas tashih oleh Distributor.
  Distributor mengeksekusi rekomendasi yang sudah diberikan Pentashih.
- **"Pembaca Naskah" BUKAN role RBAC terpisah** — ini istilah untuk
  tugas Pentashih di luar tashih itu sendiri (mis. baca ulang tahap
  dumi). Satu pool orang, satu role `Pentashih`; yang berbeda hanya
  label tugas/tahap (`assignments.stage`), bukan role pengguna.
- Tidak ada role ketua kelompok tashih dalam logika bisnis. Penanda tangan
  Berita Acara Tashih masih menunggu keputusan SOP lanjutan.
- **Tidak ada dokumen resmi/surat untuk hasil reviu ini** — cukup
  **notifikasi** (modul `NOTIFICATIONS`) ke Penerbit untuk kasus
  perbaikan/revisi. Jangan tambahkan `document_type` baru untuk ini.
- Pembentukan tim distribusi/pentashih **berbasis SK yang sudah
  terbit** (bukan penugasan ad-hoc) — ini sudah konsisten dengan field
  `decree_no/year` di `DISTRIBUTION_TEAMS` pada ERD, tidak perlu
  perubahan skema.

**Catatan desain penting**: keputusan 4a vs 4b **bergantung pada sisa
waktu terhadap deadline**, bukan cuma kualitas. Sistem sebaiknya
menampilkan sisa hari kerja terhadap SLA sebagai bantuan keputusan di
dashboard Distributor (lihat `DESIGN.md`).

---

## 6. Pentashih

| # | Aksi | Trigger | Output |
|---|---|---|---|
| 1 | Terima surat penugasan | Distributor menugaskan | — |
| 2 | Lakukan pentashihan naskah | Naskah diterima (SLA ±20 hari, tergantung jenis mushaf) | Catatan hasil tashih |
| 3 | Buat laporan hasil pentashihan | Pentashihan selesai | Laporan dikirim ke Distributor |
| 4 | *(Loop, bila diminta Distributor)* Tashih ulang naskah yang sama | Distributor kirim ulang | Laporan baru |

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
   berhalangan (lihat `IMPLEMENTATION.md` §3.1 dan §7).

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
- ✅ Intake naskah master fisik A4 per juz dilakukan oleh Staf TU / Admin (`ADMIN`) di loket LPMQ, bukan oleh Kepala LPMQ ataupun Verifikator.
- ✅ Penugasan Verifikator dilakukan secara atomik bersama Nota Dinas Verifikasi oleh Kepala LPMQ dengan SLA 2 hari kerja kalender `Asia/Jakarta`.
- ✅ Pemisahan dokumen verifikasi (Nota Dinas, Surat Hasil Verifikasi, Berita Acara Verifikasi) dengan penandatanganan digital bertingkat (multi-signatory).
- ✅ Pengiriman Surat Hasil Verifikasi dilakukan secara nyata dan andal melalui modul `EmailOutbox` dengan idempotency key dan mekanisme retry.
- ✅ Pengesahan pembayaran dan serah-terima fisik ke distributor dibatasi khusus untuk verifikator yang ditugaskan.
- ✅ Pengembalian fisik naskah cacat oleh distributor mengalihkan status ke `PHYSICAL_HANDOVER_CORRECTION_REQUIRED` tanpa tagihan billing ulang.
