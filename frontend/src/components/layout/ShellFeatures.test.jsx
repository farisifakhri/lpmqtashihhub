import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { CommandSearchDialog } from './CommandSearchDialog';
import { NotificationCenter } from './NotificationCenter';
import * as AuthContextModule from '@/features/auth/AuthContext';

describe('App Shell Components: CommandSearch & NotificationCenter', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.spyOn(AuthContextModule, 'useAuth').mockReturnValue({
      currentUser: {
        id: 'u-1',
        name: 'Ahmad Verifikator',
        role: 'VERIFIKATOR',
        roles: ['VERIFIKATOR'],
      },
    });
  });

  it('CommandSearchDialog merender daftar perintah dan memfilter berdasarkan pencarian', () => {
    const handleClose = vi.fn();
    const { rerender } = render(
      <MemoryRouter>
        <CommandSearchDialog isOpen={true} onClose={handleClose} />
      </MemoryRouter>
    );

    expect(screen.getByRole('dialog', { name: /Pencarian Global dan Perintah Cepat/i })).toBeInTheDocument();
    expect(screen.getByText('Tugas Verifikasi Naskah')).toBeInTheDocument();
    expect(screen.getByText('Pusat Kendali Operasional')).toBeInTheDocument();

    const searchInput = screen.getByLabelText('Cari perintah atau halaman');
    fireEvent.change(searchInput, { target: { value: 'Pembayaran' } });

    expect(screen.getByText('Verifikasi Pembayaran PNBP')).toBeInTheDocument();
    expect(screen.queryByText('Tugas Verifikasi Naskah')).not.toBeInTheDocument();

    fireEvent.keyDown(searchInput, { key: 'Escape' });
    expect(handleClose).toHaveBeenCalled();
  });

  it('NotificationCenter membuka panel notifikasi dan berpindah tab', () => {
    render(
      <MemoryRouter>
        <NotificationCenter />
      </MemoryRouter>
    );

    const bellBtn = screen.getByRole('button', { name: /Pemberitahuan/i });
    expect(bellBtn).toBeInTheDocument();

    fireEvent.click(bellBtn);

    expect(screen.getAllByText(/Perlu Tindakan/i).length).toBeGreaterThan(0);
    expect(screen.getByText(/Penugasan Verifikator Baru/i)).toBeInTheDocument();

    const infoTab = screen.getByRole('button', { name: /Informasi/i });
    fireEvent.click(infoTab);

    expect(screen.getByText(/Pemeliharaan Terjadwal Selesai/i)).toBeInTheDocument();
  });
});
