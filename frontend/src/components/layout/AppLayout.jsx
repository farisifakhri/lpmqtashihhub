import React, { useEffect, useState } from 'react';
import { Outlet, Navigate } from 'react-router-dom';
import { Navbar } from './Navbar';
import { Sidebar } from './Sidebar';
import { useAuth } from '@/features/auth/AuthContext';

export const AppLayout = () => {
  const { currentUser, isInitializing } = useAuth();
  const [sidebarOpen, setSidebarOpen] = useState(() =>
    typeof window !== 'undefined' ? window.innerWidth >= 1024 : true
  );

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
        <main className="flex-1 min-w-0 overflow-y-auto px-4 py-5 sm:px-6 sm:py-7 lg:px-8 lg:py-8">
          <div className="max-w-7xl mx-auto w-full">
            <Outlet />
          </div>
        </main>
      </div>
    </div>
  );
};

export default AppLayout;
