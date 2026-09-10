import React from 'react';
import { useAuth } from '@/features/auth/AuthContext';
import { ShieldCheck, UserCircle, RefreshCw, QrCode, LogOut, LogIn } from 'lucide-react';
import { Link, useNavigate } from 'react-router-dom';
import kemenagLogo from '@/assets/kemenag.png';

export const Navbar = () => {
  const { currentUser, setRole, availableRoles, logout } = useAuth();
  const navigate = useNavigate();

  const getRoleBadgeLabel = (role) => {
    switch (role) {
      case 'ADMIN_PENERBIT':
      case 'PUBLISHER':
        return 'Penerbit Mushaf';
      case 'SUPERADMIN':
      case 'ADMIN':
        return 'Super Admin Sistem';
      case 'VERIFIKATOR':
      case 'VERIFICATOR':
        return 'Verifikator Berkas';
      case 'DISTRIBUTOR':
        return 'Distributor Tim';
      case 'PENTASHIH':
      case 'TASHIH_MEMBER':
        return 'Pentashih Naskah';
      case 'DOKUMENTATOR':
      case 'DOCUMENTATOR':
        return 'Dokumentator';
      case 'KEPALA_LPMQ':
      case 'HEAD_OF_LPMQ':
        return 'Kepala LPMQ';
      default:
        return role;
    }
  };

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  return (
    <header className="bg-primary-700 text-white shadow-md sticky top-0 z-40">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Brand & Logo */}
          <div className="flex items-center gap-3">
            <Link to="/" className="flex items-center gap-3 hover:opacity-95 transition-opacity">
              <div className="w-10 h-10 rounded-full bg-white/95 flex items-center justify-center p-1 border border-white/20 shadow-xs">
                <img src={kemenagLogo} alt="Logo Kemenag" className="w-full h-full object-contain" />
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
          <div className="flex items-center gap-3 sm:gap-4">
            {/* Link to public QR verification demo */}
            <Link
              to="/verify-documents/DEMO-QR-TOKEN-2026"
              className="hidden lg:inline-flex items-center gap-1.5 text-xs bg-white/10 hover:bg-white/20 text-white px-3 py-1.5 rounded border border-white/20 transition-colors"
              title="Pratinjau Halaman Verifikasi QR Publik"
            >
              <QrCode className="w-3.5 h-3.5 text-gold-400" />
              <span>Cek Verifikasi QR</span>
            </Link>

            {/* Quick Role Switcher for Testing (DESIGN.md §6) */}
            {currentUser && (
              <div className="flex items-center gap-2 bg-primary-800/80 px-2.5 py-1.5 rounded-lg border border-primary-500/30">
                <RefreshCw className="w-3.5 h-3.5 text-emerald-300 hidden sm:inline" />
                <label htmlFor="role-select" className="text-xs text-emerald-100 font-medium hidden sm:inline">
                  Peran:
                </label>
                <select
                  id="role-select"
                  value={currentUser.role}
                  onChange={(e) => setRole(e.target.value)}
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
            )}

            {/* User Profile display or Login button */}
            {currentUser ? (
              <div className="flex items-center gap-3 pl-2 border-l border-white/15">
                <div className="flex items-center gap-2">
                  <UserCircle className="w-8 h-8 text-emerald-200 flex-shrink-0" />
                  <div className="hidden md:block text-left">
                    <div className="text-xs font-bold leading-tight line-clamp-1">{currentUser.name}</div>
                    <div className="text-[11px] text-emerald-200 leading-tight">
                      {currentUser.publisherName || currentUser.nip || currentUser.email}
                    </div>
                  </div>
                </div>

                <button
                  onClick={handleLogout}
                  className="p-1.5 rounded hover:bg-white/10 text-emerald-100 hover:text-white transition-colors"
                  title="Keluar dari sesi"
                  aria-label="Logout"
                >
                  <LogOut className="w-4 h-4" />
                </button>
              </div>
            ) : (
              <Link
                to="/login"
                className="inline-flex items-center gap-1.5 text-xs bg-gold-400 text-neutral-900 font-bold px-3 py-1.5 rounded hover:bg-gold-500 transition-colors"
              >
                <LogIn className="w-3.5 h-3.5" />
                <span>Masuk</span>
              </Link>
            )}
          </div>
        </div>
      </div>
    </header>
  );
};

export default Navbar;
