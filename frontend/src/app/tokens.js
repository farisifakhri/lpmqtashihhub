/**
 * Design Tokens resmi Sistem Manajemen Layanan Pentashihan Mushaf Al-Qur'an (LPMQ)
 * Acuan: DESIGN.md §2 & §3
 *
 * Rasio warna: Hijau · Putih · Emas (±30/60/10)
 * Hindari hardcode hex di komponen. Gunakan konstanta ini atau class Tailwind terkait.
 */

export const TOKENS = {
  colors: {
    // Primary - Deep Islamic Pine / Sovereign Forest
    primary900: '#083224',
    primary800: '#0B3F2D',
    primary700: '#0E5139', // Header, sidebar aktif, tombol utama
    primary600: '#116447',
    primary500: '#167A58', // Aksen tombol, ikon aktif, tab terpilih
    primary100: '#DDF0E7', // Latar kartu info, hover, badge positif
    primary50:  '#F0F7F4',

    // Netral - Crisp Slate Neutrals
    neutralWhite: '#FFFFFF', // Latar kartu permukaan utama
    neutral50: '#F8FAFC',    // Latar halaman aplikasi
    neutral100: '#F1F5F9',   // Latar tabel/kartu sekunder
    neutral200: '#E2E8F0',   // Border/garis pemisah
    neutral300: '#CBD5E1',   // Input border
    neutral500: '#64748B',   // Teks sekunder, status Draft
    neutral700: '#334155',   // Teks isi/body
    neutral900: '#0F172A',   // Teks gelap tegas
    neutral950: '#020617',   // Heading pekat

    // Aksen Emas Sandstone / Imperial Brass
    accentGold700: '#865714', // Aksen dokumen resmi, ikon terverifikasi
    accentGold600: '#A97516',
    accentGold500: '#C99320', // Highlight nominal tarif/PNBP
    accentGold400: '#DFB045',
    accentGold100: '#F9F0D3',
    accentGold50:  '#FDF9EE', // Latar kartu ringkasan tarif/billing

    // Status
    statusWarning: '#D97706', // Perlu Perbaikan, Menunggu Pembayaran
    statusDanger:  '#E11D48', // Ditolak, Dibatalkan
    statusInfo:    '#0284C7', // Sedang Diverifikasi / Diproses
    statusSuccess: '#0E5139', // Selesai / Terverifikasi
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
      description: 'Dokumen diterima, menunggu Kepala LPMQ menugaskan verifikator',
    },
    VERIFICATION_ASSIGNED: {
      label: 'Verifikator Ditugaskan',
      bgClass: 'bg-cyan-50',
      textClass: 'text-cyan-800',
      borderClass: 'border-cyan-200',
      description: 'Nota Dinas Verifikasi telah diterbitkan; menunggu pemeriksaan verifikator terpilih',
    },
    IN_VERIFICATION: {
      label: 'Sedang Diverifikasi',
      bgClass: 'bg-sky-50',
      textClass: 'text-sky-700',
      borderClass: 'border-sky-200',
      description: 'Verifikator sedang memeriksa kelengkapan administrasi dan naskah',
    },
    PHYSICAL_HANDOVER_CORRECTION_REQUIRED: {
      label: 'Perbaikan Fisik',
      bgClass: 'bg-amber-50',
      textClass: 'text-amber-800',
      borderClass: 'border-amber-300',
      description: 'Master fisik dikembalikan distributor karena cacat fisik; pembayaran sah tetap terjaga tanpa re-billing',
    },
    REVISION_REQUIRED: {
      label: 'Perlu Perbaikan',
      bgClass: 'bg-amber-50',
      textClass: 'text-amber-700',
      borderClass: 'border-amber-200',
      description: 'Ditemukan kekurangan berkas yang harus diperbaiki penerbit',
    },
    WAITING_VERIFICATION_APPROVAL: {
      label: 'Menunggu Persetujuan Verifikasi',
      bgClass: 'bg-indigo-50',
      textClass: 'text-indigo-800',
      borderClass: 'border-indigo-200',
      description: 'Menunggu persetujuan hasil verifikasi oleh Kepala LPMQ',
    },
    VERIFICATION_APPROVED: {
      label: 'Surat Disetujui',
      bgClass: 'bg-indigo-50',
      textClass: 'text-indigo-800',
      borderClass: 'border-indigo-200',
      description: 'Menunggu verifikator mengirim surat hasil verifikasi kepada penerbit',
    },
    AWAITING_PAYMENT: {
      label: 'Menunggu Pembayaran',
      bgClass: 'bg-amber-50',
      textClass: 'text-amber-800',
      borderClass: 'border-amber-300',
      description: 'Kode billing PNBP diterbitkan, menunggu pembayaran penerbit',
    },
    PAYMENT_VERIFICATION: {
      label: 'Verifikasi Pembayaran',
      bgClass: 'bg-blue-50',
      textClass: 'text-blue-800',
      borderClass: 'border-blue-200',
      description: 'Bukti bayar dikonfirmasi; setelah diverifikasi master menunggu serah-terima fisik',
    },
    WAITING_DISTRIBUTOR_RECEIPT: {
      label: 'Menunggu Distributor',
      bgClass: 'bg-violet-50',
      textClass: 'text-violet-800',
      borderClass: 'border-violet-200',
      description: 'Master fisik telah diserahkan, menunggu distributor mengonfirmasi penerimaan',
    },
    WAITING_DISTRIBUTION: {
      label: 'Menunggu Distribusi',
      bgClass: 'bg-primary-50',
      textClass: 'text-primary-700',
      borderClass: 'border-primary-200',
      description: 'Verifikasi & pembayaran lolos, menunggu penugasan tim pentashih',
    },
    TASHIH_IN_PROGRESS: {
      label: 'Proses Tashih Berjalan',
      bgClass: 'bg-primary-100',
      textClass: 'text-primary-800',
      borderClass: 'border-primary-300',
      description: 'Tim pentashih sedang memeriksa ayat dan tanda baca mushaf',
    },
    READY_FOR_STT: {
      label: 'Siap Penetapan STT',
      bgClass: 'bg-teal-50',
      textClass: 'text-teal-800',
      borderClass: 'border-teal-300',
      description: 'Naskah dumi bersih, siap ditetapkan Surat Tanda Tashih',
    },
    STT_ISSUED: {
      label: 'STT Ditetapkan',
      bgClass: 'bg-primary-50',
      textClass: 'text-primary-900',
      borderClass: 'border-primary-300',
      description: 'Surat Tanda Tashih telah ditetapkan oleh Kepala LPMQ',
    },
    DOCUMENTATION_IN_PROGRESS: {
      label: 'Pemberkasan Dokumentasi',
      bgClass: 'bg-teal-50',
      textClass: 'text-teal-900',
      borderClass: 'border-teal-300',
      description: 'Penyusunan Berita Acara Tashih & penerimaan eksemplar dokumentasi',
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
      bgClass: 'bg-primary-50',
      textClass: 'text-primary-900',
      borderClass: 'border-gold-400',
      description: 'Seluruh tahapan pentashihan dan dokumentasi telah rampung',
    },
    CANCELLED: {
      label: 'Dibatalkan',
      bgClass: 'bg-rose-50',
      textClass: 'text-rose-700',
      borderClass: 'border-rose-200',
      description: 'Pengajuan dibatalkan sebelum proses penagihan/penetapan',
    },
  },

  paymentStatus: {
    UNPAID: { label: 'Menunggu Pembayaran', color: '#D97706', bgClass: 'bg-amber-50', textClass: 'text-amber-800', borderClass: 'border-amber-200' },
    PAID: { label: 'Menunggu Verifikasi', color: '#0284C7', bgClass: 'bg-blue-50', textClass: 'text-blue-800', borderClass: 'border-blue-200' },
    VERIFIED: { label: 'Lunas & Sah', color: '#0E5139', bgClass: 'bg-emerald-50', textClass: 'text-emerald-800', borderClass: 'border-emerald-200' },
    EXPIRED: { label: 'Kedaluwarsa', color: '#E11D48', bgClass: 'bg-rose-50', textClass: 'text-rose-700', borderClass: 'border-rose-200' },
    REJECTED: { label: 'Bukti Ditolak', color: '#E11D48', bgClass: 'bg-rose-50', textClass: 'text-rose-700', borderClass: 'border-rose-200' },
    WAIVED: { label: 'Bebas Tarif', color: '#0284C7', bgClass: 'bg-cyan-50', textClass: 'text-cyan-800', borderClass: 'border-cyan-200' },
  },

  tashihStages: {
    INITIAL: { label: 'Tashih Naskah Awal', step: 1 },
    REVISION: { label: 'Tashih Perbaikan Naskah', step: 2 },
    DUMI: { label: 'Tashih Naskah Dumi (Final)', step: 3 },
  },
};
