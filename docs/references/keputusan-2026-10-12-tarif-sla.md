# Adendum Regulasi: Mekanisme Perhitungan Tarif PNBP & SLA Pentashihan (12 Oktober 2026)

Dokumen ini mendokumentasikan keputusan resmi terkait penentuan Jenis Layanan Pokok, Penambahan SLA Hari Kerja (HK), dan Tarif PNBP (PP No. 59 Tahun 2020) pada Sistem Manajemen Layanan Pentashihan Mushaf Al-Qur'an (LPMQ) Kementerian Agama RI.

---

## 1. Prinsip Dasar Pemetaan

Terdapat dua bagian checklist isian yang sebelumnya sering dipersepsikan serupa namun memiliki implikasi hukum dan pembiayaan yang berbeda:

1. **Checklist "Jenis Naskah" (Bagian I Formulir Permohonan)**:
   - Menentukan **Klasifikasi Layanan Utama (Service Type)**, **Durasi Standar Sidang Pentashihan (SLA Hari Kerja)**, dan **Tambahan Materi Naskah (Add-on PNBP)**.
   - Pilihan pada kelompok berkode **`3.`** (fitur/konten tambahan naskah seperti Transliterasi, Terjemah, Tajwid, Waqaf, Tafsir) **menambah durasi waktu pemeriksaan pentashihan (SLA)** dan **mengenakan tarif add-on PNBP** (`ADD-MATERI`: Rp 500.000).

2. **Checklist "Materi Tambahan pada Mushaf" (Bagian II Formulir Permohonan)**:
   - Berisi materi pengayaan umum seperti: *Asbabun Nuzul, Hadis, Mutiara Hikmah, Do'a Tertentu, Kisah-Kisah, dan Lainnya*.
   - **TIDAK MENAMBAH BIAYA SAMA SEKALI (Rp 0)**.
   - Pilihan ini berstatus sebagai informasi deskriptif/metadata pelengkap bagi pentashih dan verifikator untuk mengonfirmasi kelayakan isi rubrik, tanpa membebani biaya tambahan kepada penerbit.

---

## 2. Matriks Layanan Pokok, SLA, dan Tarif PNBP Resmi

| Kelompok / Jenis Naskah | SLA Perdana | SLA Revisi | SLA Dummy | Tarif Dasar | Add-on Konten (`ADD-MATERI`) | Total Billing PNBP |
|---|---|---|---|---|---|---|
| **1. Al-Qur'an 30 Juz (Murni)** | **15 HK** | 7 HK | 3 HK | Rp 1.000.000 | Rp 0 | **Rp 1.000.000** |
| **1. Al-Qur'an 30 Juz + 3. Transliterasi** | **22 HK** | 12 HK | 7 HK | Rp 1.000.000 | +Rp 500.000 | **Rp 1.500.000** |
| **1. Al-Qur'an 30 Juz + 3. Terjemah** | **22 HK** | 12 HK | 7 HK | Rp 1.000.000 | +Rp 500.000 | **Rp 1.500.000** |
| **1. Al-Qur'an 30 Juz + 3. Tajwid Warna / Kode Tajwid** | **22 HK** | 12 HK | 7 HK | Rp 1.000.000 | +Rp 500.000 | **Rp 1.500.000** |
| **1. Al-Qur'an 30 Juz + 3. Waqaf Ibtida'** | **22 HK** | 12 HK | 7 HK | Rp 1.000.000 | +Rp 500.000 | **Rp 1.500.000** |
| **1. Al-Qur'an 30 Juz + 3. Tafsir** | **45 HK** | 22 HK | 12 HK | Rp 1.000.000 | +Rp 500.000 | **Rp 1.500.000** |
| **1. Al-Qur'an 30 Juz + 3. Terjemah/Transliterasi Perkata** | **45 HK** | 22 HK | 12 HK | Rp 1.000.000 | +Rp 500.000 | **Rp 1.500.000** |
| **1. Surah Yasin dan Bacaan Tahlil** | **5 HK** | 2 HK | 1 HK | Rp 500.000 | Rp 0 (kecuali +Group 3) | **Rp 500.000** |
| **1. Juz 'Amma dan Terjemahnya** | **5 HK** | 2 HK | 1 HK | Rp 500.000 | Rp 0 | **Rp 500.000** |
| **1. Majmu' Syarif** | **5 HK** | 2 HK | 1 HK | Rp 500.000 | Rp 0 | **Rp 500.000** |
| **1. Kaligrafi** | **3 HK** | 2 HK | 1 HK | Rp 500.000 | Rp 0 | **Rp 500.000** |
| **1. Metode Baca Tulis Al-Qur'an** | **15 HK** | 7 HK | 3 HK | Rp 500.000 | Rp 0 | **Rp 500.000** |
| **2. Audio/Visual** | **30 HK** | 15 HK | 7 HK | Rp 1.000.000 | Rp 0 (kecuali +Group 3) | **Rp 1.000.000** |
| **2. Digital** | **15 HK** | 7 HK | 3 HK | Rp 1.000.000 | Rp 0 (kecuali +Group 3) | **Rp 1.000.000** |
| **Mushaf Standar Braille** | **60 HK** | 30 HK | 15 HK | Rp 0 | Rp 0 (Tarif Khusus Difabel) | **Rp 0** |

*Catatan: HK = Hari Kerja resmi Kementerian Agama RI (tidak menghitung hari Sabtu, Minggu, cuti bersama, dan hari libur nasional).*

---

## 3. Kebijakan Tampilan Antarmuka (UI/UX)

1. **Portal Penerbit (`NewRegistrationPage.jsx`)**:
   - Formulir pendaftaran dibuat bersih, fokus, dan tidak menampilkan kartu kalkulator tarif PNBP maupun estimasi hari kerja yang dapat menimbulkan salah tafsir atau kebingungan administrasi.
   - Sistem secara otomatis mencatat pemetaan ID layanan (`service_type_id`) dan addon terkait di latar belakang secara reaktif.

2. **Workbench Verifikator (`InspectionReferencePanels.jsx` & `ResultLetterPanel.jsx`)**:
   - Menampilkan kartu **"Kalkulasi PNBP & SLA"** secara transparan:
     - Tarif Pokok Layanan
     - Add-on Konten Jenis Naskah (+ Rp 500.000 jika ada opsi Group 3)
     - Total Tagihan Billing
     - Target Durasi Sidang Pentashihan (Perdana, Revisi, Dummy)
   - Menyediakan kotak panduan penerbitan billing Simponi yang memaparkan nominal persis yang wajib diinput oleh verifikator.
   - Menampilkan notasi bahwa isian Bagian II (Materi Pelengkap) tidak dikenakan tarif.

3. **Workbench Distributor (`TeamAssignmentPanel.jsx` & `ManualTeamAssignmentDialog.jsx`)**:
   - Menampilkan badge SLA dinamis (`SLA: XX HK`) pada setiap baris pengajuan.
   - Menampilkan penanda `+Konten Khusus` jika naskah memiliki fitur Group 3 (Transliterasi, Terjemah, Tajwid, dsb.).
   - Menyajikan informasi SLA sidang hari kerja yang dihitung otomatis dari kalender kerja Kemenag RI saat distributor menetapkan kelompok pentashih.

