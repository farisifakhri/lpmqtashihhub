# Catatan Implementasi Teknis

**Sistem Manajemen Layanan Pentashihan Mushaf Al-Qur'an — LPMQ**
Status: Baseline Sprint 0 · Living document · Terakhir disinkronkan dengan SRS v2.1

> Bagian bertanda `[KEPUTUSAN TIM]` masih perlu disepakati tim sebelum
> sprint terkait dimulai. Bagian bertanda `[PERLU VALIDASI]` masih
> menunggu konfirmasi stakeholder LPMQ.

## 0. Catatan Konsistensi Dokumen (WAJIB DIBACA)

Proyek ini pernah mengalami drift antar-dokumen pada iterasi draft
sebelumnya (skema data kontradiktif, state machine di dokumen desain
tidak sinkron dengan state machine resmi, entitas hilang dari ERD).
Untuk mencegah ini terulang:

- **SRS v2.1 + ERD v2.1 + Backlog v2.1 adalah satu-satunya baseline
  yang sah.** Dokumen draft sebelum 8 September 2026 (SRS v1.0,
  Persiapan Implementasi v1/v2, Artefak Implementasi v1.0) adalah
  arsip riset — jangan diambil sebagai rujukan skema/state machine
  final, cukup sebagai konteks historis.
- Setiap kali SRS/ERD/Backlog direvisi, dokumen ini (`IMPLEMENTATION.md`)
  dan `DESIGN.md` **wajib diperbarui pada PR yang sama** — jangan
  dipisah jadi tugas terpisah yang bisa terlupa.
- Kalau menemukan pertentangan antara dokumen ini dan SRS terbaru,
  **SRS yang menang** — laporkan sebagai isu untuk sinkronisasi.

## 1. Prinsip Desain (Non-Negosiasi)

1. **Server is the source of truth.** Semua business rule (tarif
   PNBP, otorisasi, transisi status) divalidasi di backend. Client
   tidak pernah dipercaya begitu saja.
2. **No client-side auth.** Password tidak pernah dikirim mentah ke
   browser; verifikasi kredensial 100% di server.
3. **Least privilege by default.** Setiap endpoint punya daftar role
   yang boleh akses; default-nya deny.
4. **Audit everything that changes state.** Perubahan status
   pengajuan, tarif, pembayaran, penugasan, dan dokumen resmi selalu
   tercatat (aktor, waktu, before/after).
5. **Config over hardcode.** Tarif, addon, SLA, kalender kerja adalah
   master data berversi dengan `effective_date`, bukan angka di kode.
6. **Small modules.** Satu domain/fitur = satu folder backend dan satu
   folder frontend. Hindari file monolitik (pelajaran dari prototipe
   awal yang punya file >3.900 baris).
7. **Snapshot immutability.** Tarif dan SLA final pada satu pengajuan
   disimpan sebagai snapshot; perubahan master data tidak boleh
   mengubah transaksi lama (RF-CALC-03/04).

## 2. Keputusan Stack Teknis

| Layer | Keputusan | Status |
|---|---|---|
| Frontend | React + Vite + JSX (lihat `docs/adr/ADR-001-frontend-stack-react-vite.md`) | Final |
| State frontend | React Router + Context / Zustand | Final |
| Backend | Node.js + Express, kontrak OpenAPI | Final |
| Database | PostgreSQL | Final |
| ORM | Prisma | Final |
| Auth | Sesi (`express-session`) **atau** JWT + refresh token | **`[KEPUTUSAN TIM]`** — tutup sebelum Sprint 1, berdampak ke state persistence frontend dan strategi hosting (session butuh sticky session/shared store bila multi-instance) |
| File storage | S3-compatible / disk terenkripsi di server internal | Bergantung kepastian infrastruktur — lihat §7 |
| PDF generation | Server-side (Puppeteer/pdf-lib) | Final — jangan pernah client-side |
| Job queue | Job queue untuk email, notifikasi, PDF | **`[KEPUTUSAN TIM]`** — teknologi konkret (BullMQ/RabbitMQ) belum dipilih |
| Hosting | Infrastruktur resmi Kemenag/PDN | **`[PERLU VALIDASI]`** |

## 3. Model Data (ringkas, acuan: ERD v2.1)

Skema lengkap ada di `docs/diagrams/erd.png` (salinan ERD v2.1) dan
`backend/prisma/schema.prisma` (dibuat saat Sprint 0/1). Entitas inti:

- **Identitas & akses**: `users`, `roles`, `user_roles`
- **Penerbit**: `publishers`, `publisher_documents`
- **Master data**: `mushaf_categories`, `service_types` (17 jenis
  layanan + SLA resmi), `service_addons` (tarif addon terpisah dari
  SLA layanan — lihat catatan §9.3 SRS v2.1), `working_days`
- **Transaksi utama**: `registrations` (termasuk `previous_registration_id`
  untuk pengajuan perpanjangan), `registration_addons`,
  `manuscript_files`, `status_histories`
- **Verifikasi & distribusi**: `verification_assignments`,
  `distribution_teams`, `team_members`, `assignments`, `tashih_reviews`
- **Pembayaran**: `payment_records` (1:N terhadap registrasi, satu
  billing aktif — BR-06)
- **Dokumentasi & dokumen resmi**: `documentation_items`,
  `official_documents`, `document_signatories`
- **Operasional**: `notifications`, `audit_logs`

### 3.1 Dua jenis dokumen resmi — jangan disatukan jadi satu tanda tangan generik

Klarifikasi penting yang **belum sepenuhnya tercermin di ERD v2.1**:
ada dua dokumen resmi dengan otoritas penandatangan berbeda dan
harus dibedakan secara eksplisit di `official_documents.document_type`
atau dipecah entitasnya:

| Dokumen | Ditandatangani/ditetapkan oleh | Berisi |
|---|---|---|
| **Berita Acara Tashih** | Ketua kelompok tashih | Identitas naskah; rincian komponen, tarif, dan durasi pengerjaan; matriks distribusi dan progres tahapan kerja; catatan dan rekomendasi verifikator + TTD verifikator |
| **Surat Tanda Tashih** | Kepala LPMQ (atas rekomendasi tim, berdasarkan Berita Acara) | Penetapan resmi hasil tashih |

**Tindak lanjut wajib sebelum Sprint 5:**
- Perbaiki `document_type` enum di `official_documents` menjadi minimal
  `BERITA_ACARA` dan `SURAT_TANDA_TASHIH`, dengan FK
  `berita_acara_id` pada baris `SURAT_TANDA_TASHIH` (Surat tidak bisa
  ada tanpa Berita Acara yang mendasarinya).
- Berita Acara Tashih adalah **output sistem dari data yang sudah ada**
  (hasil kalkulasi, log distribusi, catatan verifikator) — bukan file
  yang diunggah penerbit. Item `INTERNAL_TASHIH_STATEMENT` yang saat
  ini tercantum sebagai syarat upload sebelum submit (RF-REG-05, BR-03
  di SRS v2.1) **perlu dikoreksi di SRS**: Berita Acara baru bisa
  dihasilkan setelah proses tashih selesai, bukan syarat di awal.
  Sampai SRS dikoreksi, treat sebagai known issue — jangan
  implementasikan literal sesuai teks SRS saat ini.
- `[PERLU VALIDASI]` jumlah halaman naskah yang diunggah penerbit:
  SRS v2.1 menulis "halaman 3 dan 4", hasil klarifikasi lapangan
  menyebut "halaman 1–5". Konfirmasi di rapat sosialisasi SOP sebelum
  mengunci field `manuscript_files` (apakah field tetap 2 slot atau
  rentang halaman).
- Mekanisme delegasi penandatanganan bila Kepala LPMQ berhalangan
  masih `[KEPUTUSAN TIM]` terbuka (SRS v2.1 Bab 16) — perlu solusi
  sebelum Sprint 5 karena ini titik kegagalan tunggal operasional.

## 4. State Machine Pengajuan (acuan: SRS v2.1 §6, Backlog sheet "Status & Transisi")

Status: `DRAFT → READY_FOR_VERIFICATION → IN_VERIFICATION →
[REVISION_REQUIRED ⇄ READY_FOR_VERIFICATION] → WAITING_DISTRIBUTION →
TASHIH_IN_PROGRESS → DOCUMENTATION → COMPLETED`, dengan `CANCELLED`
dapat dicapai dari `DRAFT`, `READY_FOR_VERIFICATION`, atau
`REVISION_REQUIRED`.

Implementasi **wajib**:
- Semua transisi lewat service/domain layer, bukan update bebas dari
  controller (prinsip §1.2).
- Transisi ilegal ditolak dengan HTTP 409 dan tidak menulis apa pun ke
  `status_histories`.
- Status pembayaran (`payment_records.status`) dan tahap tashih
  (`assignments.stage`: INITIAL/REVISION/DUMI) adalah state machine
  **terpisah** dari status pengajuan utama — jangan digabung jadi satu
  enum raksasa (pelajaran dari draft Artefak Implementasi v1.0 yang
  sempat punya 17 status tergabung).
- Pembatalan setelah billing/pembayaran (`BR-16`) belum ada aturan
  SOP — jangan implementasikan endpoint ini sampai kebijakan PNBP
  disahkan; sediakan placeholder yang menolak dengan pesan jelas.

## 5. Kontrak API (garis besar)

Prefix `/api/v1`. Response memakai `data`, `meta`, `errors`. Semua
waktu ISO 8601. Setiap endpoint di belakang
`authMiddleware → roleMiddleware(...) → controller`.

Tabel role↔endpoint lengkap adalah deliverable terpisah wajib sebelum
Sprint 1: `docs/access-matrix.md`.

Endpoint sensitif yang butuh perhatian ekstra:
- `GET /verify-documents/{token}` — publik, tanpa auth. Wajib token
  berentropi tinggi, rate limit ketat, dan **tidak** membocorkan file
  privat resolusi penuh tanpa kebijakan yang jelas (lihat SEC-03 di
  backlog, dan RNF-SEC-03 di SRS).
- `POST /official-documents/{id}/cancel` — bergantung pada penyelesaian
  `BR-16` di atas.

## 6. Checklist Keamanan Sebelum Rilis

- [ ] Tidak ada rule akses tanpa otorisasi eksplisit di level mana pun
      (pelajaran dari prototipe awal: `allow read, write: if true`)
- [ ] Password di-hash (bcrypt/argon2), tidak pernah dikembalikan di
      response API
- [ ] Rate limiting untuk endpoint login dan endpoint QR publik
- [ ] Reset password via token per-user, bukan PIN global
- [ ] Validasi role di server, bukan hanya disembunyikan di UI
- [ ] Data sensitif (NIP, kontak, tanda tangan) tidak ter-log tanpa
      perlu
- [ ] HTTPS wajib di semua environment termasuk staging
- [ ] Secrets tidak ikut ter-commit — pakai `.env` + secret manager
- [ ] Audit log aktif untuk seluruh perubahan state, master data,
      pembayaran, penugasan, dan dokumen resmi
- [ ] Backup basis data terjadwal dan diuji restore-nya
- [ ] Uji negatif IDOR lintas penerbit
- [ ] Uji enumeration/rate-limit khusus endpoint QR publik (SEC-03)

## 7. Pertanyaan Terbuka yang Memblokir Sprint Tertentu

| Pertanyaan | Memblokir | Status |
|---|---|---|
| Auth: session vs JWT | Sprint 1 | `[KEPUTUSAN TIM]` |
| Infrastruktur hosting resmi | Sprint 0 (deployment pipeline) | `[PERLU VALIDASI]` |
| Delegasi penandatangan Kepala LPMQ | Sprint 5 | `[KEPUTUSAN TIM]` — lihat §3.1 |
| Jumlah halaman naskah (3-4 vs 1-5) | Sprint 2 (REG-04) | `[PERLU VALIDASI]` — menunggu hasil rapat sosialisasi SOP |
| Kebijakan pembatalan pasca-billing (BR-16) | Sprint 3/6 | `[PERLU VALIDASI]` |
| Sumber SOP resmi final (dua domain berbeda) | Sprint 0/1 (seed master data) | `[PERLU VALIDASI]` |

## 8. Struktur Folder

Lihat `README.md` §Struktur Direktori. Prinsip: satu fitur = satu
folder (`features/xxx`), tidak ada file gado-gado.

## 9. Definition of Done (acuan: Backlog sheet "DoR & DoD")

- Implementasi lulus code review dan automated test.
- Unit/integration test relevan lulus, termasuk permission negatif dan
  transisi status ilegal.
- Acceptance criteria tervalidasi di staging.
- Audit log dan notifikasi relevan berfungsi.
- Dokumentasi API/migration diperbarui.
- Tidak ada defect kritis/tinggi terbuka.

## 10. Strategi Pengujian

| Jenis | Fokus |
|---|---|
| Unit | State transition, snapshot tarif/SLA, billing aktif tunggal, iterasi tahap |
| Integration | AuthN/AuthZ, database, file, audit, versioning dokumen |
| Security | IDOR lintas penerbit, upload berbahaya, rate limit, **enumeration endpoint QR** |
| E2E | Jalur input admin, jalur portal penerbit, jalur revisi, jalur selesai |
| UAT | Bersama perwakilan setiap role (admin, verifikator, distributor, pentashih, ketua kelompok, dokumentator, penerbit) |

Catatan khusus: `REG-07` (pengajuan perpanjangan, Sprint 2) tidak bisa
diuji end-to-end penuh sampai `DOC-07/DOC-08` (Sprint 5) selesai,
karena butuh dokumen resmi yang sudah terbit sebagai rujukan. Gunakan
data dummy `official_documents` untuk pengujian di Sprint 2, dan catat
ini eksplisit di test plan supaya tidak jadi kejutan saat sprint
review.