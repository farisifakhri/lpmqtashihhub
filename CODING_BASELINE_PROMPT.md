# Baseline Prompt untuk Agen Coding

Salin prompt berikut ke agen coding di VS Code setelah membuka root repository.

---

Anda bertugas membangun MVP **Sistem Manajemen Layanan Pentashihan Mushaf Al-Qur'an LPMQ**.

## Instruksi utama

1. Baca seluruh `README.md`, `DESIGN.md`, `IMPLEMENTATION.md`, `.gitignore`, dan catatan terbaru pada `docs/meeting-notes/` sebelum mengubah kode.
2. Tampilkan ringkasan pemahaman, keputusan terbuka, risiko, dan rencana perubahan sebelum implementasi besar.
3. Jangan memilih atau membuat scaffold framework sebelum ADR-001 disetujui. Jika stack belum ditulis eksplisit dalam catatan rapat, berhenti dan minta keputusan.
4. Perlakukan SOP dan keputusan stakeholder terbaru sebagai sumber aturan bisnis. Jangan mengarang tarif, SLA, pejabat, format dokumen, atau alur delegasi.
5. Kerjakan hanya satu vertical slice pada satu waktu. Jaga perubahan kecil, dapat direview, dan dapat diuji.
6. Jangan commit secret, kredensial, data pribadi, file naskah nyata, tanda tangan, atau dokumen produksi.
7. Jangan menghapus atau menimpa perubahan pengguna yang tidak terkait.

## Konteks produk yang wajib dipertahankan

- Ada dua antarmuka terpisah: portal penerbit dan aplikasi internal.
- Keduanya memakai backend, database, domain rule, dan audit trail yang sama.
- Admin boleh input atas nama penerbit dan tindakan tersebut wajib diaudit.
- Upload awal naskah hanya cover dan halaman Al-Qur'an 1–5 sebagai penanda.
- Berita Acara Tashih adalah keluaran proses, bukan upload wajib penerbit.
- Ketua Kelompok Tashih menandatangani Berita Acara Tashih sesuai kewenangan final.
- Kepala LPMQ menetapkan Surat Tanda Tashih berdasarkan rekomendasi tim.
- Mekanisme delegasi Kepala LPMQ belum boleh diimplementasikan sebelum disahkan.
- Pembayaran MVP dicatat manual; SIMPONI dan BSrE memakai pola adapter untuk fase lanjut.
- Tarif, SLA, add-on, hari kerja, dan Tim Distribusi adalah master data berversi.
- Pengajuan menyimpan snapshot tarif dan SLA saat submit.
- Perpanjangan memakai `registration_type` dan `previous_registration_id`; UX lengkap dikerjakan bersama modul dokumen pada Sprint 5.
- Tugas Saya adalah filter berdasarkan assignment, bukan status lifecycle.

## Aturan arsitektur

- Mulai dengan modular monolith kecuali ADR menyatakan lain.
- Pisahkan domain, application/use case, infrastructure, dan delivery/UI secara jelas tanpa over-engineering.
- Semua perubahan status melalui satu transition service dengan permission, guard, timestamp, actor, alasan, dan audit event.
- Authorization harus server-side dan diuji untuk akses lintas penerbit/role.
- File privat secara default dan tidak boleh memiliki public path langsung.
- Integrasi eksternal berada di belakang interface/port dan memiliki fake adapter untuk test.
- Gunakan migration dan seed idempotent. Hindari nilai SOP hard-coded pada controller/UI.
- Gunakan transaksi database untuk operasi yang mengubah beberapa aggregate/record penting.

## Urutan kerja pertama

Jika ADR-001 sudah disetujui:

1. Periksa kondisi repository dan laporkan file/perubahan yang sudah ada.
2. Buat scaffold minimum sesuai stack tanpa fitur bisnis berlebihan.
3. Tambahkan formatter, linter, static analysis, test runner, dan CI.
4. Tambahkan `.env.example` tanpa secret serta validasi konfigurasi startup.
5. Buat health endpoint/command dan structured error response.
6. Implementasikan modul Identity & Access sebagai vertical slice pertama.
7. Buat migration role/permission/user dan seed minimal yang idempotent.
8. Tambahkan unit/integration test termasuk kasus permission negatif.
9. Jalankan seluruh pemeriksaan dan laporkan hasil serta pekerjaan berikutnya.

## Definition of done

Sebuah perubahan belum selesai jika hanya berjalan pada happy path. Minimal harus:

- memenuhi acceptance criteria;
- memiliki authorization dan negative test;
- mencatat audit bila material;
- memvalidasi input di server;
- tidak membocorkan secret/data privat;
- lulus formatter, linter, static analysis, dan test;
- memperbarui dokumentasi/ADR bila keputusan berubah.

## Format laporan setelah bekerja

- Outcome
- File yang berubah
- Migration/konfigurasi baru
- Test dan hasilnya
- Asumsi yang digunakan
- Keputusan stakeholder yang masih dibutuhkan
- Langkah aman berikutnya

Mulai dengan membaca baseline. Jangan menulis kode aplikasi sebelum memastikan status ADR-001.

---

