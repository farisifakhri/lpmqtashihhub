# Backlog Fase Lanjutan ver 0.2 — status bukti 21 Okt 2026

Tiap paket dibuat sebagai file detail dan branch sendiri **saat akan dikerjakan**, mengikuti pola paket Fase 1. Pemilik awal adalah Fakhri; bagian antarmuka dapat dibagi ke Faisal setelah Fase 1 selesai.

Urutan yang disarankan: B-01 sebelum yang lain, karena struktur pengajuan memengaruhi banyak paket.

Status di bawah menilai bukti yang tampak pada checkout, bukan status merge PR. “Belum diverifikasi” tidak berarti tidak ada kode. Rincian fase pendaftaran ada di [peta tugas](README.md).

|ID|Branch|Ringkasan|PIC|Bergantung pada|
|-|-|-|-|-|
|B-01|`feat/pengajuan-banyak-naskah-varian`|Pengajuan → naskah → varian (ukuran, oplah). STT per pengajuan, surat hasil per naskah × ukuran × oplah|**Fakhri**|Fase 1 (Selesai/Merged)|
|B-02|`fix/verifikasi-tidak-setuju`|Perbaiki bug frontend saat memilih "tidak setuju". Pisahkan naskah tidak lolos (kembali ke penerbit) dari draf surat ditolak Kepala (kembali ke verifikator)|**Fakhri**|tidak ada|
|B-03|`feat/nomor-surat-otomatis`|Nomor surat hasil verifikasi otomatis, atomik, tidak dipakai ulang, format default lewat konfigurasi (UAT U-04)|**Fakhri**|B-01|
|B-04|`feat/surat-lolos-dokumen-billing`|Dokumen kode billing berisi surat lolos verifikasi. Billing hanya untuk naskah yang lolos|**Fakhri**|B-03|
|B-05|`feat/distribusi-kelompok-juz`|Dropdown pentashih yang bisa dicari. Distributor berhak memilih lebih dari satu kelompok, per individu, atau kombinasi kelompok-individu dengan penjatahan rentang juz fleksibel (misal 20-10 juz). Distributor boleh menambah atau mengganti pentashih dan kelompok (alasan generik, tanpa data kesehatan). Bahasa tanpa istilah SK|*(Belum Ditentukan)*|T-F02|
|B-06|`feat/rekap-pentashih-internal`|Pentashih lapor hasil keseluruhan juz yang di tashih (tidak perjuz laporanya) plus dokumen rekap (wajib). Kelompok: satu rekap cukup setelah dicek distributor. Rekap hanya terlihat pentashih dan distributor|*(Belum Ditentukan)*|B-05|
|B-07|`feat/siklus-pengembalian-revisi-dumi`|Siklus revisi dan dumi: label pengiriman (dua varian), resi keluar oleh distributor, unggah penerbit + resi masuk, konfirmasi dan peneruskan oleh admin internal (SLA mulai), pembandingan rekap beserta catatan hasilnya|*(Belum Ditentukan)*|B-01, B-06|
|B-08|`feat/status-menunggu-penerbit`|Status "menunggu penerbit" di luar hitungan SLA, pengingat berkala, indikator umur untuk admin|*(Belum Ditentukan)*|B-07|
|B-09|`feat/penerbitan-surat-hasil-stt`|Penerbitan surat hasil per varian dan STT per pengajuan setelah semua naskah selesai. Dokumen terbuka ke penerbit: surat hasil verifikasi, surat pengembalian naskah, surat hasil, STT|**Nabil**|B-01, B-07|
|B-10|`feat/eksemplar-dokumentator`|5 eksemplar per surat hasil (hanya cetak fisik), batas satu bulan kalender sejak STT dan surat hasil terbit, centang penerimaan dengan penjelasan, pengingat otomatis dan manual, status "kewajiban eksemplar belum terpenuhi", label "penerbit belum mengirimkan 5 eksemplar" oleh admin|**Nabil**|B-09|
|B-11|`ux/dokumentator`|Perbaikan UX dokumentator. buat card per mushaf yang di daftarkan. Ketika di click akan menuku ke halaman yang memberikan dokumen2 hasil dari proses tashih yang dilakukan, seperti surat permohoman stt hingga STT itu sendiri dll. berikan warna dengan tujuan supaya bisa lebih mudah membedakan lihat warnanya pada design.md, karena dibuatnya per card mushaf yg di tashih maka berikan juga filternya seperti filter tahun, bulan, kategori pendaftaran (mushaf baru, perpanjangan STT, mushaf luar negeri), standar mushaf LPMQ (Ustmani, Bahriyah, Braile, Isyarat), dan filter berpotensi bermanfaat lainya.|**Nabil**|B-10|
|B-12|`chore/glosarium-narasi`|Samakan istilah (penerbit, permohonan) di UI, template surat, dan label pengiriman. Teks label mengikuti nama menu aplikasi baru|**Choirul**|tidak ada|
|B-13|`feat/dashboard-penerbit`|Dashboard penerbit: tracking status, unggah dokumen tambahan, bayar PNBP, respon Berita Acara|**Choirul**|T-F02, Fase 1|

## Status implementasi per 21 Oktober 2026

| Paket | Status | Bukti / batas |
|---|---|---|
| B-01 | **Selesai menurut bukti kode** | Model pengajuan/naskah/varian, alur pendaftaran, kalkulasi item, dan test terkait ada di checkout. Rancangan paket menyatakan B-01 telah di-merge ke `main`; nomor PR tidak diverifikasi. |
| B-02 | **Belum dimulai** | `docs/UAT_FINDINGS.txt` menyebut bug “tidak setuju” belum direproduksi. |
| B-03 | **Parsial** | Generator dan sequence backend ada; approval memerlukan `auto_number`/`auto_generate`, tetapi UI belum mengirim flag tersebut. Pola nomor juga hardcoded dan format resmi belum dikonfirmasi. Lihat [rincian B-03](fakhri/B-03-nomor-surat-otomatis.md). |
| B-04–B-13 | **Belum diverifikasi** | Belum dilakukan pencocokan bukti terhadap semua kriteria masing-masing paket. Jangan anggap kategori ini berarti belum ada kode. |

**Bukti B-01/B-03 yang diperiksa:** `backend/prisma/schema.prisma`, `backend/src/services/registration.service.js`, `frontend/src/lib/item-calculator.js`, `backend/tests/document-number.test.js`, `backend/src/services/verification-review.service.js`, dan `frontend/src/features/verification/VerificationInspectionPage.jsx`. Test konkurensi database dan status merge PR tidak diklaim.

## Pertanyaan yang tetap perlu dijawab sebelum paket terkait dikerjakan

* Format nomor surat resmi (B-03).
* Pola di rancangan B-03 (`TL.00`) berbeda dari pola yang diuji di kode (`TL.01`); minta konfirmasi format resmi sebelum mengubahnya.
* Maksud "halaman login: peringatan menghapus" (T-S02).
* Penyedia email dan, kelak, WhatsApp untuk notifikasi (T-F06, B-08, B-10).
