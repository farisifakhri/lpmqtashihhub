import React from 'react';
import { describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { PUBLIC_NAV_ITEMS } from '@/components/public/PublicHeader';
import { InformationPlaceholderPage } from './InformationPlaceholderPage';

vi.mock('@/components/public/PublicFooter', () => ({
  PublicFooter: () => <footer aria-label="Public footer" />,
}));

vi.mock('@/components/public/PublicAppPromotion', () => ({
  PublicAppPromotion: () => <section aria-label="Promosi aplikasi Qur’an Kemenag" />,
}));

describe('InformationPlaceholderPage', () => {
  it('shows the in-progress message with the shared public layout', () => {
    render(
      <MemoryRouter>
        <InformationPlaceholderPage title="Siaran Pers" basePath="/informasi/siaran-pers" />
      </MemoryRouter>
    );

    expect(screen.getByRole('heading', { name: 'Siaran Pers' })).toBeInTheDocument();
    expect(screen.getByRole('status')).toHaveTextContent('Halaman sedang dalam proses pembuatan.');
    expect(screen.getByRole('banner')).toBeInTheDocument();
    expect(screen.getByRole('region', { name: 'Promosi aplikasi Qur’an Kemenag' })).toBeInTheDocument();
    expect(screen.getByRole('contentinfo', { name: 'Public footer' })).toBeInTheDocument();
  });

  it('defines the requested seven information links in order', () => {
    const informationLinks = PUBLIC_NAV_ITEMS.find((item) => item.label === 'Informasi').children;

    expect(informationLinks.map((item) => item.label)).toEqual([
      "Regulasi Penerbit Mushaf Al-Qur'an",
      'Panduan Permohonan Surat Tanda Tashih/Izin Edar',
      'SOP Pelayanan Surat Tanda Tashih',
      "Direktori Penerbit Mushaf Al-Qur'an",
      'Survei IKM dan IPAK Pelayanan Surat Tanda Tashih',
      'Siaran Pers',
      'Unduh Dokumen Seputar Pelayanan Surat Tanda Tashih/Izin Edar',
    ]);
    expect(informationLinks.map((item) => item.href)).toEqual([
      '/informasi/regulasi-penerbit-mushaf',
      '/informasi/panduan-permohonan-surat-tanda-tashih',
      '/informasi/sop-pelayanan-surat-tanda-tashih',
      '/informasi/direktori-penerbit-mushaf',
      '/informasi/survei-ikm-ipak-pelayanan-surat-tanda-tashih',
      '/informasi/siaran-pers',
      '/informasi/unduh-dokumen-pelayanan-surat-tanda-tashih',
    ]);
  });
});
