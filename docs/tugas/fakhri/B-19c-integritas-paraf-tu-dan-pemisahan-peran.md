# B-19c: Pemisahan Peran & Penegakan Integritas Paraf Tata Usaha

- **ID Paket:** B-19c
- **Branch:** `feat/b19c-integritas-paraf-tu-dan-pemisahan-peran`
- **Basis:** `feat/b19b-pelepasan-penugasan-pentashih`
- **PIC:** Fakhri
- **Status:** **Selesai (Siap Reviu & Merge)**
- **Dependensi:** B-18 (Penetapan STT & Paraf TU), B-19a, B-19b
- **Versi Dokumen:** 1.0 (9 November 2026)

---

## 1. Latar Belakang & Celah Keamanan (Hasil Audit Pasca B-18)

Berdasarkan audit alur pengesahan Surat Tanda Tashih (STT) pasca implementasi B-18, ditemukan celah integritas dan kelemahan prinsip pemisahan wewenang (*segregation of duties* / *four-eyes principle*):

1. **Ketiadaan Validasi Identitas & Keunikan Pemaraf di `submitToTu`:**
   - Parameter `signer_1_id` dan `signer_2_id` diterima dari klien tanpa validasi role maupun keunikan.
   - Klien dapat menetapkan satu user yang sama untuk kedua slot paraf, atau bahkan menetapkan akun Kepala LPMQ sebagai pemaraf.
2. **Ketiadaan Penanda Penyerahan Draf ke TU:**
   - Endpoint paraf tidak memverifikasi apakah draf STT sudah diserahkan ke Tata Usaha (`submitted_at` / status `SUBMITTED_TO_TU`).
3. **Ketiadaan Penegakan Urutan & Keunikan di `parafDocument`:**
   - Paraf 2 dapat dibubuhkan mendahului Paraf 1.
   - User yang sama dapat membubuhkan Paraf 1 dan Paraf 2 sekaligus, meniadakan esensi kendali ganda (*dual control*).
   - Route `paraf-1` dan `paraf-2` masih mencantumkan peran `KEPALA_LPMQ`, padahal Kepala LPMQ hanya bertindak sebagai penandatangan definitif (*final signatory*).
4. **Pencocokan Identitas Pemanggil (*Caller Identity Matching*):**
   - Pemaraf yang memanggil endpoint paraf tidak diverifikasi kesesuaiannya dengan staf yang telah ditetapkan pada slot paraf bersangkutan (`signer_user_id`).
5. **Integritas Penandatanganan Akhir di `signDocument`:**
   - `signDocument` tidak memeriksa apakah akun Kepala LPMQ pernah membubuhi paraf pada draf tersebut (konflik kepentingan pemaraf sekaligus penandatangan).

---

## 2. Rincian Desain & Perubahan Teknis

### 2.1. Validasi Skema Zod
- `submitToTuSchema`:
  - Validasi UUID untuk `id`, `signer_1_id`, `signer_2_id`.
  - Refinement: `signer_1_id !== signer_2_id` (wajib dua staf berbeda).
- `parafDocumentSchema`:
  - Validasi UUID untuk `id` dan sanitasi `notes`.

### 2.2. Penguatan `submitToTu`
- Memastikan `signer_1_id` dan `signer_2_id` merupakan dua akun pengguna aktif yang berbeda.
- Memastikan kedua pemaraf memiliki kewenangan Tata Usaha (`ADMIN_INTERNAL` atau `SUPERADMIN`) dan **bukan** pemegang peran tunggal `KEPALA_LPMQ`.
- Menandai snapshot dokumen dengan `tu_workflow.status = 'SUBMITTED_TO_TU'` dan mencatat `submitted_at`.

### 2.3. Penguatan `parafDocument`
- Otorisasi route dan service: **Hapus `KEPALA_LPMQ`**. Hanya `ADMIN_INTERNAL` dan `SUPERADMIN`.
- Penegakan alur penyerahan: Wajib sudah disubmit ke TU (`snapshot.tu_workflow?.submitted_at`).
- Penegakan urutan (*sequential order*): Paraf 2 hanya dapat dibubuhkan jika Paraf 1 telah selesai.
- Penegakan kendali ganda (*segregation of duties*): Staf yang membubuhkan Paraf 2 dilarang merupakan user yang sama dengan pemaraf 1 (kecuali mode override emergency SUPERADMIN berizin khusus).
- Pencocokan identitas pemanggil: Memastikan ID pengguna pemanggil cocok dengan `signer_user_id` yang ditetapkan pada slot paraf bersangkutan.
- Idempotensi: Menolak pembubuhan paraf ulang jika slot paraf telah terisi.

### 2.4. Penguatan `signDocument` (Kepala LPMQ)
- Memverifikasi keberadaan dan keabsahan Paraf 1 dan Paraf 2.
- Memverifikasi bahwa pemaraf 1 dan pemaraf 2 adalah dua orang yang berbeda.
- Memverifikasi bahwa Kepala LPMQ yang menandatangani bukan merupakan salah satu dari pemaraf (larangan memaraf dan menandatangani sendiri).

---

## 3. Matriks Pengujian Unit & Keamanan

File tes: `backend/tests/unit/workflow-security-b19c.test.js`
- **B19C-01:** `submitToTu` menolak jika `signer_1_id` dan `signer_2_id` merujuk pada user yang sama atau memiliki role Kepala LPMQ.
- **B19C-02:** `submitToTu` berhasil mendaftarkan dua staf TU yang berbeda dan mencatat penyerahan `SUBMITTED_TO_TU`.
- **B19C-03:** `parafDocument` menolak eksekusi jika draf STT belum diserahkan ke TU (`submitted_at` tidak ada).
- **B19C-04:** `parafDocument` menolak pembubuhan Paraf 2 sebelum Paraf 1 diselesaikan (penegakan sekuensial).
- **B19C-05:** `parafDocument` menolak jika user yang sama mencoba membubuhkan Paraf 1 dan Paraf 2 (penegakan *dual-control*).
- **B19C-06:** `parafDocument` menolak staf TU yang bukan pemaraf yang ditetapkan untuk slot tersebut (*caller identity mismatch*).
- **B19C-07:** Route guard `paraf-1` dan `paraf-2` menolak akun dengan peran murni `KEPALA_LPMQ`.
- **B19C-08:** `signDocument` menolak tanda tangan jika pemaraf dan Kepala LPMQ adalah orang yang sama.
- **B19C-09:** Alur lengkap STT: submit ke TU $\rightarrow$ Paraf 1 (Staf TU A) $\rightarrow$ Paraf 2 (Staf TU B) $\rightarrow$ Tanda Tangan Definitif (Kepala LPMQ) berhasil 100%.

---

## 4. Kriteria Keberhasilan (*Definition of Done*)

- [x] Skema validasi Zod `submitToTuSchema` dan `parafDocumentSchema` aktif.
- [x] Larangan pemaraf ganda (`signer_1 === signer_2`) dan penolakan akun Kepala LPMQ di `submitToTu`.
- [x] Larangan paraf sebelum diserahkan ke TU ditegakkan di `parafDocument`.
- [x] Larangan Paraf 2 sebelum Paraf 1 (urutan sekuensial) ditegakkan.
- [x] Larangan satu staf membubuhkan Paraf 1 dan 2 (*four-eyes principle*) ditegakkan.
- [x] Pencocokan identitas pemaraf dengan `signer_user_id` ditegakkan.
- [x] Peran `KEPALA_LPMQ` dicabut dari route otorisasi paraf.
- [x] `signDocument` memverifikasi independensi penandatangan dari pemaraf.
- [x] Seluruh pengujian backend dan frontend lulus 100%.
- [x] `check:colors` frontend hijau tanpa pelanggaran token warna.
