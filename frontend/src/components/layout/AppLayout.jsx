import React, { useEffect, useState } from 'react';
import { Outlet, Navigate, NavLink } from 'react-router-dom';
import { Navbar } from './Navbar';
import { Sidebar } from './Sidebar';
import { useAuth } from '@/features/auth/AuthContext';
import {
  LayoutDashboard,
  FileText,
  PlusCircle,
  CreditCard,
  Award,
} from 'lucide-react';
import { clsx } from 'clsx';

const publisherNavItems = [
  {
    label: 'Beranda',
    path: '/publisher',
    icon: LayoutDashboard,
    end: true,
  },
  {
    label: 'Pengajuan',
    path: '/publisher/registrations',
    icon: FileText,
  },
  {
    label: 'Ajukan',
    path: '/publisher/new-registration',
    icon: PlusCircle,
    isAction: true,
  },
  {
    label: 'Tagihan',
    path: '/publisher/billing',
    icon: CreditCard,
  },
  {
    label: 'Dokumen',
    path: '/publisher/documents',
    icon: Award,
  },
];

export const AppLayout = () => {
  const { currentUser, isInitializing } = useAuth();
  const [sidebarOpen, setSidebarOpen] = useState(() =>
    typeof window !== 'undefined' ? window.innerWidth >= 1024 : true
  );

  const role = currentUser?.role || '';
  const roles = currentUser?.roles || [];
  const isPublisher =
    role === 'ADMIN_PENERBIT' ||
    role === 'PUBLISHER' ||
    roles.includes('ADMIN_PENERBIT');

  useEffect(() => {
    const handleResize = () => {
      if (window.innerWidth >= 1024) setSidebarOpen(true);
    };
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  if (isInitializing) {
    return (
      <div className="min-h-screen grid place-items-center bg-neutral-50" role="status" aria-live="polite">
        <div className="flex items-center gap-3 rounded-xl border bg-white px-5 py-4 text-sm font-semibold text-neutral-700 shadow-sm">
          <span className="h-4 w-4 animate-spin rounded-full border-2 border-primary-200 border-t-primary-700" />
          Memvalidasi sesi dan hak akses...
        </div>
      </div>
    );
  }

  if (!currentUser) {
    return <Navigate to="/login" replace />;
  }

  const toggleSidebar = () => {
    setSidebarOpen((prev) => !prev);
  };

  const closeSidebar = () => {
    setSidebarOpen(false);
  };

  return (
    <div className="min-h-screen flex flex-col bg-neutral-50 font-sans text-neutral-800">
      {/* Top Navbar / Upbar */}
      <Navbar sidebarOpen={sidebarOpen} onToggleSidebar={toggleSidebar} />

      {/* Main App Container with Sidebar and Content */}
      <div className="flex flex-1 relative overflow-hidden">
        {/* Sidebar Component */}
        <Sidebar isOpen={sidebarOpen} onClose={closeSidebar} />

        {/* Content Area */}
        <main
          className={clsx(
            'flex-1 min-w-0 overflow-y-auto px-4 py-5 sm:px-6 sm:py-7 lg:px-8 lg:py-8',
            isPublisher && 'pb-24 lg:pb-8'
          )}
        >
          <div className="max-w-7xl mx-auto w-full">
            <Outlet />
          </div>
        </main>
      </div>

      {/* Mobile Bottom Navigation for Publisher */}
      {isPublisher && (
        <nav
          aria-label="Navigasi Bawah Seluler"
          className="lg:hidden fixed bottom-0 left-0 right-0 z-40 bg-white/95 backdrop-blur-sm border-t border-neutral-200 px-2 py-1 shadow-[0_-2px_10px_rgba(0,0,0,0.06)]"
          style={{ paddingBottom: 'max(0.25rem, env(safe-area-inset-bottom, 0px))' }}
        >
          <div className="grid grid-cols-5 items-center max-w-lg mx-auto">
            {publisherNavItems.map((item) => {
              const Icon = item.icon;
              if (item.isAction) {
                return (
                  <NavLink
                    key={item.path}
                    to={item.path}
                    className={({ isActive }) =>
                      clsx(
                        'flex flex-col items-center justify-center min-h-[44px] py-1 text-center transition-colors focus-visible:ring-2 focus-visible:ring-emerald-700 rounded-lg',
                        isActive
                          ? 'text-primary-900 font-semibold'
                          : 'text-primary-700 hover:text-primary-800'
                      )
                    }
                  >
                    {({ isActive }) => (
                      <>
                        <span
                          className={clsx(
                            'flex items-center justify-center w-7 h-7 rounded-lg text-white shadow-2xs mb-0.5 transition-transform active:scale-95',
                            isActive ? 'bg-primary-800' : 'bg-primary-700'
                          )}
                        >
                          <Icon className="w-4 h-4" />
                        </span>
                        <span className="text-[12px] font-semibold tracking-tight">
                          {item.label}
                        </span>
                      </>
                    )}
                  </NavLink>
                );
              }

              return (
                <NavLink
                  key={item.path}
                  to={item.path}
                  end={item.end}
                  className={({ isActive }) =>
                    clsx(
                      'flex flex-col items-center justify-center min-h-[44px] py-1 text-center transition-colors focus-visible:ring-2 focus-visible:ring-emerald-700 rounded-lg',
                      isActive
                        ? 'text-primary-800 font-semibold'
                        : 'text-neutral-500 hover:text-neutral-800'
                    )
                  }
                >
                  {({ isActive }) => (
                    <>
                      <Icon
                        className={clsx(
                          'w-5 h-5 mb-0.5 transition-colors',
                          isActive ? 'text-primary-700' : 'text-neutral-500'
                        )}
                      />
                      <span className="text-[12px] truncate max-w-full px-0.5 font-medium">
                        {item.label}
                      </span>
                    </>
                  )}
                </NavLink>
              );
            })}
          </div>
        </nav>
      )}
    </div>
  );
};

export default AppLayout;

