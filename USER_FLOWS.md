# User Flow per Role

Disintesis dari 3 SOP resmi LPMQ yang sudah diverifikasi (ditandatangani
Kepala LPMQ, bersumber tashih.kemenag.go.id):

- SOP Pendaftaran Mushaf Al-Qur'an
- SOP Distribusi Naskah Master Mushaf Al-Qur'an (nama file: "Pentashihan Master")
- SOP Dokumentasi Mushaf Al-Qur'an

Diagram visual lintas-role: [`docs/diagrams/user-flow.mermaid`](diagrams/user-flow.mermaid)

> ⚠️ **Masih menunggu**: SOP Penerbitan Surat Tanda Tashih. Bagian
> penetapan dokumen oleh Kepala LPMQ di bawah ini adalah **rekonstruksi
> dari petunjuk tidak langsung** di dua SOP lain + klarifikasi lisan
> sebelumnya — bukan dari SOP resmi langkah-demi-langkah. Tandai
> `[BELUM DIKONFIRMASI]` di setiap poin yang berasal dari sumber ini.

---

## 1. Penerbit

| # | Aksi | Trigger / Syarat | Output |
|---|---|---|---|
| 1 | Login ke sistem, isi formulir pendaftaran | Akun penerbit terverifikasi | Draf pendaftaran |
| 2 | Kirim bukti pendaftaran + **naskah master fisik** (cetak A4, dijilid per juz) ke LPMQ | Formulir lengkap | Naskah diterima LPMQ (fisik) |
| 3 | Terima Surat Pemberitahuan Hasil Verifikasi | Verifikasi selesai (SLA 2 hari + approval Kepala LPMQ) | Tahu status lolos/tidak, dapat kode billing bila lolos |
| 4a | *(Jika tidak lolos)* — proses berhenti | — | — |
| 4b | *(Jika lolos)* Bayar PNBP via kode billing | Maks. 7 hari sejak surat diterima | NTPN |
| 5 | Konfirmasi pembayaran di sistem | Pembayaran berhasil | Status "PNBP lunas" |
| 6 | *(Loop revisi, bila diminta)* Terima laporan hasil pentashihan → perbaiki naskah → rekap perbaikan → kirim kembali | Distributor memutuskan revisi diperlukan | Naskah revisi dikirim ulang |
| 7 | *(Hanya untuk naskah cetak fisik)* Cetak mushaf setelah Surat Tanda Tashih terbit | Surat Tanda Tashih terbit `[BELUM DIKONFIRMASI: siapa memberi tahu penerbit]` | Mushaf hasil cetak |
| 8 | *(Hanya untuk naskah cetak fisik)* Kirim s.d. 5 eksemplar mushaf hasil cetak ke LPMQ | Diminta Dokumentator | Surat tanda terima |

**Klarifikasi**:
- Langkah 7-8 **tidak berlaku untuk naskah digital/audio** — penerbit
  jenis ini tidak perlu kirim eksemplar fisik sama sekali; prosesnya
  langsung selesai setelah Surat Tanda Tashih terbit. Field
  `service_types.service_kind` di ERD sudah bisa membedakan
  cetak/audio/digital, jadi logika "wajibkan kirim eksemplar" tinggal
  dikondisikan dari field ini.
- Untuk naskah cetak fisik: **kurang dari 5 eksemplar tidak
  menghambat proses apa pun** — ini murni kepatuhan regulasi, dicatat
  sebagai data, bukan gate wajib sebelum status bisa `COMPLETED`.
  Jumlah aktual yang diterima + catatan Dokumentator masuk sebagai
  data pelaporan/kinerja (lihat `IMPLEMENTATION.md` §3 tambahan
  `documentation_items` / catatan Dokumentator).

**Pertanyaan terbuka**: bagaimana penerbit diberi tahu bahwa Surat
Tanda Tashih sudah terbit dan mereka boleh mulai cetak massal? Perlu
notifikasi eksplisit — belum ada di SOP mana pun yang sudah dibaca.

---

## 2. Verifikator

| # | Aksi | Trigger | Output |
|---|---|---|---|
| 1 | Terima & periksa berkas pendaftaran + naskah master fisik | Naskah diterima LPMQ | Hasil pemeriksaan |
| 2 | Susun draf Surat Pemberitahuan Hasil Verifikasi (+ kode billing bila lolos) | Pemeriksaan selesai (SLA 2 hari) | Draf surat |
| 3 | Laporkan draf ke Kepala LPMQ | Draf siap | Menunggu approval |
| 4 | *(Jika ditolak)* Perbaiki draf sesuai catatan Kepala LPMQ, ulangi langkah 3 | Kepala LPMQ tidak setuju | Draf revisi |
| 5 | *(Jika disetujui)* Kirim surat yang sudah ditandatangani ke penerbit | Kepala LPMQ setuju & tanda tangan | Penerbit menerima surat |
| 6 | Cek pembayaran PNBP | Penerbit konfirmasi bayar | Validasi NTPN |
| 7 | Serahkan naskah ke Distributor | Pembayaran terverifikasi | Naskah siap didistribusi |

---

## 3. Kepala LPMQ

| # | Aksi | Trigger | Output |
|---|---|---|---|
| 1 | Terima draf Surat Pemberitahuan Hasil Verifikasi dari Verifikator | Verifikasi selesai | — |
| 2 | Setuju & tanda tangan, **atau** tolak & kembalikan dengan catatan | Review draf (SLA 30 menit) | Surat final / draf dikembalikan |
| 3 | `[BELUM DIKONFIRMASI]` Terima rekomendasi/Berita Acara Tashih dari ketua kelompok tashih | Naskah dumi bersih | — |
| 4 | `[BELUM DIKONFIRMASI]` Menetapkan Surat Tanda Tashih | Berdasarkan Berita Acara | Surat Tanda Tashih terbit |

**Catatan risiko operasional** (sudah ditandai sebelumnya di
`IMPLEMENTATION.md` §3.1): Kepala LPMQ adalah titik approval di
**dua tahap terpisah** dalam alur ini (langkah 2 dan langkah 4).
Mekanisme delegasi bila berhalangan masih `[KEPUTUSAN TIM]` terbuka.

---

## 4. Distributor

| # | Aksi | Trigger | Output |
|---|---|---|---|
| 1 | Buat surat penugasan | Naskah diterima dari Verifikator | Surat penugasan |
| 2 | Distribusikan naskah ke seluruh Pentashih | Surat penugasan terbit | Pentashih menerima tugas |
| 3 | Cross-check / ceklis laporan hasil pentashihan, berdasarkan rekomendasi **Pentashih** (termasuk tugas baca-ulang/dumi) | Pentashih submit rekomendasi | Hasil ceklis |
| 4a | Jika belum dekat deadline & masih perlu dibaca ulang → distribusikan lagi ke Pentashih | Kualitas belum final | Loop kembali ke langkah 2 |
| 4b | Jika mendekati deadline → kembalikan untuk revisi/dumi sesuai rekomendasi + kirim notifikasi ke Penerbit | Waktu terbatas | Notifikasi perbaikan ke Penerbit |
| 4c | Jika naskah dumi tidak ada temuan lagi → proses terbit Tanda Tashih | Dumi bersih | Diteruskan ke Kepala LPMQ |

**Klarifikasi penting (mengoreksi asumsi sebelumnya)**:
- Reviu di langkah 3-4 adalah **cross-check administratif / ceklis
  hasil**, BUKAN penilaian ulang kualitas tashih oleh Distributor.
  Distributor mengeksekusi rekomendasi yang sudah diberikan Pentashih.
- **"Pembaca Naskah" BUKAN role RBAC terpisah** — ini istilah untuk
  tugas Pentashih di luar tashih itu sendiri (mis. baca ulang tahap
  dumi). Satu pool orang, satu role `Pentashih`; yang berbeda hanya
  label tugas/tahap (`assignments.stage`), bukan role pengguna.
- Tidak ada keterlibatan "ketua kelompok tashih" di langkah reviu ini
  — ketua kelompok tetap relevan di tempat lain (menandatangani Berita
  Acara Tashih, lihat `IMPLEMENTATION.md` §3.1), tapi bukan di langkah
  reviu Distributor ini.
- **Tidak ada dokumen resmi/surat untuk hasil reviu ini** — cukup
  **notifikasi** (modul `NOTIFICATIONS`) ke Penerbit untuk kasus
  perbaikan/revisi. Jangan tambahkan `document_type` baru untuk ini.
- Pembentukan tim distribusi/pentashih **berbasis SK yang sudah
  terbit** (bukan penugasan ad-hoc) — ini sudah konsisten dengan field
  `decree_no/year` di `DISTRIBUTION_TEAMS` pada ERD, tidak perlu
  perubahan skema.

**Catatan desain penting**: keputusan 4a vs 4b **bergantung pada sisa
waktu terhadap deadline**, bukan cuma kualitas. Sistem sebaiknya
menampilkan sisa hari kerja terhadap SLA sebagai bantuan keputusan di
dashboard Distributor (lihat `DESIGN.md`).

---

## 5. Pentashih

| # | Aksi | Trigger | Output |
|---|---|---|---|
| 1 | Terima surat penugasan | Distributor menugaskan | — |
| 2 | Lakukan pentashihan naskah | Naskah diterima (SLA ±20 hari, tergantung jenis mushaf) | Catatan hasil tashih |
| 3 | Buat laporan hasil pentashihan | Pentashihan selesai | Laporan dikirim ke Distributor |
| 4 | *(Loop, bila diminta Distributor)* Tashih ulang naskah yang sama | Distributor kirim ulang | Laporan baru |

---

## 6. Dokumentator

| # | Aksi | Trigger | Output |
|---|---|---|---|
| 1 | Terima dokumen pendaftaran & pentashihan dari Verifikator dan Distributor | Surat Tanda Tashih terbit | Daftar cek kelengkapan |
| 2 | Cek kelengkapan dokumen | Dokumen diterima | Checklist |
| 3 | Unduh Surat Tanda Tashih | Dokumen lengkap | Salinan digital |
| 4 | *(Hanya naskah cetak fisik)* Minta penerbit kirim mushaf hasil cetak (target 5 eksemplar) | — | Permintaan terkirim |
| 5 | Terima & dokumentasikan mushaf hasil cetak yang diterima (boleh <5), catat jumlah aktual + penilaian untuk pelaporan/kinerja | Penerbit kirim fisik | Data dokumentasi + serahkan ke PusdokQ/Arsiparis |
| 5b | *(Naskah digital/audio)* Tidak ada langkah eksemplar — proses dokumentasi selesai begitu berkas digital lengkap | Surat Tanda Tashih terbit | Arsip digital |

---

## 7. PusdokQ / Arsiparis `⚠️ pembagian tugas belum jelas di SOP`

| # | Aksi | Trigger | Output |
|---|---|---|---|
| 1 | Terima & simpan mushaf hasil cetak ke perpustakaan & ruang arsip pentashihan | Dokumentator serahkan | Surat tanda terima mushaf |
| 2 | Terima & arsipkan seluruh dokumen pentashihan | Proses dokumentasi selesai | Arsip dokumentasi lengkap |

**Pertanyaan terbuka untuk stakeholder**: SOP Dokumentasi mencantumkan
PusdokQ dan Arsiparis sebagai pelaksana berbeda di kolom header, tapi
teks kegiatan tidak menyebutkan aktor secara eksplisit per langkah.
Perlu klarifikasi: apakah PusdokQ menerima mushaf fisik dan Arsiparis
mengarsipkan dokumen (pemisahan fisik vs dokumen), atau keduanya
menangani hal yang sama di unit berbeda?

---

## Ringkasan Pertanyaan Terbuka dari Sintesis User Flow Ini

1. Mekanisme notifikasi ke penerbit bahwa Surat Tanda Tashih sudah
   terbit dan boleh mulai cetak massal — belum ada di SOP manapun.
2. Detail proses penetapan Surat Tanda Tashih oleh Kepala LPMQ
   (langkah 3-4 di bagian Kepala LPMQ) — menunggu SOP Penerbitan
   Surat Tanda Tashih.
3. Pembagian tugas pasti PusdokQ vs Arsiparis.
4. Mekanisme delegasi Kepala LPMQ untuk dua titik approval bila
   berhalangan (lihat `IMPLEMENTATION.md` §3.1 dan §7).

## Sudah Terjawab (klarifikasi terbaru)

- ✅ Pembentukan tim distribusi/pentashih berbasis SK resmi yang sudah
  terbit — konsisten dengan skema `DISTRIBUTION_TEAMS` yang ada.
- ✅ Reviu hasil pentashihan adalah tugas Distributor (cross-check/
  ceklis), berdasarkan rekomendasi Pentashih — bukan penilaian ulang
  kualitas oleh Distributor, dan tidak melibatkan ketua kelompok di
  langkah ini.
- ✅ "Pembaca Naskah" BUKAN role RBAC terpisah — hanya istilah untuk
  tugas Pentashih di luar tashih itu sendiri (mis. baca ulang dumi).
  Satu role `Pentashih`, dibedakan lewat `assignments.stage`.
- ✅ Tidak ada dokumen/surat untuk hasil reviu Distributor — cukup
  notifikasi ke Penerbit lewat modul `NOTIFICATIONS`.
- ✅ Pengiriman eksemplar mushaf hasil cetak: berlaku hanya untuk
  naskah cetak fisik, bersifat non-blocking (kurang dari 5 tidak
  menghambat proses), dan hanya kepatuhan regulasi + bahan penilaian
  kinerja Dokumentator.
- ✅ Naskah digital/audio tidak melalui proses eksemplar fisik sama
  sekali — dokumentasi selesai begitu berkas digital lengkap.
