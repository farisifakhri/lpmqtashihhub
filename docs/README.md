# Dokumentasi Sistem Manajemen Layanan Pentashihan LPMQ

Dokumen ini berfungsi sebagai peta navigasi dan indeks seluruh dokumentasi teknis, regulasi operasional, arsitektur, dan pelacakan tugas pada proyek LPMQ Tashih Hub.

---

## Struktur Direktori `docs/`

```text
docs/
├── README.md                           <- Peta navigasi dokumentasi (file ini)
├── GLOSARIUM.md                        <- Rujukan resmi glosarium istilah & anti-bahasa sistem (B-12)
├── MASTER_PLAN.md                      <- Snapshot master plan dan keputusan arsitektur awal
├── publisher-dashboard.md              <- Spesifikasi dashboard & portal penerbit
│
├── api/                                <- Spesifikasi kontrak API
│   ├── KONTRAK_PENDAFTARAN_PENERBIT.md <- Kontrak API pendaftaran akun & legalitas penerbit
│   └── workflow.md                     <- Kontrak alur kerja, state machine, & endpoint operasional
│
├── architecture/                       <- Desain arsitektur dan sistem
│   ├── design.md                       <- Prinsip desain antarmuka, warna peran, dan UX
│   ├── implementation.md               <- Standar implementasi kode, pola service, & error handling
│   ├── pengajuan-naskah-varian.md      <- Arsitektur multi-naskah & varian ukuran/oplah (B-01)
│   └── user-flows.md                   <- Alur pengguna langkah-demi-langkah per peran
│
├── diagrams/                           <- Diagram alur kerja
│   └── user-flow.mermaid               <- Diagram alur proses pendaftaran hingga STT
│
├── keamanan/                           <- Dokumentasi hardening dan audit keamanan
│   └── AUDIT_DASAR.md                  <- Hasil audit celah keamanan (IDOR, XSS, RBAC, input sanitasi)
│
├── references/                         <- Dokumen acuan resmi & keputusan rapat
│   ├── README.md                       <- Indeks referensi keputusan & SK
│   ├── keputusan-*.md                  <- Notulensi dan penetapan keputusan operasional
│   └── sop/                            <- Dokumen SOP resmi Kementerian Agama RI (Excel)
│       ├── 3. SOP Pendaftaran Mushaf Al-Qur'an_rev.xlsx
│       ├── 4. SOP Distribusi Master Mushaf Al-Qur'an.xlsx
│       ├── 4. SOP Pentashihan Master Mushaf Al-Qur'an_rev.xlsx
│       ├── SOP Verifikasi Mushaf Al-Quran.xlsx
│       └── SOP Dokumentasikan Mushaf Al-Qur'an_rev.xlsx
│
├── srs/                                <- Dokumen Software Requirements Specification (Aktif)
│   ├── SRS Sistem Manajemen Layanan Pentashihan LPMQ v3.1 (Draf) + Rencana Implementasi.docx
│   └── Rencana Implementasi SRS v3.1 dan Status Repositori LPMQ.docx
│
├── tugas/                              <- Pelacakan backlog dan sprint pengerjaan
│   ├── README.md                       <- Peta tugas tindak lanjut notulensi & status implementasi
│   ├── BACKLOG-FASE-LANJUTAN.md        <- Rincian backlog fase lanjutan (B-01 s.d. B-13)
│   ├── faisal/                         <- Paket tugas frontend pendaftaran penerbit (T-S01 - T-S03)
│   └── fakhri/                         <- Paket tugas backend, RBAC, dan distribusi (T-F01 - T-F07, B-02 - B-08)
│
└── archive/                            <- Arsip dokumen versi terdahulu (historis)
    ├── SOP Dokumentasikan Mushaf Al-Qur'an.xlsx  (Sebelum revisi)
    ├── UAT_FINDINGS.txt                          (Register temuan UAT Okt 2026 - seluruh poin telah selesai)
    └── srs/                                      (Arsip SRS versi sebelumnya)
        ├── SRS_Sistem_Pentashihan_LPMQ_v2.2.docx
        ├── SRS Sistem Manajemen Layanan Pentashihan LPMQ v3.0.docx
        └── Backlog_MVP_Sistem_Pentashihan_LPMQ_v2.2.xlsx
```

---

## Dokumen Acuan Cepat (Quick Links)

| Topik | Dokumen Utama |
|---|---|
| **Alur Kerja & Endpoint API** | [docs/api/workflow.md](api/workflow.md) |
| **Pendaftaran Badan Hukum Penerbit** | [docs/api/KONTRAK_PENDAFTARAN_PENERBIT.md](api/KONTRAK_PENDAFTARAN_PENERBIT.md) |
| **Multi-Naskah & Varian Ukuran/Oplah** | [docs/architecture/pengajuan-naskah-varian.md](architecture/pengajuan-naskah-varian.md) |
| **Desain UI & Palet Warna Peran** | [docs/architecture/design.md](architecture/design.md) |
| **Status Penyelesaian Backlog** | [docs/tugas/README.md](tugas/README.md) & [docs/tugas/BACKLOG-FASE-LANJUTAN.md](tugas/BACKLOG-FASE-LANJUTAN.md) |
| **Glosarium Istilah Resmi & Anti-Bahasa Sistem** | [docs/GLOSARIUM.md](GLOSARIUM.md) |
| **SOP Resmi Kemenag RI** | Folder [docs/references/sop/](references/sop/) |

