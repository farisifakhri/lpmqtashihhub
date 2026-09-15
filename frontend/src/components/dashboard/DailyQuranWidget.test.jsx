import React from 'react';
import { beforeEach, describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { DailyQuranWidget } from './DailyQuranWidget';

describe('DailyQuranWidget Component', () => {
  beforeEach(() => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        code: 200,
        data: {
          number: { inSurah: 1 },
          text: { arab: 'بِسْمِ اللَّهِ' },
          translation: { id: 'Dengan nama Allah.' },
          surah: { name: { transliteration: { id: 'Al-Fatihah' } } },
        },
      }),
    }));
  });

  it('merender ayat dinamis dari API Al-Qur\'an', async () => {
    render(<DailyQuranWidget />);

    expect(screen.getByText("Ayat Al-Qur'an dalam 1 Menit")).toBeInTheDocument();
    expect(screen.getByTitle('Muat ayat lain')).toBeInTheDocument();
    await waitFor(() => expect(screen.getByText(/Dengan nama Allah\./)).toBeInTheDocument());
    expect(fetch).toHaveBeenCalledWith(expect.stringContaining('quran-api-id.vercel.app/surah/'), expect.any(Object));
  });

  it('merender teks terjemahan dan tombol ganti', async () => {
    render(<DailyQuranWidget />);

    const refreshButton = screen.getByTitle('Muat ayat lain');
    expect(refreshButton).toBeInTheDocument();

    // Pastikan tombol ganti bisa diklik tanpa error
    await waitFor(() => expect(refreshButton).not.toBeDisabled());
    fireEvent.click(refreshButton);
    await waitFor(() => expect(fetch).toHaveBeenCalledTimes(2));
  });
});

