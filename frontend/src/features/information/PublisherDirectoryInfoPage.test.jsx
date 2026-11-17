import React from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen, within } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { PublisherDirectoryInfoPage } from './PublisherDirectoryInfoPage';
import { publicApi } from '@/api/public.api';

vi.mock('@/api/public.api', () => ({ publicApi: { publisherDirectory: vi.fn() } }));
vi.mock('@/components/public/PublicFooter', () => ({ PublicFooter: () => <footer aria-label="Public footer" /> }));
vi.mock('@/components/public/PublicAppPromotion', () => ({
  PublicAppPromotion: () => <section aria-label="Promosi aplikasi Qur’an Kemenag" />,
}));

const agna = {
  no: 1,
  id: 'p2',
  name: 'Agna Media Indokarya',
  entity_type: 'PT',
  address: 'Jl. Medokan Semampir Blok D/2, Surabaya',
  province: 'Jawa Timur',
  pic_name: 'Nur Hayati',
  phone: '083856670965',
  email: 'quranagna@gmail.com',
  nomor_induk_penerbit: '01.02.03.05',
  verified_at: '2026-11-01T00:00:00.000Z',
};

describe('PublisherDirectoryInfoPage', () => {
  beforeEach(() => {
    publicApi.publisherDirectory.mockReset();
    publicApi.publisherDirectory.mockResolvedValue({
      success: true,
      data: [agna],
      pagination: { total: 1, page: 1, limit: 20, totalPages: 1 },
      summary: { total: 1, letters: { A: 1 }, provinces: [{ name: 'Jawa Timur', count: 1 }] },
    });
  });

  it('menggantikan placeholder dengan direktori dari API publik dalam layout halaman Informasi', async () => {
    render(<MemoryRouter><PublisherDirectoryInfoPage /></MemoryRouter>);

    expect(screen.getByRole('heading', { level: 1, name: "Direktori Penerbit Mushaf Al-Qur'an" })).toBeInTheDocument();
    expect(screen.queryByText('Halaman sedang dalam proses pembuatan.')).not.toBeInTheDocument();
    expect(screen.getByRole('banner')).toBeInTheDocument();
    expect(screen.getByRole('contentinfo', { name: 'Public footer' })).toBeInTheDocument();

    const row = (await screen.findByText('Agna Media Indokarya')).closest('tr');
    expect(within(row).getByText('Nur Hayati')).toBeInTheDocument();
    expect(within(row).getByText('quranagna@gmail.com')).toBeInTheDocument();
    expect(screen.getByRole('tab', { name: /1 Penerbit/ })).toBeInTheDocument();
    expect(publicApi.publisherDirectory).toHaveBeenLastCalledWith({ page: 1, limit: 20 });
  });

  it('detail publik tidak menampilkan NPWP dan NIB', async () => {
    render(<MemoryRouter><PublisherDirectoryInfoPage /></MemoryRouter>);
    fireEvent.click(await screen.findByRole('button', { name: 'Lihat detail Agna Media Indokarya' }));

    const dialog = await screen.findByRole('dialog');
    expect(within(dialog).getByText('01.02.03.05')).toBeInTheDocument();
    expect(within(dialog).queryByText('NPWP')).not.toBeInTheDocument();
    expect(within(dialog).queryByText('NIB')).not.toBeInTheDocument();
  });
});
