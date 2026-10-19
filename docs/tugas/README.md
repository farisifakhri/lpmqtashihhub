# Peta Tugas: Tindak Lanjut Notulensi Rapat 15 Okt 2026

Dokumen ini adalah pintu masuk. Setiap paket pekerjaan punya file sendiri dan **satu branch sendiri**.

- Disusun: 19 Okt 2026
- Sumber: notulensi rapat laporan magang (15 Okt 2026), jawaban klarifikasi, dan dokumen label pengembalian naskah
- Pemilik: Fakhri (backend, koordinasi, review) dan Faisal (frontend pendaftaran penerbit)

## 1. Isi folder

| File | Pemilik | Branch |
|---|---|---|
| `fakhri/T-F01-kontrak-api.md` | Fakhri | `docs/kontrak-api-pendaftaran-penerbit` |
| `fakhri/T-F02-rbac-admin-internal.md` | Fakhri | `feat/rbac-admin-internal` |
| `fakhri/T-F03-bersihkan-data-perorangan.md` | Fakhri | `chore/bersihkan-data-penerbit-perorangan` |
| `fakhri/T-F04-skema-pendaftaran-penerbit.md` | Fakhri | `feat/skema-pendaftaran-penerbit` |
| `fakhri/T-F05-upload-dokumen-aman.md` | Fakhri | `feat/upload-dokumen-aman` |
| `fakhri/T-F06-api-pendaftaran-penerbit.md` | Fakhri | `feat/api-pendaftaran-penerbit` |
| `fakhri/T-F07-hardening-keamanan.md` | Fakhri | `chore/hardening-keamanan-dasar` |
| `faisal/T-S01-form-pendaftaran-penerbit.md` | Faisal | `feat/fe-form-pendaftaran-penerbit` |
| `faisal/T-S02-cek-status-dan-perbaikan.md` | Faisal | `feat/fe-cek-status-dan-perbaikan` |
| `faisal/T-S03-verifikasi-penerbit-admin.md` | Faisal | `feat/fe-verifikasi-penerbit-admin` |
| `BACKLOG-FASE-LANJUTAN.md` | Fakhri (usulan) | satu branch per paket B-xx |
| `../api/KONTRAK_PENDAFTARAN_PENERBIT.md` | Fakhri, dibaca Faisal | lihat T-F01 |

## 2. Urutan dan dependensi (Fase 1: pendaftaran penerbit)

```
T-F01 kontrak API ──┬─► T-S01 form ───────────┐
                    ├─► T-S02 cek status ──────┤
                    │                          ├─► integrasi dengan API nyata
T-F02 RBAC ADMIN ───┤                          │
T-F03 bersihkan ────┴─► T-F04 skema ─► T-F05 upload aman ─► T-F06 API ─► T-S03 admin
T-F07 hardening: paralel, kapan saja setelah BASE ditetapkan
```

Aturan urutan:
1. T-F01 dikerjakan paling awal karena membuka pekerjaan Faisal.
2. T-F03 (hapus data perorangan) harus jalan di setiap lingkungan **sebelum** migrasi T-F04 yang membuang nilai "perorangan" dari enum.
3. T-S01 dan T-S02 bisa mulai setelah T-F01 dibekukan. Integrasi dengan API nyata menunggu T-F06.
4. T-S03 menunggu T-F06 dan T-F02.

## 3. Langkah 0: tetapkan branch dasar (`<BASE>`)

Semua branch fitur dibuat dari **satu** `<BASE>` yang sama. Jangan dari `frontend-pendaftaran-byN`.

- [x] Push commit lokal `2180f43` (branch `verifikasi` sudah digabung ke `main` via PR #9).
- [x] Putuskan `<BASE>`: `main` (semua patch production PR #33 dan fitur verifikasi sudah menyatu di `main`).
- [x] Tulis pilihan di sini: `<BASE> = main`
- [ ] Beri tahu Faisal nama `<BASE>` sebelum ia membuat branch pertama.

## 4. Aturan branch dan PR

- Satu paket = satu branch = satu PR. Nama: `<tipe>/<slug>` dengan tipe `feat`, `fix`, `chore`, `docs`.
- Buat dari `<BASE>` terbaru. Rebase ke `<BASE>` sebelum membuka PR. Commit kecil dan jelas.
- Migrasi Prisma: skema pendaftaran penerbit hanya diubah lewat T-F04 (satu migrasi, satu pemilik) agar tidak ada dua migrasi paralel. Migrasi yang sudah diterapkan **tidak boleh diedit**.
- Jika Faisal memerlukan perubahan skema atau backend: buka PR terpisah ke Fakhri (bukan langsung ke `<BASE>`), lengkap dengan file migrasi, lalu direview dengan daftar di bagian 5.
- Kode peran harus sama dengan backend: `SUPERADMIN`, `ADMIN`, `ADMIN_PENERBIT`, `VERIFIKATOR`, `DISTRIBUTOR`, `PENTASHIH`, `DOKUMENTATOR`, `KEPALA_LPMQ`. Nama peran lama di cabang frontend (`PUBLISHER`, `TASHIH_MEMBER`, dan seterusnya) tidak dipakai.
- Tidak ada data tiruan di aplikasi yang dikirim. Data contoh hanya di test, dan tidak memuat data pribadi sungguhan (nama, telepon, KTP).
- Tidak ada rahasia (kata sandi, kunci, token) di repositori.

## 5. Daftar periksa review PR (terutama dari Faisal)

- [ ] Semua validasi penting ada di **server**, bukan hanya di frontend
- [ ] Kode peran sama dengan backend
- [ ] Login penerbit belum terverifikasi ditolak di backend
- [ ] Tidak ada opsi atau nilai "perorangan"
- [ ] File disimpan di luar web root dengan nama acak, dan unduhan lewat otorisasi
- [ ] Migrasi baru, tidak mengedit migrasi lama
- [ ] `npm run test:unit` dan `npm test` lolos, build lolos
- [ ] Tidak ada data pribadi atau rahasia di commit

## 6. Keputusan yang sudah dikunci

Pendaftaran penerbit:
- Hanya PT/CV, Yayasan, Lembaga Pemerintah. Tidak ada perorangan. Data perorangan yang ada adalah data uji dan dihapus semua.
- Dokumen per jenis mengikuti `KONTRAK_PENDAFTARAN_PENERBIT.md`. NIB cukup (SIUP/TDP tidak diwajibkan).
- Penerbit wajib mengajukan pendaftaran dan diverifikasi oleh SUPERADMIN dan/atau admin internal sebelum mengajukan naskah atau mengakses dashboard.
- Penerbit belum terverifikasi **tidak boleh login**. Ada halaman khusus cek status pendaftaran.
- "Perlu perbaikan" dibedakan dari "ditolak". Ditolak bersifat final.
- Alamat pengiriman adalah alamat penerbit.

Alur naskah (untuk fase lanjutan):
- Satu pengajuan boleh berisi banyak naskah. **STT per pengajuan** dan menunggu semua naskah. Jika diajukan terpisah, STT terpisah.
- Surat hasil per naskah × ukuran × oplah. Kewajiban 5 eksemplar berlaku per surat hasil, hanya untuk cetak fisik.
- Perbaikan dalam satu pengajuan dilakukan serentak.
- Rekapan pentashih masuk sistem (internal), terlihat pentashih dan distributor, tidak dikembalikan ke penerbit. Penerbit merekap sendiri dan mengunggah rekapnya.
- Resi masuk diisi penerbit. Admin internal mengonfirmasi penerimaan fisik lalu meneruskan ke distributor yang sama. SLA dimulai sejak konfirmasi itu. Distributor mengirim balik dan mencatat resi keluar.
- Status "menunggu penerbit" tidak dihitung SLA, tanpa tenggat, dengan pengingat berkala tanpa konsekuensi dan indikator umur untuk admin.
- Batas 5 eksemplar: satu bulan kalender sejak STT dan surat hasil terbit. Status faktual "kewajiban eksemplar belum terpenuhi" terpisah dari label "penerbit bermasalah" yang ditetapkan admin.

## 7. Asumsi yang masih perlu dikonfirmasi

- Format nomor surat belum ada. Dibuat default dan bisa diganti lewat konfigurasi.
- Arti kalimat notulensi "halaman login: peringatan menghapus" belum jelas. Jangan diubah sebelum dikonfirmasi.
- Keluhan UX dokumentator belum konkret. Kumpulkan contoh langkah yang membingungkan sebelum mengerjakan.
- Kanal notifikasi: email dulu. Penyedia email dan kredensialnya di server belum ditetapkan.
- Masa berlaku tautan perbaikan dan format kode pendaftaran: usulan di kontrak, perlu disetujui.

## 8. Glosarium sementara

- Gunakan "penerbit" (bukan "pemohon"), dan "permohonan" untuk pengajuan naskah sesuai notulensi 1 Okt 2026.
- Istilah di label pengiriman dan surat harus mengikuti nama menu di aplikasi baru, bukan situs lama.
