# Backlog Fase Lanjutan ver 0.3 — status bukti 26 Okt 2026

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

## Status implementasi per 26 Oktober 2026

| Paket | Status | Bukti / batas |
|---|---|---|
| B-01 | **Selesai menurut bukti kode** | Model pengajuan/naskah/varian, alur pendaftaran, kalkulasi item, dan test terkait ada di checkout. |
| B-02 | **Selesai menurut bukti kode** | Pemisahan tegas alur pengembalian draf internal Kepala LPMQ ke Verifikator vs penerbitan surat naskah tidak lolos ke Penerbit. |
| B-03 | **Selesai menurut bukti kode** | Kode resmi `TL.01` disahkan. Sequence atomik backend aktif, terintegrasi ke dialog approval `VerificationInspectionPage.jsx` dengan flag `auto_number: true` saat nomor manual kosong. UAT U-04 terselesaikan. |
| B-04 | **Selesai menurut bukti kode** | Dokumen kode billing menggabungkan surat lolos verifikasi dengan lampiran berkas billing SIMPONI (PDF), dan tagihan/kode billing ditegakkan hanya untuk naskah yang lolos. |
| B-05 | **Selesai menurut bukti kode** | Backend endpoint master pentashih candidates, alokasi fleksibel kelompok/individu, validasi lengkap 30 juz, alasan pergantian generik, antarmuka dialog dengan live indicator 30 juz dan pencarian pentashih, serta tes lulus 100%. |
| B-06 | **Selesai menurut bukti kode** | Kewajiban dokumen rekap telaah internal pada pelaporan pentashih, kolom eksplisit recap_file_id, verifikasi kelengkapan rekap oleh distributor, pembatasan kerahasiaan rekap internal, dan tes lolos 100%. |
| B-07 | **Selesai menurut bukti kode** | Label pengiriman 2 varian resmi (Perbaikan & Dumi), kolom resi keluar distributor outgoing_courier/outgoing_tracking_no, pelacakan resi keluar di dashboard penerbit, form konfirmasi resi masuk naskah perbaikan, penerusan loket TMII, dan pembandingan catatan sidang ronde sebelumnya di modal telaah pentashih & distributor. |
| B-08 | **Selesai menurut bukti kode** | Status jeda SLA terintegrasi di view model, SlaIndicator, dan StatusBadge; kalkulasi umur tunggu naskah (< 7 normal, 7-14 warning, > 14 danger); endpoint pengingat individual & batch periodic reminders dengan proteksi cooldown 24 jam; tombol aksi pengingat pada tabel dasbor admin dan dialog detail naskah; seluruh tes unit backend & frontend lulus 100%. |
| B-09–B-11 | **Unblocked (Siap Dikerjakan Nabil)** | Dependensi B-07 telah terpenuhi; siap dibangun paket penerbitan surat hasil & STT (B-09), eksemplar dokumentator (B-10), dan UX dokumentator (B-11). |
| B-12–B-13 | **Belum diverifikasi** | Menunggu pengerjaan Choirul. |

**Bukti B-01/B-03 yang diperiksa:** `backend/prisma/schema.prisma`, `backend/src/services/registration.service.js`, `frontend/src/lib/item-calculator.js`, `backend/tests/document-number.test.js`, `backend/src/services/verification-review.service.js`, `frontend/src/features/verification/VerificationInspectionPage.jsx`, dan `frontend/src/features/verification/VerificationInspectionPage.test.jsx`.

## Catatan Keputusan & Status Pertanyaan

* **Format nomor dinas resmi (B-03 / U-04):** Telah dikonfirmasi resmi menggunakan **`TL.01`** (`B-{seq}/LPMQ.01/TL.01/{roman_month}/{year}`).
* **Email & Notifikasi:** Driver internal (`MockEmailProvider` / terminal log & outbox) telah disiapkan untuk pengembangan lokal tanpa memblokir alur kerja pendaftaran penerbit.
