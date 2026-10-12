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
    primary950: '#05231C',
    primary900: '#08382C',
    primary800: '#0D5240',
    primary700: '#126850', // Header, sidebar aktif, tombol utama
    primary600: '#15755B',
    primary500: '#188266', // Aksen tombol, ikon aktif, tab terpilih
    primary200: '#BCE1D0',
    primary100: '#DFF2E9', // Latar kartu info, hover, badge positif
    primary50:  '#F0FAF6',

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
    accentGold700: '#7D5711', // Teks & label resmi (kontras >= 5.4:1)
    accentGold600: '#986B1E',
    accentGold500: '#B3832B', // Bentuk, garis hias, ikon nominal
    accentGold400: '#CE9E3C',
    accentGold100: '#F7EED8',
    accentGold50:  '#FAF5E8', // Latar kartu ringkasan tarif/billing

    // 5 Keluarga Semantik
    semantic: {
      neutral: { bg: 'bg-surface-subtle', text: 'text-ink', border: 'border-line-strong' },
      info:    { bg: 'bg-civic-infoSoft',    text: 'text-civic-info',    border: 'border-civic-infoLine' },
      warning: { bg: 'bg-civic-warningSoft',  text: 'text-civic-warning',  border: 'border-civic-warningLine' },
      danger:  { bg: 'bg-civic-dangerSoft',   text: 'text-civic-danger',   border: 'border-civic-dangerLine' },
      success: { bg: 'bg-civic-successSoft', text: 'text-civic-success', border: 'border-civic-successLine' },
      gold:    { bg: 'bg-civicGold-100',   text: 'text-civicGold-700',   border: 'border-civicGold-700' },
    },
  },

  typography: {
    fontSans: '"Plus Jakarta Sans", Inter, system-ui, -apple-system, sans-serif',
    fontSerif: '"Amiri", "Traditional Arabic", Georgia, serif',
  },

  ...WORKFLOW_PRESENTATION,
};
