# Backlog Modul Survei Kepuasan Masyarakat (SKM)

Modul survei layanan untuk Super Admin, beserta pengisiannya oleh penerbit sebagai syarat pengunduhan Surat Tanda Tashih.

- Disusun: 6 November 2026
- Cabang kerja: `dhal` (lokal, belum di-push)
- Acuan: Pedoman Menteri PANRB No. 9 Tahun 2024, PermenPANRB No. 14 Tahun 2017, dan tampilan Survey pada sistem tashih lama (tashih.lpmqkemenag.go.id)
- Lingkup kode: 32 commit, 41 berkas, +3.203/−116 baris, 9 migrasi basis data
- Status di bawah menilai bukti pada checkout, bukan status merge PR

## Ruang lingkup

Tujuh sub-menu Survei di **Tata Kelola Sistem** (khusus `SUPERADMIN`), mengikuti susunan sistem lama: Nama Survei, Nama Unsur, Pertanyaan Survei, Pemilihan Survei, Jawaban Survei, Responden Survei, Laporan Survei. Ditambah satu jalur baru di portal penerbit: pengisian survei sebelum STT diunduh.

## Paket yang sudah dikerjakan

|ID|Ringkasan|Status|Bukti|
|-|-|-|-|
|S-01|Kerangka modul: menu bertingkat 7 sub-menu di sidebar, routing `?tab=`, penjagaan peran `SUPERADMIN`, halaman Survei Layanan|**Selesai**|`2e05f04`, `96fe4d0`; `SurveyManagementPage.jsx`, `survey.routes.js`|
|S-02|Nama Survei: tambah topik + status, aksi Aktifkan/Nonaktifkan, Lihat, Edit, Hapus; status Pending/Aktif/Expired seperti sistem lama|**Selesai**|`8eab3af`, `3823705`; `SurveyListTab.jsx`|
|S-03|Nama Unsur: 9 unsur baku PANRB beserta definisi terisi otomatis, urut sesuai Pedoman hlm. 12–13; form cukup nama + definisi; hapus dan Pulihkan Unsur Baku|**Selesai**|`cdfc0a1`, `ee95f42`, `21269f4`, `2bfded9`; `UnsurTab.jsx`|
|S-04|Instrumen Pedoman: demografi lengkap (disabilitas, kategori layanan), kepuasan 1–5, NPS 1–10, 4 pernyataan anti-korupsi, perhitungan IKM dan mutu A–D|**Selesai**|`29ae14d`, `2bfded9`; `survey.service.js`, `survey-constants.js`|
|S-05|Bank soal: pertanyaan wajib bergabung ke satu unsur sejak dibuat, daftar dikelompokkan per unsur, tombol Isi Pertanyaan Baku PANRB (12 pertanyaan varian Campuran), field Nama survei pada form|**Selesai**|`a482412`, `8dad834`, `22838db`, `adca817`; `QuestionBankTab.jsx`|
|S-06|Pemilihan Survei: susunan dikelompokkan per unsur, dropdown pertanyaan menyesuaikan unsur, tombol Tambah semua, urutan unsur dan pertanyaan dapat diseret|**Selesai**|`389f22c`, `9ba24f6`; `SurveyViews.jsx`, `useRowDrag.js`|
|S-07|Unsur khusus satu survei (mis. unsur IPAK) lewat field Nama survei; unsur baku PANRB dikunci tetap berlaku untuk semua survei|**Selesai**|`bd407be`, `baf5af6`; migrasi `20261106090000`, `20261106110000`|
|S-08|Dua survei baku tersemai: Indeks Persepsi Kualitas Pelayanan (IKM) dan Indeks Persepsi Anti Korupsi (IPAK)|**Selesai**|`9a99090`; migrasi `20261106100000`|
|S-09|Penghapusan berlaku dalam keadaan apa pun (survei berjawaban, unsur terpakai, pertanyaan terjawab), tanpa kotak konfirmasi, notifikasi 0,5 detik yang menyebut akibatnya|**Selesai**|`9ba24f6`, `716f0b6`, `2245beb`|
|S-10|Urutan tampil survei dan unsur dapat diseret, tersimpan otomatis; tombol naik/turun untuk keyboard dan layar sentuh|**Selesai**|`9ba24f6`, `baf5af6`; migrasi `20261106120000`, endpoint `PUT …/reorder`|
|S-11|Responden Survei: diagram donat SVG untuk delapan kategori demografi, tanpa pustaka grafik baru|**Selesai**|`1a0db7b`|
|S-12|Pengisian survei oleh penerbit: endpoint penerbit, pop-up bertahap (satu bagian per layar) saat menekan Unduh STT, pratinjau STT tetap bebas, gerbang `SURVEY_REQUIRED` di backend|**Selesai**|`df66461`, `6521554`, `5a17dad`, `6955321`, `222e9de`; `PublisherSurveyDialog.jsx`|
|S-13|Jawaban Survei: Super Admin dapat menghapus jawaban satu responden; Laporan IKM ikut dihitung ulang|**Selesai**|`ea0a05a`|

### Perbaikan sampingan yang ikut tertangani

|Temuan|Dampak sebelum diperbaiki|Bukti|
|-|-|-|
|`documentation.service.js` memilih kolom `brand_name` dan `email` yang tidak ada pada tabel penerbit|`GET /registrations/:id/printing-reports` selalu 500; dua notifikasi "gangguan sistem" di setiap detail permohonan penerbit|`dfb9369`|
|Sisa impor halaman survei yang sudah dihapus|Seluruh frontend gagal dimuat (Vite import-analysis)|`ae17d9a`|
|Arsip dokumen penerbit selalu terbuka pada dokumen pertama|STT tidak ditemukan penerbit tanpa menekan "Tinjau" pada barisnya|`50abfd7`|

## Paket yang belum dikerjakan

|ID|Ringkasan|Alasan / pertimbangan|Bergantung pada|
|-|-|-|-|
|S-14|Pertanyaan untuk survei IPAK|Pernyataan anti-korupsi memakai skala 1–5, sedangkan opsi jawaban dibatasi 1–4 agar rumus IKM (rata-rata × 25) tetap sahih. Perlu keputusan: skala 1–5 khusus survei berjenis IPAK dengan rumus terpisah, atau tetap memakai kolom `ak_*` pada responden seperti sekarang|S-04|
|S-15|Sunting jawaban responden|Sengaja ditahan: mengubah jawaban membuat Laporan IKM tidak lagi mencerminkan isian penerbit, bertentangan dengan asas akuntabel Pedoman BAB I.B.4. Alternatif yang disarankan: hapus jawaban (S-13), lalu penerbit mengisi ulang|S-13|
|S-16|Ekspor Jawaban Survei dan Laporan ke Excel/PDF|Sistem lama punya tombol Export Data pada Jawaban Survei; belum ada padanannya|S-04|
|S-17|Tautan dan QR Code pengisian survei|Pedoman BAB III.B mensyaratkan tiga kanal: tautan, QR, dan input manual petugas. Saat ini hanya tersedia lewat portal penerbit yang sudah login|S-12|
|S-18|Perbaikan email akun roster tim inti|Empat akun pentashih memiliki email berakhir titik sebelum `@` (mis. `siti.aisyah.fatihaturrizqiyah.@pentashih.lpmq.go.id`) sehingga ditolak validator login. Bila rotasi tim inti menunjuk salah satunya, pengajuan macet di tahap verifikasi. Perlu perbaikan data dan perbaikan generator email dari nama bergelar|tidak ada|
|S-19|Dokumentasi kontrak API survei|`docs/api/workflow.md` belum memuat endpoint survei (admin maupun penerbit) dan kode galat `SURVEY_REQUIRED`|S-12|
|S-20|Privasi responden pada laporan|Nama badan hukum penerbit tampil penuh di Jawaban Survei dan Responden Survei. Perlu keputusan: tampilkan penuh, samarkan sebagian, atau batasi ke peran tertentu|S-04|
|S-21|Ajakan mengisi survei di luar jalur unduh STT|Saat ini survei hanya muncul ketika penerbit menekan Unduh STT. Pertimbangkan kartu ajakan di dashboard penerbit dan pengingat berkala|S-12|
|S-22|Tombol Duplikat survei di antarmuka|Endpoint `POST /admin/surveys/:id/duplicate` sudah ada dan teruji, tetapi belum ditampilkan di Nama Survei|S-02|
|S-23|Uji integrasi gerbang STT|Gerbang `SURVEY_REQUIRED` pada `documentPdf` baru diverifikasi manual (API dan Chrome); belum ada uji integrasi karena menyiapkan STT terbit di dalam suite membutuhkan rangkaian alur penuh|S-12|

## Keputusan yang masih terbuka

1. **Apakah survei IPAK wajib diisi penerbit.** Saat ini yang mewajibkan hanya survei berstatus Aktif yang sudah memiliki pertanyaan; IPAK belum punya pertanyaan sehingga belum ikut mengunci unduhan STT.
2. **Satu jawaban per pengajuan atau per penerbit.** Sekarang satu jawaban per pasangan survei + pengajuan, sehingga penerbit dengan banyak permohonan akan mengisi berulang.
3. **Periode survei.** Kolom `starts_at`/`ends_at` sudah ada tetapi belum dipakai untuk membatasi pengisian; status Expired saat ini ditentukan manual.

## Risiko yang perlu diketahui

- **Penghapusan tidak dapat dibatalkan dan tanpa konfirmasi** (S-09, S-13), sesuai permintaan. Satu klik salah pada survei berjawaban akan membuang jawaban beserta Laporan IKM-nya. Bila terasa rawan, jalan tengah yang disarankan adalah tombol Urungkan di dalam notifikasi, bukan mengembalikan kotak konfirmasi.
- **Pratinjau STT dibuka sebelum survei diisi** (S-12). Berkas PDF sudah sampai di peramban saat pratinjau, sehingga gerbang unduhan bersifat dorongan kuat, bukan kunci mutlak. Ini konsekuensi dari keputusan "boleh lihat dulu".

## Cara menguji cepat

```sh
cd backend && npm test        # 194 unit test + integrasi, termasuk suite survei
cd frontend && npx vitest run # 363 test
cd frontend && npx vite build # wajib setelah menghapus/menambah berkas rute
```

Data percobaan di basis data lokal: penerbit `dummy.penerbit.8180982@contoh.id` dengan permohonan `REG-202611-0008` berstatus `STT_ISSUED` dan STT `STT/LPMQ/2026/C06DB8`.
