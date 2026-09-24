import { WORKFLOW_PRESENTATION } from '@/features/workflow/workflow-presentation';

/**
 * Design Tokens resmi Sistem Manajemen Layanan Pentashihan Mushaf Al-Qur'an (LPMQ)
 * Acuan: Backlog Redesign UI/UX v1, DESIGN.md §2 & §3
 *
 * Prinsip: Operational Government Workspace
 * - Rasio warna: Hijau Tua · Putih · Emas Terbatas (±30/60/10)
 * - 5 Keluarga Semantik: Slate (Netral/Draf), Biru (Diproses), Amber (Tindakan), Merah (Masalah), Hijau (Selesai/Sah)
 * - 8 Fase Alur Manusiawi: Pendaftaran, Verifikasi, Pembayaran, Serah-terima, Pentashihan, Penerbitan STT, Dokumentasi, Selesai
 */


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

  ...WORKFLOW_PRESENTATION,
};
