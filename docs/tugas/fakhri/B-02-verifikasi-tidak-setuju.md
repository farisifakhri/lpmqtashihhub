# B-02: Pemisahan Alur Verifikasi Tidak Setuju & Naskah Tidak Lolos

- **ID Paket:** B-02
- **Branch:** `fix/verifikasi-tidak-setuju`
- **Basis:** `main`
- **PIC:** Fakhri
- **Status:** **Selesai menurut bukti kode**
- **Versi Dokumen:** 1.0 (26 Oktober 2026)

---

## 1. Latar Belakang Masalah

Pada alur verifikasi berkas dan naskah sebelumnya, terdapat ambiguitas istilah *"Tidak Setuju"*:
1. **Ambiguitas Penolakan:** Ketika pejabat penandatangan (Kepala LPMQ) menolak draf surat hasil yang diajukan verifikator karena redaksi atau bukti belum lengkap, pengguna kerap mengira tindakan tersebut mengirimkan penolakan naskah langsung kepada Penerbit.
2. **Pemisahan Alur:** Sesuai SOP resmi Pentashihan LPMQ (Kemenag RI), harus ada pemisahan tegas antara:
   - **Alur A (Internal - Revisi Draf):** Kepala LPMQ tidak menyetujui draf surat verifikator -> draf dikembalikan ke meja verifikator (`IN_VERIFICATION` / `IN_PROGRESS`) dengan catatan perbaikan internal.
   - **Alur B (Eksternal - Naskah Tidak Lolos):** Naskah mushaf pemohon tidak memenuhi persyaratan pentashihan -> Verifikator memilih keputusan `Perlu Perbaikan Penerbit`, Kepala LPMQ menyetujui penerbitan surat pemberitahuan kekurangan, dan surat resmi diterbitkan ke akun Penerbit.

---

## 2. Implementasi Solusi

### 2.1. Backend (`verification-review.service.js` & `verification.routes.js`)
- Endpoint `POST /verification-documents/:id/return` menerima `reason` dari Kepala LPMQ.
- Dokumen draf ditandai `RETURNED`, status assignment kembali ke `IN_PROGRESS` dengan `return_reason`, dan status registrasi kembali ke `IN_VERIFICATION`.
- Pengembalian draf ini terisolasi secara internal dan tidak memicu email penolakan naskah ke penerbit.

### 2.2. Frontend (`InspectionActionPanel.jsx`, `InspectionDialogs.jsx`, `ResultLetterPanel.jsx`)
- Label aksi Kepala LPMQ diubah secara eksplisit menjadi:
  - Tombol Utama: **"Setujui & Sahkan Surat Hasil"**
  - Tombol Sekunder: **"Kembalikan Draf ke Verifikator"**
- Modal konfirmasi memuat penjelasan tegas:
  > *"Tindakan ini hanya mengembalikan draf ke meja kerja Verifikator untuk diperbaiki (bukan penolakan naskah ke Penerbit)."*
- Pilihan keputusan pemeriksaan verifikator diperjelas tanpa kode sistem:
  - **Lolos Verifikasi** (Seluruh butir terpenuhi, rekomendasi billing PNBP).
  - **Perlu Perbaikan Penerbit** (Terdapat butir tidak sesuai, draf surat catatan kekurangan untuk pemohon).

---

## 3. Kriteria Keberhasilan (*Definition of Done*)

1. Tidak ada kebingungan antara pengembalian draf internal dengan penolakan permohonan penerbit.
2. Seluruh unit test terkait alur persetujuan dan pengembalian draf verifikasi lulus 100%.
