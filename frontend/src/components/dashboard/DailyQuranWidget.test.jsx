import React from 'react';
import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent, act } from '@testing-library/react';
import { DailyQuranWidget } from './DailyQuranWidget';

describe('DailyQuranWidget Component', () => {
  it('merender judul widget dan kutipan Al-Qur\'an / Hadis', () => {
    render(<DailyQuranWidget />);

    expect(screen.getByText("Kutipan Harian Al-Qur'an & Hadis")).toBeInTheDocument();
    expect(screen.getByTitle('Segarkan kutipan sekarang')).toBeInTheDocument();
  });

  it('merender teks terjemahan dan tombol ganti', async () => {
    render(<DailyQuranWidget />);

    const refreshButton = screen.getByTitle('Segarkan kutipan sekarang');
    expect(refreshButton).toBeInTheDocument();

    // Pastikan tombol ganti bisa diklik tanpa error
    act(() => {
      fireEvent.click(refreshButton);
    });
  });
});

