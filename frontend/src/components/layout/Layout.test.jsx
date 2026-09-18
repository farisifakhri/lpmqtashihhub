import React from 'react';
import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { Navbar } from './Navbar';
import { Sidebar } from './Sidebar';
import { AppLayout } from './AppLayout';
import * as AuthContext from '@/features/auth/AuthContext';

describe('Komponen tata letak portal operasional', () => {
  const mockLogout = vi.fn();

  const mockUserSuperadmin = {
    id: 'user-1',
    name: 'Fakhri Farisi',
    email: 'admin@lpmq.kemenag.go.id',
    role: 'SUPERADMIN',
    roles: ['SUPERADMIN'],
  };

  const mockUserPublisher = {
    id: 'user-2',
    name: 'Ahmad Penerbit',
    email: 'penerbit@mushafnusantara.com',
    role: 'ADMIN_PENERBIT',
    roles: ['ADMIN_PENERBIT'],
    publisherName: 'PT Mushaf Nusantara',
  };

  it('Navbar merender tombol toggle sidebar, breadcrumb dinamis, dan profil dropdown', () => {
    vi.spyOn(AuthContext, 'useAuth').mockReturnValue({
      currentUser: mockUserSuperadmin,
      logout: mockLogout,
    });

    const toggleSidebar = vi.fn();

    render(
      <MemoryRouter initialEntries={['/internal/verifications']}>
        <Navbar sidebarOpen={true} onToggleSidebar={toggleSidebar} />
      </MemoryRouter>
    );

    // Tombol toggler
    const togglerBtn = screen.getByRole('button', { name: /tutup navigasi utama/i });
    expect(togglerBtn).toBeDefined();
    fireEvent.click(togglerBtn);
    expect(toggleSidebar).toHaveBeenCalledTimes(1);

    // Breadcrumb dinamis
    expect(screen.getByText('Verifikasi')).toBeDefined();
    expect(screen.getByText('Verifikasi Berkas Naskah')).toBeDefined();

    // Trigger profil dropdown
    const profileBtn = screen.getByRole('button', { name: /fakhri farisi/i });
    expect(profileBtn).toBeDefined();

    // Buka dropdown
    fireEvent.click(profileBtn);
    expect(screen.getByText(/sesi aktif/i)).toBeDefined();
    expect(screen.getByText(/kontrol proses mengacu/i)).toBeDefined();

    // Tombol logout di dropdown
    const logoutBtn = screen.getByRole('button', { name: /akhiri sesi/i });
    expect(logoutBtn).toBeDefined();
    fireEvent.click(logoutBtn);
    expect(mockLogout).toHaveBeenCalled();
  });

  it('Sidebar merender profil mini dengan online dot, branding, dan alur kerja internal', () => {
    vi.spyOn(AuthContext, 'useAuth').mockReturnValue({
      currentUser: mockUserSuperadmin,
      logout: mockLogout,
    });

    render(
      <MemoryRouter initialEntries={['/internal']}>
        <Sidebar isOpen={true} onClose={vi.fn()} />
      </MemoryRouter>
    );

    // Brand header
    expect(screen.getByText('Sistem Pentashihan')).toBeDefined();
    expect(screen.getByText('Kemenag RI')).toBeDefined();

    // User mini-card
    expect(screen.getByText('Fakhri Farisi')).toBeDefined();
    expect(screen.getByText('Superadmin')).toBeDefined();
    expect(screen.getByTitle('Online')).toBeDefined();

    // Menu berurutan sesuai alur pentashihan (SOP v2.2)
    expect(screen.getByText('1. Verifikasi Berkas')).toBeDefined();
    expect(screen.getByText('2. Distribusi Sidang')).toBeDefined();
    expect(screen.getByText('3. Sidang Pentashihan')).toBeDefined();
    expect(screen.getByText('4. Pengesahan & STT')).toBeDefined();
    expect(screen.getByText('5. Data Induk dan Parameter')).toBeDefined();
  });

  it('Sidebar merender alur pengajuan penerbit secara berurutan', () => {
    vi.spyOn(AuthContext, 'useAuth').mockReturnValue({
      currentUser: mockUserPublisher,
      logout: mockLogout,
    });

    render(
      <MemoryRouter initialEntries={['/publisher']}>
        <Sidebar isOpen={true} onClose={vi.fn()} />
      </MemoryRouter>
    );

    // User mini-card
    expect(screen.getByText('Ahmad Penerbit')).toBeDefined();
    expect(screen.getByText('Penerbit')).toBeDefined();

    // Menu penerbit sesuai alur baru Mandat Bab 6
    expect(screen.getByText('Beranda')).toBeDefined();
    expect(screen.getByText('Pengajuan Saya')).toBeDefined();
    expect(screen.getByText('Buat Pengajuan')).toBeDefined();
    expect(screen.getByText('Tagihan')).toBeDefined();
    expect(screen.getByText('Dokumen Resmi')).toBeDefined();
  });

  it('AppLayout merender navigasi bawah seluler untuk akun Penerbit', () => {
    vi.spyOn(AuthContext, 'useAuth').mockReturnValue({
      currentUser: mockUserPublisher,
      isInitializing: false,
      logout: mockLogout,
    });

    render(
      <MemoryRouter initialEntries={['/publisher']}>
        <AppLayout />
      </MemoryRouter>
    );

    const bottomNav = screen.getByRole('navigation', { name: /navigasi bawah seluler/i });
    expect(bottomNav).toBeDefined();
    expect(screen.getAllByText('Beranda').length).toBeGreaterThan(0);
    expect(screen.getAllByText('Pengajuan').length).toBeGreaterThan(0);
    expect(screen.getAllByText('Tagihan').length).toBeGreaterThan(0);
    expect(screen.getAllByText('Dokumen').length).toBeGreaterThan(0);
  });
});


