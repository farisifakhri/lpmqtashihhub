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
  User,
  ShieldCheck,
  CheckCircle2,
  ExternalLink,
} from 'lucide-react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import kemenagLogo from '@/assets/kemenag.png';
import lpmqLogo from '@/assets/lpmq.jpg';

export const Navbar = ({ sidebarOpen, onToggleSidebar }) => {
  const { currentUser, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [profileDropdownOpen, setProfileDropdownOpen] = useState(false);
  const dropdownRef = useRef(null);

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
        return { label: 'Super Admin', color: 'bg-gradient-to-r from-rose-600 to-red-600 text-white font-bold border-rose-700 shadow-2xs' };
      case 'VERIFIKATOR':
      case 'VERIFICATOR':
        return { label: 'Verifikator Berkas', color: 'bg-gradient-to-r from-sky-600 to-blue-600 text-white font-bold border-sky-700 shadow-2xs' };
      case 'DISTRIBUTOR':
        return { label: 'Distributor Tim', color: 'bg-gradient-to-r from-amber-500 to-orange-500 text-white font-bold border-amber-600 shadow-2xs' };
      case 'PENTASHIH':
      case 'TASHIH_MEMBER':
        return { label: 'Pentashih Naskah', color: 'bg-gradient-to-r from-emerald-600 to-teal-600 text-white font-bold border-emerald-700 shadow-2xs' };
      case 'DOKUMENTATOR':
      case 'DOCUMENTATOR':
        return { label: 'Dokumentator', color: 'bg-gradient-to-r from-indigo-600 to-violet-600 text-white font-bold border-indigo-700 shadow-2xs' };
      case 'KEPALA_LPMQ':
      case 'HEAD_OF_LPMQ':
        return { label: 'Kepala LPMQ', color: 'bg-gradient-to-r from-amber-600 via-yellow-500 to-amber-500 text-white font-bold border-amber-600 shadow-2xs' };
      case 'ADMIN_PENERBIT':
      case 'PUBLISHER':
        return { label: 'Penerbit / Pemohon', color: 'bg-gradient-to-r from-teal-600 to-emerald-700 text-white font-bold border-teal-700 shadow-2xs' };
      default:
        return { label: userRole || 'Petugas', color: 'bg-slate-700 text-white font-bold border-slate-800 shadow-2xs' };
    }
  };

  const roleConfig = getRoleConfig(role);

  // Dynamic breadcrumb mapping matching ldksyahid-app style
  const getBreadcrumb = (pathname) => {
    if (pathname === '/publisher' || pathname === '/publisher/') {
      return { parent: null, name: 'Dashboard' };
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
      return { parent: null, name: 'Dashboard Petugas' };
    }
    if (pathname.startsWith('/internal/verifications')) {
      return { parent: 'Verifikasi', name: 'Verifikasi Berkas Naskah' };
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
    if (pathname.startsWith('/internal/settings/categories')) {
      return { parent: 'Master Data', name: 'Kategori Mushaf' };
    }
    if (pathname.startsWith('/internal/settings/service-types')) {
      return { parent: 'Master Data', name: 'Jenis Layanan & Tarif' };
    }
    if (pathname.startsWith('/internal/settings/addons')) {
      return { parent: 'Master Data', name: 'Layanan Tambahan' };
    }
    if (pathname.startsWith('/internal/settings')) {
      return { parent: 'Konfigurasi', name: 'Master Data Sistem' };
    }
    return { parent: null, name: 'LPMQ Tashih Hub' };
  };

  const breadcrumb = getBreadcrumb(location.pathname);

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  return (
    <header className="bg-white border-b border-neutral-200 sticky top-0 z-40 transition-colors shadow-xs">
      <div className="w-full px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          
          {/* Left Side: Sidebar Toggler & Dynamic Breadcrumb */}
          <div className="flex items-center gap-2.5 sm:gap-3.5 min-w-0">
            {/* Sidebar Toggler Button */}
            <button
              type="button"
              onClick={onToggleSidebar}
              className="p-2 rounded-lg text-neutral-600 hover:text-primary-800 hover:bg-neutral-100 transition-colors focus:outline-none focus:ring-2 focus:ring-primary-500/20"
              title={sidebarOpen ? 'Tutup Sidebar' : 'Buka Sidebar'}
              aria-label="Toggle Navigation Sidebar"
            >
              {sidebarOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
            </button>

            {/* Official Institutional Logos (Kemenag & LPMQ) */}
            <div className="flex items-center gap-1.5 flex-shrink-0">
              <div className="h-10 w-10 rounded-xl bg-white border border-slate-200/80 shadow-2xs flex items-center justify-center p-1">
                <img src={kemenagLogo} alt="Logo Kemenag" className="h-full w-auto object-contain drop-shadow-2xs" />
              </div>
              <div className="h-9 w-9 rounded-xl bg-white border border-slate-200/80 shadow-2xs items-center justify-center p-0.5 hidden sm:flex">
                <img src={lpmqLogo} alt="Logo LPMQ" className="h-full w-auto object-contain rounded" />
              </div>
            </div>

            {/* Breadcrumb Navigation */}
            <nav aria-label="Breadcrumb" className="hidden sm:flex items-center text-xs text-neutral-500 min-w-0">
              <ol className="flex items-center gap-1.5 min-w-0 truncate">
                <li className="flex items-center">
                  <Link
                    to={homePath}
                    className="p-1 rounded text-neutral-500 hover:text-primary-700 hover:bg-neutral-100 transition-colors"
                    title="Beranda Dashboard"
                  >
                    <Home className="w-4 h-4 text-primary-700" />
                  </Link>
                </li>
                {breadcrumb.parent && (
                  <li className="flex items-center gap-1.5">
                    <ChevronRight className="w-3.5 h-3.5 text-neutral-400 flex-shrink-0" />
                    <span className="text-neutral-500 whitespace-nowrap">{breadcrumb.parent}</span>
                  </li>
                )}
                <li className="flex items-center gap-1.5 min-w-0">
                  <ChevronRight className="w-3.5 h-3.5 text-neutral-400 flex-shrink-0" />
                  <span className="font-semibold text-neutral-900 truncate max-w-[240px] md:max-w-md">
                    {breadcrumb.name}
                  </span>
                </li>
              </ol>
            </nav>
          </div>

          {/* Right Side: Clean Navigation & User Profile Dropdown */}
          <div className="flex items-center gap-2 sm:gap-3 flex-shrink-0">
            
            {/* Public QR Demo Link */}
            <Link
              to="/verify-documents/DEMO-QR-TOKEN-2026"
              className="inline-flex items-center gap-1.5 text-xs font-semibold text-neutral-700 hover:text-primary-800 bg-neutral-100 hover:bg-neutral-200/80 px-3 py-1.5 rounded-lg border border-neutral-200 transition-colors"
              title="Pratinjau Halaman Verifikasi QR Publik"
            >
              <QrCode className="w-3.5 h-3.5 text-primary-700" />
              <span className="hidden md:inline">Cek QR Publik</span>
            </Link>

            {/* Profile Menu Dropdown */}
            {currentUser && (
              <div className="relative" ref={dropdownRef}>
                <button
                  type="button"
                  onClick={() => setProfileDropdownOpen((prev) => !prev)}
                  className="flex items-center gap-2 p-1.5 sm:px-2.5 sm:py-1.5 rounded-xl hover:bg-neutral-100 border border-transparent hover:border-neutral-200 transition-all text-left focus:outline-none focus:ring-2 focus:ring-primary-500/20 cursor-pointer"
                  aria-expanded={profileDropdownOpen}
                  aria-haspopup="true"
                >
                  {/* User Avatar Circle */}
                  <div className="relative flex-shrink-0">
                    <div className="w-8 h-8 rounded-full bg-primary-800 text-white flex items-center justify-center font-bold text-xs shadow-xs">
                      {currentUser.name ? currentUser.name.charAt(0).toUpperCase() : 'U'}
                    </div>
                    {/* Live Online Indicator Dot */}
                    <span className="absolute bottom-0 right-0 w-2.5 h-2.5 bg-primary-500 rounded-full border-2 border-white" />
                  </div>

                  {/* Name & Role Pill (Desktop) */}
                  <div className="hidden lg:block">
                    <div className="text-xs font-bold text-neutral-900 leading-tight truncate max-w-[150px]">
                      {currentUser.name}
                    </div>
                    <div className="text-[11px] text-neutral-500 leading-tight">
                      {roleConfig.label}
                    </div>
                  </div>

                  <ChevronDown className={`w-3.5 h-3.5 text-neutral-400 transition-transform ${profileDropdownOpen ? 'rotate-180' : ''}`} />
                </button>

                {/* Dropdown Menu Box */}
                {profileDropdownOpen && (
                  <div className="absolute right-0 mt-2 w-64 bg-white rounded-xl shadow-lg border border-neutral-200 py-2 z-50 animate-in fade-in slide-in-from-top-2 duration-150">
                    {/* User Header Details */}
                    <div className="px-4 py-3 border-b border-neutral-100">
                      <p className="text-xs text-neutral-400 font-medium uppercase tracking-wider">Masuk Sebagai</p>
                      <p className="text-sm font-bold text-neutral-900 truncate mt-0.5">{currentUser.name}</p>
                      <p className="text-xs text-neutral-500 truncate mt-0.5">
                        {currentUser.publisherName || currentUser.email}
                      </p>
                      <div className="mt-2.5">
                        <span className={`inline-flex items-center gap-1 text-[11px] font-semibold px-2.5 py-0.5 rounded-full border ${roleConfig.color}`}>
                          <ShieldCheck className="w-3 h-3" />
                          <span>{roleConfig.label}</span>
                        </span>
                      </div>
                    </div>

                    {/* Standard Info */}
                    <div className="px-4 py-2.5 bg-neutral-50 border-b border-neutral-100 text-[11px] text-neutral-600 flex items-center gap-2">
                      <CheckCircle2 className="w-3.5 h-3.5 text-primary-700 flex-shrink-0" />
                      <span>Standar Mushaf Usmani (SOP v2.2)</span>
                    </div>

                    {/* Action Items */}
                    <div className="p-1.5 space-y-0.5">
                      <Link
                        to="/verify-documents/DEMO-QR-TOKEN-2026"
                        className="flex items-center gap-2.5 px-3 py-2 text-xs font-medium text-neutral-700 hover:bg-neutral-50 rounded-lg transition-colors"
                      >
                        <ExternalLink className="w-3.5 h-3.5 text-neutral-400" />
                        <span>Pratinjau Verifikasi QR</span>
                      </Link>

                      <button
                        type="button"
                        onClick={handleLogout}
                        className="w-full flex items-center gap-2.5 px-3 py-2 text-xs font-semibold text-rose-600 hover:bg-rose-50 rounded-lg transition-colors text-left cursor-pointer"
                      >
                        <LogOut className="w-3.5 h-3.5" />
                        <span>Keluar Sesi (Logout)</span>
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
  );
};

export default Navbar;
