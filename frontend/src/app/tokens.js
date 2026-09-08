/**
 * Design Tokens resmi Sistem Manajemen Layanan Pentashihan Mushaf Al-Qur'an (LPMQ)
 * Acuan: DESIGN.md §2 & §3
 *
 * Rasio warna: Hijau · Putih · Emas (±30/60/10)
 * Hindari hardcode hex di komponen. Gunakan konstanta ini atau class Tailwind terkait.
 */

export const TOKENS = {
  colors: {
    // Primary - Hijau Kemenag
    primary700: '#0B5E3B', // Header, sidebar aktif, tombol utama
    primary500: '#1B7A4D', // Aksen tombol, ikon aktif, tab terpilih
    primary100: '#E3F3EA', // Latar kartu info, hover, badge positif

    // Netral
    neutralWhite: '#FFFFFF', // Latar dominan (±70% luas layar)
    neutral50: '#F7F8F6',    // Latar halaman
    neutral200: '#E1E4E0',   // Border/garis pemisah
    neutral500: '#8A8F8B',   // Teks sekunder, status Draft
    neutral700: '#2A2E2B',   // Teks isi/body
    neutral900: '#141615',   // Teks gelap tegas

    // Aksen Emas
    accentGold600: '#B8860B', // Aksen dokumen resmi, ikon terverifikasi
    accentGold400: '#D4AF37', // Highlight nominal tarif/PNBP
    accentGold50: '#FBF6E7',  // Latar kartu ringkasan tarif/billing

    // Status
    statusWarning: '#C77B2A', // Perlu Perbaikan, Menunggu Pembayaran
    statusDanger: '#B3261E',  // Ditolak, Dibatalkan
    statusInfo: '#2E6F95',    // Sedang Diverifikasi / Diproses
    statusSuccess: '#1B7A4D', // Selesai / Terverifikasi
  },

  typography: {
    fontSans: '"Plus Jakarta Sans", Inter, system-ui, sans-serif',
    fontSerif: '"Amiri", "Traditional Arabic", Georgia, serif',
  },

  // State Machine Status Mapping (DESIGN.md §3 & IMPLEMENTATION.md §4)
  registrationStatus: {
    DRAFT: {
      label: 'Draft',
      bgClass: 'bg-neutral-100',
      textClass: 'text-neutral-700',
      borderClass: 'border-neutral-300',
      description: 'Pengajuan baru, belum dikirim ke verifikator',
    },
    READY_FOR_VERIFICATION: {
      label: 'Siap Diverifikasi',
      bgClass: 'bg-emerald-50',
      textClass: 'text-emerald-800',
      borderClass: 'border-emerald-200',
      description: 'Dokumen lengkap, menunggu verifikator mengambil antrean',
    },
    IN_VERIFICATION: {
      label: 'Sedang Diverifikasi',
      bgClass: 'bg-sky-50',
      textClass: 'text-[#2E6F95]',
      borderClass: 'border-sky-200',
      description: 'Verifikator sedang memeriksa kelengkapan administrasi dan naskah',
    },
    REVISION_REQUIRED: {
      label: 'Perlu Perbaikan',
      bgClass: 'bg-amber-50',
      textClass: 'text-[#C77B2A]',
      borderClass: 'border-amber-200',
      description: 'Ditemukan kekurangan berkas yang harus diperbaiki penerbit',
    },
    WAITING_DISTRIBUTION: {
      label: 'Menunggu Distribusi',
      bgClass: 'bg-emerald-100',
      textClass: 'text-primary-700',
      borderClass: 'border-emerald-300',
      description: 'Verifikasi lolos, menunggu penugasan tim pentashih',
    },
    TASHIH_IN_PROGRESS: {
      label: 'Proses Tashih Berjalan',
      bgClass: 'bg-primary-100',
      textClass: 'text-primary-700',
      borderClass: 'border-primary-500',
      description: 'Tim pentashih sedang memeriksa ayat dan tanda baca mushaf',
    },
    DOCUMENTATION: {
      label: 'Pemberkasan Dokumen',
      bgClass: 'bg-teal-50',
      textClass: 'text-teal-900',
      borderClass: 'border-teal-300',
      description: 'Penyusunan Berita Acara Tashih & verifikasi akhir dokumen',
    },
    COMPLETED: {
      label: 'Selesai (Surat Terbit)',
      bgClass: 'bg-emerald-50',
      textClass: 'text-emerald-900',
      borderClass: 'border-gold-400',
      description: 'Surat Tanda Tashih telah ditetapkan oleh Kepala LPMQ',
    },
    CANCELLED: {
      label: 'Dibatalkan',
      bgClass: 'bg-rose-50',
      textClass: 'text-[#B3261E]',
      borderClass: 'border-rose-200',
      description: 'Pengajuan dibatalkan sebelum proses penagihan/penetapan',
    },
  },

  paymentStatus: {
    UNPAID: { label: 'Belum Dibayar', color: '#C77B2A' },
    PAID: { label: 'Lunas', color: '#1B7A4D' },
    EXPIRED: { label: 'Kedaluwarsa', color: '#B3261E' },
    WAIVED: { label: 'Bebas Tarif', color: '#2E6F95' },
  },

  tashihStages: {
    INITIAL: { label: 'Tashih Naskah Awal', step: 1 },
    REVISION: { label: 'Tashih Perbaikan Naskah', step: 2 },
    DUMI: { label: 'Tashih Naskah Dumi (Final)', step: 3 },
  },
};
