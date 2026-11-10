# B-20: Penguatan Integritas Paraf Tata Usaha, Anti-Bypass, dan Kebersihan Kode

- **ID Paket:** B-20
- **Branch:** `feat/b20-penguatan-integritas-paraf-tu`
- **Basis:** `main` (commit `23cf217`)
- **PIC:** Fakhri
- **Status:** **Selesai (Siap Pengujian & Penggabungan)**
- **Dependensi:** B-18, B-19a, B-19b, B-19c
- **Versi Dokumen:** 1.0 (9 November 2026)

---

## 1. Latar Belakang & Celah Temuan Pasca B-19

Berdasarkan audit menyeluruh setelah penggabungan paket B-19 (a, b, c), teridentifikasi beberapa celah integritas dan kebersihan kode yang perlu dituntaskan pada alur paraf Tata Usaha dan penetapan Surat Tanda Tashih (STT):

1. **Celah Reset/Bypass `submitToTu` Berulang:**
   - Draf STT yang sudah diteruskan ke TU dapat disubmit ulang oleh klien selama berstatus `DRAFT`.
   - Hal ini menimpa snapshot `tu_workflow`, menghapus `paraf_1` yang telah dibubuhkan, dan membuka celah bypass prinsip dua pemaraf (*four-eyes principle*).
2. **Ketergantungan Fallback Akun Kepala LPMQ Hardcoded:**
   - Fallback `{ id: 'u-kepala', name: 'Dr. H. Abdul Aziz Sidqi, M.Ag.' }` memicu error *Foreign Key Constraint Fail* (500) di database MySQL jika akun tidak ada, dan menanam nama pejabat langsung di kode sumber.
3. **Pengecekan Status Aktif Salah Nama Kolom:**
   - Kode memeriksa `u.is_active === false`, padahal model `User` di Prisma menggunakan `status` (`ACTIVE`, `INACTIVE`, `SUSPENDED`). Akun non-aktif berpotensi lolos.
4. **Pengecualian SUPERADMIN dari Kendali Ganda:**
   - Satu akun SUPERADMIN saat ini dapat membubuhkan Paraf 1 dan Paraf 2 sekaligus, bertentangan dengan prinsip pemisahan wewenang mutlak.
5. **Penetapan Pemaraf Kaku (*Random Pick* vs *Pool-Based*):**
   - Tanpa input `signer_1_id` dan `signer_2_id`, sistem mengunci staf pertama di database, sehingga staf TU lain yang sedang bertugas/piket terkena error 403.
6. **Wewenang Pelepasan Penugasan Pentashih:**
   - Pelepasan penugasan saat ini terbuka untuk `ADMIN_INTERNAL` dengan alasan 5 karakter, padahal penugasan sidang merupakan domain distributor. Batasi ke `DISTRIBUTOR` dan `SUPERADMIN` dengan alasan minimal 10 karakter.
7. **Duplikasi Key Properti `include`:**
   - Pada baris 561-562 `distribution.service.js`, terdapat duplikasi `include: { reviews: true }` yang memicu peringatan linter `no-dupe-keys`.

---

## 2. Rincian Desain & Perubahan Teknis

### 2.1. Penguncian `submitToTu` (Anti-Bypass Paraf)
- Jika dokumen telah diserahkan ke TU (`snapshot.tu_workflow?.submitted_at` ada), atau jika `snapshot.tu_workflow?.paraf_1` telah terisi, tolak permintaan `submitToTu` berikutnya dengan `409 Conflict`:
  *"Dokumen draf STT sudah diserahkan ke Tata Usaha dan tidak dapat disubmit ulang."*

### 2.2. Eliminasi Fallback Hardcoded Kepala LPMQ
- Hapus `{ id: 'u-kepala', ... }`.
- Jika akun dengan peran `KEPALA_LPMQ` aktif tidak ditemukan di sistem, kembalikan `400 Bad Request` yang informatif:
  *"Akun Kepala LPMQ aktif tidak ditemukan pada sistem. Pastikan akun pimpinan telah dikonfigurasi."*

### 2.3. Koreksi Validasi Keaktifan Akun
- Ganti `u.is_active === false` menjadi `u.status !== 'ACTIVE'`.
- Tolak akun dengan status `INACTIVE` atau `SUSPENDED`.

### 2.4. Penegakan Mutlak Four-Eyes Principle
- Hapus bypass SUPERADMIN pada pengecekan Paraf 2:
  `if (order === 2 && snapshot.tu_workflow.paraf_1?.signed_by?.id === user.id)` $\rightarrow$ wajib tolak `409`, bahkan untuk SUPERADMIN.
- Pengesahan STT oleh Kepala LPMQ tetap melarang penandatanganan jika akun Kepala adalah pemaraf 1 atau pemaraf 2.

### 2.5. Fleksibilitas Penugasan Pemaraf (*Pool TU Mode*)
- Jika `signer_1_id` dan `signer_2_id` dikosongkan saat submit:
  - Paraf 1 dapat dibubuhkan oleh staf TU aktif mana pun (`ADMIN_INTERNAL` / `SUPERADMIN`), dan slot otomatis terikat ke user tersebut.
  - Paraf 2 dapat dibubuhkan oleh staf TU aktif lain mana pun (`ADMIN_INTERNAL` / `SUPERADMIN`) asalkan `user.id !== paraf_1.signed_by.id`.
- Jika `signer_1_id` dan/atau `signer_2_id` ditentukan secara spesifik:
  - Hanya staf yang terdaftar (atau pemegang role yang berwenang) yang dapat memaraf slot tersebut.

### 2.6. Pengetatan Pelepasan Penugasan & Pembersihan Kode
- Pada `revokeAssignment`, batasi otorisasi hanya untuk `DISTRIBUTOR` dan `SUPERADMIN` (`requireRole(user, ['DISTRIBUTOR', 'SUPERADMIN'])`).
- Pada `revokePentashihAssignmentSchema`, naikkan batas minimal karakter alasan dari 5 menjadi 10 karakter.
- Di `backend/src/services/distribution.service.js`, hapus baris duplikat `include: { reviews: true }` pada `assertReadyForSttEligibility`.

---

## 3. Matriks Pengujian Unit & Keamanan (`workflow-security-b20.test.js`)

- **B20-01:** `submitToTu` menolak (409) jika dokumen draf STT sudah diserahkan ke TU sebelumnya.
- **B20-02:** `submitToTu` menolak (400) secara elegan jika akun Kepala LPMQ aktif tidak ditemukan (tanpa FK error 500).
- **B20-03:** `submitToTu` menolak akun calon pemaraf yang berstatus `INACTIVE` atau `SUSPENDED` (`status !== 'ACTIVE'`).
- **B20-04:** `parafDocument` menolak akun SUPERADMIN membubuhkan Paraf 1 dan Paraf 2 sekaligus (penegakan *four-eyes* tanpa celah bypass).
- **B20-05:** Alur *pool TU*: saat penyerahan ke TU tanpa penetapan ID spesifik, staf TU A dapat membubuhkan Paraf 1, disusul staf TU B membubuhkan Paraf 2 secara lancar.
- **B20-06:** `revokeAssignment` menolak role `ADMIN_INTERNAL` dan menolak alasan pelepasan kurang dari 10 karakter.
- **B20-07:** Verifikasi pembersihan key duplikat di `distribution.service.js` dan integritas alur STT lengkap.

---

## 4. Kriteria Keberhasilan (*Definition of Done*)

- [x] Proteksi submit ulang `submitToTu` aktif dan menolak dengan 409 bila sudah diserahkan ke TU.
- [x] Fallback hardcoded Kepala LPMQ dihapus dan digantikan validasi error 400.
- [x] Pengecekan akun aktif diperbaiki menggunakan `status !== 'ACTIVE'`.
- [x] Pengecualian SUPERADMIN dari pembubuhan Paraf 1 & 2 dicabut (mutlak 2 orang berbeda).
- [x] Penugasan pemaraf fleksibel berbasis antrean staf TU aktif berjalan lancar.
- [x] Pelepasan penugasan dibatasi untuk Distributor dan Superadmin dengan alasan minimal 10 karakter.
- [x] Duplikasi properti `include` pada `distribution.service.js` dihapus bersih.
- [x] Seluruh pengujian unit dan integrasi lolos 100%.
- [x] `check:colors` frontend hijau tanpa pelanggaran.
