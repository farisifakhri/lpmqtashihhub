import React from 'react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { act, render, screen } from '@testing-library/react';
import { AuthProvider, useAuth } from './AuthContext';
import { authApi } from '@/api/auth.api';

vi.mock('@/api/auth.api', () => ({
  authApi: { getMe: vi.fn(), login: vi.fn(), registerPublisher: vi.fn() },
}));

const SessionView = () => {
  const { currentUser, isInitializing } = useAuth();
  return <div>{isInitializing ? 'Memeriksa sesi' : currentUser?.role || 'Tanpa sesi'}</div>;
};

afterEach(() => {
  localStorage.clear();
  vi.clearAllMocks();
});

describe('bootstrap autentikasi', () => {
  it('mengabaikan role cache sampai /auth/me mengembalikan identitas resmi', async () => {
    localStorage.setItem('lpmq_token', 'token-test');
    localStorage.setItem('lpmq_user', JSON.stringify({ role: 'SUPERADMIN' }));
    let resolveMe;
    authApi.getMe.mockReturnValue(new Promise((resolve) => { resolveMe = resolve; }));

    render(<AuthProvider><SessionView /></AuthProvider>);
    expect(screen.getByText('Memeriksa sesi')).toBeInTheDocument();
    expect(screen.queryByText('SUPERADMIN')).not.toBeInTheDocument();

    await act(async () => {
      resolveMe({ data: { id: 'user-1', name: 'Penerbit', roles: ['PENERBIT'] } });
    });

    expect(screen.getByText('PENERBIT')).toBeInTheDocument();
    expect(localStorage.getItem('lpmq_user')).toBeNull();
  });
  it('mendukung pergantian peran aktif (switchActiveRole) bagi pengguna dengan peran ganda (Item 21)', async () => {
    localStorage.setItem('lpmq_token', 'token-test');
    authApi.getMe.mockResolvedValue({
      data: {
        id: 'user-multi-1',
        name: 'Ahmad Falahudin, S.S',
        email: 'verifikator@lpmq.kemenag.go.id',
        roles: ['VERIFIKATOR', 'PENTASHIH'],
      },
    });

    const TestMultiRoleView = () => {
      const { currentUser, switchActiveRole } = useAuth();
      return (
        <div>
          <span data-testid="current-role">{currentUser?.role}</span>
          <button onClick={() => switchActiveRole('PENTASHIH')}>Pindah ke Pentashih</button>
        </div>
      );
    };

    render(<AuthProvider><TestMultiRoleView /></AuthProvider>);
    await act(async () => {});

    expect(screen.getByTestId('current-role')).toHaveTextContent('VERIFIKATOR');

    act(() => {
      screen.getByText('Pindah ke Pentashih').click();
    });

    expect(screen.getByTestId('current-role')).toHaveTextContent('PENTASHIH');
    expect(localStorage.getItem('lpmq_active_role')).toBe('PENTASHIH');
  });
});
