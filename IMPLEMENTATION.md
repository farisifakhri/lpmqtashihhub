# Implementation Baseline

Implementasi backend awal pembayaran, distribusi, sidang, unggahan privat, enum status, dan SLA beserta batas dokumen draf dijelaskan di [kontrak API workflow](docs/api/workflow.md). Penetapan dokumen, delegasi Kepala LPMQ, dan pemisahan tanggung jawab PusdokQ/arsiparis tetap menunggu keputusan stakeholder. Reviu distributor mengikuti baseline; lampiran audit yang menyebut ketua kelompok belum digunakan sebagai pengganti SOP.

## 1. Tujuan

Dokumen ini mengatur urutan implementasi MVP agar tim tidak mengubah keputusan bisnis yang belum disahkan menjadi perilaku permanen di dalam kode.

## 2. Strategi delivery

Gunakan modular monolith terlebih dahulu, kecuali kebutuhan nonfungsional dan infrastruktur membuktikan perlunya pemisahan service. Portal penerbit dan aplikasi internal boleh memiliki shell UI berbeda, tetapi memakai API/domain service yang sama.

Setiap fitur dikerjakan vertikal: migration, model/domain rule, permission, API/action, UI, audit, notification, dan test selesai sebagai satu irisan.

## 3. Tahapan

### Sprint 0 — Fondasi

- Sahkan stack dan catat sebagai Architecture Decision Record.
- Buat repository, branching policy, formatter, linter, test runner, dan CI.
- Siapkan konfigurasi environment tanpa secret di Git.
- Buat health check, structured logging, error envelope, dan request correlation ID.
- Turunkan ERD v2.2 menjadi migration setelah review nama, tipe, index, dan constraint.
- Seed role, permission, status, kategori, profil layanan, add-on, dan kalender kerja.
- Definisikan kebijakan file privat, backup, retensi, audit, serta data pribadi.

### Sprint 1 — Identitas dan master

- Login, reset kredensial, session/token policy, RBAC, dan penonaktifan akun.
- Profil penerbit dan verifikasi dokumen badan hukum.
- CRUD berversi untuk kategori, 17 profil layanan, SLA, add-on, tarif, kalender kerja, dan Tim Distribusi.
- Larang penghapusan fisik master yang sudah direferensikan transaksi.

### Sprint 2 — Pengajuan dan verifikasi

- Pengajuan melalui portal atau input admin atas nama penerbit.
- Unggah privat: cover dan halaman Al-Qur'an 1–5.
- Validasi metadata, MIME, ekstensi, ukuran, checksum, serta versioning file.
- Antrean verifikasi, penugasan verifikator, filter Tugas Saya, keputusan perbaikan/lanjut.
- Catat penerimaan master fisik dan tanda terimanya.
- Bentuk Berita Acara Tashih, lalu sediakan persetujuan/pengembalian oleh Kepala LPMQ.
- Perubahan status hanya melalui transition service, bukan update kolom langsung.
- Siapkan skema `registration_type` dan `previous_registration_id`; implementasi UX perpanjangan dilakukan di Sprint 5.

### Sprint 3 — Tarif, SLA, dan pembayaran

- Hitung tarif dari layanan dasar dan add-on.
- Simpan snapshot tarif, SLA, dan effective date pada pengajuan.
- Hitung hari kerja melalui master kalender.
- Tampilkan target dan realisasi SLA untuk cross-check/pelaporan tanpa menjadikannya transition guard.
- Catat billing dan bukti pembayaran secara manual.
- Terapkan status verifikasi pembayaran dan larang distribusi sebelum pembayaran dikonfirmasi.
- Sediakan port/adapter SIMPONI tanpa memanggil layanan eksternal pada MVP.

### Sprint 4 — Distribusi dan pentashihan

- Pilih tim dari SK aktif lalu buat penugasan untuk setiap anggota terkait; tidak ada ketua kelompok pada logika bisnis.
- Riwayat iterasi, progres per anggota, rekomendasi, due date, dan status assignment.
- Distributor mereviu rekomendasi pentashih/pembaca naskah dan memilih lanjut STT, baca ulang, perbaikan penerbit, atau dumi.
- Tidak ada overwrite terhadap hasil iterasi sebelumnya.

### Sprint 5 — Penetapan STT, dokumentasi, dan perpanjangan

- Bangun Berita Acara Tashih dari data sistem: identitas naskah; rincian komponen, tarif, dan durasi; matriks distribusi dan progres; catatan/rekomendasi verifikator; tanda tangan yang berwenang.
- Checklist dokumentasi, nomor dokumen, PDF, versioning, dan arsip.
- Kepala LPMQ menetapkan Surat Tanda Tashih setelah reviu distributor.
- Setelah STT terbit, dokumentator mencatat target lima eksemplar, jumlah aktual, tanda terima, alasan, dan penilaian pelaporan.
- Kekurangan eksemplar tidak memblokir penyelesaian; layanan digital/audio-visual memakai status Tidak Berlaku.
- Terapkan masa berlaku, notifikasi menjelang kedaluwarsa, dan pengajuan perpanjangan yang menaut ke dokumen sebelumnya.
- Verifikasi QR publik menampilkan metadata terbatas dan status dokumen.
- Jika delegasi Kepala LPMQ belum disahkan, gunakan feature flag dan jangan mengarang rule delegasi.

### Sprint 6 — Hardening dan UAT

- Dashboard, ekspor, audit review, accessibility, performance, dan observability.
- Tes IDOR, privilege escalation, upload berbahaya, rate limit, token QR, dan data leakage.
- UAT alur portal, input admin, revisi berulang, pembayaran, tashih, BA, penetapan, serta perpanjangan.

## 4. State machine minimum

```text
DRAFT
READY_FOR_VERIFICATION
IN_VERIFICATION
REVISION_REQUIRED
WAITING_VERIFICATION_APPROVAL
AWAITING_PAYMENT
PAYMENT_VERIFICATION
WAITING_DISTRIBUTION
TASHIH_IN_PROGRESS
READY_FOR_STT
STT_ISSUED
DOCUMENTATION_IN_PROGRESS
COMPLETED
CANCELLED
```

`Tugas Saya` adalah filter kepemilikan berdasarkan assignment, bukan status.

Pembatalan yang sudah disepakati sementara:

- `DRAFT -> CANCELLED`
- `READY_FOR_VERIFICATION -> CANCELLED` sebelum diproses
- `REVISION_REQUIRED -> CANCELLED`

Pembatalan setelah billing/pembayaran menunggu SOP final.

## 5. Quality gate setiap story

- Acceptance criteria teruji dan permission negatif tersedia.
- Migration dapat dijalankan pada database kosong dan rollback aman di non-production.
- Tidak ada secret atau data produksi di commit.
- Transisi ilegal ditolak server-side.
- Audit event tercatat untuk perubahan material.
- File privat tidak dapat diakses menggunakan URL publik langsung.
- Test unit/integration lulus dan lint/formatter bersih.
- Dokumentasi API dan keputusan desain ikut diperbarui.

## 6. Strategi test perpanjangan

Karena dokumen resmi baru tersedia pada Sprint 5, Sprint 2 hanya menyiapkan struktur datanya. Pada Sprint 5, buat fixture dokumen aktif dan kedaluwarsa untuk menguji:

- pengajuan baru tidak memiliki dokumen sebelumnya;
- perpanjangan wajib menautkan dokumen milik penerbit yang sama;
- dokumen asing/tidak valid ditolak;
- SLA dumi/perpanjangan dipilih dengan benar;
- riwayat dokumen lama tetap dapat diaudit.

## 7. Definition of baseline complete

Baseline selesai ketika stack disahkan, ADR tercatat, CI hijau, migration awal dapat dijalankan, seed idempotent, permission matrix diuji, dan satu vertical slice autentikasi berjalan di lingkungan pengembangan.
