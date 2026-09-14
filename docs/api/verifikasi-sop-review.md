# Pencocokan kontrak API dan SOP verifikasi

Sumber: [SOP Verifikasi Mushaf Al-Quran.xlsx](../SOP%20Verifikasi%20Mushaf%20Al-Quran.xlsx), sheet `3. SOP Pendaftaran Mushaf`, baris 6–13, serta [kontrak API](../../API_CONTRACT_MODUL_LANJUTAN.md). Nama tab masih menyebut pendaftaran, tetapi judul A1 dan kegiatan di dalamnya adalah verifikasi.

## Yang sudah dijelaskan oleh SOP

| Langkah / sel | Isi SOP | Implikasi implementasi |
|---|---|---|
| 1 / B6 | Penerbit mengirim bukti pendaftaran dan print out master A4 dijilid per juz | Diperlukan pencatatan penerimaan fisik; belum tersedia dalam modul saat ini |
| 2 / J7 | Nota Dinas Verifikasi Mushaf Al-Quran | Nota Dinas adalah dokumen tahap verifikasi; penomoran dan penerbitannya belum diimplementasikan |
| 3 / B8, J8 | Verifikator memeriksa naskah dan menyusun draf surat pemberitahuan | Verifikator menyusun hasil, lalu mengajukan persetujuan Kepala |
| 4 / B9 | Kepala menyetujui dan menandatangani; bila menolak, mengembalikan draf kepada verifikator | Persetujuan bukan wewenang verifikator. Pengembalian draf memakai IN_VERIFICATION, bukan REVISION_REQUIRED untuk penerbit |
| 5 / B10 | Verifikator mengirim surat yang disahkan kepada penerbit | Persetujuan dan pengiriman adalah dua kejadian berbeda; endpoint pengiriman belum tersedia |
| 6 / B11 | Penerbit menerima surat/lampiran dan membayar sesuai kode billing | Billing dan bukti pembayaran sudah tersedia secara manual; integrasi SIMPONI belum tersedia |
| 7 / B12 | Pemeriksaan pembayaran dan penyerahan naskah kepada distributor | Verifikasi pembayaran memindahkan ke WAITING_DISTRIBUTION |
| 8 / B13 | Distributor menerima naskah untuk pentashihan | Alur berikutnya merujuk SOP pentashihan, bukan ditentukan oleh SOP verifikasi ini |

Diagram dalam workbook juga membedakan naskah tidak lulus yang dikembalikan kepada penerbit dari surat pemberitahuan yang ditolak dan dikembalikan kepada verifikator. Karena itu, persetujuan draf surat tidak boleh disamakan dengan hasil LOLOS/TIDAK_LOLOS naskah. Modul surat yang direncanakan harus menyimpan keduanya secara terpisah dan hanya mengizinkan billing untuk hasil naskah yang lolos.

Waktu pada kolom H–I: langkah 1–2 masing-masing 30 menit, langkah 3 dua hari, langkah 4–5 masing-masing 30 menit, langkah 6 tujuh hari, langkah 7–8 masing-masing 30 menit. Ini belum sama dengan SLA penugasan tashih yang saat ini dihitung aplikasi. SLA per langkah perlu master/snapshot tersendiri; satuan “hari” pada SOP tidak dengan sendirinya menentukan kalender hari kerja untuk seluruh langkah.

## Perbaikan yang diterapkan setelah pencocokan

- WAITING_VERIFICATION_APPROVAL → AWAITING_PAYMENT hanya oleh KEPALA_LPMQ.
- WAITING_VERIFICATION_APPROVAL → IN_VERIFICATION oleh KEPALA_LPMQ, dengan alasan wajib.
- Penugasan verifikator semula tetap berlaku saat draf dikembalikan; Kepala tidak menjadi verifikator baru.
- SUPERADMIN tanpa peran Kepala tidak menjadi pengganti otoritas persetujuan.
- Kontrak §0 diperbaiki agar tidak mengarahkan perbaikan draf internal ke portal penerbit.

Perubahan ini memperbaiki guard role dan tujuan pengembalian pada workflow yang ada. Surat bernomor, penandatanganan surat hasil verifikasi, lampiran, pengiriman, tracking master fisik, dan SLA per langkah belum selesai. Implementasi saat ini belum bisa dinyatakan memenuhi seluruh SOP verifikasi.

## Keputusan terbuka — menunggu rapat stakeholder

Sesuai arahan pengguna, detail di luar kepastian SOP ini tetap terbuka: waktu penerbitan dan penanda tangan Berita Acara Tashih, alur STT final dan templatenya, delegasi Kepala, subalur DUMMY/baca ulang, pembatalan pasca-billing, pembagian tanggung jawab PusdokQ/arsiparis, serta kanal notifikasi eksternal. Pernyataan “sudah dikonfirmasi” pada rancangan BA belum menjadi dasar untuk mengaktifkan tanda tangan sebelum keputusan ini diselaraskan.

Metadata workbook juga perlu diselaraskan saat rapat: lembar identitas mencantumkan revisi 20 Februari 2023, sedangkan lembar alur memuat tanggal 10 September 2026 dan nama pengesah berbeda. Pembacaan ini mencatat isi berkas lokal, bukan menetapkan versi SOP kanonik yang berlaku.
