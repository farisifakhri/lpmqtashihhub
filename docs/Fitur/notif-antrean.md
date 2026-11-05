# Fitur Badge Antrian Sidebar (Semua Role)

Dokumen ini adalah rencana kerja untuk AI agent. Kerjakan **hanya tahap yang diminta user**, jangan melompat ke tahap berikutnya.

## 1. Tujuan

Menampilkan badge angka di item menu sidebar yang menunjukkan **jumlah item yang menunggu tindakan user yang sedang login**. Contoh: menu "Penugasan Verifikator" menampilkan angka 2 jika ada 2 naskah berstatus siap ditugaskan.

Saat ini menu "Intake Master Fisik" menampilkan badge statis berlabel "LOKET". Itu salah dan harus diganti dengan badge angka antrian.

## 2. Stack

- Backend: Express.js, Prisma, MySQL
- Frontend: React dengan Vite. Mayoritas file memakai JSX (`.jsx`); ikuti ekstensi dan gaya file yang sudah ada di folder terkait. Jangan mengonversi file ke TypeScript dan jangan membuat file `.ts/.tsx` baru kecuali folder tersebut memang sudah memakainya.

## 3. Keputusan yang sudah final

- Role di database (nilai persis): `ADMIN_INTERNAL`, `KEPALA_LPMQ`, `PENTASHIH`, `PENERBIT`, `DOKUMENTATOR`, `DISTRIBUTOR`, `VERIFIKATOR`, `SUPERADMIN`. Gunakan nilai ini sebagai kunci di `queue.config.js`, bukan nama tampilan di UI.
- Peta nama tampilan ke role database (ASUMSI, wajib dikonfirmasi di Tahap A, jangan dianggap pasti):
  - "Koordinator Distribusi" = `DISTRIBUTOR` (sudah dikonfirmasi user).
  - "Admin" (mis. "Super Admin LPMQ") = `SUPERADMIN`.
  - "Helper Admin" / "Admin Internal" = `ADMIN_INTERNAL`.
  - Jika temuan di kode berbeda dari peta ini, laporkan dan berhenti bertanya.
- Kepala (`KEPALA_LPMQ`) **punya** antrian tindakan.
- Helper admin (`ADMIN_INTERNAL`) punya antrian **yang sama persis** dengan admin (`SUPERADMIN`).
- **Definisi badge per item sidebar:** beberapa item sidebar membuka halaman yang sama dan hanya berbeda pada tab yang aktif (contoh: item 3 Penugasan Verifikator, item 4 Verifikasi Berkas, dan item 5 Hasil Verifikasi). Maka setiap item sidebar punya **tepat satu definisi antrian**, yaitu isi tab (dan sub-tab) yang **dibuka oleh item itu**. Badge item = angka "Dalam filter ini" pada tab tujuan tersebut. Contoh: item 3 membuka tab "Perlu Penugasan", sub-tab "Belum Ditugaskan"; badge item 3 hanya menghitung itu, bukan seluruh halaman dan bukan tab lain.
- Tab yang tidak dibuka oleh item sidebar mana pun (mis. "Riwayat") tidak dihitung. Tab riwayat tidak pernah mendapat badge.
- Hanya tab yang berisi pekerjaan yang menunggu tindakan role aktif yang boleh dihitung.
- Satu user **bisa punya lebih dari satu role**, dan berganti role lewat menu "Ganti Peran" di profil mini. Pada satu waktu hanya ada **satu role aktif**; sidebar hanya menampilkan menu role aktif, bukan gabungan semua role.
- Badge hanya menghitung antrian untuk **role aktif**.
- Satu endpoint untuk semua role: `GET /api/me/queue-counts`. Role aktif ditentukan di server dari sumber tepercaya (token/sesi), bukan dari parameter client. Jika role aktif dikirim dari client (header/body), server **wajib memverifikasi** bahwa user memang memiliki role tersebut. Cara role aktif disimpan dan dikirim ditentukan dari hasil Tahap A.
- Pembaruan angka lewat polling 30 detik + refetch saat window fokus + refetch saat user mengganti role + invalidate setelah aksi yang menyelesaikan antrian. Tidak memakai WebSocket.

## 4. Aturan umum (berlaku di semua tahap)

1. Angka badge harus sama dengan jumlah baris di halaman antrian menu tersebut. Filter `count()` dan filter endpoint list **harus berasal dari satu sumber yang sama**, tidak boleh diduplikasi.
2. Scoping data tidak boleh bergantung pada input client. Untuk role yang antriannya milik pribadi (mis. verifikator, pentashih) atau milik penerbit, filter wajib menyertakan ID user/penerbit dari token.
3. Jangan mengubah perilaku endpoint list yang sudah ada.
4. Jangan menambah dependensi baru tanpa bertanya.
5. Ikuti gaya kode, struktur folder, dan pola error handling (`next(err)`) yang sudah ada.
6. Jangan menebak. Jika filter status, nama kolom, atau definisi antrian tidak jelas, tulis "perlu konfirmasi" dan berhenti bertanya ke user.
7. Setelah tahap selesai: jalankan lint (dan type-check hanya jika proyek memang punya konfigurasinya), lalu ringkas file yang diubah dan cara mengujinya.
8. Semua teks tampilan untuk user memakai Bahasa Indonesia.
9. **Dokumen acuan proyek** (file docs/SOP/PRD/kontrak API yang sudah ada di repo) tidak boleh diubah, ditimpa, atau dihapus oleh agent. Jika rencana ini bertentangan dengan dokumen acuan (alur status, nama role, definisi antrian, konvensi API, struktur folder, aturan penamaan), **jangan memilih sendiri**. Catat konflik secara spesifik (kutip nama file dan bagian dokumennya), lalu berhenti dan tanyakan ke user. Dokumen acuan dan kode yang sudah berjalan bisa saling berbeda; perbedaan itu juga dilaporkan, bukan diselesaikan sendiri oleh agent.
10. File baru yang dibuat agent tidak boleh memakai nama yang sudah ada di repo. Periksa dulu sebelum membuat file.
11. Jangan mengubah `prisma/schema.prisma`; jangan membuat, mengubah, atau menghapus file migrasi; jangan menjalankan perintah `prisma migrate` atau `prisma db push`. Satu-satunya cara menyentuh database adalah `npm test` di backend (database sementara). Kebutuhan indeks hanya dicatat dan dibahas di Tahap I, menunggu persetujuan user.

### Keputusan implementasi untuk semua tahap berikutnya

- Endpoint: `GET /api/v1/me/queue-counts`, dengan respons `{ success, data }`.
- Count menghitung semua baris yang cocok di server, tanpa paginasi, pencarian, atau filter pilihan user di halaman.
- Revisi mengikuti menu tempat revisi itu tampil di halaman tujuan.
- Proyek memakai Zod 4. Jangan menambah skema Zod baru kecuali konvensi repo mewajibkannya; gunakan API Zod 4 bila perlu.
- Frontend mayoritas JSX; jangan mengonversi file ke TypeScript.

## 5. Aturan multi-role

- Sidebar dan badge mengikuti **role aktif saja**. Role lain milik user tidak dihitung dan tidak ditampilkan.
- Server hanya menjalankan `count()` untuk entri config milik role aktif. Role tanpa entri antrian mengembalikan objek kosong `{}`.
- Role aktif tidak boleh dipercaya begitu saja dari client. Server memverifikasi bahwa role aktif tersebut benar-benar dimiliki user yang login; jika tidak, tolak dengan 403.
- Saat user mengganti role, query counts harus diambil ulang dan angka lama role sebelumnya tidak boleh tampil. Sertakan role aktif dalam `queryKey` frontend (mis. `['queue-counts', activeRole]`) agar cache antar role tidak tercampur.
- Pada saat peralihan role, sembunyikan badge atau tampilkan kosong sampai data role baru tiba; jangan menampilkan angka role sebelumnya.

## 6. Arsitektur target

**Backend**
- `src/modules/queue/queue.config.js` (nama dan lokasi boleh disesuaikan dengan struktur proyek): memetakan `role -> daftar { key, buildWhere(user) }`. `buildWhere` menerima user yang login dan mengembalikan where clause Prisma, termasuk scoping per user/penerbit bila perlu. Setiap entri adalah satu **item sidebar** dan mencatat tab/sub-tab tujuan yang dibukanya (sebagai komentar atau properti), agar mudah diverifikasi terhadap angka "Dalam filter ini" di halaman.
- Filter di config ini dipakai ulang oleh endpoint list yang sudah ada.
- Controller `getQueueCounts`: ambil user dan role aktif (lihat bagian 5 untuk verifikasi role), ambil entri config milik role aktif itu saja, jalankan `prisma.<model>.count()` dengan `Promise.all`, kembalikan `{ [key]: jumlah }`.
- Route: `GET /api/me/queue-counts` dengan middleware auth.

**Frontend**
- Hook `useQueueCounts()` memakai library data fetching yang sudah ada di proyek, polling 30 detik, refetch saat fokus. `queryKey` menyertakan role aktif, dan data diambil ulang saat user mengganti role lewat menu "Ganti Peran".
- Konfigurasi menu sidebar punya properti `countKey` yang cocok dengan key dari endpoint.
- Badge hanya dirender jika `count > 0`; tampilkan `99+` jika lebih dari 99. Tampilan badge: bulatan **berwarna merah** dengan angka berwarna putih (bukan hijau). Pastikan kontras terbaca di mode terang dan mode gelap, serta konsisten dengan skala ukuran badge/teks yang sudah ada. Beri `aria-label` berbahasa Indonesia (mis. "3 naskah menunggu tindakan").
- Badge statis "LOKET" dihapus dari menu Intake Master Fisik, tanpa label pengganti.
- Setelah aksi yang menyelesaikan antrian, panggil invalidate untuk query counts.
- Jika sidebar punya mode collapsed, penanda badge tetap terlihat.

---

## TAHAP A: Investigasi (tidak boleh mengubah kode aplikasi)

Satu-satunya file yang boleh dibuat adalah `docs/notif-antrean-investigasi.md`. Periksa dulu bahwa nama itu belum ada; jika sudah ada, jangan menimpa, pakai nama lain dan laporkan. Jangan mengubah file dokumen acuan yang sudah ada.

0. **Baca dokumen acuan lebih dulu.** Telusuri folder docs dan file dokumentasi lain di repo (README, SOP, PRD, alur status, kontrak/daftar API, konvensi kode, catatan keputusan). Daftarkan semua file yang relevan dengan: alur pentashihan dan status naskah, role dan hak akses, sidebar/navigasi, endpoint API, notifikasi, serta konvensi penamaan dan struktur folder. Untuk setiap aturan di dokumen yang menyentuh fitur ini, catat nama file dan bagiannya. Lalu periksa apakah rencana di file ini (bagian 3 sampai 6) bertentangan dengan salah satunya. Jika ada konflik, catat di bagian "Konflik dengan dokumen acuan" pada file output dan **jangan lanjut ke langkah berikutnya sampai user menjawab** untuk konflik yang menyangkut definisi antrian, status, atau role.
1. Baca `prisma/schema.prisma`: model naskah/registrasi, kolom status/tahap beserta semua nilainya, kolom relasi penugasan (mis. verifikatorId, pentashihId, publisherId), dan model user/role.
2. Temukan sistem role: bagaimana role disimpan, bagaimana middleware auth membaca role, dan mekanisme **ganti peran** (menu "Ganti Peran" di profil mini). Catat dengan jelas: di mana role aktif disimpan (token, sesi server, atau state frontend), apakah role aktif dikirim ke backend (header/body/token baru saat ganti), dan apakah backend memverifikasi bahwa user memang memiliki role yang dikirim.
3. Temukan konfigurasi sidebar frontend untuk **setiap role**: daftar menu, path, nama file komponen. Temukan juga lokasi badge statis "LOKET".
4. Untuk setiap **item sidebar** di setiap role yang berupa antrian tindakan, temukan: halaman yang dibuka, **tab dan sub-tab yang aktif saat item itu diklik** (banyak item sidebar membuka halaman yang sama dengan tab berbeda, mis. item 3, 4, dan 5 di sidebar admin), endpoint list yang dipakai tab tersebut, dan filter Prisma-nya, termasuk apakah difilter per user atau per penerbit. Cocokkan dengan angka "Dalam filter ini" pada tab tersebut.
4a. Verifikasi peta role di bagian 3: nilai enum role di database, dan apakah "Admin"/"Helper Admin" di UI benar-benar `SUPERADMIN`/`ADMIN_INTERNAL`. Laporkan jika berbeda.
5. Khusus role **kepala**: tentukan menu mana yang merupakan antrian tindakan dan statusnya. Jika tidak jelas, tandai "perlu konfirmasi".
6. Cek index Prisma pada kolom yang dipakai filter tersebut.
7. Temukan library data fetching dan lokasi API client di frontend.

**Output** ke `docs/notif-antrean-investigasi.md`, berisi:

- Tabel: `role (nilai DB) | item sidebar | halaman | tab/sub-tab tujuan | key usulan | endpoint list | filter (status + scoping user) | file terkait | status`
- Bagian "Dokumen acuan yang dibaca": daftar file dan ringkasan satu baris relevansinya.
- Bagian "Konflik dengan dokumen acuan": setiap konflik berisi kutipan singkat dokumen (nama file + bagian), isi rencana yang berbeda, dan pilihan yang mungkin. Tulis "tidak ada konflik" jika memang tidak ada. Tambahkan juga perbedaan antara dokumen dan kode yang sudah berjalan, jika ditemukan.
- Kolom status berisi `jelas` atau `perlu konfirmasi`.
- Daftar pertanyaan terbuka untuk user.
- Catatan kolom filter yang belum punya index.
- Role/menu yang bukan antrian ditulis eksplisit sebagai "bukan antrian".

Setelah selesai, **berhenti**. User akan meninjau dan mengonfirmasi tabel sebelum tahap berikutnya.

---

## TAHAP B: Kerangka + role admin dan helper admin (`SUPERADMIN` dan `ADMIN_INTERNAL`, sesuai konfirmasi Tahap A)

Prasyarat: tabel di `docs/notif-antrean-investigasi.md` sudah dikonfirmasi user untuk admin dan helper admin. Jika belum, berhenti dan tanyakan.

1. Buat `queue.config.js` sesuai bagian 6. Isi **hanya** entri untuk admin dan helper admin (helper admin memakai entri yang sama dengan admin; jangan menduplikasi kode, rujuk entri yang sama).
2. Ekstrak filter dari endpoint list yang sudah ada agar dipakai bersama. Perilaku endpoint list tidak boleh berubah.
3. Buat controller dan route `GET /api/me/queue-counts` dengan logika multi-role (bagian 5).
4. Buat hook `useQueueCounts()` dan komponen badge di frontend.
5. Tambahkan `countKey` ke menu sidebar admin dan helper admin.
6. Hapus badge statis "LOKET".
7. Tambahkan invalidate query counts setelah aksi penyelesaian antrian admin.

Pengujian yang harus dilaporkan:
- Angka badge sama dengan jumlah baris di halaman antrian masing-masing menu.
- Badge turun setelah satu naskah diproses, tanpa refresh halaman.
- Menu dengan antrian 0 tidak menampilkan badge.
- Request tanpa token ditolak (401).
- User dengan role admin + role lain: setelah ganti ke role admin, badge hanya menghitung antrian admin. Setelah ganti ke role lain, angka admin hilang dan diganti angka role tersebut.
- Request dengan role aktif yang tidak dimiliki user ditolak (403).

---

## TAHAP C1: Role verifikator — antrean tugas

Item sidebar `VERIFIKATOR` yang dikerjakan:

- “Tugas Verifikasi” (tab default `ASSIGNED`)
- “Siap Dikirim” (`READY_TO_SEND`)
- “Siap Serah Terima” (`BAST_READY`)

Prasyarat: baris tabel ketiga item tersebut di `docs/notif-antrean-investigasi.md` sudah dikonfirmasi user.

1. Tambahkan hanya entri antrean C1 untuk `VERIFIKATOR` ke `queue.config.js`; jangan mengubah entri role lain.
2. Count memakai `verifier_id` dari user yang login, berdasarkan token yang sudah diverifikasi dan role aktif `VERIFIKATOR`. Jangan menerima ID dari parameter client.
3. Pakai ulang filter endpoint list sebagai sumber bersama; jangan menduplikasi kondisi atau mengubah perilaku endpoint list.
4. Jangan memakai `findMany()` lalu `.length`; gunakan `count()`.
5. Tambahkan `countKey` pada ketiga item. Badge merah berisi angka, hanya tampil jika count > 0, dan tampil sebagai `99+` bila lebih dari 99. Hapus badge statis pada ketiga item ini saja; jangan menyentuh item lain.
6. Pastikan query counts diambil ulang saat user mengganti peran dan setelah aksi yang menyelesaikan antrean, misalnya mulai pemeriksaan, mengirim surat, dan serah terima.
7. Jika akun memiliki role verifikator sekaligus admin, list tetap memakai cakupan global yang sudah ada sedangkan badge mengikuti role aktif. Jangan mengubah list; jika badge dan isi halaman berbeda, laporkan lokasi dan penyebabnya.
8. Tambahkan tes unit di `tests/unit/queue.test.js` untuk kunci entri, scoping `verifier_id`, dan memastikan role lain tidak terpengaruh. Gunakan jalur import `../../src/...`.

Verifikasi: jalankan `npm test` di backend, tes frontend, dan `npm run build`; laporkan hasil tiap perintah dan apa yang tidak bisa dijalankan beserta alasannya. Sertakan skenario uji manual dengan dua akun verifikator yang memiliki penugasan berbeda; masing-masing harus melihat angka miliknya sendiri.

## TAHAP C2: Role verifikator — Verifikasi Pembayaran

Item sidebar `VERIFIKATOR` yang dikerjakan:

- “Verifikasi Pembayaran”

“Tanda Tangan Saya” milik `VERIFIKATOR` **tidak dikerjakan**: verifikator tidak memiliki tindakan tanda tangan di alur nyata. `SURAT_HASIL_VERIFIKASI` dan `SURAT_PEMBERITAHUAN_HASIL_VERIFIKASI` memakai Kepala sebagai penandatangan urutan 1, sedangkan signatory Verifikator pada `BERITA_ACARA_VERIFIKASI` sudah `SIGNED` saat pengajuan hasil. Aturan hitung tanda tangan pada dokumen investigasi dipertahankan sebagai referensi Tahap F (Kepala).

Tambahkan hanya key `payment_verification_pending` ke antrean `VERIFIKATOR`. Count memakai `PaymentRecord.count()` untuk status `PAID`, registrasi `PAYMENT_VERIFICATION`, dan registrasi yang memiliki *some* assignment dengan `verifier_id = user.id`, `status = COMPLETED`, serta `decision = PASSED`. ID diambil dari token yang sudah diverifikasi dan count hanya dijalankan untuk role aktif `VERIFIKATOR`; tidak memakai paginasi atau pencarian. Status registrasi termasuk karena aksi `PATCH /api/v1/payments/:id/verify` mensyaratkannya.

Tambahkan `countKey` pada item sidebar “Verifikasi Pembayaran”. Badge merah hanya tampil jika count > 0 dan menampilkan `99+` bila lebih dari 99. Hapus badge statis pada item tersebut bila ada; item “Tanda Tangan Saya” tidak diberi badge dan tidak diubah. Ambil ulang counts setelah aksi verifikasi pembayaran dan saat ganti peran.

Jangan mengubah endpoint/list pembayaran. List saat ini hanya memfilter `PAID` (dan tetap dapat bersifat global untuk akun multi-role), sedangkan badge di-scope ke assignment user aktif; selisih tersebut diketahui dan diterima. Tes unit di `tests/unit/queue.test.js` harus memastikan key baru, scoping memakai `user.id`, dan role lain tidak terpengaruh.

## TAHAP D: Role penerbit
## TAHAP E: Role pentashih
## TAHAP F: Role kepala
## TAHAP G: Role distributor
## TAHAP H: Role dokumentator

Prasyarat tiap tahap: baris tabel role tersebut di `docs/notif-antrean-investigasi.md` sudah dikonfirmasi user. Jika statusnya masih "perlu konfirmasi", berhenti dan tanyakan.

Langkah (sama untuk setiap role, ganti X dengan role di tahap yang diminta):

1. Tambahkan entri role X ke `queue.config.js` berdasarkan tabel yang sudah dikonfirmasi. **Jangan mengubah entri role lain.**
2. Pastikan `buildWhere(user)` menyertakan scoping yang benar (ID user atau ID penerbit dari token), sesuai tabel.
3. Gunakan ulang filter endpoint list; jangan menduplikasi kondisi.
4. Tambahkan `countKey` ke menu sidebar role X.
5. Tambahkan invalidate query counts setelah aksi penyelesaian antrian role X.
6. Jika investigasi mencatat kolom filter tanpa index, usulkan migrasi index Prisma dan **tanyakan dulu** sebelum membuat migrasi.

Pengujian yang harus dilaporkan:
- Angka badge sama dengan isi halaman antrian role X.
- Untuk role yang di-scope per user: dua akun berbeda dari role yang sama hanya melihat antriannya masing-masing.
- Akun dengan role X + role lain: saat role aktif X, badge hanya antrian role X; saat berganti ke role lain, badge role X hilang dan tidak ada angka lama yang tertinggal.

---

## TAHAP I: Finalisasi

1. Tinjau seluruh `queue.config.js`: tidak ada filter duplikat, semua role di bagian 3 tercakup atau tercatat sebagai "bukan antrian".
2. Periksa tidak ada query N+1 dan semua `count()` berjalan paralel.
3. Jalankan lint dan test yang ada (type-check hanya jika proyek punya konfigurasinya).
4. Buat ringkasan akhir: daftar key per role, file yang berubah, dan catatan teknis yang perlu diketahui tim backend.
