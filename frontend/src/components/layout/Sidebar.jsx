import React from 'react';
import { useAuth } from '@/features/auth/AuthContext';
import { NavLink, Link } from 'react-router-dom';
import {
  LayoutDashboard,
  FilePlus,
  FileText,
  CreditCard,
  Award,
  Users,
  CheckSquare,
  BookOpen,
  FolderCheck,
  Settings,
  ShieldCheck,
  CheckCircle2,
  X,
} from 'lucide-react';
import { clsx } from 'clsx';
import kemenagLogo from '@/assets/kemenag.png';
import lpmqLogo from '@/assets/lpmq.png';

export const Sidebar = ({ isOpen = true, onClose }) => {
  const { currentUser } = useAuth();
  const role = currentUser?.role || '';
  const roles = currentUser?.roles || [];

  const isPublisher =
    role === 'ADMIN_PENERBIT' ||
    role === 'PUBLISHER' ||
    roles.includes('ADMIN_PENERBIT');

  const isAdmin =
    role === 'SUPERADMIN' ||
    role === 'ADMIN' ||
    roles.includes('SUPERADMIN');

  const isVerifikator =
    role === 'VERIFIKATOR' ||
    role === 'VERIFICATOR' ||
    roles.includes('VERIFIKATOR');

  const isDistributor =
    role === 'DISTRIBUTOR' ||
    roles.includes('DISTRIBUTOR');

  const isPentashih =
    role === 'PENTASHIH' ||
    role === 'TASHIH_MEMBER' ||
    roles.includes('PENTASHIH');

  const isDokumentator =
    role === 'DOKUMENTATOR' ||
    role === 'DOCUMENTATOR' ||
    roles.includes('DOKUMENTATOR');

  const isKepala =
    role === 'KEPALA_LPMQ' ||
    role === 'HEAD_OF_LPMQ' ||
    roles.includes('KEPALA_LPMQ');

  const getRoleBadge = (userRole) => {
    switch (userRole) {
      case 'SUPERADMIN':
      case 'ADMIN':
        return { label: 'Superadmin', badgeClass: 'bg-gradient-to-r from-rose-600 to-red-600 text-white font-bold border-rose-700 shadow-2xs' };
      case 'VERIFIKATOR':
      case 'VERIFICATOR':
        return { label: 'Verifikator', badgeClass: 'bg-gradient-to-r from-sky-600 to-blue-600 text-white font-bold border-sky-700 shadow-2xs' };
      case 'DISTRIBUTOR':
        return { label: 'Distributor', badgeClass: 'bg-gradient-to-r from-amber-500 to-orange-500 text-white font-bold border-amber-600 shadow-2xs' };
      case 'PENTASHIH':
      case 'TASHIH_MEMBER':
        return { label: 'Pentashih', badgeClass: 'bg-gradient-to-r from-emerald-600 to-teal-600 text-white font-bold border-emerald-700 shadow-2xs' };
      case 'DOKUMENTATOR':
      case 'DOCUMENTATOR':
        return { label: 'Dokumentator', badgeClass: 'bg-gradient-to-r from-indigo-600 to-violet-600 text-white font-bold border-indigo-700 shadow-2xs' };
      case 'KEPALA_LPMQ':
      case 'HEAD_OF_LPMQ':
        return { label: 'Kepala LPMQ', badgeClass: 'bg-gradient-to-r from-amber-600 via-yellow-500 to-amber-500 text-white font-bold border-amber-600 shadow-2xs' };
      case 'ADMIN_PENERBIT':
      case 'PUBLISHER':
        return { label: 'Penerbit', badgeClass: 'bg-gradient-to-r from-teal-600 to-emerald-700 text-white font-bold border-teal-700 shadow-2xs' };
      default:
        return { label: userRole || 'Pengguna', badgeClass: 'bg-slate-700 text-white font-bold border-slate-800 shadow-2xs' };
    }
  };

  const roleBadge = getRoleBadge(role);

  // Grouped Navigation Items "Sesuai Alur" (Official Tashih Workflow Stages)
  const getNavSections = () => {
    if (isPublisher) {
      return [
        {
          title: 'UTAMA',
          items: [
            {
              label: 'Dashboard Penerbit',
              path: '/publisher',
              icon: <LayoutDashboard className="w-4 h-4 flex-shrink-0" />,
              end: true,
            },
          ],
        },
        {
          title: 'ALUR PENGAJUAN (SOP v2.2)',
          items: [
            {
              label: '1. Pengajuan Baru',
              path: '/publisher/new-registration',
              icon: <FilePlus className="w-4 h-4 flex-shrink-0" />,
              description: 'Pendaftaran naskah baru',
            },
            {
              label: '2. Riwayat Pengajuan',
              path: '/publisher/registrations',
              icon: <FileText className="w-4 h-4 flex-shrink-0" />,
              description: 'Status & perbaikan naskah',
            },
            {
              label: '3. Billing & PNBP',
              path: '/publisher/billing',
              icon: <CreditCard className="w-4 h-4 flex-shrink-0" />,
              description: 'Tagihan & konfirmasi bayar',
            },
            {
              label: '4. Surat Tanda Tashih',
              path: '/publisher/documents',
              icon: <Award className="w-4 h-4 flex-shrink-0" />,
              description: 'Unduh STT resmi & QR',
            },
          ],
        },
      ];
    }

    // Portal Petugas Internal LPMQ
    const internalSections = [
      {
        title: 'UTAMA',
        items: [
          {
            label: 'Dashboard Petugas',
            path: '/internal',
            icon: <LayoutDashboard className="w-4 h-4 flex-shrink-0" />,
            end: true,
          },
        ],
      },
    ];

    const workflowItems = [];

    if (isVerifikator || isAdmin) {
      workflowItems.push({
        label: '1. Verifikasi Berkas',
        path: '/internal/verifications',
        icon: <CheckSquare className="w-4 h-4 flex-shrink-0" />,
        description: 'Kelengkapan dokumen',
      });
    }

    if (isDistributor || isAdmin) {
      workflowItems.push({
        label: '2. Distribusi Sidang',
        path: '/internal/distributions',
        icon: <Users className="w-4 h-4 flex-shrink-0" />,
        description: 'SK & penugasan tim',
      });
    }

    if (isPentashih || isAdmin) {
      workflowItems.push({
        label: '3. Sidang Pentashihan',
        path: '/internal/tashih',
        icon: <BookOpen className="w-4 h-4 flex-shrink-0" />,
        description: 'Telaah lafazh naskah',
      });
    }

    if (isDokumentator || isKepala || isAdmin) {
      workflowItems.push({
        label: '4. Pengesahan & STT',
        path: '/internal/documents',
        icon: <FolderCheck className="w-4 h-4 flex-shrink-0" />,
        description: 'Berita acara & terbit STT',
      });
    }

    if (workflowItems.length > 0) {
      internalSections.push({
        title: 'ALUR PENTASHIHAN (SOP v2.2)',
        items: workflowItems,
      });
    }

    if (isAdmin) {
      internalSections.push({
        title: 'SISTEM & KONFIGURASI',
        items: [
          {
            label: '5. Master Data & Sistem',
            path: '/internal/settings',
            icon: <Settings className="w-4 h-4 flex-shrink-0" />,
            description: 'Kategori, layanan, addon',
          },
          {
            label: '6. Manajemen Pengguna',
            path: '/internal/users',
            icon: <Users className="w-4 h-4 flex-shrink-0" />,
            description: 'Kelola user & hak akses',
          },
        ],
      });

      internalSections.push({
        title: 'PORTAL PENERBIT (SUPER ADMIN)',
        items: [
          {
            label: 'Dashboard Penerbit',
            path: '/publisher',
            icon: <LayoutDashboard className="w-4 h-4 flex-shrink-0" />,
            description: 'Perspektif pemohon naskah',
          },
          {
            label: 'Ajukan Naskah Baru',
            path: '/publisher/new-registration',
            icon: <FilePlus className="w-4 h-4 flex-shrink-0" />,
            description: 'Pendaftaran naskah mushaf',
          },
        ],
      });
    }

    return internalSections;
  };

  const navSections = getNavSections();

  return (
    <>
      {/* Mobile Backdrop Overlay */}
      {isOpen && (
        <div
          className="fixed inset-0 bg-neutral-900/40 backdrop-blur-xs z-40 lg:hidden transition-opacity"
          onClick={onClose}
          aria-hidden="true"
        />
      )}

      {/* Sidebar Container */}
      <aside
        className={clsx(
          'fixed lg:static inset-y-0 left-0 z-50 lg:z-0',
          'w-72 bg-white border-r border-neutral-200/90 flex flex-col justify-between',
          'transition-all duration-300 ease-in-out shadow-lg lg:shadow-none',
          isOpen ? 'translate-x-0' : '-translate-x-full lg:hidden'
        )}
      >
        <div className="flex flex-col h-full overflow-hidden">
          
          {/* 1. Header Brand (Logo Kemenag + LPMQ + App Title) */}
          <div className="px-5 py-4 border-b border-neutral-100 flex items-center justify-between">
            <Link
              to={isPublisher ? '/publisher' : '/internal'}
              className="flex items-center gap-3 hover:opacity-95 transition-opacity"
              onClick={() => {
                if (window.innerWidth < 1024 && onClose) onClose();
              }}
            >
              <div className="flex items-center gap-2">
                <div className="w-12 h-12 rounded-xl bg-white border border-slate-200/90 shadow-xs flex items-center justify-center p-1.5 flex-shrink-0">
                  <img src={kemenagLogo} alt="Logo Kemenag" className="h-full w-auto object-contain drop-shadow-2xs" />
                </div>
                <div className="w-11 h-11 rounded-xl bg-white border border-slate-200/90 shadow-xs flex items-center justify-center p-1 flex-shrink-0">
                  <img src={lpmqLogo} alt="Logo LPMQ" className="h-full w-auto object-contain rounded" />
                </div>
              </div>
              <div>
                <span className="text-[10px] font-extrabold tracking-wider uppercase text-emerald-800 block">
                  Kemenag RI
                </span>
                <span className="text-sm font-black text-slate-900 block leading-tight">
                  LPMQ Tashih Hub
                </span>
              </div>
            </Link>

            {/* Close Button on Mobile */}
            <button
              type="button"
              onClick={onClose}
              className="p-1.5 rounded-lg text-neutral-400 hover:text-neutral-700 hover:bg-neutral-100 lg:hidden"
              aria-label="Tutup Menu"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* 2. User Mini Profile Card (ldksyahid-app style) */}
          {currentUser && (
            <div className="px-5 py-4 border-b border-neutral-100 bg-neutral-50/70">
              <div className="flex items-center gap-3">
                {/* Avatar with Live Green Dot Indicator */}
                <div className="relative flex-shrink-0">
                  <div className="w-10 h-10 rounded-full bg-primary-800 text-white font-bold flex items-center justify-center text-sm shadow-xs">
                    {currentUser.name ? currentUser.name.charAt(0).toUpperCase() : 'U'}
                  </div>
                  {/* Live Online Green Dot */}
                  <span
                    className="absolute bottom-0 right-0 w-3 h-3 bg-primary-500 rounded-full border-2 border-white shadow-2xs"
                    title="Online"
                  />
                </div>

                {/* User Name & Role Pill Badge */}
                <div className="min-w-0 flex-1">
                  <h6 className="text-xs font-bold text-neutral-900 truncate leading-snug">
                    {currentUser.name}
                  </h6>
                  <div className="mt-1">
                    <span
                      className={clsx(
                        'inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full border',
                        roleBadge.badgeClass
                      )}
                    >
                      <ShieldCheck className="w-2.5 h-2.5" />
                      <span>{roleBadge.label}</span>
                    </span>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* 3. Navigation Links (Grouped & Ordered "Sesuai Alur") */}
          <div className="flex-1 overflow-y-auto px-4 py-3 space-y-5">
            {navSections.map((section, idx) => (
              <div key={idx} className="space-y-1">
                <div className="px-2 py-1 text-[10px] font-bold uppercase tracking-wider text-neutral-400">
                  {section.title}
                </div>
                <nav className="space-y-1">
                  {section.items.map((item) => (
                    <NavLink
                      key={item.path}
                      to={item.path}
                      end={item.end}
                      onClick={() => {
                        if (window.innerWidth < 1024 && onClose) onClose();
                      }}
                      className={({ isActive }) =>
                        clsx(
                          'flex items-center gap-3 px-3 py-2.5 rounded-xl text-xs font-medium transition-all group',
                          isActive
                            ? 'bg-primary-700 text-white shadow-xs font-semibold'
                            : 'text-neutral-700 hover:bg-neutral-100 hover:text-primary-800'
                        )
                      }
                    >
                      {({ isActive }) => (
                        <>
                          <div
                            className={clsx(
                              'transition-colors',
                              isActive ? 'text-white' : 'text-neutral-400 group-hover:text-primary-700'
                            )}
                          >
                            {item.icon}
                          </div>
                          <div className="flex-1 truncate">
                            <span className="block leading-tight">{item.label}</span>
                            {item.description && !isActive && (
                              <span className="block text-[10px] text-neutral-400 truncate mt-0.5">
                                {item.description}
                              </span>
                            )}
                          </div>
                        </>
                      )}
                    </NavLink>
                  ))}
                </nav>
              </div>
            ))}
          </div>

          {/* 4. Bottom Standard SOP Info Card */}
          <div className="p-4 border-t border-neutral-100 bg-white">
            <div className="p-3 rounded-xl bg-neutral-50 border border-neutral-200/80">
              <div className="flex items-center gap-2">
                <CheckCircle2 className="w-3.5 h-3.5 text-primary-700 flex-shrink-0" />
                <span className="text-[11px] font-bold text-neutral-800">Standar Pentashihan</span>
              </div>
              <p className="text-[10px] text-neutral-500 mt-1 leading-relaxed">
                Mushaf Standar Usmani Kemenag RI (SOP v2.2)
              </p>
            </div>
          </div>

        </div>
      </aside>
    </>
  );
};

export default Sidebar;
