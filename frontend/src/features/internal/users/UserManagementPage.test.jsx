import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { UserManagementPage } from './UserManagementPage';
import * as AuthContextModule from '@/features/auth/AuthContext';
import * as UserApiModule from '@/api/user.api';

describe('UserManagementPage Component', () => {
  beforeEach(() => {
    vi.spyOn(AuthContextModule, 'useAuth').mockReturnValue({
      currentUser: {
        id: 'admin-1',
        name: 'Super Admin LPMQ',
        role: 'SUPERADMIN',
        roles: ['SUPERADMIN'],
      },
    });

    vi.spyOn(UserApiModule.userApi, 'listUsers').mockResolvedValue({
      success: true,
      data: {
        items: [
          {
            id: 'user-1',
            name: 'Ahmad Verifikator, S.Ag',
            email: 'verifikator@lpmq.kemenag.go.id',
            nip: '198502022010011002',
            status: 'ACTIVE',
            roles: ['VERIFIKATOR'],
            created_at: new Date().toISOString(),
          },
          {
            id: 'user-2',
            name: 'Dr. H. Muchlis M. Hanafi, M.A',
            email: 'kepala@lpmq.kemenag.go.id',
            nip: '197106061998031006',
            status: 'ACTIVE',
            roles: ['KEPALA_LPMQ', 'SUPERADMIN'],
            created_at: new Date().toISOString(),
          },
        ],
        pagination: { total: 2, page: 1, limit: 20, totalPages: 1 },
      },
    });
  });

  it('merender judul halaman dan daftar pengguna dengan badge multi-role', async () => {
    render(
      <MemoryRouter>
        <UserManagementPage />
      </MemoryRouter>
    );

    expect(screen.getByText(/Manajemen Pengguna & Penugasan Peran/i)).toBeInTheDocument();

    await waitFor(() => {
      expect(screen.getByText('Ahmad Verifikator, S.Ag')).toBeInTheDocument();
      expect(screen.getByText('verifikator@lpmq.kemenag.go.id')).toBeInTheDocument();
      expect(screen.getByText('Dr. H. Muchlis M. Hanafi, M.A')).toBeInTheDocument();
      expect(screen.getByText('kepala@lpmq.kemenag.go.id')).toBeInTheDocument();
    });
  });

  it('dapat membuka modal Tambah Pengguna Baru dan menampilkan opsi multi-role', async () => {
    render(
      <MemoryRouter>
        <UserManagementPage />
      </MemoryRouter>
    );

    const addBtn = screen.getByText('Tambah Pengguna Baru');
    fireEvent.click(addBtn);

    expect(screen.getByPlaceholderText(/Contoh: Dr. H. Ahmad Fauzan, M.Ag/i)).toBeInTheDocument();
    expect(screen.getByText(/Pilih Semua Role \(Akses Penuh\)/i)).toBeInTheDocument();
  });
});

