# Spesifikasi Kontrak API & Arsitektur Layanan — LPMQ Tashih Hub

> **Status Dokumen**: Resmi (Live Implementation Reference).  
> **Versi Standar**: SOP Pentashihan Mushaf Al-Qur'an Kemenag RI v2.2.  
> **Base URL**: `/api/v1`  
> **Otentikasi**: HTTP Bearer Token (`Authorization: Bearer <jwt-token>`).

Dokumen ini merupakan referensi tunggal kontrak REST API dan arsitektur alur kerja backend LPMQ Tashih Hub. Seluruh format data, skema validasi Zod, kebijakan otorisasi berbasis peran (RBAC), serta mesin status (*state machine*) di bawah ini telah terpasang dan teruji secara penuh di backend.

---

## 1. Standar REST API & Respon Envelope

### 1.1 Format Respon Sukses (HTTP 200 / 201)
Semua respon sukses dibungkus dalam envelope JSON konsisten:
```json
{
  "success": true,
  "message": "Operasi berhasil dijalankan.",
  "data": { ... }
}
```

### 1.2 Format Respon Kesalahan (HTTP 400, 401, 403, 404, 409, 422, 500)
Respon kesalahan ditangkap oleh `error.middleware.js` dengan format:
```json
{
  "success": false,
  "message": "Validasi input gagal.",
  "errors": [
    {
      "field": "name",
      "message": "Nama kategori wajib diisi minimal 3 karakter."
    }
  ]
}
```

### 1.3 Kode Status HTTP Utama
| Kode HTTP | Makna & Penggunaan |
|---|---|
| `200 OK` | Permintaan pembacaan atau pembaruan data berhasil. |
| `201 Created` | Sumber daya baru (pengajuan, tagihan, berkas, dokumen) berhasil dibuat. |
| `400 Bad Request` | Payload tidak valid secara skema Zod atau pelanggaran logika dasar. |
| `401 Unauthorized` | Token JWT tidak disertakan atau telah kedaluwarsa. |
| `403 Forbidden` | Peran pengguna (Role) tidak memiliki izin untuk rute terkait. |
| `404 Not Found` | Data atau berkas privat tidak ditemukan di pangkalan data/storage. |
| `409 Conflict` | Konflik status pada alur kerja (misal: transisi status ilegal atau duplikasi nomor). |
| `413 Payload Too Large` | Ukuran berkas unggahan melebihi batas (maksimum 10 MiB). |
| `422 Unprocessable Entity` | Data tidak dapat diproses (contoh: font PDF belum mendukung karakter tertentu). |

---

## 2. Matriks Peran Pengguna (RBAC)

Sistem menggunakan enum peran `Role` yang tersimpan pada tabel `UserRole`:

| Kode Role | Nama Peran | Hak Akses Utama |
|---|---|---|
| `SUPERADMIN` | Administrator Sistem | Akses penuh ke seluruh modul, konfigurasi master data CRUD, dan audit log. |
| `ADMIN_PENERBIT` | Penerbit / Pemohon | Portal Penerbit: membuat draft, upload naskah, submit pengajuan, konfirmasi billing. |
| `VERIFIKATOR` | Verifikator Berkas | Memeriksa berkas permohonan, menerbitkan billing PNBP, memverifikasi bukti bayar. |
| `DISTRIBUTOR` | Koordinator Distribusi | Membentuk penugasan tim sidang (SK), mengelola beban kerja, review hasil sidang. |
| `PENTASHIH` | Anggota Tim Sidang | Melakukan sidang pentashihan mushaf, mencatat koreksi lafazh, submit review. |
| `DOKUMENTATOR` | Dokumentator Hasil | Menyusun draf berita acara tashih, mencatat penyerahan eksemplar fisik master. |
| `KEPALA_LPMQ` | Kepala LPMQ | Menyetujui hasil verifikasi naskah, menandatangani Berita Acara & Surat Tanda Tashih. |

---

## 3. Modul Autentikasi (`/auth`)

### 3.1 Masuk Sistem (Login)
- **Rute**: `POST /api/v1/auth/login`
- **Akses**: Publik
- **Payload**:
  ```json
  {
    "email": "penerbit@mushafnusantara.com",
    "password": "Password123!"
  }
  ```
- **Respon Data**:
  ```json
  {
    "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
    "user": {
      "id": "uuid",
      "name": "PT Mushaf Nusantara",
      "email": "penerbit@mushafnusantara.com",
      "roles": ["ADMIN_PENERBIT"],
      "publisher": { "id": "uuid", "name": "PT Mushaf Nusantara" }
    }
  }
  ```

### 3.2 Pendaftaran Akun Penerbit Baru
- **Rute**: `POST /api/v1/auth/register-publisher`
- **Akses**: Publik
- **Payload**:
  ```json
  {
    "publisher_name": "Penerbit Al-Huda Prima",
    "email": "kontak@alhudaprima.id",
    "phone": "081234567890",
    "address": "Jl. Percetakan No. 45, Jakarta Pusat",
    "password": "Password123!"
  }
  ```

---

## 4. Modul Master Data (`/master`)

Modul master data menyediakan pembacaan publik/terotentikasi serta operasi pengelolaan penuh (**CRUD**) dengan proteksi role `SUPERADMIN`.

### 4.1 Kategori Mushaf (`/master/categories`)
- `GET /categories` — Daftar semua kategori aktif.
- `GET /categories/:id` — Detail kategori berdasarkan ID atau slug.
- `POST /categories` — Tambah kategori baru (`SUPERADMIN`).
  ```json
  {
    "name": "Mushaf Standar Indonesia Braille",
    "slug": "mushaf-standar-indonesia-braille",
    "description": "Mushaf Al-Qur'an khusus tunanetra dengan standar Braille Kemenag RI",
    "is_active": true
  }
  ```
- `PUT /categories/:id` — Perbarui kategori (`SUPERADMIN`).
- `DELETE /categories/:id` — Hapus kategori (`SUPERADMIN`).

### 4.2 Jenis Layanan & Tarif (`/master/service-types`)
- `GET /service-types` — Daftar profil layanan pentashihan aktif.
- `GET /service-types/:id` — Detail jenis layanan.
- `POST /service-types` — Tambah jenis layanan baru (`SUPERADMIN`).
  ```json
  {
    "code": "PRINT_30_JUZ",
    "name": "Pentashihan Mushaf Cetak 30 Juz",
    "base_fee": 1500000,
    "sla_days": 15,
    "is_active": true
  }
  ```
- `PUT /service-types/:id` — Perbarui jenis layanan (`SUPERADMIN`).
- `DELETE /service-types/:id` — Hapus jenis layanan (`SUPERADMIN`).

### 4.3 Layanan Tambahan / Addon (`/master/addons`)
- `GET /addons` — Daftar layanan tambahan aktif (misal: Terjemah, Tajwid Warna, Suplemen).
- `GET /addons/:id` — Detail addon.
- `POST /addons` — Tambah addon baru (`SUPERADMIN`).
  ```json
  {
    "code": "TAJWID_WARNA",
    "name": "Pentashihan Kaidah Tajwid Berwarna",
    "addon_fee": 500000,
    "additional_sla_days": 3,
    "is_active": true
  }
  ```
- `PUT /addons/:id` — Perbarui addon (`SUPERADMIN`).
- `DELETE /addons/:id` — Hapus addon (`SUPERADMIN`).

### 4.4 Tim Distribusi & SK (`/master/distribution-teams`)
- `GET /distribution-teams` — Daftar tim pentashihan aktif beserta SK dan daftar anggota pentashih.

### 4.5 Kalender Hari Kerja & SLA (`/master/working-days`)
- `PUT /master/working-days` (`SUPERADMIN`) — Menyinkronkan daftar hari kerja dan hari libur resmi nasional untuk kalkulasi SLA berbasis kalender kerja instansi.

---

## 5. Modul Registrasi & Pengelolaan Naskah (`/registrations`)

### 5.1 Alur Pengajuan
1. `POST /registrations` (`ADMIN_PENERBIT`): Membuat draf registrasi pengajuan baru (status awal: `DRAFT`).
2. `POST /uploads` (`ADMIN_PENERBIT`, `VERIFIKATOR`, `DOKUMENTATOR`): Mengunggah berkas biner naskah mentah (PDF/PNG/JPEG, batas 10 MiB). Menghasilkan `id` berkas privat.
3. `POST /registrations/:id/manuscripts`: Menautkan berkas privat yang telah diunggah ke pengajuan (`type`: `COVER`, `SURAH_SAMPEL`, `JUZ_LENGKAP`, dll).
4. `POST /registrations/:id/submit` (`ADMIN_PENERBIT`): Mengunci formulir dan mengirimkan pengajuan ke LPMQ (transisi dari `DRAFT` ke `READY_FOR_VERIFICATION`).

---

## 6. Alur Layanan SOP v2.2 (Siklus Hidup Pentashihan)

### Tahap 1: Verifikasi Berkas Permohonan
- **Aktor**: `VERIFIKATOR`, `KEPALA_LPMQ`
- **Alur Status**: `READY_FOR_VERIFICATION` → `VERIFICATION_ASSIGNED` → `IN_VERIFICATION` → `WAITING_VERIFICATION_APPROVAL` → `VERIFICATION_APPROVED` → `AWAITING_PAYMENT` (atau `REVISION_REQUIRED`). Assignment/Nota Dinas, persetujuan, dan pengiriman surat memerlukan aksi terpisah; endpoint khususnya dijadwalkan pada PR lanjutan.
- **Pemeriksaan**: Verifikator memeriksa kelengkapan administrasi dan keabsahan sampel naskah. Draf rekomendasi diteruskan ke Kepala LPMQ untuk persetujuan.

### Tahap 2: Billing & Pembayaran PNBP
- **Endpoint**:
  - `POST /registrations/:id/payments` (`VERIFIKATOR`): Menerbitkan kode billing pembayaran PNBP berstatus `UNPAID`. Tarif diambil secara deterministik dari `fee_sla_snapshot`.
  - `POST /payments/:id/confirm` (`ADMIN_PENERBIT`): Penerbit mengunggah bukti setor bank / NTPN. Status registrasi berpindah ke `PAYMENT_VERIFICATION`.
  - `PATCH /payments/:id/verify` (`VERIFIKATOR`): Verifikator memeriksa bukti bayar. Jika sah, catatan pembayaran menjadi `VERIFIED`; registrasi tetap `PAYMENT_VERIFICATION` sampai serah-terima master fisik dicatat. Penerimaan distributor kemudian memindahkan ke `WAITING_DISTRIBUTION`.

### Tahap 3: Distribusi Sidang & Penugasan Tim
- **Aktor**: `DISTRIBUTOR`
- **Endpoint**:
  - `POST /registrations/:id/assignments`: Membentuk penugasan anggota tim pentashih berdasarkan SK resmi. Menghitung tanggal tenggat (`due_at`) berbasis kalender kerja aktif.
  - Registrasi berpindah status ke `TASHIH_IN_PROGRESS`.

### Tahap 4: Sidang Pentashihan Naskah
- **Aktor**: `PENTASHIH`, `DISTRIBUTOR`
- **Endpoint**:
  - `POST /assignments/:id/review` (`PENTASHIH`): Mencatat telaah sidang (`PASSED`, `REVISION_REQUIRED`, atau `REJECTED`) beserta catatan koreksi lafazh/tanda baca.
  - `POST /registrations/:id/distribution-review` (`DISTRIBUTOR`): Distributor mengompilasi hasil telaah seluruh anggota tim:
    * Jika semua lulus → status beralih ke `READY_FOR_STT`.
    * Jika butuh perbaikan → status kembali ke penerbit (`REVISION_REQUIRED`).

### Tahap 5: Pengesahan Berita Acara & Surat Tanda Tashih (STT)
- **Aktor**: `DISTRIBUTOR`, `DOKUMENTATOR`, `KEPALA_LPMQ`
- **Endpoint**:
  - `POST /registrations/:id/official-documents`: Menghasilkan draf dokumen resmi (`BERITA_ACARA_TASHIH` atau `SURAT_TANDA_TASHIH`) dengan snapshot data terkunci.
  - `POST /official-documents/:id/sign` (`KEPALA_LPMQ`): Pengesahan digital dokumen oleh Kepala LPMQ. Status registrasi beralih ke `STT_ISSUED`.
  - `GET /official-documents/:id/pdf`: Mengunduh dokumen PDF resmi.
  - `GET /public/verify-document/:token`: Validasi keabsahan QR code STT secara publik.

### Tahap 6: Dokumentasi Master & Penyelesaian
- **Aktor**: `DOKUMENTATOR`
- **Alur Status**: `STT_ISSUED` → `DOCUMENTATION_IN_PROGRESS` → `COMPLETED`.
- Dokumentator memverifikasi serah terima eksemplar fisik mushaf yang telah dicetak untuk diarsipkan pada perpustakaan LPMQ.

---

## 7. Diagram Mesin Status (*State Machine*)

```mermaid
flowchart TD
    DRAFT([1. DRAFT]) -->|Penerbit Submit| READY_FOR_VERIFICATION([2. READY_FOR_VERIFICATION])
    READY_FOR_VERIFICATION -->|Kepala: Nota Dinas dan penugasan| VERIFICATION_ASSIGNED([VERIFICATION_ASSIGNED])
    VERIFICATION_ASSIGNED -->|Verifikator terpilih mulai| IN_VERIFICATION([3. IN_VERIFICATION])
    IN_VERIFICATION -->|Draf Surat Hasil| WAITING_VERIF_APP([4. WAITING_VERIFICATION_APPROVAL])
    WAITING_VERIF_APP -->|Persetujuan Kepala| VERIFICATION_APPROVED([VERIFICATION_APPROVED])
    VERIFICATION_APPROVED -->|Verifikator kirim surat| AWAITING_PAYMENT([5. AWAITING_PAYMENT])
    WAITING_VERIF_APP -->|Penolakan Kepala| IN_VERIFICATION
    IN_VERIFICATION -->|Berkas Kurang| REVISION_REQUIRED([REVISION_REQUIRED])
    REVISION_REQUIRED -->|Penerbit Resubmit| READY_FOR_VERIFICATION
    
    AWAITING_PAYMENT -->|Terbit Billing & Unggah Bukti| PAYMENT_VERIFICATION([6. PAYMENT_VERIFICATION])
    PAYMENT_VERIFICATION -->|Bayar terverifikasi dan master diserahkan| WAITING_DISTRIBUTOR_RECEIPT([WAITING_DISTRIBUTOR_RECEIPT])
    WAITING_DISTRIBUTOR_RECEIPT -->|Distributor terima fisik| WAITING_DISTRIBUTION([7. WAITING_DISTRIBUTION])
    
    WAITING_DISTRIBUTION -->|Penugasan Tim Sidang| TASHIH_IN_PROGRESS([8. TASHIH_IN_PROGRESS])
    TASHIH_IN_PROGRESS -->|Perbaikan Naskah| REVISION_REQUIRED
    TASHIH_IN_PROGRESS -->|Sidang Selesai Lulus| READY_FOR_STT([9. READY_FOR_STT])
    
    READY_FOR_STT -->|Pengesahan Kepala LPMQ| STT_ISSUED([10. STT_ISSUED])
    STT_ISSUED -->|Arsip Eksemplar Fisik| DOC_PROGRESS([11. DOCUMENTATION_IN_PROGRESS])
    DOC_PROGRESS -->|Selesai Seluruhnya| COMPLETED([12. COMPLETED])
```

---

## 8. Ringkasan Keamanan & Kepatuhan SOP

1. **Integritas Status Terpusat**: Seluruh transisi status registrasi dikawal oleh fungsi terpusat `transitionStatus()` dan diverifikasi terhadap `TRANSITION_POLICY`. Manipulasi status secara langsung ditolak pada layer service.
2. **Perlindungan Berkas Privat**: Berkas mushaf tidak diletakkan di direktori publik; pengaksesan melalui `/uploads/:id` mewajibkan otentikasi serta verifikasi kepemilikan naskah atau surat tugas pentashih yang aktif.
3. **Audit Trail Digital**: Seluruh mutasi data penting (pembuatan registrasi, pembayaran, penugasan sidang, dan penerbitan STT) dicatat otomatis pada tabel `AuditLog` dengan stempel waktu dan IP klien.
