# Kontrak API: Pendaftaran Penerbit (Versi v1.0)

- **Status:** **v1.0 (RESMI / DIBEKUKAN)**
- **Tanggal:** 19 Oktober 2026
- **Acuan:** Notulensi Rapat 15 Okt 2026, Paket T-F01, Standar API LPMQ (`/api/v1`)
- **Target Pembaca:** Fakhri (Backend: T-F04, T-F05, T-F06) & Faisal (Frontend: T-S01, T-S02, T-S03)

---

## 1. Konvensi Global API

### 1.1 Format Base URL & Header
* **Base URL:** `/api/v1`
* **Content-Type:** `application/json` (kecuali upload berkas menggunakan `multipart/form-data`)
* **Accept:** `application/json`
* **Authorization:** `Bearer <JWT_TOKEN>` (khusus endpoint internal SUPERADMIN dan ADMIN)

### 1.2 Bentuk Respons Sukses (Standard Envelope)
```json
{
  "success": true,
  "message": "Deskripsi hasil operasi yang ramah pengguna.",
  "data": { ... }
}
```

### 1.3 Bentuk Respons Kesalahan (Standard Error Envelope)
```json
{
  "success": false,
  "code": "KODE_KESALAHAN_STANDAR",
  "message": "Pesan kesalahan deskriptif dalam Bahasa Indonesia.",
  "errors": [
    {
      "field": "nama_field",
      "message": "Detail kegagalan validasi pada field terkait."
    }
  ]
}
```

---

## 2. Enum & Tipe Data Standar

### 2.1 `jenis_penerbit`
* `PERUSAHAAN`: PT, CV, atau badan usaha swasta berbadan hukum.
* `YAYASAN`: Yayasan keagamaan/pendidikan/sosial berbadan hukum.
* `LEMBAGA_PEMERINTAH`: Kementerian, Lembaga Negara, Dinas, atau Perguruan Tinggi Negeri.
> **CATATAN KETAT:** Nilai `PERORANGAN` **ditiadakan dan dilarang**. Tidak ada opsi perorangan pada form maupun API.

### 2.2 `status_pendaftaran`
* `DIAJUKAN`: Berkas baru dikirim oleh pemohon atau hasil revisi dikirim ulang, menunggu verifikasi admin.
* `PERLU_PERBAIKAN`: Admin meminta perbaikan data/dokumen. Tautan perbaikan aktif dikirimkan ke email penerbit.
* `DISETUJUI`: Pendaftaran diterima secara sah oleh admin. Akun penerbit diaktifkan (`is_active = true`), dapat login ke dashboard.
* `DITOLAK`: Pendaftaran ditolak secara permanen (final). Akun tidak diaktifkan. NPWP/NIB dibebaskan sehingga dapat mendaftar baru di kemudian hari.

### 2.3 `tipe_dokumen`
* `SURAT_PENDAFTARAN`: Surat permohonan pendaftaran resmi penerbit bertanda tangan pimpinan (PDF, max 500 KB).
* `AKTA_NOTARIS`: Akta pendirian & perubahan terakhir Kemenkumham (PDF, max 2 MB).
* `PROFIL`: Profil instansi/perusahaan/lembaga penerbit (PDF, max 500 KB).
* `NPWP`: Salinan kartu/SKT NPWP badan hukum (PDF, max 500 KB).
* `NIB`: Nomor Induk Berusaha dari OSS (PDF, max 500 KB).
* `KTP_PENANGGUNG_JAWAB`: KTP pimpinan atau penanggung jawab akun (PDF, max 500 KB).

---

## 3. Matriks Dokumen Wajib per Jenis Penerbit

| Dokumen | Perusahaan (PT/CV) | Yayasan | Lembaga Pemerintah | Batas Ukuran | Format |
|---|:---:|:---:|:---:|:---:|:---:|
| `SURAT_PENDAFTARAN` | **Wajib** | **Wajib** | **Wajib** | 500 KB | PDF (`%PDF-`) |
| `AKTA_NOTARIS` | **Wajib** | **Wajib** | *Tidak Ada* | 2 MB | PDF (`%PDF-`) |
| `PROFIL` | **Wajib** | **Wajib** | **Wajib** | 500 KB | PDF (`%PDF-`) |
| `NPWP` | **Wajib** | **Wajib** | **Wajib** | 500 KB | PDF (`%PDF-`) |
| `NIB` | **Wajib** | *Tidak Ada* | *Tidak Ada* | 500 KB | PDF (`%PDF-`) |
| `KTP_PENANGGUNG_JAWAB` | **Wajib** | **Wajib** | **Wajib** | 500 KB | PDF (`%PDF-`) |

*Catatan: Dokumen izin usaha SIUP dan TDP tidak lagi disyaratkan karena sudah terintegrasi dalam dokumen NIB.*

---

## 4. Keputusan Arsitektural (Kunci v1.0)

1. **Format Kode Pendaftaran:**
   * Format acak berentropi tinggi: `REG-PUB-XXXXXXXX` (8 karakter alfanumerik kapital acak, contoh: `REG-PUB-7K9M2X4F`).
   * Tidak menggunakan penomoran urut agar tidak dapat ditebak (*anti-enumeration*).
2. **Masa Berlaku Tautan Perbaikan:**
   * **14 hari kalender** sejak diterbitkan oleh admin.
   * Disimpan hanya dalam bentuk hash SHA-256 (bukan plaintext token).
   * Bersifat sekali pakai (*single-use*); langsung hangus setelah form revisi di-*submit*.
3. **Verifikasi Email:**
   * Pengajuan pendaftaran langsung berstatus `DIAJUKAN` tanpa memblokir antrean verifikasi admin.
   * Email notifikasi berisi kode pendaftaran otomatis dikirimkan ke email terdaftar. Pembuktian kepemilikan email secara alami terjadi saat pemohon mengakses tautan revisi dari kotak masuk email mereka.
4. **Keunikan Identitas Hukum (NPWP & NIB):**
   * NPWP dan NIB bersifat unik **hanya di antara pendaftaran yang aktif** (status `DIAJUKAN`, `PERLU_PERBAIKAN`, atau `DISETUJUI`).
   * Jika pendaftaran sebelumnya berstatus `DITOLAK`, nomor NPWP/NIB tersebut dapat didaftarkan kembali.

---

## 5. Rincian Endpoint

### 5.1 `POST /api/v1/publisher-registrations`
* **Akses:** Publik (Rate Limited: Maks 10 request / 15 menit per IP).
* **Format:** `multipart/form-data`.
* **Fungsi:** Mengirimkan formulir pendaftaran akun penerbit baru beserta dokumen persyaratan.

#### Field Form:
| Field | Tipe | Wajib? | Keterangan |
|---|---|:---:|---|
| `nama_penerbit` | String (3–150) | Ya | Nama resmi badan hukum / lembaga |
| `jenis_penerbit` | Enum | Ya | `PERUSAHAAN`, `YAYASAN`, `LEMBAGA_PEMERINTAH` |
| `alamat_lengkap` | String (10–500) | Ya | Alamat kantor resmi (dipakai sebagai alamat pengiriman fisik) |
| `nama_penanggung_jawab` | String (3–100) | Ya | Nama pimpinan / penanggung jawab |
| `telepon_penanggung_jawab` | String (9–20) | Ya | Nomor seluler / WhatsApp aktif (contoh: `081234567890`) |
| `email` | String (Email) | Ya | Email resmi akun (unik di sistem) |
| `password` | String (min 8) | Ya | Kata sandi akun |
| `npwp` | String (15–20) | Ya | Nomor Pokok Wajib Pajak (angka & format standar) |
| `nib` | String (13–20) | Kondisional | Wajib untuk `PERUSAHAAN`, diabaikan untuk lainnya |
| `dokumen_surat_pendaftaran` | File PDF | Ya | Berkas PDF maks 500 KB |
| `dokumen_akta_notaris` | File PDF | Kondisional | Wajib untuk `PERUSAHAAN` dan `YAYASAN` (maks 2 MB) |
| `dokumen_profil` | File PDF | Ya | Berkas PDF maks 500 KB |
| `dokumen_npwp` | File PDF | Ya | Berkas PDF maks 500 KB |
| `dokumen_nib` | File PDF | Kondisional | Wajib untuk `PERUSAHAAN` (maks 500 KB) |
| `dokumen_ktp` | File PDF | Ya | Berkas PDF maks 500 KB |

#### Contoh Respons Berhasil (201 Created):
```json
{
  "success": true,
  "message": "Pendaftaran akun penerbit berhasil diajukan. Simpan kode pendaftaran Anda untuk memantau status.",
  "data": {
    "kode_pendaftaran": "REG-PUB-7K9M2X4F",
    "nama_penerbit": "PT Pustaka Cahaya Mandiri",
    "email": "sekretariat@pustakacahaya.co.id",
    "status": "DIAJUKAN",
    "created_at": "2026-10-19T10:30:00.000Z"
  }
}
```

---

### 5.2 `POST /api/v1/publisher-registrations/check-status`
* **Akses:** Publik (Rate Limited: Maks 20 request / 15 menit per IP).
* **Format:** `application/json`.
* **Keamanan:** Parameter dikirim via **HTTP Body** (bukan query string di URL) guna mencegah kebocoran kode pendaftaran pada log web server atau riwayat peramban.

#### Request Body:
```json
{
  "kode_pendaftaran": "REG-PUB-7K9M2X4F"
}
```

#### Respons Berhasil - Status Menunggu Verifikasi (200 OK):
```json
{
  "success": true,
  "message": "Status pendaftaran berhasil ditemukan.",
  "data": {
    "kode_pendaftaran": "REG-PUB-7K9M2X4F",
    "status": "DIAJUKAN",
    "status_label": "Menunggu Verifikasi Petugas",
    "alasan": null,
    "tanggal_pengajuan": "2026-10-19T10:30:00.000Z",
    "tanggal_pembaruan": "2026-10-19T10:30:00.000Z"
  }
}
```

#### Respons Berhasil - Status Perlu Perbaikan (200 OK):
```json
{
  "success": true,
  "message": "Status pendaftaran berhasil ditemukan.",
  "data": {
    "kode_pendaftaran": "REG-PUB-7K9M2X4F",
    "status": "PERLU_PERBAIKAN",
    "status_label": "Perlu Perbaikan",
    "alasan": "Akta Notaris buram dan halaman pengesahan Kemenkumham belum terlampir. Harap perbarui dokumen akta.",
    "tanggal_pengajuan": "2026-10-19T10:30:00.000Z",
    "tanggal_pembaruan": "2026-10-20T08:15:00.000Z",
    "instruksi": "Silakan periksa kotak masuk email terdaftar Anda untuk mengakses tautan perbaikan dokumen."
  }
}
```

#### Respons Kode Tidak Ditemukan (404 Not Found):
*Pesan netral dan konsisten untuk mencegah enumerasi.*
```json
{
  "success": false,
  "code": "REGISTRATION_NOT_FOUND",
  "message": "Kode pendaftaran tidak ditemukan. Pastikan Anda memasukkan kode dengan benar sesuai email konfirmasi."
}
```

---

### 5.3 `GET /api/v1/publisher-registrations/revision/:token`
* **Akses:** Pemegang Token Perbaikan (dari tautan email).
* **Format:** `application/json`.
* **Fungsi:** Memuat data pendaftaran yang perlu diperbaiki beserta catatan kekurangan dari admin.

#### Respons Berhasil (200 OK):
```json
{
  "success": true,
  "message": "Data perbaikan berhasil dimuat.",
  "data": {
    "kode_pendaftaran": "REG-PUB-7K9M2X4F",
    "nama_penerbit": "PT Pustaka Cahaya Mandiri",
    "jenis_penerbit": "PERUSAHAAN",
    "alamat_lengkap": "Jl. Percetakan Mushaf No. 12, Jakarta Timur",
    "nama_penanggung_jawab": "Ahmad Subagio",
    "telepon_penanggung_jawab": "081234567890",
    "email": "sekretariat@pustakacahaya.co.id",
    "npwp": "01.234.567.8-901.000",
    "nib": "9120001234567",
    "alasan_perbaikan": "Akta Notaris buram dan halaman pengesahan Kemenkumham belum terlampir. Harap perbarui dokumen akta.",
    "dokumen_terunggah": [
      { "tipe": "SURAT_PENDAFTARAN", "nama_file": "surat-permohonan.pdf", "status": "VALID" },
      { "tipe": "AKTA_NOTARIS", "nama_file": "akta-pendirian.pdf", "status": "PERLU_DIGANTI" },
      { "tipe": "PROFIL", "nama_file": "profil-penerbit.pdf", "status": "VALID" },
      { "tipe": "NPWP", "nama_file": "npwp-badan.pdf", "status": "VALID" },
      { "tipe": "NIB", "nama_file": "nib-oss.pdf", "status": "VALID" },
      { "tipe": "KTP_PENANGGUNG_JAWAB", "nama_file": "ktp-pj.pdf", "status": "VALID" }
    ]
  }
}
```

#### Respons Token Hangus / Tidak Valid (400 / 410):
```json
{
  "success": false,
  "code": "TOKEN_INVALID_OR_EXPIRED",
  "message": "Tautan perbaikan sudah tidak berlaku atau pernah digunakan. Hubungi petugas loket LPMQ jika Anda memerlukan bantuan."
}
```

---

### 5.4 `PUT /api/v1/publisher-registrations/revision/:token`
* **Akses:** Pemegang Token Perbaikan.
* **Format:** `multipart/form-data`.
* **Fungsi:** Mengirimkan revisi data atau dokumen yang diminta. Hanya dokumen yang diperbarui yang wajib dikirim ulang.
* **Efek Samping:** Status kembali ke `DIAJUKAN`, token perbaikan langsung dihanguskan (*burned*).

#### Form Data:
* Isian field data yang diperbaiki (jika ada).
* Berkas berkas baru (misal: `dokumen_akta_notaris`).

#### Respons Berhasil (200 OK):
```json
{
  "success": true,
  "message": "Perbaikan pendaftaran berhasil dikirim. Petugas akan memverifikasi ulang permohonan Anda.",
  "data": {
    "kode_pendaftaran": "REG-PUB-7K9M2X4F",
    "status": "DIAJUKAN",
    "updated_at": "2026-10-20T09:45:00.000Z"
  }
}
```

---

### 5.5 `GET /api/v1/admin/publisher-registrations`
* **Akses:** Internal (`SUPERADMIN`, `ADMIN_INTERNAL`).
* **Query Parameters:**
  * `page` (default: 1)
  * `limit` (default: 10, max: 100)
  * `status` (opsional: `DIAJUKAN`, `PERLU_PERBAIKAN`, `DISETUJUI`, `DITOLAK`)
  * `search` (opsional: cari berdasarkan nama penerbit, kode pendaftaran, email, atau NPWP)
* **Aturan:** Pencarian dan filter dijalankan di database server sebelum kalkulasi paginasi.

#### Respons Berhasil (200 OK):
```json
{
  "success": true,
  "message": "Daftar pendaftaran penerbit berhasil diambil.",
  "data": [
    {
      "id": "cm2a01...",
      "kode_pendaftaran": "REG-PUB-7K9M2X4F",
      "nama_penerbit": "PT Pustaka Cahaya Mandiri",
      "jenis_penerbit": "PERUSAHAAN",
      "email": "sekretariat@pustakacahaya.co.id",
      "status": "DIAJUKAN",
      "tautan_terdeteksi": false,
      "versi": 1,
      "created_at": "2026-10-19T10:30:00.000Z"
    }
  ],
  "pagination": {
    "page": 1,
    "limit": 10,
    "total_records": 42,
    "total_pages": 5
  }
}
```

---

### 5.6 `GET /api/v1/admin/publisher-registrations/:id`
* **Akses:** Internal (`SUPERADMIN`, `ADMIN_INTERNAL`).
* **Fungsi:** Mengambil data rincian lengkap pendaftaran penerbit beserta metadata berkas dan status penanda keamanan.

#### Respons Berhasil (200 OK):
```json
{
  "success": true,
  "message": "Detail pendaftaran penerbit berhasil diambil.",
  "data": {
    "id": "cm2a01...",
    "kode_pendaftaran": "REG-PUB-7K9M2X4F",
    "nama_penerbit": "PT Pustaka Cahaya Mandiri",
    "jenis_penerbit": "PERUSAHAAN",
    "alamat_lengkap": "Jl. Percetakan Mushaf No. 12, Jakarta Timur",
    "nama_penanggung_jawab": "Ahmad Subagio",
    "telepon_penanggung_jawab": "081234567890",
    "email": "sekretariat@pustakacahaya.co.id",
    "npwp": "01.234.567.8-901.000",
    "nib": "9120001234567",
    "status": "DIAJUKAN",
    "alasan": null,
    "versi": 1,
    "dokumen": [
      {
        "id": "doc_01...",
        "tipe": "SURAT_PENDAFTARAN",
        "nama_asli": "surat-permohonan.pdf",
        "ukuran_bytes": 245012,
        "tautan_terdeteksi": false,
        "daftar_tautan": [],
        "created_at": "2026-10-19T10:30:00.000Z"
      },
      {
        "id": "doc_02...",
        "tipe": "PROFIL",
        "nama_asli": "company-profile.pdf",
        "ukuran_bytes": 489110,
        "tautan_terdeteksi": true,
        "daftar_tautan": ["https://pustakacahaya.co.id"],
        "created_at": "2026-10-19T10:30:00.000Z"
      }
    ],
    "created_at": "2026-10-19T10:30:00.000Z",
    "decided_at": null,
    "decided_by": null
  }
}
```

---

### 5.7 `GET /api/v1/admin/publisher-registrations/:id/documents/:documentId`
* **Akses:** Internal (`SUPERADMIN`, `ADMIN_INTERNAL`).
* **Fungsi:** Mengunduh atau melihat dokumen berkas.
* **Ketentuan Keamanan:**
  * Akses melalui otorisasi JWT (bukan URL static publik).
  * Berkas berada di luar web root publik.
  * Header: `Content-Disposition: attachment; filename="[nama_aman].pdf"`.
  * Pembukaan berkas bertipe `KTP_PENANGGUNG_JAWAB` otomatis mencatat entri pada `audit_logs` (Pencatatan Akses Data Sensitif).

---

### 5.8 `POST /api/v1/admin/publisher-registrations/:id/decision`
* **Akses:** Internal (`SUPERADMIN`, `ADMIN_INTERNAL`).
* **Fungsi:** Menetapkan persetujuan, permintaan perbaikan, atau penolakan.
* **Konkurensi Optimistik:** Wajib menyertakan parameter `versi`. Jika `versi` di database sudah berubah (misal sudah diputuskan oleh admin lain), request ditolak dengan `VERSION_CONFLICT`.

#### Request Body:
```json
{
  "keputusan": "PERLU_PERBAIKAN",
  "alasan": "Akta Notaris buram pada lembar pengesahan. Harap lampirkan pindaian yang lebih jelas.",
  "versi": 1
}
```
*(Catatan: Nilai `keputusan` adalah salah satu dari: `SETUJUI`, `PERLU_PERBAIKAN`, `TOLAK`. Field `alasan` wajib diisi kecuali untuk keputusan `SETUJUI`).*

#### Respons Berhasil (200 OK):
```json
{
  "success": true,
  "message": "Keputusan pendaftaran berhasil disimpan.",
  "data": {
    "id": "cm2a01...",
    "kode_pendaftaran": "REG-PUB-7K9M2X4F",
    "status": "PERLU_PERBAIKAN",
    "versi": 2,
    "decided_at": "2026-10-20T08:15:00.000Z"
  }
}
```

#### Respons Konflik Versi (409 Conflict):
```json
{
  "success": false,
  "code": "VERSION_CONFLICT",
  "message": "Data pendaftaran telah diperbarui oleh petugas lain. Muat ulang halaman untuk melihat status terbaru."
}
```

---

### 5.9 Perubahan Proteksi Login (`POST /api/v1/auth/login`)
Pada endpoint login yang sudah ada:
1. Jika kredensial (email & password) salah: kembalikan pesan generik biasa `401 Unauthorized`.
2. Jika kredensial benar, tetapi akun bertipe penerbit dan status pendaftaran belum `DISETUJUI`:
   * **HTTP Status:** `403 Forbidden`
   * **Response Body:**
   ```json
   {
     "success": false,
     "code": "PUBLISHER_NOT_APPROVED",
     "message": "Akun penerbit Anda belum disetujui atau masih dalam proses verifikasi petugas. Silakan pantau status pendaftaran Anda secara mandiri atau hubungi loket LPMQ.",
     "data": {
       "status_pendaftaran": "DIAJUKAN"
     }
   }
   ```

---

## 6. Validasi Server & Keamanan Dokumen

1. **Pemeriksaan Magic Bytes & Header Berkas:**
   * Server memeriksa 5 byte pertama berkas: wajib `%PDF-`.
   * Tolak jika berkas dienkripsi / dilindungi kata sandi (*encrypted PDF*).
2. **Pembersihan Konten Aktif (*Active Content Blocking*):**
   * Pindai struktur objek PDF dari elemen berbahaya: `/JavaScript`, `/JS`, `/OpenAction`, `/Launch`, `/EmbeddedFile`.
   * Jika ditemukan: tolak langsung dengan error `FILE_ACTIVE_CONTENT`.
3. **Penandaan Tautan (*Link Flagging*):**
   * Tautan eksternal (`/URI` atau format URL teks) diekstrak.
   * Tidak ditolak otomatis, tetapi ditandai `tautan_terdeteksi = true` dan daftarnya dicatat pada metadata dokumen agar admin dapat memeriksa saat sidang verifikasi.
4. **Penyimpanan Berkas:**
   * Nama berkas fisik di server diacak (UUID v4 / hash).
   * Disimpan di direktori privat (`storage/private/publisher-docs/`) di luar web root `public/`.
5. **Pencegahan Injeksi & Rate Limiting:**
   * Sanitasi string teks bebas guna mencegah XSS dan SQL injection (menggunakan Prisma parameterized query).
   * Limitasi laju (*Rate Limiter*) terpasang pada endpoint publik pendaftaran dan cek status.

---

## 7. Kamus Kode Kesalahan (Error Codes)

| Kode Kesalahan | HTTP Status | Keterangan & Tindakan Rekomendasi |
|---|:---:|---|
| `VALIDATION_ERROR` | 400 | Format input tidak valid atau terdapat field wajib yang kosong. |
| `DOCUMENT_REQUIRED` | 400 | Dokumen wajib untuk jenis penerbit terkait belum dilampirkan. |
| `FILE_TOO_LARGE` | 413 | Ukuran berkas melampaui batas maksimum (500 KB atau 2 MB untuk Akta). |
| `FILE_NOT_PDF` | 400 | Berkas bukan dokumen PDF asli (magic bytes `%PDF-` tidak cocok). |
| `FILE_ACTIVE_CONTENT` | 400 | Berkas mengandung skrip aktif berbahaya (`/JS`, `/Launch`, dll). |
| `DUPLICATE_ACTIVE_REGISTRATION` | 409 | NPWP, NIB, atau Email sudah terdaftar pada permohonan yang sedang aktif. |
| `REGISTRATION_NOT_FOUND` | 404 | Kode pendaftaran tidak ditemukan di sistem. |
| `TOKEN_INVALID_OR_EXPIRED` | 400 / 410 | Token tautan perbaikan tidak valid atau telah melewati batas 14 hari. |
| `VERSION_CONFLICT` | 409 | Keputusan gagal disimpan karena versi data telah diubah oleh admin lain. |
| `PUBLISHER_NOT_APPROVED` | 403 | Login ditolak karena pendaftaran akun penerbit belum disetujui admin. |
| `RATE_LIMITED` | 429 | Batas frekuensi permintaan terlampaui. Coba lagi dalam beberapa menit. |

---

## 8. Notifikasi Email Otomatis

Sistem akan mengirimkan notifikasi email transaksional pada 4 peristiwa penting:
1. **Pendaftaran Diterima:** Memuat salam pembuka, nama instansi penerbit, kode pendaftaran unik, serta tautan ke halaman cek status.
2. **Permintaan Perbaikan:** Memuat rincian alasan kekurangan berkas dari admin, batas waktu 14 hari, dan tombol/tautan sekali pakai menuju halaman formulir perbaikan.
3. **Pendaftaran Disetujui:** Memberitahukan bahwa akun penerbit telah aktif dan dapat digunakan untuk login ke portal pentashihan LPMQ.
4. **Pendaftaran Ditolak:** Menjelaskan alasan penolakan berkas dan memberitahukan bahwa pemohon dapat mengajukan pendaftaran baru dengan berkas yang memenuhi syarat.
