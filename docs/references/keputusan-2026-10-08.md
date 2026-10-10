# Keputusan Lanjutan & Adendum SRS v3.1, 8 Oktober 2026

Disintesis dari Notulensi Rapat Laporan Kamis, 8 Oktober 2026, dokumen SRS v3.1 (Draf), serta penegasan arahan teknis sistem LPMQ:

---

## 1. Alur Pentashihan & Berkas Rekapan Internal (T-01)
1. **Struktur Kelompok**: Terdapat 6 Kelompok Utama Pentashihan (masing-masing berisikan 10–11 pentashih resmi sesuai SK LPMQ 2025).
2. **Penugasan Berbasis Rentang Juz**: Penugasan distributor ke pentashih menggunakan rentang juz (`juz_from` s.d. `juz_to` atau array juz spesifik) dan menolak tumpang tindih nomor juz pada putaran penugasan yang sama.
3. **Keputusan & Berkas Rekapan**: Pentashih memutuskan status kelulusan rentang juz (`PASSED` atau `REVISION_REQUIRED`) dan mengunggah **1 (satu) berkas rekapan koreksi internal** (`recap_file_id`).
4. **Kerahasiaan Berkas Rekapan**: Berkas rekapan pentashih bersifat rahasia internal tim (hanya dapat diakses oleh pentashih bersangkutan, distributor, dan admin internal); tidak dikirimkan ke penerbit atau publik.
5. **Peran Ganda Petugas**: Personil Verifikator, Distributor, dan Dokumentator juga merupakan bagian dari pentashih dalam roster SK 2025 dan memiliki peran ganda operasional.

---

## 2. Penghitungan SLA & Tampilan Durasi Penerbit (T-02 & T-05)
1. **Awal Hitungan SLA**: Perhitungan target SLA pentashihan dimulai **H+1** setelah pembayaran PNBP terverifikasi sah (`payment_records.verified_at`).
2. **Tampilan Portal Penerbit (`RF-PUB-08`)**: Portal penerbit menampilkan estimasi tenggat naskah awal (`initial_due_at`) disertai catatan standar bahwa durasi perbaikan/dumi menyesuaikan ritme revisi penerbit.

---

## 3. Batas Peran Admin Internal Loket (T-03 / Opsi A)
1. **Tugas Loket Fisik**: Admin Internal (`HELPER_ADMIN`) berfokus secara eksklusif pada penerimaan teknis loket (memastikan nomor resi pengiriman, tanda penerimaan paket fisik, bukti fisik paket, dan tanggal terima `received_at`).
2. **Diagnosis Naskah**: Pemeriksaan kondisi detail naskah tidak lagi didiagnosis di loket intake awal, melainkan saat verifikasi berkas/master oleh Verifikator.
3. **Personil Resmi**: Akun resmi Admin Internal diselaraskan menjadi:
   - Muhammad Zamroni Ahbab, S.S.I., M.Ag. (`admin.internal@lpmq.kemenag.go.id`)
   - Mustakim, Lc., M.Ag. (`mustakim@lpmq.kemenag.go.id`)
4. **Isolasi RBAC**: Akun Admin Internal dibatasi murni pada wewenang teknis intake loket dan dikecualikan dari manipulasi status workflow naskah (`PATCH /registrations/:id/status`).

---

## 4. Penanganan Naskah Dumi (T-04)
1. **Penetapan Dumi**: Tahap Dumi (`NASKAH_DUMI`) dipilih setelah naskah dinyatakan bersih/tidak ditemukan kesalahan pada tashih tahap awal atau tahap perbaikan.
2. **Pemeriksaan Akhir Dumi**: Pada tahap dumi tetap dilakukan pemeriksaan akhir naskah pra-cetak.
3. **Penanganan Temuan Akhir**: Jika ditemukan kesalahan minor pada tahap dumi, naskah tidak dikembalikan sebagai siklus perbaikan baru ke penerbit, melainkan diterbitkan catatan/notice koreksi.

---

## 5. Standar Dokumen Resmi & Checklist Verifikator (T-06)
1. **Gaya Administrasi Kemenag RI**: Seluruh format dokumen resmi (Berita Acara, Surat Pengembalian Revisi, Surat Keputusan, Tanda Terima) disusun dengan tata naskah dinas resmi Kementerian Agama RI dan bebas dari gaya artifisial AI generator.
2. **Penyelarasan Checklist Verifikator**: Butir-butir checklist verifikasi administratif dan teknis diselaraskan persis dengan Berita Acara Verifikasi resmi LPMQ (meliputi kelengkapan surat, legalitas, teks PDF, rasm usmani, tanda baca, tajwid warna, dan pedoman penulisan).
3. **Label Tombol Verifikasi (`RF-VER-04`)**: Tombol pengajuan verifikasi diselaraskan menjadi **"Ajukan Draft"** (sebelumnya "Ajukan Kelolosan").
4. **Pemisahan Menu Arsip**: Menu "Arsip" dipindahkan dari tab workbench pemeriksaan ke menu navigasi Sidebar global (`/internal/archive`) yang dapat diakses oleh seluruh peran petugas internal.

---

## 6. Surat Hasil Tashih / Surat Pengembalian Revisi Otomatis
1. **Penerbitan Surat Perbaikan**: Pada setiap putaran perbaikan, Distributor bertugas menerbitkan Surat Pengembalian Naskah Perbaikan (`REVISION_RETURN_LETTER`).
2. **Penomoran Ronde Otomatis**: Sistem secara otomatis mencatat dan menambah ronde perbaikan (`revision_round`: 1, 2, 3, dst.) beserta jenis perbaikan (`NASKAH_PERBAIKAN` atau `NASKAH_DUMI`).
3. **Dokumentasi Notulen**: Surat pengembalian tersimpan dalam arsip dokumen resmi sebagai riwayat notulen perjalanan naskah dari awal hingga akhir.

---

## 7. Template Surat Permohonan (`RF-PBL-01`) & Label Pengiriman (`RF-REG-10`)
1. **Template Unduhan `.docx`**: Halaman pendaftaran dan landing page menyediakan unduhan berkas editable `template-surat-permohonan-tashih.docx` untuk memudahkan penerbit mengajukan permohonan sesuai format standar Kemenag RI.
2. **Label Pengiriman Paket**: Format label pengiriman fisik diperbesar dengan logo Kemenag dan LPMQ yang tajam dan terbaca jelas oleh ekspedisi logistik.

