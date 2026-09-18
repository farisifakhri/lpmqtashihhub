import React, { useEffect, useState } from 'react';
import { Outlet, Navigate, NavLink, useLocation } from 'react-router-dom';
import { Navbar } from './Navbar';
import { Sidebar } from './Sidebar';
import { useAuth } from '@/features/auth/AuthContext';
import {
  LayoutDashboard,
  FileText,
  CreditCard,
  Award,
} from 'lucide-react';
import { clsx } from 'clsx';

// 4 item bottom navigation maksimal pada portal Penerbit sesuai Mandat Bab 5.3
const publisherMobileBottomItems = [
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
  const location = useLocation();
  const [sidebarOpen, setSidebarOpen] = useState(() =>
    typeof window !== 'undefined' ? window.innerWidth >= 1024 : true
  );

  const role = currentUser?.role || '';
  const roles = currentUser?.roles || [];
  const isPublisher =
    role === 'ADMIN_PENERBIT' ||
    role === 'PUBLISHER' ||
    roles.includes('ADMIN_PENERBIT');

  // Dokumen atau review workspace diperbolehkan full width
  const isFullWidthWorkspace =
    location.pathname.includes('/internal/verifications/') ||
    location.pathname.includes('/internal/master-intake');

  useEffect(() => {
    const handleResize = () => {
      if (window.innerWidth >= 1024) setSidebarOpen(true);
      else setSidebarOpen(false);
    };
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  if (isInitializing) {
    return (
      <div className="min-h-screen grid place-items-center bg-canvas" role="status" aria-live="polite">
        <div className="flex items-center gap-3 rounded-xl border border-line bg-surface px-5 py-4 text-xs font-semibold text-ink shadow-2xs">
          <span className="h-4 w-4 animate-spin rounded-full border-2 border-brand-100 border-t-brand-700" />
          Memvalidasi sesi dan kewenangan...
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
    <div className="min-h-screen flex flex-col bg-canvas font-sans text-ink">
      {/* Skip to Main Content Link for WCAG Accessibility */}
      <a
        href="#main-content"
        className="sr-only focus:not-sr-only focus:fixed focus:top-3 focus:left-3 focus:z-50 focus:px-4 focus:py-2 focus:bg-brand-700 focus:text-white focus:rounded-md focus:shadow-md focus:outline-none"
      >
        Lompat ke konten utama
      </a>

      {/* Top Navbar / Upbar (64px) */}
      <Navbar sidebarOpen={sidebarOpen} onToggleSidebar={toggleSidebar} />

      {/* Main Container */}
      <div className="flex flex-1 relative overflow-hidden">
        {/* Sidebar Component (264px) */}
        <Sidebar isOpen={sidebarOpen} onClose={closeSidebar} />

        {/* Content Area (Max 1440px or Full-Width Workspace) */}
        <main
          id="main-content"
          tabIndex={-1}
          className={clsx(
            'flex-1 min-w-0 overflow-y-auto outline-none',
            'px-3.5 py-4 sm:px-6 sm:py-6 lg:px-8 lg:py-7',
            isPublisher && 'pb-20 lg:pb-7'
          )}
        >
          <div
            className={clsx(
              'mx-auto w-full',
              isFullWidthWorkspace ? 'max-w-none' : 'max-w-[1440px]'
            )}
          >
            <Outlet />
          </div>
        </main>
      </div>

      {/* Mobile Bottom Navigation for Publisher (Max 4 items, Mandat Bab 5.3) */}
      {isPublisher && (
        <nav
          aria-label="Navigasi Bawah Seluler"
          className="lg:hidden fixed bottom-0 left-0 right-0 z-40 bg-surface/95 backdrop-blur-md border-t border-line px-2 py-1 shadow-[0_-2px_10px_rgba(0,0,0,0.04)]"
          style={{ paddingBottom: 'max(0.25rem, env(safe-area-inset-bottom, 0px))' }}
        >
          <div className="grid grid-cols-4 items-center max-w-md mx-auto">
            {publisherMobileBottomItems.map((item) => {
              const Icon = item.icon;
              return (
                <NavLink
                  key={item.path}
                  to={item.path}
                  end={item.end}
                  className={({ isActive }) =>
                    clsx(
                      'flex flex-col items-center justify-center min-h-[44px] py-1 text-center transition-colors rounded-lg focus-visible:ring-2 focus-visible:ring-emerald-700',
                      isActive
                        ? 'text-brand-800 font-bold'
                        : 'text-ink-muted hover:text-ink'
                    )
                  }
                >
                  {({ isActive }) => (
                    <>
                      <Icon
                        className={clsx(
                          'w-5 h-5 mb-0.5 transition-colors',
                          isActive ? 'text-brand-700' : 'text-ink-muted'
                        )}
                      />
                      <span className="text-[11px] truncate max-w-full px-0.5 font-medium leading-tight">
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

