import React from 'react';
import { useAuth } from '@/features/auth/AuthContext';
import { NavLink } from 'react-router-dom';
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
} from 'lucide-react';
import { clsx } from 'clsx';

export const Sidebar = () => {
  const { currentUser } = useAuth();
  const isPublisher = currentUser.role === 'PUBLISHER';

  const getMenuItems = () => {
    if (isPublisher) {
      return [
        {
          label: 'Dashboard Penerbit',
          path: '/publisher',
          icon: <LayoutDashboard className="w-5 h-5" />,
        },
        {
          label: 'Pengajuan Baru',
          path: '/publisher/new-registration',
          icon: <FilePlus className="w-5 h-5" />,
        },
        {
          label: 'Daftar Pengajuan Saya',
          path: '/publisher/registrations',
          icon: <FileText className="w-5 h-5" />,
        },
        {
          label: 'Billing & PNBP',
          path: '/publisher/billing',
          icon: <CreditCard className="w-5 h-5" />,
        },
        {
          label: 'Surat Tanda Tashih',
          path: '/publisher/documents',
          icon: <Award className="w-5 h-5" />,
        },
      ];
    }

    // Menu Internal LPMQ
    const baseInternal = [
      {
        label: 'Dashboard Petugas',
        path: '/internal',
        icon: <LayoutDashboard className="w-5 h-5" />,
      },
    ];

    if (currentUser.role === 'VERIFICATOR' || currentUser.role === 'ADMIN') {
      baseInternal.push({
        label: 'Antrean Verifikasi Naskah',
        path: '/internal/verifications',
        icon: <CheckSquare className="w-5 h-5" />,
      });
    }

    if (currentUser.role === 'DISTRIBUTOR' || currentUser.role === 'ADMIN') {
      baseInternal.push({
        label: 'Distribusi & Penugasan Tim',
        path: '/internal/distributions',
        icon: <Users className="w-5 h-5" />,
      });
    }

    if (
      currentUser.role === 'TASHIH_MEMBER' ||
      currentUser.role === 'TASHIH_LEADER' ||
      currentUser.role === 'ADMIN'
    ) {
      baseInternal.push({
        label: 'Sidang & Review Tashih',
        path: '/internal/tashih',
        icon: <BookOpen className="w-5 h-5" />,
      });
    }

    if (
      currentUser.role === 'TASHIH_LEADER' ||
      currentUser.role === 'DOCUMENTATOR' ||
      currentUser.role === 'HEAD_OF_LPMQ' ||
      currentUser.role === 'ADMIN'
    ) {
      baseInternal.push({
        label: 'Dokumen & Berita Acara',
        path: '/internal/documents',
        icon: <FolderCheck className="w-5 h-5" />,
      });
    }

    if (currentUser.role === 'ADMIN') {
      baseInternal.push({
        label: 'Master Data & Konfigurasi',
        path: '/internal/settings',
        icon: <Settings className="w-5 h-5" />,
      });
    }

    return baseInternal;
  };

  const menuItems = getMenuItems();

  return (
    <aside className="w-64 bg-white border-r border-neutral-200 flex-shrink-0 min-h-[calc(100vh-4rem)] p-4 flex flex-col justify-between">
      <div className="space-y-1">
        <div className="px-3 py-2 text-[11px] font-bold uppercase tracking-wider text-neutral-500">
          {isPublisher ? 'Portal Penerbit' : 'Aplikasi Internal LPMQ'}
        </div>
        <nav className="space-y-1">
          {menuItems.map((item) => (
            <NavLink
              key={item.path}
              to={item.path}
              end={item.path === '/publisher' || item.path === '/internal'}
              className={({ isActive }) =>
                clsx(
                  'flex items-center gap-3 px-3 py-2.5 rounded-md text-sm font-medium transition-colors',
                  isActive
                    ? 'bg-primary-100 text-primary-700 font-semibold border-l-4 border-primary-700 rounded-l-none'
                    : 'text-neutral-700 hover:bg-neutral-50 hover:text-primary-700'
                )
              }
            >
              {item.icon}
              <span>{item.label}</span>
            </NavLink>
          ))}
        </nav>
      </div>

      <div className="pt-4 border-t border-neutral-200">
        <div className="bg-neutral-50 p-3 rounded-lg border border-neutral-200">
          <p className="text-xs font-semibold text-neutral-800">Standar Pentashihan</p>
          <p className="text-[11px] text-neutral-500 mt-0.5">
            Mushaf Standar Usmani Kemenag RI (SOP v2.1)
          </p>
        </div>
      </div>
    </aside>
  );
};
