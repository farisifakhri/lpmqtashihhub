import React from 'react';
import { useAuth } from '@/features/auth/AuthContext';
import { NavLink, Link, useLocation } from 'react-router-dom';
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
  Send,
  HelpCircle,
  User,
  Calendar,
  FileSearch,
  PenTool,
  Clock,
  X,
} from 'lucide-react';
import { clsx } from 'clsx';
import kemenagLogo from '@/assets/kemenag.png';
import lpmqLogo from '@/assets/lpmq.png';

export const Sidebar = ({ isOpen = true, onClose }) => {
  const { currentUser } = useAuth();
  const location = useLocation();
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
        return { label: 'Verifikator', badgeClass: 'bg-brand-50 text-brand-900 border-brand-100' };
      case 'DISTRIBUTOR':
        return { label: 'Distributor', badgeClass: 'bg-brand-50 text-brand-900 border-brand-100' };
      case 'PENTASHIH':
      case 'TASHIH_MEMBER':
        return { label: 'Pentashih', badgeClass: 'bg-brand-50 text-brand-900 border-brand-100' };
      case 'DOKUMENTATOR':
      case 'DOCUMENTATOR':
        return { label: 'Dokumentator', badgeClass: 'bg-brand-50 text-brand-900 border-brand-100' };
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

  // Navigasi Berbasis Peran sesuai Dokumen Bab 6
  const getNavSections = () => {
    if (isPublisher) {
      return [
        {
          title: 'PORTAL PENERBIT',
          items: [
            {
              label: 'Beranda',
              path: '/publisher',
              icon: <LayoutDashboard className="w-4 h-4 shrink-0" />,
              end: true,
            },
            {
              label: 'Pengajuan Saya',
              path: '/publisher/registrations',
              icon: <FileText className="w-4 h-4 shrink-0" />,
              description: 'Portofolio naskah & riwayat',
            },
            {
              label: 'Buat Pengajuan',
              path: '/publisher/new-registration',
              icon: <FilePlus className="w-4 h-4 shrink-0" />,
              description: 'Pendaftaran naskah baru',
            },
            {
              label: 'Tagihan',
              path: '/publisher/billing',
              icon: <CreditCard className="w-4 h-4 shrink-0" />,
              description: 'Billing SIMPONI & bukti bayar',
            },
            {
              label: 'Dokumen Resmi',
              path: '/publisher/documents',
              icon: <Award className="w-4 h-4 shrink-0" />,
              description: 'Surat Tanda Tashih & QR',
            },
          ],
        },
      ];
    }

    // Role Internal: Admin
    if (isAdmin && !isSuperAdmin) {
      return [
        {
          title: 'ADMINISTRASI LOKET',
          items: [
            {
              label: 'Kendali Operasional',
              path: '/internal',
              icon: <LayoutDashboard className="w-4 h-4 shrink-0" />,
              end: true,
            },
            {
              label: 'Penerimaan Master',
              path: '/internal/master-intake',
              icon: <PackageCheck className="w-4 h-4 shrink-0" />,
              description: 'Intake naskah fisik A4',
            },
            {
              label: 'Verifikasi Pembayaran',
              path: '/internal/payments',
              icon: <CreditCard className="w-4 h-4 shrink-0" />,
              description: 'Setoran PNBP SIMPONI',
            },
          ],
        },
      ];
    }

    // Role Internal: Kepala LPMQ
    if (isKepala && !isSuperAdmin) {
      return [
        {
          title: 'MANAJEMEN & PENGESAHAN',
          items: [
            {
              label: 'Kendali Operasional',
              path: '/internal',
              icon: <LayoutDashboard className="w-4 h-4 shrink-0" />,
              end: true,
            },
            {
              label: 'Perlu Penugasan',
              path: '/internal/verifications?tab=NEED_ASSIGNMENT',
              icon: <CheckSquare className="w-4 h-4 shrink-0" />,
              description: 'Nota Dinas & verifikator',
            },
            {
              label: 'Persetujuan Verifikasi',
              path: '/internal/verifications?tab=NEED_APPROVAL',
              icon: <CheckSquare className="w-4 h-4 shrink-0" />,
              description: 'Telaah draf hasil verifikasi',
            },
            {
              label: 'Tanda Tangan',
              path: '/internal/signatures',
              icon: <PenTool className="w-4 h-4 shrink-0" />,
              description: 'Tanda tangan digital resmi',
            },
            {
              label: 'Penetapan STT',
              path: '/internal/documents',
              icon: <Award className="w-4 h-4 shrink-0" />,
              description: 'Penetapan Surat Tanda Tashih',
            },
          ],
        },
      ];
    }

    // Role Internal: Verifikator
    if (isVerifikator && !isSuperAdmin) {
      return [
        {
          title: 'VERIFIKASI BERKAS & RASM',
          items: [
            {
              label: 'Kendali Operasional',
              path: '/internal',
              icon: <LayoutDashboard className="w-4 h-4 shrink-0" />,
              end: true,
            },
            {
              label: 'Tugas Verifikasi',
              path: '/internal/verifications',
              icon: <CheckSquare className="w-4 h-4 shrink-0" />,
              description: 'Pemeriksaan naskah & draf',
            },
            {
              label: 'Tanda Tangan Saya',
              path: '/internal/signatures',
              icon: <PenTool className="w-4 h-4 shrink-0" />,
              description: 'Berita acara pemeriksaan',
            },
            {
              label: 'Siap Dikirim',
              path: '/internal/verifications?tab=READY_TO_SEND',
              icon: <Send className="w-4 h-4 shrink-0" />,
              description: 'Kirim surat hasil verifikasi',
            },
            {
              label: 'Verifikasi Pembayaran',
              path: '/internal/payments',
              icon: <CreditCard className="w-4 h-4 shrink-0" />,
              description: 'Validasi setoran SIMPONI',
            },
            {
              label: 'Serah-terima Master',
              path: '/internal/distributions',
              icon: <Users className="w-4 h-4 shrink-0" />,
              description: 'BAST ke tim distribusi',
            },
          ],
        },
      ];
    }

    // Role Internal: Distributor
    if (isDistributor && !isSuperAdmin) {
      return [
        {
          title: 'DISTRIBUSI SIDANG',
          items: [
            {
              label: 'Kendali Operasional',
              path: '/internal',
              icon: <LayoutDashboard className="w-4 h-4 shrink-0" />,
              end: true,
            },
            {
              label: 'Master Menunggu Diterima',
              path: '/internal/distributions',
              icon: <PackageCheck className="w-4 h-4 shrink-0" />,
              description: 'Konfirmasi fisik master',
            },
            {
              label: 'Distribusi Tim',
              path: '/internal/distributions',
              icon: <Users className="w-4 h-4 shrink-0" />,
              description: 'Bagi tugas anggota sidang',
            },
          ],
        },
      ];
    }

    // Role Internal: Pentashih
    if (isPentashih && !isSuperAdmin) {
      return [
        {
          title: 'SIDANG PENTASHIHAN',
          items: [
            {
              label: 'Kendali Operasional',
              path: '/internal',
              icon: <LayoutDashboard className="w-4 h-4 shrink-0" />,
              end: true,
            },
            {
              label: 'Tugas Saya',
              path: '/internal/tashih',
              icon: <BookOpen className="w-4 h-4 shrink-0" />,
              description: 'Koreksi lafaz & tanda baca',
            },
          ],
        },
      ];
    }

    // Role: Superadmin (Akses Penuh & Navigasi Operasional Komprehensif)
    return [
      {
        title: 'KENDALI UTAMA',
        items: [
          {
            label: 'Kendali Operasional',
            path: '/internal',
            icon: <LayoutDashboard className="w-4 h-4 shrink-0" />,
            end: true,
          },
        ],
      },
      {
        title: 'PROSES PENTASHIHAN',
        items: [
          {
            label: '1. Verifikasi Berkas',
            path: '/internal/verifications',
            icon: <CheckSquare className="w-4 h-4 shrink-0" />,
            description: 'Pemeriksaan kelengkapan & rasm',
          },
          {
            label: '1a. Intake Master Fisik',
            path: '/internal/master-intake',
            icon: <PackageCheck className="w-4 h-4 shrink-0" />,
            description: 'Print-out master A4',
          },
          {
            label: '1b. Verifikasi Pembayaran',
            path: '/internal/payments',
            icon: <CreditCard className="w-4 h-4 shrink-0" />,
            description: 'Setoran PNBP SIMPONI',
          },
          {
            label: '2. Distribusi Sidang',
            path: '/internal/distributions',
            icon: <Users className="w-4 h-4 shrink-0" />,
            description: 'Serah-terima fisik & SK tim',
          },
          {
            label: '3. Sidang Pentashihan',
            path: '/internal/tashih',
            icon: <BookOpen className="w-4 h-4 shrink-0" />,
            description: 'Telaah lafazh & harakat',
          },
          {
            label: '4. Pengesahan & STT',
            path: '/internal/documents',
            icon: <FolderCheck className="w-4 h-4 shrink-0" />,
            description: 'Berita acara & STT resmi',
          },
        ],
      },
      {
        title: 'TATA KELOLA SISTEM',
        items: [
          {
            label: '5. Data Induk dan Parameter',
            path: '/internal/settings',
            icon: <Settings className="w-4 h-4 shrink-0" />,
            description: 'Kategori, tarif, dan SLA',
          },
          {
            label: '6. Identitas dan Akses',
            path: '/internal/users',
            icon: <Users className="w-4 h-4 shrink-0" />,
            description: 'Akun, peran, dan wewenang',
          },
        ],
      },
      {
        title: 'PORTAL PENERBIT (SIMULASI)',
        items: [
          {
            label: 'Dashboard Penerbit',
            path: '/publisher',
            icon: <LayoutDashboard className="w-4 h-4 shrink-0" />,
            description: 'Perspektif pemohon naskah',
          },
        ],
      },
    ];
  };

  const navSections = getNavSections();

  return (
    <>
      {/* Mobile Backdrop Overlay */}
      {isOpen && (
        <div
          className="fixed inset-0 bg-ink/40 backdrop-blur-xs z-40 lg:hidden transition-opacity"
          onClick={onClose}
          aria-hidden="true"
        />
      )}

      {/* Sidebar Container (260px, modern civic workspace) */}
      <aside
        className={clsx(
          'fixed lg:static inset-y-0 left-0 z-50 lg:z-0',
          'w-[264px] bg-surface border-r border-line flex flex-col justify-between',
          'transition-all duration-200 ease-in-out shadow-lg lg:shadow-none',
          isOpen ? 'translate-x-0' : '-translate-x-full lg:hidden'
        )}
      >
        <div className="flex flex-col h-full overflow-hidden">
          {/* Header Brand */}
          <div className="px-4 py-3.5 border-b border-line bg-surface flex items-center justify-between">
            <Link
              to={isPublisher ? '/publisher' : '/internal'}
              className="flex items-center gap-2.5 hover:opacity-95 transition-opacity"
              onClick={() => {
                if (window.innerWidth < 1024 && onClose) onClose();
              }}
            >
              <div className="flex items-center gap-1.5 shrink-0">
                <div className="w-9 h-9 rounded-lg bg-surface border border-line shadow-2xs flex items-center justify-center p-1">
                  <img src={kemenagLogo} alt="Logo Kemenag" className="h-full w-auto object-contain" />
                </div>
                <div className="w-8 h-8 rounded-lg bg-surface border border-line shadow-2xs flex items-center justify-center p-0.5">
                  <img src={lpmqLogo} alt="Logo LPMQ" className="h-full w-auto object-contain rounded" />
                </div>
              </div>
              <div className="min-w-0">
                <span className="text-[10px] font-extrabold tracking-wider uppercase text-brand-800 block leading-tight">
                  Kemenag RI
                </span>
                <span className="text-xs font-black text-ink block leading-tight truncate">
                  Sistem Pentashihan
                </span>
              </div>
            </Link>

            {/* Close Button on Mobile */}
            <button
              type="button"
              onClick={onClose}
              className="p-1.5 rounded-lg text-ink-muted hover:text-ink hover:bg-surface-subtle lg:hidden"
              aria-label="Tutup Menu"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* User Mini Profile Card */}
          {currentUser && (
            <div className="mx-3 mt-3 px-3 py-2.5 rounded-lg border border-line bg-surface-subtle/70">
              <div className="flex items-center gap-2.5">
                <div className="relative shrink-0">
                  <div className="w-8 h-8 rounded-md bg-brand-800 text-white font-bold flex items-center justify-center text-xs shadow-2xs">
                    {currentUser.name ? currentUser.name.charAt(0).toUpperCase() : 'U'}
                  </div>
                  <span
                    className="absolute -bottom-0.5 -right-0.5 w-2 h-2 bg-emerald-500 rounded-full border-2 border-white"
                    title="Online"
                  />
                </div>
                <div className="min-w-0 flex-1">
                  <h4 className="text-xs font-bold text-ink truncate leading-tight">
                    {currentUser.name}
                  </h4>
                  <div className="mt-1">
                    <span
                      className={clsx(
                        'inline-flex items-center gap-1 text-[11px] font-semibold px-2 py-0.5 rounded border leading-none',
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

          {/* Navigation Sections */}
          <div className="flex-1 overflow-y-auto px-2.5 py-3 space-y-4">
            {navSections.map((section, idx) => (
              <div key={idx} className="space-y-1">
                <div className="px-2.5 py-1 text-[10px] font-extrabold uppercase tracking-wider text-ink-muted">
                  {section.title}
                </div>
                <nav className="space-y-0.5">
                  {section.items.map((item) => (
                    <NavLink
                      key={item.path + item.label}
                      to={item.path}
                      end={item.end}
                      onClick={() => {
                        if (window.innerWidth < 1024 && onClose) onClose();
                      }}
                      className={({ isActive }) =>
                        clsx(
                          'flex items-center gap-2.5 px-2.5 py-2 rounded-lg text-xs font-medium transition-colors group',
                          isActive
                            ? 'bg-brand-50 border border-brand-100 text-brand-950 font-bold'
                            : 'text-ink-muted hover:text-ink hover:bg-surface-subtle'
                        )
                      }
                    >
                      {({ isActive }) => (
                        <>
                          <div
                            className={clsx(
                              'transition-colors shrink-0',
                              isActive ? 'text-brand-700' : 'text-ink-muted group-hover:text-brand-700'
                            )}
                          >
                            {item.icon}
                          </div>
                          <div className="flex-1 min-w-0">
                            <span className="block leading-tight truncate">{item.label}</span>
                            {item.description && !isActive && (
                              <span className="block text-[10px] text-ink-muted truncate mt-0.5">
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

          {/* Institutional Compliance Footer */}
          <div className="p-2.5 border-t border-line bg-surface">
            <div className="p-2 rounded-lg bg-surface-subtle border border-line/60">
              <div className="flex items-center gap-1.5">
                <CheckCircle2 className="w-3.5 h-3.5 text-brand-700 shrink-0" />
                <span className="text-[11px] font-bold text-ink">Standar Pentashihan</span>
              </div>
              <p className="text-[10px] text-ink-muted mt-0.5 leading-tight">
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

