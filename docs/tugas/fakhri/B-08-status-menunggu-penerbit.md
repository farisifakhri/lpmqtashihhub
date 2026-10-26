# B-08: Status Menunggu Penerbit di Luar Hitungan SLA, Pengingat Berkala, dan Indikator Umur

- **ID Paket:** B-08
- **Branch:** `feat/b08-status-menunggu-penerbit`
- **Basis:** `feat/b07-siklus-pengembalian-revisi-dumi`
- **PIC:** Fakhri
- **Status:** **Selesai menurut bukti kode**
- **Dependensi:** B-05 (Distribusi Kelompok & Juz), B-06 (Rekap Pentashih Internal), B-07 (Siklus Pengembalian Revisi & Naskah Dumi)
- **Memblokir:** B-09 s.d. B-11 (Surat Hasil Pentashihan & STT Final - Nabil)
- **Versi Dokumen:** 1.0 (26 Oktober 2026)

---

## 1. Latar Belakang & Persyaratan Bisnis

Sesuai standar operasional prosedur (SOP) dan asas kepatuhan Service Level Agreement (SLA) Kementerian Agama RI:
1. **Status Menunggu Penerbit di Luar Hitungan SLA:**
   - Standar waktu layanan internal LPMQ (seperti telaah berkas maksimal 48 jam atau target hari kerja pentashihan) hanya berlaku selama naskah berada dalam proses kerja aktif petugas LPMQ.
   - Ketika pendaftaran berada pada status `REVISION_REQUIRED` (baik perbaikan berkas dari tahap verifikasi maupun perbaikan teks/dumi dari hasil sidang pentashihan), tanggung jawab pemenuhan berada sepenuhnya pada pihak pemohon/penerbit.
   - Waktu selama masa tunggu ini berada di luar hitungan SLA internal LPMQ (*paused SLA*), sehingga jeda ini tidak mengurangi persentase kepatuhan SLA internal petugas (*compliance rate*).
2. **Indikator Visual Jeda SLA & Umur Tunggu Naskah:**
   - Antarmuka sistem (`SlaIndicator` dan `StatusBadge`) secara eksplisit menampilkan status jeda (`Jeda SLA · Menunggu Penerbit` dan sub-lencana `Di luar SLA`) agar pimpinan dan pengawas internal mengetahui bahwa naskah tidak sedang mengalami keterlambatan internal.
   - Umur tunggu naskah dihitung secara akurat dari waktu masuk tahap revisi (`stage_entered_at` atau `updated_at`):
     - **< 7 hari:** Normal (dalam rentang waktu wajar perbaikan pemohon).
     - **7 s.d. 14 hari:** Peringatan (*Warning* / Amber) dengan keterangan `(Perlu Pengingat)`.
     - **> 14 hari:** Kritis / Terlambat (*Danger* / Merah) dengan keterangan `(Terlambat)` agar petugas segera melakukan tindak lanjut.
3. **Pengingat Berkala (Periodic Reminders):**
   - Admin Internal LPMQ dapat mengirimkan notifikasi pengingat secara individual kepada penerbit melalui tombol aksi langsung di antrean kerja dasbor dan dialog detail naskah.
   - Tersedia mekanisme pengingat massal (*batch periodic reminders*) untuk mengirim notifikasi serentak kepada seluruh naskah yang masa tunggunya telah melampaui batas ambang hari tertentu (default 7 hari).
   - Pengiriman pengingat mencatat riwayat audit resmi `SEND_PUBLISHER_REMINDER` serta notifikasi sistem dengan proteksi batas jeda pengingat (*cooldown*) 24 jam untuk mencegah spam notifikasi.

---

## 2. Implementasi Teknis

### 2.1. Backend (`distribution.service.js`, `workflow.routes.js`, `distribution-b08.test.js`)
1. **Layanan Pengingat Berkala (`sendPublisherReminder` & `sendPeriodicReminders`):**
   - Memvalidasi kepemilikan dan status naskah (`REVISION_REQUIRED`).
   - Mencegah spam pengingat bertubi-tubi dengan validasi batas waktu minimal 24 jam sejak pengingat terakhir.
   - Menghasilkan notifikasi in-app dan pemberitahuan resmi kepada penanggung jawab akun penerbit.
   - Mencatat log audit resmi `SEND_PUBLISHER_REMINDER` dengan metadata hari tunggu (`waiting_days`), identitas pengirim, dan rincian kontak penerbit.
2. **Endpoint Workflow Routes:**
   - `POST /api/v1/registrations/:id/remind-publisher`: Mengirim pengingat perorangan untuk naskah tertentu.
   - `POST /api/v1/registrations/batch-remind-publishers`: Mengirim pengingat massal otomatis berdasarkan ambang batas `thresholdDays` (default 7 hari).
3. **Pengujian Unit Backend (`distribution-b08.test.js`):**
   - `kirim pengingat individu kepada penerbit yang naskahnya dalam REVISION_REQUIRED` (Lulus).
   - `menolak pengiriman pengingat berulang dalam rentang cooldown 24 jam` (Lulus).
   - `menjalankan pengingat massal (batch periodic reminders) untuk naskah >= 7 hari` (Lulus).

### 2.2. Frontend (`workflow-view-model.js`, `SlaIndicator.jsx`, `StatusBadge.jsx`, `QueueOverview.jsx`, `UnifiedDashboard.jsx`, `RegistrationDetailDialog.jsx`, `registration.api.js`)
1. **Kalkulasi Terpusat pada View Model (`workflow-view-model.js`):**
   - Menghitung `waitingDays`, `waitingAgeSeverity` (`normal` | `warning` | `danger`), `isSlaPaused: true`, dan keterangan `slaPauseReason` saat status `REVISION_REQUIRED`.
2. **Indikator Jeda SLA (`SlaIndicator.jsx` & `StatusBadge.jsx`):**
   - `SlaIndicator` mendukung prop `isPaused={true}` yang menampilkan pill beranimasi pulse amber `Jeda SLA · Menunggu Penerbit`.
   - `StatusBadge` menyertakan styling warna aksen amber dan lencana `Di luar SLA`.
3. **Chip Umur Tunggu Antrean (`QueueOverview.jsx`):**
   - Komponen `QueueItemMeta` menampilkan indikator visual umur tunggu dengan ikon jam dan penanda tingkat urgensi `(Perlu Pengingat)` atau `(Terlambat)`.
4. **Tombol Aksi Pengingat pada Dasbor & Detail Naskah (`UnifiedDashboard.jsx` & `RegistrationDetailDialog.jsx`):**
   - Pada baris naskah berstatus `REVISION_REQUIRED` di dasbor admin, muncul tombol *"Kirim Pengingat"* dengan konfirmasi interaktif.
   - Pada dialog detail naskah, ditampilkan banner status jeda SLA dan tombol pengingat admin.
   - Menampilkan notifikasi umpan balik sukses/gagal secara responsif.
5. **Klien API (`registration.api.js`):**
   - Menambahkan fungsi `remindPublisher(id)` dan `batchRemindPublishers(thresholdDays)`.

---

## 3. Hasil Pengujian & Verifikasi

1. **Pengujian Unit Backend:**
   - `backend/tests/distribution-b08.test.js`: 3 tes lulus 100%.
2. **Pengujian Unit Frontend:**
   - `frontend/src/lib/workflow-view-model.test.js`: 7 tes lulus 100% (termasuk pengujian B-08 paused SLA dan waiting age).
   - `frontend/src/components/ui/ReusableComponents.test.jsx`: 13 tes lulus 100% (termasuk pengujian `SlaIndicator` status jeda).
   - `frontend/src/features/dashboard/UnifiedDashboard.test.jsx`: 9 tes lulus 100% (termasuk pengujian tombol *Kirim Pengingat* dan pemanggilan API `remindPublisher`).
3. **Verifikasi Build Frontend:**
   - `npm run build` sukses dalam 4.78 detik dengan 0 kesalahan kompilasi.

---

## 4. Pembukaan Hambatan Antar-Anggota (Unblocking Status)

Dengan diselesaikannya paket **B-05**, **B-06**, **B-07**, dan **B-08**:
- Fondasi alur pentashihan dari distribusi kelompok/individu, rekap telaah internal, siklus perbaikan naskah/dumi dan resi keluar, hingga jeda SLA telah lengkap dan terverifikasi secara menyeluruh.
- Paket tugas **Nabil** (**B-09** Surat Hasil Pentashihan, **B-10** Eksemplar & Validasi Akhir, dan **B-11** STT Final & Dokumentasi) kini telah **100% TERBUKA (UNBLOCKED)** dan siap dikerjakan secara paralel tanpa kendala dependensi.
