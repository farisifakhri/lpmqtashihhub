# Sistem Manajemen Layanan Pentashihan Mushaf Al-Qur'an

Baseline repository untuk pengembangan MVP aplikasi internal LPMQ dan portal penerbit. Kedua antarmuka dipisahkan, tetapi menggunakan backend, basis data, aturan bisnis, dan audit trail yang sama.

## Status

- Baseline dokumen: v2.2
- Tahap: Sprint 0 / validasi stakeholder
- Framework: belum ditetapkan
- SOP Verifikasi berlaku untuk seluruh kategori; template resmi, sumber kanonik terbaru, delegasi penetapan, dan detail integrasi eksternal masih dikonfirmasi

Repository ini sengaja belum berisi scaffold framework. Keputusan teknis tidak boleh dikunci sebelum stack, lingkungan deployment, serta kebijakan keamanan instansi disetujui.

## Ruang lingkup MVP

- Portal penerbit untuk profil, pengajuan, revisi, pelacakan, dan dokumen akhir.
- Aplikasi internal untuk verifikasi, distribusi, pentashihan, dokumentasi, pelaporan, dan audit.
- Admin dapat membuat pengajuan atas nama penerbit.
- Pembayaran dicatat manual dengan rancangan adapter untuk SIMPONI.
- Penugasan tahap awal, perbaikan, dan dumi/perpanjangan.
- Tim dibentuk dari SK aktif tanpa ketua kelompok pada logika bisnis; distributor mereviu rekomendasi tiap pentashih/pembaca naskah.
- STT diterbitkan sebelum cross-check dokumentasi; target lima eksemplar dicatat untuk pelaporan dan tidak memblokir penyelesaian.
- Master kategori mushaf, 17 profil layanan, add-on, tarif, kalender kerja, serta Tim Distribusi.
- Masa berlaku dan perpanjangan Surat Tanda Tashih.
- QR verifikasi publik yang tidak membuka file privat.

## Dokumen utama

| Dokumen | Fungsi |
|---|---|
| `DESIGN.md` | Arsitektur, modul, model domain, status, dan batas keamanan |
| `IMPLEMENTATION.md` | Urutan implementasi, quality gate, dan strategi pengujian |
| `CODING_BASELINE_PROMPT.md` | Prompt utama untuk agen coding di VS Code |
| `LICENSE` | Lisensi internal sementara yang harus dikonfirmasi instansi |

## Struktur awal

```text
.
├── .vscode/
├── docs/
│   └── meeting-notes/
├── src/
├── storage/
├── tests/
├── CODING_BASELINE_PROMPT.md
├── DESIGN.md
├── IMPLEMENTATION.md
├── LICENSE
└── README.md
```

Folder `src`, `tests`, dan `storage` adalah placeholder sampai keputusan stack disetujui.

## Cara mulai di VS Code

1. Ekstrak paket dan buka folder repository di VS Code.
2. Baca `README.md`, `DESIGN.md`, dan `IMPLEMENTATION.md`.
3. Catat hasil rapat stakeholder dalam `docs/meeting-notes/`.
4. Perbarui bagian **Keputusan terbuka** sebelum memilih framework.
5. Gunakan `CODING_BASELINE_PROMPT.md` sebagai instruksi awal agen coding.
6. Commit dokumen baseline sebelum membuat scaffold aplikasi.

## Prinsip pengembangan

- SOP dan keputusan stakeholder adalah sumber aturan bisnis utama.
- Nilai tarif/SLA disimpan sebagai data berversi, bukan hard-coded.
- Setiap pengajuan menyimpan snapshot tarif dan SLA yang berlaku saat submit.
- SLA digunakan untuk target, cross-check, dan pelaporan; keterlambatan tidak memblokir transisi bisnis.
- Semua perubahan status, assignment, pembayaran, dan dokumen resmi diaudit.
- File bersifat privat secara default; endpoint publik hanya mengeluarkan metadata yang diizinkan.
- Tidak ada hard delete untuk data transaksi dan dokumen yang sudah dipakai.

## Keputusan terbuka

- Framework backend/frontend dan database.
- Domain resmi yang menjadi sumber SOP kanonik.
- Mekanisme delegasi bila Kepala LPMQ berhalangan.
- Template final Berita Acara Tashih dan Surat Tanda Tashih.
- Aturan pembatalan setelah billing atau pembayaran.
- Infrastruktur deployment, backup, retensi, antivirus, dan object storage.
