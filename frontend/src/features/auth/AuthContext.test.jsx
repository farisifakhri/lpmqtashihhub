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
      resolveMe({ data: { id: 'user-1', name: 'Penerbit', roles: ['ADMIN_PENERBIT'] } });
    });

    expect(screen.getByText('ADMIN_PENERBIT')).toBeInTheDocument();
    expect(localStorage.getItem('lpmq_user')).toBeNull();
  });
});
