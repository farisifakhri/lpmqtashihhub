import React from 'react';
import {
  Crown,
  Shield,
  CheckCircle,
  Package,
  BookOpen,
  FolderArchive,
  PenTool,
  Building2,
  Sparkles,
} from 'lucide-react';
import { clsx } from 'clsx';

/**
 * 6 Pilihan Avatar Vektor Islami Modern (3 Pria & 3 Wanita)
 * Didesain khusus untuk Sistem Pentashihan Mushaf LPMQ Kemenag RI
 * Menggunakan SVG murni (ringan, tajam di semua resolusi, tanpa dependensi eksternal)
 */
export const AVATAR_OPTIONS = [
  {
    id: 'pria-1',
    gender: 'male',
    label: 'Peci Hitam Formal',
    description: 'Khas ASN Kemenag RI, wibawa & rapi',
  },
  {
    id: 'pria-2',
    gender: 'male',
    label: 'Kopiah Putih Santri',
    description: 'Khas Ustadz / Pentashih bersahaja',
  },
  {
    id: 'pria-3',
    gender: 'male',
    label: 'Pria Kacamata Cerdas',
    description: 'Profesional muda / Verifikator teliti',
  },
  {
    id: 'wanita-1',
    gender: 'female',
    label: 'Hijab Dinas Kemenag',
    description: 'Hijab rapi seragam, tertib & berwibawa',
  },
  {
    id: 'wanita-2',
    gender: 'female',
    label: 'Hijab Syar\'i Anggun',
    description: 'Hijab syar\'i sejuk, teduh & khidmat',
  },
  {
    id: 'wanita-3',
    gender: 'female',
    label: 'Hijab Kacamata Modern',
    description: 'Dinamis, cermat & profesional',
  },
];

const sizeMap = {
  xs: { box: 'w-6 h-6', text: 'text-[9px]', badge: 'w-2.5 h-2.5 -bottom-0.5 -right-0.5 p-0.5', iconSize: 8 },
  sm: { box: 'w-8 h-8', text: 'text-xs', badge: 'w-3.5 h-3.5 -bottom-0.5 -right-0.5 p-0.5', iconSize: 10 },
  md: { box: 'w-10 h-10', text: 'text-sm', badge: 'w-4 h-4 -bottom-0.5 -right-0.5 p-0.5', iconSize: 11 },
  lg: { box: 'w-12 h-12', text: 'text-base', badge: 'w-5 h-5 -bottom-1 -right-1 p-0.5', iconSize: 13 },
  xl: { box: 'w-16 h-16', text: 'text-xl', badge: 'w-6 h-6 -bottom-1 -right-1 p-1', iconSize: 15 },
  '2xl': { box: 'w-20 h-20', text: 'text-2xl', badge: 'w-7 h-7 -bottom-1 -right-1 p-1', iconSize: 18 },
};

function getRoleBadgeConfig(role) {
  switch (role) {
    case 'SUPERADMIN':
      return {
        icon: Crown,
        title: 'Super Admin',
        bg: 'bg-amber-500 text-white border-amber-300',
      };
    case 'ADMIN_INTERNAL':
      return {
        icon: Shield,
        title: 'Admin Internal',
        bg: 'bg-emerald-600 text-white border-emerald-300',
      };
    case 'VERIFIKATOR':
    case 'VERIFICATOR':
      return {
        icon: CheckCircle,
        title: 'Verifikator',
        bg: 'bg-teal-600 text-white border-teal-300',
      };
    case 'DISTRIBUTOR':
      return {
        icon: Package,
        title: 'Distributor',
        bg: 'bg-sky-600 text-white border-sky-300',
      };
    case 'PENTASHIH':
    case 'TASHIH_MEMBER':
      return {
        icon: BookOpen,
        title: 'Pentashih Naskah',
        bg: 'bg-emerald-700 text-amber-200 border-amber-400',
      };
    case 'DOKUMENTATOR':
    case 'DOCUMENTATOR':
      return {
        icon: FolderArchive,
        title: 'Dokumentator',
        bg: 'bg-indigo-600 text-white border-indigo-300',
      };
    case 'KEPALA_LPMQ':
    case 'HEAD_OF_LPMQ':
      return {
        icon: PenTool,
        title: 'Kepala LPMQ',
        bg: 'bg-amber-600 text-white border-amber-200',
      };
    case 'PENERBIT':
    case 'PUBLISHER':
      return {
        icon: Building2,
        title: 'Penerbit',
        bg: 'bg-emerald-800 text-white border-emerald-400',
      };
    default:
      return null;
  }
}

/**
 * Avatar Vektor Pria 1 - Peci Hitam Nasional / Kemenag
 */
export function PriaPeciHitamSvg() {
  return (
    <svg viewBox="0 0 100 100" fill="none" xmlns="http://www.w3.org/2000/svg" className="w-full h-full">
      <defs>
        <linearGradient id="pria1-bg" x1="0" y1="0" x2="100" y2="100" gradientUnits="userSpaceOnUse">
          <stop stopColor="#1B4332" />
          <stop offset="1" stopColor="#2D6A4F" />
        </linearGradient>
        <linearGradient id="pria1-skin" x1="0" y1="0" x2="0" y2="1">
          <stop stopColor="#F9D7B7" />
          <stop offset="1" stopColor="#E6B894" />
        </linearGradient>
        <linearGradient id="pria1-peci" x1="0" y1="0" x2="0" y2="1">
          <stop stopColor="#1E232A" />
          <stop offset="1" stopColor="#0B0D10" />
        </linearGradient>
      </defs>
      {/* Background Circle */}
      <circle cx="50" cy="50" r="48" fill="url(#pria1-bg)" stroke="#B3832B" strokeWidth="2.5" />
      {/* Baju / Jas Dinas */}
      <path d="M22 100 C22 76 34 70 50 70 C66 70 78 76 78 100 Z" fill="#0F241A" />
      {/* Kerah Baju Putih */}
      <path d="M42 70 L50 82 L58 70 L50 73 Z" fill="#FFFFFF" />
      {/* Leher */}
      <path d="M44 60 H56 V72 H44 Z" fill="url(#pria1-skin)" />
      {/* Wajah */}
      <ellipse cx="50" cy="50" rx="17" ry="19" fill="url(#pria1-skin)" />
      {/* Telinga */}
      <circle cx="33" cy="52" r="3.5" fill="url(#pria1-skin)" />
      <circle cx="67" cy="52" r="3.5" fill="url(#pria1-skin)" />
      {/* Peci Hitam (Songkok Nasional) */}
      <path d="M30 38 C30 22 36 21 50 21 C64 21 70 22 70 38 L68 41 H32 Z" fill="url(#pria1-peci)" />
      {/* Garis Aksen Emas Halus Peci */}
      <path d="M33 39 Q50 37 67 39" stroke="#DFB045" strokeWidth="1" strokeOpacity="0.7" fill="none" />
      {/* Mata, Alis & Senyum Ramah */}
      <ellipse cx="44" cy="49" rx="2" ry="2.2" fill="#1A1C1E" />
      <ellipse cx="56" cy="49" rx="2" ry="2.2" fill="#1A1C1E" />
      <path d="M41 44 Q44 42 47 44" stroke="#1A1C1E" strokeWidth="1.5" strokeLinecap="round" />
      <path d="M53 44 Q56 42 59 44" stroke="#1A1C1E" strokeWidth="1.5" strokeLinecap="round" />
      <path d="M46 58 Q50 61 54 58" stroke="#8C4A2F" strokeWidth="1.8" strokeLinecap="round" fill="none" />
    </svg>
  );
}

/**
 * Avatar Vektor Pria 2 - Kopiah Putih Santri / Ustadz Pentashih
 */
export function PriaKopiahPutihSvg() {
  return (
    <svg viewBox="0 0 100 100" fill="none" xmlns="http://www.w3.org/2000/svg" className="w-full h-full">
      <defs>
        <linearGradient id="pria2-bg" x1="0" y1="0" x2="100" y2="100" gradientUnits="userSpaceOnUse">
          <stop stopColor="#2D6A4F" />
          <stop offset="1" stopColor="#52B788" />
        </linearGradient>
        <linearGradient id="pria2-skin" x1="0" y1="0" x2="0" y2="1">
          <stop stopColor="#FAD9C0" />
          <stop offset="1" stopColor="#E3B396" />
        </linearGradient>
      </defs>
      {/* Background Circle */}
      <circle cx="50" cy="50" r="48" fill="url(#pria2-bg)" stroke="#B3832B" strokeWidth="2.5" />
      {/* Baju Koko Putih Bersih */}
      <path d="M22 100 C22 75 34 71 50 71 C66 71 78 75 78 100 Z" fill="#F8FAF9" />
      {/* Bordir Kerah Koko Emas */}
      <path d="M48 71 V85 M52 71 V85" stroke="#DFB045" strokeWidth="1.2" strokeLinecap="round" />
      {/* Leher */}
      <path d="M44 60 H56 V72 H44 Z" fill="url(#pria2-skin)" />
      {/* Wajah */}
      <ellipse cx="50" cy="50" rx="17" ry="19" fill="url(#pria2-skin)" />
      {/* Telinga */}
      <circle cx="33" cy="52" r="3.5" fill="url(#pria2-skin)" />
      <circle cx="67" cy="52" r="3.5" fill="url(#pria2-skin)" />
      {/* Kopiah / Peci Putih Berpola Halus */}
      <path d="M31 38 C31 23 37 22 50 22 C63 22 69 23 69 38 L67 40 H33 Z" fill="#FFFFFF" />
      <path d="M35 34 Q50 32 65 34" stroke="#90A955" strokeWidth="1" strokeDasharray="2 2" fill="none" />
      {/* Janggut Tipis Rapi Teduh */}
      <path d="M43 62 Q50 67 57 62" stroke="#2D3748" strokeWidth="2" strokeLinecap="round" strokeOpacity="0.4" fill="none" />
      {/* Mata, Alis & Senyum */}
      <ellipse cx="44" cy="49" rx="2" ry="2" fill="#1A1C1E" />
      <ellipse cx="56" cy="49" rx="2" ry="2" fill="#1A1C1E" />
      <path d="M41 44 Q44 42 47 44" stroke="#1A1C1E" strokeWidth="1.4" strokeLinecap="round" />
      <path d="M53 44 Q56 42 59 44" stroke="#1A1C1E" strokeWidth="1.4" strokeLinecap="round" />
      <path d="M46 57 Q50 60 54 57" stroke="#8C4A2F" strokeWidth="1.8" strokeLinecap="round" fill="none" />
    </svg>
  );
}

/**
 * Avatar Vektor Pria 3 - Pria Kacamata Cerdas / Staf IT & Verifikator
 */
export function PriaKacamataSvg() {
  return (
    <svg viewBox="0 0 100 100" fill="none" xmlns="http://www.w3.org/2000/svg" className="w-full h-full">
      <defs>
        <linearGradient id="pria3-bg" x1="0" y1="0" x2="100" y2="100" gradientUnits="userSpaceOnUse">
          <stop stopColor="#0E2A1D" />
          <stop offset="1" stopColor="#1B4D3E" />
        </linearGradient>
        <linearGradient id="pria3-skin" x1="0" y1="0" x2="0" y2="1">
          <stop stopColor="#F7D3B5" />
          <stop offset="1" stopColor="#E1AF8B" />
        </linearGradient>
      </defs>
      {/* Background Circle */}
      <circle cx="50" cy="50" r="48" fill="url(#pria3-bg)" stroke="#B3832B" strokeWidth="2.5" />
      {/* Baju Kemeja Navy Teal */}
      <path d="M22 100 C22 75 34 71 50 71 C66 71 78 75 78 100 Z" fill="#1E3832" />
      {/* Kerah Kemeja */}
      <path d="M42 71 L50 80 L58 71" stroke="#DFB045" strokeWidth="1.5" fill="none" />
      {/* Leher */}
      <path d="M44 60 H56 V72 H44 Z" fill="url(#pria3-skin)" />
      {/* Wajah */}
      <ellipse cx="50" cy="50" rx="17" ry="19" fill="url(#pria3-skin)" />
      {/* Telinga */}
      <circle cx="33" cy="52" r="3.5" fill="url(#pria3-skin)" />
      <circle cx="67" cy="52" r="3.5" fill="url(#pria3-skin)" />
      {/* Peci Hitam Modern Tipis */}
      <path d="M31 37 C31 24 37 23 50 23 C63 23 69 24 69 37 L67 39 H33 Z" fill="#11161B" />
      {/* Kacamata Modern Persegi Bulat */}
      <rect x="38" y="44" width="10" height="9" rx="2.5" stroke="#DFB045" strokeWidth="1.8" fill="rgba(255,255,255,0.2)" />
      <rect x="52" y="44" width="10" height="9" rx="2.5" stroke="#DFB045" strokeWidth="1.8" fill="rgba(255,255,255,0.2)" />
      <path d="M48 48 H52" stroke="#DFB045" strokeWidth="1.8" />
      {/* Mata di Balik Kacamata */}
      <circle cx="43" cy="48.5" r="1.8" fill="#1A1C1E" />
      <circle cx="57" cy="48.5" r="1.8" fill="#1A1C1E" />
      {/* Alis & Senyum */}
      <path d="M39 41 Q43 39 47 41" stroke="#1A1C1E" strokeWidth="1.4" strokeLinecap="round" />
      <path d="M53 41 Q57 39 61 41" stroke="#1A1C1E" strokeWidth="1.4" strokeLinecap="round" />
      <path d="M46 58 Q50 61 54 58" stroke="#8C4A2F" strokeWidth="1.8" strokeLinecap="round" fill="none" />
    </svg>
  );
}

/**
 * Avatar Vektor Wanita 1 - Hijab Dinas Kemenag (Hijau Lumut / Sage Rapi)
 */
export function WanitaHijabDinasSvg() {
  return (
    <svg viewBox="0 0 100 100" fill="none" xmlns="http://www.w3.org/2000/svg" className="w-full h-full">
      <defs>
        <linearGradient id="wanita1-bg" x1="0" y1="0" x2="100" y2="100" gradientUnits="userSpaceOnUse">
          <stop stopColor="#1B4332" />
          <stop offset="1" stopColor="#40916C" />
        </linearGradient>
        <linearGradient id="wanita1-skin" x1="0" y1="0" x2="0" y2="1">
          <stop stopColor="#FDE2CD" />
          <stop offset="1" stopColor="#F2C1A2" />
        </linearGradient>
        <linearGradient id="wanita1-hijab" x1="0" y1="0" x2="0" y2="1">
          <stop stopColor="#40916C" />
          <stop offset="1" stopColor="#255943" />
        </linearGradient>
      </defs>
      {/* Background Circle */}
      <circle cx="50" cy="50" r="48" fill="url(#wanita1-bg)" stroke="#B3832B" strokeWidth="2.5" />
      {/* Hijab Bagian Belakang & Bahu */}
      <path d="M20 100 C20 68 28 58 50 58 C72 58 80 68 80 100 Z" fill="url(#wanita1-hijab)" />
      {/* Blazer Dinas Resmi */}
      <path d="M30 100 L37 78 L50 84 L63 78 L70 100 Z" fill="#0E2A1D" />
      {/* Wajah Oval Bersih */}
      <ellipse cx="50" cy="49" rx="14" ry="17" fill="url(#wanita1-skin)" />
      {/* Frame Hijab Depan */}
      <path d="M36 44 C36 26 42 22 50 22 C58 22 64 26 64 44 C64 56 58 64 50 64 C42 64 36 56 36 44 Z" fill="none" stroke="url(#wanita1-hijab)" strokeWidth="6" />
      <path d="M36 29 C40 25 50 23 50 23 C50 23 60 25 64 29 C60 21 54 19 50 19 C46 19 40 21 36 29 Z" fill="url(#wanita1-hijab)" />
      {/* Mata Anggun, Alis & Senyum */}
      <ellipse cx="44" cy="47" rx="1.8" ry="2" fill="#1A1C1E" />
      <ellipse cx="56" cy="47" rx="1.8" ry="2" fill="#1A1C1E" />
      <path d="M41 42 Q44 40.5 47 42" stroke="#1A1C1E" strokeWidth="1.3" strokeLinecap="round" />
      <path d="M53 42 Q56 40.5 59 42" stroke="#1A1C1E" strokeWidth="1.3" strokeLinecap="round" />
      <path d="M46 54 Q50 57 54 54" stroke="#B85C4B" strokeWidth="1.8" strokeLinecap="round" fill="none" />
      {/* Aksen Bros Emas di Hijab */}
      <circle cx="50" cy="74" r="2.5" fill="#DFB045" stroke="#FFFFFF" strokeWidth="0.8" />
    </svg>
  );
}

/**
 * Avatar Vektor Wanita 2 - Hijab Syar'i Anggun (Krem / Ivory Bersahaja)
 */
export function WanitaHijabSyariSvg() {
  return (
    <svg viewBox="0 0 100 100" fill="none" xmlns="http://www.w3.org/2000/svg" className="w-full h-full">
      <defs>
        <linearGradient id="wanita2-bg" x1="0" y1="0" x2="100" y2="100" gradientUnits="userSpaceOnUse">
          <stop stopColor="#2D6A4F" />
          <stop offset="1" stopColor="#90A955" />
        </linearGradient>
        <linearGradient id="wanita2-skin" x1="0" y1="0" x2="0" y2="1">
          <stop stopColor="#FDE7D6" />
          <stop offset="1" stopColor="#F4C7A8" />
        </linearGradient>
        <linearGradient id="wanita2-hijab" x1="0" y1="0" x2="0" y2="1">
          <stop stopColor="#FFFDF7" />
          <stop offset="1" stopColor="#E9E5D9" />
        </linearGradient>
      </defs>
      {/* Background Circle */}
      <circle cx="50" cy="50" r="48" fill="url(#wanita2-bg)" stroke="#B3832B" strokeWidth="2.5" />
      {/* Hijab Syar'i Menutup Dada Lega */}
      <path d="M16 100 C16 66 26 55 50 55 C74 55 84 66 84 100 Z" fill="url(#wanita2-hijab)" />
      {/* Wajah Oval Lembut */}
      <ellipse cx="50" cy="48" rx="13.5" ry="16.5" fill="url(#wanita2-skin)" />
      {/* Lipatan Hijab Atas & Samping */}
      <path d="M36 43 C36 25 42 21 50 21 C58 21 64 25 64 43 C64 55 58 63 50 63 C42 63 36 55 36 43 Z" fill="none" stroke="url(#wanita2-hijab)" strokeWidth="6.5" />
      <path d="M37 28 C41 24 50 22 50 22 C50 22 59 24 63 28 C59 20 54 18 50 18 C46 18 41 20 37 28 Z" fill="url(#wanita2-hijab)" />
      {/* Mata Teduh, Alis & Senyum Ramah */}
      <ellipse cx="44" cy="46" rx="1.8" ry="2" fill="#1A1C1E" />
      <ellipse cx="56" cy="46" rx="1.8" ry="2" fill="#1A1C1E" />
      <path d="M41 41 Q44 39.5 47 41" stroke="#1A1C1E" strokeWidth="1.3" strokeLinecap="round" />
      <path d="M53 41 Q56 39.5 59 41" stroke="#1A1C1E" strokeWidth="1.3" strokeLinecap="round" />
      <path d="M46 54 Q50 56.5 54 54" stroke="#B85C4B" strokeWidth="1.7" strokeLinecap="round" fill="none" />
      {/* Detail Drape Halus di Dada */}
      <path d="M42 78 Q50 83 58 78" stroke="#D1CCA0" strokeWidth="1.2" strokeLinecap="round" fill="none" />
    </svg>
  );
}

/**
 * Avatar Vektor Wanita 3 - Hijab Modern Berkacamata
 */
export function WanitaKacamataSvg() {
  return (
    <svg viewBox="0 0 100 100" fill="none" xmlns="http://www.w3.org/2000/svg" className="w-full h-full">
      <defs>
        <linearGradient id="wanita3-bg" x1="0" y1="0" x2="100" y2="100" gradientUnits="userSpaceOnUse">
          <stop stopColor="#1B4D3E" />
          <stop offset="1" stopColor="#52B788" />
        </linearGradient>
        <linearGradient id="wanita3-skin" x1="0" y1="0" x2="0" y2="1">
          <stop stopColor="#FEE4CE" />
          <stop offset="1" stopColor="#E9BCA2" />
        </linearGradient>
        <linearGradient id="wanita3-hijab" x1="0" y1="0" x2="0" y2="1">
          <stop stopColor="#255943" />
          <stop offset="1" stopColor="#183D2D" />
        </linearGradient>
      </defs>
      {/* Background Circle */}
      <circle cx="50" cy="50" r="48" fill="url(#wanita3-bg)" stroke="#B3832B" strokeWidth="2.5" />
      {/* Hijab Bahu Modern */}
      <path d="M22 100 C22 68 30 58 50 58 C70 58 78 68 78 100 Z" fill="url(#wanita3-hijab)" />
      {/* Wajah Oval */}
      <ellipse cx="50" cy="48" rx="14" ry="17" fill="url(#wanita3-skin)" />
      {/* Hijab Atas */}
      <path d="M36 43 C36 25 42 21 50 21 C58 21 64 25 64 43 C64 55 58 63 50 63 C42 63 36 55 36 43 Z" fill="none" stroke="url(#wanita3-hijab)" strokeWidth="6" />
      {/* Kacamata Bulat Modern Emas */}
      <circle cx="43.5" cy="47" r="5" stroke="#DFB045" strokeWidth="1.6" fill="rgba(255,255,255,0.2)" />
      <circle cx="56.5" cy="47" r="5" stroke="#DFB045" strokeWidth="1.6" fill="rgba(255,255,255,0.2)" />
      <path d="M48.5 47 H51.5" stroke="#DFB045" strokeWidth="1.6" />
      {/* Mata di Balik Kacamata */}
      <circle cx="43.5" cy="47" r="1.7" fill="#1A1C1E" />
      <circle cx="56.5" cy="47" r="1.7" fill="#1A1C1E" />
      {/* Alis & Senyum */}
      <path d="M39 40 Q43 38.5 47 40" stroke="#1A1C1E" strokeWidth="1.3" strokeLinecap="round" />
      <path d="M53 40 Q57 38.5 61 40" stroke="#1A1C1E" strokeWidth="1.3" strokeLinecap="round" />
      <path d="M46 55 Q50 58 54 55" stroke="#B85C4B" strokeWidth="1.8" strokeLinecap="round" fill="none" />
    </svg>
  );
}

/**
 * Fallback: Rub el Hizb (۞) Monogram Bintang 8 Sudut Islami
 */
export function RubElHizbInitialsSvg({ initials = 'U' }) {
  return (
    <svg viewBox="0 0 100 100" fill="none" xmlns="http://www.w3.org/2000/svg" className="w-full h-full">
      <defs>
        <linearGradient id="rub-bg" x1="0" y1="0" x2="100" y2="100" gradientUnits="userSpaceOnUse">
          <stop stopColor="#123826" />
          <stop offset="1" stopColor="#2D6A4F" />
        </linearGradient>
      </defs>
      {/* Lingkaran Luar */}
      <circle cx="50" cy="50" r="48" fill="url(#rub-bg)" stroke="#B3832B" strokeWidth="2.5" />
      {/* Dua Persegi Terrotasi 45 Derajat (Bintang 8 Sudut Rub el Hizb) */}
      <rect x="23" y="23" width="54" height="54" rx="4" stroke="#DFB045" strokeWidth="1.8" fill="rgba(223, 176, 69, 0.08)" />
      <rect x="23" y="23" width="54" height="54" rx="4" transform="rotate(45 50 50)" stroke="#DFB045" strokeWidth="1.8" fill="rgba(223, 176, 69, 0.08)" />
      {/* Lingkaran Dalam */}
      <circle cx="50" cy="50" r="21" stroke="#DFB045" strokeWidth="1" strokeDasharray="3 2" fill="none" />
      {/* Inisial Teks */}
      <text
        x="50"
        y="58"
        textAnchor="middle"
        fill="#FAF9F6"
        fontSize="24"
        fontWeight="800"
        fontFamily="Plus Jakarta Sans, sans-serif"
        letterSpacing="0.5"
      >
        {initials}
      </text>
    </svg>
  );
}

/**
 * Komponen Utama: UserAvatar
 * @param {string} avatarId - 'pria-1' | 'pria-2' | 'pria-3' | 'wanita-1' | 'wanita-2' | 'wanita-3' | null
 * @param {string} name - Nama pengguna untuk fallback inisial
 * @param {string} role - Role pengguna untuk role-badge ikon (SUPERADMIN, PENTASHIH, dll)
 * @param {'xs'|'sm'|'md'|'lg'|'xl'|'2xl'} size - Ukuran avatar
 * @param {boolean} showRoleBadge - Tampilkan badge role di sudut kanan bawah
 * @param {boolean} showOnline - Tampilkan status dot online
 * @param {string} className - Class tambahan
 */
export function UserAvatar({
  avatarId,
  name = '',
  role = '',
  size = 'md',
  showRoleBadge = false,
  showOnline = false,
  className = '',
}) {
  const currentSize = sizeMap[size] || sizeMap.md;
  const roleConfig = getRoleBadgeConfig(role);

  // Inisial 1-2 huruf
  const getInitials = (str) => {
    if (!str) return 'U';
    const parts = str.trim().split(/\s+/);
    if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
    return (parts[0][0] + parts[1][0]).toUpperCase();
  };

  const renderGraphic = () => {
    switch (avatarId) {
      case 'pria-1':
        return <PriaPeciHitamSvg />;
      case 'pria-2':
        return <PriaKopiahPutihSvg />;
      case 'pria-3':
        return <PriaKacamataSvg />;
      case 'wanita-1':
        return <WanitaHijabDinasSvg />;
      case 'wanita-2':
        return <WanitaHijabSyariSvg />;
      case 'wanita-3':
        return <WanitaKacamataSvg />;
      default:
        return <RubElHizbInitialsSvg initials={getInitials(name)} />;
    }
  };

  return (
    <div className={clsx('relative inline-flex shrink-0 select-none', currentSize.box, className)}>
      <div className="w-full h-full rounded-full overflow-hidden shadow-2xs">
        {renderGraphic()}
      </div>

      {/* Role Badge di Sudut Kanan Bawah */}
      {showRoleBadge && roleConfig && (
        <span
          className={clsx(
            'absolute flex items-center justify-center rounded-full border shadow-xs',
            roleConfig.bg,
            currentSize.badge
          )}
          title={`Peran: ${roleConfig.title}`}
          aria-label={`Peran: ${roleConfig.title}`}
        >
          <roleConfig.icon size={currentSize.iconSize} className="shrink-0" />
        </span>
      )}

      {/* Online Status Dot (Jika Tidak Menampilkan Role Badge) */}
      {showOnline && !showRoleBadge && (
        <span className="absolute bottom-0 right-0 w-2.5 h-2.5 bg-emerald-500 rounded-full border-2 border-white dark:border-[#13221d] ring-1 ring-emerald-600/30" />
      )}
    </div>
  );
}

export default UserAvatar;
