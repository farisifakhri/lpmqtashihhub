# Hasil Investigasi Badge Antrian Sidebar (Tahap A)

## Cakupan dan temuan dasar

Investigasi Tahap A mencakup alur antrean, status dan relasi Prisma, role aktif, menu sidebar, endpoint list, filter/scoping, serta indeks yang relevan. Nama file laporan ini belum ada saat diperiksa; selama Tahap A tidak ada kode aplikasi atau dokumen acuan yang diubah.

Klarifikasi user yang diterima selama investigasi:

- Verifikasi pendaftaran penerbit dimiliki `ADMIN_INTERNAL` dan `SUPERADMIN`.
- Penugasan verifikator dimiliki `ADMIN_INTERNAL` dan `SUPERADMIN`.
- Antrean pembayaran hanya dihitung untuk registrasi yang ditugaskan kepada verifikator aktif; `SUPERADMIN` hanya memantau dan tidak mendapat badge/notifikasi antrean pembayaran.
- Untuk Kepala, badge hanya ada pada “Persetujuan Verifikasi” dan “Tanda Tangan”. Tab tanda tangan yang menjadi dasar adalah `NEED_MY_SIGN` / “Menunggu konfirmasi internal Anda”.
- Count harus mencakup semua baris yang sesuai, bukan hanya baris pada halaman paginasi.
- Intake Master Fisik menghitung item siap intake yang master fisiknya belum diterima serta revisi intake awal dengan `revision_source = PHYSICAL_MASTER`; revisi serah-terima distributor (`PHYSICAL_HANDOVER`) tidak dihitung pada menu tersebut. Bila satu item sidebar penerbit menampilkan kedua jenis revisi sebagai pekerjaan penerbit, hitung gabungan di item itu dan jangan menghitung revisi yang tidak ditampilkan oleh item lain.
- Role `PENANDATANGAN` tidak mempunyai item sidebar, tidak mendapat entri `queue.config.js`, endpoint counts mengembalikan `{}`, dan tidak dibuatkan menu baru.
- Role aktif akan dikirim melalui header dan diverifikasi server terhadap role user; token autentikasi tetap diambil frontend dari localStorage.

Klarifikasi tersebut dipakai sebagai keputusan untuk tabel di bawah; konflik dokumen yang belum diselaraskan tetap dicatat.

### Role dan mekanisme role aktif

- Enum database `RoleCode`: `SUPERADMIN`, `ADMIN_INTERNAL`, `PENERBIT`, `VERIFIKATOR`, `DISTRIBUTOR`, `PENTASHIH`, `DOKUMENTATOR`, `KEPALA_LPMQ`, `PENANDATANGAN`. Jadi delapan role pada rencana memang nilai enum, tetapi `PENANDATANGAN` adalah nilai tambahan yang tidak tercantum di daftar rencana.
- Label UI mengonfirmasi `SUPERADMIN` = “Superadmin” dan `ADMIN_INTERNAL` = “Helper Admin”. `DISTRIBUTOR` ditampilkan sebagai “Distributor”; nama tersebut tidak sama persis dengan “Koordinator Distribusi” dalam rencana, tetapi mapping ke role database sudah dikonfirmasi user.
- Alias seperti `PUBLISHER`, `VERIFICATOR`, `HEAD_OF_LPMQ`, `TASHIH_MEMBER`, dan `DOCUMENTATOR` muncul sebagai kompatibilitas di UI, bukan nilai enum role utama.
- Role aktif disimpan di frontend (`localStorage`, key `lpmq_active_role`). Pergantian role tidak menerbitkan token baru. Tahap B menggunakan header `X-Active-Role` yang diverifikasi server terhadap role user; token autentikasi tetap dibaca frontend dari localStorage.
- Backend membangun `req.user.roles` dari role pengguna di database. Middleware RBAC memeriksa kumpulan role tersebut, bukan role aktif; `SUPERADMIN` juga memiliki bypass pada middleware. Jadi “badge hanya untuk role aktif” pada rencana adalah batas tampilan/count baru, bukan pengganti otorisasi server.
- Sebelum Tahap B, sidebar tidak sepenuhnya bergantung pada role aktif: beberapa cabang memakai `roles.includes(...)`, dan `isSuperAdmin` dapat mengubah menu yang dipilih meskipun role aktif lain. Tahap B mengubah cabang menu untuk memakai role aktif.

### Status/tahap dalam schema yang relevan

- `RegistrationStatus`: `DRAFT`, `READY_FOR_VERIFICATION`, `VERIFICATION_ASSIGNED`, `IN_VERIFICATION`, `REVISION_REQUIRED`, `WAITING_VERIFICATION_APPROVAL`, `VERIFICATION_APPROVED`, `AWAITING_PAYMENT`, `PAYMENT_VERIFICATION`, `WAITING_DISTRIBUTOR_RECEIPT`, `WAITING_DISTRIBUTION`, `TASHIH_IN_PROGRESS`, `READY_FOR_STT`, `STT_ISSUED`, `DOCUMENTATION_IN_PROGRESS`, `COMPLETED`, `CANCELLED`, `PHYSICAL_HANDOVER_CORRECTION_REQUIRED`.
- `PublisherRegistrationStatus`: `DIAJUKAN`, `PERLU_PERBAIKAN`, `DISETUJUI`, `DITOLAK`.
- `VerificationAssignmentStatus`: `ASSIGNED`, `IN_PROGRESS`, `WAITING_APPROVAL`, `WAITING_SIGNATURE`, `READY_TO_SEND`, `COMPLETED`, `REVOKED`.
- `VerificationDocumentStatus`: `DRAFT`, `SUBMITTED`, `RETURNED`, `APPROVED`, `SIGNING`, `SIGNED`, `EMAIL_QUEUED`, `SENT`, `EMAIL_FAILED`, `REVOKED`, `ISSUED`; status tanda tangan `SigningStatus`: `PENDING`, `SIGNED`, `REJECTED`.
- `PaymentStatus`: `UNPAID`, `PAID`, `VERIFIED`, `EXPIRED`, `CANCELLED`; `PhysicalMasterIntakeStatus` dan `PhysicalHandoverStatus`: masing-masing `PENDING`, `RECEIVED`, `RETURNED`.
- `AssignmentStatus`: `ASSIGNED`, `IN_PROGRESS`, `COMPLETED`, `OVERDUE`; `AssignmentStage`: `INITIAL`, `REVISION`, `DUMMY`.
- `DocumentationStatus`: `PENDING`, `RECEIVED`, `WAIVED`, `NOT_APPLICABLE`; `OfficialDocumentStatus`: `DRAFT`, `SIGNED`, `ISSUED`, `REVOKED`, `EXPIRED`.
- Kolom kepemilikan yang terlihat meliputi `Registration.publisher_id`, `core_verifier_id`, `core_distributor_id`, `core_documenter_id`; `VerificationAssignment.verifier_id`; `Assignment.assignee_id`; `PhysicalManuscriptHandover.to_user_id`/`from_user_id`; dan signer pada model signatory.

## Tabel antrean per item sidebar

`/api/v1` adalah prefix API yang berjalan. Key role `ADMIN_INTERNAL`/`SUPERADMIN` sudah diterapkan pada Tahap B; key role lainnya tetap usulan untuk tahap berikutnya. `jelas` berarti filter tujuan dapat diidentifikasi, bukan berarti seluruh masalah implementasinya sudah diperbaiki.

| role (nilai DB) | item sidebar | halaman | tab/sub-tab tujuan | key usulan | endpoint list | filter (status + scoping user) | file terkait | status |
|---|---|---|---|---|---|---|---|---|
| `ADMIN_INTERNAL`, `SUPERADMIN` | 1. Pendaftaran Penerbit | `/internal/publishers` → `PublisherVerificationPage` | Menunggu Verifikasi (`DIAJUKAN`) | `publisher_registration_pending` | `GET /api/v1/admin/publisher-registrations?status=DIAJUKAN` | Kedua role ditetapkan sebagai pemilik antrean berdasarkan klarifikasi user dan kontrak API; tidak di-scope per user. List dan count memakai `buildAdminPublisherRegistrationWhere()` yang sama. | `Sidebar.jsx`, `PublisherVerificationPage.jsx`, `publisher-registration.routes.js`, `publisher-registration.service.js`, `queue-filters.js`, `KONTRAK_PENDAFTARAN_PENERBIT.md` | Tahap B |
| `ADMIN_INTERNAL`, `SUPERADMIN` | 2. Intake Master Fisik | `/internal/master-intake` → `AdminMasterIntakePage` | Item belum diterima di loket; revisi intake awal (`PHYSICAL_MASTER`) | `master_intake_pending` | `GET /api/v1/registrations?segment=MASTER_INTAKE` | Hitung seluruh `READY_FOR_VERIFICATION` dengan intake kosong/bukan `RECEIVED`, ditambah `REVISION_REQUIRED` dengan `revision_source = PHYSICAL_MASTER` dan intake `RETURNED`. Revisi serah-terima distributor `PHYSICAL_HANDOVER` tidak masuk menu ini. List dan count memakai `buildMasterIntakeQueueWhere()` yang sama; list memberi paginasi, count memakai semua baris. | `Sidebar.jsx`, `AdminMasterIntakePage.jsx`, `registration.api.js`, `registration.routes.js`, `registration.service.js`, `queue-filters.js`, `schema.prisma` | Tahap B |
| `PENERBIT` | Permohonan Saya | `/publisher/registrations?view=actions` → `PublisherRegistrationsPage` | Daftar revisi; definisi badge menghitung kedua status revisi, bukan seluruh segmen `PUBLISHER_ACTIONS` | `publisher_revision_pending` | `GET /api/v1/registrations?segment=PUBLISHER_ACTIONS` (endpoint list tetap; badge memakai filter status khusus) | `Registration.status IN (REVISION_REQUIRED, PHYSICAL_HANDOVER_CORRECTION_REQUIRED)`; scope count wajib `publisher_id` dari user login. Tidak menghitung `DRAFT` atau `AWAITING_PAYMENT`. Count mencakup seluruh baris. Tidak ada filter server tunggal yang sama persis: segmen `PUBLISHER_ACTIONS` meliputi DRAFT/AWAITING_PAYMENT dan semua sumber `REVISION_REQUIRED`, sehingga tidak dapat digunakan mentah sebagai definisi badge. Tab “Perlu Tindakan” juga mencakup segmen yang lebih luas dari definisi badge. | `Sidebar.jsx`, `PublisherRegistrationsPage.jsx`, `publisher-status.js`, `registration.service.js`, `queue-utils.js`, `verification-intake.service.js`, `handover.service.js`, `verification-review.service.js`, `distribution.service.js`, `auth.service.js`, `auth.middleware.js`, `schema.prisma` | Tahap D |
| `PENERBIT` | Tagihan | `/publisher/billing?tab=UNPAID` → `PublisherBillingPage` | Tab `UNPAID` / “Menunggu Bayar” | `publisher_billing_unpaid` | `GET /api/v1/payments?status=UNPAID` | `PaymentRecord.status = UNPAID`; untuk penerbit biasa list membatasi `registration.publisher_id = user.publisherId`. Count memakai cakupan publisher yang sama dan menghitung semua tagihan. `EXPIRED` tidak masuk tab; status yang masih `UNPAID` tetap masuk walau `expires_at` sudah lewat. Kartu ringkas “Menunggu Bayar” hanya menghitung array pembayaran di halaman yang termuat (limit 20), bukan total. | `Sidebar.jsx`, `PublisherBillingPage.jsx`, `payment.api.js`, `payment.service.js`, `auth.service.js`, `auth.middleware.js`, `schema.prisma` | Tahap D |
| `ADMIN_INTERNAL`, `SUPERADMIN` | 3. Penugasan Verifikator | `/internal/verifications?tab=NEED_ASSIGNMENT` → `VerifikatorInboxPage` | Perlu Penugasan → Belum Ditugaskan | `verification_assignment_pending` | `GET /api/v1/verification-assignment-candidates` (alias server: `/api/v1/verification/unassigned-registrations`) | `Registration.status = READY_FOR_VERIFICATION`, intake `RECEIVED` dengan `receipt_no` terisi, dan tidak ada assignment aktif (`ASSIGNED`, `IN_PROGRESS`, `WAITING_APPROVAL`, `WAITING_SIGNATURE`, `READY_TO_SEND`). Tidak di-scope per user. List dan count memakai `buildUnassignedVerificationWhere()` yang sama. | `Sidebar.jsx`, `VerifikatorInboxPage.jsx`, `verification.api.js`, `verification.routes.js`, `verification-intake.service.js`, `queue-filters.js`, `schema.prisma` | Tahap B |
| `VERIFIKATOR` | Tugas Verifikasi | `/internal/verifications` → `VerifikatorInboxPage` | Tab default `ASSIGNED` | `verification_assigned` | `GET /api/v1/verification-assignments?status=ASSIGNED` | `VerificationAssignment.status = ASSIGNED`; list service memakai `verifier_id = user.id` untuk verifikator biasa. Dalam akun multi-role yang juga memiliki role admin, service dapat memakai cakupan admin/global. | `Sidebar.jsx`, `VerifikatorInboxPage.jsx`, `verification.api.js`, `verification.routes.js`, `verification-intake.service.js`, `schema.prisma` | jelas |
| `VERIFIKATOR` | Tanda Tangan Saya | `/internal/signatures` | `NEED_MY_SIGN` / “Menunggu konfirmasi internal Anda” (tab default) | `verification_signature_pending` | Gabungan `GET /api/v1/verification-assignments` dan registrasi `READY_FOR_STT`/`STT_ISSUED`; halaman tidak memiliki satu endpoint list tab khusus. | Hitung semua dokumen pada tab yang dapat ditandatangani user saat ini: signatory user berstatus `PENDING`, prasyarat urutan tanda tangan terpenuhi, dan dokumen belum selesai. Role verifikator hanya melihat penandatanganan yang ditugaskan kepadanya. Query halaman saat ini membatasi sumber dengan `limit=50` (dan STT issued `limit=20`), sehingga implementasi badge harus mengambil total penuh, tidak meniru batas tersebut. | `Sidebar.jsx`, `SignatureCenterPage.jsx`, `verification.api.js`, `schema.prisma` | **tidak dikerjakan: bukan antrean verifikator** |
| `VERIFIKATOR` | Siap Dikirim | `/internal/verifications?tab=READY_TO_SEND` → `VerifikatorInboxPage` | `READY_TO_SEND` | `verification_ready_to_send` | `GET /api/v1/verification-assignments?status=READY_TO_SEND` | `VerificationAssignment.status = READY_TO_SEND`; data milik verifikator ditentukan oleh `verifier_id = user.id` saat bukan admin. | `Sidebar.jsx`, `VerifikatorInboxPage.jsx`, `verification.api.js`, `verification.routes.js`, `verification-intake.service.js`, `schema.prisma` | jelas |
| `VERIFIKATOR` | Verifikasi Pembayaran | `/internal/payments` → `InternalPaymentQueuePage` | Default `PAID` / “Perlu Verifikasi” | `payment_verification_pending` | `GET /api/v1/payments?status=PAID` | Definisi badge sesuai klarifikasi: `PaymentRecord.status = PAID` yang registrasinya ditugaskan ke verifikator aktif (`VerificationAssignment.verifier_id = user.id`), serta masih memenuhi prasyarat aksi. Filter list yang berjalan hanya memfilter `PAID` dan tidak melakukan scoping assignment; perlu disejajarkan saat implementasi. Count mencakup semua baris. | `Sidebar.jsx`, `InternalPaymentQueuePage.jsx`, `payment.api.js`, `workflow.routes.js`, `payment.service.js`, `verification-intake.service.js`, `schema.prisma` | jelas |
| `VERIFIKATOR` | Siap Serah Terima | `/internal/verifications?tab=BAST_READY` → `VerifikatorInboxPage` | `BAST_READY` | `verifier_handover_ready` | `GET /api/v1/verification-assignments?handover_ready=true` | Service memilih assignment selesai dengan kondisi registrasi/pembayaran yang memenuhi kesiapan serah-terima; saat verifikator biasa, assignment harus milik `verifier_id = user.id`. | `Sidebar.jsx`, `VerifikatorInboxPage.jsx`, `verification.api.js`, `verification.routes.js`, `verification-intake.service.js`, `schema.prisma` | jelas |
| `KEPALA_LPMQ` | Persetujuan Verifikasi | `/internal/verifications?tab=WAITING_APPROVAL` → `VerifikatorInboxPage` | `WAITING_APPROVAL` | `verification_approval_pending` | `GET /api/v1/verification-assignments?registration_status=WAITING_VERIFICATION_APPROVAL` | `VerificationAssignment` pada registrasi berstatus `WAITING_VERIFICATION_APPROVAL`; pakai builder list `buildVerificationAssignmentWhere()` yang sama. Antrean role-based, tidak di-scope per user. | `Sidebar.jsx`, `VerifikatorInboxPage.jsx`, `verification.api.js`, `verification.routes.js`, `verification-intake.service.js`, `queue-filters.js`, `schema.prisma` | Tahap F |
| `KEPALA_LPMQ` | Tanda Tangan | `/internal/signatures` | `NEED_MY_SIGN` / “Menunggu konfirmasi internal Anda” (tab default) | `head_signature_pending` | Gabungan dokumen dari `GET /api/v1/verification-assignments` dan registrasi `READY_FOR_STT`/`STT_ISSUED`; halaman tidak memiliki satu endpoint list tab khusus. | Jumlahkan `VerificationDocument` bertipe surat hasil/berita acara dengan status `APPROVED`/`SIGNING` yang memiliki signatory eksplisit milik `user.id`, berstatus `PENDING`, dan sudah tiba gilirannya (urutan 1 atau urutan 2 setelah urutan 1 `SIGNED`), serta `OfficialDocument` STT status `DRAFT` dengan signatory Kepala `PENDING` dan kedua paraf TU tersimpan. Untuk akun yang juga `SUPERADMIN`, STT mengikuti kemampuan UI untuk menandatangani slot Kepala yang tertunda meski ditugaskan ke user lain, hanya saat role aktif Kepala. Tidak memakai fallback signatory atau status dokumen. Count tidak terpotong limit list 50/20. | `Sidebar.jsx`, `SignatureCenterPage.jsx`, `verification.api.js`, `documentation.api.js`, `verification-intake.service.js`, `verification-signing.service.js`, `official-document.service.js`, `queue-filters.js`, `schema.prisma` | Tahap F |
| `DISTRIBUTOR` | Master Menunggu Diterima | `/internal/distributions/handover` → halaman distribusi/serah-terima | Tahap `HANDOVER`, tab `PENDING` | `distribution_handover_pending` | `GET /api/v1/physical-master/handovers?status=PENDING` | `PhysicalManuscriptHandover.status = PENDING`; scope penerima `to_user_id = user.id`. Count memakai `buildHandoverWhere()` yang sama dengan list, dengan scope role Distributor aktif agar akun multi-role `DISTRIBUTOR` + `SUPERADMIN` tidak menghitung global. | `Sidebar.jsx`, `DistributorHandoverInboxPage.jsx`, `handover.api.js`, `handover.routes.js`, `handover.service.js`, `queue.config.js`, `queue-filters.js`, `schema.prisma` | Tahap G |
| `DISTRIBUTOR` | Distribusi Tim | `/internal/distributions/assignment` → halaman distribusi/serah-terima | Tahap `ASSIGNMENT` / `MONITORING`, registrasi `WAITING_DISTRIBUTION` | `distribution_team_pending` | `GET /api/v1/registrations?status=WAITING_DISTRIBUTION` | `Registration.status = WAITING_DISTRIBUTION`; scope `core_distributor_id = user.id`. Count memakai `buildRegistrationScopeWhere()` dengan role Distributor aktif. Akun multi-role `DISTRIBUTOR` + `SUPERADMIN` dapat melihat list lebih luas, sementara badge tetap scoped ke Distributor aktif (discrepancy yang diterima user). | `Sidebar.jsx`, `DistributorHandoverInboxPage.jsx`, `useDistributionQueues.js`, `registration.api.js`, `registration.service.js`, `queue.config.js`, `schema.prisma` | Tahap G |
| `PENTASHIH` | Tugas Saya | `/internal/tashih` | Default `ACTIVE`; UI memisahkan tahap awal dan revisi/dumi secara lokal | `tashih_active` | `GET /api/v1/assignments/my-tasks?status=ACTIVE` | Hitung semua halaman assignment milik `assignee_id = user.id` dengan status `ASSIGNED`, `IN_PROGRESS`, atau `OVERDUE` dan `reviews: { none: {} }`. Ini gabungan tugas sidang awal serta revisi/dumi yang UI tampilkan sebagai belum ditelaah; status selesai dan assignment yang sudah memiliki review dikecualikan. Filter dasar assignee/status dibagi dengan builder list; syarat tanpa review merepresentasikan pengecualian UI. Role aktif `PENTASHIH` saja. | `Sidebar.jsx`, `PentashihWorkspacePage.jsx`, `distribution.service.js`, `queue-filters.js`, `schema.prisma` | Tahap E |

### Role/menu yang bukan antrean

- `PENERBIT`: atas klarifikasi user, “Permohonan Saya” menghitung revisi verifikasi dan revisi serah-terima fisik secara gabungan, dengan scope penerbit pemilik. Perbedaan implementasi: item sidebar saat ini membuka view `ALL`, sedangkan daftar filter “Perlu perbaikan” memilih `REVISION_REQUIRED` saja; segmen “Perlu Tindakan” mencakup status tambahan DRAFT/AWAITING_PAYMENT dan koreksi serah-terima fisik. Saat implementasi, filter count revisi harus didefinisikan secara eksplisit, tidak menggunakan hitungan mentah segmen. “Beranda”, pendaftaran baru, dan arsip bukan antrean badge berdasarkan tabel.
- `DOKUMENTATOR`: “Arsip Dokumen” dan “Dokumen Tashih” tidak membuka filter pending secara default. Halaman Dokumen Tashih memakai daftar/tab umum; tab pending yang tidak dibuka oleh item sidebar tidak dihitung.
- `ADMIN_INTERNAL`: selain pendaftaran penerbit, intake, dan penugasan verifikator yang dipastikan user, item verifikasi, hasil verifikasi, pembayaran, distribusi, pentashihan, STT, dan arsip bukan antrean milik role ini berdasarkan alur tindakan yang ditemukan. Item “Pembayaran PNBP” yang tetap tampil juga ditolak oleh service list untuk akun `ADMIN_INTERNAL` saja.
- `SUPERADMIN`: item 1–3 mengikuti baris tabel. “Pembayaran PNBP” hanya untuk pemantauan, tidak mendapat badge/notifikasi antrean. “Verifikasi Berkas”, “Hasil Verifikasi”, “Distribusi Sidang”, tugas pentashihan, STT, dan arsip tidak otomatis dihitung hanya karena Superadmin melihat menu atau middleware memberi akses umum: halaman/aksi memiliki pemilik role/tahap yang berbeda.
- `KEPALA_LPMQ`: “Penetapan STT” bukan antrean badge menurut klarifikasi; badge Kepala hanya pada “Persetujuan Verifikasi” dan “Tanda Tangan”.
- `DISTRIBUTOR`: user mengonfirmasi “Master Menunggu Diterima” menghitung handover `PENDING` untuk `to_user_id = user.id` dan “Distribusi Tim” menghitung registrasi `WAITING_DISTRIBUTION` untuk `core_distributor_id = user.id`. Badge memakai scope Distributor aktif, termasuk akun `DISTRIBUTOR` + `SUPERADMIN`; list multi-role dapat lebih luas dan discrepancy itu diterima. Rekomendasi indeks untuk Tahap I diperbarui menjadi `[to_user_id, status]` karena list dan count saat ini tidak memfilter `stage`. Tidak ada perubahan schema/migrasi di Tahap G.
- Semua role: “Kendali Operasional”/dashboard dan “Arsip Dokumen” tidak dianggap antrean sidebar karena membuka ringkasan/riwayat, bukan satu filter tindakan yang terdefinisi.
- Sebelum Tahap B, `Sidebar.jsx` menampilkan badge statis “Loket” pada Intake dan angka `1` pada beberapa menu. Tahap B menghapus “Loket” dan angka statis pada item admin yang kini memakai endpoint counts; badge statis pada item role tahap berikutnya masih perlu diganti saat tahapnya dikerjakan.

### Role tanpa menu sidebar: `PENANDATANGAN`

| Pemeriksaan | Hasil |
|---|---|
| Seed/data | `backend/prisma/seed.js` mendaftarkan delapan role staf/penerbit tetapi tidak memasukkan `PENANDATANGAN` dalam `rolesData` dan tidak ada user seed dengan role tersebut. Pencarian seluruh repo juga tidak menemukan fixture/data terkomit yang menetapkan user ke role ini. Database runtime tidak diperiksa, jadi keberadaan akun aktual di luar data repo tidak dapat dipastikan. |
| Migrasi | Satu-satunya kecocokan migrasi adalah `backend/prisma/migrations/20261022064603_add_publisher_fields_and_manuscripts/migration.sql`, yang memperluas enum kolom `roles.code` agar mencakup `PENANDATANGAN`; migrasi ini tidak membuat role row atau user assignment. |
| Route, halaman, redirect | Tidak ditemukan route atau halaman khusus role `PENANDATANGAN`. Setelah login non-penerbit, `LoginPage` mengarahkan ke `/internal`; halaman tersebut menggunakan `InternalDashboard` tanpa redirect khusus role. Tidak ada `allowedRoles` `PENANDATANGAN` pada route tanda tangan `/internal/signatures`. Sebelum Tahap B, role tak dikenal jatuh ke nav default Superadmin; Tahap B mengubah fallback agar role tanpa menu eksplisit tidak mendapat item sidebar. |
| Antrean tanda tangan saat ini | Ditampilkan di `VERIFIKATOR` pada item sidebar “Tanda Tangan Saya” dan `KEPALA_LPMQ` pada item “Tanda Tangan”. Kedua item membuka `/internal/signatures`; badge dipasang pada dua item ini, berdasarkan tab `NEED_MY_SIGN` / “Menunggu konfirmasi internal Anda”, bukan pada `PENANDATANGAN`. `SUPERADMIN` tidak memiliki item sidebar tanda tangan tersendiri. |
| Dokumen acuan | `docs/architecture/design.md`, §3 “Modul domain” → “Identity & Access”, mencantumkan `PENANDATANGAN` dalam daftar role. `docs/tugas/README.md`, §4 “Aturan branch dan PR”, menyebut nilai tersebut sebagai kode role backend dan mengarahkan ke `backend/prisma/schema.prisma`. |
| Keputusan fitur | Tidak ada item sidebar, tidak ada entri `queue.config.js`, tanpa menu baru; endpoint counts untuk role aktif `PENANDATANGAN` mengembalikan `{}`. |

## Dokumen acuan yang dibaca

- `docs/Fitur/notif-antrean.md` — batas Tahap A, tabel yang diminta, aturan multi-role dan rancangan endpoint.
- `docs/MASTER_PLAN.md` — urutan fase serta gambaran role dan alur produk.
- `docs/architecture/design.md` dan `docs/architecture/implementation.md` — arsitektur, status yang dijalankan, dan batas implementasi.
- `docs/architecture/user-flows.md` — alur tindakan per role, termasuk intake, penugasan, verifikasi, distribusi, pentashihan, dan penandatanganan.
- `docs/architecture/pengajuan-naskah-varian.md` — variasi alur pendaftaran/status.
- `docs/api/workflow.md` — kontrak alur endpoint dan status, serta role pemilik tindakan.
- `docs/api/KONTRAK_PENDAFTARAN_PENERBIT.md` — kontrak beku akses dan keputusan pendaftaran penerbit.
- `docs/publisher-dashboard.md` — segmen tindakan penerbit dan status yang ditampilkan.
- `docs/references/keputusan-2026-09-24.md`, `docs/references/keputusan-2026-10-08.md`, dan `docs/references/keputusan-2026-10-12-tarif-sla.md` — keputusan stakeholder, terutama batas Admin Internal dan alur kerja.
- `docs/references/README.md` — indeks keputusan dan dokumen referensi.
- `docs/tugas/fakhri/T-F02-rbac-admin-internal.md` — rancangan/ketentuan RBAC Admin Internal.
- `docs/tugas/faisal/T-S03-verifikasi-penerbit-admin.md` — proses verifikasi pendaftaran penerbit oleh admin.
- `docs/tugas/BACKLOG-FASE-LANJUTAN.md` dan `docs/tugas/README.md` — status dan konteks pekerjaan yang direncanakan.
- `docs/SRS_Sistem_Pentashihan_LPMQ_v2.2.docx`, `docs/SRS Sistem Manajemen Layanan Pentashihan LPMQ v3.0.docx`, `docs/SRS Sistem Manajemen Layanan Pentashihan LPMQ v3.1 (Draf) + Rencana Implementasi.docx`, dan `docs/Rencana Implementasi SRS v3.1 dan Status Repositori LPMQ.docx` — kebutuhan/status lintas versi dan rencana implementasi.
- `docs/3. SOP Pendaftaran Mushaf Al-Qur'an_rev.xlsx` dan `docs/SOP Verifikasi Mushaf Al-Quran.xlsx` — langkah pendaftaran dan verifikasi.
- `docs/4. SOP Distribusi Master Mushaf Al-Qur'an.xlsx` dan `docs/4. SOP Pentashihan Master Mushaf Al-Qur'an_rev.xlsx` — serah-terima, distribusi, serta pentashihan.
- `docs/SOP Dokumentasikan Mushaf Al-Qur'an.xlsx` dan `docs/SOP Dokumentasikan Mushaf Al-Qur'an_rev.xlsx` — dokumentasi dan arsip.
- `docs/Backlog_MVP_Sistem_Pentashihan_LPMQ_v2.2.xlsx` — pekerjaan MVP dan cakupan role.

Kode yang menjadi sumber bukti implementasi: `frontend/src/components/layout/Sidebar.jsx`, `frontend/src/features/auth/AuthContext.jsx`, `frontend/src/api/client.js`, halaman per role yang disebut pada tabel, `backend/src/routes/`, `backend/src/services/`, middleware auth/RBAC, `backend/src/app.js`, dan `backend/prisma/schema.prisma`.

## Konflik dengan dokumen acuan

1. **Batas `ADMIN_INTERNAL` vs penugasan verifikator.** `docs/references/keputusan-2026-10-08.md`, §3, menyebut Admin Internal “berfokus secara eksklusif pada penerimaan teknis loket” dan “dibatasi murni pada wewenang teknis intake loket”. Sebaliknya, `docs/architecture/user-flows.md`, §2, menyatakan staf `ADMIN_INTERNAL` menerbitkan Nota Dinas dan menugaskan verifikator; `docs/api/workflow.md` juga menyebut Admin Internal sebagai pelaksana atomik penugasan. Klarifikasi user menetapkan `ADMIN_INTERNAL` dan `SUPERADMIN` sebagai pemilik penugasan. **Pilihan:** ikuti klarifikasi user untuk tabel Tahap A; penyelarasan dokumen acuan berada di luar lingkup Tahap A.
2. **Pendaftaran penerbit oleh Admin Internal.** Keputusan 8 Oktober membatasi Admin Internal pada intake, sedangkan `docs/api/KONTRAK_PENDAFTARAN_PENERBIT.md`, §§5.5–5.8, menyatakan endpoint list, detail, dokumen, dan keputusan diakses `SUPERADMIN` serta `ADMIN_INTERNAL`. Klarifikasi user menegaskan kedua role memiliki verifikasi pendaftaran penerbit. **Pilihan:** gunakan klarifikasi user untuk tabel; jangan mengubah kontrak beku pada tahap ini.
3. **Siapa yang menugaskan verifikator.** `docs/architecture/user-flows.md`, §6/daftar keputusan alur, berbunyi “Penugasan Verifikator dilakukan ... oleh Kepala LPMQ”; `docs/api/workflow.md` dan backend menyebut `ADMIN_INTERNAL`/`SUPERADMIN`. User menegaskan pemiliknya `ADMIN_INTERNAL` dan `SUPERADMIN`. **Pilihan:** pakai keputusan user; minta pemilik produk menyelaraskan sumber acuan pada tahap terpisah.
4. **Hak pemrosesan pembayaran dan list.** `docs/architecture/user-flows.md` menyatakan pengesahan pembayaran dibatasi untuk verifikator yang ditugaskan. Kode list `/payments` tidak memfilter assignment verifikator; aksi route `PATCH /payments/:id/verify` mengotorisasi `VERIFIKATOR`, sementara service mengizinkan `SUPERADMIN`. Klarifikasi user menetapkan hanya verifikator yang ditugaskan yang dihitung; Superadmin hanya memantau dan tidak mendapat badge/notifikasi. Filter list dan otorisasi aksi tetap berbeda dan perlu disejajarkan tanpa mengubah batas akses secara tak sengaja.
5. **Status dan asal revisi.** Dokumen SRS/status lama memakai `WAITING_PUBLISHER_REVISION`, sedangkan schema/kode terkini memakai `REVISION_REQUIRED`, `PHYSICAL_HANDOVER_CORRECTION_REQUIRED`, dan `revision_source`. Klarifikasi terbaru menetapkan Intake Master Fisik hanya menghitung revisi awal `PHYSICAL_MASTER`; revisi `PHYSICAL_HANDOVER` tidak dihitung pada menu tersebut. Item penerbit yang menampilkan kedua jenis revisi menggabungkannya. Tahap B kini memakai filter relasional Prisma yang sama untuk list/count Intake, serta tidak memakai `findMany().length`.
6. **Role `PENANDATANGAN`.** `docs/architecture/design.md`, §3 “Identity & Access”, serta `docs/tugas/README.md`, §4, mencantumkannya sebagai role, tetapi seed tidak menetapkan user/role tersebut dan tidak ada route/menu tanda tangan khusus. Klarifikasi user menetapkan role tanpa item sidebar ini tidak mendapat entri config dan counts `{}`; antrean tanda tangan dibadging pada item Verifikator dan Kepala yang sudah ada.
7. **Role aktif dan prefix endpoint.** Rencana meminta satu role aktif tepercaya dan mencontohkan `GET /api/me/queue-counts`; implementasi berjalan di prefix `/api/v1`. Header `X-Active-Role` kini diverifikasi server terhadap `req.user.roles`; token autentikasi tetap dibaca dari localStorage. Endpoint mengikuti konvensi repo (`/api/v1/me/queue-counts`) dan envelope `{ success, data }`; header sudah ditambahkan pada allow-list CORS dan `Vary`.
8. **Sidebar role aktif.** `Sidebar.jsx` sebelumnya menggunakan beberapa `roles.includes(...)` dan pengecualian `isSuperAdmin`. Tahap B mengubah pemilihan menu agar berdasarkan role aktif, tanpa mengubah backend RBAC. Penyelarasan queue/badge lintas role lainnya masih mengikuti tahap masing-masing.

## Rekomendasi indeks

Tidak ada perubahan `schema.prisma` atau migrasi pada Tahap B–H. Rekomendasi berikut dicatat untuk usulan tunggal Tahap I; estimasi bersifat kualitatif dan perlu diverifikasi dengan `EXPLAIN` pada database yang representatif. Urutan kolom menempatkan filter equality sebelum kolom status.

| Prioritas | Tabel | Kolom yang disarankan (equality dahulu, status terakhir) | Query count/list yang memakai | Perkiraan dampak |
|---|---|---|---|---|
| Tinggi | `verification_assignments` | `[verifier_id, status]` | Count/list antrean `VERIFIKATOR` seperti `verification_assigned`, `verification_ready_to_send`, dan scoped payment; filter `verifier_id = user.id` serta status aktif. Polling 30 detik per pengguna. | Mengurangi baris assignment yang dipindai untuk antrean milik verifikator; manfaat mengikuti volume assignment dan distribusi status. |
| Tinggi | `assignments` | `[assignee_id, status]` | Count/list `tashih_active`; `assignee_id = user.id` dan status aktif. Polling 30 detik per pengguna. Tahap `INITIAL`/`REVISION` dipisah frontend, bukan filter database. | Menghindari pemindaian assignment lintas petugas; manfaat bergantung banyaknya assignment per pengguna. |
| Tinggi | `physical_manuscript_handovers` | `[to_user_id, status]` | Count/list `distribution_handover_pending`; `to_user_id = user.id`, status `PENDING`. List tidak memfilter kolom `stage`; endpoint list tidak diubah. Polling 30 detik per distributor. | Mempersempit pencarian ke inbox dan status aktif distributor; estimasi tergantung jumlah BAST. |
| Tinggi | `verification_document_signatories` | `[signer_user_id, status]` | Count/list `verification_signature_pending` dan `head_signature_pending`; signer `user.id`, status `PENDING`, berikut validasi urutan dokumen. Polling 30 detik per pengguna. | Mempercepat pencarian dokumen yang menunggu konfirmasi signer tertentu; kondisi urutan dokumen tetap memerlukan evaluasi relasional. |
| Tinggi | `document_signatories` | `[signer_user_id, signing_status]` | Count/list antrean tanda tangan STT; signer `user.id`, `signing_status = PENDING`. Polling 30 detik per pengguna. | Mengurangi scan signatory lintas seluruh dokumen untuk penandatangan aktif. |
| Tinggi | `payment_records` | `[registration_id, status]` | Count/list `payment_verification_pending`; status `PAID` dan registrasi terhubung ke assignment milik verifikator `user.id`. Polling 30 detik per pengguna. | Mempercepat pemeriksaan payment per registrasi setelah assignment user disaring; manfaat bergantung kardinalitas registrasi/status. |
| Rendah | `registrations` | `[revision_source, status]` | Count/list Intake Master Fisik untuk cabang revisi `revision_source = PHYSICAL_MASTER`, `status = REVISION_REQUIRED`; queue global per role, bukan per user. | Menghindari scan status revisi lain bila cabang revisi fisik awal membesar. Cabang `READY_FOR_VERIFICATION` tetap dilayani indeks status yang sudah ada. |

Indeks yang sudah ada dan relevan: `publisher_registrations(status, created_at)` untuk pendaftaran penerbit; `registrations(status, stage_entered_at, id)` untuk antrean berdasarkan status/FIFO; `verification_assignments(registration_id, status)` untuk pengecekan assignment aktif per registrasi; `physical_master_intakes(registration_id)` unik; `physical_manuscript_handovers(registration_id, status)`. Karena `physical_master_intakes.registration_id` unik, indeks status intake sendiri tidak direkomendasikan. Query `OfficialDocument`/`DocumentationItem` belum direkomendasikan sampai definisi query dan filter antrean role dokumentasi disepakati.

Untuk Tahap E, user memilih menunda migrasi indeks `[assignee_id, status]`; rekomendasi tetap dicatat untuk evaluasi Tahap I dan tidak ada perubahan schema/migrasi.

## Konvensi frontend/backend yang relevan

- API client berada di `frontend/src/api/client.js`; data antrean diambil manual melalui API modules dan React hooks/`useEffect`. Tidak ditemukan React Query/SWR sebagai library data fetching.
- Backend memakai envelope umum `{ success, data }`; API di-mount pada `/api/v1` dari `backend/src/app.js`.
- CORS mengizinkan header `X-Active-Role` untuk endpoint baru; token akses tetap mengikuti client yang ada.
- Endpoint list beberapa halaman memakai paginasi dan tab/filter lokal. Sesuai klarifikasi user, count harus mengukur semua baris yang cocok, bukan memakai total halaman yang sedang dimuat atau batas 20/50 baris pada fetch UI.

## Pertanyaan terbuka untuk tahap selanjutnya

1. Untuk revisi penerbit, item “Permohonan Saya” saat ini membuka view `ALL`. Apakah link sidebar perlu diarahkan ke tab “Perlu Tindakan”/“Perlu perbaikan” agar badge revisi sesuai prinsip badge mengikuti filter tujuan item, atau badge revisi tetap dipasang pada item yang membuka `ALL`?

## Status Tahap B dan batas indeks

Tahap B mengimplementasikan queue count `ADMIN_INTERNAL`/`SUPERADMIN` dan header role aktif terverifikasi, termasuk filter Intake yang dapat dipakai bersama count/list. Migrasi serta `schema.prisma` tidak diubah. Usulan indeks final beserta hasil `EXPLAIN` (jika dapat dijalankan dengan data seed) hanya disampaikan pada Tahap I sebagai satu proposal migrasi; migrasi tidak dibuat sebelum persetujuan user.

## Usulan C2: Verifikasi Pembayaran

Usulan berikut diturunkan dari kode halaman dan API yang berjalan. Cakupan C2 yang disetujui adalah Verifikasi Pembayaran; bagian tanda tangan dipertahankan hanya sebagai referensi Tahap F dan tidak mengubah endpoint list.

> Catatan: bagian “Tanda Tangan Saya” di bawah dipertahankan sebagai referensi aturan hitung untuk Tahap F (Kepala), bukan cakupan implementasi C2. Verifikator tidak memiliki tindakan tanda tangan di alur nyata.

### Tanda Tangan Saya

Item sidebar `VERIFIKATOR` membuka `/internal/signatures` tanpa query tab. Halaman menetapkan tab default `NEED_MY_SIGN` (“Menunggu konfirmasi internal Anda”).

**Sumber data saat ini**

| Sumber | Pemanggilan halaman | Catatan |
|---|---|---|
| Penugasan verifikasi | `GET /api/v1/verification-assignments?status=WAITING_SIGNATURE&limit=50`, juga status `READY_TO_SEND` dan `COMPLETED`, masing-masing `limit=50` | Halaman meratakan dokumen dari setiap assignment, mengambil hanya tipe `SURAT_HASIL_VERIFIKASI`, `SURAT_PEMBERITAHUAN_HASIL_VERIFIKASI`, dan `BERITA_ACARA_VERIFIKASI`, serta menghapus assignment duplikat berdasarkan ID. Respons API menyertakan daftar signatory yang diurutkan menurut `sign_order`. |
| Registrasi untuk STT | `GET /api/v1/registrations?status=READY_FOR_STT&limit=50` dan `...?status=STT_ISSUED&limit=20` | Halaman juga membentuk dokumen STT dari sumber ini. `canUserSign` mengizinkan Kepala atau user yang memiliki role `SUPERADMIN` (dicek dari `currentUser.roles`, bukan role aktif). Verifikator biasa tidak mendapat STT di `NEED_MY_SIGN`; user multi-role `VERIFIKATOR` + `SUPERADMIN` dapat melihat STT yang sudah diajukan ke TU dan belum selesai. Count C2 yang hanya mencakup assignment verifikator tidak akan mencakup STT tersebut; perlu konfirmasi apakah ini discrepancy yang diterima atau STT harus ikut dihitung. |

Pemanggilan sumber di halaman masing-masing memakai `.catch(() => ({ data: { items: [] } }))`. Jika salah satu API gagal, UI tetap menampilkan hasil parsial tanpa error yang mengidentifikasi sumber gagal. Badge server yang menghitung keseluruhan data bisa karena itu berbeda dari halaman yang gagal memuat sebagian datanya.

**Aturan hitung yang diusulkan**

Hitung satu dokumen verifikasi (bukan satu assignment atau satu baris signatory) untuk setiap dokumen yang memenuhi seluruh syarat:

1. Tipe dokumen termasuk tiga tipe di atas dan dokumen terkait assignment verifikasi dengan `verifier_id = user.id`. `user.id` harus berasal dari user terautentikasi; tidak ada ID dari parameter client.
2. Status dokumen saat ini `APPROVED` atau `SIGNING`. Halaman juga menerima nilai terhitung `WAITING_SIGNATURE` karena memakai `doc.status || assignment.status`; `WAITING_SIGNATURE` adalah status assignment, bukan anggota enum `VerificationDocumentStatus`, dan hanya dapat menjadi fallback bila status dokumen tidak tersedia di respons. Perlu diputuskan apakah count harus meniru fallback langka ini atau hanya menghitung status dokumen yang tersimpan.
3. Ada signatory untuk user tersebut dengan `status = PENDING`.
4. Semua signatory dengan `sign_order` lebih kecil dari signatory user tersebut berstatus `SIGNED`. Kode menganggap status sebelumnya apa pun selain `SIGNED` (termasuk `PENDING` atau `REJECTED`) sebagai penghalang.
5. Jangan menerapkan limit 50/20, paginasi, pencarian, atau pilihan jenis dokumen UI pada count.

Pada halaman, `NEED_MY_SIGN` menampilkan dokumen dengan `canUserSign` dan status bukan `SIGNED`. Untuk signatory yang tersedia, `canUserSign` ditetapkan bila ditemukan signatory user yang `PENDING` dan tidak ada penandatangan terdahulu yang belum `SIGNED`. Ada fallback bila relasi signatory kosong: penugasan yang dimiliki verifikator dapat dianggap bisa ditandatangani pada tiga status tadi. Endpoint list normal menyertakan relasi `signatories`, sehingga fallback ini terutama berlaku pada respons tanpa relasi/tanpa data signatory; perlu diputuskan apakah count harus meniru fallback tersebut atau hanya memakai relasi tersimpan. Untuk akun multi-role yang memiliki `SUPERADMIN`, halaman memakai `currentUser.roles` untuk menentukan kewenangan tanda tangan STT, sehingga beberapa STT dapat muncul saat role aktif `VERIFIKATOR`; aturan count di atas belum memasukkan sumber STT dan statusnya perlu konfirmasi.

Inisialisasi signatory saat ini membuat Verifikator sebagai signatory urutan 1 pada `BERITA_ACARA_VERIFIKASI`; `SURAT_HASIL_VERIFIKASI` dan `SURAT_PEMBERITAHUAN_HASIL_VERIFIKASI` diinisialisasi dengan signatory Kepala urutan 1. Alur pengajuan hasil juga membuat signatory Verifikator berstatus `SIGNED` untuk dokumen yang dibuat/diperbarui. Karena itu, dari kode saat ini antrean tanda tangan Verifikator pada dokumen riil dapat kosong; jangan mengasumsikan ada signatory pending Verifikator tanpa data yang memenuhi syarat.

Status dokumen yang dikecualikan oleh aturan halaman: `DRAFT`, `SUBMITTED`, `RETURNED`, `SIGNED`, `EMAIL_QUEUED`, `SENT`, `EMAIL_FAILED`, `REVOKED`, dan `ISSUED` (serta status lain di luar `APPROVED`/`SIGNING`; fallback tampilan `WAITING_SIGNATURE` hanya bila status dokumen tidak tersedia). Signatory user yang sudah `SIGNED` atau `REJECTED` tidak dihitung sebagai signatory user `PENDING`.

**Skenario uji turunan dari kode**

Perbandingan berikut membandingkan badge usulan dengan tab default yang datanya berhasil dimuat, tanpa pencarian atau filter jenis dokumen UI.

| Kondisi dokumen | Badge dihitung? | Muncul di tab saat ini? | Badge dan tab sama? | Dasar kode |
|---|---:|---:|---|---|
| Giliran Verifikator: dokumen bertipe yang didukung, status dokumen `APPROVED`/`SIGNING` (atau fallback tampilan `WAITING_SIGNATURE` bila `doc.status` tidak tersedia), signatory user `PENDING`, dan semua signatory sebelumnya `SIGNED` | Ya | Ya | Ya bila data API lengkap; bila status dokumen hilang, fallback UI dapat membuat tab dan count berbasis status tersimpan berbeda | `SignatureCenterPage.jsx`: `doc.status || assignment.status`, evaluasi `canUserSign`, pencarian `mySig`, pemeriksaan `pendingPrior`, lalu filter `NEED_MY_SIGN`; `verification-signing.service.js`: validasi status dan urutan tanda tangan. |
| Signatory sebelumnya belum tanda tangan (statusnya `PENDING` atau `REJECTED`) | Tidak | Tidak | Ya | `pendingPrior` mencari `sign_order` lebih kecil dengan status selain `SIGNED`; tab mengecualikan dokumen dengan `canUserSign = false`. |
| Signatory Verifikator sudah `SIGNED` | Tidak | Tidak | Ya | Halaman hanya mengaktifkan `canUserSign` untuk `mySig.status === 'PENDING'`; alur sign API memperbarui signatory menjadi `SIGNED`. |
| Dokumen berstatus `REVOKED` atau `RETURNED` | Tidak | Tidak | Ya | Kedua status tidak termasuk status yang dievaluasi untuk `canUserSign`; status `RETURNED` juga dipakai untuk draf yang dikembalikan. |
| Assignment dimiliki verifikator lain | Tidak untuk badge user ini | Tidak untuk user verifikator biasa; endpoint list memfilter `verifier_id = user.id` | Ya untuk role verifikator biasa. **Potensi selisih** pada user multi-role admin: endpoint list dapat menjadi global, sehingga dokumen yang memuat signatory user saat ini dapat tampil, sementara badge tetap di-scope ke assignment milik user. | `verification-intake.service.js`: filter list berdasarkan kumpulan role; `SignatureCenterPage.jsx`: `canUserSign` memakai ID signatory dan `isAssignedToMe` hanya dipakai fallback; role admin membuat list dapat global. |
| Lebih dari 50 assignment yang memenuhi syarat pada satu status sumber | Badge menghitung semua dokumen | Halaman hanya menerima maksimal 50 assignment pada status tersebut | Tidak; badge dapat lebih besar daripada isi tab yang terambil | `SignatureCenterPage.jsx`: tiga pemanggilan list assignment memakai `limit: 50`; endpoint list melakukan paginasi. Count tidak akan mengikuti batas ini. |
| STT `READY_FOR_STT`/`STT_ISSUED` menunggu tanda tangan Kepala | Tidak pada usulan count assignment `VERIFIKATOR` | Tidak untuk verifikator biasa; bisa ya untuk user multi-role `SUPERADMIN` karena halaman mengizinkan role tersebut menandatangani STT tanpa mengecek role aktif | Ya untuk verifikator biasa; tidak untuk multi-role `SUPERADMIN` bila badge tidak mencakup STT | `SignatureCenterPage.jsx`: aturan STT memakai `isHead || currentUser.roles.includes('SUPERADMIN')`; sumber STT dibentuk dari registrasi dan tidak terkait assignment `verifier_id` untuk count yang diusulkan. |

Statistik `stats.needSign` halaman menghitung `allDocuments` sebelum filter pencarian dan jenis dokumen, sedangkan daftar yang sedang terlihat menerapkan kedua filter tersebut. Dengan demikian badge cocok dengan total tab tanpa filter pilihan user, tetapi dapat lebih besar daripada baris yang sedang terlihat ketika pencarian atau filter jenis dokumen aktif. Ini sesuai keputusan count global tanpa filter pilihan user.

Ada perbedaan pada status yang diterima UI dan aksi tanda tangan backend: UI mengizinkan nilai terhitung `docStatus = WAITING_SIGNATURE` untuk `canUserSign`, sedangkan `signVerificationDocument` hanya menerima status dokumen tersimpan `APPROVED` atau `SIGNING`. Karena `WAITING_SIGNATURE` bukan nilai enum dokumen dan API normal menyertakan `doc.status`, selisih ini hanya mungkin bila status dokumen tidak tersedia di respons; jika terjadi, UI dapat menampilkan dokumen yang aksi tanda tangannya ditolak 409.

Sumber kode utama: `frontend/src/features/signatures/SignatureCenterPage.jsx` (`fetchAssignments`, `allDocuments`, `canUserSign`, `filteredDocuments`, `stats.needSign`); `frontend/src/api/verification.api.js` dan `frontend/src/api/registration.api.js` (parameter API); `backend/src/services/verification-intake.service.js:listVerificationAssignments` (scope assignment list dan relasi signatory); `backend/src/services/verification-signing.service.js:initVerificationSignatories` dan `signVerificationDocument` (inisialisasi signatory, prasyarat urutan, transisi tanda tangan); `backend/src/services/verification-review.service.js` (pembuatan signatory pada pengajuan hasil); `backend/prisma/schema.prisma` (status dan relasi signatory).

### Verifikasi Pembayaran

**Query count yang diusulkan**

Hitung baris `PaymentRecord` dengan `status = PAID` yang registrasinya memiliki assignment sukses yang masih relevan untuk user aktif. Definisi kerja yang diturunkan dari alur sekarang adalah assignment `verifier_id = user.id`, `status = COMPLETED`, dan `decision = PASSED`:

```js
prisma.paymentRecord.count({
  where: {
    status: 'PAID',
    registration: {
      status: 'PAYMENT_VERIFICATION',
      verification_assignments: {
        some: {
          verifier_id: user.id,
          status: 'COMPLETED',
          decision: 'PASSED',
        },
      },
    },
  },
});
```

`user.id` harus diambil dari user terautentikasi dan role aktif harus `VERIFIKATOR`; count tidak menerima identitas dari client. Query memakai `some`, sesuai keputusan bahwa assignment mana pun pada registrasi cukup memenuhi syarat. Syarat status registrasi `PAYMENT_VERIFICATION` mengikuti `verifyPayment` yang mewajibkan status tersebut sebelum pembayaran diverifikasi. Pengiriman hasil yang lolos mengubah assignment menjadi `COMPLETED` dengan keputusan terkait, dan penerbit mengonfirmasi pembayaran menjadi `PAID` sambil memindahkan registrasi ke `PAYMENT_VERIFICATION`.

**Perbandingan dengan list yang berjalan dan discrepancy**

- `InternalPaymentQueuePage` membuka tab default `PAID` (“Perlu Verifikasi”) dan memanggil `GET /api/v1/payments?status=PAID`, dengan paginasi serta pencarian opsional.
- `payment.service.js:listPayments` menambahkan `where.status = query.status`, tetapi tidak menambahkan syarat status registrasi atau assignment `verifier_id`; daftar role `VERIFIKATOR` karena itu dapat memuat pembayaran milik verifikator lain dan yang status registrasinya berbeda. Assignment terbaru hanya ikut disertakan pada data untuk tampilan (`orderBy assigned_at desc`, `take: 1`) dan saat ini tidak memilih `verifier_id`.
- Contoh selisih yang diketahui: registrasi V2 memiliki pembayaran `PAID`, tetapi assignment suksesnya milik V2. Pembayaran itu masih dapat muncul di list V1 karena list hanya memfilter status `PAID`, sedangkan badge V1 yang memakai assignment scope tidak menghitungnya. Untuk user multi-role yang juga `SUPERADMIN`, list dapat tetap global sementara badge aktif `VERIFIKATOR` hanya menghitung assignment user tersebut.
- Pencarian dan halaman aktif dapat membuat jumlah baris yang sedang terlihat lebih kecil daripada badge; badge menghitung seluruh baris yang cocok dan tidak memakai filter pilihan user.

Sumber kode utama: `frontend/src/features/verification/InternalPaymentQueuePage.jsx` (tab, query, paginasi/pencarian); `frontend/src/api/payment.api.js`; `backend/src/routes/workflow.routes.js` (route `PATCH /payments/:id/verify`, role `VERIFIKATOR`); `backend/src/services/payment.service.js:verifyPayment` (prasyarat status registrasi `PAYMENT_VERIFICATION`); `backend/src/services/payment.service.js:listPayments` (filter list); `backend/src/services/verification-review.service.js` (assignment selesai); `backend/prisma/schema.prisma` (relasi serta status assignment/payment).

### Keputusan tanda tangan Tahap F

- User mengonfirmasi tidak menghitung fallback UI saat relasi signatory tidak ada; hanya signatory eksplisit yang dihitung.
- User mengonfirmasi tidak memakai fallback ke `assignment.status = WAITING_SIGNATURE` saat status dokumen tidak tersedia; gunakan status tersimpan `APPROVED`/`SIGNING` untuk dokumen verifikasi.
- User mengonfirmasi STT yang terlihat karena akun memiliki `KEPALA_LPMQ` + `SUPERADMIN` dihitung saat role aktif Kepala. Untuk STT, count mengikuti slot Kepala yang masih `PENDING`, kedua paraf sudah ada, dan tidak ada paraf yang dibubuhkan oleh user yang sedang login.
- Badge Kepala hanya ditampilkan pada “Persetujuan Verifikasi” dan “Tanda Tangan”; menu “Monitoring & Paraf Sidang” dan “Penetapan STT” tidak dibadge.
- Surat persetujuan Permohonan Master pada halaman tanda tangan tidak memiliki relasi signatory eksplisit yang sepadan; sesuai keputusan pertama, tidak masuk badge walaupun UI menampilkannya melalui fallback. Ini discrepancy yang diketahui.

Keputusan pembayaran untuk C2: pakai assignment mana pun yang cocok (`some`), mensyaratkan status registrasi `PAYMENT_VERIFICATION` karena diwajibkan aksi `verifyPayment`, dan menerima discrepancy dengan list yang tetap tidak diubah.
Catatan pertanyaan sebelumnya hanya tersisa sebagai bahan Tahap F (Kepala), karena tindakan tanda tangan Verifikator bukan bagian C2.

## Usulan D: Role penerbit

Usulan ini berdasarkan implementasi saat ini dan keputusan user untuk Tahap D. Key usulan: `publisher_revision_pending` dan `publisher_billing_unpaid`.

### 1. Permohonan Saya — revisi penerbit

Setelah memeriksa seluruh jalur transisi, definisi count adalah semua `Registration` dengan status `REVISION_REQUIRED` atau `PHYSICAL_HANDOVER_CORRECTION_REQUIRED`, tanpa filter `revision_source`. `DRAFT` dan `AWAITING_PAYMENT` tidak dihitung. Definisi ini tetap berlaku meskipun sebagian jalur menulis source yang tak terduga atau tidak menulis source sama sekali.

Jalur yang memindahkan atau mempertahankan status revisi dan nilai `revision_source`:

| Jalur | Lokasi kode | Nilai `revision_source` |
|---|---|---|
| Transisi generic dari `IN_VERIFICATION` ke `REVISION_REQUIRED` | `backend/src/services/registration.service.js:TRANSITION_POLICY` dan `transitionStatus` | Tidak ditulis/diubah oleh transisi; dapat tetap `null` atau nilai sebelumnya. |
| Hasil verifikasi meminta revisi saat surat dikirim | `backend/src/services/verification-review.service.js:sendVerificationResult` | Mengisi `VERIFICATION`. |
| Master fisik dikembalikan admin; registrasi dipindah atau sudah berada di `REVISION_REQUIRED` | `backend/src/services/verification-intake.service.js:receivePhysicalMaster` | Mengisi `PHYSICAL_MASTER`. Saat master diterima ulang, nilai dibersihkan ke `null`; cabang penerimaan naskah perbaikan/dumi juga mengosongkan source. |
| Penerbit submit ulang revisi dengan pembayaran yang sudah `VERIFIED` tetapi intake belum diterima | `backend/src/services/registration.service.js:submitRegistration` | Status dapat tetap `REVISION_REQUIRED`; source tidak ditulis/diubah. Jika intake sudah diterima status menjadi `WAITING_DISTRIBUTOR_RECEIPT`. |
| Hasil sidang pentashihan memerlukan perbaikan | `backend/src/services/distribution.service.js:approveDistribution` | Mengisi `TASHIH_REVISION`, di luar tiga nilai yang semula dipertimbangkan. Jalur pentashihan hanya dimulai setelah pembayaran diverifikasi. |
| Distributor mengembalikan master pada serah-terima fisik | `backend/src/services/handover.service.js:returnPhysicalHandover` | Status menjadi `PHYSICAL_HANDOVER_CORRECTION_REQUIRED`; mengisi `PHYSICAL_HANDOVER`. Saat serah-terima ulang diterima, nilai dibersihkan ke `null`. |
| Definisi kolom | `backend/prisma/schema.prisma:Registration.revision_source` | Kolom `String?`; komentar schema menyebut `VERIFICATION` dan `PHYSICAL_HANDOVER`, sedangkan runtime juga menggunakan `PHYSICAL_MASTER` dan `TASHIH_REVISION`. |

Query Prisma yang diusulkan:

```js
{
  publisher_id: user.publisherId,
  status: { in: ['REVISION_REQUIRED', 'PHYSICAL_HANDOVER_CORRECTION_REQUIRED'] },
}
```

List `GET /api/v1/registrations` di `backend/src/services/registration.service.js:listRegistrations` menetapkan `publisher_id = user.publisherId` untuk user dengan role `PENERBIT` yang bukan `SUPERADMIN`, dan mengembalikan 403 bila `publisherId` tidak ada. Identitas tersebut berasal dari user terautentikasi: `auth.service.js:login` memasukkan publisher ID ke token, lalu `auth.middleware.js:authenticate` memverifikasi token, memuat ulang user beserta relasi publisher, dan menyusun `req.user.publisherId` dari relasi database. Count harus memakai `user.publisherId` dari konteks terverifikasi, bukan input client. Catatan: jika akun memiliki `PENERBIT` sekaligus `SUPERADMIN`, list saat ini melewati publisher scope; badge yang tetap terikat ke publisher login akan berbeda dari list global tersebut.

Yang dapat dan tidak dapat dipakai ulang:

- `backend/src/services/queue-utils.js:REGISTRATION_SEGMENTS.PUBLISHER_ACTIONS` dipakai list untuk empat status `DRAFT`, `REVISION_REQUIRED`, `AWAITING_PAYMENT`, dan `PHYSICAL_HANDOVER_CORRECTION_REQUIRED`.
- Status segment tidak bisa dipakai mentah untuk count revisi: count mengecualikan `DRAFT`/`AWAITING_PAYMENT`, sementara `REVISION_REQUIRED` harus mencakup semua nilai source termasuk null atau nilai tak terduga. `PHYSICAL_HANDOVER_CORRECTION_REQUIRED` juga dihitung.
- Filter status granular `REVISION_REQUIRED` di halaman juga tidak cukup karena tidak membatasi `revision_source` dan tidak mencakup status koreksi serah-terima.
- Pengecekan scope publisher di `listRegistrations` ditulis inline, bukan helper filter bersama. Untuk menghindari perubahan perilaku list, Tahap D mempertahankan list dan menduplikasi syarat `publisher_id = user.publisherId` pada count; tidak mengekstrak helper scope.

Perbedaan angka yang diketahui: tab “Perlu Tindakan” mengirim `segment=PUBLISHER_ACTIONS`, yang mencakup `DRAFT`, `AWAITING_PAYMENT`, semua `REVISION_REQUIRED`, dan `PHYSICAL_HANDOVER_CORRECTION_REQUIRED`. Badge revisi saja sengaja lebih sempit dari angka total tab itu. Link sidebar telah diarahkan ke `view=actions` agar tab tindakan terbuka; perbedaan definisi badge dengan jumlah tab adalah discrepancy yang diketahui.

### 2. Tagihan — Menunggu Bayar

Tab “Menunggu Bayar” di `frontend/src/features/billing/PublisherBillingPage.jsx` mengirim `status=UNPAID`; tab lain adalah `ALL` (“Semua”), `PAID` (“Dalam Verifikasi”), dan `VERIFIED` (“Lunas”). `backend/src/services/payment.service.js:listPayments` hanya menambahkan `where.status = query.status` dan untuk penerbit biasa membatasi relasi registrasi dengan `publisher_id = user.publisherId`. Filter list tidak membatasi `Registration.status`, tidak memeriksa `expires_at`, dan tidak mengecualikan tagihan yang sudah lewat tanggal jatuh tempo.

Query badge yang mengikuti tab:

```js
prisma.paymentRecord.count({
  where: {
    status: 'UNPAID',
    registration: { publisher_id: user.publisherId },
  },
});
```

`PaymentStatus.EXPIRED` adalah status terpisah di schema sehingga tidak masuk tab `UNPAID`. Pembayaran yang tanggal `expires_at`-nya lewat tetapi statusnya masih `UNPAID` tetap tampil dan terhitung; service menghitung `sla.is_overdue` dari tanggal tersebut tanpa mengubah status pembayaran.

Tab dan kartu ringkas bukan penghitung total yang sama:

- Endpoint list menghitung `pagination.total` dari semua record yang cocok, namun halaman hanya memuat maksimum 20 record per halaman.
- Kartu “Menunggu Bayar” menghitung `payments.filter(status === 'UNPAID')` atas array yang sedang termuat. Kartu itu dibatasi halaman yang sedang diambil (maksimum 20), bukan total. Pada tab `UNPAID`, kartunya menghitung record UNPAID di halaman itu; pada tab `ALL`, hanya record UNPAID di halaman ALL yang termuat.
- Link sidebar membuka `/publisher/billing?tab=UNPAID`; halaman menggunakan parameter URL untuk membuka tab itu. Ini tidak mengubah query list.

Pemeriksaan jalur transisi pembayaran menunjukkan:

- Record berstatus `UNPAID` dibuat di `backend/src/services/verification-review.service.js` hanya untuk hasil `PASSED` sebelum registrasi bergerak ke `AWAITING_PAYMENT`; pada pengiriman hasil yang meminta perbaikan (`REVISION_REQUIRED`) tidak dibuat tagihan.
- `backend/src/services/payment.service.js:createPayment` mensyaratkan registrasi `AWAITING_PAYMENT`.
- `confirmPayment` hanya menerima registrasi `AWAITING_PAYMENT` atau `VERIFICATION_APPROVED`, lalu mengubah pembayaran menjadi `PAID` dan registrasi menjadi `PAYMENT_VERIFICATION`.
- `returnPayment` mengubah `PAID` menjadi `UNPAID` dan status registrasi kembali ke `AWAITING_PAYMENT`; status itu tidak memiliki transisi generik ke status revisi.
- `approveDistribution` mensyaratkan `TASHIH_IN_PROGRESS`, yang dicapai setelah pembayaran `VERIFIED`; hasil sidang revisi karenanya tidak memiliki tagihan `UNPAID` dalam jalur normal.
- Pengembalian master serah-terima mensyaratkan `WAITING_DISTRIBUTOR_RECEIPT`, yang juga hanya dicapai setelah pembayaran terverifikasi.

Jadi tidak ditemukan jalur transisi aplikasi yang sah yang menghasilkan registrasi revisi bersamaan dengan `PaymentRecord.UNPAID`. Status tagihan dan status revisi tidak dijamin oleh constraint database, sehingga kemungkinan kombinasi tersebut tetap dicatat sebagai discrepancy yang diketahui; tidak ada data yang diperiksa, diubah, atau dibersihkan. Definisi count masing-masing badge tetap sesuai tab/status yang disetujui.

Seperti list registrasi, filter publisher pada list pembayaran saat ini hanya aktif untuk `PENERBIT` tanpa role `SUPERADMIN`. Akun multi-role `PENERBIT` + `SUPERADMIN` karena itu dapat melihat list global, sementara count role aktif `PENERBIT` yang di-scope ke `user.publisherId` tetap milik penerbit tersebut. User menerima discrepancy ini.

### 3. Tabel kondisi dan pemisahan badge

Dengan kondisi status yang berjalan normal, kategori badge saling terpisah: registrasi revisi tanpa tagihan `UNPAID` masuk “Permohonan Saya”; pembayaran `UNPAID` masuk “Tagihan”, bukan “Permohonan Saya”.

| Status registrasi | `revision_source` | Status pembayaran | Permohonan Saya? | Tagihan? | Catatan |
|---|---|---|---:|---:|---|
| `DRAFT` | kosong/tidak relevan | tidak ada | Tidak | Tidak | Draf tidak dihitung. |
| `AWAITING_PAYMENT` | kosong/tidak relevan | `UNPAID`, belum kedaluwarsa | Tidak | Ya | Hanya “Tagihan”. |
| `AWAITING_PAYMENT` | kosong/tidak relevan | `UNPAID`, `expires_at` lewat | Tidak | Ya | Tetap UNPAID; ditandai overdue, tidak otomatis dikeluarkan dari tab. |
| status apa pun | tidak relevan | `EXPIRED` | Tidak, kecuali registrasi juga sedang dalam status revisi | Tidak | `EXPIRED` bukan tab `UNPAID`. |
| `REVISION_REQUIRED` | `VERIFICATION`, `PHYSICAL_MASTER`, `PHYSICAL_HANDOVER`, `TASHIH_REVISION`, null, atau nilai lain | tidak ada / bukan `UNPAID` | Ya | Tidak | Semua source dihitung; termasuk revisi verifikasi, intake, dan sidang pentashihan. |
| `PHYSICAL_HANDOVER_CORRECTION_REQUIRED` | `PHYSICAL_HANDOVER` | tidak ada / bukan `UNPAID` | Ya | Tidak | Koreksi serah-terima fisik. |
| `PAYMENT_VERIFICATION` | kosong/tidak relevan | `PAID` | Tidak | Tidak | “Dalam Verifikasi” tidak dibadge. |
| `REVISION_REQUIRED` atau `PHYSICAL_HANDOVER_CORRECTION_REQUIRED` | source apa pun / null | `UNPAID` | Ya menurut definisi revisi | Ya menurut filter list/tagihan saat ini | Kode list tagihan tidak mengecualikan status revisi. Tidak ditemukan jalur transisi aplikasi yang sah yang menghasilkan kombinasi ini; kemungkinan kombinasi dicatat sebagai discrepancy yang diketahui, tanpa memeriksa/mengubah/membersihkan data. |

### 4. Tujuan link sidebar dibanding definisi badge

| Item sidebar | Link saat ini | Tampilan awal saat diklik | Sesuai badge? | Tujuan yang diusulkan |
|---|---|---|---|---|
| Permohonan Saya | `/publisher/registrations?view=actions` | Tab “Perlu Tindakan” | Tidak. Badge revisi lebih sempit daripada segmen “Perlu Tindakan”. | Sudah diarahkan ke `view=actions`; badge tetap hanya revisi sesuai keputusan user. |
| Tagihan | `/publisher/billing?tab=UNPAID` | Tab “Menunggu Bayar” | Ya untuk filter status dan scope publisher. | Sudah diarahkan ke tab `UNPAID` melalui state URL halaman. |

### 5. Skenario uji dan pertanyaan

Skenario uji turunan dari definisi:

| Skenario | Hasil yang diharapkan |
|---|---|
| Penerbit A memiliki revisi `REVISION_REQUIRED/VERIFICATION`, penerbit B memiliki revisi yang sama | Badge A hanya menghitung revisi milik publisher A; B tidak terpengaruh. |
| `REVISION_REQUIRED` dengan `revision_source` `VERIFICATION`, `PHYSICAL_MASTER`, `PHYSICAL_HANDOVER`, `TASHIH_REVISION`, null, atau nilai lain; serta `PHYSICAL_HANDOVER_CORRECTION_REQUIRED` | Masing-masing dihitung satu kali di `publisher_revision_pending` untuk publisher pemilik. |
| Hanya ada `DRAFT` atau `AWAITING_PAYMENT` | `publisher_revision_pending` tidak bertambah. |
| `AWAITING_PAYMENT` dengan `PaymentRecord.UNPAID` | Hanya `publisher_billing_unpaid` bertambah. |
| `PaymentRecord.UNPAID` dengan `expires_at` di masa lalu | Tetap masuk tab “Menunggu Bayar” dan badge tagihan. |
| `PaymentRecord.EXPIRED` | Tidak masuk tab “Menunggu Bayar” maupun badge tagihan. |
| Tab “Dalam Verifikasi”, “Lunas”, atau “Semua” | Tidak menerima badge tersendiri. |
| Naskah dengan status revisi sekaligus payment `UNPAID` | Tidak ada jalur transisi aplikasi sah yang menghasilkan kondisi ini; kemungkinan kombinasi dicatat sebagai discrepancy yang diketahui. Data tidak diperiksa, diubah, atau dibersihkan. |
| Penerbit multi-role, akun lain dengan publisher berbeda, ganti role | Count harus berasal dari publisher ID user terautentikasi dan hanya aktif saat role `PENERBIT`; tidak menerima publisher ID client. User menerima discrepancy: list akun `PENERBIT`+`SUPERADMIN` dapat global, sedangkan badge tetap scoped ke publisher akun. |
| Lebih dari 20 tagihan `UNPAID` | Badge menghitung semua; kartu ringkas halaman hanya menghitung record di halaman termuat (maksimum 20). |

Keputusan user yang berlaku untuk implementasi D:

1. Tidak ada jalur transisi aplikasi sah untuk `UNPAID` + status revisi; catat kemungkinan kombinasi sebagai discrepancy tanpa mengubah atau membersihkan data.
2. Terima discrepancy pada akun `PENERBIT` + `SUPERADMIN`: endpoint list dapat global, sedangkan badge role aktif `PENERBIT` tetap scoped ke publisher ID akun.
