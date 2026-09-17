import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { LoginPage } from './LoginPage';
import * as AuthContextModule from './AuthContext';

describe('LoginPage Protected Area Verification', () => {
  const mockLogin = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
    vi.spyOn(AuthContextModule, 'useAuth').mockReturnValue({
      login: mockLogin,
      isLoading: false,
      authError: '',
    });
  });

  it('renders all key elements of the protected login screen intact', () => {
    render(
      <MemoryRouter>
        <LoginPage />
      </MemoryRouter>
    );

    // Header and Branding
    expect(screen.getByAltText('Kementerian Agama RI')).toBeInTheDocument();
    expect(screen.getByAltText('LPMQ')).toBeInTheDocument();
    expect(screen.getByText('Akses Sistem Pentashihan')).toBeInTheDocument();
    expect(screen.getByText(/Gunakan akun resmi untuk mengakses layanan/i)).toBeInTheDocument();
    expect(screen.getByText(/Lajnah Pentashihan Mushaf Quran RI/i)).toBeInTheDocument();
    expect(screen.getByText(/SIPNA \(Sistem Informasi Pentashih Mushaf Quran\)/i)).toBeInTheDocument();

    // Form inputs and controls
    expect(screen.getByLabelText(/Alamat email/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/^kata sandi$/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Masuk ke Sistem/i })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /Registrasi penerbit/i })).toBeInTheDocument();
    expect(screen.getByText(/Lajnah Pentashihan Mushaf Al-Qur'an © 2026 Kementerian Agama RI/i)).toBeInTheDocument();
  });

  it('toggles password visibility with accessible label', () => {
    render(
      <MemoryRouter>
        <LoginPage />
      </MemoryRouter>
    );

    const passwordInput = screen.getByLabelText(/^kata sandi$/i);
    expect(passwordInput).toHaveAttribute('type', 'password');

    const toggleBtn = screen.getByLabelText('Tampilkan kata sandi');
    fireEvent.click(toggleBtn);

    expect(passwordInput).toHaveAttribute('type', 'text');
    expect(screen.getByLabelText('Sembunyikan kata sandi')).toBeInTheDocument();
  });

  it('submits credentials through auth context', async () => {
    mockLogin.mockResolvedValue({ success: true, user: { role: 'ADMIN_PENERBIT' } });

    render(
      <MemoryRouter>
        <LoginPage />
      </MemoryRouter>
    );

    fireEvent.change(screen.getByLabelText(/Alamat email/i), { target: { value: 'user@example.com' } });
    fireEvent.change(screen.getByLabelText(/^kata sandi$/i), { target: { value: 'secret123' } });
    fireEvent.click(screen.getByRole('button', { name: /Masuk ke Sistem/i }));

    await waitFor(() => {
      expect(mockLogin).toHaveBeenCalledWith('user@example.com', 'secret123');
    });
  });
});
