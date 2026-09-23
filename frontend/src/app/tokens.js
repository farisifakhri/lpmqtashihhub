/**
 * Design Tokens resmi Sistem Manajemen Layanan Pentashihan Mushaf Al-Qur'an (LPMQ)
 * Acuan: Backlog Redesign UI/UX v1, DESIGN.md §2 & §3
 *
 * Prinsip: Operational Government Workspace
 * - Rasio warna: Hijau Tua · Putih · Emas Terbatas (±30/60/10)
 * - 5 Keluarga Semantik: Slate (Netral/Draf), Biru (Diproses), Amber (Tindakan), Merah (Masalah), Hijau (Selesai/Sah)
 * - 8 Fase Alur Manusiawi: Pendaftaran, Verifikasi, Pembayaran, Serah-terima, Pentashihan, Penerbitan STT, Dokumentasi, Selesai
 */

import { WORKFLOW_PHASES } from '@/features/workflow/workflow-phases';
export { WORKFLOW_PHASES };

export const TOKENS = {
  colors: {
    // Primary - Deep Islamic Pine / Sovereign Forest
    primary950: '#031C13',
    primary900: '#083224',
    primary800: '#0B3F2D',
    primary700: '#0E5139', // Header, sidebar aktif, tombol utama
    primary600: '#116447',
    primary500: '#167A58', // Aksen tombol, ikon aktif, tab terpilih
    primary200: '#BCE1D0',
    primary100: '#DDF0E7', // Latar kartu info, hover, badge positif
    primary50:  '#F0F7F4',

    // Netral - Crisp Slate Neutrals
    neutralWhite: '#FFFFFF', // Latar kartu permukaan utama
    neutral50: '#F8FAFC',    // Latar kanvas aplikasi polos (Level 0)
    neutral100: '#F1F5F9',   // Latar section / tabel sekunder (Level 1)
    neutral200: '#E2E8F0',   // Border/garis pemisah
    neutral300: '#CBD5E1',   // Input border
    neutral400: '#94A3B8',
    neutral500: '#64748B',   // Teks sekunder, metadata
    neutral600: '#475569',
    neutral700: '#334155',   // Teks isi/body (min 14px)
    neutral800: '#1E293B',
    neutral900: '#0F172A',   // Teks gelap tegas
    neutral950: '#020617',   // Heading pekat

    // Aksen Emas Sandstone / Imperial Brass (Terbatas pada dokumen resmi, billing, pengesahan)
    accentGold700: '#865714',
    accentGold600: '#A97516',
    accentGold500: '#C99320', // Highlight nominal tarif/PNBP
    accentGold400: '#DFB045',
    accentGold100: '#F9F0D3',
    accentGold50:  '#FDF9EE', // Latar kartu ringkasan tarif/billing

    // 5 Keluarga Semantik
    semantic: {
      neutral: { bg: 'bg-slate-100', text: 'text-slate-800', border: 'border-slate-300' },
      info:    { bg: 'bg-sky-50',    text: 'text-sky-800',    border: 'border-sky-300' },
      warning: { bg: 'bg-amber-50',  text: 'text-amber-900',  border: 'border-amber-300' },
      danger:  { bg: 'bg-rose-50',   text: 'text-rose-900',   border: 'border-rose-300' },
      success: { bg: 'bg-emerald-50',text: 'text-emerald-900',border: 'border-emerald-300' },
      gold:    { bg: 'bg-gold-50',   text: 'text-gold-900',   border: 'border-gold-300' },
    },
  },

  typography: {
    fontSans: '"Plus Jakarta Sans", Inter, system-ui, -apple-system, sans-serif',
    fontSerif: '"Amiri", "Traditional Arabic", Georgia, serif',
  },

  // State Machine Status Mapping (Backlog UX-03, UX-04, §9)
  registrationStatus: {
    DRAFT: {
      label: 'Draf Pengajuan',
      phaseKey: 'REGISTRATION',
      phaseLabel: 'Pendaftaran',
      bgClass: 'bg-slate-100',
      textClass: 'text-slate-800',
      borderClass: 'border-slate-300',
      description: 'Pengajuan baru, berkas atau data naskah belum lengkap.',
      actionOwner: 'Penerbit',
      nextAction: 'Lengkapi berkas & ajukan',
    },
    READY_FOR_VERIFICATION: {
      label: 'Siap Ditugaskan',
      phaseKey: 'VERIFICATION',
      phaseLabel: 'Verifikasi',
      bgClass: 'bg-sky-50',
      textClass: 'text-sky-800',
      borderClass: 'border-sky-200',
      description: 'Pengajuan diajukan penerbit, menunggu Kepala LPMQ menugaskan verifikator.',
      actionOwner: 'Kepala LPMQ',
      nextAction: 'Terbitkan Nota Dinas & tugaskan verifikator',
    },
    VERIFICATION_ASSIGNED: {
      label: 'Verifikator Ditugaskan',
      phaseKey: 'VERIFICATION',
      phaseLabel: 'Verifikasi',
      bgClass: 'bg-sky-50',
      textClass: 'text-sky-800',
      borderClass: 'border-sky-200',
      description: 'Nota Dinas terbit, verifikator terpilih dapat memulai pemeriksaan.',
      actionOwner: 'Verifikator',
      nextAction: 'Mulai pemeriksaan naskah',
    },
    IN_VERIFICATION: {
      label: 'Sedang Diverifikasi',
      phaseKey: 'VERIFICATION',
      phaseLabel: 'Verifikasi',
      bgClass: 'bg-sky-50',
      textClass: 'text-sky-800',
      borderClass: 'border-sky-200',
      description: 'Verifikator sedang memeriksa kelengkapan administrasi dan fisik naskah.',
      actionOwner: 'Verifikator',
      nextAction: 'Selesaikan checklist & susun draf surat',
    },
    REVISION_REQUIRED: {
      label: 'Perlu Perbaikan Berkas',
      phaseKey: 'VERIFICATION',
      phaseLabel: 'Verifikasi',
      bgClass: 'bg-amber-50',
      textClass: 'text-amber-900',
      borderClass: 'border-amber-300',
      description: 'Ditemukan kekurangan berkas yang harus diperbaiki oleh penerbit.',
      actionOwner: 'Penerbit',
      nextAction: 'Unggah perbaikan sesuai catatan',
    },
    WAITING_VERIFICATION_APPROVAL: {
      label: 'Menunggu Persetujuan Kepala',
      phaseKey: 'VERIFICATION',
      phaseLabel: 'Verifikasi',
      bgClass: 'bg-amber-50',
      textClass: 'text-amber-900',
      borderClass: 'border-amber-300',
      description: 'Draf hasil telaah menunggu reviu dan persetujuan Kepala LPMQ.',
      actionOwner: 'Kepala LPMQ',
      nextAction: 'Tinjau draf & setujui / kembalikan',
    },
    VERIFICATION_APPROVED: {
      label: 'Surat Disetujui',
      phaseKey: 'VERIFICATION',
      phaseLabel: 'Verifikasi',
      bgClass: 'bg-emerald-50',
      textClass: 'text-emerald-900',
      borderClass: 'border-emerald-300',
      description: 'Surat hasil telaah disetujui Kepala; menunggu verifikator mengirim surat.',
      actionOwner: 'Verifikator',
      nextAction: 'Kirim surat hasil verifikasi',
    },
    AWAITING_PAYMENT: {
      label: 'Menunggu Pembayaran',
      phaseKey: 'PAYMENT',
      phaseLabel: 'Pembayaran',
      bgClass: 'bg-amber-50',
      textClass: 'text-amber-900',
      borderClass: 'border-amber-300',
      description: 'Kode billing PNBP SIMPONI telah diterbitkan (berlaku 7 hari kalender).',
      actionOwner: 'Penerbit',
      nextAction: 'Lakukan pembayaran & konfirmasi NTPN',
    },
    PAYMENT_VERIFICATION: {
      label: 'Verifikasi Pembayaran',
      phaseKey: 'PAYMENT',
      phaseLabel: 'Pembayaran',
      bgClass: 'bg-sky-50',
      textClass: 'text-sky-800',
      borderClass: 'border-sky-200',
      description: 'Bukti bayar diunggah penerbit; menunggu verifikator memeriksa keabsahan setoran.',
      actionOwner: 'Verifikator',
      nextAction: 'Periksa bukti bayar & sahkan',
    },
    WAITING_DISTRIBUTOR_RECEIPT: {
      label: 'Menunggu Konfirmasi Distributor',
      phaseKey: 'HANDOVER',
      phaseLabel: 'Serah-terima',
      bgClass: 'bg-sky-50',
      textClass: 'text-sky-800',
      borderClass: 'border-sky-200',
      description: 'Master fisik diserahkan ke distributor; menunggu konfirmasi fisik & penetapan deadline.',
      actionOwner: 'Distributor',
      nextAction: 'Konfirmasi fisik & tetapkan target tashih',
    },
    PHYSICAL_HANDOVER_CORRECTION_REQUIRED: {
      label: 'Perlu Koreksi Master Fisik',
      phaseKey: 'HANDOVER',
      phaseLabel: 'Serah-terima',
      bgClass: 'bg-rose-50',
      textClass: 'text-rose-900',
      borderClass: 'border-rose-300',
      description: 'Master fisik cacat/tidak lengkap dikembalikan distributor; penerbit perlu mengganti fisik.',
      actionOwner: 'Penerbit',
      nextAction: 'Serahkan penggantian master fisik ke LPMQ',
    },
    WAITING_DISTRIBUTION: {
      label: 'Siap Penugasan Tim',
      phaseKey: 'TASHIH',
      phaseLabel: 'Pentashihan',
      bgClass: 'bg-sky-50',
      textClass: 'text-sky-800',
      borderClass: 'border-sky-200',
      description: 'Master fisik diterima distributor; siap ditetapkan tim pentashih.',
      actionOwner: 'Distributor / Admin',
      nextAction: 'Tetapkan anggota tim pentashih',
    },
    TASHIH_IN_PROGRESS: {
      label: 'Sidang Tashih Berjalan',
      phaseKey: 'TASHIH',
      phaseLabel: 'Pentashihan',
      bgClass: 'bg-sky-50',
      textClass: 'text-sky-800',
      borderClass: 'border-sky-200',
      description: 'Tim pentashih sedang menelaah ayat, tanda baca, dan format mushaf.',
      actionOwner: 'Tim Pentashih',
      nextAction: 'Catat hasil telaah & rekomendasi',
    },
    READY_FOR_STT: {
      label: 'Siap Penetapan STT',
      phaseKey: 'STT_ISSUANCE',
      phaseLabel: 'Penerbitan STT',
      bgClass: 'bg-emerald-50',
      textClass: 'text-emerald-900',
      borderClass: 'border-emerald-300',
      description: 'Naskah dumi bersih dan telah disetujui; siap ditetapkan Surat Tanda Tashih.',
      actionOwner: 'Kepala LPMQ',
      nextAction: 'Tetapkan & tanda tangani STT resmi',
    },
    STT_ISSUED: {
      label: 'STT Ditetapkan',
      phaseKey: 'STT_ISSUANCE',
      phaseLabel: 'Penerbitan STT',
      bgClass: 'bg-emerald-50',
      textClass: 'text-emerald-900',
      borderClass: 'border-emerald-300',
      description: 'Surat Tanda Tashih telah ditetapkan; dokumen resmi aktif.',
      actionOwner: 'Dokumentator',
      nextAction: 'Lanjutkan pemberkasan dokumentasi',
    },
    DOCUMENTATION_IN_PROGRESS: {
      label: 'Pemberkasan Dokumentasi',
      phaseKey: 'DOCUMENTATION',
      phaseLabel: 'Dokumentasi',
      bgClass: 'bg-sky-50',
      textClass: 'text-sky-800',
      borderClass: 'border-sky-200',
      description: 'Penyusunan Berita Acara Tashih & penerimaan 5 eksemplar naskah cetak.',
      actionOwner: 'Dokumentator',
      nextAction: 'Verifikasi tanda terima deposit naskah',
    },
    DOCUMENTATION: {
      label: 'Pemberkasan Dokumen',
      phaseKey: 'DOCUMENTATION',
      phaseLabel: 'Dokumentasi',
      bgClass: 'bg-sky-50',
      textClass: 'text-sky-800',
      borderClass: 'border-sky-200',
      description: 'Penyusunan Berita Acara Tashih & verifikasi akhir dokumen.',
      actionOwner: 'Dokumentator',
      nextAction: 'Selesaikan pengarsipan dokumen',
    },
    COMPLETED: {
      label: 'Selesai (Surat Terbit)',
      phaseKey: 'COMPLETED',
      phaseLabel: 'Selesai',
      bgClass: 'bg-emerald-50',
      textClass: 'text-emerald-900',
      borderClass: 'border-emerald-300',
      description: 'Seluruh rangkaian pentashihan, STT, dan dokumentasi telah tuntas.',
      actionOwner: 'LPMQ',
      nextAction: 'Arsip selesai',
    },
    CANCELLED: {
      label: 'Dibatalkan',
      phaseKey: 'REGISTRATION',
      phaseLabel: 'Pendaftaran',
      bgClass: 'bg-rose-50',
      textClass: 'text-rose-900',
      borderClass: 'border-rose-300',
      description: 'Pengajuan dibatalkan sebelum tahapan pembayaran atau penetapan.',
      actionOwner: 'Penerbit / Admin',
      nextAction: 'Tidak ada tindakan lanjutan',
    },
  },

  paymentStatus: {
    UNPAID: {
      label: 'Menunggu Pembayaran',
      bgClass: 'bg-amber-50',
      textClass: 'text-amber-900',
      borderClass: 'border-amber-300',
      description: 'Kode billing aktif, menunggu penyetoran oleh penerbit',
    },
    PAID: {
      label: 'Menunggu Verifikasi',
      bgClass: 'bg-sky-50',
      textClass: 'text-sky-800',
      borderClass: 'border-sky-200',
      description: 'Bukti bayar telah dikirimkan, menunggu verifikasi petugas',
    },
    VERIFIED: {
      label: 'Lunas & Sah',
      bgClass: 'bg-emerald-50',
      textClass: 'text-emerald-900',
      borderClass: 'border-emerald-300',
      description: 'Pembayaran PNBP telah diverifikasi sah',
    },
    EXPIRED: {
      label: 'Kedaluwarsa',
      bgClass: 'bg-rose-50',
      textClass: 'text-rose-900',
      borderClass: 'border-rose-300',
      description: 'Masa berlaku kode billing 7 hari kalender telah berakhir',
    },
    REJECTED: {
      label: 'Bukti Ditolak',
      bgClass: 'bg-rose-50',
      textClass: 'text-rose-900',
      borderClass: 'border-rose-300',
      description: 'Bukti bayar tidak sesuai atau NTPN tidak valid',
    },
    WAIVED: {
      label: 'Bebas Tarif',
      bgClass: 'bg-sky-50',
      textClass: 'text-sky-800',
      borderClass: 'border-sky-200',
      description: 'Pengajuan dikecualikan dari tarif PNBP sesuai ketentuan',
    },
  },

  tashihStages: {
    INITIAL: { label: 'Tashih Naskah Awal', step: 1 },
    REVISION: { label: 'Tashih Perbaikan Naskah', step: 2 },
    DUMI: { label: 'Tashih Naskah Dumi (Final)', step: 3 },
  },

  externalSyncStatus: {
    PENDING: {
      label: 'Menunggu integrasi resmi',
      bgClass: 'bg-slate-100',
      textClass: 'text-slate-700',
      borderClass: 'border-slate-200',
      description: 'Menunggu kredensial dan endpoint API resmi dari sistem pusat.',
    },
    SYNCED: {
      label: 'Tersinkronisasi',
      bgClass: 'bg-emerald-50',
      textClass: 'text-emerald-800',
      borderClass: 'border-emerald-200',
      description: 'Data pendaftaran berhasil tersinkronisasi ke website existing.',
    },
    FAILED_CONFIGURATION: {
      label: 'Konfigurasi Belum Lengkap',
      bgClass: 'bg-amber-50',
      textClass: 'text-amber-800',
      borderClass: 'border-amber-200',
      description: 'URL integrasi tersedia namun API key belum dikonfigurasi.',
    },
    FAILED: {
      label: 'Gagal Sinkronisasi',
      bgClass: 'bg-rose-50',
      textClass: 'text-rose-800',
      borderClass: 'border-rose-200',
      description: 'Gagal terhubung atau server eksternal merespons error.',
    },
  },
};
