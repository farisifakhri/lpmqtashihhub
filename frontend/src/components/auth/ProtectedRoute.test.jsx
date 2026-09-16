import React from 'react';
import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter, Routes, Route } from 'react-router-dom';
import { ProtectedRoute } from './ProtectedRoute';
import * as AuthContextModule from '@/features/auth/AuthContext';

describe('ProtectedRoute Security Guard', () => {
  const renderWithRouter = (currentUser, element, initialPath = '/protected', isInitializing = false) => {
    vi.spyOn(AuthContextModule, 'useAuth').mockReturnValue({
      currentUser,
      isLoading: false,
      isInitializing,
      login: vi.fn(),
      logout: vi.fn(),
    });

    return render(
      <MemoryRouter initialEntries={[initialPath]}>
        <Routes>
          <Route path="/login" element={<div>Halaman Login</div>} />
          <Route path="/publisher" element={<div>Portal Penerbit</div>} />
          <Route path="/internal" element={<div>Portal Internal</div>} />
          <Route path="/protected" element={element} />
        </Routes>
      </MemoryRouter>
    );
  };

  it.each([['VERIFIKATOR', 'KEPALA_LPMQ', 'SUPERADMIN'], ['DISTRIBUTOR', 'SUPERADMIN'], ['PENTASHIH', 'SUPERADMIN'], ['DOKUMENTATOR', 'KEPALA_LPMQ', 'SUPERADMIN'], ['SUPERADMIN']])('ADMIN cannot enter an operational/admin module guarded by %j', (...roles) => {
    renderWithRouter(
      { id: 'internal-admin', role: 'ADMIN', roles: ['ADMIN'] },
      <ProtectedRoute portalType="internal" allowedRoles={roles}><div>Restricted module</div></ProtectedRoute>
    );
    expect(screen.getByText('Portal Internal')).toBeInTheDocument();
    expect(screen.queryByText('Restricted module')).not.toBeInTheDocument();
  });

  it('menunggu validasi sesi sebelum menampilkan portal atau mengalihkan ke login', () => {
    renderWithRouter(
      { role: 'SUPERADMIN', roles: ['SUPERADMIN'] },
      <ProtectedRoute><div>Konten Rahasia</div></ProtectedRoute>,
      '/protected',
      true
    );

    expect(screen.getByRole('status')).toHaveTextContent('Memverifikasi sesi');
    expect(screen.queryByText('Konten Rahasia')).not.toBeInTheDocument();
    expect(screen.queryByText('Halaman Login')).not.toBeInTheDocument();
  });

  it('mengalihkan pengguna yang belum login ke /login', () => {
    renderWithRouter(
      null,
      <ProtectedRoute>
        <div>Konten Rahasia</div>
      </ProtectedRoute>
    );

    expect(screen.getByText('Halaman Login')).toBeInTheDocument();
    expect(screen.queryByText('Konten Rahasia')).not.toBeInTheDocument();
  });

  it('mengizinkan penerbit mengakses rute portal publisher', () => {
    const publisherUser = {
      id: 'pub-1',
      name: 'Penerbit A',
      roles: ['ADMIN_PENERBIT'],
      role: 'ADMIN_PENERBIT',
    };

    renderWithRouter(
      publisherUser,
      <ProtectedRoute portalType="publisher">
        <div>Dasbor Penerbit Sukses</div>
      </ProtectedRoute>
    );

    expect(screen.getByText('Dasbor Penerbit Sukses')).toBeInTheDocument();
  });

  it('menolak penerbit yang mencoba membuka rute portal internal (dialihkan ke /publisher)', () => {
    const publisherUser = {
      id: 'pub-1',
      name: 'Penerbit A',
      roles: ['ADMIN_PENERBIT'],
      role: 'ADMIN_PENERBIT',
    };

    renderWithRouter(
      publisherUser,
      <ProtectedRoute portalType="internal">
        <div>Halaman Khusus Petugas</div>
      </ProtectedRoute>
    );

    expect(screen.getByText('Portal Penerbit')).toBeInTheDocument();
    expect(screen.queryByText('Halaman Khusus Petugas')).not.toBeInTheDocument();
  });

  it('mengizinkan verifikator mengakses portal internal', () => {
    const verifikatorUser = {
      id: 'staff-1',
      name: 'Ahmad Verifikator',
      roles: ['VERIFIKATOR'],
      role: 'VERIFIKATOR',
    };

    renderWithRouter(
      verifikatorUser,
      <ProtectedRoute portalType="internal">
        <div>Antrean Verifikasi Sukses</div>
      </ProtectedRoute>
    );

    expect(screen.getByText('Antrean Verifikasi Sukses')).toBeInTheDocument();
  });

  it('menolak verifikator yang mencoba mengakses portal publisher (dialihkan ke /internal)', () => {
    const verifikatorUser = {
      id: 'staff-1',
      name: 'Ahmad Verifikator',
      roles: ['VERIFIKATOR'],
      role: 'VERIFIKATOR',
    };

    renderWithRouter(
      verifikatorUser,
      <ProtectedRoute portalType="publisher">
        <div>Area Khusus Penerbit</div>
      </ProtectedRoute>
    );

    expect(screen.getByText('Portal Internal')).toBeInTheDocument();
    expect(screen.queryByText('Area Khusus Penerbit')).not.toBeInTheDocument();
  });

  it('mengizinkan SUPERADMIN mengakses modul master settings (allowedRoles SUPERADMIN)', () => {
    const superAdmin = {
      id: 'admin-1',
      name: 'Super Administrator',
      roles: ['SUPERADMIN'],
      role: 'SUPERADMIN',
    };

    renderWithRouter(
      superAdmin,
      <ProtectedRoute portalType="internal" allowedRoles={['SUPERADMIN']}>
        <div>Konfigurasi Master Data</div>
      </ProtectedRoute>
    );

    expect(screen.getByText('Konfigurasi Master Data')).toBeInTheDocument();
  });

  it('menolak non-SUPERADMIN (misal verifikator) saat mencoba membuka master settings', () => {
    const verifikatorUser = {
      id: 'staff-1',
      name: 'Ahmad Verifikator',
      roles: ['VERIFIKATOR'],
      role: 'VERIFIKATOR',
    };

    renderWithRouter(
      verifikatorUser,
      <ProtectedRoute portalType="internal" allowedRoles={['SUPERADMIN']}>
        <div>Konfigurasi Master Data</div>
      </ProtectedRoute>
    );

    expect(screen.getByText('Portal Internal')).toBeInTheDocument();
    expect(screen.queryByText('Konfigurasi Master Data')).not.toBeInTheDocument();
  });
});
