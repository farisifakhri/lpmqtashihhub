# U-03: Pembersihan Pejabat Dummy & Penataan Tanda Tangan Resmi pada Dokumen Dinas

- **ID Temuan UAT:** U-03 (Prioritas **P0** - Dokumen Resmi)
- **Branch:** `fix/u-03-pejabat-dokumen-resmi`
- **Basis:** `main` (atau kelanjutan dari perbaikan dokumen)
- **PIC:** Fakhri
- **Lingkup:** Backend (`verification-document-pdf.service.js`, `verification-review.service.js`) & Seeder
- **Dependensi:** Tidak ada
- **Memblokir:** UAT sign-off dokumen resmi oleh Kepala & Verifikator LPMQ
- **Versi Dokumen:** 1.0 (21 Oktober 2026)

---

## 1. Latar Belakang Masalah (Temuan UAT Gambar 18, 19, 21)

Pada pengujian UAT tanggal 20 Oktober 2026, ditemukan beberapa kecacatan format pada dokumen dinas resmi LPMQ:
1. **Lembar Disposisi (`NOTA_DINAS_VERIFIKASI`) - Gambar 18:**
   - Jabatan penandatangan tertulis *"Petugas Penugasan / Helper Admin,"* yang merupakan istilah teknis internal/informal pengembang.
   - Nama pejabat tertulis *"Helper Admin LPMQ"* atau *"Super Admin LPMQ"*.
   - Seharusnya memuat jabatan kedinasan resmi Kementerian Agama RI: **"Koordinator Bidang Pentashihan"** atau **"Ketua Tim Verifikasi Naskah"** dengan nama dan NIP resmi.
2. **Surat Hasil Verifikasi (`SURAT_HASIL_VERIFIKASI`) - Gambar 19 & 21:**
   - Pada kolom tanda tangan Kepala LPMQ, terdapat teks janggal **`(Menunggu persetujuan)`** yang diletakkan tepat di atas nama pejabat pada lembar draf. Tata naskah dinas resmi Kemenag tidak menaruh teks status persetujuan di kolom tanda tangan, melainkan cukup melalui watermark draf di kepala surat.
   - Jika dokumen disahkan oleh akun admin/superadmin, nama penandatangan tercetak sebagai *"Super Admin LPMQ"*, bukan nama definitif Kepala LPMQ (**H. Abdul Aziz Sidqi, M.Ag.**).
   - Ruang tanda tangan verifikator belum memiliki paraf/tanda tangan digital resmi, dan NIP masih titik-titik kosong (`NIP. ....................`).

---

## 2. Rencana Solusi & Implementasi Teknis

### 2.1. Standarisasi Pejabat Penandatangan Resmi (Definitif)
Sesuai data master kepegawaian LPMQ Kemenag RI:
- **Kepala LPMQ:**
  - Nama: `H. Abdul Aziz Sidqi, M.Ag.`
  - NIP: `197106061998031006`
  - Jabatan: `Kepala Lajnah Pentashihan Mushaf Al-Qur'an`
- **Koordinator Bidang Pentashihan (Admin Internal):**
  - Nama: `Muhammad Zamroni Ahbab, S.S.I., M.Ag.`
  - NIP: `198810302023211018`
  - Jabatan: `Koordinator Bidang Pentashihan`
- **Verifikator Pemeriksa:**
  - Default Nama: `Ahmad Falahudin, S.S`
  - Default NIP: `199409252022031001`
  - Jabatan: `Verifikator Pemeriksa Mushaf Al-Qur'an`

### 2.2. Perbaikan pada PDF Rendering (`verification-document-pdf.service.js`)
1. **Lembar Disposisi (`NOTA_DINAS_VERIFIKASI`):**
   - Ubah label penandatangan menjadi:
     ```
     Jakarta, [Tanggal]
     Koordinator Bidang Pentashihan,
     Lajnah Pentashihan Mushaf Al-Qur'an
     
     [Nama Pejabat]
     NIP. [NIP Pejabat]
     ```
   - Jika `content.assigned_by_name` kosong atau bernilai dummy (`Helper Admin` / `Super Admin`), otomatis gunakan data definitif: `Muhammad Zamroni Ahbab, S.S.I., M.Ag.` (NIP `198810302023211018`).
2. **Surat Hasil Verifikasi (`SURAT_HASIL_VERIFIKASI`):**
   - Hapus teks `(Menunggu persetujuan)` dari area tanda tangan draf.
   - Kepala LPMQ:
     - Jika dokumen disahkan oleh pejabat dengan nama resmi, tampilkan nama tersebut.
     - Jika approver adalah akun uji coba (`Super Admin LPMQ`) atau dalam status draf, selalu tampilkan nama dan NIP Kepala LPMQ definitif (`H. Abdul Aziz Sidqi, M.Ag.`, NIP `197106061998031006`).
     - Tampilkan QR Validasi Elektronik sah pada dokumen yang telah disetujui (`!draft`).
   - Verifikator:
     - Tampilkan nama dan NIP verifikator (dengan fallback ke `Ahmad Falahudin, S.S`, NIP `199409252022031001` bila tidak terisi).
     - Sertakan stempel/paraf verifikasi digital resmi.
3. **Berita Acara Verifikasi (`BERITA_ACARA_VERIFIKASI`):**
   - Tampilkan nama dan NIP verifikator secara lengkap dan rapi.

---

## 3. Rencana Pengujian

1. **Unit Test PDF Rendering:**
   - Memastikan `renderVerificationPdf` pada draf tidak lagi mencetak `(Menunggu persetujuan)`.
   - Memastikan Lembar Disposisi mencetak jabatan *"Koordinator Bidang Pentashihan"* dan nama pejabat resmi, bukan *"Helper Admin"*.
   - Memastikan Surat Hasil mencetak pejabat Kepala LPMQ resmi dengan NIP yang sah.
2. **Regression Test:**
   - Memastikan seluruh unit test PDF lama tetap lolos.
