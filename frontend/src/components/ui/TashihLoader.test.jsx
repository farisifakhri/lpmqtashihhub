import React from 'react';
import { render, screen, act } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import { TashihLoader } from './TashihLoader';

describe('TashihLoader', () => {
  it('menampilkan status memuat yang dapat dibaca pembaca layar', () => {
    render(<TashihLoader label="Memuat halaman..." />);
    const status = screen.getByRole('status');
    expect(status).toHaveAttribute('aria-busy', 'true');
    expect(screen.getByText('Memuat halaman...')).toBeInTheDocument();
  });

  it('menyembunyikan teks visual tetapi tetap membacakannya saat showLabel=false', () => {
    render(<TashihLoader label="Menyimpan" showLabel={false} />);
    expect(screen.getByText('Menyimpan')).toHaveClass('sr-only');
  });

  it('menunda tampil sesuai delayMs untuk menghindari kedipan', () => {
    vi.useFakeTimers();
    render(<TashihLoader label="Menunggu" delayMs={200} />);
    expect(screen.queryByText('Menunggu')).not.toBeInTheDocument();
    act(() => { vi.advanceTimersByTime(200); });
    expect(screen.getByText('Menunggu')).toBeInTheDocument();
    vi.useRealTimers();
  });
});
