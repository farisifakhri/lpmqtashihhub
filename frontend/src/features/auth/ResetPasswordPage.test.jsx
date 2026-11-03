import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { ResetPasswordPage } from './ResetPasswordPage';
import { authApi } from '@/api/auth.api';

vi.mock('@/api/auth.api', () => ({
  authApi: {
    resetPassword: vi.fn(),
  },
}));

describe('ResetPasswordPage', () => {
  beforeEach(() => vi.clearAllMocks());

  it('asks for a new recovery email when the URL has no token', () => {
    render(
      <MemoryRouter initialEntries={['/reset-password']}>
        <ResetPasswordPage />
      </MemoryRouter>,
    );

    expect(screen.getByText(/Tautan tidak memuat token reset/i)).toBeInTheDocument();
    expect(screen.queryByLabelText(/Kata sandi baru/i)).not.toBeInTheDocument();
    expect(screen.getByRole('link', { name: /Ke halaman login/i })).toHaveAttribute('href', '/login');
  });

  it('resets the password using the token in the URL and shows a login action', async () => {
    authApi.resetPassword.mockResolvedValue({
      success: true,
      message: 'Kata sandi berhasil diperbarui. Silakan masuk menggunakan kata sandi baru Anda.',
    });

    render(
      <MemoryRouter initialEntries={['/reset-password?token=12345678']}>
        <ResetPasswordPage />
      </MemoryRouter>,
    );

    fireEvent.change(screen.getByLabelText('Kata sandi baru'), { target: { value: 'Rahasia123' } });
    fireEvent.change(screen.getByLabelText('Konfirmasi kata sandi'), { target: { value: 'Rahasia123' } });
    fireEvent.click(screen.getByRole('button', { name: /Simpan kata sandi baru/i }));

    await waitFor(() => {
      expect(authApi.resetPassword).toHaveBeenCalledWith({
        token: '12345678',
        new_password: 'Rahasia123',
      });
    });
    expect(await screen.findByText(/Kata sandi berhasil diperbarui/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Kembali ke Login/i })).toBeInTheDocument();
  });

  it('shows a validation error for a password that does not meet backend rules', async () => {
    render(
      <MemoryRouter initialEntries={['/reset-password?token=12345678']}>
        <ResetPasswordPage />
      </MemoryRouter>,
    );

    fireEvent.change(screen.getByLabelText('Kata sandi baru'), { target: { value: 'password' } });
    fireEvent.change(screen.getByLabelText('Konfirmasi kata sandi'), { target: { value: 'password' } });
    fireEvent.click(screen.getByRole('button', { name: /Simpan kata sandi baru/i }));

    expect(await screen.findByText(/minimal 8 karakter dan mengandung huruf kapital serta angka/i)).toBeInTheDocument();
    expect(authApi.resetPassword).not.toHaveBeenCalled();
  });
});
