import React from 'react';
import { useAuth } from '@/features/auth/AuthContext';
import { UserRole } from '@/types/domain';
import { ShieldCheck, UserCircle, RefreshCw, QrCode } from 'lucide-react';
import { Link } from 'react-router-dom';

export const Navbar: React.FC = () => {
  const { currentUser, setRole, availableRoles } = useAuth();

  const getRoleBadgeLabel = (role: UserRole) => {
    switch (role) {
      case 'PUBLISHER':
        return 'Penerbit';
      case 'ADMIN':
        return 'Administrator Sistem';
      case 'VERIFICATOR':
        return 'Verifikator Naskah';
      case 'DISTRIBUTOR':
        return 'Distributor / Koordinator';
      case 'TASHIH_LEADER':
        return 'Ketua Kelompok Tashih';
      case 'HEAD_OF_LPMQ':
        return 'Kepala LPMQ';
      default:
        return role;
    }
  };

  return (
    <header className="bg-primary-700 text-white shadow-md sticky top-0 z-40">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Brand & Logo */}
          <div className="flex items-center gap-3">
            <Link to="/" className="flex items-center gap-3 hover:opacity-95 transition-opacity">
              <div className="w-10 h-10 rounded-full bg-white/10 flex items-center justify-center border border-white/20">
                <ShieldCheck className="w-6 h-6 text-gold-400" />
              </div>
              <div>
                <span className="text-xs tracking-wider uppercase text-emerald-100 font-medium block">
                  Kementerian Agama RI
                </span>
                <span className="text-base font-bold tracking-tight text-white block">
                  LPMQ — Layanan Pentashihan Al-Qur'an
                </span>
              </div>
            </Link>
          </div>

          {/* Center/Right navigation & Role Switcher */}
          <div className="flex items-center gap-4">
            {/* Link to public QR verification demo */}
            <Link
              to="/verify-documents/DEMO-QR-TOKEN-2026"
              className="hidden md:inline-flex items-center gap-1.5 text-xs bg-white/10 hover:bg-white/20 text-white px-3 py-1.5 rounded border border-white/20 transition-colors"
              title="Pratinjau Halaman Verifikasi QR Publik"
            >
              <QrCode className="w-3.5 h-3.5 text-gold-400" />
              <span>Cek Verifikasi QR Publik</span>
            </Link>

            {/* Role Switcher (DESIGN.md §6) */}
            <div className="flex items-center gap-2 bg-primary-800/80 px-3 py-1.5 rounded-lg border border-primary-500/30">
              <RefreshCw className="w-3.5 h-3.5 text-emerald-300" />
              <label htmlFor="role-select" className="text-xs text-emerald-100 font-medium hidden sm:inline">
                Peran Aktif:
              </label>
              <select
                id="role-select"
                value={currentUser.role}
                onChange={(e) => setRole(e.target.value as UserRole)}
                className="bg-white text-neutral-800 text-xs font-semibold rounded px-2 py-1 focus:outline-none focus:ring-2 focus:ring-gold-400 cursor-pointer"
                aria-label="Pilih Peran Pengguna"
              >
                {availableRoles.map((role) => (
                  <option key={role} value={role}>
                    {getRoleBadgeLabel(role)}
                  </option>
                ))}
              </select>
            </div>

            {/* User Profile display */}
            <div className="flex items-center gap-2 pl-2 border-l border-white/15">
              <UserCircle className="w-8 h-8 text-emerald-200" />
              <div className="hidden lg:block text-left">
                <div className="text-xs font-bold leading-tight">{currentUser.name}</div>
                <div className="text-[11px] text-emerald-200 leading-tight">
                  {currentUser.publisherName || currentUser.nip || currentUser.email}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </header>
  );
};
