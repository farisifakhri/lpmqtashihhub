import React, { useState, useRef, useEffect } from 'react';
import { clsx } from 'clsx';
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
  Building2,
  KeyRound,
  Maximize2,
  Minimize2,
  Sparkles,
  Check,
} from 'lucide-react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useDensity } from '@/context/DensityContext';
import { useAvatar } from '@/context/AvatarContext';
import { UserAvatar } from '@/components/ui/UserAvatar';
import { AvatarPickerModal } from '@/components/ui/AvatarPickerModal';
import { CommandSearchDialog } from './CommandSearchDialog';
import { NotificationCenter } from './NotificationCenter';
import { PublisherProfileModal } from '@/features/registrations/PublisherProfileModal';
import { ChangePasswordModal } from '@/features/auth/ChangePasswordModal';
import Switcher from '@/features/darkmode/Switcher';
import kemenagLogo from '@/assets/kemenag.png';
import lpmqLogo from '@/assets/lpmq.png';

export const Navbar = ({ sidebarOpen, onToggleSidebar }) => {
  const { currentUser, logout, switchActiveRole } = useAuth();
  const { toggleDensity, isCompact } = useDensity();
  const navigate = useNavigate();
  const location = useLocation();
  const [profileDropdownOpen, setProfileDropdownOpen] = useState(false);
  const [roleDropdownOpen, setRoleDropdownOpen] = useState(false);
  const roleDropdownRef = useRef(null);
  const [profileModalOpen, setProfileModalOpen] = useState(false);
  const { avatarId, setAvatarId } = useAvatar();
  const [avatarPickerOpen, setAvatarPickerOpen] = useState(false);
  const [commandSearchOpen, setCommandSearchOpen] = useState(false);
  const [changePasswordModalOpen, setChangePasswordModalOpen] = useState(false);
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
      if (roleDropdownRef.current && !roleDropdownRef.current.contains(event.target)) {
        setRoleDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Close dropdown on route change
  useEffect(() => {
    setProfileDropdownOpen(false);
    setRoleDropdownOpen(false);
  }, [location.pathname]);

  const role = currentUser?.role || '';
  const isPublisher =
    role === 'PENERBIT' ||
    role === 'PUBLISHER' ||
    currentUser?.roles?.includes('PENERBIT');

  const homePath = isPublisher ? '/publisher' : '/internal';

  const getRoleConfig = (userRole) => {
    switch (userRole) {
      case 'SUPERADMIN':
        return { label: 'Administrator Sistem', color: 'bg-brand-50 text-brand-900 border-brand-200' };
      case 'ADMIN_INTERNAL':
        return { label: 'Helper Admin', color: 'bg-surface-subtle text-ink border-line' };
      case 'VERIFIKATOR':
      case 'VERIFICATOR':
        return { label: 'Verifikator Dokumen', color: 'bg-brand-50 text-brand-900 border-brand-200' };
      case 'DISTRIBUTOR':
        return { label: 'Koordinator Distribusi', color: 'bg-civic-infoSoft text-civic-info border-civic-infoLine' };
      case 'PENTASHIH':
      case 'TASHIH_MEMBER':
        return { label: 'Pentashih Naskah', color: 'bg-civic-infoSoft text-civic-info border-civic-infoLine' };
      case 'DOKUMENTATOR':
      case 'DOCUMENTATOR':
        return { label: 'Administrator Dokumen', color: 'bg-surface-subtle text-ink border-line' };
      case 'KEPALA_LPMQ':
      case 'HEAD_OF_LPMQ':
        return { label: 'Kepala LPMQ', color: 'bg-civicGold-100 text-civicGold-700 border-civicGold-700/40' };
      case 'PENERBIT':
      case 'PUBLISHER':
        return { label: 'Penerbit Terverifikasi', color: 'bg-brand-50 text-brand-900 border-brand-200' };
      default:
        return { label: userRole || 'Petugas', color: 'bg-surface-subtle text-ink border-line' };
    }
  };

  const roleConfig = getRoleConfig(role);

  // Dynamic breadcrumb mapping (max 3 levels)
  const getBreadcrumb = (pathname) => {
    if (pathname === '/publisher' || pathname === '/publisher/') {
      return { parent: null, name: 'Ikhtisar Layanan' };
    }
    if (pathname.startsWith('/publisher/new-registration')) {
      return { parent: 'Permohonan', name: 'Permohonan Naskah Baru' };
    }
    if (pathname.startsWith('/publisher/registrations')) {
      return { parent: 'Permohonan', name: 'Daftar Permohonan Saya' };
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
    if (pathname.startsWith('/internal/publishers')) {
      return { parent: 'Penerbit', name: 'Verifikasi Akun Penerbit' };
    }
    if (pathname.startsWith('/internal/master-intake')) {
      return { parent: 'Loket', name: 'Intake Master Fisik' };
    }
    if (pathname.startsWith('/internal/verifications')) {
      return { parent: 'Verifikasi', name: 'Verifikasi Berkas Naskah' };
    }
    if (pathname.startsWith('/internal/payments')) {
      return { parent: 'Keuangan', name: 'Verifikasi Pembayaran PNBP' };
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
    if (pathname.startsWith('/internal/archive')) {
      return { parent: 'Dokumentasi', name: 'Arsip Dokumen & Naskah' };
    }
    if (pathname.startsWith('/internal/core-teams')) {
      return { parent: 'Pentashihan', name: 'Tim Pentashih & Formatur' };
    }
    if (pathname.startsWith('/internal/settings/content')) {
      return { parent: 'Konfigurasi', name: 'Kelola Informasi Landing Page' };
    }
    if (pathname.startsWith('/internal/settings')) {
      return { parent: 'Konfigurasi', name: 'Master Data & Tata Kelola' };
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
      <header className="relative bg-surface/95 backdrop-blur-md border-b border-line sticky top-0 z-40 h-16 shadow-2xs transition-colors duration-200">
        {/* Subtle Top Accent Bar: Hijau Kemenag & Gold Aksen */}
        <div className="absolute top-0 left-0 right-0 h-[2px] bg-gradient-to-r from-brand-700 via-brand-600 to-civicGold-500" />

        <div className="w-full px-3 sm:px-6 lg:px-8 h-full">
          <div className="flex items-center justify-between h-full">
            {/* Left Side: Sidebar Toggler & Breadcrumbs */}
            <div className="flex items-center gap-2 sm:gap-3 min-w-0">
              <button
                type="button"
                onClick={onToggleSidebar}
                className="h-9 w-9 rounded-lg flex items-center justify-center text-ink-muted hover:text-brand-fg bg-surface-subtle/80 hover:bg-surface-strong/60 border border-line hover:border-brand-500/40 transition-all focus:outline-none focus:ring-2 focus:ring-brand-700/20 shadow-2xs active:scale-95 cursor-pointer"
                aria-label={sidebarOpen ? 'Tutup navigasi utama' : 'Buka navigasi utama'}
                title={sidebarOpen ? 'Tutup Sidebar' : 'Buka Sidebar'}
              >
                {sidebarOpen ? <X className="w-4 h-4" /> : <Menu className="w-4 h-4" />}
              </button>

              {/* Official Logos (Shown on mobile/tablet when sidebar is hidden) */}
              <div className="flex lg:hidden items-center gap-1.5 shrink-0">
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
                      className="h-8 w-8 rounded-lg flex items-center justify-center bg-surface-subtle/80 border border-line/70 text-ink-muted hover:text-brand-fg hover:border-brand-400/50 transition-all shadow-2xs"
                      title="Beranda"
                    >
                      <Home className="w-3.5 h-3.5 text-brand-fg" />
                    </Link>
                  </li>
                  {breadcrumb.parent && (
                    <li className="flex items-center gap-1.5">
                      <ChevronRight className="w-3.5 h-3.5 text-ink-muted/50 shrink-0" />
                      <span className="px-2 py-0.5 rounded-md bg-surface-subtle/60 border border-line/40 text-ink-muted whitespace-nowrap text-xs font-medium">
                        {breadcrumb.parent}
                      </span>
                    </li>
                  )}
                  <li className="flex items-center gap-1.5 min-w-0">
                    <ChevronRight className="w-3.5 h-3.5 text-ink-muted/50 shrink-0" />
                    <span className="px-2.5 py-1 rounded-md bg-brand-50 border border-brand-200 text-brand-900 font-semibold text-xs truncate max-w-[220px] md:max-w-xs shadow-2xs">
                      {breadcrumb.name}
                    </span>
                  </li>
                </ol>
              </nav>
            </div>

            {/* Right Side: Command Search, Notifications, Density, Theme, and Profile */}
            <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
              {/* Command Search Trigger Button */}
              <button
                type="button"
                onClick={() => setCommandSearchOpen(true)}
                className="h-9 flex items-center gap-2 px-3 rounded-lg bg-surface-subtle/80 hover:bg-surface-strong/60 border border-line hover:border-brand-500/50 text-xs text-ink-muted hover:text-ink transition-all shadow-2xs group cursor-pointer"
                aria-label="Pencarian cepat perintah (Ctrl+K)"
                title="Pencarian Cepat (Ctrl+K atau /)"
              >
                <Search className="w-3.5 h-3.5 text-ink-muted group-hover:text-brand-fg transition-colors" />
                <span className="hidden md:inline font-medium">Cari perintah...</span>
                <kbd className="hidden md:inline-flex items-center px-1.5 py-0.5 text-[10px] font-mono font-semibold text-ink-muted bg-surface border border-line rounded shadow-2xs group-hover:border-brand-300 transition-colors">
                  Ctrl+K
                </kbd>
              </button>

              {/* Notification Center */}
              <NotificationCenter />

              {/* Mode Kepadatan Tampilan (Nyaman / Ringkas) */}
              <button
                type="button"
                onClick={toggleDensity}
                className="hidden sm:inline-flex items-center gap-1.5 h-9 px-2.5 rounded-lg bg-surface-subtle/80 hover:bg-surface-strong/60 border border-line hover:border-brand-500/50 text-xs font-semibold text-ink-muted hover:text-ink transition-all shadow-2xs cursor-pointer group"
                title={`Kepadatan Tampilan: ${isCompact ? 'Ringkas (Klik untuk beralih ke Nyaman)' : 'Nyaman (Klik untuk beralih ke Ringkas)'}`}
                aria-label="Ganti mode kepadatan tampilan"
              >
                {isCompact ? (
                  <Minimize2 className="w-3.5 h-3.5 text-brand-fg group-hover:scale-110 transition-transform" />
                ) : (
                  <Maximize2 className="w-3.5 h-3.5 text-brand-fg group-hover:scale-110 transition-transform" />
                )}
                <span className="hidden xl:inline">{isCompact ? 'Ringkas' : 'Nyaman'}</span>
              </button>

              {/* Mode Tema Gelap / Terang */}
              <Switcher />

              {/* Quick Role Switcher Dropdown (Multi-Role Support) */}
              {currentUser?.roles && currentUser.roles.length > 1 && (
                <div className="relative" ref={roleDropdownRef}>
                  <button
                    type="button"
                    onClick={() => setRoleDropdownOpen((prev) => !prev)}
                    className="flex items-center gap-1.5 h-10 px-3 rounded-xl border border-brand-200 bg-brand-50/80 hover:bg-brand-100/90 text-brand-900 text-xs font-bold transition-all shadow-2xs cursor-pointer focus:outline-none focus:ring-2 focus:ring-brand-600/30"
                    aria-expanded={roleDropdownOpen}
                    aria-haspopup="true"
                    aria-label="Pilih Peran Pengguna Aktif"
                    title="Klik untuk berpindah peran aktif"
                  >
                    <ShieldCheck className="w-3.5 h-3.5 text-brand-700 shrink-0" />
                    <span className="hidden sm:inline truncate max-w-[130px]">{roleConfig.label}</span>
                    <span className="sm:hidden text-[11px] font-extrabold">{currentUser.roles.length} Peran</span>
                    <ChevronDown
                      className={`w-3.5 h-3.5 text-brand-700 transition-transform duration-200 ${
                        roleDropdownOpen ? 'rotate-180' : ''
                      }`}
                    />
                  </button>

                  {roleDropdownOpen && (
                    <div className="absolute right-0 mt-2 w-64 bg-surface rounded-xl shadow-xl border border-line py-1.5 z-50 animate-slideUp">
                      <div className="px-3.5 py-2 border-b border-line text-[10px] font-extrabold uppercase tracking-wider text-ink-muted">
                        Pilih Peran Aktif ({currentUser.roles.length} Peran)
                      </div>
                      <div className="p-1.5 space-y-1">
                        {currentUser.roles.map((rCode) => {
                          const config = getRoleConfig(rCode);
                          const isActive = rCode === role;
                          return (
                            <button
                              key={rCode}
                              type="button"
                              onClick={() => {
                                switchActiveRole(rCode);
                                setRoleDropdownOpen(false);
                                if (rCode === 'PENERBIT' && !location.pathname.startsWith('/publisher')) {
                                  navigate('/publisher');
                                } else if (rCode !== 'PENERBIT' && location.pathname.startsWith('/publisher')) {
                                  navigate('/internal');
                                }
                              }}
                              className={clsx(
                                "w-full flex items-center justify-between px-2.5 py-2 rounded-lg text-xs font-semibold transition-all cursor-pointer",
                                isActive
                                  ? "bg-brand-700 text-white shadow-2xs font-bold"
                                  : "text-ink hover:bg-brand-50/70"
                              )}
                            >
                              <div className="flex items-center gap-2 truncate">
                                <ShieldCheck className={clsx("w-3.5 h-3.5 shrink-0", isActive ? "text-white" : "text-brand-700")} />
                                <span className="truncate">{config.label}</span>
                              </div>
                              {isActive && <Check className="w-3.5 h-3.5 shrink-0 ml-1" />}
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* Profile Menu Dropdown */}
              {currentUser && (
                <div className="relative" ref={dropdownRef}>
                  <button
                    type="button"
                    onClick={() => setProfileDropdownOpen((prev) => !prev)}
                    className={`flex items-center gap-2 h-10 pl-1.5 pr-2.5 rounded-xl transition-all text-left focus:outline-none focus:ring-2 focus:ring-brand-600/30 cursor-pointer shadow-2xs ${
                      profileDropdownOpen
                        ? 'bg-surface-subtle border-brand-500/60 ring-2 ring-brand-500/10'
                        : 'bg-surface-subtle/70 hover:bg-surface-subtle border border-line/80 hover:border-brand-400/50'
                    }`}
                    aria-expanded={profileDropdownOpen}
                    aria-haspopup="true"
                    aria-label={`Menu profil ${currentUser.name}`}
                  >
                    <UserAvatar
                      avatarId={avatarId}
                      name={currentUser.name}
                      role={role}
                      size="sm"
                      showRoleBadge
                    />

                    <div className="hidden lg:block leading-tight">
                      <div className="text-xs font-bold text-ink truncate max-w-[130px]">
                        {currentUser.name}
                      </div>
                      <div className="text-[11px] text-ink-muted truncate max-w-[130px] font-medium">
                        {roleConfig.label}
                      </div>
                    </div>

                    <ChevronDown
                      className={`w-3.5 h-3.5 text-ink-muted transition-transform duration-200 ${
                        profileDropdownOpen ? 'rotate-180 text-brand-fg' : ''
                      }`}
                    />
                  </button>

                  {/* Dropdown Menu */}
                  {profileDropdownOpen && (
                    <div className="absolute right-0 mt-2 w-72 bg-surface rounded-xl shadow-xl border border-line py-1.5 z-50 animate-slideUp">
                      <div className="px-4 py-3 border-b border-line bg-surface-subtle/40">
                        <p className="text-[10px] text-ink-muted font-bold uppercase tracking-wider mb-2">Sesi Aktif</p>
                        <div className="flex items-center gap-3">
                          <UserAvatar
                            avatarId={avatarId}
                            name={currentUser.name}
                            role={role}
                            size="md"
                            showRoleBadge
                          />
                          <div className="min-w-0 flex-1">
                            <p className="text-xs font-bold text-ink truncate">{currentUser.name}</p>
                            <p className="text-[11px] text-ink-muted truncate">
                              {currentUser.publisherName || currentUser.email}
                            </p>
                            <div className="mt-1">
                              <span className={`inline-flex items-center gap-1 text-[10px] font-semibold px-2 py-0.5 rounded border ${roleConfig.color}`}>
                                <ShieldCheck className="w-3 h-3" />
                                <span>{roleConfig.label}</span>
                              </span>
                            </div>
                          </div>
                        </div>
                      </div>

                      <div className="px-3.5 py-1.5 bg-surface-subtle/30 border-b border-line/60 text-[11px] text-ink-muted flex items-center gap-1.5">
                        <span className="w-1.5 h-1.5 rounded-full bg-brand-700 shrink-0" />
                        <span>Kontrol proses mengacu pada SOP Pentashihan LPMQ</span>
                      </div>

                      {/* Ganti Peran Aktif jika memiliki peran ganda (Item 21) */}
                      {currentUser?.roles && currentUser.roles.length > 1 && (
                        <div className="p-2.5 mx-2 my-1.5 bg-brand-50/70 rounded-xl border border-brand-200/80 space-y-1.5">
                          <div className="flex items-center justify-between text-[10px] font-extrabold uppercase tracking-wider text-brand-900">
                            <span>Ganti Peran ({currentUser.roles.length} Peran Tersedia)</span>
                          </div>
                          <div className="space-y-1">
                            {currentUser.roles.map((rCode) => {
                              const config = getRoleConfig(rCode);
                              const isActive = rCode === role;
                              return (
                                <button
                                  key={rCode}
                                  type="button"
                                  onClick={() => {
                                    switchActiveRole(rCode);
                                    setProfileDropdownOpen(false);
                                    if (rCode === 'PENERBIT' && !location.pathname.startsWith('/publisher')) {
                                      navigate('/publisher');
                                    } else if (rCode !== 'PENERBIT' && location.pathname.startsWith('/publisher')) {
                                      navigate('/internal');
                                    }
                                  }}
                                  className={clsx(
                                    "w-full flex items-center justify-between px-2.5 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer",
                                    isActive
                                      ? "bg-brand-700 text-white shadow-2xs font-bold"
                                      : "text-ink hover:bg-surface"
                                  )}
                                >
                                  <div className="flex items-center gap-2 truncate">
                                    <ShieldCheck className={clsx("w-3.5 h-3.5 shrink-0", isActive ? "text-white" : "text-brand-700")} />
                                    <span className="truncate">{config.label}</span>
                                  </div>
                                  {isActive && <Check className="w-3.5 h-3.5 shrink-0 ml-1" />}
                                </button>
                              );
                            })}
                          </div>
                        </div>
                      )}

                      <div className="p-1.5 space-y-0.5">
                        <button
                          type="button"
                          onClick={() => {
                            setProfileDropdownOpen(false);
                            setAvatarPickerOpen(true);
                          }}
                          className="w-full flex items-center gap-2.5 px-3 py-2 text-xs font-medium text-ink hover:bg-brand-50/80 hover:text-brand-900 rounded-lg transition-colors text-left cursor-pointer group"
                        >
                          <Sparkles className="w-4 h-4 text-brand-700 group-hover:scale-110 transition-transform" />
                          <span>Pilih Avatar Profil Islami</span>
                        </button>

                        {currentUser.publisherId && (
                          <button
                            type="button"
                            onClick={() => {
                              setProfileDropdownOpen(false);
                              setProfileModalOpen(true);
                            }}
                            className="w-full flex items-center gap-2.5 px-3 py-2 text-xs font-medium text-ink hover:bg-brand-50/80 rounded-lg transition-colors text-left cursor-pointer"
                          >
                            <Building2 className="w-4 h-4 text-ink-muted" />
                            <span>Profil Penerbit (Terkunci)</span>
                          </button>
                        )}

                        <Link
                          to={currentUser?.publisher?.nomor_induk_penerbit ? `/verifikasi/sertifikat/${encodeURIComponent(currentUser.publisher.nomor_induk_penerbit)}` : '/verifikasi/sertifikat/31.74.26.10.19.001'}
                          onClick={() => setProfileDropdownOpen(false)}
                          className="flex items-center gap-2.5 px-3 py-2 text-xs font-medium text-ink hover:bg-brand-50/80 hover:text-brand-900 rounded-lg transition-colors"
                        >
                          <QrCode className="w-4 h-4 text-brand-700" />
                          <span>Verifikasi Sertifikat Penerbit (QR)</span>
                        </Link>

                        <button
                          type="button"
                          onClick={() => {
                            setProfileDropdownOpen(false);
                            setChangePasswordModalOpen(true);
                          }}
                          className="w-full flex items-center gap-2.5 px-3 py-2 text-xs font-medium text-ink hover:bg-brand-50/80 rounded-lg transition-colors text-left cursor-pointer"
                        >
                          <KeyRound className="w-4 h-4 text-ink-muted" />
                          <span>Ganti Kata Sandi</span>
                        </button>

                        <div className="pt-1 mt-1 border-t border-line/60">
                          <button
                            type="button"
                            onClick={handleLogout}
                            className="w-full flex items-center gap-2.5 px-3 py-2 text-xs font-semibold text-civic-danger hover:bg-civic-dangerSoft/80 rounded-lg transition-colors text-left cursor-pointer"
                          >
                            <LogOut className="w-4 h-4" />
                            <span>Akhiri Sesi</span>
                          </button>
                        </div>
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

      {/* Avatar Picker Modal */}
      <AvatarPickerModal
        isOpen={avatarPickerOpen}
        onClose={() => setAvatarPickerOpen(false)}
        currentAvatarId={avatarId}
        onSelectAvatar={setAvatarId}
        userName={currentUser?.name}
        userRole={role}
      />

      {/* Publisher Profile Modal */}
      <PublisherProfileModal
        isOpen={profileModalOpen}
        onClose={() => setProfileModalOpen(false)}
      />

      {/* Change Password Modal */}
      <ChangePasswordModal
        isOpen={changePasswordModalOpen}
        onClose={() => setChangePasswordModalOpen(false)}
      />
    </>
  );
};

export default Navbar;
