import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import React from 'react';
import { MemoryRouter } from 'react-router-dom';
import { ForbiddenPage } from './ForbiddenPage';

vi.mock('@/features/auth/AuthContext', () => ({
  useAuth: vi.fn(() => ({
    currentUser: {
      id: 'user-1',
      name: 'Penerbit Al-Huda',
      role: 'PENERBIT',
      roles: ['PENERBIT'],
    },
  })),
}));

describe('ForbiddenPage (403 Custom Page)', () => {
  it('merender judul 403, pesan pembatasan akses, dan tombol navigasi', () => {
    render(
      <MemoryRouter>
        <ForbiddenPage />
      </MemoryRouter>
    );

    expect(screen.getByText(/Error 403 — Akses Ditolak/i)).toBeInTheDocument();
    expect(screen.getByText(/Akses Terbatas & Dilindungi/i)).toBeInTheDocument();
    expect(screen.getByText(/Ke Dashboard Saya/i)).toBeInTheDocument();
    expect(screen.getByText(/Kembali ke Beranda/i)).toBeInTheDocument();
  });
});
