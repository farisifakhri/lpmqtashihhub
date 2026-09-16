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
  PackageCheck,
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

  const isSuperAdmin =
    role === 'SUPERADMIN' ||
    roles.includes('SUPERADMIN');

  const isAdmin =
    role === 'ADMIN' ||
    roles.includes('ADMIN');

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
        return { label: 'Superadmin', badgeClass: 'bg-slate-100 text-slate-800 border-slate-300' };
      case 'ADMIN':
        return { label: 'Admin Internal', badgeClass: 'bg-slate-100 text-slate-800 border-slate-300' };
      case 'VERIFIKATOR':
      case 'VERIFICATOR':
        return { label: 'Verifikator', badgeClass: 'bg-emerald-50 text-emerald-900 border-emerald-300' };
      case 'DISTRIBUTOR':
        return { label: 'Distributor', badgeClass: 'bg-emerald-50 text-emerald-900 border-emerald-300' };
      case 'PENTASHIH':
      case 'TASHIH_MEMBER':
        return { label: 'Pentashih', badgeClass: 'bg-emerald-50 text-emerald-900 border-emerald-300' };
      case 'DOKUMENTATOR':
      case 'DOCUMENTATOR':
        return { label: 'Dokumentator', badgeClass: 'bg-emerald-50 text-emerald-900 border-emerald-300' };
      case 'KEPALA_LPMQ':
      case 'HEAD_OF_LPMQ':
        return { label: 'Kepala LPMQ', badgeClass: 'bg-amber-50 text-amber-900 border-amber-300' };
      case 'ADMIN_PENERBIT':
      case 'PUBLISHER':
        return { label: 'Penerbit', badgeClass: 'bg-slate-100 text-slate-800 border-slate-300' };
      default:
        return { label: userRole || 'Pengguna', badgeClass: 'bg-slate-100 text-slate-700 border-slate-300' };
    }
  };

  const roleBadge = getRoleBadge(role);

  // Grouped Navigation Items (Official Tashih Workflow Stages)
  const getNavSections = () => {
    if (isPublisher) {
      return [
        {
          title: 'UTAMA',
          items: [
            {
              label: 'Ikhtisar Layanan',
              path: '/publisher',
              icon: <LayoutDashboard className="w-4 h-4 shrink-0" />,
              end: true,
            },
          ],
        },
        {
          title: 'SIKLUS PENGAJUAN',
          items: [
            {
              label: '1. Pengajuan Baru',
              path: '/publisher/new-registration',
              icon: <FilePlus className="w-4 h-4 shrink-0" />,
              description: 'Pendaftaran naskah baru',
            },
            {
              label: '2. Portofolio Pengajuan',
              path: '/publisher/registrations',
              icon: <FileText className="w-4 h-4 shrink-0" />,
              description: 'Status & perbaikan naskah',
            },
            {
              label: '3. Tagihan dan PNBP',
              path: '/publisher/billing',
              icon: <CreditCard className="w-4 h-4 shrink-0" />,
              description: 'Tagihan & konfirmasi bayar',
            },
            {
              label: '4. Surat Tanda Tashih',
              path: '/publisher/documents',
              icon: <Award className="w-4 h-4 shrink-0" />,
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
            label: 'Kendali Operasional',
            path: '/internal',
            icon: <LayoutDashboard className="w-4 h-4 shrink-0" />,
            end: true,
          },
        ],
      },
    ];

    const workflowItems = [];

    if (isVerifikator || isKepala || isSuperAdmin) {
      workflowItems.push({
        label: isKepala ? '1. Verifikasi & Persetujuan' : '1. Verifikasi Berkas',
        path: '/internal/verifications',
        icon: <CheckSquare className="w-4 h-4 shrink-0" />,
        description: isKepala ? 'Nota dinas penugasan & approval draf' : 'Kelengkapan berkas & rasm',
      });
    }

    if (isAdmin || isSuperAdmin) {
      workflowItems.push({
        label: '1a. Intake Master Fisik',
        path: '/internal/master-intake',
        icon: <PackageCheck className="w-4 h-4 shrink-0" />,
        description: 'Pencocokan print-out master A4',
      });
    }

    if (isAdmin || isSuperAdmin || isVerifikator || isKepala) {
      workflowItems.push({
        label: '1b. Verifikasi Pembayaran',
        path: '/internal/payments',
        icon: <CreditCard className="w-4 h-4 shrink-0" />,
        description: 'Setoran PNBP SIMPONI',
      });
    }

    if (isDistributor || isVerifikator || isKepala || isSuperAdmin) {
      workflowItems.push({
        label: '2. Distribusi Sidang',
        path: '/internal/distributions',
        icon: <Users className="w-4 h-4 shrink-0" />,
        description: 'Serah-terima fisik & tim sidang',
      });
    }

    if (isPentashih || isSuperAdmin) {
      workflowItems.push({
        label: '3. Sidang Pentashihan',
        path: '/internal/tashih',
        icon: <BookOpen className="w-4 h-4 shrink-0" />,
        description: 'Telaah lafazh naskah',
      });
    }

    if (isDokumentator || isKepala || isSuperAdmin) {
      workflowItems.push({
        label: '4. Pengesahan & STT',
        path: '/internal/documents',
        icon: <FolderCheck className="w-4 h-4 shrink-0" />,
        description: 'Berita acara & terbit STT',
      });
    }

    if (workflowItems.length > 0) {
      internalSections.push({
        title: 'PROSES BISNIS PENTASHIHAN',
        items: workflowItems,
      });
    }

    if (isSuperAdmin) {
      internalSections.push({
        title: 'TATA KELOLA SISTEM',
        items: [
          {
            label: '5. Data Induk dan Parameter',
            path: '/internal/settings',
            icon: <Settings className="w-4 h-4 shrink-0" />,
            description: 'Kategori, layanan, tarif, dan SLA',
          },
          {
            label: '6. Identitas dan Akses',
            path: '/internal/users',
            icon: <Users className="w-4 h-4 shrink-0" />,
            description: 'Akun, peran, dan kewenangan',
          },
        ],
      });
      internalSections.push({
        title: 'PORTAL PENERBIT (SIMULASI)',
        items: [
          {
            label: 'Dashboard Penerbit',
            path: '/publisher',
            icon: <LayoutDashboard className="w-4 h-4 shrink-0" />,
            description: 'Perspektif pemohon naskah',
          },
          {
            label: 'Ajukan Naskah Baru',
            path: '/publisher/new-registration',
            icon: <FilePlus className="w-4 h-4 shrink-0" />,
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
          className="fixed inset-0 bg-slate-900/40 backdrop-blur-xs z-40 lg:hidden transition-opacity"
          onClick={onClose}
          aria-hidden="true"
        />
      )}

      {/* Sidebar Container */}
      <aside
        className={clsx(
          'fixed lg:static inset-y-0 left-0 z-50 lg:z-0',
          'w-72 bg-slate-50 border-r border-slate-200 flex flex-col justify-between',
          'transition-all duration-300 ease-in-out shadow-lg lg:shadow-none',
          isOpen ? 'translate-x-0' : '-translate-x-full lg:hidden'
        )}
      >
        <div className="flex flex-col h-full overflow-hidden">
          {/* 1. Header Brand (Logo Kemenag + LPMQ + App Title) */}
          <div className="px-5 py-4 border-b border-slate-200 bg-white flex items-center justify-between">
            <Link
              to={isPublisher ? '/publisher' : '/internal'}
              className="flex items-center gap-3 hover:opacity-95 transition-opacity"
              onClick={() => {
                if (window.innerWidth < 1024 && onClose) onClose();
              }}
            >
              <div className="flex items-center gap-2">
                <div className="w-11 h-11 rounded-xl bg-white border border-slate-200 shadow-2xs flex items-center justify-center p-1 shrink-0">
                  <img src={kemenagLogo} alt="Logo Kemenag" className="h-full w-auto object-contain" />
                </div>
                <div className="w-10 h-10 rounded-xl bg-white border border-slate-200 shadow-2xs flex items-center justify-center p-1 shrink-0">
                  <img src={lpmqLogo} alt="Logo LPMQ" className="h-full w-auto object-contain rounded" />
                </div>
              </div>
              <div>
                <span className="text-[10px] font-extrabold tracking-wider uppercase text-emerald-800 block">
                  Kemenag RI
                </span>
                <span className="text-sm font-black text-slate-900 block leading-tight">
                  Sistem Pentashihan
                </span>
              </div>
            </Link>

            {/* Close Button on Mobile */}
            <button
              type="button"
              onClick={onClose}
              className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 lg:hidden"
              aria-label="Tutup Menu"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* 2. User Mini Profile Card */}
          {currentUser && (
            <div className="mx-4 mt-4 px-3.5 py-3 rounded-xl border border-slate-200 bg-white shadow-2xs">
              <div className="flex items-center gap-3">
                {/* Avatar with Live Green Dot Indicator */}
                <div className="relative shrink-0">
                  <div className="w-9 h-9 rounded-lg bg-emerald-800 text-white font-bold flex items-center justify-center text-xs shadow-2xs">
                    {currentUser.name ? currentUser.name.charAt(0).toUpperCase() : 'U'}
                  </div>
                  <span
                    className="absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 bg-emerald-500 rounded-full border-2 border-white"
                    title="Online"
                  />
                </div>

                {/* User Name & Role Badge (Non-pill) */}
                <div className="min-w-0 flex-1">
                  <h6 className="text-xs font-bold text-slate-900 truncate leading-snug">
                    {currentUser.name}
                  </h6>
                  <div className="mt-1">
                    <span
                      className={clsx(
                        'inline-flex items-center gap-1 text-[11px] font-semibold px-2 py-0.5 rounded-md border',
                        roleBadge.badgeClass
                      )}
                    >
                      <ShieldCheck className="w-3 h-3" />
                      <span>{roleBadge.label}</span>
                    </span>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* 3. Navigation Links */}
          <div className="flex-1 overflow-y-auto px-3 py-4 space-y-5">
            {navSections.map((section, idx) => (
              <div key={idx} className="space-y-1">
                <div className="px-3 py-1 text-[10px] font-extrabold uppercase tracking-wider text-slate-500">
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
                          'relative flex items-center gap-2.5 px-3 py-2 rounded-lg text-xs font-medium transition-all group',
                          isActive
                            ? 'bg-white border border-slate-200 text-emerald-900 shadow-2xs font-bold'
                            : 'text-slate-700 hover:bg-white hover:text-emerald-800'
                        )
                      }
                    >
                      {({ isActive }) => (
                        <>
                          <div
                            className={clsx(
                              'transition-colors',
                              isActive ? 'text-emerald-700' : 'text-slate-400 group-hover:text-emerald-700'
                            )}
                          >
                            {item.icon}
                          </div>
                          <div className="flex-1 truncate">
                            <span className="block leading-tight">{item.label}</span>
                            {item.description && !isActive && (
                              <span className="block text-[10px] text-slate-400 truncate mt-0.5">
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
          <div className="p-3 border-t border-slate-200 bg-white">
            <div className="p-2.5 rounded-lg bg-slate-50 border border-slate-200">
              <div className="flex items-center gap-1.5">
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-700 shrink-0" />
                <span className="text-[11px] font-bold text-slate-800">Standar Pentashihan</span>
              </div>
              <p className="text-[10px] text-slate-500 mt-0.5 leading-relaxed">
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
