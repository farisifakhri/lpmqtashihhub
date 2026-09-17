import React, { useState, useRef, useEffect } from 'react';
import { useAuth } from '@/features/auth/AuthContext';
import {
  Menu,
  X,
  Home,
  ChevronRight,
  ChevronDown,
  QrCode,
  LogOut,
  ShieldCheck,
  Search,
  ExternalLink,
} from 'lucide-react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { CommandSearchDialog } from './CommandSearchDialog';
import { NotificationCenter } from './NotificationCenter';
import kemenagLogo from '@/assets/kemenag.png';
import lpmqLogo from '@/assets/lpmq.png';

export const Navbar = ({ sidebarOpen, onToggleSidebar }) => {
  const { currentUser, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [profileDropdownOpen, setProfileDropdownOpen] = useState(false);
  const [commandSearchOpen, setCommandSearchOpen] = useState(false);
  const dropdownRef = useRef(null);

  // Global shortcut handler for Ctrl/Cmd + K and "/"
  useEffect(() => {
    const handleKeyDown = (e) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        setCommandSearchOpen((prev) => !prev);
      } else if (e.key === '/' && !['INPUT', 'TEXTAREA'].includes(document.activeElement?.tagName)) {
        e.preventDefault();
        setCommandSearchOpen(true);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  // Close dropdown on click outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setProfileDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Close dropdown on route change
  useEffect(() => {
    setProfileDropdownOpen(false);
  }, [location.pathname]);

  const role = currentUser?.role || '';
  const isPublisher =
    role === 'ADMIN_PENERBIT' ||
    role === 'PUBLISHER' ||
    currentUser?.roles?.includes('ADMIN_PENERBIT');

  const homePath = isPublisher ? '/publisher' : '/internal';

  const getRoleConfig = (userRole) => {
    switch (userRole) {
      case 'SUPERADMIN':
      case 'ADMIN':
        return { label: 'Administrator Sistem', color: 'bg-slate-100 text-slate-800 border-slate-300' };
      case 'VERIFIKATOR':
      case 'VERIFICATOR':
        return { label: 'Verifikator Dokumen', color: 'bg-brand-50 text-brand-900 border-brand-100' };
      case 'DISTRIBUTOR':
        return { label: 'Koordinator Distribusi', color: 'bg-brand-50 text-brand-900 border-brand-100' };
      case 'PENTASHIH':
      case 'TASHIH_MEMBER':
        return { label: 'Pentashih Naskah', color: 'bg-brand-50 text-brand-900 border-brand-100' };
      case 'DOKUMENTATOR':
      case 'DOCUMENTATOR':
        return { label: 'Administrator Dokumen', color: 'bg-brand-50 text-brand-900 border-brand-100' };
      case 'KEPALA_LPMQ':
      case 'HEAD_OF_LPMQ':
        return { label: 'Kepala LPMQ', color: 'bg-amber-50 text-amber-900 border-amber-300' };
      case 'ADMIN_PENERBIT':
      case 'PUBLISHER':
        return { label: 'Penerbit Terverifikasi', color: 'bg-slate-100 text-slate-800 border-slate-300' };
      default:
        return { label: userRole || 'Petugas', color: 'bg-slate-100 text-slate-800 border-slate-300' };
    }
  };

  const roleConfig = getRoleConfig(role);

  // Dynamic breadcrumb mapping (max 3 levels)
  const getBreadcrumb = (pathname) => {
    if (pathname === '/publisher' || pathname === '/publisher/') {
      return { parent: null, name: 'Ikhtisar Layanan' };
    }
    if (pathname.startsWith('/publisher/new-registration')) {
      return { parent: 'Pengajuan', name: 'Pengajuan Naskah Baru' };
    }
    if (pathname.startsWith('/publisher/registrations')) {
      return { parent: 'Pengajuan', name: 'Daftar Pengajuan Saya' };
    }
    if (pathname.startsWith('/publisher/billing')) {
      return { parent: 'Keuangan', name: 'Billing & PNBP' };
    }
    if (pathname.startsWith('/publisher/documents')) {
      return { parent: 'Dokumen', name: 'Surat Tanda Tashih (STT)' };
    }
    if (pathname === '/internal' || pathname === '/internal/') {
      return { parent: null, name: 'Pusat Kendali Operasional' };
    }
    if (pathname.startsWith('/internal/verifications')) {
      return { parent: 'Verifikasi', name: 'Verifikasi Berkas Naskah' };
    }
    if (pathname.startsWith('/internal/payments')) {
      return { parent: 'Keuangan', name: 'Verifikasi Pembayaran' };
    }
    if (pathname.startsWith('/internal/distributions')) {
      return { parent: 'Distribusi', name: 'Distribusi Sidang & SK Tim' };
    }
    if (pathname.startsWith('/internal/tashih')) {
      return { parent: 'Pentashihan', name: 'Sidang & Telaah Tashih' };
    }
    if (pathname.startsWith('/internal/documents')) {
      return { parent: 'Dokumen Resmi', name: 'Berita Acara & STT' };
    }
    if (pathname.startsWith('/internal/signatures')) {
      return { parent: 'Pengesahan', name: 'Pusat Tanda Tangan' };
    }
    if (pathname.startsWith('/internal/master-intake')) {
      return { parent: 'Loket', name: 'Intake Master Fisik' };
    }
    if (pathname.startsWith('/internal/settings')) {
      return { parent: 'Konfigurasi', name: 'Master Data Sistem' };
    }
    if (pathname.startsWith('/internal/users')) {
      return { parent: 'Akses', name: 'Manajemen Pengguna' };
    }
    return { parent: null, name: 'LPMQ Tashih Hub' };
  };

  const breadcrumb = getBreadcrumb(location.pathname);

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  return (
    <>
      <header className="bg-surface/95 backdrop-blur-md border-b border-line sticky top-0 z-40 h-16 transition-colors">
        <div className="w-full px-4 sm:px-6 lg:px-8 h-full">
          <div className="flex items-center justify-between h-full">
            {/* Left Side: Sidebar Toggler & Breadcrumbs */}
            <div className="flex items-center gap-2.5 sm:gap-3.5 min-w-0">
              <button
                type="button"
                onClick={onToggleSidebar}
                className="p-2 rounded-lg text-ink-muted hover:text-brand-900 hover:bg-neutral-100 transition-colors focus:outline-none focus:ring-2 focus:ring-emerald-700"
                aria-label={sidebarOpen ? 'Tutup navigasi utama' : 'Buka navigasi utama'}
                title={sidebarOpen ? 'Tutup Sidebar' : 'Buka Sidebar'}
              >
                {sidebarOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
              </button>

              {/* Official Logos */}
              <div className="flex items-center gap-1.5 shrink-0">
                <div className="h-9 w-9 rounded-lg bg-surface border border-line shadow-2xs flex items-center justify-center p-1">
                  <img src={kemenagLogo} alt="Logo Kemenag" className="h-full w-auto object-contain" />
                </div>
                <div className="h-8 w-8 rounded-lg bg-surface border border-line shadow-2xs items-center justify-center p-0.5 hidden sm:flex">
                  <img src={lpmqLogo} alt="Logo LPMQ" className="h-full w-auto object-contain rounded" />
                </div>
              </div>

              {/* Dynamic Breadcrumbs (Max 3 levels) */}
              <nav aria-label="Breadcrumb" className="hidden sm:flex items-center text-xs text-ink-muted min-w-0">
                <ol className="flex items-center gap-1.5 min-w-0 truncate">
                  <li className="flex items-center">
                    <Link
                      to={homePath}
                      className="p-1 rounded text-ink-muted hover:text-brand-800 hover:bg-neutral-100 transition-colors"
                      title="Beranda"
                    >
                      <Home className="w-4 h-4 text-brand-700" />
                    </Link>
                  </li>
                  {breadcrumb.parent && (
                    <li className="flex items-center gap-1.5">
                      <ChevronRight className="w-3.5 h-3.5 text-line-strong shrink-0" />
                      <span className="text-ink-muted whitespace-nowrap">{breadcrumb.parent}</span>
                    </li>
                  )}
                  <li className="flex items-center gap-1.5 min-w-0">
                    <ChevronRight className="w-3.5 h-3.5 text-line-strong shrink-0" />
                    <span className="font-semibold text-ink truncate max-w-[220px] md:max-w-xs">
                      {breadcrumb.name}
                    </span>
                  </li>
                </ol>
              </nav>
            </div>

            {/* Right Side: Command Search, Notifications, QR Link, and Profile */}
            <div className="flex items-center gap-1.5 sm:gap-2.5 shrink-0">
              {/* Command Search Trigger Button */}
              <button
                type="button"
                onClick={() => setCommandSearchOpen(true)}
                className="flex items-center gap-2 px-2.5 py-1.5 rounded-lg bg-surface-subtle hover:bg-neutral-200/70 border border-line text-xs text-ink-muted hover:text-ink transition-colors"
                aria-label="Pencarian cepat perintah (Ctrl+K)"
                title="Pencarian Cepat"
              >
                <Search className="w-4 h-4 text-ink-muted" />
                <span className="hidden md:inline font-medium">Cari perintah...</span>
                <kbd className="hidden md:inline-flex items-center px-1.5 py-0.5 text-[10px] font-mono text-ink-muted bg-surface border border-line rounded">
                  Ctrl+K
                </kbd>
              </button>

              {/* Notification Center */}
              <NotificationCenter />

              {/* Public QR Demo Link */}
              <Link
                to="/verify-documents/DEMO-QR-TOKEN-2026"
                className="hidden sm:inline-flex items-center gap-1.5 text-xs font-semibold text-ink-muted hover:text-brand-900 bg-surface-subtle hover:bg-neutral-200/70 px-2.5 py-1.5 rounded-lg border border-line transition-colors"
                title="Pratinjau Verifikasi QR Publik"
              >
                <QrCode className="w-3.5 h-3.5 text-brand-700" />
                <span className="hidden lg:inline">Validasi Dokumen</span>
              </Link>

              {/* Profile Menu Dropdown */}
              {currentUser && (
                <div className="relative" ref={dropdownRef}>
                  <button
                    type="button"
                    onClick={() => setProfileDropdownOpen((prev) => !prev)}
                    className="flex items-center gap-2 p-1.5 sm:px-2 sm:py-1 rounded-lg hover:bg-neutral-100 border border-transparent hover:border-line transition-all text-left focus:outline-none focus:ring-2 focus:ring-emerald-700 cursor-pointer"
                    aria-expanded={profileDropdownOpen}
                    aria-haspopup="true"
                    aria-label={`Menu profil ${currentUser.name}`}
                  >
                    <div className="relative shrink-0">
                      <div className="w-8 h-8 rounded-md bg-brand-800 text-white flex items-center justify-center font-bold text-xs shadow-2xs">
                        {currentUser.name ? currentUser.name.charAt(0).toUpperCase() : 'U'}
                      </div>
                      <span className="absolute bottom-0 right-0 w-2 h-2 bg-emerald-500 rounded-full border-2 border-white" />
                    </div>

                    <div className="hidden lg:block leading-tight">
                      <div className="text-xs font-bold text-ink truncate max-w-[130px]">
                        {currentUser.name}
                      </div>
                      <div className="text-[11px] text-ink-muted truncate max-w-[130px]">
                        {roleConfig.label}
                      </div>
                    </div>

                    <ChevronDown className={`w-3.5 h-3.5 text-ink-muted transition-transform ${profileDropdownOpen ? 'rotate-180' : ''}`} />
                  </button>

                  {/* Dropdown Menu */}
                  {profileDropdownOpen && (
                    <div className="absolute right-0 mt-2 w-64 bg-surface rounded-xl shadow-xl border border-line py-1.5 z-50 animate-slideUp">
                      <div className="px-3.5 py-2.5 border-b border-line">
                        <p className="text-[10px] text-ink-muted font-bold uppercase tracking-wider">Sesi Aktif</p>
                        <p className="text-xs font-bold text-ink truncate mt-0.5">{currentUser.name}</p>
                        <p className="text-[11px] text-ink-muted truncate mt-0.5">
                          {currentUser.publisherName || currentUser.email}
                        </p>
                        <div className="mt-2">
                          <span className={`inline-flex items-center gap-1 text-[11px] font-semibold px-2 py-0.5 rounded border ${roleConfig.color}`}>
                            <ShieldCheck className="w-3 h-3" />
                            <span>{roleConfig.label}</span>
                          </span>
                        </div>
                      </div>

                      <div className="px-3.5 py-2 bg-surface-subtle/70 border-b border-line text-[11px] text-ink-muted">
                        Kontrol proses mengacu pada SOP v2.2
                      </div>

                      <div className="p-1 space-y-0.5">
                        <Link
                          to="/verify-documents/DEMO-QR-TOKEN-2026"
                          className="flex items-center gap-2 px-3 py-2 text-xs font-medium text-ink hover:bg-surface-subtle rounded-lg transition-colors"
                        >
                          <ExternalLink className="w-3.5 h-3.5 text-ink-muted" />
                          <span>Pratinjau Verifikasi QR</span>
                        </Link>

                        <button
                          type="button"
                          onClick={handleLogout}
                          className="w-full flex items-center gap-2 px-3 py-2 text-xs font-semibold text-rose-700 hover:bg-rose-50 rounded-lg transition-colors text-left cursor-pointer"
                        >
                          <LogOut className="w-3.5 h-3.5" />
                          <span>Akhiri Sesi</span>
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      </header>

      {/* Global Command Search Modal */}
      <CommandSearchDialog
        isOpen={commandSearchOpen}
        onClose={() => setCommandSearchOpen(false)}
      />
    </>
  );
};

export default Navbar;

