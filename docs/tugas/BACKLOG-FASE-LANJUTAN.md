# Backlog Fase Lanjutan ver 0.3 — status bukti 5 Nov 2026

Tiap paket dibuat sebagai file detail dan branch sendiri **saat akan dikerjakan**, mengikuti pola paket Fase 1. Pemilik awal adalah Fakhri; bagian antarmuka dapat dibagi ke Faisal setelah Fase 1 selesai.

Urutan yang disarankan: B-01 sebelum yang lain, karena struktur pengajuan memengaruhi banyak paket.

Status di bawah menilai bukti yang tampak pada checkout, bukan status merge PR. “Belum diverifikasi” tidak berarti tidak ada kode. Rincian fase pendaftaran ada di [peta tugas](README.md).

|ID|Branch|Ringkasan|PIC|Bergantung pada|
|-|-|-|-|-|
|B-01|`feat/pengajuan-banyak-naskah-varian`|Pengajuan → naskah → varian (ukuran, oplah). STT per pengajuan, surat hasil per naskah × ukuran × oplah|**Fakhri**|Fase 1 (Selesai/Merged)|
|B-02|`fix/verifikasi-tidak-setuju`|Perbaiki bug frontend saat memilih "tidak setuju". Pisahkan naskah tidak lolos (kembali ke penerbit) dari draf surat ditolak Kepala (kembali ke verifikator)|**Fakhri**|tidak ada|
|B-03|`feat/nomor-surat-otomatis`|Nomor surat hasil verifikasi otomatis, atomik, tidak dipakai ulang, format default lewat konfigurasi (UAT U-04, Disahkan: TL.01)|**Fakhri**|B-01 (Selesai)|
|B-04|`feat/surat-lolos-dokumen-billing`|Dokumen kode billing berisi surat lolos verifikasi. Billing hanya untuk naskah yang lolos|**Fakhri**|B-03|
|B-05|`feat/distribusi-kelompok-juz`|Dropdown pentashih yang bisa dicari. Distributor berhak memilih lebih dari satu kelompok, per individu, atau kombinasi kelompok-individu dengan penjatahan rentang juz fleksibel (misal 20-10 juz). Distributor boleh menambah atau mengganti pentashih dan kelompok (alasan generik, tanpa data kesehatan). Bahasa tanpa istilah SK|*(Belum Ditentukan)*|T-F02|
|B-06|`feat/b06-rekap-pentashih-internal`|Pentashih lapor hasil keseluruhan juz yang di tashih (tidak perjuz laporanya) plus dokumen rekap (wajib). Kelompok: satu rekap cukup setelah dicek distributor. Rekap hanya terlihat pentashih dan distributor|**Fakhri**|B-05|
|B-07|`feat/b07-siklus-pengembalian-revisi-dumi`|Siklus revisi dan dumi: label pengiriman (dua varian: Perbaikan & Dumi), resi keluar distributor, unggah penerbit + resi masuk, konfirmasi dan penerusan admin internal (SLA jalan), pembandingan rekap beserta catatan sebelumnya|**Fakhri**|B-01, B-06|
|B-08|`feat/b08-status-menunggu-penerbit`|Status "menunggu penerbit" di luar hitungan SLA, pengingat berkala, indikator umur untuk admin|**Fakhri**|B-07|
|B-09|`feat/penerbitan-surat-hasil-stt`|Penerbitan surat hasil per varian dan STT per pengajuan setelah semua naskah selesai. Dokumen terbuka ke penerbit: surat hasil verifikasi, surat pengembalian naskah, surat hasil, STT|**Nabil**|B-01, B-07|
|B-10|`feat/eksemplar-dokumentator`|5 eksemplar per surat hasil (hanya cetak fisik), batas satu bulan kalender sejak STT dan surat hasil terbit, centang penerimaan dengan penjelasan, pengingat otomatis dan manual, status "kewajiban eksemplar belum terpenuhi", label "penerbit belum mengirimkan 5 eksemplar" oleh admin|**Nabil**|B-09|
|B-11|`ux/dokumentator`|Perbaikan UX dokumentator. buat card per mushaf yang di daftarkan. Ketika di click akan menuku ke halaman yang memberikan dokumen2 hasil dari proses tashih yang dilakukan, seperti surat permohoman stt hingga STT itu sendiri dll. berikan warna dengan tujuan supaya bisa lebih mudah membedakan lihat warnanya pada design.md, karena dibuatnya per card mushaf yg di tashih maka berikan juga filternya seperti filter tahun, bulan, kategori pendaftaran (mushaf baru, perpanjangan STT, mushaf luar negeri), standar mushaf LPMQ (Ustmani, Bahriyah, Braile, Isyarat), dan filter berpotensi bermanfaat lainya.|**Nabil**|B-10|
|B-12|`chore/glosarium-narasi`|Samakan istilah (penerbit, permohonan) di UI, template surat, dan label pengiriman. Teks label mengikuti nama menu aplikasi baru|**Choirul**|tidak ada|
|B-13|`feat/dashboard-penerbit`|Dashboard penerbit: tracking status, unggah dokumen tambahan, bayar PNBP, respon Berita Acara|**Choirul**|T-F02, Fase 1|
|B-14|`feat/b14-integritas-gerbang-stt-dan-kebocoran-tashih`|Integritas Gerbang STT, Penutupan Bypass Transisi Penerbit, dan Proteksi Privasi Identitas Pentashih pada List Registrations (Audit B1, B2, B3)|**Fakhri**|B-06, B-07|
|B-15|`feat/b15-rekap-kelompok-dan-eliminasi-checklist`|Logika Rekap Kelompok (`recap_scope: TEAM vs SELF`), Penugasan Campuran Kelompok-Individu, dan Eliminasi Checklist Butir Per Juz (Audit A1, A2, A4)|**Fakhri**|B-14|
|B-16|`feat/b16-rekap-revisi-penerbit-dan-siklus-dumi`|Kewajiban Unggah Berkas Rekap Revisi Penerbit (Per Ronde, Titik a & c) dan Penegakan Siklus Wajib Dumi Sebelum STT (Audit A3)|**Fakhri**|B-14, B-15|

## Status implementasi per 5 November 2026

| Paket | Status | Bukti / batas |
|---|---|---|
| B-01 | **Selesai menurut bukti kode** | Model pengajuan/naskah/varian, alur pendaftaran, kalkulasi item, dan test terkait ada di checkout. |
| B-02 | **Selesai menurut bukti kode** | Pemisahan tegas alur pengembalian draf internal Kepala LPMQ ke Verifikator vs penerbitan surat naskah tidak lolos ke Penerbit. |
| B-03 | **Selesai menurut bukti kode** | Kode resmi `TL.01` disahkan. Sequence atomik backend aktif, terintegrasi ke dialog approval `VerificationInspectionPage.jsx` dengan flag `auto_number: true` saat nomor manual kosong. UAT U-04 terselesaikan. |
| B-04 | **Selesai menurut bukti kode** | Dokumen kode billing menggabungkan surat lolos verifikasi dengan lampiran berkas billing SIMPONI (PDF), dan tagihan/kode billing ditegakkan hanya untuk naskah yang lolos. |
| B-05 | **Perlu Penyempurnaan (B-15)** | Master pentashih candidates aktif, namun penugasan campuran kelompok-individu atomik disempurnakan di paket B-15. |
| B-06 | **Perlu Penyempurnaan (B-14 & B-15)** | Kewajiban dokumen rekap aktif, diperketat dengan proteksi rekap scope TEAM vs SELF dan penutupan kebocoran data di B-14 & B-15. |
| B-07 | **Perlu Penyempurnaan (B-16)** | Label pengiriman 2 varian dan resi aktif; kewajiban berkas rekap revisi penerbit dan penegakan wajib dumi sebelum STT ditambahkan di B-16. |
| B-08 | **Selesai menurut bukti kode** | Status jeda SLA terintegrasi di view model, SlaIndicator, dan StatusBadge; pengingat berkala aktif. |
| B-09 | **Selesai menurut bukti kode** | Engine penerbitan STT PDF resmi ber-QR (`renderSttPdf`), validasi placeholder dinamis, sanitasi karakter, serta pengujian lulus 100%. |
| B-10 | **Selesai menurut bukti kode** | Skema pelaporan realisasi pencetakan oplah oleh penerbit (`printingReportSchema`) dan penerimaan 5 eksemplar fisik. |
| B-11 | **Dalam Proses / Siap Dikerjakan** | Penyesuaian antarmuka/UX card dan filter dokumen mushaf dokumentator. |
| B-12 | **Selesai menurut bukti kode** | Modul Glosarium & Formatters (`frontend/src/lib/glossary.js`), eliminasi bahasa sistem di antarmuka (Billing, Dialog, Arsip, Dokumen), dokumen standar [docs/GLOSARIUM.md](../GLOSARIUM.md), dan pembaharuan README utama. |
| B-13 | **Belum diverifikasi** | Menunggu pengerjaan Choirul. |
| B-14 | **Selesai menurut bukti kode** | Menutup lubang keamanan B1 (dua jalur STT), B2 (bypass transisi penerbit), dan B3 (kebocoran pentashih di `listRegistrations`), seluruh pengujian lulus 100%. |
| B-15 | **Selesai menurut bukti kode** | Logika rekap kelompok `recap_scope: TEAM vs SELF`, penugasan campuran kelompok-individu atomik 30 juz, eliminasi form checklist per juz, seluruh pengujian backend & frontend lulus 100%. |
| B-16 | **Siap Dikerjakan** | Wajib berkas rekap revisi penerbit per ronde (titik a & c), pembandingan berkas, dan penegakan siklus wajib dumi sebelum STT. |

**Bukti B-01/B-03 yang diperiksa:** `backend/prisma/schema.prisma`, `backend/src/services/registration.service.js`, `frontend/src/lib/item-calculator.js`, `backend/tests/document-number.test.js`, `backend/src/services/verification-review.service.js`, `frontend/src/features/verification/VerificationInspectionPage.jsx`, dan `frontend/src/features/verification/VerificationInspectionPage.test.jsx`.

## Catatan Keputusan & Status Pertanyaan

* **Format nomor dinas resmi (B-03 / U-04):** Telah dikonfirmasi resmi menggunakan **`TL.01`** (`B-{seq}/LPMQ.01/TL.01/{roman_month}/{year}`).
* **Email & Notifikasi:** Driver internal (`MockEmailProvider` / terminal log & outbox) telah disiapkan untuk pengembangan lokal tanpa memblokir alur kerja pendaftaran penerbit.
* **Aturan Siklus Dumi & Rekap Sidang (Keputusan 5 Nov 2026):**
  1. Pentashih wajib mengunggah rekapitulasi internal dan memberikan putusan akhir (`PASSED` / `REVISION_REQUIRED`) tanpa perlu mengisi checklist per juz.
  2. Rekap kelompok mendukung cakupan `TEAM` (satu orang mewakili seluruh tim dan menggugurkan kewajiban anggota lain) atau `SELF` (hanya untuk diri sendiri).
  3. Kerahasiaan sidang terisolasi penuh dari penerbit (identitas pentashih dan berkas rekap internal tidak boleh bocor ke penerbit).
  4. Penerbit wajib mengunggah dokumen Rekap Revisi Penerbit per ronde (diblokir di titik penerbit `a` dan titik distributor `c`).
  5. Seluruh naskah wajib melewati tahap Dumi (`DUMMY`) sebelum berhak memperoleh Surat Tanda Tashih (STT). Naskah tashih awal yang lolos bersih sekalipun wajib masuk ke tahap Dumi terlebih dahulu.
