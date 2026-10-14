import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { ForgotPasswordModal } from './ForgotPasswordModal';
import { authApi } from '@/api/auth.api';

vi.mock('@/api/auth.api', () => ({
  authApi: {
    forgotPassword: vi.fn(),
    resetPassword: vi.fn(),
  },
}));

describe('ForgotPasswordModal Security & UX', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders modal when open and submits forgot password without leaking token or auto-advancing', async () => {
    authApi.forgotPassword.mockResolvedValue({
      success: true,
      message: 'Jika email terdaftar, petunjuk telah dikirim.',
    });

    render(<ForgotPasswordModal isOpen={true} onClose={vi.fn()} />);

    expect(screen.getByText('Pemulihan Kata Sandi Akun')).toBeInTheDocument();
    const emailInput = screen.getByLabelText(/Alamat Email Terdaftar/i);
    expect(emailInput).toBeInTheDocument();

    fireEvent.change(emailInput, { target: { value: 'user@kemenag.go.id' } });
    fireEvent.click(screen.getByRole('button', { name: /Kirim Permohonan/i }));

    await waitFor(() => {
      expect(authApi.forgotPassword).toHaveBeenCalledWith('user@kemenag.go.id');
    });

    // Verifikasi pesan sukses generik ditampilkan
    expect(screen.getByText('Jika email terdaftar, petunjuk telah dikirim.')).toBeInTheDocument();

    // Verifikasi TIDAK berpindah otomatis ke langkah RESET (form token/password baru tidak muncul)
    expect(screen.queryByLabelText(/Token \/ Kode Pemulihan/i)).not.toBeInTheDocument();
  });

  it('allows manual switch to reset step and validates password confirmation', async () => {
    authApi.resetPassword.mockResolvedValue({
      success: true,
      message: 'Kata sandi berhasil diperbarui.',
    });

    render(<ForgotPasswordModal isOpen={true} onClose={vi.fn()} />);

    // Klik link "Sudah memiliki token reset?"
    fireEvent.click(screen.getByRole('button', { name: /Sudah memiliki token reset\?/i }));

    // Sekarang field token dan password baru harus muncul
    const tokenInput = screen.getByLabelText(/Token \/ Kode Pemulihan/i);
    const newPasswordInput = screen.getByLabelText(/^Kata Sandi Baru/i);
    const confirmPasswordInput = screen.getByLabelText(/Ulangi Kata Sandi Baru/i);

    expect(tokenInput).toBeInTheDocument();
    expect(newPasswordInput).toBeInTheDocument();
    expect(confirmPasswordInput).toBeInTheDocument();

    // Uji validasi konfirmasi kata sandi tidak cocok
    fireEvent.change(tokenInput, { target: { value: 'token-abc-123' } });
    fireEvent.change(newPasswordInput, { target: { value: 'Rahasia123' } });
    fireEvent.change(confirmPasswordInput, { target: { value: 'Beda456' } });
    fireEvent.click(screen.getByRole('button', { name: /Perbarui Kata Sandi/i }));

    expect(await screen.findByText('Konfirmasi kata sandi tidak cocok.')).toBeInTheDocument();
    expect(authApi.resetPassword).not.toHaveBeenCalled();

    // Sukses jika kata sandi cocok
    fireEvent.change(confirmPasswordInput, { target: { value: 'Rahasia123' } });
    fireEvent.click(screen.getByRole('button', { name: /Perbarui Kata Sandi/i }));

    await waitFor(() => {
      expect(authApi.resetPassword).toHaveBeenCalledWith({
        token: 'token-abc-123',
        new_password: 'Rahasia123',
      });
    });

    expect(screen.getByText('Kata sandi berhasil diperbarui.')).toBeInTheDocument();
  });
});

