# Glosarium Istilah Resmi Layanan Pentashihan Mushaf Al-Qur'an (LPMQ Tashih Hub)

Dokumen ini merupakan rujukan standar kebahasaan, terminologi kedinasan, dan padanan istilah antarmuka pengguna (*User Interface*) untuk sistem **LPMQ Tashih Hub**. 

Tujuan utama dokumen ini adalah memastikan konsistensi istilah di seluruh antarmuka, template surat dinas, label pengiriman, dan modul sistem, serta **menghapus kebocoran bahasa sistem (*raw database enum / developer jargon*)** agar seluruh teks mudah dipahami oleh penerbit mushaf maupun petugas internal Kementerian Agama RI.

---

## 1. Glosarium Peran & Entitas Pengguna

| Istilah Resmi | Kode Sistem (*Enum*) | Definisi & Wewenang Kedinasan |
|---|---|---|
| **Penerbit Terverifikasi** | `PENERBIT` / `PUBLISHER` | Badan hukum berbadan usaha (PT, CV, Yayasan, Lembaga, Koperasi) yang telah lolos verifikasi legalitas resmi oleh LPMQ untuk mengajukan permohonan tanda tashih mushaf Al-Qur'an. |
| **Helper Admin Loket** | `ADMIN_INTERNAL` | Petugas loket fisik LPMQ yang berwenang melayani *intake* master fisik naskah, memeriksa nomor resi pengiriman, menerbitkan tanda terima fisik, serta melakukan verifikasi awal akun pendaftaran badan hukum penerbit. |
| **Verifikator Dokumen** | `VERIFIKATOR` / `VERIFICATOR` | Petugas fungsional yang ditugaskan melalui Nota Dinas untuk memeriksa kelengkapan administratif, kelayakan sampel berkas digital, rasm usmani, tanda baca, serta kesesuaian fisik mushaf. |
| **Koordinator Distribusi** | `DISTRIBUTOR` | Petugas pengelola alur sidang pentashihan yang menerima serah-terima master fisik dari verifikator (BAST), membentuk formatur tim pentashih (SK Tim), membagi rentang juz penugasan, dan menerbitkan surat pengembalian naskah perbaikan. |
| **Pentashih Naskah** | `PENTASHIH` / `TASHIH_MEMBER` | Anggota fungsional pentashih mushaf Al-Qur'an yang meneliti teks ayat suci per rentang juz yang ditugaskan, memberikan rekomendasi perbaikan, serta mengunggah berkas rekapitulasi koreksi sidang. |
| **Administrator Dokumen** | `DOKUMENTATOR` / `DOCUMENTATOR` | Petugas kearsipan dan dokumentasi yang mengelola penomoran Surat Tanda Tashih (STT), penerbitan Berita Acara Pentashihan, serta memverifikasi penyerahan 5 eksemplar cetak fisik mushaf dari penerbit. |
| **Kepala LPMQ** | `KEPALA_LPMQ` / `HEAD_OF_LPMQ` | Pejabat pimpinan tinggi pratama yang berwenang mengesahkan Nota Dinas penugasan, menyetujui surat hasil verifikasi, menandatangani Surat Tanda Tashih (STT) resmi, dan menetapkan kebijakan layanan. |
| **Administrator Sistem** | `SUPERADMIN` | Pengelola teknis sistem yang mengelola pengguna, data master, hak akses (*RBAC*), konfigurasi landing page, serta pemeliharaan infrastruktur aplikasi. |

---

## 2. Glosarium Dokumen Kedinasan & Tanda Bukti

| Istilah Resmi Antarmuka | Kode Dokumen Sistem | Definisi & Ketentuan |
|---|---|---|
| **Surat Tanda Tashih (STT)** | `SURAT_TANDA_TASHIH` | Dokumen negara resmi ber-QR yang menyatakan bahwa master mushaf Al-Qur'an telah diperiksa dan disahkan oleh LPMQ Kemenag RI serta diizinkan untuk dicetak dan diedarkan sesuai izin oplah. |
| **Tanda Terima Permohonan** | `BUKTI_PERMOHONAN` | Dokumen bukti pendaftaran elektronik resmi ber-QR yang memuat nomor registrasi naskah, rincian varian oplah/ukuran, serta rekap tarif estimasi PNBP. |
| **Tanda Terima Master Fisik** | `TANDA_TERIMA_FISIK` | Tanda bukti penerimaan paket fisik naskah master A4 di loket LPMQ yang diterbitkan oleh Helper Admin Loket dengan pencatatan nomor resi ekspedisi. |
| **Disposisi / Nota Dinas Verifikasi** | `NOTA_DINAS_VERIFIKASI` | Surat penugasan resmi dari Kepala LPMQ kepada verifikator yang ditunjuk untuk memeriksa permohonan naskah tertentu. |
| **Berita Acara Verifikasi (BAV)** | `BERITA_ACARA_VERIFIKASI` | Berita acara resmi hasil pemeriksaan administrasi, rasm, harakat, dan fisik mushaf yang ditandatangani digital oleh Verifikator dan disetujui Kepala LPMQ. |
| **Surat Hasil Verifikasi** | `SURAT_HASIL_VERIFIKASI` | Surat kedinasan resmi berkode `TL.01` yang diterbitkan LPMQ kepada penerbit, memuat putusan lolos verifikasi berkas (disertai lampiran billing SIMPONI) atau naskah tidak lolos. |
| **Berita Acara Serah Terima Fisik (BAST)** | `BAST_HANDOVER` | Bukti serah-terima master fisik mushaf dari Verifikator ke Koordinator Distribusi setelah pembayaran PNBP tervalidasi lunas. |
| **Surat Penugasan Tim Pentashih** | `DECREE_OF_ASSIGNMENT` | Surat penetapan pembagian tugas sidang pentashihan mushaf Al-Qur'an kepada anggota kelompok pentashih berdasarkan rentang juz. |
| **Surat Pengembalian Naskah Perbaikan** | `REVISION_RETURN_LETTER` | Surat resmi yang memuat catatan koreksi sidang pentashihan dan memerintahkan penerbit melakukan perbaikan naskah (*Ronde Revisi*). |
| **Berita Acara Pentashihan (BAT)** | `BERITA_ACARA_TASHIH` | Berita acara paripurna sidang pentashihan mushaf Al-Qur'an yang menjadi dasar hukum penerbitan Surat Tanda Tashih (STT). |
| **Kode Billing SIMPONI** | `SIMPONI_BILLING` | Kode tagihan Penerimaan Negara Bukan Pajak (PNBP) resmi dari Kementerian Keuangan RI yang memiliki masa berlaku 7 hari kalender. |

---

## 3. Glosarium Tahapan Alur Layanan (8 Fase Resmi)

Sistem mengadopsi 8 fase alur proses manusiawi yang terhubung dari awal permohonan hingga naskah diarsipkan:

```
[1. Pendaftaran] ──> [2. Verifikasi] ──> [3. Pembayaran] ──> [4. Serah-Terima]
       │                    │                  │                   │
[8. Selesai]     <── [7. Dokumentasi]<── [6. STT]        <── [5. Pentashihan]
```

1. **Fase 1: Pendaftaran (*Registration*)**
   Penerbit mengisi formulir data mushaf, memilih kategori materi, mengunggah berkas legalitas dan sampel digital, serta mengirimkan permohonan resmi ke LPMQ.
2. **Fase 2: Verifikasi Permohonan & Naskah Fisik (*Verification*)**
   Penerbit mengirimkan master fisik naskah A4 ke loket LPMQ. Helper Admin mencatat penerimaan (*intake*). Kepala LPMQ menerbitkan Nota Dinas, dan Verifikator memeriksa kelengkapan administrasi dan rasm.
3. **Fase 3: Pembayaran PNBP (*Payment*)**
   Setelah naskah lolos verifikasi, kode billing SIMPONI diterbitkan. Penerbit melakukan pembayaran ke kas negara dan mengonfirmasi bukti setor (NTPN).
4. **Fase 4: Serah-Terima Fisik (*Handover*)**
   Verifikator menyerahkan master cetak fisik kepada Koordinator Distribusi melalui Berita Acara Serah Terima (BAST).
5. **Fase 5: Sidang Pentashihan (*Tashih*)**
   Distributor menetapkan penugasan pentashih rentang juz. Pentashih meneliti keabsahan lafazh, harakat, dan waqaf. Jika ditemukan kesalahan, naskah dikembalikan ke penerbit untuk siklus perbaikan (*Ronde Revisi*) hingga naskah bersih dan mencapai tahap Dumi (*pra-cetak*).
6. **Fase 6: Penerbitan STT (*STT Issuance*)**
   Setelah naskah dumi dinyatakan bersih tanpa koreksi, Kepala LPMQ mengesahkan dan menandatangani Surat Tanda Tashih (STT) digital ber-QR.
7. **Fase 7: Dokumentasi & Deposit Eksemplar (*Documentation*)**
   Penerbit mencetak mushaf sesuai izin oplah dan wajib menyerahkan deposit **5 eksemplar cetak fisik** ke perpustakaan/arsip LPMQ dalam waktu 1 bulan kalender.
8. **Fase 8: Selesai (*Completed*)**
   Seluruh kewajiban hukum dan administratif telah tuntas; berkas dan metadata tersimpan abadi di Pusat Arsip LPMQ.

---

## 4. Tabel Padanan: Bahasa Sistem vs Istilah Tampilan Pengguna

Gunakan tabel ini untuk memastikan tidak ada kode sistem (*developer enum*) yang muncul di layar:

| Kode Sistem (*Enum / Jargon*) | ❌ Bahasa Sistem / Salah | ✅ Istilah Resmi Antarmuka (*User-Friendly*) |
|---|---|---|
| `DRAFT` | Draf Belum Diajukan / Draft | **Draf Permohonan** |
| `READY_FOR_VERIFICATION` | Siap ditugaskan / Pending Intake | **Menunggu Penugasan Verifikator** *(jika fisik sudah diterima)* / **Menunggu Pengiriman Master Fisik** |
| `VERIFICATION_ASSIGNED` | Assigned / Verif Assigned | **Verifikator Ditugaskan** |
| `IN_VERIFICATION` | In Progress / Sedang diperiksa | **Sedang Diverifikasi** |
| `REVISION_REQUIRED` | Revisi / Revision Required | **Perlu Perbaikan Berkas** *(Verifikasi)* / **Perlu Perbaikan Naskah Sidang** *(Tashih)* |
| `WAITING_VERIFICATION_APPROVAL` | Waiting Approval | **Menunggu Persetujuan Kepala LPMQ** |
| `VERIFICATION_APPROVED` | Approved / Approved by Head | **Surat Disetujui (Siap Dikirim)** |
| `AWAITING_PAYMENT` | Unpaid / Menunggu Bayar | **Menunggu Pembayaran PNBP** |
| `PAYMENT_VERIFICATION` | Verifikasi Bayar / Checking | **Verifikasi Pembayaran** |
| `WAITING_DISTRIBUTOR_RECEIPT` | Waiting Receipt | **Menunggu Konfirmasi Distributor** |
| `PHYSICAL_HANDOVER_CORRECTION_REQUIRED` | Fisik Cacat / Handover Reject | **Perlu Koreksi Master Fisik** |
| `WAITING_DISTRIBUTION` | Ready Distribution | **Siap Penugasan Tim Sidang** |
| `TASHIH_IN_PROGRESS` | Tashih Process / Reviewing | **Sidang Tashih Berjalan** |
| `READY_FOR_STT` | Ready STT | **Siap Penetapan STT** |
| `STT_ISSUED` | STT Terbit / Issued | **STT Ditetapkan** |
| `DOCUMENTATION_IN_PROGRESS` | Documentation / Doc Queue | **Pemberkasan Dokumentasi** |
| `COMPLETED` | Selesai / Done | **Selesai (Surat Terbit)** |
| `CANCELLED` | Batal / Void | **Dibatalkan** |
| `NASKAH_PERBAIKAN` | Putaran Koreksi | **Naskah Perbaikan** |
| `NASKAH_DUMI` | Dummy | **Naskah Dumi (Pra-Cetak)** |
| `INITIAL` | Tahap 1 | **Tashih Tahap Awal** |
| `REVISION` | Tahap 2 | **Tashih Tahap Perbaikan** |
| `DUMMY` | Tahap 3 | **Tashih Tahap Dumi (Pra-Cetak)** |
| `TEAM` | Kelompok | **Mewakili Tim (Kolektif)** |
| `SELF` | Individu | **Perorangan (Mandiri)** |
| `LOKET_LPMQ` | Loket | **Serah Langsung ke Loket LPMQ** |
| `SUBMITTED` | Submitted | **Diajukan** |
| `SUPERSEDED` | Superseded | **Digantikan Versi Baru** |

---

## 5. Kaidah Penulisan & Larangan Narasi

1. **Dilarang Menampilkan Kode Enum Mentah:**
   Teks seperti `READY_FOR_VERIFICATION`, `REVISION_REQUIRED`, `AWAITING_PAYMENT`, `UNPAID`, atau `SUBMITTED` tidak boleh tampil langsung di layar pengguna tanpa diformat menggunakan helper `formatRegistrationStatus()` atau `formatDocumentStatus()`.
2. **Standardisasi Nama Naskah:**
   Gunakan istilah **"Master Fisik Naskah"** untuk naskah cetak A4 yang diserahkan ke loket, dan **"Naskah Dumi"** untuk cetakan pra-cetak akhir sebelum pencetakan massal.
3. **Penyebutan Tanda Terima:**
   Gunakan istilah **"Tanda Terima Permohonan"** (bukan "Bukti Pendaftaran").
4. **Pemberitahuan Waktu Layanan (SLA):**
   SLA resmi adalah dalam satuan **Hari Kerja (HK)** (bukan hari kalender). Hitungan SLA naskah resmi dimulai pada **H+1 setelah verifikasi pembayaran PNBP disahkan**.
5. **Kerahasiaan Sidang Pentashihan:**
   Identitas pentashih personal dan berkas rekapitulasi koreksi internal bersifat **rahasia dinas LPMQ**. Antarmuka penerbit hanya menerima Surat Pengembalian Naskah Perbaikan resmi yang disahkan Koordinator Distribusi.
